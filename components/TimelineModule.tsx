import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { WORKFLOW_STEPS, STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Zap, Timer, Check, Play
} from 'lucide-react';

// ========== CONSTANTS ==========
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 31; // 7:00 next day (7 + 24 = 31)
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24 hours
const ROOM_LABEL_WIDTH = 220;
const ROW_HEIGHT = 80;
const TIME_MARKERS = Array.from({ length: 25 }, (_, i) => i); // 0-24 for 24 hour markers

const ROOM_COLOR_ORDER = ['cyan', 'purple', 'pink', 'orange', 'green', 'blue', 'red'] as const;

const ROOM_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  cyan: { bg: '#06B6D4', border: '#22D3EE', glow: 'rgba(6,182,212,0.4)' },
  purple: { bg: '#A855F7', border: '#C084FC', glow: 'rgba(168,85,247,0.4)' },
  pink: { bg: '#EC4899', border: '#F472B6', glow: 'rgba(236,72,153,0.4)' },
  orange: { bg: '#F97316', border: '#FB923C', glow: 'rgba(249,115,22,0.4)' },
  green: { bg: '#10B981', border: '#34D399', glow: 'rgba(16,185,129,0.4)' },
  blue: { bg: '#3B82F6', border: '#60A5FA', glow: 'rgba(59,130,246,0.4)' },
  red: { bg: '#EF4444', border: '#F87171', glow: 'rgba(239,68,68,0.4)' },
};

// ========== HELPER FUNCTIONS ==========
const getTimePercent = (date: Date): number => {
  const hours = date.getHours() + date.getMinutes() / 60;
  let percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
  if (percent < 0) percent += (24 / TIMELINE_HOURS) * 100;
  return Math.max(0, Math.min(200, percent));
};

const parseTimeToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const hourLabel = (hour: number): string => {
  const actualHour = TIMELINE_START_HOUR + hour;
  const displayHour = actualHour % 24;
  return `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
};

const isNextDayHour = (hour: number): boolean => hour >= 24;

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

export default function TimelineModule({ rooms }: TimelineModuleProps) {
  const { workflowStatuses, loading: statusesLoading } = useWorkflowStatusesContext();
  
  const activeStatuses = workflowStatuses
    .filter(s => s.is_active && !s.is_special)
    .sort((a, b) => a.order_index - b.order_index);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();

  /* --- Stats --- */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const emergencyCount = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, emergencyCount };
  }, [rooms]);

  const sortedRooms = useMemo(() => [...rooms], [rooms]);

  /* --- ARO Overtime Tracking --- */
  const aroOvertimeRooms = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    
    const overtimeList: Array<{
      roomId: string;
      roomName: string;
      estimatedEndTime: Date;
      workingEndTime: Date;
      overtimeMinutes: number;
    }> = [];
    
    rooms.forEach(room => {
      if (room.currentStepIndex >= 6 || room.isEmergency || room.isLocked) return;
      
      let endTime: Date | null = null;
      if (room.estimatedEndTime) {
        endTime = new Date(room.estimatedEndTime);
      } else if (room.currentProcedure?.startTime && room.currentProcedure?.estimatedDuration) {
        const startDate = parseTimeToDate(room.currentProcedure.startTime);
        endTime = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
      }
      
      if (!endTime) return;
      
      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      const todaySchedule = schedule[todayKey];
      
      if (!todaySchedule.enabled) return;
      
      const workingEndTime = new Date(currentTime);
      workingEndTime.setHours(todaySchedule.endHour, todaySchedule.endMinute, 0, 0);
      
      if (endTime > workingEndTime) {
        const overtimeMinutes = Math.round((endTime.getTime() - workingEndTime.getTime()) / (1000 * 60));
        overtimeList.push({
          roomId: room.id,
          roomName: room.name,
          estimatedEndTime: endTime,
          workingEndTime,
          overtimeMinutes
        });
      }
    });
    
    return overtimeList.sort((a, b) => a.estimatedEndTime.getTime() - b.estimatedEndTime.getTime());
  }, [rooms, currentTime]);
  
  const getAroPosition = (roomId: string): number | null => {
    const index = aroOvertimeRooms.findIndex(r => r.roomId === roomId);
    return index >= 0 ? index + 1 : null;
  };
  
  const getOvertimeInfo = (roomId: string) => {
    return aroOvertimeRooms.find(r => r.roomId === roomId);
  };

  const getRemainingTime = (room: OperatingRoom): string => {
    if (room.currentStepIndex >= 6) return '';
    if (!room.estimatedEndTime && !room.currentProcedure?.estimatedDuration) return '';
    
    let endTime: Date;
    if (room.estimatedEndTime) {
      endTime = new Date(room.estimatedEndTime);
    } else if (room.currentProcedure?.startTime && room.currentProcedure?.estimatedDuration) {
      const startDate = parseTimeToDate(room.currentProcedure.startTime);
      endTime = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
    } else {
      return '';
    }
    
    const remainingMs = endTime.getTime() - currentTime.getTime();
    if (remainingMs <= 0) return 'Dokonceno';
    
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  let activeRoomCounter = 0;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative bg-[#030712]">

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* ======== MOBILE VIEW ======== */}
      <div className="md:hidden w-full h-full overflow-y-auto flex flex-col bg-[#030712]">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 bg-[#030712] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Prehled salu</h1>
          <p className="text-base font-mono font-bold text-cyan-400 tabular-nums">
            {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Mobile stats */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar flex-shrink-0">
          {[
            { label: 'Aktivni', value: stats.operations, color: '#10B981', icon: Play },
            { label: 'Uklid', value: stats.cleaning, color: '#F97316', icon: Loader2 },
            { label: 'Volne', value: stats.free, color: '#06B6D4', icon: Check },
            { label: 'Dnes', value: stats.completed, color: '#8B5CF6', icon: Zap },
            ...(stats.emergencyCount > 0 ? [{ label: 'Emergency', value: stats.emergencyCount, color: '#EF4444', icon: AlertTriangle }] : []),
          ].map(s => (
            <div 
              key={s.label} 
              className="flex-shrink-0 rounded-xl px-3 py-2"
              style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <s.icon className="w-3 h-3" style={{ color: s.color }} />
                <p className="text-[8px] font-bold tracking-wider uppercase text-white/40">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile room cards */}
        <div className="flex flex-col gap-2 px-4 pb-6">
          {sortedRooms.map((room, idx) => {
            const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
            const safeIndex = Math.min(room.currentStepIndex, totalSteps - 1);
            const dbStatus = activeStatuses.length > 0 ? activeStatuses[safeIndex] : null;
            const color = room.isEmergency ? '#EF4444' : room.isLocked ? '#FBBF24' : (dbStatus?.color || '#6B7280');
            const statusName = dbStatus?.name || 'Status';
            const remaining = getRemainingTime(room);
            const isFree = safeIndex === totalSteps - 1;
            
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="w-full rounded-xl p-3 text-left bg-white/[0.02] border border-white/[0.06] active:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <p className="text-base font-bold text-white">{room.name}</p>
                    {room.isEmergency && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase">EMG</span>}
                    {room.isLocked && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase">LOCK</span>}
                  </div>
                  {remaining && !isFree && (
                    <span className="text-xs font-mono font-semibold" style={{ color }}>{remaining}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>{statusName}</p>
                    <p className="text-[10px] text-white/35">{room.staff.doctor.name}</p>
                  </div>
                  {room.estimatedEndTime && !isFree && (
                    <div className="text-right">
                      <p className="text-[8px] uppercase tracking-wider text-white/30">Ukonceni</p>
                      <p className="text-sm font-mono font-bold text-white">
                        {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ backgroundColor: color, width: `${((safeIndex + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======== DESKTOP VIEW ======== */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden relative">

        {/* Header - clean minimal style */}
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#030712]">
          <div className="px-6 py-4">
            {/* Stats Row */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 hide-scrollbar">
              <StatBox icon={Play} label="Aktivni" value={stats.operations} color="#10B981" />
              <StatBox icon={Loader2} label="Uklid" value={stats.cleaning} color="#F97316" />
              <StatBox icon={Check} label="Volne" value={stats.free} color="#06B6D4" />
              <StatBox icon={Zap} label="Dnes" value={stats.completed} color="#8B5CF6" />
              
              {stats.emergencyCount > 0 && (
                <StatBox icon={AlertTriangle} label="Emergency" value={stats.emergencyCount} color="#EF4444" />
              )}
              
              {aroOvertimeRooms.length > 0 && (
                <StatBox icon={Timer} label="ARO" value={aroOvertimeRooms.length} color="#EF4444" />
              )}

              <div className="flex-1 min-w-4" />

              {/* Date & Time - simplified */}
              <div className="flex items-center gap-2">
                <div className="rounded-xl px-4 py-2.5 bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[9px] text-white/35 uppercase tracking-wider mb-0.5">Datum</p>
                  <p className="text-sm font-semibold text-white/80">{formatDate(currentTime)}</p>
                </div>
                
                <div className="rounded-xl px-4 py-2.5 bg-cyan-500/[0.08] border border-cyan-500/20">
                  <p className="text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Cas</p>
                  <p className="text-sm font-mono font-bold text-cyan-400 tabular-nums">
                    {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Timeline Area */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden px-6">
          
          {/* Timeline Header */}
          <div className="flex flex-shrink-0 border-b border-white/[0.06] bg-white/[0.02]">
            {/* Room label header */}
            <div 
              className="flex-shrink-0 flex items-center px-4 gap-2 border-r border-white/[0.06]" 
              style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH }}
            >
              <Activity className="w-4 h-4 text-white/40" />
              <span className="text-xs font-semibold tracking-wide uppercase text-white/40">Saly</span>
            </div>
            
            {/* Time markers - simple */}
            <div className="flex-1 overflow-hidden" ref={timelineRef}>
              <div className="flex items-center h-10 relative w-full">
                {TIME_MARKERS.map((hour, i) => {
                  const isLast = i === TIME_MARKERS.length - 1;
                  const widthPct = 100 / TIMELINE_HOURS;
                  const leftPct = i * widthPct;
                  const actualHour = TIMELINE_START_HOUR + hour;
                  const displayHour = actualHour % 24;
                  const isNightHour = displayHour >= 20 || displayHour < 6;
                  const isNextDay = actualHour >= 24;
                  const isCurrentHour = displayHour === currentHour && !isLast;
                  
                  return (
                    <div 
                      key={`h-${hour}-${i}`} 
                      className="absolute top-0 h-full flex items-center" 
                      style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-px ${isNightHour ? 'bg-white/[0.03]' : 'bg-white/[0.05]'}`} />
                      
                      {!isLast && (
                        <span className={`ml-2 text-[10px] font-mono ${isCurrentHour ? 'text-cyan-400 font-bold' : isNightHour ? 'text-white/20' : 'text-white/35'}`}>
                          {hourLabel(hour)}
                          {isNextDay && <span className="text-cyan-400/60 ml-1 text-[8px]">+1</span>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Room Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar" ref={scrollContainerRef}>
            <div className="relative w-full">
              {/* Now indicator */}
              <AnimatePresence>
                {nowPercent >= 0 && nowPercent <= 100 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                    style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                  >
                    {/* Glow */}
                    <div className="absolute -left-4 top-0 bottom-0 w-8 opacity-20 blur-lg" style={{ background: '#06B6D4' }} />
                    {/* Line */}
                    <div 
                      className="absolute -left-px top-0 bottom-0 w-[2px]" 
                      style={{ background: 'linear-gradient(to bottom, #06B6D4 0%, #06B6D480 50%, #06B6D430 100%)' }} 
                    />
                    {/* Top dot */}
                    <div className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 10px #06B6D4' }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Room Rows */}
              {sortedRooms.map((room, roomIndex) => {
                const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
                const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
                const isActive = stepIndex > 0;
                const isFree = stepIndex === 0;
                
                if (isActive && !room.isEmergency && !room.isLocked) {
                  activeRoomCounter++;
                }
                const currentRoomNumber = isActive && !room.isEmergency && !room.isLocked ? activeRoomCounter : 0;
                
                const roomColorKey = ROOM_COLOR_ORDER[(currentRoomNumber - 1) % ROOM_COLOR_ORDER.length];
                const roomColor = ROOM_COLORS[roomColorKey] || ROOM_COLORS.cyan;
                const remainingTime = getRemainingTime(room);
                
                const dbStatus = activeStatuses.length > 0 ? activeStatuses[stepIndex] : null;
                const stepColor = dbStatus?.color || '#6B7280';
                const stepName = dbStatus?.name || 'Status';

                // Calculate bar position
                const startParts = room.currentProcedure?.startTime?.split(':');
                let boxLeftPct = 0;
                let boxWidthPct = 0;
                let progressPct = 0;
                let startDate: Date = new Date();
                let endDate: Date = new Date();
                
                const hasRealData = startParts && startParts.length === 2;
                const hasPhaseStart = room.phaseStartedAt;
                const shouldShowBar = isActive;

                if (isActive) {
                  if (hasRealData) {
                    startDate = new Date();
                    startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
                  } else if (hasPhaseStart) {
                    startDate = new Date(room.phaseStartedAt);
                  } else {
                    startDate = new Date(currentTime.getTime() - 30 * 60 * 1000);
                  }
                  
                  boxLeftPct = getTimePercent(startDate);
                  
                  if (room.estimatedEndTime) {
                    endDate = new Date(room.estimatedEndTime);
                  } else if (room.currentProcedure?.estimatedDuration) {
                    endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                  } else {
                    const fallbackDurations = [30, 20, 120, 60, 30, 45, 0];
                    const duration = fallbackDurations[Math.min(stepIndex, 5)] || 90;
                    endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                  }
                  
                  const boxRightPct = getTimePercent(endDate);
                  if (boxRightPct < boxLeftPct) {
                    boxWidthPct = Math.max(2, (100 - boxLeftPct) + boxRightPct);
                  } else {
                    boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
                  }
                  progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));
                }

                /* Emergency row */
                if (room.isEmergency) {
                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roomIndex * 0.02 }}
                      className="flex items-stretch border-b cursor-pointer group"
                      style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.03)' }}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div 
                        className="flex-shrink-0 flex items-center gap-3 px-5 border-r backdrop-blur-sm transition-colors group-hover:bg-red-500/5" 
                        style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(239,68,68,0.05)' }}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          </div>
                          <motion.div 
                            className="absolute inset-0 rounded-xl bg-red-500/20"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold tracking-tight text-red-300 truncate">{room.name}</p>
                          <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider">Emergency</p>
                        </div>
                      </div>
                      <div className="relative flex-1 overflow-hidden bg-red-500/[0.02]">
                        <div className="absolute inset-y-3 left-3 right-3 rounded-xl overflow-hidden" style={{ 
                          background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
                          border: '1px solid rgba(239,68,68,0.2)'
                        }}>
                          <div className="absolute inset-0 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400/70" />
                            <span className="text-xs font-bold tracking-[0.2em] text-red-400/80 uppercase">EMERGENCY</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                /* Locked row */
                if (room.isLocked) {
                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roomIndex * 0.02 }}
                      className="flex items-stretch border-b cursor-pointer group"
                      style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.03)' }}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div 
                        className="flex-shrink-0 flex items-center gap-3 px-5 border-r backdrop-blur-sm transition-colors group-hover:bg-amber-500/5" 
                        style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(251,191,36,0.03)' }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                          <Lock className="w-5 h-5 text-amber-400/80" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold tracking-tight text-amber-300/80 truncate">{room.name}</p>
                          <p className="text-[10px] font-bold text-amber-400/50 uppercase tracking-wider">Uzamceno</p>
                        </div>
                      </div>
                      <div className="relative flex-1 overflow-hidden bg-amber-500/[0.02]">
                        <div className="absolute inset-y-3 left-3 right-3 rounded-xl overflow-hidden" style={{ 
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.03) 100%)',
                          border: '1px solid rgba(251,191,36,0.15)'
                        }}>
                          <div className="absolute inset-0 flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4 text-amber-400/60" />
                            <span className="text-xs font-bold tracking-[0.2em] text-amber-400/70 uppercase">UZAMCENO</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                /* Active / Free row */
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                    className="flex items-stretch border-b group cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.03)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {/* Room Label */}
                    <div 
                      className="flex-shrink-0 flex items-center gap-3 px-5 border-r backdrop-blur-sm transition-all group-hover:bg-white/[0.02]" 
                      style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
                    >
                      {/* ARO Badge or Room Number */}
                      {(() => {
                        const aroPosition = getAroPosition(room.id);
                        const overtimeInfo = getOvertimeInfo(room.id);
                        
                        if (aroPosition && overtimeInfo) {
                          return (
                            <div 
                              className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%)',
                                border: '1px solid rgba(239,68,68,0.3)'
                              }}
                            >
                              <span className="text-[8px] font-bold text-red-400/70">ARO</span>
                              <span className="text-sm font-black text-white">{aroPosition}</span>
                            </div>
                          );
                        }
                        
                        if (isActive) {
                          return (
                            <div 
                              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white"
                              style={{ 
                                background: `linear-gradient(135deg, ${stepColor}40 0%, ${stepColor}20 100%)`,
                                border: `1px solid ${stepColor}50`,
                                boxShadow: `0 0 15px ${stepColor}20`
                              }}
                            >
                              {currentRoomNumber}
                            </div>
                          );
                        }
                        
                        return (
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white/30" />
                          </div>
                        );
                      })()}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold tracking-tight text-white/80 truncate">{room.name}</p>
                          {room.isSeptic && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400/70 uppercase border border-purple-500/20">SEP</span>
                          )}
                        </div>
                        {isFree ? (
                          <p className="text-[10px] font-medium text-emerald-400/60 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                            Volny
                          </p>
                        ) : remainingTime ? (
                          <p className="text-[10px] font-mono font-medium text-white/40">{remainingTime}</p>
                        ) : (
                          <p className="text-[10px] font-medium text-white/30">{room.department}</p>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative flex-1 overflow-hidden group-hover:bg-white/[0.01] transition-colors">
                      {/* Hour grid */}
                      {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                        const displayHour = (TIMELINE_START_HOUR + hour) % 24;
                        const isNight = displayHour >= 20 || displayHour < 6;
                        return (
                          <div 
                            key={i} 
                            className="absolute top-0 bottom-0 w-px" 
                            style={{ 
                              left: `${(i / TIMELINE_HOURS) * 100}%`,
                              background: isNight ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'
                            }} 
                          />
                        );
                      })}

                      {/* Active operation bar */}
                      {isActive && shouldShowBar && boxWidthPct > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.6, delay: roomIndex * 0.02, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-2 bottom-2 overflow-hidden rounded-xl"
                          style={{ 
                            left: `${Math.max(0, boxLeftPct)}%`, 
                            width: `${boxWidthPct}%`,
                            transformOrigin: 'left center'
                          }}
                        >
                          {/* Outer glow */}
                          <div 
                            className="absolute -inset-1 rounded-xl blur-md opacity-30"
                            style={{ background: stepColor }}
                          />

                          {/* Main container */}
                          <div 
                            className="absolute inset-0 rounded-xl overflow-hidden"
                            style={{ 
                              background: `linear-gradient(135deg, ${stepColor}25 0%, ${stepColor}10 100%)`,
                              border: `1px solid ${stepColor}40`
                            }}
                          >
                            {/* Progress fill */}
                            <div 
                              className="absolute inset-0 rounded-xl transition-all duration-300"
                              style={{ 
                                clipPath: `inset(0 ${100 - progressPct}% 0 0)`,
                                background: `linear-gradient(135deg, ${stepColor}80 0%, ${stepColor}60 100%)`
                              }}
                            />
                            
                            {/* Shine effect */}
                            <div 
                              className="absolute inset-x-0 top-0 h-1/3 opacity-30"
                              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }}
                            />
                          </div>

                          {/* Progress indicator */}
                          {progressPct > 0 && progressPct < 100 && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2"
                              style={{ left: `${progressPct}%`, background: 'rgba(255,255,255,0.8)' }}
                            />
                          )}

                          {/* Content */}
                          <div className="absolute inset-0 flex items-center px-3 pointer-events-none gap-2">
                            {boxWidthPct > 8 && (
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-white/90 truncate">{stepName}</p>
                                <p className="text-[9px] text-white/50 truncate">{room.staff?.doctor?.name}</p>
                              </div>
                            )}
                            {boxWidthPct > 15 && remainingTime && (
                              <div className="flex-shrink-0 px-2 py-1 rounded-md text-[9px] font-mono font-bold text-white/80 bg-black/30">
                                {remainingTime}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Free room */}
                      {isFree && (
                        <div 
                          className="absolute inset-y-3 left-3 right-3 rounded-xl flex items-center justify-center"
                          style={{ 
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.08)'
                          }}
                        >
                          <p className="text-[11px] font-medium text-white/25">{stepName}</p>
                        </div>
                      )}

                      {/* Working hours end indicator */}
                      {(() => {
                        const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                        const todayKey = dayKeys[currentTime.getDay()];
                        const todaySchedule = schedule[todayKey];
                        
                        if (!todaySchedule.enabled) return null;
                        
                        const endHour = todaySchedule.endHour;
                        const endMinute = todaySchedule.endMinute;
                        let minutesFromTimelineStart = (endHour * 60 + endMinute) - (TIMELINE_START_HOUR * 60);
                        if (minutesFromTimelineStart < 0) minutesFromTimelineStart += 24 * 60;
                        const endPercent = (minutesFromTimelineStart / (TIMELINE_HOURS * 60)) * 100;
                        
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 z-20"
                            style={{ 
                              left: `${endPercent}%`,
                              background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)'
                            }}
                          >
                            <div 
                              className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap"
                              style={{ 
                                background: 'rgba(249,115,22,0.2)',
                                border: '1px solid rgba(249,115,22,0.4)',
                                color: '#F97316'
                              }}
                            >
                              {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Legend */}
        <footer className="relative z-10 flex items-center justify-between gap-4 px-8 py-4 border-t flex-shrink-0 backdrop-blur-xl bg-black/20" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <LegendItem icon={<div className="w-3 h-3 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #06B6D4' }} />} label="Aktualni cas" />
            <LegendItem icon={<div className="w-4 h-0.5 bg-orange-500" />} label="Konec smeny" />
            <LegendItem icon={<div className="w-5 h-5 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[8px] font-black text-red-400">1</div>} label="ARO poradi" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Info className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] text-white/40">Kliknete pro detail</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Glass Stat Box Component
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color }) => (
  <div 
    className="flex-shrink-0 rounded-xl px-3 py-2 flex items-center gap-2"
    style={{ background: `${color}10`, border: `1px solid ${color}20` }}
  >
    <Icon className="w-4 h-4" style={{ color }} />
    <div>
      <p className="text-[8px] text-white/35 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  </div>
);

// Legend Item Component
const LegendItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
    {icon}
    <span className="text-[10px] font-medium text-white/40">{label}</span>
  </div>
);

// Room Detail Popup Component
interface RoomDetailPopupProps {
  room: OperatingRoom;
  onClose: () => void;
  currentTime: Date;
}

const RoomDetailPopup: React.FC<RoomDetailPopupProps> = ({ room, onClose, currentTime }) => {
  const { activeStatuses } = useWorkflowStatusesContext();
  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
  const dbStatus = activeStatuses.length > 0 ? activeStatuses[stepIndex] : null;
  const step = {
    title: dbStatus?.name || 'Status',
    color: dbStatus?.color || '#6B7280'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl max-w-sm w-full overflow-hidden bg-[#0a0a0f] border border-white/[0.08]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Sal</p>
            <p className="text-xl font-bold text-white">{room.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Status */}
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5">Status</p>
            <div
              className="px-3 py-2.5 rounded-lg flex items-center gap-2.5"
              style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: step.color }} />
              <span style={{ color: step.color }} className="font-semibold text-sm">{step.title}</span>
            </div>
          </div>

          {/* Doctor */}
          {room.staff?.doctor && (
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5">Lekar</p>
              <div className="flex items-center gap-2 text-white/80">
                <User className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium">{room.staff.doctor.name}</span>
              </div>
            </div>
          )}

          {/* Time */}
          {room.estimatedEndTime && (
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5">Ukonceni</p>
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-base font-mono font-bold">
                  {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
