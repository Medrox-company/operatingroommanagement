import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Clock, Zap, CheckCircle, Info } from 'lucide-react';
import { OperatingRoom } from '../types';

interface RightSidebarProps {
  rooms: OperatingRoom[];
  currentTime: Date;
  isExpanded: boolean;
}

export default function RightSidebar({ rooms, currentTime, isExpanded }: RightSidebarProps) {
  // Výpočty statistik
  const activeRooms = rooms.filter(r => r.isActive && !r.isLocked).length;
  const readyRooms = rooms.filter(r => (r.currentStepIndex === 0 || r.currentStepIndex === 7) && !r.isLocked).length;
  const lockedRooms = rooms.filter(r => r.isLocked).length;
  const emergencyRooms = rooms.filter(r => r.isEmergency).length;
  
  // Hledáme sály s překročeným časem
  const overtimeRooms = rooms.filter(r => {
    if (!r.isActive || !r.estimatedEndTime) return false;
    return currentTime.getTime() > r.estimatedEndTime.getTime();
  });

  const avgOccupancy = rooms.length > 0 ? Math.round((activeRooms / rooms.length) * 100) : 0;

  return (
    <motion.div
      className={`flex flex-col gap-4 ${
        isExpanded ? 'w-72 px-4' : 'w-0'
      } py-4 bg-gradient-to-b from-slate-900/20 to-slate-800/10 border-l border-white/10 overflow-hidden transition-all duration-300`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Statistiky Header */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Přehled</h3>
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 hover:border-cyan-500/50 transition cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-xs text-cyan-400/70 mb-1">Aktivní</div>
            <div className="text-2xl font-bold text-cyan-300">{activeRooms}</div>
            <div className="text-[10px] text-cyan-400/50 mt-1">z {rooms.length}</div>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 hover:border-green-500/50 transition cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-xs text-green-400/70 mb-1">Připraveno</div>
            <div className="text-2xl font-bold text-green-300">{readyRooms}</div>
            <div className="text-[10px] text-green-400/50 mt-1">k dispozici</div>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 hover:border-amber-500/50 transition cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-xs text-amber-400/70 mb-1">Obsazenost</div>
            <div className="text-2xl font-bold text-amber-300">{avgOccupancy}%</div>
            <div className="text-[10px] text-amber-400/50 mt-1">průměrně</div>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 hover:border-red-500/50 transition cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-xs text-red-400/70 mb-1">Uzamčeno</div>
            <div className="text-2xl font-bold text-red-300">{lockedRooms}</div>
            <div className="text-[10px] text-red-400/50 mt-1">údržba</div>
          </motion.div>
        </div>
      </div>

      {/* Alarmy */}
      {(emergencyRooms.length > 0 || overtimeRooms.length > 0) && (
        <motion.div
          className="pt-4 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Upozornění</h3>
          
          <div className="space-y-2">
            {emergencyRooms.map((room) => (
              <motion.div
                key={room.id}
                className="p-2 rounded-lg bg-red-500/15 border border-red-500/40 text-[11px] text-red-300"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Stav nouze</span>
                </div>
              </motion.div>
            ))}

            {overtimeRooms.map((room) => (
              <motion.div
                key={room.id}
                className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Překročen čas</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Legenda Stavů */}
      <motion.div
        className="pt-4 border-t border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Legenda</h3>
        
        <div className="space-y-2 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-cyan-500/60" />
            <span className="text-white/60">Aktivní operace</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500/60" />
            <span className="text-white/60">Sál připraven</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-purple-500/60" />
            <span className="text-white/60">Čekající operace</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-slate-500/60" />
            <span className="text-white/60">Uzavřen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/60" />
            <span className="text-white/60">Stav nouze</span>
          </div>
        </div>
      </motion.div>

      {/* Info Footer */}
      <motion.div
        className="mt-auto pt-4 border-t border-white/10 text-[10px] text-white/40 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Info className="w-3 h-3" />
        <span>Poslední aktualizace: právě teď</span>
      </motion.div>
    </motion.div>
  );
}
