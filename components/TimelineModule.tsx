import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, MoreVertical, ChevronRight } from 'lucide-react';

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

/* --- Step colors with gradient support --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string; gradient: string; stripe: string }> = {
  0: { bg: 'rgba(167,139,250,0.15)', fill: 'rgba(167,139,250,0.45)', border: 'rgba(167,139,250,0.30)', text: '#A78BFA', glow: 'rgba(167,139,250,0.35)', solid: '#A78BFA', gradient: 'linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)', stripe: '#9F7AEA' },
  1: { bg: 'rgba(45,212,191,0.15)', fill: 'rgba(45,212,191,0.45)', border: 'rgba(45,212,191,0.30)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.35)', solid: '#2DD4BF', gradient: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', stripe: '#0D9488' },
  2: { bg: 'rgba(255,59,48,0.15)', fill: 'rgba(255,59,48,0.45)', border: 'rgba(255,59,48,0.30)', text: '#FF3B30', glow: 'rgba(255,59,48,0.35)', solid: '#FF3B30', gradient: 'linear-gradient(135deg, #FF3B30 0%, #DC2626 100%)', stripe: '#B91C1C' },
  3: { bg: 'rgba(251,191,36,0.15)', fill: 'rgba(251,191,36,0.45)', border: 'rgba(251,191,36,0.30)', text: '#FBBF24', glow: 'rgba(251,191,36,0.35)', solid: '#FBBF24', gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)', stripe: '#D97706' },
  4: { bg: 'rgba(129,140,248,0.15)', fill: 'rgba(129,140,248,0.45)', border: 'rgba(129,140,248,0.30)', text: '#818CF8', glow: 'rgba(129,140,248,0.35)', solid: '#818CF8', gradient: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)', stripe: '#4F46E5' },
  5: { bg: 'rgba(91,101,220,0.15)', fill: 'rgba(91,101,220,0.45)', border: 'rgba(91,101,220,0.30)', text: '#5B65DC', glow: 'rgba(91,101,220,0.35)', solid: '#5B65DC', gradient: 'linear-gradient(135deg, #5B65DC 0%, #4F46E5 100%)', stripe: '#4338CA' },
  6: { bg: 'rgba(52,199,89,0.15)', fill: 'rgba(52,199,89,0.45)', border: 'rgba(52,199,89,0.30)', text: '#34C759', glow: 'rgba(52,199,89,0.35)', solid: '#34C759', gradient: 'linear-gradient(135deg, #34C759 0%, #22C55E 100%)', stripe: '#16A34A' },
};

/* ============================== */
/* Timeline Module                */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentSec = currentTime.getSeconds();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;

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

  const shiftEndPercent = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  /* Get current day name */
  const dayNames = ['Ne', 'Po', 'Ut', 'St', 'Ct', 'Pa', 'So'];
  const today = currentTime.getDay();

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative" style={{ background: 'linear-gradient(180deg, rgba(15, 10, 30, 0.95) 0%, rgba(10, 8, 25, 0.98) 100%)' }}>

      {/* ======== Header ======== */}
      <header className="relative z-10 px-4 md:pl-28 md:pr-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tight">Timeline Project</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <CalendarDays className="w-4 h-4 text-[#2DD4BF]" />
              <span className="text-xs font-semibold text-white/70">
                {currentTime.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {/* Time badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.25)' }}>
              <Clock className="w-4 h-4 text-[#2DD4BF]" />
              <span className="text-sm font-mono font-black text-[#2DD4BF] tracking-wider">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Operace', value: stats.operations, color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
            { label: 'Uklid', value: stats.cleaning, color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
            { label: 'Volne', value: stats.free, color: '#2DD4BF', bg: 'rgba(45,212,191,0.12)' },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: s.bg, borderColor: `${s.color}30` }}
              whileHover={{ scale: 1.05, borderColor: `${s.color}50` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{s.label}</span>
            </motion.div>
          ))}
          {stats.emergency > 0 && (
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: 'rgba(255,59,48,0.15)', borderColor: 'rgba(255,59,48,0.35)' }}
              animate={{ boxShadow: ['0 0 0 rgba(255,59,48,0)', '0 0 20px rgba(255,59,48,0.3)', '0 0 0 rgba(255,59,48,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-400">{stats.emergency}</span>
              <span className="text-[10px] font-medium text-red-400/60 uppercase tracking-wider">Emergency</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-6 pb-4 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border" style={{ background: 'rgba(20, 15, 40, 0.6)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

          {/* Time Axis Header */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
            <div className="flex-shrink-0 flex items-center px-4 gap-2 border-r" style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Users className="w-4 h-4 text-white/30" />
              <span className="text-xs font-bold text-white/40">Saly</span>
            </div>
            <div className="flex-1 flex items-center h-12 relative overflow-x-auto hide-scrollbar">
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / HOURS_COUNT;
                const leftPct = i * widthPct;
                const isCurrentHour = !isLast && (() => {
                  const hFrom7 = hour >= 7 ? (hour - 7) * 60 : (hour + 17) * 60;
                  const nextH = TIME_MARKERS[i + 1];
                  const nFrom7 = nextH >= 7 ? (nextH - 7) * 60 : (nextH + 17) * 60;
                  const nowMin = getMinutesFrom7(currentTime);
                  return nowMin >= hFrom7 && nowMin < nFrom7;
                })();
                const dayOfWeek = (today + Math.floor(i / 24)) % 7;
                return (
                  <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex flex-col items-start justify-center" style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}>
                    <div className="w-px h-full bg-white/[0.04] absolute left-0" />
                    {!isLast && (
                      <div className="ml-2 flex flex-col">
                        <span className={`text-[10px] font-bold ${isCurrentHour ? 'text-[#2DD4BF]' : 'text-white/25'}`}>
                          {hour}
                        </span>
                        {i % 4 === 0 && (
                          <span className="text-[8px] text-white/15 font-medium">{dayNames[dayOfWeek]}</span>
                        )}
                      </div>
                    )}
                    {isCurrentHour && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                        style={{ background: '#2DD4BF', boxShadow: '0 0 12px #2DD4BF' }}
                        layoutId="currentHour"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Rows */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto hide-scrollbar">
            {/* Now indicator */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  <div className="absolute -left-[1px] top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #2DD4BF 0%, rgba(45,212,191,0.3) 100%)' }} />
                  <motion.div 
                    className="absolute -left-[6px] top-0 w-3 h-3"
                    style={{ 
                      background: '#2DD4BF',
                      clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                      boxShadow: '0 0 10px #2DD4BF'
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rows */}
            {sortedRooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const isActive = stepIndex < 6;
              const isFree = stepIndex >= 6;
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
              const isHovered = hoveredRoom === room.id;

              const startParts = room.currentProcedure?.startTime?.split(':');
              const startDate = new Date();
              if (startParts && startParts.length === 2) {
                startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
              }
              const boxLeftPct = getTimePercent(startDate);
              let boxRightPct: number;
              if (room.estimatedEndTime) {
                boxRightPct = getTimePercent(new Date(room.estimatedEndTime));
              } else if (room.currentProcedure?.estimatedDuration) {
                const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                boxRightPct = getTimePercent(endDate);
              } else {
                boxRightPct = boxLeftPct + 8;
              }
              const boxWidthPct = Math.max(4, boxRightPct - boxLeftPct);

              const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : colors.text;

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: roomIndex * 0.03, duration: 0.4 }}
                  className="flex items-stretch min-h-[56px] border-b transition-all cursor-pointer"
                  style={{ 
                    borderColor: isHovered ? `${themeColor}30` : 'rgba(255,255,255,0.04)',
                    background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Room label with avatar */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-3 px-4 border-r transition-all"
                    style={{ 
                      width: ROOM_LABEL_WIDTH, 
                      borderColor: 'rgba(255,255,255,0.06)',
                      background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center border-2 overflow-hidden"
                        style={{ 
                          borderColor: themeColor,
                          background: `${themeColor}20`
                        }}
                      >
                        {room.isEmergency ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : room.isLocked ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : isActive ? (
                          <img 
                            src={`https://i.pravatar.cc/80?u=${room.id}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-white/20" />
                        )}
                      </div>
                      {isActive && !room.isEmergency && !room.isLocked && (
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f0a1e]"
                          style={{ backgroundColor: colors.solid }}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate leading-tight ${
                        room.isEmergency ? 'text-red-400' : 
                        room.isLocked ? 'text-amber-400' : 
                        isActive ? 'text-white/90' : 'text-white/40'
                      }`}>
                        {room.name}
                      </p>
                      {room.currentPatient && isActive && (
                        <p className="text-[10px] text-white/30 truncate">{room.currentPatient.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Timeline bar area */}
                  <div className="relative flex-1 overflow-hidden">
                    {/* Grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute top-0 bottom-0 w-px"
                        style={{ left: `${(i / HOURS_COUNT) * 100}%`, background: 'rgba(255,255,255,0.03)' }}
                      />
                    ))}

                    {/* Progress bar - Gantt style with stripes */}
                    {isActive && !room.isEmergency && !room.isLocked && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: roomIndex * 0.03 + 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-2 bottom-2 flex items-center overflow-hidden group/bar"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`,
                          minWidth: 120,
                          transformOrigin: 'left center',
                          borderRadius: '10px',
                          background: colors.gradient,
                          boxShadow: `0 4px 20px ${colors.glow}, 0 0 0 1px ${colors.border}`,
                        }}
                      >
                        {/* Diagonal stripes overlay */}
                        <div 
                          className="absolute inset-0 opacity-20"
                          style={{ 
                            backgroundImage: `repeating-linear-gradient(
                              -45deg,
                              transparent,
                              transparent 6px,
                              ${colors.stripe} 6px,
                              ${colors.stripe} 8px
                            )`,
                            borderRadius: '10px'
                          }} 
                        />

                        {/* Content */}
                        <div className="relative flex items-center justify-between w-full h-full px-3 gap-2 z-10">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Step icon */}
                            <div 
                              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(0,0,0,0.25)' }}
                            >
                              <step.Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate leading-tight">{step.title}</p>
                              <p className="text-[9px] text-white/60">
                                {room.currentProcedure?.startTime} - {
                                  room.estimatedEndTime
                                    ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                    : room.currentProcedure?.estimatedDuration
                                      ? new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                      : '--:--'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Menu button */}
                          <motion.button
                            className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.3)' }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-white/80" />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* Emergency bar */}
                    {room.isEmergency && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-2 bottom-2 left-2 right-2 flex items-center justify-center overflow-hidden"
                        style={{ 
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(255,59,48,0.35) 0%, rgba(220,38,38,0.25) 100%)',
                          border: '1px solid rgba(255,59,48,0.4)',
                          boxShadow: '0 4px 20px rgba(255,59,48,0.3)'
                        }}
                      >
                        <div 
                          className="absolute inset-0 opacity-15"
                          style={{ 
                            backgroundImage: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 8px,
                              rgba(255,59,48,1) 8px,
                              rgba(255,59,48,1) 10px
                            )`
                          }} 
                        />
                        <span className="text-sm font-black tracking-[0.3em] text-white/70 uppercase">EMERGENCY</span>
                      </motion.div>
                    )}

                    {/* Locked bar */}
                    {room.isLocked && !room.isEmergency && (
                      <div
                        className="absolute top-2 bottom-2 left-2 right-2 flex items-center justify-center gap-3 overflow-hidden"
                        style={{ 
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)',
                          border: '1px dashed rgba(251,191,36,0.35)'
                        }}
                      >
                        <Lock className="w-4 h-4 text-amber-400/50" />
                        <span className="text-xs font-bold tracking-widest text-amber-400/50 uppercase">Uzamceno</span>
                      </div>
                    )}

                    {/* Free state */}
                    {isFree && !room.isEmergency && !room.isLocked && (
                      <div
                        className="absolute top-2 bottom-2 left-2 right-2 flex items-center justify-center"
                        style={{ 
                          borderRadius: '10px',
                          border: '1px dashed rgba(255,255,255,0.08)'
                        }}
                      >
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/15 uppercase">Volny</span>
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
