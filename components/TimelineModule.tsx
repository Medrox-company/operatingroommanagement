import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 200;
const HOURS_COUNT = 24;

/* --- Generate week days --- */
const generateWeekDays = (startDate: Date) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push({
      date,
      dayNum: date.getDate(),
      dayName: date.toLocaleDateString('cs-CZ', { weekday: 'short' }),
      isToday: date.toDateString() === new Date().toDateString(),
    });
  }
  return days;
};

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;

/* --- Enhanced step colors for Gantt bars --- */
const GANTT_COLORS: Record<number, { gradient: string; border: string; text: string; stripe: string }> = {
  0: { gradient: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', border: '#2DD4BF', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
  1: { gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)', border: '#A78BFA', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
  2: { gradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', border: '#34D399', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
  3: { gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)', border: '#FBBF24', text: '#1a1a2e', stripe: 'rgba(0,0,0,0.1)' },
  4: { gradient: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)', border: '#818CF8', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
  5: { gradient: 'linear-gradient(135deg, #5B65DC 0%, #4F46E5 100%)', border: '#5B65DC', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
  6: { gradient: 'linear-gradient(135deg, #34C759 0%, #22C55E 100%)', border: '#34C759', text: '#ffffff', stripe: 'rgba(255,255,255,0.15)' },
};

/* --- Step colors for popup --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string }> = {
  0: { bg: 'rgba(167,139,250,0.20)', fill: 'rgba(167,139,250,0.45)', border: 'rgba(167,139,250,0.25)', text: '#A78BFA', glow: 'rgba(167,139,250,0.35)', solid: '#A78BFA' },
  1: { bg: 'rgba(45,212,191,0.20)', fill: 'rgba(45,212,191,0.45)', border: 'rgba(45,212,191,0.25)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.35)', solid: '#2DD4BF' },
  2: { bg: 'rgba(255,59,48,0.20)', fill: 'rgba(255,59,48,0.45)', border: 'rgba(255,59,48,0.25)', text: '#FF3B30', glow: 'rgba(255,59,48,0.35)', solid: '#FF3B30' },
  3: { bg: 'rgba(251,191,36,0.20)', fill: 'rgba(251,191,36,0.45)', border: 'rgba(251,191,36,0.25)', text: '#FBBF24', glow: 'rgba(251,191,36,0.35)', solid: '#FBBF24' },
  4: { bg: 'rgba(129,140,248,0.20)', fill: 'rgba(129,140,248,0.45)', border: 'rgba(129,140,248,0.25)', text: '#818CF8', glow: 'rgba(129,140,248,0.35)', solid: '#818CF8' },
  5: { bg: 'rgba(91,101,220,0.20)', fill: 'rgba(91,101,220,0.45)', border: 'rgba(91,101,220,0.25)', text: '#5B65DC', glow: 'rgba(91,101,220,0.35)', solid: '#5B65DC' },
  6: { bg: 'rgba(52,199,89,0.20)', fill: 'rgba(52,199,89,0.45)', border: 'rgba(52,199,89,0.25)', text: '#34C759', glow: 'rgba(52,199,89,0.35)', solid: '#34C759' },
};

/* ============================== */
/* Room Detail Popup Component    */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;
  const nextStep = stepIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[stepIndex + 1] : null;
  const nextColors = stepIndex < 6 ? (STEP_COLORS[stepIndex + 1] || STEP_COLORS[6]) : null;

  const startParts = room.currentProcedure?.startTime?.split(':');
  let elapsedStr = '--:--:--';
  if (startParts && startParts.length === 2 && isActive) {
    const startDate = new Date();
    startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    const elapsed = Math.max(0, Math.floor((currentTime.getTime() - startDate.getTime()) / 1000));
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    elapsedStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const progress = room.currentProcedure?.progress || 0;
  const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : colors.text;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="absolute inset-0 bg-black/60 backdrop-blur-2xl" 
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-[900px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(40px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 80px ${themeColor}15`
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className="absolute top-0 left-0 right-0 h-[2px]" 
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
          }}
        />

        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />

        <motion.div 
          className="flex items-center justify-between px-7 py-5 border-b relative"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
        >
          <div className="flex items-center gap-5">
            <motion.div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <motion.circle 
                  cx="32" cy="32" r="26" fill="none"
                  stroke={themeColor}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 26}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 26 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-white">{progress}%</span>
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black tracking-tight text-white">{room.name}</h2>
                {isActive && (
                  <span 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider border" 
                    style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}15` }}
                  >
                    {step.title}
                  </span>
                )}
                {room.isEmergency && (
                  <motion.span 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-red-500/20 text-red-400 border border-red-500/40"
                    animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.4)', '0 0 0 rgba(239,68,68,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    EMERGENCY
                  </motion.span>
                )}
              </div>
              <p className="text-xs font-medium text-white/30 tracking-wider uppercase">{room.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {isActive && (
              <div className="text-right">
                <p className="text-[8px] font-bold text-white/25 tracking-[0.15em] uppercase mb-1">DOBA OPERACE</p>
                <motion.p 
                  className="text-2xl font-black font-mono tracking-widest" 
                  style={{ color: themeColor }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {elapsedStr}
                </motion.p>
              </div>
            )}
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              whileHover={{ scale: 1.05, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4 text-white/50" />
            </motion.button>
          </div>
        </motion.div>

        <div className="px-7 py-5 space-y-5">
          {isActive && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Activity className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Postup operace</h3>
              </div>
              <div className="flex gap-3 items-stretch">
                <div 
                  className="flex-1 rounded-2xl p-4 border relative overflow-hidden"
                  style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}25` }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: themeColor }} 
                        animate={{ opacity: [1, 0.4, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }} 
                      />
                      <span className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
                    >
                      <step.Icon className="w-5 h-5" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{step.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] text-white/30">{room.currentProcedure?.startTime || '--:--'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <motion.div 
                        className="w-9 h-9 rounded-full flex items-center justify-center border"
                        style={{ backgroundColor: `${nextColors.text}12`, borderColor: `${nextColors.text}25` }}
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ChevronRight className="w-4 h-4" style={{ color: nextColors.text }} />
                      </motion.div>
                    </div>
                    <div
                      className="flex-1 rounded-2xl p-4 border"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-white/15" />
                        <span className="text-[9px] font-black tracking-[0.12em] uppercase text-white/35">NASLEDUJICI</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-white/[0.04] border-white/[0.08]">
                          <nextStep.Icon className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white/50">{nextStep.title}</p>
                          <p className="text-[10px] text-white/20 mt-1">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Stethoscope className="w-4 h-4 text-white/30" />
              <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Prubeh vykonu</h3>
            </div>
            <div className="flex items-start gap-1">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                    <motion.div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-1.5 transition-all ${!isCurrent && !isCompleted ? 'opacity-30' : ''}`}
                      style={{
                        backgroundColor: isCurrent ? `${sc.text}20` : isCompleted ? `${sc.text}10` : 'rgba(255,255,255,0.03)',
                        borderColor: isCurrent ? `${sc.text}50` : isCompleted ? `${sc.text}20` : 'rgba(255,255,255,0.06)',
                        boxShadow: isCurrent ? `0 0 20px ${sc.glow}` : 'none',
                      }}
                      animate={isCurrent ? { y: [0, -3, 0] } : {}}
                      transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                    >
                      <ws.Icon className="w-4 h-4" style={{ color: isCurrent || isCompleted ? sc.text : 'rgba(255,255,255,0.2)' }} />
                    </motion.div>
                    <span className={`text-[8px] font-bold text-center truncate w-full ${isCurrent ? '' : 'text-white/30'}`} style={{ color: isCurrent ? sc.text : undefined }}>
                      {ws.title}
                    </span>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="absolute top-4 left-1/2 w-full h-[2px]" style={{ backgroundColor: isCompleted ? sc.text : 'rgba(255,255,255,0.06)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Gantt Bar Component            */
/* ============================== */
const GanttBar: React.FC<{
  room: OperatingRoom;
  dayIndex: number;
  totalDays: number;
  colorIndex: number;
  onClick: () => void;
}> = ({ room, dayIndex, totalDays, colorIndex, onClick }) => {
  const colors = GANTT_COLORS[colorIndex % Object.keys(GANTT_COLORS).length];
  const step = WORKFLOW_STEPS[Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1)];
  
  // Calculate bar position based on start and duration
  const startDayOffset = dayIndex;
  const durationDays = Math.min(room.currentProcedure?.estimatedDuration ? Math.ceil(room.currentProcedure.estimatedDuration / 480) : 2, totalDays - startDayOffset);
  
  const leftPercent = (startDayOffset / totalDays) * 100;
  const widthPercent = (durationDays / totalDays) * 100;

  // Get time info
  const startTime = room.currentProcedure?.startTime || '08:00';
  const endTime = room.estimatedEndTime 
    ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    : '16:00';

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-2 bottom-2 rounded-xl cursor-pointer group"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '120px',
        background: colors.gradient,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 4px 20px ${colors.border}40`,
        transformOrigin: 'left center',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.02, boxShadow: `0 8px 30px ${colors.border}60` }}
    >
      {/* Diagonal stripes pattern */}
      <div 
        className="absolute inset-0 rounded-xl overflow-hidden opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 8px,
            ${colors.stripe} 8px,
            ${colors.stripe} 9px
          )`,
        }}
      />

      {/* Content */}
      <div className="relative h-full flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <step.Icon className="w-4 h-4" style={{ color: colors.text }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: colors.text }}>
              {step.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" style={{ color: `${colors.text}80` }} />
              <span className="text-[10px] font-medium" style={{ color: `${colors.text}90` }}>
                {startTime} - {endTime}
              </span>
            </div>
          </div>
        </div>

        {/* Menu button */}
        <motion.button
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" style={{ color: colors.text }} />
        </motion.button>
      </div>
    </motion.div>
  );
};

/* ============================== */
/* Main Timeline Module           */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    return monday;
  }, [weekOffset]);

  const weekDays = useMemo(() => generateWeekDays(weekStart), [weekStart]);

  const todayIndex = useMemo(() => {
    return weekDays.findIndex(d => d.isToday);
  }, [weekDays]);

  /* --- Stats --- */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, emergency };
  }, [rooms]);

  /* --- Sorted rooms --- */
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      const aActive = a.currentStepIndex < 6;
      const bActive = b.currentStepIndex < 6;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [rooms]);

  const dateRangeStr = `${weekDays[0].date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })} - ${weekDays[6].date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <div className="w-full h-full overflow-hidden flex flex-col relative" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)' }}>

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* ======== Header ======== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">Timeline Project</h1>
            <p className="text-xs text-white/40">Prehled operacnich salu</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <CalendarDays className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/70">{dateRangeStr}</span>
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
            <motion.button
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              onClick={() => setWeekOffset(w => w - 1)}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </motion.button>
            <span className="text-sm font-medium text-white/70 px-2">Tento tyden</span>
            <motion.button
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              onClick={() => setWeekOffset(w => w + 1)}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2">
            {stats.emergency > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400">{stats.emergency}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">{stats.operations}</span>
            </div>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30">
            <Clock className="w-4 h-4 text-[#2DD4BF]" />
            <span className="text-sm font-mono font-bold text-[#2DD4BF]">
              {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* ======== Main Timeline Grid ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 pb-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e3f]/50 backdrop-blur-sm">

          {/* Day Headers */}
          <div className="flex flex-shrink-0 border-b border-white/10">
            {/* Room label header */}
            <div 
              className="flex-shrink-0 flex items-center px-4 py-3 border-r border-white/10 bg-[#1a1a35]"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/40" />
                <span className="text-xs font-bold tracking-wide uppercase text-white/40">Operacni saly</span>
              </div>
            </div>

            {/* Day columns */}
            <div className="flex-1 flex">
              {weekDays.map((day, i) => (
                <div 
                  key={i}
                  className={`flex-1 flex flex-col items-center justify-center py-3 border-r border-white/5 last:border-r-0 transition-colors ${
                    day.isToday ? 'bg-[#2DD4BF]/10' : ''
                  }`}
                >
                  <span className={`text-lg font-bold ${day.isToday ? 'text-[#2DD4BF]' : 'text-white/80'}`}>
                    {day.dayNum}
                  </span>
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${day.isToday ? 'text-[#2DD4BF]/70' : 'text-white/40'}`}>
                    {day.dayName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Room Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
            {sortedRooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const isActive = stepIndex < 6;
              const isFree = stepIndex >= 6;

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: roomIndex * 0.03, duration: 0.4 }}
                  className="flex items-stretch border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  style={{ minHeight: '64px' }}
                >
                  {/* Room label */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ width: ROOM_LABEL_WIDTH }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {/* Avatar */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                      style={{ 
                        background: room.isEmergency 
                          ? 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)' 
                          : room.isLocked 
                            ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
                            : isActive 
                              ? `linear-gradient(135deg, ${GANTT_COLORS[stepIndex % 7].border} 0%, ${GANTT_COLORS[stepIndex % 7].border}80 100%)`
                              : 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                        borderColor: room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : isActive ? GANTT_COLORS[stepIndex % 7].border : '#374151'
                      }}
                    >
                      {room.isEmergency ? (
                        <AlertTriangle className="w-5 h-5 text-white" />
                      ) : room.isLocked ? (
                        <Lock className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {room.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Room info */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isActive || room.isEmergency ? 'text-white' : 'text-white/50'}`}>
                        {room.name}
                      </p>
                      <p className="text-[10px] text-white/30 truncate">
                        {room.isEmergency ? 'EMERGENCY' : room.isLocked ? 'Uzamceno' : room.department || 'Volny'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline grid area */}
                  <div className="flex-1 relative">
                    {/* Day grid lines */}
                    <div className="absolute inset-0 flex">
                      {weekDays.map((day, i) => (
                        <div 
                          key={i} 
                          className={`flex-1 border-r border-white/5 last:border-r-0 ${day.isToday ? 'bg-[#2DD4BF]/5' : ''}`}
                        />
                      ))}
                    </div>

                    {/* Today indicator line */}
                    {todayIndex >= 0 && (
                      <div 
                        className="absolute top-0 bottom-0 z-20 pointer-events-none"
                        style={{ left: `${((todayIndex + 0.5) / 7) * 100}%` }}
                      >
                        <div 
                          className="absolute -left-px top-0 bottom-0 w-[2px]"
                          style={{ 
                            backgroundImage: 'repeating-linear-gradient(to bottom, #2DD4BF 0px, #2DD4BF 6px, transparent 6px, transparent 12px)'
                          }}
                        />
                        {roomIndex === 0 && (
                          <div className="absolute -left-[6px] -top-[2px] w-[14px] h-[14px] rounded-full bg-[#2DD4BF] shadow-[0_0_12px_#2DD4BF]" />
                        )}
                      </div>
                    )}

                    {/* Gantt bars */}
                    {isActive && !room.isLocked && (
                      <GanttBar
                        room={room}
                        dayIndex={room.isEmergency ? todayIndex : Math.max(0, todayIndex - 1)}
                        totalDays={7}
                        colorIndex={stepIndex}
                        onClick={() => setSelectedRoom(room)}
                      />
                    )}

                    {/* Emergency full bar */}
                    {room.isEmergency && (
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.3) 0%, rgba(255,59,48,0.15) 50%, rgba(255,59,48,0.3) 100%)', border: '1px solid rgba(255,59,48,0.4)' }}>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,59,48,1) 8px, rgba(255,59,48,1) 9px)' }} />
                        <div className="relative h-full flex items-center justify-center">
                          <span className="text-sm font-black tracking-[0.4em] text-white/70 uppercase">EMERGENCY</span>
                        </div>
                      </div>
                    )}

                    {/* Locked bar */}
                    {room.isLocked && (
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl flex items-center justify-center gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px dashed rgba(251,191,36,0.3)' }}>
                        <Lock className="w-4 h-4 text-amber-400/40" />
                        <span className="text-xs font-bold tracking-[0.2em] text-amber-400/50 uppercase">Uzamceno</span>
                      </div>
                    )}

                    {/* Free indicator */}
                    {isFree && !room.isLocked && (
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl flex items-center justify-center" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <span className="text-[10px] font-bold tracking-[0.3em] text-white/15 uppercase">Volny</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
