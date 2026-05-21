import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Stethoscope, User, AlertTriangle, Timer } from 'lucide-react';
import { OperatingRoom } from '../types';

const C = {
  accent: '#06B6D4',
  cyan: '#06B6D4',
  green: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
  textHi: 'rgba(255,255,255,0.95)',
  text: 'rgba(255,255,255,0.78)',
  muted: 'rgba(255,255,255,0.45)',
  border: 'rgba(148,163,184,0.12)',
  bgCard: 'rgba(8,15,30,0.98)',
  bgSurface: 'rgba(15,26,48,0.95)',
};

interface AroOvertimeRoom {
  roomId: string;
  roomName: string;
  estimatedEndTime: Date;
  workingEndTime: Date;
  overtimeMinutes: number;
  enteredAt: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  overtimeRooms: AroOvertimeRoom[];
  roomsMap: Map<string, OperatingRoom>;
  currentTime: Date;
}

const fmt = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

const fmtDur = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const progress = (workEnd: Date, estEnd: Date, now: Date) => {
  const total = estEnd.getTime() - workEnd.getTime();
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, (now.getTime() - workEnd.getTime()) / total));
};

const posColor = (i: number) => [C.red, C.orange, C.yellow, C.cyan][Math.min(i, 3)];

const AroOvertimePopup: React.FC<Props> = ({ isOpen, onClose, overtimeRooms, roomsMap, currentTime }) => {
  const total = overtimeRooms.reduce((s, r) => s + r.overtimeMinutes, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          />

          {/* Centered container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 400 }}
              className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
                maxHeight: '80vh',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.red}15, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${C.red}20`, border: `1.5px solid ${C.red}40` }}
                    animate={{ boxShadow: [`0 0 8px ${C.red}20`, `0 0 16px ${C.red}40`, `0 0 8px ${C.red}20`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-5 h-5" style={{ color: C.red }} />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: C.textHi }}>ARO Přesah</h2>
                    <p className="text-xs" style={{ color: C.muted }}>
                      {overtimeRooms.length} {overtimeRooms.length === 1 ? 'sál' : 'sálů'} &bull; +{fmtDur(total)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ color: C.muted }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                {overtimeRooms.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: C.green }} />
                    <p className="font-medium" style={{ color: C.text }}>Bez přesahu</p>
                  </div>
                ) : (
                  overtimeRooms.map((room, i) => {
                    const full = roomsMap.get(room.roomId);
                    const col = posColor(i);
                    const prog = progress(room.workingEndTime, room.estimatedEndTime, currentTime);
                    const remaining = Math.max(0, Math.round((room.estimatedEndTime.getTime() - currentTime.getTime()) / 60000));

                    return (
                      <motion.div
                        key={room.roomId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl overflow-hidden"
                        style={{ background: C.bgSurface, border: `1px solid ${col}25` }}
                      >
                        {/* Colored top bar */}
                        <div className="h-1" style={{ background: `linear-gradient(90deg, ${col}, ${col}60)` }} />

                        <div className="p-4">
                          {/* Row 1: Position, Name, Countdown */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                                style={{ background: `linear-gradient(135deg, ${col}, ${col}90)`, color: '#fff' }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-bold text-sm" style={{ color: C.textHi }}>{room.roomName}</p>
                                {full?.currentProcedure?.name && (
                                  <p className="text-[10px] truncate max-w-[140px]" style={{ color: C.muted }}>
                                    {full.currentProcedure.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <motion.div
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                              style={{ background: `${col}20`, color: col }}
                              animate={remaining < 30 ? { scale: [1, 1.05, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Timer className="w-3 h-3" />
                              {remaining > 0 ? fmtDur(remaining) : 'Hotovo'}
                            </motion.div>
                          </div>

                          {/* Row 2: Times */}
                          <div className="flex gap-2 text-center mb-3">
                            <div className="flex-1 rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: C.muted }}>Směna</p>
                              <p className="text-sm font-bold tabular-nums" style={{ color: C.cyan }}>{fmt(room.workingEndTime)}</p>
                            </div>
                            <div className="flex-1 rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: C.muted }}>Odhad</p>
                              <p className="text-sm font-bold tabular-nums" style={{ color: C.red }}>{fmt(room.estimatedEndTime)}</p>
                            </div>
                            <div className="flex-1 rounded-lg py-2" style={{ background: `${C.yellow}10` }}>
                              <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: C.muted }}>Přesah</p>
                              <p className="text-sm font-bold" style={{ color: C.yellow }}>+{fmtDur(room.overtimeMinutes)}</p>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${col}15` }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: col }}
                                initial={{ width: 0 }}
                                animate={{ width: `${prog * 100}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          </div>

                          {/* Staff */}
                          {full && (
                            <div className="flex gap-2">
                              <div className="flex items-center gap-2 flex-1 rounded-lg px-2.5 py-2" style={{ background: `${C.green}08` }}>
                                <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.green }} />
                                <span className="text-xs truncate" style={{ color: C.text }}>
                                  {full.staff?.anesthesiologist?.name || full.staff?.doctor?.name || '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-1 rounded-lg px-2.5 py-2" style={{ background: `${C.cyan}08` }}>
                                <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.cyan }} />
                                <span className="text-xs truncate" style={{ color: C.text }}>
                                  {full.staff?.nurse?.name || '—'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AroOvertimePopup;
