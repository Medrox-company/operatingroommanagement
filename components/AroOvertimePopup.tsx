import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Stethoscope, User, AlertTriangle } from 'lucide-react';
import { OperatingRoom } from '../types';

const C = {
  blue: '#3B82F6',
  cyan: '#06B6D4',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  textHi: 'rgba(255,255,255,0.95)',
  text: 'rgba(255,255,255,0.78)',
  muted: 'rgba(255,255,255,0.45)',
  border: 'rgba(148,163,184,0.12)',
  bgCard: 'rgba(8,15,30,0.98)',
  bgSurface: 'rgba(15,26,48,0.95)',
};

// Color palette for rooms
const ROOM_COLORS = [C.red, C.yellow, C.cyan, C.blue, C.green];
const getColor = (i: number) => ROOM_COLORS[i % ROOM_COLORS.length];

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

const AroOvertimePopup: React.FC<Props> = ({ isOpen, onClose, overtimeRooms, roomsMap, currentTime }) => {
  // Calculate timeline bounds
  const now = currentTime.getTime();
  const workEndTime = overtimeRooms[0]?.workingEndTime?.getTime() || now;
  const maxEndTime = Math.max(...overtimeRooms.map(r => r.estimatedEndTime.getTime()), now + 60 * 60 * 1000);
  const timelineStart = Math.min(workEndTime, now);
  const timelineEnd = maxEndTime;
  const timelineRange = timelineEnd - timelineStart;
  
  // Calculate position on timeline (0-100%)
  const getPosition = (time: number) => {
    if (timelineRange <= 0) return 50;
    return Math.max(0, Math.min(100, ((time - timelineStart) / timelineRange) * 100));
  };
  
  const nowPosition = getPosition(now);
  const workEndPosition = getPosition(workEndTime);
  
  // Generate time markers
  const markers: { time: Date; position: number }[] = [];
  const startHour = new Date(timelineStart);
  startHour.setMinutes(0, 0, 0);
  for (let t = startHour.getTime(); t <= timelineEnd + 30 * 60 * 1000; t += 30 * 60 * 1000) {
    if (t >= timelineStart && t <= timelineEnd) {
      markers.push({ time: new Date(t), position: getPosition(t) });
    }
  }

  const totalOvertime = overtimeRooms.reduce((s, r) => s + r.overtimeMinutes, 0);

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
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          />

          {/* Centered container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                boxShadow: `0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
                maxHeight: '85vh',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
                style={{ 
                  borderBottom: `1px solid ${C.border}`, 
                  background: `linear-gradient(135deg, ${C.red}12 0%, transparent 60%)` 
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${C.red}15`, border: `1.5px solid ${C.red}35` }}
                    animate={{ boxShadow: [`0 0 12px ${C.red}15`, `0 0 20px ${C.red}30`, `0 0 12px ${C.red}15`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: C.red }} />
                  </motion.div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold" style={{ color: C.textHi }}>ARO Přesah</h2>
                    <p className="text-[10px] sm:text-xs" style={{ color: C.muted }}>
                      {overtimeRooms.length} {overtimeRooms.length === 1 ? 'sál' : 'sálů'} &bull; celkem +{fmtDur(totalOvertime)}
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
              <div className="p-4 sm:p-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 72px)' }}>
                {overtimeRooms.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: C.green }} />
                    <p className="font-medium" style={{ color: C.text }}>Bez přesahu</p>
                  </div>
                ) : (
                  <>
                    {/* Timeline visualization */}
                    <div className="mb-5 sm:mb-6">
                      <p className="text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: C.muted }}>
                        Časová osa
                      </p>
                      
                      {/* Timeline container */}
                      <div 
                        className="relative h-28 sm:h-32 rounded-xl p-3 sm:p-4"
                        style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}
                      >
                        {/* Time markers */}
                        <div className="absolute inset-x-4 top-3 flex justify-between text-[9px] sm:text-[10px]" style={{ color: C.muted }}>
                          {markers.slice(0, 5).map((m, i) => (
                            <span key={i} style={{ position: 'absolute', left: `${m.position}%`, transform: 'translateX(-50%)' }}>
                              {fmt(m.time)}
                            </span>
                          ))}
                        </div>
                        
                        {/* Timeline track */}
                        <div className="absolute inset-x-4 top-10 sm:top-11">
                          {/* Background track */}
                          <div className="h-2 rounded-full" style={{ background: `${C.border}` }} />
                          
                          {/* Working hours end marker */}
                          <div 
                            className="absolute top-0 w-0.5 h-2 rounded-full"
                            style={{ 
                              left: `${workEndPosition}%`, 
                              background: C.cyan,
                              boxShadow: `0 0 8px ${C.cyan}`
                            }}
                          />
                          
                          {/* Now indicator line */}
                          <motion.div 
                            className="absolute w-0.5 rounded-full"
                            style={{ 
                              left: `${nowPosition}%`, 
                              top: -4,
                              height: 16,
                              background: `linear-gradient(to bottom, ${C.green}, ${C.green}60)`,
                              boxShadow: `0 0 10px ${C.green}60`
                            }}
                            animate={{ opacity: [1, 0.6, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                        
                        {/* Room end points on timeline */}
                        <div className="absolute inset-x-4 top-16 sm:top-[72px]">
                          {overtimeRooms.map((room, i) => {
                            const pos = getPosition(room.estimatedEndTime.getTime());
                            const col = getColor(i);
                            const full = roomsMap.get(room.roomId);
                            
                            return (
                              <motion.div
                                key={room.roomId}
                                className="absolute flex flex-col items-center"
                                style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                              >
                                {/* Connector line */}
                                <div 
                                  className="w-px h-3 sm:h-4 mb-1"
                                  style={{ background: `linear-gradient(to bottom, ${col}, transparent)` }}
                                />
                                
                                {/* Room badge */}
                                <motion.div
                                  className="relative group cursor-pointer"
                                  whileHover={{ scale: 1.15 }}
                                >
                                  <div 
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg"
                                    style={{ 
                                      background: `linear-gradient(135deg, ${col}, ${col}cc)`,
                                      border: `2px solid ${col}`,
                                      boxShadow: `0 4px 12px ${col}40, 0 0 0 2px rgba(0,0,0,0.2)`,
                                      color: '#fff'
                                    }}
                                  >
                                    {i + 1}
                                  </div>
                                  
                                  {/* Tooltip */}
                                  <div 
                                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 text-[10px]"
                                    style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text }}
                                  >
                                    {room.roomName} &bull; {fmt(room.estimatedEndTime)}
                                  </div>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </div>
                        
                        {/* Legend */}
                        <div className="absolute bottom-2 sm:bottom-3 inset-x-4 flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px]" style={{ color: C.muted }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: C.green }} />
                            <span>Nyní</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: C.cyan }} />
                            <span>Konec směny</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Room cards */}
                    <div className="space-y-2 sm:space-y-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: C.muted }}>
                        Detaily sálů
                      </p>
                      
                      {overtimeRooms.map((room, i) => {
                        const full = roomsMap.get(room.roomId);
                        const col = getColor(i);
                        const remaining = Math.max(0, Math.round((room.estimatedEndTime.getTime() - now) / 60000));

                        return (
                          <motion.div
                            key={room.roomId}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-xl overflow-hidden"
                            style={{ background: C.bgSurface, border: `1px solid ${col}20` }}
                          >
                            {/* Colored accent */}
                            <div className="h-1" style={{ background: `linear-gradient(90deg, ${col}, ${col}50)` }} />

                            <div className="p-3 sm:p-4">
                              {/* Header row */}
                              <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <div className="flex items-center gap-2 sm:gap-2.5">
                                  <div
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black"
                                    style={{ background: `linear-gradient(135deg, ${col}, ${col}aa)`, color: '#fff' }}
                                  >
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="font-bold text-xs sm:text-sm" style={{ color: C.textHi }}>{room.roomName}</p>
                                    {full?.currentProcedure?.name && (
                                      <p className="text-[9px] sm:text-[10px] truncate max-w-[120px] sm:max-w-[160px]" style={{ color: C.muted }}>
                                        {full.currentProcedure.name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Time remaining */}
                                <motion.div
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold"
                                  style={{ background: `${col}15`, color: col, border: `1px solid ${col}30` }}
                                  animate={remaining < 30 ? { scale: [1, 1.05, 1] } : {}}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <Clock className="w-3 h-3" />
                                  {remaining > 0 ? fmtDur(remaining) : 'Hotovo'}
                                </motion.div>
                              </div>

                              {/* Time info */}
                              <div className="flex gap-1.5 sm:gap-2 text-center mb-2 sm:mb-3">
                                <div className="flex-1 rounded-lg py-1.5 sm:py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                  <p className="text-[8px] sm:text-[9px] uppercase mb-0.5" style={{ color: C.muted }}>Směna</p>
                                  <p className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: C.cyan }}>{fmt(room.workingEndTime)}</p>
                                </div>
                                <div className="flex-1 rounded-lg py-1.5 sm:py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                  <p className="text-[8px] sm:text-[9px] uppercase mb-0.5" style={{ color: C.muted }}>Odhad</p>
                                  <p className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: C.red }}>{fmt(room.estimatedEndTime)}</p>
                                </div>
                                <div className="flex-1 rounded-lg py-1.5 sm:py-2" style={{ background: `${C.yellow}08` }}>
                                  <p className="text-[8px] sm:text-[9px] uppercase mb-0.5" style={{ color: C.muted }}>Přesah</p>
                                  <p className="text-xs sm:text-sm font-bold" style={{ color: C.yellow }}>+{fmtDur(room.overtimeMinutes)}</p>
                                </div>
                              </div>

                              {/* Staff */}
                              {full && (
                                <div className="flex gap-1.5 sm:gap-2">
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 rounded-lg px-2 sm:px-2.5 py-1.5 sm:py-2" style={{ background: `${C.green}06` }}>
                                    <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: C.green }} />
                                    <span className="text-[10px] sm:text-xs truncate" style={{ color: C.text }}>
                                      {full.staff?.anesthesiologist?.name || full.staff?.doctor?.name || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 rounded-lg px-2 sm:px-2.5 py-1.5 sm:py-2" style={{ background: `${C.blue}06` }}>
                                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: C.blue }} />
                                    <span className="text-[10px] sm:text-xs truncate" style={{ color: C.text }}>
                                      {full.staff?.nurse?.name || '—'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
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
