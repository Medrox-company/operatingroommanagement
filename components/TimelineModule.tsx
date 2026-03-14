import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, ChevronRight, TrendingUp, Plus, Minus } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 220;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;
const SHIFT_END_OFFSET = 12;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;
const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

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
/* Enhanced Room Detail Popup     */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;
  const progress = room.currentProcedure?.progress || 0;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.98) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px ${colors.text}20`
        }}
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top gradient accent */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{ background: `linear-gradient(90deg, transparent, ${colors.text}, transparent)` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative w-16 h-16 flex-shrink-0"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring', bounce: 0.4 }}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                  <motion.circle 
                    cx="32" cy="32" r="26" fill="none"
                    stroke={colors.text}
                    strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    initial={{ strokeDashoffset: `${2 * Math.PI * 26}` }}
                    animate={{ strokeDashoffset: `${2 * Math.PI * 26 * (1 - progress / 100)}` }}
                    transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.text}70)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span 
                    className="text-sm font-black text-white"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    {progress}%
                  </motion.span>
                </div>
              </motion.div>

              <div>
                <motion.h2 
                  className="text-2xl font-black tracking-tight text-white mb-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {room.name}
                </motion.h2>
                {isActive && (
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.text, boxShadow: `0 0 8px ${colors.text}` }} />
                    <span className="text-sm font-bold" style={{ color: colors.text }}>{step.title}</span>
                  </motion.div>
                )}
              </div>
            </div>

            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              whileHover={{ scale: 1.05, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4 text-white/50" />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Current Step */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h3 className="text-xs font-black tracking-widest uppercase text-white/40 mb-3">Aktuální Krok</h3>
              <motion.div 
                className="rounded-2xl p-5 border relative overflow-hidden"
                style={{ backgroundColor: `${colors.text}12`, borderColor: `${colors.text}35`, backdropFilter: 'blur(20px)' }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center border flex-shrink-0"
                    style={{ backgroundColor: `${colors.text}20`, borderColor: `${colors.text}40` }}
                  >
                    <step.Icon className="w-6 h-6" style={{ color: colors.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white mb-1">{step.title}</p>
                    <p className="text-xs text-white/50">Fáze {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Oddělení', value: room.department || '--' },
              { label: 'Vyšetření', value: room.currentProcedure?.name || '--' },
            ].map((item, idx) => (
              <motion.div 
                key={item.label}
                className="rounded-xl p-3 border bg-white/[0.03]"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1, duration: 0.3 }}
              >
                <p className="text-[11px] font-bold tracking-wider uppercase text-white/30 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-white/80 truncate">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Main Timeline Module           */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentSec = currentTime.getSeconds();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;

  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, emergency };
  }, [rooms]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      const aActive = a.currentStepIndex < 6;
      const bActive = b.currentStepIndex < 6;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [rooms]);

  const shiftEndPercent = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        className="relative z-10 flex items-center justify-between gap-4 px-6 md:pl-24 md:pr-6 py-5 flex-shrink-0 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 opacity-60">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-black text-cyan-400 tracking-[0.3em] uppercase hidden lg:inline">TIMELINE VIEW</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">OPERAČNÍ SÁLY</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {[
            { label: 'V PROVOZU', value: stats.operations, color: '#34C759' },
            { label: 'UKLID', value: stats.cleaning, color: '#FBBF24' },
            { label: 'VOLNÉ', value: stats.free, color: '#00D8C1' },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/[0.02]"
              style={{ borderColor: `${s.color}30` }}
              whileHover={{ scale: 1.05, background: `${s.color}08` }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-bold">{s.value}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-60 hidden sm:inline">{s.label}</span>
            </motion.div>
          ))}
          {stats.emergency > 0 && (
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-500/10"
              style={{ borderColor: 'rgba(239,68,68,0.3)' }}
              animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 16px rgba(239,68,68,0.4)', '0 0 0 rgba(239,68,68,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">{stats.emergency} EMERGENCY</span>
            </motion.div>
          )}
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-sm font-mono font-bold tracking-wider text-white">{timeStr}</span>
          </div>
        </div>
      </motion.header>

      {/* Timeline Container */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:px-6 pb-4 overflow-hidden">
        <motion.div 
          className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {/* Time Header */}
          <div className="flex flex-shrink-0 border-b border-white/[0.08] bg-black/20 backdrop-blur-sm">
            <div className="flex-shrink-0 flex items-center px-4 gap-2 border-r border-white/[0.08]" style={{ width: ROOM_LABEL_WIDTH }}>
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400/40" />
              <span className="text-[8px] font-black tracking-[0.15em] uppercase text-white/30">SÁLY</span>
            </div>
            <div className="flex-1 flex items-center h-12 relative px-2">
              {TIME_MARKERS.map((hour, i) => {
                const widthPct = 100 / HOURS_COUNT;
                const isNight = hour >= 19 || hour < 7;
                return (
                  <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}>
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`} />
                    <motion.span 
                      className={`ml-2 text-[9px] font-mono font-semibold ${isNight ? 'text-white/[0.1]' : 'text-white/30'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      {hourLabel(hour)}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto hide-scrollbar">
            {/* Current Time Indicator */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute -left-5 top-0 bottom-0 w-10 bg-cyan-400 opacity-10 blur-lg" />
                  <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1, #00D8C180, transparent)' }} />
                  <motion.div 
                    className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-cyan-400 shadow-lg"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ boxShadow: '0 0 12px rgba(0,216,193,0.8)' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shift End Marker */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})` }}>
              <div className="absolute -left-px top-0 bottom-0 w-[1px]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 4px, transparent 4px, transparent 8px)' }} />
            </div>

            {/* Night Zone */}
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-blue-950/10" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0 }} />

            {/* Room Rows */}
            {sortedRooms.map((room, idx) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
              const isActive = stepIndex < 6;

              const startParts = room.currentProcedure?.startTime?.split(':');
              const startDate = new Date();
              if (startParts && startParts.length === 2) {
                startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
              }
              const boxLeftPct = getTimePercent(startDate);
              let boxRightPct = boxLeftPct + 5;
              if (room.estimatedEndTime) {
                boxRightPct = getTimePercent(new Date(room.estimatedEndTime));
              } else if (room.currentProcedure?.estimatedDuration) {
                const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                boxRightPct = getTimePercent(endDate);
              }
              const boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
              const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

              if (room.isEmergency) {
                return (
                  <motion.div
                    key={room.id}
                    className="flex items-center h-16 flex-shrink-0 border-b border-red-500/10 cursor-pointer group"
                    onClick={() => setSelectedRoom(room)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ background: 'rgba(255, 59, 48, 0.05)' }}
                  >
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-red-500/15" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.12), rgba(255,59,48,0.04))' }}>
                      <motion.div className="relative w-8 h-8 flex-shrink-0">
                        <div className="w-full h-full rounded-lg bg-red-500/25 flex items-center justify-center border border-red-500/40">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-lg border border-red-500/40" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} />
                      </motion.div>
                      <div>
                        <p className="text-xs font-black text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[9px] font-medium text-red-400/40 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 px-2" style={{ background: room.isEmergency ? 'rgba(255,59,48,0.08)' : 'transparent' }} />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={room.id}
                  className="flex items-center h-16 flex-shrink-0 border-b border-white/[0.03] cursor-pointer group"
                  onClick={() => setSelectedRoom(room)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  {/* Room Label */}
                  <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-white/[0.08]" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <div 
                        className="w-full h-full rounded-lg flex items-center justify-center border transition-all"
                        style={{ backgroundColor: `${colors.text}15`, borderColor: `${colors.text}35` }}
                      >
                        <step.Icon className="w-4 h-4" style={{ color: colors.text }} />
                      </div>
                      {isActive && (
                        <motion.div 
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                          style={{ backgroundColor: colors.text, boxShadow: `0 0 6px ${colors.text}` }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{room.name}</p>
                      <p className="text-[9px] text-white/40">{room.department}</p>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="relative flex-1 h-full flex items-center px-2 overflow-hidden">
                    {/* Grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.02]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                    ))}

                    {/* Operation bar */}
                    {isActive && (
                      <motion.div
                        className="absolute h-8 rounded-lg border overflow-hidden group/bar"
                        style={{
                          left: `${(boxLeftPct / 100) * 100}%`,
                          width: `${(boxWidthPct / 100) * 100}%`,
                          backgroundColor: `${colors.text}18`,
                          borderColor: `${colors.text}45`,
                        }}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: idx * 0.05 + 0.1, duration: 0.4, type: 'spring', stiffness: 100 }}
                        whileHover={{ boxShadow: `0 0 20px ${colors.text}60` }}
                      >
                        <motion.div
                          className="absolute top-0 bottom-0 left-0 rounded-lg"
                          style={{
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, ${colors.text}60, ${colors.text}30)`,
                            boxShadow: `inset 0 0 16px ${colors.text}40`,
                          }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-white/80" style={{ textShadow: `0 0 8px ${colors.text}` }}>
                            {room.currentProcedure?.name}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Free room indicator */}
                    {!isActive && (
                      <div className="flex items-center gap-2 ml-2 text-xs text-white/50">
                        <div className="w-2 h-2 rounded-full bg-green-500/60" />
                        <span>VOLNÝ</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Footer with Zoom Controls */}
      <motion.div 
        className="flex items-center justify-between px-6 py-3 border-t border-white/[0.05] bg-gradient-to-r from-white/[0.01] to-transparent flex-shrink-0"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 text-xs text-white/40">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Počet místností: {rooms.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <motion.div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
            <Minus className="w-3.5 h-3.5 text-white/40 cursor-pointer hover:text-white/70 transition-colors" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} />
            <span className="text-xs font-semibold text-white/60 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <Plus className="w-3.5 h-3.5 text-white/40 cursor-pointer hover:text-white/70 transition-colors" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} />
          </motion.div>
          <span className="text-[9px] text-white/30 font-mono">Klikněte na řádek pro detaily</span>
        </div>
      </motion.div>
    </div>
  );
};

export default TimelineModule;
