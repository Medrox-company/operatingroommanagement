import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2
} from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 200;
const TIMELINE_START_HOUR = 7;  // Timeline starts at 7:00
const TIMELINE_HOURS = 24;      // 24 hours displayed (7:00 to 7:00 next day)
const TIME_MARKERS = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => (TIMELINE_START_HOUR + i) % 24); // 7, 8, 9... 23, 0, 1, 2, 3, 4, 5, 6, 7
const SHIFT_START_HOUR = 7;  // 7:00 AM
const SHIFT_END_HOUR = 19;   // 7:00 PM
const ROW_HEIGHT = 56;

// Get minutes from timeline start (7:00)
const getMinutesFromTimelineStart = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  // Calculate minutes from 7:00
  let totalMinutes = (hours * 60 + minutes) - (TIMELINE_START_HOUR * 60);
  // If negative (before 7:00), it's next day portion
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  return totalMinutes;
};

// Convert time to percentage of 24h timeline (from 7:00 to 7:00)
const getTimePercent = (date: Date) => {
  const minutesFromStart = getMinutesFromTimelineStart(date);
  return (minutesFromStart / (TIMELINE_HOURS * 60)) * 100;
};

// Parse time string "HH:MM" to Date object (today)
const parseTimeToDate = (timeStr: string): Date => {
  const parts = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  return date;
};

// Get hour label with next day indicator
const hourLabel = (h: number, showNextDay = false) => {
  const hour = h % 24;
  const label = `${hour < 10 ? '0' : ''}${hour}:00`;
  // Hours 0-6 are next day when timeline starts at 7:00
  if (showNextDay && hour >= 0 && hour < TIMELINE_START_HOUR) {
    return label + ' +1';
  }
  return label;
};

// Check if hour is in "next day" portion of timeline
const isNextDayHour = (h: number) => h >= 0 && h < TIMELINE_START_HOUR;

/* --- Room colors by priority/activity - softer palette --- */
const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#FB923C', border: '#FDBA74', stripe: '#FED7AA', text: '#FFF', glow: 'rgba(251,146,60,0.2)' },
  purple: { bg: '#C084FC', border: '#D8B4FE', stripe: '#E9D5FF', text: '#FFF', glow: 'rgba(192,132,252,0.2)' },
  pink: { bg: '#F472B6', border: '#F9A8D4', stripe: '#FBCFE8', text: '#FFF', glow: 'rgba(244,114,182,0.2)' },
  blue: { bg: '#60A5FA', border: '#93C5FD', stripe: '#BFDBFE', text: '#FFF', glow: 'rgba(96,165,250,0.2)' },
  green: { bg: '#4ADE80', border: '#86EFAC', stripe: '#BBF7D0', text: '#FFF', glow: 'rgba(74,222,128,0.2)' },
  red: { bg: '#F87171', border: '#FCA5A5', stripe: '#FECACA', text: '#FFF', glow: 'rgba(248,113,113,0.2)' },
  cyan: { bg: '#22D3EE', border: '#67E8F9', stripe: '#A5F3FC', text: '#FFF', glow: 'rgba(34,211,238,0.2)' },
};

const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'];

/* --- Step colors matching WORKFLOW_STEPS - softer palette --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string }> = {
  0: { bg: 'rgba(94,234,212,0.15)', fill: 'rgba(94,234,212,0.35)', border: 'rgba(94,234,212,0.25)', text: '#5EEAD4', glow: 'rgba(94,234,212,0.2)', solid: '#5EEAD4' },
  1: { bg: 'rgba(196,181,253,0.15)', fill: 'rgba(196,181,253,0.35)', border: 'rgba(196,181,253,0.25)', text: '#C4B5FD', glow: 'rgba(196,181,253,0.2)', solid: '#C4B5FD' },
  2: { bg: 'rgba(252,165,165,0.15)', fill: 'rgba(252,165,165,0.35)', border: 'rgba(252,165,165,0.25)', text: '#FCA5A5', glow: 'rgba(252,165,165,0.2)', solid: '#FCA5A5' },
  3: { bg: 'rgba(253,224,71,0.15)', fill: 'rgba(253,224,71,0.35)', border: 'rgba(253,224,71,0.25)', text: '#FDE047', glow: 'rgba(253,224,71,0.2)', solid: '#FDE047' },
  4: { bg: 'rgba(165,180,252,0.15)', fill: 'rgba(165,180,252,0.35)', border: 'rgba(165,180,252,0.25)', text: '#A5B4FC', glow: 'rgba(165,180,252,0.2)', solid: '#A5B4FC' },
  5: { bg: 'rgba(240,171,252,0.15)', fill: 'rgba(240,171,252,0.35)', border: 'rgba(240,171,252,0.25)', text: '#F0ABFC', glow: 'rgba(240,171,252,0.2)', solid: '#F0ABFC' },
  6: { bg: 'rgba(253,186,116,0.15)', fill: 'rgba(253,186,116,0.35)', border: 'rgba(253,186,116,0.25)', text: '#FDBA74', glow: 'rgba(253,186,116,0.2)', solid: '#FDBA74' },
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

  let endTimeStr = '--:--';
  if (room.estimatedEndTime) {
    endTimeStr = new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  } else if (room.currentProcedure?.estimatedDuration && startParts && startParts.length === 2) {
    const sd = new Date();
    sd.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    endTimeStr = new Date(sd.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
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
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: 'blur(32px)' }}
        exit={{ backdropFilter: 'blur(0px)' }}
      />

      <motion.div
        className="relative w-full max-w-[900px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px ${themeColor}15`
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
            filter: `drop-shadow(0 0 8px ${themeColor})`
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

        <motion.div 
          className="flex items-center justify-between px-7 py-5 border-b relative"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <motion.h2 
                  className="text-2xl font-black tracking-tight text-white"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {room.name}
                </motion.h2>
                {isActive && (
                  <motion.span 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider border" 
                    style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}15` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {step.title}
                  </motion.span>
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
                {room.isLocked && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">UZAMCENO</span>
                )}
              </div>
              <p className="text-xs font-medium text-white/30 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {isActive && (
              <motion.div 
                className="text-right"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <p className="text-[8px] font-bold text-white/25 tracking-[0.15em] uppercase mb-1">DOBA OPERACE</p>
                <motion.p 
                  className="text-2xl font-black font-mono tracking-widest" 
                  style={{ color: themeColor, textShadow: `0 0 20px ${themeColor}40` }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {elapsedStr}
                </motion.p>
              </motion.div>
            )}
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}
              whileHover={{ 
                scale: 1.05, 
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <X className="w-4 h-4 text-white/50" />
            </motion.button>
          </div>
        </motion.div>

        <div className="px-7 py-5 space-y-5">
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Activity className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Postup operace</h3>
              </div>
              <div className="flex gap-3 items-stretch">
                <motion.div 
                  className="flex-1 rounded-2xl p-4 border relative overflow-hidden"
                  style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}25`, backdropFilter: 'blur(20px)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  whileHover={{ scale: 1.02, borderColor: `${themeColor}40` }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} 
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }} 
                      />
                      <span className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: themeColor, backgroundColor: `${themeColor}15` }}>
                      Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{step.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-white/20" />
                      <span className="text-[10px] text-white/30">{room.currentProcedure?.startTime || '--:--'}</span>
                      <span className="text-[10px] font-bold" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                    </div>
                  </div>
                </motion.div>

                {nextStep && nextColors && (
                  <motion.div
                    className="flex-1 rounded-2xl p-4 border"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/15" />
                        <span className="text-[9px] font-black tracking-[0.12em] uppercase text-white/35">NASLEDUJICI</span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-white/25 bg-white/[0.05]">
                        Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white/50">{nextStep.title}</p>
                      <p className="text-[10px] text-white/20 mt-1">Ceka na zahajeni</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Users className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Tym</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#2DD4BF', icon: Users },
                ].map((member, idx) => (
                  <motion.div 
                    key={member.label} 
                    className="flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.03, borderColor: `${member.color}30`, background: `${member.color}05` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: `${member.color}10`, borderColor: `${member.color}25` }}>
                      <member.icon className="w-4 h-4" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black tracking-[0.12em] uppercase text-white/30">{member.label}</p>
                      <p className={`text-xs font-bold truncate ${member.name ? 'text-white/70' : 'text-white/20 italic'}`}>
                        {member.name || 'Neprirazeno'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <Clock className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Casy</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ZACATEK', value: room.currentProcedure?.startTime || '--:--', color: 'text-white/70' },
                  { label: 'ODHAD', value: endTimeStr, color: isActive ? '' : 'text-white/30', highlight: isActive }
                ].map((time, idx) => (
                  <motion.div 
                    key={time.label}
                    className="rounded-xl border px-5 py-3 text-center min-w-[100px]"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05, borderColor: time.highlight ? `${themeColor}40` : 'rgba(255,255,255,0.15)' }}
                  >
                    <p className="text-[8px] font-black tracking-[0.12em] uppercase text-white/25 mb-1">{time.label}</p>
                    <p 
                      className={`text-2xl font-black font-mono tracking-wider ${time.color}`} 
                      style={time.highlight ? { color: themeColor, textShadow: `0 0 15px ${themeColor}30` } : {}}
                    >
                      {time.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};


/* ============================== */
/* Status Badge Component          */
/* ============================== */
const StatusBadge: React.FC<{ 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color?: string;
  variant?: 'default' | 'outline';
}> = ({ icon: Icon, label, value, color, variant = 'default' }) => {
  const isOutline = variant === 'outline';
  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
        isOutline ? 'bg-transparent' : 'bg-white/[0.04]'
      }`}
      style={{ borderColor: color ? `${color}40` : 'rgba(255,255,255,0.1)' }}
    >
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color ? `${color}20` : 'rgba(255,255,255,0.1)' }}
      >
        <Icon className="w-3 h-3" style={{ color: color || 'rgba(255,255,255,0.5)' }} />
      </div>
      <span className="text-sm font-bold" style={{ color: color || 'rgba(255,255,255,0.9)' }}>
        {value}
      </span>
      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};


/* ============================== */
/* Stat Box Component             */
/* ============================== */
const StatBox: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  glow?: boolean;
}> = ({ icon: Icon, label, value, color, glow }) => (
  <div
    className={`relative flex-shrink-0 h-14 rounded-xl px-4 py-2.5 overflow-hidden ${glow ? 'animate-pulse' : ''}`}
    style={{
      background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
      border: `1px solid ${color}40`,
      boxShadow: `0 0 20px ${color}15`,
    }}
  >
    <div
      className="absolute inset-0 opacity-40"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${color}30 0%, transparent 70%)`,
      }}
    />
    <div className="relative flex items-center gap-3 h-full">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${color}40 0%, ${color}15 100%)`,
          border: `1px solid ${color}50`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold leading-tight" style={{ color }}>{value}</p>
      </div>
    </div>
  </div>
);

/* ============================== */
/* Timeline Module                */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    const doctorsWorking = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex < 6).length;
    const doctorsFree = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex >= 6).length;
    const nursesWorking = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex < 6).length;
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
            const step = WORKFLOW_STEPS[room.currentStepIndex];
            const color = room.isEmergency ? '#EF4444' : room.isLocked ? '#FBBF24' : step.color;
            const remaining = getRemainingTime(room);
            const isFree = room.currentStepIndex >= 6;
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
                  </div>
                  {remaining && !isFree && (
                    <span className="text-[11px] font-mono font-bold" style={{ color }}>{remaining}</span>
                  )}
                  {isFree && <span className="text-[10px] font-black text-emerald-400/70 uppercase tracking-wider">Volný</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{step.title}</p>
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
                    style={{ width: `${((room.currentStepIndex + 1) / WORKFLOW_STEPS.length) * 100}%`, backgroundColor: color, opacity: 0.6 }}
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
                const displayHour = hour % 24;
                const isNightHour = displayHour >= 19 || displayHour < 7;
                const isNextDay = isNextDayHour(hour);
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
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const isActive = stepIndex < 6;
              const isCleaning = stepIndex === 5;
              const isFree = stepIndex >= 6;
              
              // Only increment counter for active (non-free) rooms
              if (isActive && !room.isEmergency && !room.isLocked) {
                activeRoomCounter++;
              }
              const currentRoomNumber = isActive && !room.isEmergency && !room.isLocked ? activeRoomCounter : 0;
              
              const roomColorKey = ROOM_COLOR_ORDER[(currentRoomNumber - 1) % ROOM_COLOR_ORDER.length];
              const roomColor = ROOM_COLORS[roomColorKey] || ROOM_COLORS.blue;
              const remainingTime = getRemainingTime(room);
              
              // Get current workflow step info for status display
              const currentStep = WORKFLOW_STEPS[stepIndex] || WORKFLOW_STEPS[6];
              const stepColor = currentStep.color;
              const StepIcon = currentStep.Icon;

              // Calculate operation bar position
              // Use currentProcedure if available, otherwise generate fallback values for active rooms
              const startParts = room.currentProcedure?.startTime?.split(':');
              let boxLeftPct = 0;
              let boxWidthPct = 0;
              let progressPct = 0;
              let startDate: Date = new Date();
              let endDate: Date = new Date();

              if (isActive) {
                if (startParts && startParts.length === 2) {
                  // Use actual procedure start time
                  startDate = new Date();
                  startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
                } else {
                  // Fallback: generate a start time based on room index (staggered starts from 7:00-12:00)
                  startDate = new Date();
                  const baseHour = 7 + (roomIndex % 6); // Start between 7:00 and 12:00
                  const baseMinute = (roomIndex * 17) % 60; // Stagger by ~17 min
                  startDate.setHours(baseHour, baseMinute, 0, 0);
                }
                
                boxLeftPct = getTimePercent(startDate);
                
                if (room.estimatedEndTime) {
                  endDate = new Date(room.estimatedEndTime);
                } else if (room.currentProcedure?.estimatedDuration) {
                  endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                } else {
                  // Fallback: generate duration based on step (longer for surgery steps)
                  const fallbackDurations = [30, 20, 120, 60, 30, 45, 0]; // minutes per step
                  const duration = fallbackDurations[Math.min(stepIndex, 6)] || 90;
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
                      </div>
                      {isFree ? (
                        <p className="text-[9px] font-medium text-white/25 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400/40" />
                          Volny
                        </p>
                      ) : remainingTime && stepIndex !== 6 ? (
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
                    {isActive && boxWidthPct > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.6, delay: roomIndex * 0.02, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-1.5 bottom-1.5 overflow-hidden rounded-xl group/bar"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`,
                          transformOrigin: 'left center'
                        }}
                      >
                        {/* Outer glow effect - subtle */}
                        <div 
                          className="absolute -inset-0.5 rounded-xl blur-sm opacity-20"
                          style={{ background: stepColor }}
                        />

                        {/* Main container with gradient border - softer */}
                        <div 
                          className="absolute inset-0 rounded-xl"
                          style={{ 
                            background: `linear-gradient(135deg, ${stepColor}18 0%, ${stepColor}08 100%)`,
                            border: `1px solid ${stepColor}35`,
                            boxShadow: `0 2px 8px ${stepColor}15`
                          }}
                        />

                        {/* Top highlight reflection - subtle */}
                        <div 
                          className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl opacity-15"
                          style={{ 
                            background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)`
                          }}
                        />

                        {/* Radial glow from top - subtle */}
                        <div 
                          className="absolute inset-0 opacity-30"
                          style={{ 
                            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${stepColor}25 0%, transparent 70%)`
                          }}
                        />

                        {/* Completed section - cleaner, softer */}
                        <div 
                          className="absolute inset-0 rounded-xl overflow-hidden" 
                          style={{ clipPath: `inset(0 ${100 - progressPct}% 0 0)` }}
                        >
                          {/* Solid progress fill - softer gradient */}
                          <div 
                            className="absolute inset-0"
                            style={{ 
                              background: `linear-gradient(135deg, ${stepColor}90 0%, ${stepColor}70 100%)`
                            }}
                          />
                          
                          {/* Subtle top highlight only */}
                          <div 
                            className="absolute inset-x-0 top-0 h-1/3 opacity-20" 
                            style={{ 
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)'
                            }} 
                          />
                        </div>

                        {/* Status segments - colored bands for each workflow step duration */}
                        {(() => {
                          const STEP_DURATIONS = [15, 30, 60, 15, 30, 30, 0]; // minutes per step from constants
                          const segments = [];
                          let accumulatedPercent = 0;

                          // Get the total operation time (end time - start time)
                          if (startParts && startParts.length === 2 && endDate) {
                            const totalDurationMs = endDate.getTime() - startDate.getTime();
                            const totalDurationMinutes = totalDurationMs / (60 * 1000);

                            // Create segments for steps currently completed and current step
                            for (let i = 0; i <= stepIndex && i < WORKFLOW_STEPS.length; i++) {
                              let stepDuration = STEP_DURATIONS[i] || 0;
                              
                              // If this is the surgery step, use actual procedure duration
                              if (i === 2 && room.currentProcedure?.estimatedDuration) {
                                stepDuration = room.currentProcedure.estimatedDuration;
                              }

                              const stepPercent = (stepDuration / totalDurationMinutes) * 100;
                              const stepColors = STEP_COLORS[i] || STEP_COLORS[6];
                              
                              segments.push({
                                startPercent: accumulatedPercent,
                                width: stepPercent,
                                color: stepColors.solid,
                                stepIndex: i,
                                stepTitle: WORKFLOW_STEPS[i]?.title
                              });

                              accumulatedPercent += stepPercent;
                            }
                          }

                          return segments.map((segment, idx) => (
                            <div
                              key={idx}
                              className="absolute inset-y-0 group/segment hover:brightness-110 transition-all"
                              style={{
                                left: `${segment.startPercent}%`,
                                width: `${segment.width}%`,
                                background: segment.color,
                                opacity: 0.75
                              }}
                              title={segment.stepTitle}
                            >
                              {/* Thin vertical divider between segments */}
                              {idx < segments.length - 1 && (
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-px"
                                  style={{ background: 'rgba(255,255,255,0.2)' }}
                                />
                              )}
                              
                              {/* Step label on hover */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/segment:opacity-100 transition-opacity">
                                <span className="text-[8px] font-bold text-white/90 text-center px-1 line-clamp-2">
                                  {segment.stepTitle}
                                </span>
                              </div>
                            </div>
                          ));
                        })()}

                        {/* Current position indicator - subtle line */}
                        {progressPct > 0 && progressPct < 100 && (
                          <>
                            {/* Main line - simple */}
                            <div 
                              className="absolute top-0 bottom-0 w-[1.5px] -translate-x-1/2"
                              style={{ 
                                left: `${progressPct}%`,
                                background: 'rgba(255,255,255,0.8)'
                              }}
                            />
                            {/* Small top indicator */}
                            <div 
                              className="absolute -top-0.5 w-1.5 h-1.5 rounded-full -translate-x-1/2"
                              style={{ 
                                left: `${progressPct}%`,
                                background: 'rgba(255,255,255,0.9)'
                              }}
                            />
                          </>
                        )}

                        {/* Content overlay - title and status */}
                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none gap-2">
                          {/* Step title and status */}
                          {boxWidthPct > 8 && (
                            <div className="min-w-0 flex-1">
                              <p 
                                className="text-[10px] font-medium text-white/90 truncate"
                              >
                                {currentStep.title}
                              </p>
                              <p 
                                className="text-[8px] font-normal text-white/50 truncate"
                              >
                                {currentStep.status}
                              </p>
                            </div>
                          )}
                          
                          {/* Remaining time badge */}
                          {boxWidthPct > 18 && remainingTime && stepIndex !== 6 && (
                            <div 
                              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-medium text-white/70"
                              style={{ 
                                background: 'rgba(0,0,0,0.2)'
                              }}
                            >
                              {remainingTime}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Free room indicator - softer */}
                    {isFree && (
                      <div 
                        className="absolute inset-y-2 left-2 right-2 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ 
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px dashed rgba(255,255,255,0.08)'
                        }}
                      >
                        <div className="text-center">
                          <p className="text-[10px] font-medium text-white/30">{currentStep.title}</p>
                        </div>
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
};

export default TimelineModule;
