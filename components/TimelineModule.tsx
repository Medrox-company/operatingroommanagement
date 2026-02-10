import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* ─── Layout constants ─── */
const ROOM_LABEL_WIDTH = 210;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;

/* Shift boundaries (hours from 7:00) */
const SHIFT_START_OFFSET = 0;   // 07:00
const SHIFT_END_OFFSET = 12;    // 19:00

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;

const hourLabel = (h: number) => {
  const display = h < 10 ? `0${h}` : `${h}`;
  return `${display}:00`;
};

/* Step color palette - richer, more saturated for the bars */
const STEP_PALETTE: Record<number, { bg: string; fill: string; border: string; text: string; glow: string }> = {
  0: { bg: 'rgba(96,165,250,0.15)', fill: 'rgba(96,165,250,0.35)', border: 'rgba(96,165,250,0.40)', text: '#60A5FA', glow: '0 0 20px rgba(96,165,250,0.15)' },
  1: { bg: 'rgba(45,212,191,0.15)', fill: 'rgba(45,212,191,0.35)', border: 'rgba(45,212,191,0.40)', text: '#2DD4BF', glow: '0 0 20px rgba(45,212,191,0.15)' },
  2: { bg: 'rgba(74,222,128,0.15)', fill: 'rgba(74,222,128,0.35)', border: 'rgba(74,222,128,0.40)', text: '#4ADE80', glow: '0 0 20px rgba(74,222,128,0.15)' },
  3: { bg: 'rgba(250,204,21,0.15)', fill: 'rgba(250,204,21,0.35)', border: 'rgba(250,204,21,0.40)', text: '#FACC15', glow: '0 0 20px rgba(250,204,21,0.15)' },
  4: { bg: 'rgba(129,140,248,0.15)', fill: 'rgba(129,140,248,0.35)', border: 'rgba(129,140,248,0.40)', text: '#818CF8', glow: '0 0 20px rgba(129,140,248,0.15)' },
  5: { bg: 'rgba(168,85,247,0.15)', fill: 'rgba(168,85,247,0.35)', border: 'rgba(168,85,247,0.40)', text: '#A855F7', glow: '0 0 20px rgba(168,85,247,0.15)' },
  6: { bg: 'rgba(255,255,255,0.03)', fill: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.30)', glow: 'none' },
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHourMin = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const currentTimeShort = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  /* stats */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 2 && r.currentStepIndex <= 3 && !r.isEmergency).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const emergency = rooms.filter(r => r.isEmergency).length;
    const doctorsWorking = rooms.filter(r => r.currentStepIndex >= 1 && r.currentStepIndex <= 4 && !r.isEmergency).length;
    const nursesWorking = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 5 && !r.isEmergency).length;
    return { operations, cleaning, free, completed, emergency, doctorsWorking, nursesWorking };
  }, [rooms]);

  /* sorted rooms: emergency > locked > active > free */
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

  const shiftStartPct = (SHIFT_START_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;
  const shiftEndPct = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      {/* ── Top Stats Bar ── */}
      <div className="relative z-10 flex items-center gap-1.5 px-4 md:pl-28 md:pr-4 pt-3 pb-1.5 flex-shrink-0 flex-wrap">
        {/* Stats pills */}
        {[
          { label: 'OPERACE', value: stats.operations, color: '#4ADE80', dot: true },
          { label: 'UKLID', value: stats.cleaning, color: '#FACC15', dot: true },
          { label: 'VOLNE', value: stats.free, color: '#00D8C1', accent: true },
          { label: 'DOKONCENO', value: stats.completed, color: '#818CF8', dot: true },
          null,
          { label: 'LEKARI PRACUJI', value: stats.doctorsWorking, color: '#60A5FA', icon: '&#9764;' },
          { label: 'SESTRY VOLNE', value: 5, color: '#F472B6', icon: '&#9764;' },
          null,
          { label: 'EMERGENCY', value: stats.emergency, color: '#FF3B30', emergency: true },
        ].map((s, idx) => {
          if (s === null) return <div key={`sep-${idx}`} className="w-px h-5 bg-white/[0.06] mx-0.5" />;
          return (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider transition-all ${
                s.emergency
                  ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                  : s.accent
                    ? 'bg-[#00D8C1]/8 border border-[#00D8C1]/20 text-[#00D8C1]'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/50'
              }`}
            >
              {s.emergency && <AlertTriangle className="w-2.5 h-2.5" />}
              {s.dot && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />}
              <span className="font-mono font-black text-[10px]" style={!s.emergency && !s.accent ? { color: s.color } : undefined}>
                {s.value}
              </span>
              <span className="opacity-50 tracking-widest text-[7px]">{s.label}</span>
            </div>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
          <CalendarDays className="w-3 h-3 text-white/25" />
          <span className="text-[8px] font-bold text-white/35 uppercase tracking-wider">
            {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
          </span>
        </div>
        {/* Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
          <Clock className="w-3 h-3 text-[#00D8C1]" />
          <span className="text-[11px] font-mono font-black tracking-widest text-white">{currentHourMin}</span>
        </div>
      </div>

      {/* ── Main Timeline Panel ── */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-4 pb-1 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-transparent backdrop-blur-sm">
          
          {/* ── Time Axis Header ── */}
          <div className="flex flex-shrink-0 h-9 border-b border-white/[0.08] bg-black/30">
            {/* Label column header */}
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-white/[0.08]"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              <Stethoscope className="w-3 h-3 text-[#00D8C1]/40" />
              <span className="text-[7px] font-black tracking-[0.2em] uppercase text-white/25">OPERACNI SALY</span>
            </div>
            {/* Time markers */}
            <div className="flex-1 relative">
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / HOURS_COUNT;
                const leftPct = i * widthPct;
                const isWork = hour >= 7 && hour < 19;

                /* Is current hour? */
                const isCurrent = !isLast && (() => {
                  const hMin = hour >= 7 ? (hour - 7) * 60 : (hour + 17) * 60;
                  const nextH = TIME_MARKERS[i + 1];
                  const nMin = nextH >= 7 ? (nextH - 7) * 60 : (nextH + 17) * 60;
                  const n = getMinutesFrom7(currentTime);
                  return n >= hMin && n < nMin;
                })();

                return (
                  <div
                    key={`hdr-${hour}-${i}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                  >
                    {/* Hour tick */}
                    <div className={`w-px h-full ${isWork ? 'bg-white/[0.08]' : 'bg-white/[0.04]'}`} />
                    {/* Half-hour tick */}
                    {!isLast && (
                      <div className="absolute w-px h-1/3 bottom-0 bg-white/[0.04]" style={{ left: '50%' }} />
                    )}
                    {/* Label or current time badge */}
                    {!isLast && (
                      isCurrent ? (
                        <div className="ml-1 px-1.5 py-[1px] rounded-md bg-[#00D8C1] shadow-[0_0_8px_rgba(0,216,193,0.4)]">
                          <span className="text-[7px] font-mono font-black text-black tracking-wider">{currentTimeShort}</span>
                        </div>
                      ) : (
                        <span className={`ml-1 text-[7px] font-mono font-semibold ${isWork ? 'text-white/30' : 'text-white/15'}`}>
                          {hourLabel(hour)}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Room Rows Container ── */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            
            {/* "Now" indicator line */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-0 bottom-0 z-40 pointer-events-none"
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  {/* Soft glow spread */}
                  <div className="absolute -left-4 top-0 bottom-0 w-8 bg-[#00D8C1] opacity-[0.04] blur-lg" />
                  {/* Main line */}
                  <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1 0%, #00D8C1cc 30%, #00D8C180 70%, #00D8C140 100%)' }} />
                  {/* Top dot */}
                  <div className="absolute -left-[4px] -top-[1px] w-[10px] h-[10px] rounded-full bg-[#00D8C1] shadow-[0_0_10px_#00D8C1,0_0_20px_rgba(0,216,193,0.4)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shift boundary lines (dashed orange) */}
            {[shiftStartPct, shiftEndPct].map((pct, idx) => (
              <div
                key={`shift-${idx}`}
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${pct / 100})` }}
              >
                <div
                  className="absolute -left-px top-0 bottom-0 w-[1px] opacity-40"
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FB923C 0px, #FB923C 4px, transparent 4px, transparent 10px)' }}
                />
              </div>
            ))}

            {/* Room Rows */}
            {sortedRooms.map((room, rowIdx) => {
              const stepIdx = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIdx];
              const isActive = stepIdx < 6;
              const isFree = stepIdx >= 6;
              const palette = STEP_PALETTE[stepIdx] || STEP_PALETTE[6];

              /* Timing calc */
              const startTimeParts = room.currentProcedure?.startTime?.split(':');
              const startDate = new Date();
              if (startTimeParts && startTimeParts.length === 2) {
                startDate.setHours(parseInt(startTimeParts[0], 10), parseInt(startTimeParts[1], 10), 0, 0);
              }
              const boxLeftPct = getTimePercent(startDate);
              let boxRightPct: number;
              if (room.estimatedEndTime) {
                boxRightPct = getTimePercent(new Date(room.estimatedEndTime));
              } else if (room.currentProcedure?.estimatedDuration) {
                const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                boxRightPct = getTimePercent(endDate);
              } else {
                boxRightPct = boxLeftPct + 4;
              }
              const boxWidthPct = Math.max(1.5, boxRightPct - boxLeftPct);
              const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

              /* ── EMERGENCY ROW ── */
              if (room.isEmergency) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04]">
                    {/* Label */}
                    <div
                      className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-red-500/15"
                      style={{
                        width: ROOM_LABEL_WIDTH,
                        background: 'linear-gradient(135deg, rgba(255,59,48,0.18) 0%, rgba(255,59,48,0.06) 100%)',
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-red-500/25 flex items-center justify-center border border-red-500/35">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        </div>
                        <motion.div
                          className="absolute inset-[-2px] rounded-full border-2 border-red-500/40"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[8px] font-medium text-red-400/40 truncate">{room.name}</p>
                      </div>
                    </div>
                    {/* Bar area */}
                    <div className="relative flex-1 overflow-hidden">
                      {/* Subtle grid */}
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.04]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      {/* Full-width emergency block */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-y-[2px] left-0 right-0 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255,59,48,0.25) 0%, rgba(255,59,48,0.15) 30%, rgba(255,59,48,0.15) 70%, rgba(255,59,48,0.25) 100%)',
                          border: '1px solid rgba(255,59,48,0.20)',
                          boxShadow: '0 0 30px rgba(255,59,48,0.08) inset',
                        }}
                      >
                        {/* Cross-hatch pattern */}
                        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, white 0px, white 1px, transparent 1px, transparent 8px)' }} />
                        <span className="relative text-[13px] font-black tracking-[0.6em] text-white/60 uppercase select-none">
                          E M E R G E N C Y
                        </span>
                      </motion.div>
                    </div>
                  </div>
                );
              }

              /* ── LOCKED ROW ── */
              if (room.isLocked) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04]">
                    <div
                      className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-amber-500/15"
                      style={{
                        width: ROOM_LABEL_WIDTH,
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.03) 100%)',
                      }}
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                        <Lock className="w-3 h-3 text-amber-400/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-[8px] font-medium text-amber-400/40 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div
                        className="absolute inset-y-[2px] left-0 right-0 rounded-lg flex items-center justify-center gap-3 overflow-hidden"
                        style={{
                          background: 'linear-gradient(90deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.04) 50%, rgba(251,191,36,0.08) 100%)',
                          border: '1px solid rgba(251,191,36,0.10)',
                        }}
                      >
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(251,191,36,1) 0px, rgba(251,191,36,1) 1px, transparent 1px, transparent 12px)' }} />
                        <Lock className="w-3.5 h-3.5 text-amber-400/30 relative" />
                        <span className="text-[11px] font-black tracking-[0.5em] text-amber-400/40 uppercase select-none relative">UZAMCENO</span>
                        <Lock className="w-3.5 h-3.5 text-amber-400/30 relative" />
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── NORMAL / FREE ROW ── */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIdx * 0.015, duration: 0.25 }}
                  className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04] group transition-colors duration-200"
                >
                  {/* Room label */}
                  <div
                    className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-white/[0.06] group-hover:bg-white/[0.02] transition-colors"
                    style={{ width: ROOM_LABEL_WIDTH }}
                  >
                    {/* Status indicator */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center border transition-all"
                        style={{
                          backgroundColor: isActive ? `${palette.text}12` : 'rgba(255,255,255,0.03)',
                          borderColor: isActive ? `${palette.text}30` : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {isActive ? (
                          <Activity className="w-3 h-3" style={{ color: palette.text }} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/10" />
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          className="absolute inset-[-1px] rounded-full border"
                          style={{ borderColor: `${palette.text}40` }}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        />
                      )}
                    </div>
                    {/* Name + status */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold tracking-tight uppercase text-white/80 truncate leading-tight">{room.name}</p>
                      {isFree ? (
                        <p className="text-[7px] font-medium text-white/20 truncate flex items-center gap-1">
                          <span className="inline-block w-1 h-1 rounded-full bg-white/15" /> Volny
                        </p>
                      ) : (
                        <p className="text-[7px] font-medium truncate" style={{ color: `${palette.text}60` }}>{room.department}</p>
                      )}
                    </div>
                    {isActive && (
                      <svg className="w-3 h-3 flex-shrink-0 text-white/10 group-hover:text-white/20 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>

                  {/* Timeline area */}
                  <div className="relative flex-1 overflow-hidden">
                    {/* Hour grid */}
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isWork = hour >= 7 && hour < 19;
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 w-px ${isWork ? 'bg-white/[0.03]' : 'bg-white/[0.015]'}`}
                          style={{ left: `${(i / HOURS_COUNT) * 100}%` }}
                        />
                      );
                    })}
                    {/* Half-hour sub-grid */}
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div
                        key={`sub-${i}`}
                        className="absolute top-[40%] bottom-[40%] w-px bg-white/[0.015]"
                        style={{ left: `${((i + 0.5) / HOURS_COUNT) * 100}%` }}
                      />
                    ))}

                    {/* Night zone tint */}
                    <div
                      className="absolute top-0 bottom-0 bg-[#0D1B2A]/20"
                      style={{ left: `${(12 / HOURS_COUNT) * 100}%`, right: '0' }}
                    />

                    {/* ── Procedure Block ── */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.92 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, delay: rowIdx * 0.02, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[3px] bottom-[3px] rounded-lg overflow-hidden cursor-default"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          transformOrigin: 'left center',
                          boxShadow: palette.glow,
                        }}
                      >
                        {/* Base bg */}
                        <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }} />
                        {/* Progress fill with gradient */}
                        <motion.div
                          className="absolute top-0 bottom-0 left-0 rounded-lg"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          style={{ background: `linear-gradient(90deg, ${palette.fill}, ${palette.bg})` }}
                        />
                        {/* Diagonal stripe texture */}
                        <div
                          className="absolute inset-0 opacity-[0.05]"
                          style={{ backgroundImage: `repeating-linear-gradient(120deg, transparent, transparent 4px, ${palette.text} 4px, ${palette.text} 5px)` }}
                        />
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ backgroundColor: palette.text }} />
                        {/* Content */}
                        <div className="relative flex items-center h-full px-2.5 gap-2 z-10 min-w-0">
                          <span className="text-[8px] font-bold uppercase tracking-wide truncate flex-shrink-0" style={{ color: palette.text }}>
                            {step.title}
                          </span>
                          {room.currentPatient && (
                            <>
                              <div className="w-px h-3 flex-shrink-0" style={{ backgroundColor: `${palette.text}20` }} />
                              <span className="text-[7px] text-white/30 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                          {/* Time range (if wide enough) */}
                          {boxWidthPct > 6 && (
                            <span className="text-[7px] font-mono text-white/20 ml-auto flex-shrink-0">
                              {room.currentProcedure?.startTime}
                              {' - '}
                              {room.estimatedEndTime
                                ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                : room.currentProcedure?.estimatedDuration
                                  ? new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                  : ''
                              }
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Free rooms - subtle ghost block */}
                    {isFree && room.currentProcedure && (
                      <div
                        className="absolute top-[3px] bottom-[3px] rounded-lg"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          backgroundColor: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.025)',
                        }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Legend ── */}
      <div className="relative z-10 flex items-center justify-between px-4 md:pl-28 md:pr-4 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/8 border border-white/10" />
            <span className="text-[7px] font-medium text-white/25 uppercase tracking-widest">Dokoncene</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[2px] rounded-full bg-[#00D8C1]" />
            <span className="text-[7px] font-medium text-white/25 uppercase tracking-widest">Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[1px]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FB923C 0px, #FB923C 3px, transparent 3px, transparent 6px)' }} />
            <span className="text-[7px] font-medium text-white/25 uppercase tracking-widest">Konec smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500/20 border border-pink-500/25" />
            <span className="text-[7px] font-medium text-white/25 uppercase tracking-widest">Presah</span>
          </div>
        </div>
        <span className="text-[7px] text-white/15 font-medium tracking-wide">Kliknete na sal pro zobrazeni detailu</span>
      </div>
    </div>
  );
};

export default TimelineModule;
