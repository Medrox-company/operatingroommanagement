import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, AlertTriangle, Stethoscope, Activity, Shield, X, AlertCircle, ChevronRight } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 220;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => {
  const mins = getMinutesFrom7(date);
  const percent = (mins / (HOURS_COUNT * 60)) * 100;
  return percent;
};
const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

const STEP_COLORS: Record<number, { bg: string; text: string; border: string; light: string; glow: string }> = {
  0: { bg: '#8B5CF6', text: '#FFFFFF', border: '#7C3AED', light: '#EDE9FE', glow: 'rgba(139, 92, 246, 0.3)' },
  1: { bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2', light: '#CFFAFE', glow: 'rgba(6, 182, 212, 0.3)' },
  2: { bg: '#EF4444', text: '#FFFFFF', border: '#DC2626', light: '#FEE2E2', glow: 'rgba(239, 68, 68, 0.3)' },
  3: { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706', light: '#FEF3C7', glow: 'rgba(245, 158, 11, 0.3)' },
  4: { bg: '#6366F1', text: '#FFFFFF', border: '#4F46E5', light: '#E0E7FF', glow: 'rgba(99, 102, 241, 0.3)' },
  5: { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB', light: '#DBEAFE', glow: 'rgba(59, 130, 246, 0.3)' },
  6: { bg: '#10B981', text: '#FFFFFF', border: '#059669', light: '#D1FAE5', glow: 'rgba(16, 185, 129, 0.3)' },
};

const STEP_NAMES: Record<number, string> = {
  0: 'Příjezd',
  1: 'Anestézia',
  2: 'Chirurgie',
  3: 'Ukončení',
  4: 'Monitoring',
  5: 'Úklid',
  6: 'Volno',
};

const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void }> = ({ room, onClose }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(20,30,48,0.98) 0%, rgba(15,23,42,0.99) 100%)',
          borderColor: colors.border + '40',
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 10, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="px-8 py-7 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.bg }} />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">{STEP_NAMES[stepIndex]}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-1">{room.name}</h2>
            <p className="text-sm text-white/40">{room.department}</p>
          </div>
          <motion.button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center border hover:bg-white/5 text-white/40 hover:text-white/60"
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          {/* Current Step Badge */}
          <motion.div 
            className="rounded-xl p-5 border" 
            style={{ 
              backgroundColor: colors.bg + '12', 
              borderColor: colors.border + '30'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-14 h-14 rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: colors.bg }}
                animate={{ boxShadow: [`0 0 0 0 ${colors.glow}`, `0 0 20px 5px ${colors.glow}`, '0 0 0 0 rgba(0,0,0,0)'] }}
                transition={{ duration: 2, repeat: Infinity, times: [0, 0.5, 1] }}
              >
                <step.Icon className="w-7 h-7" style={{ color: colors.text }} />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{step.status}</p>
              </div>
            </div>
          </motion.div>

          {/* Info Grid */}
          <motion.div 
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {[
              { label: 'Procedura', value: room.currentProcedure?.name || '--', icon: '🔬' },
              { label: 'Lékař', value: room.staff.doctor?.name || '--', icon: '👨‍⚕️' },
              { label: 'Sestra', value: room.staff.nurse?.name || '--', icon: '👩‍⚕️' },
              { label: 'Anesteziolog', value: room.staff.anesthesiologist?.name || '--', icon: '💉' },
            ].map((item, idx) => (
              <motion.div 
                key={item.label} 
                className="rounded-lg p-4 border bg-white/[0.02]"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
              >
                <p className="text-[11px] font-bold tracking-wider uppercase text-white/35 mb-2">{item.label}</p>
                <p className="text-sm text-white/80 truncate font-medium">{item.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress if available */}
          {room.currentProcedure && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/40">Postup procedury</span>
                <span className="text-sm font-black" style={{ color: colors.bg }}>{room.currentProcedure.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden border border-white/[0.05]">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors.bg }}
                  initial={{ width: 0 }}
                  animate={{ width: `${room.currentProcedure.progress}%` }}
                  transition={{ delay: 0.25, duration: 0.8 }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

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
  const currentSec = currentTime.getSeconds();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;

  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, emergency };
  }, [rooms]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      const aActive = a.currentStepIndex < 6;
      const bActive = b.currentStepIndex < 6;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [rooms]);

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative bg-gradient-to-b from-black via-slate-950 to-black">
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </AnimatePresence>

      {/* Header with Stats */}
      <motion.header 
        className="relative z-10 px-6 md:px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-white/[0.01] to-transparent"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between gap-4 mb-5">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-400/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Operační Sály</h1>
              <p className="text-xs text-white/40 font-medium tracking-wide">Přehled provozu</p>
            </div>
          </motion.div>

          {/* Current Time */}
          <motion.div 
            className="flex items-center gap-3 px-5 py-3 rounded-xl border bg-white/[0.03]"
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono font-bold tracking-wider text-white">{timeStr}</span>
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-5 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { label: 'V Provozu', value: stats.operations, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
            { label: 'Anestézia', value: stats.cleaning, color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.1)' },
            { label: 'Volné', value: stats.free, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              className="rounded-lg px-4 py-3 border flex items-center gap-3"
              style={{ 
                backgroundColor: stat.bgColor,
                borderColor: stat.color + '30'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">{stat.label}</span>
              </div>
              <span className="text-lg font-black text-white">{stat.value}</span>
            </motion.div>
          ))}
          
          {/* Emergency Alert */}
          {stats.emergency > 0 && (
            <motion.div
              className="rounded-lg px-4 py-3 border col-span-2 md:col-span-1 flex items-center gap-3 bg-red-500/10"
              style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
              animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 15px rgba(239,68,68,0.5)', '0 0 0 rgba(239,68,68,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </motion.div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">EMERGENCY</p>
                <p className="text-lg font-black text-red-400">{stats.emergency}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.header>

      {/* Timeline Container */}
      <div className="flex-1 min-h-0 flex flex-col relative px-4 md:px-6 pb-4 overflow-hidden">
        <motion.div 
          className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.03] to-white/[0.01]"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {/* Time Header */}
          <div className="flex flex-shrink-0 border-b bg-gradient-to-r from-white/[0.03] to-transparent h-16" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
            <div 
              className="flex-shrink-0 flex items-center px-6 border-r bg-white/[0.01]"
              style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Stethoscope className="w-4 h-4 text-cyan-400/50 mr-3" />
              <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white/30">Sály</span>
            </div>
            <div className="flex-1 flex items-center relative px-2 overflow-hidden">
              {TIME_MARKERS.map((hour, i) => {
                const widthPct = 100 / HOURS_COUNT;
                const isNight = hour >= 19 || hour < 7;
                return (
                  <motion.div 
                    key={`h-${hour}-${i}`} 
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                  >
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.015]' : 'bg-white/[0.03]'}`} />
                    <span className={`ml-2 text-[8px] font-mono font-semibold tracking-tight ${isNight ? 'text-white/[0.12]' : 'text-white/25'}`}>
                      {hourLabel(hour)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Current Time Indicator */}
          <div className="absolute top-16 bottom-0 left-0 right-0 pointer-events-none z-20">
            <motion.div 
              className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-cyan-500"
              style={{ 
                left: `calc(${ROOM_LABEL_WIDTH}px + (calc(100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100}))`,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <motion.div 
                className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-400 border-2 border-cyan-300 shadow-lg"
                animate={{ scale: [1, 1.3, 1], boxShadow: ['0 0 0 rgba(34,211,238,0.5)', '0 0 15px rgba(34,211,238,0.8)', '0 0 0 rgba(34,211,238,0.5)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto hide-scrollbar">
            {sortedRooms.length === 0 ? (
              <motion.div 
                className="flex-1 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center">
                  <Stethoscope className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm font-medium">Žádné operační sály</p>
                </div>
              </motion.div>
            ) : (
              sortedRooms.map((room, idx) => {
                const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
                const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
                const stepName = STEP_NAMES[stepIndex];

                return (
                  <motion.div
                    key={room.id}
                    className="flex flex-shrink-0 border-b h-16 group hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                    onClick={() => setSelectedRoom(room)}
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.4 }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                  >
                    {/* Room Label */}
                    <motion.div 
                      className="flex-shrink-0 flex items-center px-6 border-r bg-white/[0.005] gap-3"
                      style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255, 255, 255, 0.04)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.06 + 0.1 }}
                    >
                      {room.isEmergency && (
                        <motion.div 
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        </motion.div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{room.name}</p>
                        <p className="text-[10px] text-white/35 truncate">{room.department}</p>
                      </div>
                    </motion.div>

                    {/* Timeline Area */}
                    <div className="flex-1 flex items-center relative px-2 group">
                      {/* Hour Dividers */}
                      {TIME_MARKERS.map((hour, i) => {
                        const widthPct = 100 / HOURS_COUNT;
                        const isNight = hour >= 19 || hour < 7;
                        return (
                          <div key={`divider-${i}`} className="absolute top-0 h-full" style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}>
                            <div className={`w-px h-full ${isNight ? 'bg-white/[0.007]' : 'bg-white/[0.015]'}`} />
                          </div>
                        );
                      })}

                      {/* Operation Status Bar */}
                      {room.currentStepIndex < WORKFLOW_STEPS.length && (
                        <motion.div
                          className="rounded-lg px-5 py-2.5 flex items-center gap-2 whitespace-nowrap shadow-lg cursor-pointer z-30 ml-2 flex-shrink-0 border-2 backdrop-blur-sm"
                          style={{
                            backgroundColor: colors.bg + 'E6',
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                          initial={{ opacity: 0, scale: 0.85, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 + 0.15, duration: 0.35, ease: 'backOut' }}
                          whileHover={{ scale: 1.08, boxShadow: `0 20px 40px ${colors.glow}` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoom(room);
                          }}
                        >
                          <motion.div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: colors.text }}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          <span className="text-[11px] font-black uppercase tracking-wide">{stepName}</span>
                          {room.currentProcedure && (
                            <>
                              <span className="text-[10px] opacity-90 font-semibold truncate">{room.currentProcedure.name}</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/20 ml-1 flex-shrink-0">{room.currentProcedure.progress}%</span>
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* Free State */}
                      {room.currentStepIndex >= 6 && (
                        <motion.div 
                          className="absolute left-3 top-1/2 transform -translate-y-1/2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.06 + 0.15 }}
                        >
                          <motion.div
                            className="px-4 py-1.5 rounded-lg text-xs font-bold border bg-green-500/15 text-green-400"
                            style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}
                            animate={{ boxShadow: ['0 0 0 rgba(16,185,129,0.2)', '0 0 10px rgba(16,185,129,0.3)', '0 0 0 rgba(16,185,129,0.2)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            PŘIPRAVEN
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TimelineModule;
