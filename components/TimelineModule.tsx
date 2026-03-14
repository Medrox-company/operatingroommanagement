import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, AlertTriangle, Stethoscope, Activity, Shield, X, AlertCircle } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 200;
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

const STEP_COLORS: Record<number, { bg: string; text: string; border: string; light: string }> = {
  0: { bg: '#A78BFA', text: '#FFFFFF', border: '#A78BFA', light: '#E9D5FF' },
  1: { bg: '#2DD4BF', text: '#FFFFFF', border: '#2DD4BF', light: '#CCFBF1' },
  2: { bg: '#FF3B30', text: '#FFFFFF', border: '#FF3B30', light: '#FEE2E2' },
  3: { bg: '#FBBF24', text: '#000000', border: '#FBBF24', light: '#FEF3C7' },
  4: { bg: '#818CF8', text: '#FFFFFF', border: '#818CF8', light: '#E0E7FF' },
  5: { bg: '#5B65DC', text: '#FFFFFF', border: '#5B65DC', light: '#EEF2FF' },
  6: { bg: '#34C759', text: '#FFFFFF', border: '#34C759', light: '#DCFCE7' },
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
      transition={{ duration: 0.2 }}
    >
      <motion.div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.98) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-2">{room.name}</h2>
            <p className="text-sm text-white/60">{room.department} • Fáze: {step.title}</p>
          </div>
          <motion.button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center border hover:bg-white/10"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4 text-white/50" />
          </motion.button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Current Status */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: `${colors.bg}15`, borderColor: colors.border }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                <step.Icon className="w-6 h-6" style={{ color: colors.text }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-xs text-white/50">{step.status}</p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Procedura', value: room.currentProcedure?.name || '--' },
              { label: 'Lékař', value: room.staff.doctor?.name || '--' },
              { label: 'Sestra', value: room.staff.nurse?.name || '--' },
              { label: 'Anesteziolog', value: room.staff.anesthesiologist?.name || '--' },
            ].map((item, idx) => (
              <div key={item.label} className="rounded-lg p-3 bg-white/[0.03] border border-white/10">
                <p className="text-[11px] font-bold tracking-wider uppercase text-white/40 mb-1">{item.label}</p>
                <p className="text-sm text-white/80 truncate">{item.value}</p>
              </div>
            ))}
          </div>
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
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        className="relative z-10 flex items-center justify-between gap-4 px-6 md:pl-32 md:pr-6 py-6 flex-shrink-0 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 opacity-60">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-[9px] font-black text-cyan-400 tracking-[0.3em] uppercase hidden lg:inline">TIMELINE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Operační Sály</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {[
            { label: 'V Provozu', value: stats.operations, color: '#34C759' },
            { label: 'Úklid', value: stats.cleaning, color: '#FBBF24' },
            { label: 'Volné', value: stats.free, color: '#00D8C1' },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/[0.02]"
              style={{ borderColor: `${s.color}30` }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-bold">{s.value}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-60 hidden sm:inline">{s.label}</span>
            </motion.div>
          ))}
          {stats.emergency > 0 && (
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-500/10"
              style={{ borderColor: 'rgba(239,68,68,0.3)' }}
              animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 12px rgba(239,68,68,0.4)', '0 0 0 rgba(239,68,68,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">{stats.emergency} EMERGENCY</span>
            </motion.div>
          )}
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-sm font-mono font-bold tracking-wider text-white">{timeStr}</span>
          </div>
        </div>
      </motion.header>

      {/* Table Container */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:px-6 md:pl-32 pb-4 overflow-hidden">
        <motion.div 
          className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {/* Time Header Row */}
          <div className="flex flex-shrink-0 border-b border-white/[0.08] bg-black/20 backdrop-blur-sm h-14">
            <div className="flex-shrink-0 flex items-center px-4 border-r border-white/[0.08] bg-black/40" style={{ width: ROOM_LABEL_WIDTH }}>
              <Stethoscope className="w-4 h-4 text-cyan-400/40 mr-2" />
              <span className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">Sály</span>
            </div>
            <div className="flex-1 flex items-center relative px-2 overflow-hidden">
              {TIME_MARKERS.map((hour, i) => {
                const widthPct = 100 / HOURS_COUNT;
                const isNight = hour >= 19 || hour < 7;
                return (
                  <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}>
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`} />
                    <motion.span 
                      className={`ml-2 text-[8px] font-mono font-semibold ${isNight ? 'text-white/[0.15]' : 'text-white/30'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                    >
                      {hourLabel(hour)}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Time Indicator Line */}
          <div className="absolute top-14 bottom-0 left-0 right-0 pointer-events-none z-20">
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 via-cyan-400 to-cyan-400/20"
              style={{ 
                left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent} / 100)`,
              }}
            >
              <motion.div 
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400 border-2 border-cyan-300"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto hide-scrollbar">
            {sortedRooms.map((room, idx) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
              const stepName = STEP_NAMES[stepIndex];

              return (
                <motion.div
                  key={room.id}
                  className="flex flex-shrink-0 border-b border-white/[0.05] h-14 group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedRoom(room)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Room Label */}
                  <div className="flex-shrink-0 flex items-center px-4 border-r border-white/[0.08] bg-black/20" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{room.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{room.department}</p>
                    </div>
                    {room.isEmergency && (
                      <motion.div 
                        className="ml-2 flex-shrink-0"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </motion.div>
                    )}
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 flex items-center relative px-2 overflow-hidden">
                    {/* Hour Dividers */}
                    {TIME_MARKERS.map((hour, i) => {
                      const widthPct = 100 / HOURS_COUNT;
                      const isNight = hour >= 19 || hour < 7;
                      return (
                        <div key={`divider-${i}`} className="absolute top-0 h-full" style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}>
                          <div className={`w-px h-full ${isNight ? 'bg-white/[0.01]' : 'bg-white/[0.02]'}`} />
                        </div>
                      );
                    })}

                    {/* Operation Bar */}
                    {room.currentStepIndex < 6 && room.currentProcedure && (
                      <motion.div
                        className="absolute h-full rounded-lg border-2 flex items-center justify-between px-3 font-bold text-sm shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                          left: '0%',
                          width: '35%',
                          minWidth: '180px',
                          top: '0',
                          zIndex: 30,
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 + 0.2, duration: 0.4 }}
                        whileHover={{ scale: 1.03, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-black uppercase whitespace-nowrap flex-shrink-0 tracking-wider">{stepName}</span>
                          <span className="text-xs opacity-90 truncate font-semibold">{room.currentProcedure.name}</span>
                        </div>
                        <div className="flex-shrink-0 ml-3 flex items-center">
                          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs" style={{ borderColor: colors.text, color: colors.text }}>
                            {room.currentProcedure.progress}%
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Free/Ready State */}
                    {room.currentStepIndex >= 6 && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">PŘIPRAVEN</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TimelineModule;
