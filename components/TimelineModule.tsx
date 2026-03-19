import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, X } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 180;
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

/* --- Step colors matching WORKFLOW_STEPS --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; solid: string }> = {
  0: { bg: 'rgba(45,212,191,0.08)', fill: 'rgba(45,212,191,0.20)', border: 'rgba(45,212,191,0.15)', text: '#2DD4BF', solid: '#2DD4BF' },
  1: { bg: 'rgba(167,139,250,0.08)', fill: 'rgba(167,139,250,0.20)', border: 'rgba(167,139,250,0.15)', text: '#A78BFA', solid: '#A78BFA' },
  2: { bg: 'rgba(255,59,48,0.08)', fill: 'rgba(255,59,48,0.20)', border: 'rgba(255,59,48,0.15)', text: '#FF3B30', solid: '#FF3B30' },
  3: { bg: 'rgba(251,191,36,0.08)', fill: 'rgba(251,191,36,0.20)', border: 'rgba(251,191,36,0.15)', text: '#FBBF24', solid: '#FBBF24' },
  4: { bg: 'rgba(129,140,248,0.08)', fill: 'rgba(129,140,248,0.20)', border: 'rgba(129,140,248,0.15)', text: '#818CF8', solid: '#818CF8' },
  5: { bg: 'rgba(217,70,239,0.08)', fill: 'rgba(217,70,239,0.20)', border: 'rgba(217,70,239,0.15)', text: '#D946EF', solid: '#D946EF' },
  6: { bg: 'rgba(249,115,22,0.08)', fill: 'rgba(249,115,22,0.20)', border: 'rgba(249,115,22,0.15)', text: '#F97316', solid: '#F97316' },
};

/* ============================== */
/* Room Detail Popup Component    */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;

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
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-[700px] rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
            <div>
              <h2 className="text-lg font-semibold text-white">{room.name}</h2>
              <p className="text-xs text-white/40">{room.department || 'Neurochirurgie'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {room.isEmergency ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">EMERGENCY</p>
                <p className="text-xs text-white/40">Urgentni operace v prubehu</p>
              </div>
            </div>
          ) : room.isLocked ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-400">UZAMCENO</p>
                <p className="text-xs text-white/40">Sal je docasne uzamcen</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current Status */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <step.Icon className="w-5 h-5" style={{ color: colors.text }} />
                </div>
                <div>
                  <p className="text-xs text-white/40">Aktualni faze</p>
                  <p className="text-base font-semibold text-white">{step.title}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/40 mb-1">Cas zahajeni</p>
                  <p className="text-sm font-mono font-semibold text-white">{room.currentProcedure?.startTime || '--:--'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/40 mb-1">Uplynulo</p>
                  <p className="text-sm font-mono font-semibold text-white">{elapsedStr}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/40 mb-1">Odhad konce</p>
                  <p className="text-sm font-mono font-semibold text-white">{endTimeStr}</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">Prubeh operace</p>
                  <p className="text-xs font-mono font-semibold text-white">{progress}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: colors.solid }}
                  />
                </div>
              </div>

              {/* Procedure Info */}
              {room.currentProcedure && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xs text-white/40 mb-1">Operace</p>
                  <p className="text-sm font-medium text-white">{room.currentProcedure.name}</p>
                  {room.currentProcedure.surgeon && (
                    <p className="text-xs text-white/40 mt-1">Chirurg: {room.currentProcedure.surgeon}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Timeline Module Main Component */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short' });
  const nowPercent = getTimePercent(currentTime);
  const shiftEndPercent = (SHIFT_END_OFFSET / HOURS_COUNT) * 100;

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      if (a.isLocked && !b.isLocked) return 1;
      if (!a.isLocked && b.isLocked) return -1;
      const aActive = a.currentStepIndex < 6;
      const bActive = b.currentStepIndex < 6;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [rooms]);

  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden">
      
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-8 md:pl-32 md:pr-10 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2 opacity-60">
          <CalendarDays className="w-4 h-4 text-[#00D8C1]" />
          <span className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</span>
        </div>
        <div className="flex items-baseline gap-6">
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">TIMELINE</h1>
          <div className="flex items-baseline gap-3 ml-2">
            <span className="text-lg font-medium text-white/30">{dateStr}</span>
            <span className="text-xl font-mono font-semibold text-white/45">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Timeline Table */}
      <div className="flex-1 min-h-0 flex flex-col mx-4 md:ml-28 md:mr-6 mb-4 overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
        
        {/* Time Header */}
        <div className="flex flex-shrink-0 border-b border-white/[0.06] h-9">
          <div className="flex-shrink-0 flex items-center px-4 border-r border-white/[0.06]" style={{ width: ROOM_LABEL_WIDTH }}>
            <span className="text-[10px] font-medium tracking-wider uppercase text-white/25">Sal</span>
          </div>
          <div className="flex-1 flex items-center relative">
            {TIME_MARKERS.map((hour, i) => {
              const isLast = i === TIME_MARKERS.length - 1;
              const widthPct = 100 / HOURS_COUNT;
              const leftPct = i * widthPct;
              const isNight = hour >= 19 || hour < 7;
              return (
                <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}>
                  <div className={`w-px h-full ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.05]'}`} />
                  {!isLast && (
                    <span className={`ml-1.5 text-[9px] font-mono ${isNight ? 'text-white/15' : 'text-white/30'}`}>
                      {hourLabel(hour)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Rows */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto">
          
          {/* Now Indicator */}
          {nowPercent >= 0 && nowPercent <= 100 && (
            <div 
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
            >
              <div className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#00D8C1]" />
              <div className="absolute -left-1 -top-0.5 w-2 h-2 rounded-full bg-[#00D8C1]" />
            </div>
          )}

          {/* Night Zone */}
          <div 
            className="absolute top-0 bottom-0 z-10 pointer-events-none bg-black/15"
            style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0 }}
          />

          {sortedRooms.map((room, idx) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const isActive = stepIndex < 6;
            const isFree = stepIndex >= 6;
            const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];

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
              boxRightPct = boxLeftPct + 5;
            }
            const boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
            const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

            /* ========== EMERGENCY ROW ========== */
            if (room.isEmergency) {
              return (
                <div
                  key={room.id}
                  className="flex items-stretch h-12 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.015] transition-colors"
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Left Label */}
                  <div className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-white/[0.04]" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-sm text-white/50 truncate">{room.name}</span>
                  </div>
                  {/* Timeline Bar - Solid Red with Crosshatch */}
                  <div className="relative flex-1">
                    <div 
                      className="absolute inset-y-1.5 left-0.5 right-0.5 rounded flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      <div 
                        className="absolute inset-0 opacity-30"
                        style={{ 
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.4) 5px, rgba(0,0,0,0.4) 10px)'
                        }}
                      />
                      <span className="text-base font-black tracking-[0.25em] text-white uppercase relative z-10">EMERGENCY</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* ========== LOCKED ROW ========== */
            if (room.isLocked) {
              return (
                <div
                  key={room.id}
                  className="flex items-stretch h-12 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.015] transition-colors"
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Left Label */}
                  <div className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-white/[0.04]" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-sm text-white/50 truncate">{room.name}</span>
                  </div>
                  {/* Timeline Bar - Solid Amber with Crosshatch */}
                  <div className="relative flex-1">
                    <div 
                      className="absolute inset-y-1.5 left-0.5 right-0.5 rounded flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: '#D97706' }}
                    >
                      <div 
                        className="absolute inset-0 opacity-30"
                        style={{ 
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.4) 5px, rgba(0,0,0,0.4) 10px)'
                        }}
                      />
                      <span className="text-base font-black tracking-[0.25em] text-white uppercase relative z-10">UZAMCENO</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* ========== ACTIVE / FREE ROW ========== */
            return (
              <div
                key={room.id}
                className="flex items-stretch h-12 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.015] transition-colors"
                onClick={() => setSelectedRoom(room)}
              >
                {/* Left Label */}
                <div className="flex-shrink-0 flex items-center gap-2.5 px-4 border-r border-white/[0.04]" style={{ width: ROOM_LABEL_WIDTH }}>
                  <div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isActive ? colors.solid : 'rgba(255,255,255,0.12)' }}
                  />
                  <span className="text-sm text-white/50 truncate">{room.name}</span>
                </div>

                {/* Timeline Content */}
                <div className="relative flex-1">
                  {/* Hour grid lines */}
                  {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                    const isNight = hour >= 19 || hour < 7;
                    return (
                      <div 
                        key={i} 
                        className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.015]' : 'bg-white/[0.03]'}`}
                        style={{ left: `${(i / HOURS_COUNT) * 100}%` }}
                      />
                    );
                  })}

                  {/* Procedure Block */}
                  {isActive && (
                    <div
                      className="absolute top-1.5 bottom-1.5 rounded overflow-hidden"
                      style={{ 
                        left: `${Math.max(0, boxLeftPct)}%`, 
                        width: `${boxWidthPct}%`,
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      {/* Progress fill */}
                      <div 
                        className="absolute inset-0 origin-left transition-transform duration-1000"
                        style={{ 
                          transform: `scaleX(${progressPct / 100})`,
                          backgroundColor: colors.fill
                        }}
                      />
                      
                      {/* Procedure name */}
                      <div className="absolute inset-0 flex items-center px-2">
                        <span 
                          className="text-[11px] font-medium truncate relative z-10"
                          style={{ color: colors.text }}
                        >
                          {room.currentProcedure?.name || WORKFLOW_STEPS[stepIndex]?.title}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Free indicator */}
                  {isFree && (
                    <div className="absolute inset-y-1.5 left-1 right-1 flex items-center justify-center">
                      <span className="text-[11px] text-white/15">Volny</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
