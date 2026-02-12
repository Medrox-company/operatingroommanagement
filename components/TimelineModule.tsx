import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, Calendar, Users, AlertTriangle, Lock, Activity, Stethoscope, X, ChevronRight } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

// Vibrant gradient color palette inspired by the design images
const STEP_GRADIENTS = [
  'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #7C3AED 100%)', // Purple
  'linear-gradient(135deg, #14B8A6 0%, #06B6D4 50%, #0891B2 100%)', // Teal/Cyan
  'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #4F46E5 100%)', // Blue/Indigo
  'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #FD7E14 100%)', // Orange
  'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%)', // Light Purple
  'linear-gradient(135deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)', // Green
  'linear-gradient(135deg, #22C55E 0%, #4ADE80 50%, #86EFAC 100%)', // Success Green
];

const STEP_COLORS = [
  { main: '#A855F7', light: '#C084FC', glow: 'rgba(168, 85, 247, 0.4)' },
  { main: '#14B8A6', light: '#5EEAD4', glow: 'rgba(20, 184, 166, 0.4)' },
  { main: '#3B82F6', light: '#93C5FD', glow: 'rgba(59, 130, 246, 0.4)' },
  { main: '#F97316', light: '#FDBA74', glow: 'rgba(249, 115, 22, 0.4)' },
  { main: '#8B5CF6', light: '#C4B5FD', glow: 'rgba(139, 92, 246, 0.4)' },
  { main: '#10B981', light: '#6EE7B7', glow: 'rgba(16, 185, 129, 0.4)' },
  { main: '#22C55E', light: '#86EFAC', glow: 'rgba(34, 197, 94, 0.4)' },
];

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      operations: rooms.filter(r => r.currentStepIndex < 6 && r.currentStepIndex > 0).length,
      cleaning: rooms.filter(r => r.currentStepIndex === 5).length,
      free: rooms.filter(r => r.currentStepIndex === 6).length,
      emergency: rooms.filter(r => r.isEmergency).length,
      doctors: rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex < 6).length,
      nurses: rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex < 6).length,
    };
  }, [rooms]);

  // Get days for timeline (this week)
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Header with stats */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-black tracking-tight text-white">Timeline Projekt</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1]">
              <Calendar className="w-4 h-4 text-white/40" />
              <span className="text-sm font-medium text-white/70">{currentTime.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Operace', value: stats.operations, color: '#A855F7' },
              { label: 'Uklid', value: stats.cleaning, color: '#14B8A6' },
              { label: 'Volne', value: stats.free, color: '#22C55E' },
              { label: 'Emergency', value: stats.emergency, color: '#EF4444' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="px-4 py-2 rounded-xl border"
                style={{
                  background: `${stat.color}15`,
                  borderColor: `${stat.color}30`,
                }}
                whileHover={{ scale: 1.05, borderColor: `${stat.color}50` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color, boxShadow: `0 0 10px ${stat.color}` }} />
                  <span className="text-xs font-bold text-white/60">{stat.label}</span>
                  <span className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Week timeline header */}
        <div className="flex items-center gap-3 px-4">
          <div className="w-48 flex-shrink-0">
            <h3 className="text-sm font-bold text-white/50 tracking-wider">ZAMESTNANCI</h3>
          </div>
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`flex-1 text-center py-3 rounded-xl border transition-all ${
                  isToday
                    ? 'bg-purple-500/20 border-purple-500/40 shadow-lg'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="text-xs font-bold text-white/40">{day.toLocaleDateString('cs-CZ', { weekday: 'short' }).toUpperCase()}</div>
                <div className={`text-lg font-black ${isToday ? 'text-purple-400' : 'text-white/70'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Room rows with procedure cards */}
        <div className="space-y-3">
          {rooms.slice(0, 7).map((room, roomIndex) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const isActive = stepIndex < 6;
            const colors = STEP_COLORS[stepIndex];
            const gradient = STEP_GRADIENTS[stepIndex];

            return (
              <motion.div
                key={room.id}
                className="flex items-center gap-3 group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: roomIndex * 0.05, duration: 0.3 }}
              >
                {/* Room/Employee info */}
                <motion.div
                  className="w-48 flex-shrink-0 p-3 rounded-xl border cursor-pointer"
                  style={{
                    background: isActive ? `${colors.main}10` : 'rgba(255,255,255,0.03)',
                    borderColor: isActive ? `${colors.main}25` : 'rgba(255,255,255,0.06)',
                  }}
                  whileHover={{ scale: 1.02, borderColor: isActive ? `${colors.main}40` : 'rgba(255,255,255,0.12)' }}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2"
                      style={{
                        background: isActive ? gradient : 'rgba(255,255,255,0.08)',
                        borderColor: isActive ? colors.main : 'rgba(255,255,255,0.15)',
                        color: 'white',
                      }}
                    >
                      {room.staff?.doctor?.name?.charAt(0) || room.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{room.name}</div>
                      <div className="text-xs text-white/40">{room.department}</div>
                    </div>
                  </div>
                </motion.div>

                {/* Timeline cards */}
                <div className="flex-1 grid grid-cols-7 gap-3">
                  {weekDays.map((day, dayIndex) => {
                    // Show procedure card on random days for demo (in real app, based on scheduling)
                    const showCard = room.currentProcedure && dayIndex >= 2 && dayIndex <= 4;
                    const spanDays = dayIndex === 2 ? 3 : 1;

                    if (!showCard || (dayIndex > 2 && dayIndex <= 4)) {
                      return <div key={dayIndex} />;
                    }

                    return (
                      <motion.div
                        key={dayIndex}
                        className="relative rounded-xl p-3 border cursor-pointer overflow-hidden"
                        style={{
                          gridColumn: `span ${spanDays}`,
                          background: gradient,
                          borderColor: colors.main,
                          boxShadow: `0 4px 20px ${colors.glow}`,
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: roomIndex * 0.05 + dayIndex * 0.02, duration: 0.3 }}
                        whileHover={{ scale: 1.03, y: -2, boxShadow: `0 8px 30px ${colors.glow}` }}
                        onClick={() => setSelectedRoom(room)}
                      >
                        {/* Diagonal stripe pattern */}
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundImage: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 10px,
                              white 10px,
                              white 12px
                            )`,
                          }}
                        />

                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white/90">{room.currentProcedure?.name}</span>
                            <ChevronRight className="w-4 h-4 text-white/60" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <Clock className="w-3 h-3" />
                            <span>{room.currentProcedure?.startTime}</span>
                            <span className="text-white/50">-</span>
                            <span>{WORKFLOW_STEPS[stepIndex].title}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {[room.staff?.doctor, room.staff?.anesthesiologist, room.staff?.nurse].filter(Boolean).slice(0, 3).map((staff, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full bg-white/30 border border-white/50 flex items-center justify-center text-[8px] font-bold text-white"
                              >
                                {staff?.name?.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Progress indicator */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <motion.div
                            className="h-full bg-white/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${room.currentProcedure?.progress || 0}%` }}
                            transition={{ delay: roomIndex * 0.05 + 0.5, duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Room detail popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================== */
/* Room Detail Popup Component    */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex];
  const gradient = STEP_GRADIENTS[stepIndex];
  const isActive = stepIndex < 6;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-[800px] rounded-3xl border overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,40,0.98) 0%, rgba(10,10,25,0.99) 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 100px ${colors.glow}`,
        }}
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient background glow */}
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: colors.main }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: colors.main }}
        />

        {/* Header */}
        <div
          className="px-8 py-6 border-b relative"
          style={{
            borderColor: 'rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl"
                style={{
                  background: gradient,
                  boxShadow: `0 8px 30px ${colors.glow}`,
                }}
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {room.name.charAt(0)}
              </motion.div>
              <div>
                <h2 className="text-3xl font-black text-white mb-1">{room.name}</h2>
                <p className="text-sm text-white/40">{room.department} • {room.currentProcedure?.name}</p>
              </div>
            </div>

            <motion.button
              onClick={onClose}
              className="w-12 h-12 rounded-xl bg-white/[0.08] border border-white/[0.15] flex items-center justify-center"
              whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5 text-white/70" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Team members */}
          <div>
            <h3 className="text-xs font-black tracking-wider text-white/50 mb-4">TYM</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { role: 'Anesteziolog', staff: room.staff?.anesthesiologist, icon: '💉', color: colors.main },
                { role: 'Sestra', staff: room.staff?.nurse, icon: '👩‍⚕️', color: colors.light },
              ].map((member, i) => (
                <motion.div
                  key={i}
                  className="p-4 rounded-xl border"
                  style={{
                    background: `${member.color}15`,
                    borderColor: `${member.color}30`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  whileHover={{ scale: 1.05, borderColor: `${member.color}50` }}
                >
                  <div className="text-2xl mb-2">{member.icon}</div>
                  <div className="text-xs font-bold text-white/40 mb-1">{member.role}</div>
                  <div className="text-sm font-bold text-white">{member.staff?.name || 'Nepřiřazeno'}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Procedure info */}
          {isActive && room.currentProcedure && (
            <div>
              <h3 className="text-xs font-black tracking-wider text-white/50 mb-4">POSTUP OPERACE</h3>
              <div
                className="p-6 rounded-2xl border"
                style={{
                  background: gradient,
                  borderColor: colors.main,
                  boxShadow: `0 8px 30px ${colors.glow}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-white/80 mb-1">{step.title}</div>
                    <div className="text-xs text-white/60">Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-white">{room.currentProcedure.progress}%</div>
                    <div className="text-xs text-white/60">Dokončeno</div>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${room.currentProcedure.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TimelineModule;
