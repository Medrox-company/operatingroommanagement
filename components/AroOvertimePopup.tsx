import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Stethoscope, AlertTriangle } from 'lucide-react';

const C = {
  accent: '#06B6D4',
  cyan: '#06B6D4',
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#10B981',
  textHi: 'rgba(255, 255, 255, 0.95)',
  text: 'rgba(255, 255, 255, 0.80)',
  muted: 'rgba(255, 255, 255, 0.45)',
  border: 'rgba(148, 163, 184, 0.08)',
  bgCard: 'rgba(15, 23, 42, 0.95)',
  bgSurface: 'rgba(15, 23, 42, 0.85)',
};

interface AroOvertimeRoom {
  roomId: string;
  roomName: string;
  estimatedEndTime: Date;
  workingEndTime: Date;
  overtimeMinutes: number;
  enteredAt: number;
}

interface Room {
  id: string;
  name: string;
  staff?: {
    doctor?: { name: string };
    nurse?: { name: string };
  };
}

interface AroOvertimePopupProps {
  isOpen: boolean;
  onClose: () => void;
  overtimeRooms: AroOvertimeRoom[];
  roomsMap: Map<string, Room>;
  currentTime: Date;
}

const AroOvertimePopup: React.FC<AroOvertimePopupProps> = ({
  isOpen,
  onClose,
  overtimeRooms,
  roomsMap,
  currentTime,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateRemainingTime = (endTime: Date) => {
    const diff = endTime.getTime() - currentTime.getTime();
    if (diff <= 0) return { status: 'ended', text: 'Skončeno' };
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return { status: 'overtime', text: `+${hours}h ${mins}m` };
    }
    return { status: 'overtime', text: `+${mins}m` };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${C.bgCard}, rgba(30, 41, 59, 0.85))`,
              border: `1px solid ${C.border}`,
              boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-8 py-6 border-b"
              style={{ borderColor: C.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.red}20`, border: `2px solid ${C.red}40` }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: C.red }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: C.textHi }}>
                    ARO Přesah - Podrobnosti
                  </h2>
                  <p className="text-xs uppercase tracking-widest mt-1" style={{ color: C.muted }}>
                    {overtimeRooms.length} sálů překročilo pracovní dobu
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: C.muted }} />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                {overtimeRooms.map((room, index) => {
                  const fullRoom = roomsMap.get(room.roomId);
                  const remaining = calculateRemainingTime(room.estimatedEndTime);
                  const position = index + 1;

                  return (
                    <motion.div
                      key={room.roomId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl p-5 backdrop-blur-sm border transition-all hover:border-opacity-100"
                      style={{
                        background: `linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0.02) 100%)`,
                        border: `1px solid ${C.cyan}30`,
                      }}
                    >
                      {/* Position Badge + Room Name */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.accent} 100%)`,
                              }}
                            >
                              {position}
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: C.textHi }}>
                              {room.roomName}
                            </h3>
                          </div>
                          <p className="text-xs uppercase tracking-widest ml-8" style={{ color: C.muted }}>
                            Vstupil v pořadí přesahu
                          </p>
                        </div>

                        {/* Remaining Time Badge */}
                        <motion.div
                          className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{
                            background:
                              remaining.status === 'ended'
                                ? `${C.red}20`
                                : `${C.yellow}20`,
                            color: remaining.status === 'ended' ? C.red : C.yellow,
                            border: `1px solid ${remaining.status === 'ended' ? `${C.red}40` : `${C.yellow}40`}`,
                          }}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {remaining.text}
                        </motion.div>
                      </div>

                      {/* Timeline Info */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Start Info */}
                        <div className="rounded-lg p-3 backdrop-blur-sm" style={{ background: `${C.cyan}10` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4" style={{ color: C.cyan }} />
                            <p className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                              Pracovní konec
                            </p>
                          </div>
                          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
                            {formatTime(room.workingEndTime)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: C.muted }}>
                            Stanoveně
                          </p>
                        </div>

                        {/* End Info */}
                        <div
                          className="rounded-lg p-3 backdrop-blur-sm"
                          style={{ background: `${C.red}10` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4" style={{ color: C.red }} />
                            <p className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                              Odhadovaný konec
                            </p>
                          </div>
                          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
                            {formatTime(room.estimatedEndTime)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: C.muted }}>
                            Včetně přesahu
                          </p>
                        </div>
                      </div>

                      {/* Overtime Duration */}
                      <div className="mb-4 p-3 rounded-lg" style={{ background: `${C.yellow}15` }}>
                        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: C.muted }}>
                          Délka přesahu
                        </p>
                        <p className="text-base font-bold" style={{ color: C.yellow }}>
                          +{formatDuration(room.overtimeMinutes)}
                        </p>
                      </div>

                      {/* Staff Info */}
                      {fullRoom && (
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t" style={{ borderColor: C.border }}>
                          {/* Doctor */}
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${C.green}20`, border: `1px solid ${C.green}30` }}
                            >
                              <Stethoscope className="w-4 h-4" style={{ color: C.green }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                                Anesteziolog
                              </p>
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: C.textHi }}
                              >
                                {fullRoom.staff?.doctor?.name || 'Neuvedeno'}
                              </p>
                            </div>
                          </div>

                          {/* Nurse */}
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${C.cyan}20`, border: `1px solid ${C.cyan}30` }}
                            >
                              <User className="w-4 h-4" style={{ color: C.cyan }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                                Sestra
                              </p>
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: C.textHi }}
                              >
                                {fullRoom.staff?.nurse?.name || 'Neuvedeno'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {overtimeRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p style={{ color: C.muted }}>Žádné sály v přesahu</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AroOvertimePopup;
