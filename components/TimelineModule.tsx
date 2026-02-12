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

/* --- Neon green color palette --- */
const NEON_GREEN = '#D4FF00';
const NEON_GREEN_DIM = '#8FA600';

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
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative" style={{ background: '#0a0a0a' }}>

      {/* ======== Header ======== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Scheduler</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg">
            <CalendarDays className="w-4 h-4 text-white/50" />
            <span className="text-sm font-medium text-white/70">
              {currentTime.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg">
            <Clock className="w-4 h-4 text-white/50" />
            <span className="text-sm font-mono font-semibold text-white">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 pb-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-auto space-y-6">

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
              <div key={room.id} className="flex flex-col gap-3">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ background: NEON_GREEN }} />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{stepIndex + 1}. {step.title}</h3>
                      <p className="text-xs text-white/40">{room.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white/30" />
                    <span className="text-sm text-white/50">{room.department}</span>
                    <span className="text-xs text-white/30 ml-4">Capacity: {room.currentProcedure?.progress || 0}%</span>
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="relative h-16 rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Vertical gray bars for time markers */}
                  {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                    const leftPct = (i / HOURS_COUNT) * 100;
                    return (
                      <div
                        key={`marker-${i}`}
                        className="absolute top-0 bottom-0 w-[2px]"
                        style={{
                          left: `${leftPct}%`,
                          background: 'rgba(255,255,255,0.05)'
                        }}
                      />
                    );
                  })}

                  {/* Neon green procedure block */}
                  <motion.div
                    className="absolute top-2 bottom-2 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{
                      left: `${boxLeftPct}%`,
                      width: `${boxWidthPct}%`,
                      background: NEON_GREEN,
                      boxShadow: `0 0 20px ${NEON_GREEN}80`
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: roomIndex * 0.1, duration: 0.4 }}
                  >
                    {/* Diagonal stripe pattern */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 8px,
                          rgba(0,0,0,0.2) 8px,
                          rgba(0,0,0,0.2) 10px
                        )`
                      }}
                    />
                    <span className="text-sm font-bold text-black relative z-10">
                      {room.currentProcedure?.estimatedDuration} min / day
                    </span>
                  </motion.div>

                  {/* White numbered marker at start */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center z-20"
                    style={{ left: `calc(${boxLeftPct}% - 16px)` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: roomIndex * 0.1 + 0.2, duration: 0.3, type: 'spring' }}
                  >
                    <span className="text-xs font-bold text-black">{stepIndex + 1}</span>
                  </motion.div>

                  {/* White numbered marker at end */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center z-20"
                    style={{ left: `calc(${boxLeftPct + boxWidthPct}% - 16px)` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: roomIndex * 0.1 + 0.3, duration: 0.3, type: 'spring' }}
                  >
                    <span className="text-xs font-bold text-black">{stepIndex + 2}</span>
                  </motion.div>

                  {/* Time labels */}
                  <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-between px-2 text-[10px] text-white/30 font-mono">
                    <span>7:00</span>
                    <span>10:00</span>
                    <span>13:00</span>
                    <span>16:00</span>
                    <span>19:00</span>
                  </div>
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
