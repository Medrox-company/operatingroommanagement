import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, ChevronRight } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

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
/* Room Detail Popup Component    */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;
  const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : colors.text;

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
        className="relative w-full max-w-2xl rounded-2xl border overflow-hidden"
        style={{ 
          background: 'rgba(15, 15, 23, 0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 0 60px ${themeColor}10`
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5 text-white/60 hover:text-white" />
        </button>

        <div className="p-8">
          <div className="flex items-start gap-6 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">{room.name}</h2>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.solid }} />
                <span style={{ color: colors.text }}>{step.title}</span>
                {room.isEmergency && <span className="text-red-400 font-semibold">EMERGENCY</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Patient</p>
              <p className="text-lg font-semibold text-white">{room.currentPatient?.name || '--'}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div 
                    className="h-full" 
                    style={{ backgroundColor: colors.solid }}
                    initial={{ width: 0 }}
                    animate={{ width: `${room.currentProcedure?.progress || 0}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-sm font-mono text-white/70">{room.currentProcedure?.progress || 0}%</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Elapsed</p>
              <p className="text-lg font-mono font-semibold text-white">{elapsedStr}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-white/50 mb-3 font-semibold">Workflow Progress</p>
            <div className="flex gap-2">
              {WORKFLOW_STEPS.map((s, idx) => {
                const isCompleted = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                const stepColors = STEP_COLORS[idx] || STEP_COLORS[6];
                return (
                  <div key={idx} className="flex items-center">
                    <motion.div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: isCurrent ? stepColors.solid : isCompleted ? stepColors.solid + '40' : 'rgba(255,255,255,0.05)',
                        color: isCurrent ? '#000' : isCompleted ? stepColors.solid : 'rgba(255,255,255,0.3)',
                        border: isCurrent ? `2px solid ${stepColors.solid}` : `1px solid rgba(255,255,255,0.1)`
                      }}
                      animate={{ scale: isCurrent ? 1.1 : 1 }}
                    >
                      {idx + 1}
                    </motion.div>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div className={`w-6 h-px mx-1 ${isCompleted ? 'bg-white/20' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Operating Room Card Component  */
/* ============================== */
const RoomCard: React.FC<{ room: OperatingRoom; currentTime: Date; onCardClick: (room: OperatingRoom) => void }> = ({ room, currentTime, onCardClick }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;
  const isFree = stepIndex >= 6;

  const startParts = room.currentProcedure?.startTime?.split(':');
  let elapsedTime = 0;
  if (startParts && startParts.length === 2 && isActive) {
    const startDate = new Date();
    startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    elapsedTime = Math.max(0, Math.floor((currentTime.getTime() - startDate.getTime()) / 1000 / 60));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      onClick={() => onCardClick(room)}
      className="group relative cursor-pointer"
    >
      <div
        className="rounded-xl p-4 border transition-all duration-300 hover:shadow-lg hover:border-opacity-100 relative overflow-hidden"
        style={{
          background: isFree ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0, 0, 0, 0.5)',
          borderColor: isFree ? 'rgba(52, 199, 89, 0.3)' : colors.border,
          boxShadow: isActive ? `0 0 24px ${colors.glow}` : 'none'
        }}
      >
        {/* Accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: colors.solid }} />

        {/* Content */}
        <div className="pl-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{room.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.solid }} />
                <p className="text-xs font-medium truncate" style={{ color: colors.text }}>{step.title}</p>
              </div>
            </div>
            {room.isEmergency && (
              <div className="flex-shrink-0 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40">
                <span className="text-xs font-bold text-red-400">EMERGENCY</span>
              </div>
            )}
            {room.isLocked && (
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-400" />
            )}
          </div>

          {/* Patient info */}
          {room.currentPatient && (
            <p className="text-xs text-white/70 mb-3 truncate">Patient: {room.currentPatient.name}</p>
          )}

          {/* Progress indicator */}
          {isActive && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/50">Progress</span>
                <span className="text-xs font-mono font-semibold" style={{ color: colors.text }}>
                  {room.currentProcedure?.progress || 0}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors.solid }}
                  initial={{ width: 0 }}
                  animate={{ width: `${room.currentProcedure?.progress || 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Mini timeline */}
          <div className="mb-3 flex items-center justify-between">
            {WORKFLOW_STEPS.slice(0, 5).map((s, idx) => {
              const isCompleted = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              const stepColors = STEP_COLORS[idx];
              return (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: isCurrent ? stepColors.solid : isCompleted ? stepColors.solid + '50' : 'rgba(255,255,255,0.05)',
                      color: isCurrent || isCompleted ? '#000' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-[9px] text-white/40 text-center leading-tight">{s.title.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>

          {/* Time info */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-white/5 rounded p-2 border border-white/10">
              <p className="text-white/50 mb-0.5">Start Time</p>
              <p className="font-mono font-semibold text-white">{room.currentProcedure?.startTime || '--:--'}</p>
            </div>
            <div className="bg-white/5 rounded p-2 border border-white/10">
              <p className="text-white/50 mb-0.5">{isActive ? 'Elapsed' : 'Est. End'}</p>
              <p className="font-mono font-semibold text-white">
                {isActive 
                  ? `${Math.floor(elapsedTime / 60)}:${String(elapsedTime % 60).padStart(2, '0')}`
                  : room.estimatedEndTime 
                    ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'
                }
              </p>
            </div>
          </div>

          {/* Staff */}
          <div className="flex items-center gap-1.5 text-xs text-white/50 mb-3">
            <Users className="w-3 h-3" />
            <span>{room.doctors?.length || 0} Doctors | {room.nurses?.length || 0} Nurses</span>
          </div>

          {/* Department */}
          <p className="text-xs text-white/40">{room.department}</p>
        </div>

        {/* Hover action */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ============================== */
/* Main Timeline Module Component */
/* ============================== */
export const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate stats
  const stats = useMemo(() => {
    return {
      operations: rooms.filter(r => r.currentStepIndex < 6).length,
      cleaning: rooms.filter(r => r.currentStepIndex === 5).length,
      free: rooms.filter(r => r.currentStepIndex >= 6).length,
      completed: rooms.filter(r => r.currentStepIndex === 6).length,
      emergency: rooms.filter(r => r.isEmergency).length,
      doctors: rooms.reduce((sum, r) => sum + (r.doctors?.length || 0), 0),
      nurses: rooms.reduce((sum, r) => sum + (r.nurses?.length || 0), 0),
    };
  }, [rooms]);

  // Sort rooms: Emergency → Active → Cleaning → Ready → Completed
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
      if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1;
      return a.currentStepIndex - b.currentStepIndex;
    });
  }, [rooms]);

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/[0.08] bg-black/60 backdrop-blur-md px-6 py-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D8C1]/15 border border-[#00D8C1]/30 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-[#00D8C1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#00D8C1]/60 tracking-widest uppercase">Operating Rooms</p>
              <h1 className="text-2xl font-black text-white">Status Board</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-[#00D8C1]" />
              <span className="font-mono font-bold text-white text-sm">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Active', value: stats.operations, color: '#34C759', icon: Activity },
            { label: 'Cleaning', value: stats.cleaning, color: '#FBBF24', icon: null },
            { label: 'Available', value: stats.free, color: '#00D8C1', highlight: true },
            { label: 'Completed', value: stats.completed, color: '#818CF8', icon: null },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                s.highlight 
                  ? 'bg-[#00D8C1]/15 border border-[#00D8C1]/30 text-[#00D8C1] shadow-[0_0_16px_rgba(0,216,193,0.15)]' 
                  : 'bg-white/5 border border-white/10 text-white/70'
              }`}
            >
              {s.icon && <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />}
              <span className="font-mono font-bold text-sm">{s.value}</span>
            </div>
          ))}
          {stats.emergency > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-sm">{stats.emergency}</span>
              <span>Emergency</span>
            </div>
          )}
          <div className="w-px h-6 bg-white/10 mx-1" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{stats.doctors + stats.nurses} Staff</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          <AnimatePresence mode="popLayout">
            {sortedRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentTime={currentTime}
                onCardClick={setSelectedRoom}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            currentTime={currentTime}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineModule;
