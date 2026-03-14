import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, AlertCircle, ChevronDown } from 'lucide-react';

const HOURS_COUNT = 12;
const ROOM_LABEL_WIDTH = 280;

interface TimelineModuleProps {
  rooms: OperatingRoom[];
  onRoomClick?: (room: OperatingRoom) => void;
}

interface RoomRowColors {
  bg: string;
  border: string;
  text: string;
  light: string;
}

const getColorsByStatus = (stepIndex: number): RoomRowColors => {
  const colors: { [key: number]: RoomRowColors } = {
    0: {
      bg: '#1E40AF',
      border: '#3B82F6',
      text: '#E0E7FF',
      light: '#DBEAFE',
    },
    1: {
      bg: '#7C2D12',
      border: '#EA580C',
      text: '#FED7AA',
      light: '#FFEDD5',
    },
    2: {
      bg: '#5B21B6',
      border: '#A855F7',
      text: '#E9D5FF',
      light: '#F3E8FF',
    },
    3: {
      bg: '#1F2937',
      border: '#6B7280',
      text: '#F3F4F6',
      light: '#D1D5DB',
    },
    4: {
      bg: '#064E3B',
      border: '#10B981',
      text: '#D1FAE5',
      light: '#DCFCE7',
    },
    5: {
      bg: '#1E3A8A',
      border: '#60A5FA',
      text: '#DBEAFE',
      light: '#BFDBFE',
    },
    6: {
      bg: '#166534',
      border: '#22C55E',
      text: '#DCFCE7',
      light: '#BBFBEE',
    },
  };
  return colors[stepIndex] || colors[0];
};

const TIME_MARKERS = Array.from({ length: HOURS_COUNT }, (_, i) => {
  const hour = (7 + i) % 24;
  return hour;
});

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => {
  const mins = getMinutesFrom7(new Date(date));
  return (mins / (HOURS_COUNT * 60)) * 100;
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms, onRoomClick }) => {
  const [now, setNow] = useState(new Date());
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = useMemo(() => getTimePercent(now), [now]);

  // Seřadit místnosti - nejdřív emergencies, pak active, pak ostatní
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      if (a.currentStepIndex < 6 && b.currentStepIndex >= 6) return -1;
      if (a.currentStepIndex >= 6 && b.currentStepIndex < 6) return 1;
      return 0;
    });
  }, [rooms]);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Stats */}
      <motion.div 
        className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-700 px-6 py-4 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">TIMELINE - OPERAČNÍ SÁLY</h1>
        </div>
        <div className="flex items-center gap-8 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-300">{sortedRooms.filter(r => r.currentStepIndex < 6).length} V PROVOZU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-slate-300">{sortedRooms.filter(r => r.currentStepIndex === 1).length} PŘÍPRAVA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-300">{sortedRooms.filter(r => r.currentStepIndex >= 6).length} VOLNÉ</span>
          </div>
          {sortedRooms.some(r => r.isEmergency) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400">{sortedRooms.filter(r => r.isEmergency).length} EMERGENCY</span>
            </div>
          )}
          <div className="text-cyan-400 font-mono text-lg ml-4">{now.toLocaleTimeString('cs-CZ')}</div>
        </div>
      </motion.div>

      {/* Timeline Container */}
      <div className="flex-1 overflow-auto bg-slate-950">
        <div className="md:pl-0 w-full">
          {/* Timeline Header with Hours */}
          <motion.div 
            className="sticky top-0 z-40 bg-gradient-to-b from-slate-900 to-slate-900/95 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex border-b border-slate-700">
              <div className="flex-shrink-0" style={{ width: `${ROOM_LABEL_WIDTH}px` }}>
                <div className="px-4 py-3 text-sm font-bold text-slate-300 uppercase tracking-wider">SÁLY</div>
              </div>
              <div className="flex-1 flex relative">
                {TIME_MARKERS.map((hour, i) => {
                  const widthPct = 100 / HOURS_COUNT;
                  return (
                    <div
                      key={`hour-${i}`}
                      className="flex-1 border-r border-slate-700/50 px-2 py-3 text-center"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-semibold text-slate-400">{String(hour).padStart(2, '0')}:00</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Rooms List */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.05 }}>
            {sortedRooms.map((room, idx) => {
              const colors = getColorsByStatus(room.currentStepIndex);
              const stepName = WORKFLOW_STEPS[room.currentStepIndex]?.name || 'NEZNÁMÁ FÁZE';

              return (
                <motion.div
                  key={room.id}
                  className="flex border-b border-slate-800 hover:bg-slate-900/50 transition-colors group relative h-12"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {/* Room Label */}
                  <div
                    className="flex-shrink-0 flex items-center px-4 border-r border-slate-700 cursor-pointer hover:bg-slate-800/50"
                    style={{ width: `${ROOM_LABEL_WIDTH}px` }}
                    onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-white truncate">{room.name}</div>
                        {room.isEmergency && (
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          </motion.div>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{room.department}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" />
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 relative px-2 flex items-center bg-gradient-to-r from-slate-900/20 to-transparent">
                    {/* Hour Grid Lines */}
                    {TIME_MARKERS.map((_, i) => {
                      const widthPct = 100 / HOURS_COUNT;
                      const isNight = TIME_MARKERS[i] >= 19 || TIME_MARKERS[i] < 7;
                      return (
                        <div
                          key={`grid-${i}`}
                          className={`absolute top-0 h-full w-px ${isNight ? 'bg-white/5' : 'bg-white/10'}`}
                          style={{ left: `${i * widthPct}%` }}
                        />
                      );
                    })}

                    {/* Current Time Indicator Line */}
                    {idx === 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-gradient-to-b from-cyan-400 to-cyan-400/20 z-50"
                        style={{ left: `${nowPercent}%` }}
                      >
                        <motion.div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400 border-2 border-cyan-300"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    )}

                    {/* Operation Box */}
                    {room.currentStepIndex < 6 && room.currentProcedure && (
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 rounded-lg border-2 px-3 py-1 whitespace-nowrap shadow-lg z-30 cursor-pointer"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                          left: '8%',
                          width: 'fit-content',
                          minWidth: '250px',
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 + 0.1, duration: 0.4 }}
                        whileHover={{ scale: 1.05, boxShadow: '0 12px 35px rgba(0,0,0,0.7)' }}
                        onClick={() => onRoomClick?.(room)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider">{stepName}</span>
                          <span className="text-[11px] font-semibold opacity-90">{room.currentProcedure.name}</span>
                          <div className="text-[11px] font-black ml-1 px-2 py-0.5 rounded bg-black/30">
                            {room.currentProcedure.progress}%
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Ready State */}
                    {room.currentStepIndex >= 6 && (
                      <motion.div
                        className="absolute left-4 top-1/2 -translate-y-1/2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/40">
                          PŘIPRAVEN
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
