import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { AlertTriangle, Lock, MoreVertical } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

// Gantt-chart style timeline module
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const active = rooms.filter(r => r.currentStepIndex < 6 && !r.isPaused).length;
    const paused = rooms.filter(r => r.isPaused).length;
    const finished = rooms.filter(r => r.currentStepIndex >= 6).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { active, paused, finished, emergency };
  }, [rooms]);

  return (
    <div className="w-full h-full flex flex-col backdrop-blur-md" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
      {/* Header */}
      <motion.div 
        className="flex-shrink-0 px-8 py-6 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Operační sály — Časová osa</h2>
            <p className="text-xs text-white/40 tracking-wider uppercase">Gantt-chart přehled činnosti sálů</p>
          </div>
          <div className="flex gap-3">
            <StatBadge label="Aktivní" count={stats.active} color="rgba(129,140,248,0.2)" />
            <StatBadge label="Pozastavené" count={stats.paused} color="rgba(251,191,36,0.2)" />
            <StatBadge label="Hotové" count={stats.finished} color="rgba(52,199,89,0.2)" />
            {stats.emergency > 0 && <StatBadge label="Nouzové" count={stats.emergency} color="rgba(255,59,48,0.2)" />}
          </div>
        </div>
      </motion.div>

      {/* Timeline rows */}
      <div className="flex-1 overflow-auto hide-scrollbar">
        <div className="space-y-3 p-6">
          {rooms.map((room, idx) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const step = WORKFLOW_STEPS[stepIndex];
            const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : step.color || '#818CF8';
            const isSelected = room.id === selectedRoomId;
            
            return (
              <motion.div
                key={room.id}
                className="p-4 rounded-xl border backdrop-blur-sm cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? `${themeColor}60` : 'rgba(255, 255, 255, 0.1)',
                  background: isSelected ? `${themeColor}15` : 'rgba(255, 255, 255, 0.05)'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div 
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ 
                      borderColor: themeColor,
                      background: `${themeColor}20`,
                      color: themeColor
                    }}
                  >
                    {room.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Room info */}
                  <div className="min-w-40">
                    <h3 className="font-bold text-white text-sm">{room.name}</h3>
                    <p className="text-[11px] text-white/50">{room.department}</p>
                  </div>

                  {/* Progress bar with stripes */}
                  <div className="flex-1 min-h-10 rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <motion.div
                      className="h-full relative"
                      style={{
                        background: `linear-gradient(45deg, ${themeColor}40 25%, ${themeColor}20 25%, ${themeColor}20 50%, ${themeColor}40 50%, ${themeColor}40 75%, ${themeColor}20 75%, ${themeColor}20)`,
                        backgroundSize: '16px 16px',
                        width: `${(stepIndex / 7) * 100}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(stepIndex / 7) * 100}%` }}
                      transition={{ delay: 0.3 + idx * 0.05, duration: 1.2, ease: 'easeOut' }}
                    />
                    
                    {/* Current time indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
                      style={{
                        left: `${((currentTime.getHours() - 7 + 24) % 24) / 24 * 100}%`,
                        background: 'rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)'
                      }}
                    />

                    {/* Step label */}
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-[11px] font-bold text-white/70">
                        {step?.title || 'Neznámo'}
                      </span>
                    </div>
                  </div>

                  {/* Status icons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {room.isEmergency && (
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </motion.div>
                    )}
                    {room.isLocked && !room.isEmergency && (
                      <Lock className="w-5 h-5 text-amber-400" />
                    )}
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <motion.div 
        className="flex-shrink-0 px-8 py-4 border-t text-xs"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex justify-between text-white/40">
          <span>Aktuální čas: <span className="text-white/60 font-semibold">{currentTime.toLocaleTimeString('cs-CZ')}</span></span>
          <span>Sálů: <span className="text-white/60 font-semibold">{rooms.length}</span></span>
        </div>
      </motion.div>
    </div>
  );
};

// Stat badge component
const StatBadge: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <motion.div
    className="px-3.5 py-2 rounded-lg border flex items-center gap-2 backdrop-blur-md"
    style={{ 
      background: color,
      borderColor: 'rgba(255, 255, 255, 0.15)'
    }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <span className="text-[10px] font-bold tracking-wider uppercase text-white/70">{label}</span>
    <span className="text-sm font-black text-white">{count}</span>
  </motion.div>
);

export default TimelineModule;
