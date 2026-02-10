import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* ─── Layout ─── */
const ROOM_LABEL_WIDTH = 220;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;

/* shift boundaries (hours from 7:00) */
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

/* colors per step */
const STEP_BAR_COLORS: Record<number, { bg: string; fill: string; border: string; text: string }> = {
  0: { bg: 'rgba(103,194,255,0.20)', fill: 'rgba(103,194,255,0.40)', border: 'rgba(103,194,255,0.50)', text: '#67C2FF' },
  1: { bg: 'rgba(45,212,191,0.20)', fill: 'rgba(45,212,191,0.40)', border: 'rgba(45,212,191,0.50)', text: '#2DD4BF' },
  2: { bg: 'rgba(134,239,172,0.20)', fill: 'rgba(134,239,172,0.40)', border: 'rgba(134,239,172,0.50)', text: '#86EFAC' },
  3: { bg: 'rgba(251,191,36,0.20)', fill: 'rgba(251,191,36,0.40)', border: 'rgba(251,191,36,0.50)', text: '#FBBF24' },
  4: { bg: 'rgba(129,140,248,0.20)', fill: 'rgba(129,140,248,0.40)', border: 'rgba(129,140,248,0.50)', text: '#818CF8' },
  5: { bg: 'rgba(91,101,220,0.20)', fill: 'rgba(91,101,220,0.40)', border: 'rgba(91,101,220,0.50)', text: '#5B65DC' },
  6: { bg: 'rgba(52,199,89,0.08)', fill: 'rgba(52,199,89,0.15)', border: 'rgba(52,199,89,0.20)', text: '#34C759' },
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHourMinStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentTimeLabel = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  /* stats */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 2 && r.currentStepIndex <= 3 && !r.isEmergency).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, emergency };
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

  /* shift boundary positions */
  const shiftStartPercent = (SHIFT_START_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;
  const shiftEndPercent = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      {/* No local background - uses App's global background */}

      {/* ─── Stats Bar ─── */}
      <div className="relative z-10 flex items-center gap-2 px-4 md:pl-28 md:pr-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#34C759', dot: true },
            { label: 'UKLID', value: stats.cleaning, color: '#FBBF24', dot: true },
            { label: 'VOLNE', value: stats.free, color: '#67C2FF', highlight: true },
            { label: 'DOKONCENO', value: stats.completed, color: '#818CF8', dot: true },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider ${
                s.highlight
                  ? 'bg-[#00D8C1]/10 border-[#00D8C1]/30 text-[#00D8C1]'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/60'
              }`}
            >
              {s.dot && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
              <span className="font-mono font-black">{s.value}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{s.label}</span>
            </div>
          ))}

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-red-500/10 border-red-500/30 text-red-400 text-[10px] font-bold tracking-wider">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-mono font-black">{stats.emergency}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">EMERGENCY</span>
          </div>
        </div>

        {/* Right: date + clock */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <CalendarDays className="w-3 h-3 text-white/30" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
              {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <Clock className="w-3 h-3 text-[#00D8C1]" />
            <span className="text-xs font-mono font-black tracking-widest text-white">
              {currentHourMinStr}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Timeline ─── */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-4 pb-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/[0.05] bg-black/20 backdrop-blur-sm">

          {/* ─── Time Axis Header ─── */}
          <div className="flex flex-shrink-0 border-b border-white/[0.06]">
            {/* Label column header */}
            <div
              className="flex-shrink-0 flex items-center px-4 gap-2 border-r border-white/[0.06] bg-black/30"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              <Stethoscope className="w-3 h-3 text-[#00D8C1]/50" />
              <span className="text-[8px] font-black tracking-[0.15em] uppercase text-white/30">OPERACNI SALY</span>
            </div>
            {/* Time columns - flex-1 */}
            <div className="flex-1 flex items-center h-8 relative">
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPercent = 100 / HOURS_COUNT;
                const leftPercent = i * widthPercent;

                const isCurrentHour = !isLast && (() => {
                  const hourMinFrom7 = hour >= 7 ? (hour - 7) * 60 : (hour + 17) * 60;
                  const nextHour = TIME_MARKERS[i + 1];
                  const nextMinFrom7 = nextHour >= 7 ? (nextHour - 7) * 60 : (nextHour + 17) * 60;
                  const nowMin = getMinutesFrom7(currentTime);
                  return nowMin >= hourMinFrom7 && nowMin < nextMinFrom7;
                })();

                return (
                  <div
                    key={`h-${hour}-${i}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${leftPercent}%`, width: isLast ? 0 : `${widthPercent}%` }}
                  >
                    <div className="w-px h-full bg-white/[0.06]" />
                    {!isLast && (
                      isCurrentHour ? (
                        <div className="ml-1 px-1.5 py-0.5 rounded bg-[#00D8C1]">
                          <span className="text-[8px] font-mono font-black text-black tracking-wider">{currentTimeLabel}</span>
                        </div>
                      ) : (
                        <span className="ml-1 text-[8px] font-mono font-medium text-white/25">
                          {hourLabel(hour)}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Room Rows ─── */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            {/* "Now" line */}
            {nowPercent >= 0 && nowPercent <= 100 && (
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none"
                style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
              >
                <div className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#00D8C1]" style={{ boxShadow: '0 0 8px #00D8C180, 0 0 16px #00D8C140' }} />
                <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-[#00D8C1] shadow-[0_0_6px_#00D8C1]" />
              </div>
            )}

            {/* Shift boundary lines (dashed orange) */}
            {[shiftStartPercent, shiftEndPercent].map((pct, idx) => (
              <div
                key={`shift-${idx}`}
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${pct / 100})` }}
              >
                <div
                  className="absolute -left-px top-0 bottom-0 w-[1px]"
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 4px, transparent 4px, transparent 8px)' }}
                />
              </div>
            ))}

            {/* Rows */}
            {sortedRooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const isActive = stepIndex < 6;
              const isFree = stepIndex >= 6;
              const barColors = STEP_BAR_COLORS[stepIndex] || STEP_BAR_COLORS[6];

              // Box timing
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
                boxRightPct = boxLeftPct + 5;
              }
              const boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);

              // Progress (how far "now" is through the procedure)
              const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

              /* ── Emergency row ── */
              if (room.isEmergency) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04]">
                    <div
                      className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-red-500/20"
                      style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.20) 0%, rgba(255,59,48,0.10) 100%)' }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500/40">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        </div>
                        <motion.div
                          className="absolute inset-0 rounded-full border border-red-500/60"
                          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[7px] font-medium text-red-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1">
                      {/* Grid */}
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.05]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div
                        className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.30) 0%, rgba(255,59,48,0.20) 50%, rgba(255,59,48,0.30) 100%)', border: '1px solid rgba(255,59,48,0.25)' }}
                      >
                        <span className="text-sm font-black tracking-[0.5em] text-white/70 uppercase select-none">
                          E M E R G E N C Y
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── Locked row ── */
              if (room.isLocked) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04]">
                    <div
                      className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-amber-500/20"
                      style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.06) 100%)' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <Lock className="w-3 h-3 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-[7px] font-medium text-amber-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div
                        className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center gap-3"
                        style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.05) 50%, rgba(251,191,36,0.10) 100%)', border: '1px solid rgba(251,191,36,0.12)' }}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400/40" />
                        <span className="text-xs font-black tracking-[0.4em] text-amber-400/50 uppercase select-none">UZAMCENO</span>
                        <Lock className="w-3.5 h-3.5 text-amber-400/40" />
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── Normal / Free row ── */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: roomIndex * 0.01 }}
                  className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04] group hover:bg-white/[0.01] transition-colors"
                >
                  {/* Room label */}
                  <div
                    className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-white/[0.06] bg-black/20 group-hover:bg-white/[0.02] transition-colors"
                    style={{ width: ROOM_LABEL_WIDTH }}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center border"
                        style={{
                          backgroundColor: isActive ? `${barColors.text}15` : 'rgba(255,255,255,0.04)',
                          borderColor: isActive ? `${barColors.text}35` : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {isActive ? (
                          <Activity className="w-2.5 h-2.5" style={{ color: barColors.text }} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ borderColor: barColors.text, borderWidth: 1 }}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold tracking-tight uppercase text-white/80 truncate leading-tight">{room.name}</p>
                      {isFree ? (
                        <p className="text-[7px] font-medium text-white/20 truncate">Volny</p>
                      ) : (
                        <p className="text-[7px] font-medium truncate" style={{ color: `${barColors.text}70` }}>{room.department}</p>
                      )}
                    </div>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>

                  {/* Timeline area */}
                  <div className="relative flex-1">
                    {/* Grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.025]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                    ))}

                    {/* Procedure block for active rooms */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.9 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.4, delay: roomIndex * 0.02 }}
                        className="absolute top-[3px] bottom-[3px] rounded-lg overflow-hidden"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          backgroundColor: barColors.bg,
                          border: `1px solid ${barColors.border}`,
                          transformOrigin: 'left center',
                        }}
                      >
                        {/* Progress fill */}
                        <motion.div
                          className="absolute top-0 bottom-0 left-0"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ backgroundColor: barColors.fill }}
                        />
                        {/* Diagonal stripes texture */}
                        <div
                          className="absolute inset-0 opacity-[0.06]"
                          style={{
                            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 5px, ${barColors.text} 5px, ${barColors.text} 6px)`,
                          }}
                        />
                        {/* Left accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: barColors.text }} />
                        {/* Content */}
                        <div className="relative flex items-center h-full px-2.5 gap-1.5 z-10">
                          <span className="text-[8px] font-bold uppercase tracking-wide truncate" style={{ color: barColors.text }}>
                            {step.title}
                          </span>
                          {room.currentPatient && (
                            <>
                              <div className="w-px h-2.5 bg-white/10 flex-shrink-0" />
                              <span className="text-[7px] text-white/35 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Free rooms - faded completed block */}
                    {isFree && room.currentProcedure && (
                      <div
                        className="absolute top-[3px] bottom-[3px] rounded-lg"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          backgroundColor: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.03)',
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

      {/* ─── Bottom Legend ─── */}
      <div className="relative z-10 flex items-center justify-between px-4 md:pl-28 md:pr-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/12 border border-white/8" />
            <span className="text-[8px] font-medium text-white/30 uppercase tracking-wider">Dokoncene</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[2px] rounded-full bg-[#67C2FF]" />
            <span className="text-[8px] font-medium text-white/30 uppercase tracking-wider">Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FF9500 0px, #FF9500 3px, transparent 3px, transparent 6px)' }} />
            <span className="text-[8px] font-medium text-white/30 uppercase tracking-wider">Konec smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500/25 border border-pink-500/30" />
            <span className="text-[8px] font-medium text-white/30 uppercase tracking-wider">Presah</span>
          </div>
        </div>
        <span className="text-[8px] text-white/15 font-medium">Kliknete na sal pro zobrazeni detailu</span>
      </div>
    </div>
  );
};

export default TimelineModule;
