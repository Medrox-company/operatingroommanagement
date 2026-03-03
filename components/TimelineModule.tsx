import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, Lock, AlertTriangle, Stethoscope, Activity, X, ChevronRight } from 'lucide-react';

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

/* --- Step colors matching WORKFLOW_STEPS status colors --- */
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
/* Timeline Module Component      */
/* ============================== */
export const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);

  /* Calculate timeline statistics */
  const stats = useMemo(() => {
    const active = rooms.filter(r => r.currentStepIndex < 6).length;
    const paused = rooms.filter(r => r.isPaused).length;
    const finished = rooms.filter(r => r.currentStepIndex >= 6).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { active, paused, finished, emergency };
  }, [rooms]);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-black/80 to-black/90">
      {/* ====== Header with stats ====== */}
      <motion.div 
        className="flex-shrink-0 px-8 py-6 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Časová osa</h2>
            <p className="text-xs text-white/40 tracking-wider uppercase">Přehled činnosti všech operačních sálů</p>
          </div>
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <StatPill label="Aktivní" value={stats.active} color="rgba(129,140,248,0.3)" />
            <StatPill label="Pozastaveny" value={stats.paused} color="rgba(251,191,36,0.3)" />
            <StatPill label="Ukončený" value={stats.finished} color="rgba(52,199,89,0.3)" />
            {stats.emergency > 0 && <StatPill label="Emergency" value={stats.emergency} color="rgba(255,59,48,0.3)" />}
          </motion.div>
        </div>
      </motion.div>

      {/* ====== Timeline scrollable area ====== */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Hour markers header */}
        <motion.div 
          className="sticky top-0 z-40 flex bg-black/40 backdrop-blur-md border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div style={{ width: ROOM_LABEL_WIDTH }} className="flex-shrink-0 px-6 py-3 border-r" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
            <p className="text-[10px] font-black text-white/30 tracking-widest uppercase">Sál</p>
          </div>
          <div className="flex-1 flex overflow-x-auto hide-scrollbar">
            {TIME_MARKERS.map((h, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 px-3 py-3 text-center border-r"
                style={{ width: 60, borderColor: 'rgba(255, 255, 255, 0.04)' }}
              >
                <p className="text-[9px] font-bold text-white/30">{hourLabel(h)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Room timeline rows */}
        <div className="space-y-2 p-4">
          {rooms.map((room, idx) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
            const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : colors.text;
            const isSelected = room.id === selectedRoomId;

            return (
              <motion.div
                key={room.id}
                className="flex rounded-2xl overflow-hidden"
                style={{ 
                  background: isSelected 
                    ? `linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)`
                    : 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(20px)',
                  border: isSelected 
                    ? `1px solid ${themeColor}40` 
                    : 'rgba(255, 255, 255, 0.06)',
                  boxShadow: isSelected ? `inset 0 0 80px ${themeColor}10` : 'none'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05, duration: 0.4, ease: 'easeOut' }}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
              >
                {/* Room label */}
                <motion.div 
                  className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-r cursor-pointer"
                  style={{ 
                    width: ROOM_LABEL_WIDTH,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                >
                  <div>
                    <p className="text-sm font-black text-white">{room.name}</p>
                    <p className="text-[9px] text-white/40 mt-0.5">{room.department}</p>
                  </div>
                  {room.isEmergency && (
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </motion.div>
                  )}
                  {room.isLocked && !room.isEmergency && (
                    <Lock className="w-4 h-4 text-amber-400" />
                  )}
                </motion.div>

                {/* Timeline bar */}
                <div className="flex-1 relative flex items-center px-2 py-2 overflow-x-auto hide-scrollbar">
                  <div className="relative w-full h-12 rounded-xl overflow-hidden" style={{ minWidth: 'max-content' }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {TIME_MARKERS.map((_, i) => (
                        <div 
                          key={i}
                          className="flex-shrink-0 border-r"
                          style={{ 
                            width: 60, 
                            borderColor: 'rgba(255, 255, 255, 0.04)',
                            background: i % 4 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                          }}
                        />
                      ))}
                    </div>

                    {/* Progress bar background */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ 
                        background: `${themeColor}08`,
                        borderLeft: `3px solid ${themeColor}`,
                        width: `${(stepIndex / 7) * 100}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(stepIndex / 7) * 100}%` }}
                      transition={{ delay: 0.2 + idx * 0.05, duration: 1, ease: 'easeOut' }}
                    />

                    {/* Current time indicator */}
                    <motion.div
                      className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-50"
                      style={{ 
                        left: `${nowPercent}%`,
                        boxShadow: '0 0 12px rgba(255, 255, 255, 0.6)'
                      }}
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Step labels */}
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <motion.div 
                        className="flex items-center gap-2 text-[10px] font-bold text-white/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + idx * 0.05, duration: 0.4 }}
                      >
                        <div 
                          className="w-4 h-4 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: `${themeColor}25`,
                            borderColor: `${themeColor}50`,
                            border: '1px solid'
                          }}
                        >
                          {WORKFLOW_STEPS[stepIndex]?.Icon && (
                            <WORKFLOW_STEPS[stepIndex].Icon className="w-2.5 h-2.5" style={{ color: themeColor }} />
                          )}
                        </div>
                        <span style={{ color: themeColor }}>
                          {WORKFLOW_STEPS[stepIndex]?.title || 'Ukončeno'}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ====== Bottom info bar ====== */}
      <motion.div 
        className="flex-shrink-0 px-8 py-4 border-t flex items-center justify-between text-xs"
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="text-white/40">
          <span className="text-white/60">Aktuální čas:</span> {currentTime.toLocaleTimeString('cs-CZ')}
        </div>
        <div className="text-white/40">
          Operační sály: <span className="text-white/60 font-bold">{rooms.length}</span>
        </div>
      </motion.div>
    </div>
  );
};

/* ============================== */
/* Stat Pill Component            */
/* ============================== */
const StatPill: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <motion.div
    className="px-3.5 py-2 rounded-xl border flex items-center gap-2"
    style={{ 
      background: color,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)'
    }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.05 }}
  >
    <span className="text-[10px] font-black tracking-wider uppercase text-white/60">{label}</span>
    <span className="text-sm font-black text-white">{value}</span>
  </motion.div>
);

export default TimelineModule;
