import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { WORKFLOW_STEPS, STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause
} from 'lucide-react';

// ========== CONSTANTS ==========
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 31; // 7:00 next day (7 + 24 = 31)
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24 hours
const ROOM_LABEL_WIDTH = 200;
const ROW_HEIGHT = 72;
const TIME_MARKERS = Array.from({ length: 25 }, (_, i) => i); // 0-24 for 24 hour markers

const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'] as const;

const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#FB923C', border: '#FDBA74', stripe: '#FED7AA', text: '#FFF', glow: 'rgba(251,146,60,0.2)' },
  purple: { bg: '#C084FC', border: '#D8B4FE', stripe: '#E9D5FF', text: '#FFF', glow: 'rgba(192,132,252,0.2)' },
  pink: { bg: '#F472B6', border: '#F9A8D4', stripe: '#FBCFE8', text: '#FFF', glow: 'rgba(244,114,182,0.2)' },
  blue: { bg: '#60A5FA', border: '#93C5FD', stripe: '#BFDBFE', text: '#FFF', glow: 'rgba(96,165,250,0.2)' },
  green: { bg: '#4ADE80', border: '#86EFAC', stripe: '#BBF7D0', text: '#FFF', glow: 'rgba(74,222,128,0.2)' },
  red: { bg: '#F87171', border: '#FCA5A5', stripe: '#FECACA', text: '#FFF', glow: 'rgba(248,113,113,0.2)' },
  cyan: { bg: '#22D3EE', border: '#67E8F9', stripe: '#A5F3FC', text: '#FFF', glow: 'rgba(34,211,238,0.2)' },
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
  // Convert timeline hour (0-24) to actual 24-hour format (7:00 to 7:00 next day)
  const actualHour = TIMELINE_START_HOUR + hour; // 7 + (0-24) = 7-31
  const displayHour = actualHour % 24; // Display as 7-23, 0-6
  return `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
};

const isNextDayHour = (hour: number): boolean => hour >= 24;

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

export default function TimelineModule({ rooms }: TimelineModuleProps) {
  const { workflowStatuses, loading: statusesLoading } = useWorkflowStatusesContext();
  
  // Get ONLY main workflow statuses (bez speciálních)
  const activeStatuses = workflowStatuses
    .filter(s => s.is_active && !s.is_special)
    .sort((a, b) => a.order_index - b.order_index);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time position on mount - NE POTŘEBA KDYŽ JE VŠE VIDITELNÉ
  // useEffect(() => {
  //   if (scrollContainerRef.current) {
  //     const nowPercent = getTimePercent(currentTime);
  //     const scrollWidth = scrollContainerRef.current.scrollWidth - ROOM_LABEL_WIDTH;
  //     const containerWidth = scrollContainerRef.current.clientWidth - ROOM_LABEL_WIDTH;
  //     const scrollPosition = (scrollWidth * nowPercent / 100) - (containerWidth / 2);
  //     scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
  //   }
  // }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();

  /* --- Stats --- */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const doctorsWorking = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex > 0).length;
    const doctorsFree = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex >= 6).length;
    const nursesWorking = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex > 0).length;
    const nursesFree = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex >= 6).length;
    const emergencyCount = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, doctorsWorking, doctorsFree, nursesWorking, nursesFree, emergencyCount };
  }, [rooms]);

  /* --- Rooms in original order - emergency/locked stay on their position --- */
  const sortedRooms = useMemo(() => {
    return [...rooms];
  }, [rooms]);

  /* --- ARO Overtime Tracking - rooms that exceed working hours --- */
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
      // Skip non-active, emergency, or locked rooms
      if (room.currentStepIndex >= 6 || room.isEmergency || room.isLocked) return;
      
      // Get estimated end time
      let endTime: Date | null = null;
      if (room.estimatedEndTime) {
        endTime = new Date(room.estimatedEndTime);
      } else if (room.currentProcedure?.startTime && room.currentProcedure?.estimatedDuration) {
        const startDate = parseTimeToDate(room.currentProcedure.startTime);
        endTime = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
      }
      
      if (!endTime) return;
      
      // Get room's working hours for today
      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      const todaySchedule = schedule[todayKey];
      
      if (!todaySchedule.enabled) return;
      
      // Calculate working end time
      const workingEndTime = new Date(currentTime);
      workingEndTime.setHours(todaySchedule.endHour, todaySchedule.endMinute, 0, 0);
      
      // Check if estimated end exceeds working hours
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
    
    // Sort by estimated end time (who finishes first has priority to be relieved first)
    return overtimeList.sort((a, b) => a.estimatedEndTime.getTime() - b.estimatedEndTime.getTime());
  }, [rooms, currentTime]);
  
  // Get ARO position for a room (returns position number or null if not in overtime)
  const getAroPosition = (roomId: string): number | null => {
    const index = aroOvertimeRooms.findIndex(r => r.roomId === roomId);
    return index >= 0 ? index + 1 : null;
  };
  
  // Get overtime info for a room
  const getOvertimeInfo = (roomId: string) => {
    return aroOvertimeRooms.find(r => r.roomId === roomId);
  };

  // Calculate shift line positions (as percentage of 24-hour view from 7:00)
  // These are no longer used but kept for reference
  // const shiftStartPercent = 0;
  // const shiftEndPercent = ((SHIFT_END_HOUR - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;

  // Get remaining time for room
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
    
    return `+${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Count active rooms for numbering
  let activeRoomCounter = 0;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* ======== MOBILE VIEW (md:hidden) ======== */}
      <div className="md:hidden w-full h-full overflow-y-auto flex flex-col">
  {/* Mobile header */}
  <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
  <div>
  <h1 className="text-2xl font-black tracking-tighter uppercase">Přehled sálů</h1>
  </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/30">Čas</p>
            <p className="text-lg font-mono font-black text-white tabular-nums">
              {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Mobile stats row */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar flex-shrink-0">
          {[
            { label: 'Aktivní', value: stats.operations, color: '#22C55E' },
            { label: 'Úklid', value: stats.cleaning, color: '#F97316' },
            { label: 'Volné', value: stats.free, color: '#22D3EE' },
            { label: 'Dnes', value: stats.completed, color: '#6366F1' },
            ...(stats.emergencyCount > 0 ? [{ label: 'Emergency', value: stats.emergencyCount, color: '#EF4444' }] : []),
          ].map(s => (
            <div key={s.label} className="flex-shrink-0 rounded-xl px-3 py-2 border" style={{ background: `${s.color}10`, borderColor: `${s.color}30` }}>
              <p className="text-[8px] font-black tracking-widest uppercase" style={{ color: s.color }}>{s.label}</p>
              <p className="text-lg font-black text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile room cards list */}
        <div className="flex flex-col gap-2 px-4 pb-6">
          {sortedRooms.map((room) => {
            // Use active statuses from database
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
                className="w-full rounded-2xl p-4 border text-left transition-all active:scale-[0.99]"
                style={{ background: `${color}08`, borderColor: `${color}25` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
                    <p className="text-base font-black text-white uppercase tracking-tight">{room.name}</p>
                    {room.isEmergency && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase">EMERGENCY</span>}
                    {room.isLocked && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase">UZAMČEN</span>}
                    {room.isPaused && !room.isEmergency && !room.isLocked && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 uppercase">PAUZA</span>}
                  </div>
                  {remaining && !isFree && (
                    <span className="text-[11px] font-mono font-bold" style={{ color }}>{remaining}</span>
                  )}
                  {isFree && <span className="text-[10px] font-black text-emerald-400/70 uppercase tracking-wider">Volný</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{statusName}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{room.staff.doctor.name}</p>
                  </div>
                  {room.estimatedEndTime && !isFree && (
                    <div className="text-right">
                      <p className="text-[8px] uppercase tracking-wider text-white/30">Ukončení</p>
                      <p className="text-sm font-mono font-black text-white">
                        {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${((safeIndex + 1) / totalSteps) * 100}%`, backgroundColor: color, opacity: 0.6 }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======== DESKTOP VIEW (hidden on mobile) ======== */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">

      {/* ======== Header with Title and Stats ======== */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 flex-shrink-0">
        <div className="px-8 md:pl-32 md:pr-10 py-6">


          {/* Stats Boxes Row */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
            <StatBox 
              icon={Activity} 
              label="Aktivni" 
              value={`${stats.operations} operaci`} 
              color="#22C55E" 
            />
            <StatBox 
              icon={Loader2} 
              label="Uklid" 
              value={`${stats.cleaning} salu`} 
              color="#F97316" 
            />
            <StatBox 
              icon={Stethoscope} 
              label="Volne" 
              value={`${stats.free} salu`} 
              color="#22D3EE" 
            />
            <StatBox 
              icon={Shield} 
              label="Dokonceno" 
              value={`${stats.completed} dnes`} 
              color="#22D3EE" 
            />

            {stats.emergencyCount > 0 && (
              <StatBox 
                icon={AlertTriangle} 
                label="Emergency" 
                value={`${stats.emergencyCount} salu`} 
                color="#EF4444" 
                glow 
              />
            )}

            {/* ARO Overtime indicator */}
            {aroOvertimeRooms.length > 0 && (
              <div
                className="relative flex-shrink-0 h-14 rounded-xl px-4 py-2.5 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.08) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  boxShadow: "0 0 20px rgba(239, 68, 68, 0.15)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    background: "radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.25) 0%, transparent 70%)",
                  }}
                />
                <div className="relative flex items-center gap-3 h-full">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.15) 100%)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    <Clock className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-red-400/60 uppercase tracking-wider font-bold">ARO PRESAH</p>
                    <p className="text-sm font-bold text-red-400 leading-tight">{aroOvertimeRooms.length} salu</p>
                  </div>
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-4" />

            {/* Date Box */}
            <StatBox 
              icon={CalendarDays} 
              label="Datum" 
              value={formatDate(currentTime)} 
              color="#6366F1" 
            />

            {/* Time Box */}
            <div
              className="relative flex-shrink-0 h-14 rounded-xl px-4 py-2.5 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                boxShadow: "0 0 20px rgba(168, 85, 247, 0.1)",
              }}
            >
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background: "radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
                }}
              />
              <div className="relative flex items-center gap-3 h-full">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.1) 100%)",
                    border: "1px solid rgba(168, 85, 247, 0.35)",
                  }}
                >
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Cas</p>
                  <p className="text-sm font-semibold text-purple-400 leading-tight tabular-nums">
                    {currentTime.toLocaleTimeString("cs-CZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Legend Button */}
            <button 
              onClick={() => setShowLegend(!showLegend)}
              className="relative flex-shrink-0 h-14 rounded-xl px-4 py-2.5 overflow-hidden hover:scale-[1.02] transition-transform"
              style={{
                background: "linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(148, 163, 184, 0.03) 100%)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <div className="relative flex items-center gap-3 h-full">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(148, 163, 184, 0.15)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                  }}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Zobrazit</p>
                  <p className="text-sm font-semibold text-slate-400 leading-tight">Legendu</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden px-8 md:pl-32 md:pr-10">
        
        {/* Time Axis Header - Fixed */}
        <div className="flex flex-shrink-0 border-b rounded-t-2xl" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(11,17,32,0.9)' }}>
          {/* Room label header - fixed */}
          <div 
            className="flex-shrink-0 flex items-center px-4 gap-2 border-r" 
            style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <Activity className="w-4 h-4 text-emerald-400/60" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-white/40">OPERACNI SALY</span>
          </div>
          
          {/* Time markers - no scroll, full width for 24h */}
          <div className="flex-1 overflow-hidden" ref={timelineRef}>
            <div className="flex items-center h-12 relative w-full">
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / TIMELINE_HOURS;
                const leftPct = i * widthPct;
                // Convert timeline hour (0-24) to actual 24-hour format (7-31 represents 7:00 to 7:00 next day)
                const actualHour = TIMELINE_START_HOUR + hour; // 7 + (0-24) = 7-31
                const displayHour = actualHour % 24; // 7-23, 0-6 for next day hours
                const isNightHour = displayHour >= 19 || displayHour < 7;
                const isNextDay = actualHour >= 24;
                const isCurrentHour = displayHour === currentHour && !isLast;
                
                return (
                  <div 
                    key={`h-${hour}-${i}`} 
                    className="absolute top-0 h-full flex items-center" 
                    style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                  >
                    <div className={`w-px h-full ${isNightHour ? 'bg-white/[0.04]' : 'bg-white/[0.08]'}`} />
                    {!isLast && (
                      isCurrentHour ? (
                        <div 
                          className="ml-2 px-2 py-0.5 rounded-md"
                          style={{ 
                            background: 'rgba(94,234,212,0.9)', 
                            boxShadow: '0 1px 6px rgba(94,234,212,0.25)' 
                          }}
                        >
                          <span className="text-[10px] font-mono font-bold text-slate-900 tracking-wide">
                            {`${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`}
                          </span>
                        </div>
                      ) : (
                        <div className="ml-2 flex items-center gap-1">
                          <span className={`text-[11px] font-mono font-medium ${isNightHour ? 'text-white/20' : 'text-white/40'}`}>
                            {hourLabel(hour)}
                          </span>
                          {isNextDay && (
                            <span className="text-[8px] font-bold text-cyan-400/60 px-1 py-0.5 rounded bg-cyan-400/10">
                              +1
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room Rows - No scroll, full width */}
        <div className="flex-1 min-h-0 overflow-hidden" ref={scrollContainerRef}>
          <div className="relative w-full h-full">
            {/* Now indicator - subtle cyan line */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  <div className="absolute -left-3 top-0 bottom-0 w-6 opacity-10 blur-md" style={{ background: '#5EEAD4' }} />
                  <div 
                    className="absolute -left-px top-0 bottom-0 w-[1.5px]" 
                    style={{ background: 'linear-gradient(to bottom, #5EEAD4 0%, #5EEAD480 50%, #5EEAD430 100%)' }} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room Rows */}
            {sortedRooms.map((room, roomIndex) => {
              // Get current workflow step info from database first
              const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
              const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
              const isActive = stepIndex > 0; // index 0 = "Sál připraven"
              const isCleaning = stepIndex === totalSteps - 2; // Second to last step
              const isFree = stepIndex === 0;
              
              // Only increment counter for active (non-free) rooms
              if (isActive && !room.isEmergency && !room.isLocked) {
                activeRoomCounter++;
              }
              const currentRoomNumber = isActive && !room.isEmergency && !room.isLocked ? activeRoomCounter : 0;
              
              const roomColorKey = ROOM_COLOR_ORDER[(currentRoomNumber - 1) % ROOM_COLOR_ORDER.length];
              const roomColor = ROOM_COLORS[roomColorKey] || ROOM_COLORS.blue;
              const remainingTime = getRemainingTime(room);
              
              // Get status from database
              const dbStatus = activeStatuses.length > 0 ? activeStatuses[stepIndex] : null;
              const stepColor = dbStatus?.color || '#6B7280';
              const stepName = dbStatus?.name || 'Status';
              const StepIcon = Activity; // Default icon

              // Calculate operation bar position
              // Use currentProcedure if available, otherwise use phaseStartedAt or current time as fallback
              const startParts = room.currentProcedure?.startTime?.split(':');
              let boxLeftPct = 0;
              let boxWidthPct = 0;
              let progressPct = 0;
              let startDate: Date = new Date();
              let endDate: Date = new Date();
              
              // Show status bar if active - use procedure time, phaseStartedAt, or fallback to current time
              const hasRealData = startParts && startParts.length === 2;
              const hasPhaseStart = room.phaseStartedAt;
              const shouldShowBar = isActive; // Always show for active rooms

              if (isActive) {
                // Determine start time
                if (hasRealData) {
                  // Use actual procedure start time
                  startDate = new Date();
                  startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
                } else if (hasPhaseStart) {
                  // Use phase started time as fallback
                  startDate = new Date(room.phaseStartedAt);
                } else {
                  // Ultimate fallback: use a time 30 minutes ago
                  startDate = new Date(currentTime.getTime() - 30 * 60 * 1000);
                }
                
                boxLeftPct = getTimePercent(startDate);
                
                if (room.estimatedEndTime) {
                  endDate = new Date(room.estimatedEndTime);
                } else if (room.currentProcedure?.estimatedDuration) {
                  endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                } else {
                  // Fallback: generate duration based on step (longer for surgery steps)
                  const fallbackDurations = [30, 20, 120, 60, 30, 45, 0]; // minutes per step
                  const duration = fallbackDurations[Math.min(stepIndex, 5)] || 90;
                  endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                }
                
                const boxRightPct = getTimePercent(endDate);
                // Handle cases where operation spans past midnight (end is before start on timeline)
                if (boxRightPct < boxLeftPct) {
                  // Operation ends next day - extend to end of timeline
                  boxWidthPct = Math.max(2, (100 - boxLeftPct) + boxRightPct);
                } else {
                  boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
                }
                progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));
              }

              /* Emergency row */
              if (room.isEmergency) {
                return (
                  <div
                    key={room.id}
                    className="flex items-stretch border-b cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-3 px-4 border-r sticky left-0 z-20 hover:bg-white/[0.02]" 
                      style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(11,17,32,0.95)' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-red-400/15 flex items-center justify-center border border-red-400/30">
                        <AlertTriangle className="w-3 h-3 text-red-300/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium tracking-tight text-red-300/80 truncate">{room.name}</p>
                        <p className="text-[9px] font-medium text-red-300/50">EMERGENCY</p>
                      </div>
                    </div>
                    {/* Emergency timeline box - softer */}
                    <div className="relative flex-1 overflow-hidden">
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl overflow-hidden">
                        {/* Main background - softer */}
                        <div 
                          className="absolute inset-0 rounded-xl"
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.15) 0%, rgba(252, 165, 165, 0.08) 100%)',
                            border: '1px solid rgba(252, 165, 165, 0.3)'
                          }}
                        />
                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-300/70" />
                          <span className="text-xs font-bold tracking-[0.15em] text-red-300/80 uppercase select-none">
                            EMERGENCY
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Locked row */
              if (room.isLocked) {
                return (
                  <div
                    key={room.id}
                    className="flex items-stretch border-b cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-3 px-4 border-r sticky left-0 z-20 hover:bg-white/[0.02]" 
                      style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(11,17,32,0.95)' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-400/15 flex items-center justify-center border border-amber-400/25">
                        <Lock className="w-3 h-3 text-amber-300/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium tracking-tight text-amber-300/70 truncate">{room.name}</p>
                        <p className="text-[9px] font-medium text-amber-300/50">UZAMCENO</p>
                      </div>
                    </div>
                    {/* Locked timeline box - softer */}
                    <div className="relative flex-1 overflow-hidden">
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl overflow-hidden">
                        {/* Main background - softer */}
                        <div 
                          className="absolute inset-0 rounded-xl"
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(253, 224, 71, 0.12) 0%, rgba(253, 224, 71, 0.06) 100%)',
                            border: '1px solid rgba(253, 224, 71, 0.25)'
                          }}
                        />
                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-300/60" />
                          <span className="text-xs font-bold tracking-[0.15em] text-amber-300/70 uppercase select-none">
                            UZAMCENO
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Active / Free row */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                  className="flex items-stretch border-b group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  style={{ height: ROW_HEIGHT, borderColor: 'rgba(255,255,255,0.04)' }}
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Room Label - Sticky */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-2 px-3 border-r transition-colors group-hover:bg-white/[0.02] sticky left-0 z-20" 
                    style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(11,17,32,0.95)' }}
                  >
                    {/* ARO Overtime Badge - softer */}
                    {(() => {
                      const aroPosition = getAroPosition(room.id);
                      const overtimeInfo = getOvertimeInfo(room.id);
                      
                      if (aroPosition && overtimeInfo) {
                        return (
                          <div 
                            className="flex-shrink-0 flex flex-col items-center justify-center px-1.5 py-0.5 rounded-md"
                            style={{ 
                              background: 'rgba(252, 165, 165, 0.1)',
                              border: '1px solid rgba(252, 165, 165, 0.2)'
                            }}
                          >
                            <span className="text-[7px] font-medium text-red-300/60 tracking-wider">ARO</span>
                            <span className="text-xs font-bold text-white/80">{aroPosition}</span>
                            <span className="text-[6px] font-normal text-red-300/50">+{overtimeInfo.overtimeMinutes}m</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Numbered badge for active rooms - softer */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive && !getAroPosition(room.id) && (
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white/90"
                          style={{ background: `${roomColor.bg}90`, boxShadow: `0 1px 4px ${roomColor.glow}` }}
                        >
                          {currentRoomNumber}
                        </div>
                      )}
                    </div>

                    {/* Room info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium tracking-tight text-white/70 truncate">
                          {room.name}
                        </p>
                        {room.isSeptic && (
                          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-300/60 uppercase flex-shrink-0">SEPTIKA</span>
                        )}
                        {room.isPaused && !room.isEmergency && !room.isLocked && (
                          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-cyan-400/15 text-cyan-300/80 uppercase flex-shrink-0 flex items-center gap-1">
                            <Pause className="w-2 h-2" />
                            PAUZA
                          </span>
                        )}
                      </div>
                      {isFree ? (
                        <p className="text-[9px] font-medium text-white/25 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400/40" />
                          Volny
                        </p>
                      ) : remainingTime && stepIndex !== 0 ? (
                        <p 
                          className="text-[9px] font-medium text-white/50" 
                        >
                          {remainingTime}
                        </p>
                      ) : (
                        <p className="text-[9px] font-medium text-white/25">{room.department}</p>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative flex-1 overflow-hidden">
                    {/* Hour grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const displayHour = hour % 24;
                      const isNight = displayHour >= 19 || displayHour < 7;
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

                    {/* Active operation bar - Premium Design with workflow step color */}
                    {/* Active operation box */}
                    {isActive && shouldShowBar && boxWidthPct > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, delay: roomIndex * 0.015, ease: [0.32, 0.72, 0, 1] }}
                        className="absolute top-1.5 bottom-1.5 rounded-2xl overflow-hidden"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`,
                          transformOrigin: 'left center'
                        }}
                      >
                        {(() => {
                          // Determine base color based on room status priority
                          let baseColor = stepColor || '#6B7280';
                          
                          if (room.isEmergency) {
                            baseColor = '#FF3B30'; // Red for emergency
                          } else if (room.isLocked) {
                            baseColor = '#FBBF24'; // Amber for locked
                          } else if (room.isPaused) {
                            baseColor = '#22D3EE'; // Cyan for paused
                          }

                          // Create lighter tone for gradient end
                          const toColor = baseColor + '88';

                          return (
                            <>
                              {/* Subtle ambient glow behind the bar */}
                              <div
                                className="absolute -inset-1 blur-lg opacity-25 rounded-2xl"
                                style={{ background: baseColor }}
                              />

                              {/* Main bar — translucent gradient */}
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(105deg, ${baseColor}CC 0%, ${toColor}88 55%, ${baseColor}55 100%)`,
                                  border: `1px solid ${baseColor}33`,
                                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12), 0 2px 16px ${baseColor}18`,
                                }}
                              />

                              {/* Top sheen — thin glass highlight */}
                              <div
                                className="absolute inset-x-0 top-0 h-[45%]"
                                style={{
                                  background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)',
                                  borderRadius: '16px 16px 0 0',
                                }}
                              />

                              {/* Progress line — current time indicator */}
                              {progressPct > 0 && progressPct < 100 && !room.isPaused && (
                                <>
                                  <div
                                    className="absolute top-1 bottom-1 w-[2px] -translate-x-1/2 rounded-full"
                                    style={{
                                      left: `${progressPct}%`,
                                      background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 100%)',
                                      boxShadow: '0 0 6px rgba(255,255,255,0.6)',
                                    }}
                                  />
                                  <div
                                    className="absolute top-0 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45"
                                    style={{
                                      left: `${progressPct}%`,
                                      background: 'white',
                                      boxShadow: '0 0 6px rgba(255,255,255,0.9)',
                                    }}
                                  />
                                </>
                              )}

                              {/* Content */}
                              <div className="absolute inset-0 flex items-center px-3 gap-2 z-10 pointer-events-none">
                                {room.isPaused ? (
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    {boxWidthPct > 5 && (
                                      <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <Pause className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                    {boxWidthPct > 12 && (
                                      <div>
                                        <p className="text-[11px] font-bold text-white uppercase tracking-wider leading-none">PAUZA</p>
                                        {boxWidthPct > 22 && <p className="text-[8px] text-white/60 mt-0.5">Operace pozastavena</p>}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    {boxWidthPct > 8 && (
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold text-white truncate leading-none drop-shadow-sm">{stepName}</p>
                                        {boxWidthPct > 14 && <p className="text-[8px] text-white/55 truncate mt-0.5">{room.staff?.doctor?.name || ''}</p>}
                                      </div>
                                    )}
                                    {boxWidthPct > 20 && remainingTime && stepIndex !== 0 && (
                                      <div
                                        className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white/80"
                                        style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.1)' }}
                                      >
                                        {remainingTime}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Free room indicator */}
                    {isFree && (
                      <div
                        className="absolute inset-y-1.5 left-1.5 right-1.5 rounded-2xl flex items-center px-3 overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.018)',
                          border: '1px dashed rgba(255,255,255,0.08)',
                        }}
                      >
                        <p className="text-[10px] font-medium text-white/20 truncate">{stepName}</p>
                      </div>
                    )}

                    {/* Room-specific end of working hours indicator */}
                    {(() => {
                      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                      const todayKey = dayKeys[currentTime.getDay()];
                      const todaySchedule = schedule[todayKey];
                      
                      if (!todaySchedule.enabled) return null;
                      
                      // Calculate end time as minutes from timeline start (7:00)
                      const endHour = todaySchedule.endHour;
                      const endMinute = todaySchedule.endMinute;
                      let minutesFromTimelineStart = (endHour * 60 + endMinute) - (TIMELINE_START_HOUR * 60);
                      // If before 7:00, it's next day portion
                      if (minutesFromTimelineStart < 0) {
                        minutesFromTimelineStart += 24 * 60;
                      }
                      const endPercent = (minutesFromTimelineStart / (TIMELINE_HOURS * 60)) * 100;
                      const isNextDayEnd = endHour >= 0 && endHour < TIMELINE_START_HOUR;
                      
                      return (
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 z-20"
                          style={{ 
                            left: `${endPercent}%`,
                            background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)'
                          }}
                        >
                          {/* End time label */}
                          <div 
                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap flex items-center gap-1"
                            style={{ 
                              background: 'rgba(249, 115, 22, 0.2)',
                              border: '1px solid rgba(249, 115, 22, 0.4)',
                              color: '#F97316'
                            }}
                          >
                            {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                            {isNextDayEnd && <span className="text-[6px] text-cyan-400">+1</span>}
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

      {/* ======== Legend Footer ======== */}
      <footer className="relative z-10 flex items-center justify-between gap-4 px-8 md:pl-32 md:pr-10 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-4 h-4 rounded bg-white/10" />
            <span className="text-[10px] font-medium text-white/40">Dokoncene</span>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-4 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #3B82F6 0px, #3B82F6 4px, transparent 4px, transparent 8px)' }} />
            <span className="text-[10px] font-medium text-white/40">Zacatek smeny</span>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-4 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #F97316 0px, #F97316 4px, transparent 4px, transparent 8px)' }} />
            <span className="text-[10px] font-medium text-white/40">Konec smeny</span>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)' }}
          >
            <div className="w-0.5 h-4 rounded-full" style={{ background: '#F97316' }} />
            <span className="text-[10px] font-medium text-orange-400/60">Konec prac. doby salu</span>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-red-500/50" />
            <span className="text-[10px] font-medium text-white/40">Presah</span>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <div 
              className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-red-400"
              style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              1
            </div>
            <span className="text-[10px] font-medium text-red-400/70">ARO poradi stridani</span>
          </div>
        </div>
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Info className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[10px] font-medium text-white/30">Kliknete na sal pro zobrazeni detailu</span>
        </div>
      </footer>
      </div>{/* end desktop wrapper */}
    </div>
  );
}

// Helper Component - Stat Box
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  glow?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, glow }) => (
  <div
    className={`relative flex-shrink-0 h-14 rounded-xl px-4 py-2.5 overflow-hidden ${glow ? 'shadow-lg' : ''}`}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${color}25 0%, ${color}15 100%)`
        : `linear-gradient(135deg, ${color}12 0%, ${color}04 100%)`,
      border: glow ? `2px solid ${color}50` : `1px solid ${color}25`,
      boxShadow: glow ? `0 0 30px ${color}30` : 'none',
    }}
  >
    {glow && (
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}30 0%, transparent 70%)`,
        }}
      />
    )}
    <div className="relative flex items-center gap-3 h-full">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}40`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-white leading-tight">{value}</p>
      </div>
    </div>
  </div>
);

// Helper Component - Room Detail Popup (Design matching screenshot)
interface RoomDetailPopupProps {
  room: OperatingRoom;
  onClose: () => void;
  currentTime: Date;
}

const RoomDetailPopup: React.FC<RoomDetailPopupProps> = ({ room, onClose, currentTime }) => {
  const { activeStatuses } = useWorkflowStatusesContext();
  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
  const nextStepIndex = stepIndex + 1 < totalSteps ? stepIndex + 1 : 0;
  
  const currentStatus = activeStatuses.length > 0 ? activeStatuses[stepIndex] : null;
  const nextStatus = activeStatuses.length > 0 ? activeStatuses[nextStepIndex] : null;
  
  const stepColor = currentStatus?.color || '#6B7280';
  const progressPercent = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;

  // Calculate elapsed time from phaseStartedAt
  const getElapsedTime = (): string => {
    if (!room.phaseStartedAt) return '--:--';
    const phaseStartTime = new Date(room.phaseStartedAt);
    const elapsedMs = currentTime.getTime() - phaseStartTime.getTime();
    if (elapsedMs < 0) return '--:--';
    
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours === 0) {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl overflow-hidden max-w-2xl w-full"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          {/* Left side - Progress circle and room info */}
          <div className="flex items-center gap-4">
            {/* Progress circle */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle 
                  cx="28" cy="28" r="24" fill="none" stroke={stepColor} strokeWidth="4"
                  strokeDasharray={`${progressPercent * 1.5} 150`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white">{progressPercent}%</span>
            </div>
            
            {/* Room name and status */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{room.name}</h2>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${stepColor}30`, color: stepColor }}
                >
                  {currentStatus?.name || 'Status'}
                </span>
              </div>
              <p className="text-white/50 text-sm mt-0.5">
                {room.department} · KROK {stepIndex + 1} Z {totalSteps}
              </p>
            </div>
          </div>
          
          {/* Right side - Step dots, time display and close */}
          <div className="flex items-center gap-6">
            {/* Step progress dots */}
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider text-right mb-1">DOBA OPERACE</p>
              <div className="flex items-center gap-1">
                {activeStatuses.map((_, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: idx <= stepIndex ? stepColor : 'rgba(255,255,255,0.2)' }}
                    />
                    <div
                      className="w-0.5 h-2"
                      style={{ backgroundColor: idx <= stepIndex ? stepColor : 'rgba(255,255,255,0.2)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Operation progress section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-white/40" />
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">POSTUP OPERACE</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Current step */}
              <div 
                className="flex-1 rounded-2xl p-4 border"
                style={{ 
                  backgroundColor: `${stepColor}15`,
                  borderColor: `${stepColor}40`
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: stepColor }}>
                      PRAVE PROBIHA
                    </span>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${stepColor}30`, color: stepColor }}
                  >
                    Krok {stepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stepColor}20` }}
                  >
                    <Stethoscope className="w-5 h-5" style={{ color: stepColor }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{currentStatus?.name || 'Status'}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {getElapsedTime()} --:--
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${stepColor}30` }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: stepColor }} />
              </div>

              {/* Next step */}
              <div className="flex-1 rounded-2xl p-4 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/30" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                      NASLEDUJICI
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/40">
                    Krok {nextStepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10">
                    <Sparkles className="w-5 h-5 text-white/40" />
                  </div>
                  <div>
                    <p className="text-white/80 font-semibold">{nextStatus?.name || 'Další krok'}</p>
                    <p className="text-white/30 text-xs mt-0.5">Ceka na zahajeni</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row - Team and Times */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-white/40" />
                <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">TYM</p>
              </div>
              <div className="flex gap-3">
                {/* Doctor */}
                <div className="flex-1 rounded-xl p-3 bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/20">
                      <Stethoscope className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">ANESTEZIOLOG</p>
                      <p className="text-sm font-semibold text-white">{room.staff?.doctor?.name || 'MUDr. --'}</p>
                    </div>
                  </div>
                </div>
                {/* Nurse */}
                <div className="flex-1 rounded-xl p-3 bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20">
                      <Users className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">SESTRA</p>
                      <p className="text-sm font-semibold text-white">{room.staff?.nurse?.name || 'Bc. --'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Times section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white/40" />
                <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">CASY</p>
              </div>
              <div className="flex gap-3">
                {/* Start time */}
                <div className="flex-1 rounded-xl p-3 bg-white/5 border border-white/10 text-center">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">ZACATEK</p>
                  <p className="text-xl font-mono font-bold text-white/60">--:--</p>
                </div>
                {/* Estimated end */}
                <div className="flex-1 rounded-xl p-3 bg-white/5 border border-white/10 text-center">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">ODHAD</p>
                  <p className="text-xl font-mono font-bold" style={{ color: stepColor }}>
                    {room.estimatedEndTime 
                      ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

