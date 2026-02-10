import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, UserCheck, Activity, CheckCircle2, Scissors, ShieldAlert, Sparkles } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* ─── layout constants ─── */
const HOUR_WIDTH = 72;
const ROOM_LABEL_WIDTH = 200;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const TOTAL_WIDTH = 24 * HOUR_WIDTH;

/* shift boundaries (in "hours from 7") */
const SHIFT_START_HOUR = 0;  // 07:00
const SHIFT_END_HOUR = 12;   // 19:00

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};
const getTimePosition = (date: Date) => (getMinutesFrom7(date) / (24 * 60)) * TOTAL_WIDTH;

const hourLabel = (h: number) => {
  const display = h < 10 ? `0${h}` : `${h}`;
  return `${display}:00`;
};

/* colors per step that match the reference images (pastel bars) */
const STEP_BAR_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'rgba(103,194,255,0.45)', border: 'rgba(103,194,255,0.6)', text: '#67C2FF' },   // blue - Příjezd
  1: { bg: 'rgba(45,212,191,0.45)', border: 'rgba(45,212,191,0.6)', text: '#2DD4BF' },      // teal - Anestezie
  2: { bg: 'rgba(134,239,172,0.45)', border: 'rgba(134,239,172,0.6)', text: '#86EFAC' },     // green - Chirurgický
  3: { bg: 'rgba(251,191,36,0.45)', border: 'rgba(251,191,36,0.6)', text: '#FBBF24' },       // yellow - Ukončení
  4: { bg: 'rgba(129,140,248,0.45)', border: 'rgba(129,140,248,0.6)', text: '#818CF8' },     // indigo - Ukončení anestezie
  5: { bg: 'rgba(91,101,220,0.45)', border: 'rgba(91,101,220,0.6)', text: '#5B65DC' },       // purple - Úklid
  6: { bg: 'rgba(52,199,89,0.15)', border: 'rgba(52,199,89,0.25)', text: '#34C759' },         // subtle green - Připraven
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const nowPosition = getTimePosition(currentTime);
  const currentTimeStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const currentHourMinStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Auto-scroll to "now" on mount
  useEffect(() => {
    if (scrollRef.current && !hasScrolled.current) {
      const target = nowPosition - scrollRef.current.clientWidth / 3;
      scrollRef.current.scrollLeft = Math.max(0, target);
      hasScrolled.current = true;
    }
  }, [nowPosition]);

  /* stats */
  const stats = useMemo(() => {
    const active = rooms.filter(r => r.currentStepIndex > 0 && r.currentStepIndex < 6 && !r.isEmergency && !r.isLocked);
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked);
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked);
    const emergency = rooms.filter(r => r.isEmergency);
    const locked = rooms.filter(r => r.isLocked);
    const operations = rooms.filter(r => r.currentStepIndex >= 2 && r.currentStepIndex <= 3 && !r.isEmergency);
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    return {
      operations: operations.length,
      cleaning: cleaning.length,
      free: free.length,
      completed: completed,
      active: active.length,
      emergency: emergency.length,
    };
  }, [rooms]);

  /* sorted rooms: emergency first, then locked, then active, then free */
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

  /* find current hour index on the axis for highlighting */
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentHourLabel = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      {/* Background - kept from app concept */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000"
          alt=""
          className="w-full h-full object-cover opacity-10 grayscale scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_transparent_15%,_rgba(0,0,0,0.92)_80%)]" />
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="relative z-10 flex items-center gap-2 px-6 md:pl-28 md:pr-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#34C759', dot: true },
            { label: 'UKLID', value: stats.cleaning, color: '#FBBF24', dot: true },
            { label: 'VOLNE', value: stats.free, color: '#67C2FF', dot: false, highlight: true },
            { label: 'DOKONCENO', value: stats.completed, color: '#818CF8', dot: true },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wider ${
                s.highlight
                  ? 'bg-[#00D8C1]/10 border-[#00D8C1]/30 text-[#00D8C1]'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/70'
              }`}
            >
              {s.dot && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
              <span className="font-mono font-black">{s.value}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{s.label}</span>
            </div>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Emergency count */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-red-500/10 border-red-500/30 text-red-400 text-xs font-bold tracking-wider">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-mono font-black">{stats.emergency}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">EMERGENCY</span>
          </div>
        </div>

        {/* Right side: date + time */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full">
            <CalendarDays className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#00D8C1]" />
            <span className="text-sm font-mono font-black tracking-widest text-white">
              {currentHourMinStr}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Timeline Area ─── */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 md:pl-28 md:pr-6 pb-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 backdrop-blur-sm">
          {/* Horizontal scroll wrapper */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto relative custom-scrollbar">
            <div className="min-w-max h-full flex flex-col">

              {/* ─── Time Axis Header ─── */}
              <div className="flex flex-shrink-0 sticky top-0 z-40 bg-black/70 backdrop-blur-xl">
                {/* Label column */}
                <div className="flex-shrink-0 sticky left-0 z-50 bg-black/80 backdrop-blur-xl border-r border-white/[0.06]" style={{ width: ROOM_LABEL_WIDTH }}>
                  <div className="h-8 flex items-center px-4 gap-2">
                    <Stethoscope className="w-3 h-3 text-[#00D8C1]/60" />
                    <span className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">OPERACNI SALY</span>
                  </div>
                </div>
                {/* Hour columns */}
                <div className="relative h-8" style={{ width: TOTAL_WIDTH }}>
                  {TIME_MARKERS.map((hour, i) => {
                    const isLast = i === TIME_MARKERS.length - 1;
                    // Check if current time falls in this hour block
                    const isCurrentHour = !isLast && (() => {
                      const nextHour = TIME_MARKERS[i + 1];
                      const hourMinFrom7 = hour >= 7 ? (hour - 7) * 60 : (hour + 17) * 60;
                      const nextMinFrom7 = nextHour >= 7 ? (nextHour - 7) * 60 : (nextHour + 17) * 60;
                      const nowMin = getMinutesFrom7(currentTime);
                      return nowMin >= hourMinFrom7 && nowMin < nextMinFrom7;
                    })();

                    return (
                      <div
                        key={`h-${hour}-${i}`}
                        className="absolute top-0 h-full flex items-center"
                        style={{ left: i * HOUR_WIDTH, width: isLast ? 0 : HOUR_WIDTH }}
                      >
                        <div className="w-px h-full bg-white/[0.06]" />
                        {!isLast && (
                          isCurrentHour ? (
                            <div className="ml-1 px-2 py-0.5 rounded-md bg-[#00D8C1] text-[0px]">
                              <span className="text-[9px] font-mono font-black text-black tracking-wider">{currentHourLabel}</span>
                            </div>
                          ) : (
                            <span className="ml-1.5 text-[9px] font-mono font-semibold text-white/35">
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
              <div className="flex-1 min-h-0 flex flex-col relative">
                {/* "Now" line */}
                {nowPosition >= 0 && nowPosition <= TOTAL_WIDTH && (
                  <div
                    className="absolute top-0 bottom-0 z-30 pointer-events-none"
                    style={{ left: ROOM_LABEL_WIDTH + nowPosition }}
                  >
                    <div className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#00D8C1]" style={{ boxShadow: '0 0 10px #00D8C180, 0 0 20px #00D8C140' }} />
                    <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-[#00D8C1] shadow-[0_0_8px_#00D8C1]" />
                  </div>
                )}

                {/* Shift boundary lines */}
                {[SHIFT_START_HOUR, SHIFT_END_HOUR].map((shiftHour, idx) => {
                  const pos = (shiftHour * 60 / (24 * 60)) * TOTAL_WIDTH;
                  return (
                    <div
                      key={`shift-${idx}`}
                      className="absolute top-0 bottom-0 z-20 pointer-events-none"
                      style={{ left: ROOM_LABEL_WIDTH + pos }}
                    >
                      <div
                        className="absolute -left-px top-0 bottom-0 w-[1px]"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 4px, transparent 4px, transparent 8px)',
                        }}
                      />
                    </div>
                  );
                })}

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
                  const boxLeft = getTimePosition(startDate);

                  let boxRight: number;
                  if (room.estimatedEndTime) {
                    boxRight = getTimePosition(new Date(room.estimatedEndTime));
                  } else if (room.currentProcedure?.estimatedDuration) {
                    const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                    boxRight = getTimePosition(endDate);
                  } else {
                    boxRight = boxLeft + 100;
                  }
                  const boxWidth = Math.max(40, boxRight - boxLeft);

                  /* ── Emergency row ── */
                  if (room.isEmergency) {
                    return (
                      <div
                        key={room.id}
                        className="flex items-stretch min-h-[44px] border-b border-white/[0.04]"
                      >
                        {/* Label */}
                        <div
                          className="flex-shrink-0 flex items-center gap-3 px-4 sticky left-0 z-20 border-r border-red-500/20"
                          style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.25) 0%, rgba(255,59,48,0.15) 100%)' }}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-7 h-7 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500/40">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            </div>
                            <motion.div
                              className="absolute inset-0 rounded-full border border-red-500/60"
                              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                            <p className="text-[8px] font-medium text-red-400/60 truncate">{room.name}</p>
                          </div>
                        </div>
                        {/* Red bar spanning full width */}
                        <div className="relative flex-grow" style={{ width: TOTAL_WIDTH }}>
                          {/* Grid lines */}
                          {TIME_MARKERS.slice(0, -1).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.06]" style={{ left: i * HOUR_WIDTH }} />
                          ))}
                          <div
                            className="absolute inset-y-1 left-0 right-0 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.35) 0%, rgba(255,59,48,0.25) 50%, rgba(255,59,48,0.35) 100%)', border: '1px solid rgba(255,59,48,0.3)' }}
                          >
                            <span className="text-lg font-black tracking-[0.5em] text-white/80 uppercase select-none">
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
                      <div
                        key={room.id}
                        className="flex items-stretch min-h-[44px] border-b border-white/[0.04]"
                      >
                        <div
                          className="flex-shrink-0 flex items-center gap-3 px-4 sticky left-0 z-20 border-r border-amber-500/20"
                          style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.08) 100%)' }}
                        >
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                            <p className="text-[8px] font-medium text-amber-400/60 truncate">{room.name}</p>
                          </div>
                        </div>
                        <div className="relative flex-grow" style={{ width: TOTAL_WIDTH }}>
                          {TIME_MARKERS.slice(0, -1).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.04]" style={{ left: i * HOUR_WIDTH }} />
                          ))}
                          <div
                            className="absolute inset-y-1 left-0 right-0 rounded-lg flex items-center justify-center gap-3"
                            style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.06) 50%, rgba(251,191,36,0.12) 100%)', border: '1px solid rgba(251,191,36,0.15)' }}
                          >
                            <Lock className="w-4 h-4 text-amber-400/50" />
                            <span className="text-sm font-black tracking-[0.4em] text-amber-400/60 uppercase select-none">
                              UZAMCENO
                            </span>
                            <Lock className="w-4 h-4 text-amber-400/50" />
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
                      transition={{ delay: roomIndex * 0.015 }}
                      className="flex items-stretch min-h-[44px] border-b border-white/[0.04] group hover:bg-white/[0.015] transition-colors"
                    >
                      {/* Room label */}
                      <div
                        className="flex-shrink-0 flex items-center gap-3 px-4 sticky left-0 z-20 bg-black/50 backdrop-blur-xl border-r border-white/[0.06] group-hover:bg-white/[0.02] transition-colors"
                        style={{ width: ROOM_LABEL_WIDTH }}
                      >
                        {/* Status circle */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center border"
                            style={{
                              backgroundColor: isActive ? `${barColors.text}20` : 'rgba(255,255,255,0.04)',
                              borderColor: isActive ? `${barColors.text}40` : 'rgba(255,255,255,0.08)',
                            }}
                          >
                            {isActive ? (
                              <Activity className="w-3 h-3" style={{ color: barColors.text }} />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-white/20" />
                            )}
                          </div>
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{ borderColor: barColors.text, borderWidth: 1 }}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                              transition={{ duration: 2.5, repeat: Infinity }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold tracking-tight uppercase text-white/80 truncate leading-tight">{room.name}</p>
                          {isFree ? (
                            <p className="text-[8px] font-medium text-white/25 truncate">Volny</p>
                          ) : (
                            <p className="text-[8px] font-medium truncate" style={{ color: `${barColors.text}80` }}>{room.department}</p>
                          )}
                        </div>
                        {isActive && (
                          <svg className="w-4 h-4 flex-shrink-0 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        )}
                      </div>

                      {/* Timeline area */}
                      <div className="relative flex-grow" style={{ width: TOTAL_WIDTH }}>
                        {/* Grid lines */}
                        {TIME_MARKERS.slice(0, -1).map((_, i) => (
                          <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.03]" style={{ left: i * HOUR_WIDTH }} />
                        ))}

                        {/* Procedure block for active rooms */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, scaleX: 0.95 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ duration: 0.4, delay: roomIndex * 0.02 }}
                            className="absolute top-1 bottom-1 rounded-lg overflow-hidden"
                            style={{
                              left: Math.max(0, boxLeft),
                              width: boxWidth,
                              backgroundColor: barColors.bg,
                              border: `1px solid ${barColors.border}`,
                              transformOrigin: 'left center',
                            }}
                          >
                            {/* Subtle diagonal stripes for texture */}
                            <div
                              className="absolute inset-0 opacity-[0.08]"
                              style={{
                                backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${barColors.text} 6px, ${barColors.text} 7px)`,
                              }}
                            />
                            {/* Content */}
                            <div className="relative flex items-center h-full px-3 gap-2 z-10">
                              {boxWidth > 120 && (
                                <>
                                  <span className="text-[9px] font-bold uppercase tracking-wide truncate" style={{ color: barColors.text }}>
                                    {step.title}
                                  </span>
                                  {room.currentPatient && boxWidth > 200 && (
                                    <>
                                      <div className="w-px h-3 bg-white/10" />
                                      <span className="text-[8px] text-white/40 truncate">{room.currentPatient.name}</span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* For free rooms - show completed procedures as subtle faded blocks */}
                        {isFree && room.currentProcedure && (
                          <div
                            className="absolute top-1 bottom-1 rounded-lg"
                            style={{
                              left: Math.max(0, boxLeft),
                              width: boxWidth,
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.04)',
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
        </div>
      </div>

      {/* ─── Bottom Legend Bar ─── */}
      <div className="relative z-10 flex items-center justify-between px-6 md:pl-28 md:pr-6 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white/15 border border-white/10" />
            <span className="text-[9px] font-medium text-white/35 uppercase tracking-wider">Dokoncene</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] rounded-full bg-[#67C2FF]" />
            <span className="text-[9px] font-medium text-white/35 uppercase tracking-wider">Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] rounded-full bg-[#FF9500]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FF9500 0px, #FF9500 3px, transparent 3px, transparent 6px)' }} />
            <span className="text-[9px] font-medium text-white/35 uppercase tracking-wider">Konec smeny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500/30 border border-pink-500/40" />
            <span className="text-[9px] font-medium text-white/35 uppercase tracking-wider">Presah</span>
          </div>
        </div>
        <span className="text-[9px] text-white/20 font-medium">Kliknete na sal pro zobrazeni detailu</span>
      </div>
    </div>
  );
};

export default TimelineModule;
