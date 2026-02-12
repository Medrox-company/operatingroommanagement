import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, MapPin } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 240;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;

const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

/* --- Neon lime color palette (matching screenshot) --- */
const NEON_LIME = '#D4FF00';
const NEON_LIME_DIM = '#8FA600';

/* ============================== */
/* Timeline Module                */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  /* --- Stats --- */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    return { operations, cleaning, free, completed };
  }, [rooms]);

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      {/* ======== Header ======== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-white/90">Scheduler</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg backdrop-blur-sm">
            <CalendarDays className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/60">
              {currentTime.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg backdrop-blur-sm">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-sm font-mono font-semibold text-white/90">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 pb-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-auto space-y-4 pr-2 hide-scrollbar">

          {/* Render each room as a separate timeline section */}
          {rooms.filter(r => r.currentStepIndex < 6).map((room, roomIndex) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const step = WORKFLOW_STEPS[stepIndex];

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

            return (
              <motion.div
                key={room.id}
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: roomIndex * 0.05, duration: 0.3 }}
              >
                {/* Section header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white/90">{stepIndex + 1}. {step.title}</h3>
                      <p className="text-[10px] text-white/30 mt-0.5">{room.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                      <MapPin className="w-3 h-3" />
                      <span>{room.department}</span>
                    </div>
                    <span className="text-xs text-white/40">Kapacita: {room.currentProcedure?.progress || 0}%</span>
                  </div>
                </div>

                {/* Timeline bar with vertical hash marks */}
                <div className="relative h-14 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  {/* Vertical hash mark grid - every hour */}
                  {Array.from({ length: HOURS_COUNT + 1 }).map((_, i) => {
                    const leftPct = (i / HOURS_COUNT) * 100;
                    return (
                      <div
                        key={`hash-${i}`}
                        className="absolute top-0 bottom-0 w-[1px]"
                        style={{
                          left: `${leftPct}%`,
                          background: 'rgba(255,255,255,0.04)'
                        }}
                      />
                    );
                  })}

                  {/* Fine grain hash marks - every 15 min */}
                  {Array.from({ length: HOURS_COUNT * 4 }).map((_, i) => {
                    const leftPct = (i / (HOURS_COUNT * 4)) * 100;
                    return (
                      <div
                        key={`hash-fine-${i}`}
                        className="absolute bottom-0 w-[1px] h-1"
                        style={{
                          left: `${leftPct}%`,
                          background: 'rgba(255,255,255,0.02)'
                        }}
                      />
                    );
                  })}

                  {/* Neon lime procedure block */}
                  <motion.div
                    className="absolute top-1.5 bottom-1.5 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer group"
                    style={{
                      left: `${boxLeftPct}%`,
                      width: `${boxWidthPct}%`,
                      background: NEON_LIME,
                      boxShadow: `0 0 16px ${NEON_LIME}60, inset 0 0 12px rgba(0,0,0,0.1)`
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: roomIndex * 0.05 + 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {/* Diagonal stripe pattern */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 6px,
                          rgba(0,0,0,0.3) 6px,
                          rgba(0,0,0,0.3) 8px
                        )`
                      }}
                    />
                    <span className="text-xs font-bold text-black relative z-10 group-hover:scale-105 transition-transform">
                      {room.currentProcedure?.estimatedDuration || 120} min / day
                    </span>
                  </motion.div>

                  {/* White numbered milestone at start */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-[3px] border-black flex items-center justify-center z-20 shadow-lg cursor-pointer hover:scale-110 transition-transform"
                    style={{ left: `calc(${boxLeftPct}% - 14px)` }}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: roomIndex * 0.05 + 0.2, duration: 0.4, type: 'spring', stiffness: 200 }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <span className="text-[11px] font-black text-black">{stepIndex + 1}</span>
                  </motion.div>

                  {/* White numbered milestone at end */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-[3px] border-black flex items-center justify-center z-20 shadow-lg cursor-pointer hover:scale-110 transition-transform"
                    style={{ left: `calc(${boxLeftPct + boxWidthPct}% - 14px)` }}
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: roomIndex * 0.05 + 0.3, duration: 0.4, type: 'spring', stiffness: 200 }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <span className="text-[11px] font-black text-black">{stepIndex + 2}</span>
                  </motion.div>

                  {/* Time labels at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-between px-2 text-[9px] text-white/20 font-mono pointer-events-none">
                    <span>7:00</span>
                    <span>10:00</span>
                    <span>13:00</span>
                    <span>16:00</span>
                    <span>19:00</span>
                    <span>22:00</span>
                    <span>1:00</span>
                    <span>4:00</span>
                    <span>7:00</span>
                  </div>
                </div>
              </motion.div>
            );
          })}

        </div>
      </div>

      {/* ======== Room Detail Popup ======== */}
      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRoom(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              className="relative max-w-2xl w-full mx-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedRoom(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">{selectedRoom.name}</h2>
              <p className="text-sm text-white/50 mb-6">{selectedRoom.department}</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Aktuální krok</p>
                  <p className="text-lg font-semibold text-white">{WORKFLOW_STEPS[selectedRoom.currentStepIndex]?.title || 'Dokončeno'}</p>
                </div>

                {selectedRoom.currentProcedure && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Výkon</p>
                    <p className="text-base text-white/80">{selectedRoom.currentProcedure.name}</p>
                  </div>
                )}

                {selectedRoom.staff && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRoom.staff.doctor && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Lékař</p>
                        <p className="text-sm text-white/70">{selectedRoom.staff.doctor.name}</p>
                      </div>
                    )}
                    {selectedRoom.staff.nurse && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Sestra</p>
                        <p className="text-sm text-white/70">{selectedRoom.staff.nurse.name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineModule;
