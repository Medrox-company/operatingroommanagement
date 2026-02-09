
import React from 'react';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Biohazard, Clock, AlertCircle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, onEmergency, onLock }) => {
  const currentStep = WORKFLOW_STEPS[room.currentStepIndex];
  const themeColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : currentStep.color);
  
  // Progress calculation - adjusted for smaller size
  const progressPercent = ((room.currentStepIndex + 1) / WORKFLOW_STEPS.length);
  const radius = 38;
  const strokeWidth = 4;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray * (1 - progressPercent);

  // Center coordinates for SVG - adjusted for smaller size
  const center = 56;

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  return (
    <motion.div
      layout
      layoutId={`room-wrapper-${room.id}`}
      onClick={onClick}
      className="relative group cursor-pointer h-[340px] w-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.02, 
        zIndex: 50,
        transition: { duration: 0.3 }
      }}
      style={{ zIndex: 1 }}
    >
      {/* Subtle State Pulse Aura (Emergency or Locked) */}
      {(room.isEmergency || room.isLocked) && (
        <motion.div 
          className={`absolute -inset-1 z-0 rounded-[2.6rem] blur-xl pointer-events-none ${room.isEmergency ? 'bg-red-500/20' : 'bg-amber-500/10'}`}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: room.isEmergency ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Main Card Container */}
      <div className={`absolute inset-0 z-0 rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 
        ${room.isEmergency 
          ? 'bg-red-950/20 border-red-500/40' 
          : (room.isLocked 
              ? 'bg-amber-950/15 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
              : 'bg-white/[0.03] border-white/5 group-hover:bg-white/[0.06]')}
      `}>
        
        {/* State Gradients */}
        {room.isEmergency && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-600/5 pointer-events-none" />
        )}
        {room.isLocked && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 pointer-events-none" />
        )}
        
        {/* Dynamic State Glow Layer */}
        <motion.div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] transition-opacity duration-1000 pointer-events-none"
          animate={{ 
            backgroundColor: themeColor,
            opacity: (room.isEmergency || room.isLocked) ? 0.3 : 0.15 
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative h-full w-full z-10 p-6 flex flex-col">
        
        {/* Header */}
        <div className="w-full flex justify-between items-start min-w-0 gap-2 shrink-0">
          <div className="flex flex-col min-w-0 flex-1">
            <p className={`text-[9px] font-black tracking-[0.3em] uppercase leading-none mb-2 truncate transition-colors
              ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white/30')}
            `}>
              UNIT {room.department}
            </p>
            <h3 className={`text-xl font-bold tracking-tight uppercase leading-none transition-colors truncate
              ${(room.isEmergency || room.isLocked) ? 'text-white' : 'text-white/90 group-hover:text-white'}
            `}>
              {room.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {room.isSeptic && (
              <div className="p-1.5 bg-red-500/10 rounded-xl border border-red-500/20 backdrop-blur-md">
                <Biohazard className="w-3.5 h-3.5 text-red-500/70" />
              </div>
            )}
            
            {/* Emergency Action */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleAction(e, onEmergency)}
              className={`p-2.5 rounded-xl border transition-all backdrop-blur-md
                ${room.isEmergency 
                  ? 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                  : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-white/40 hover:text-red-400'}
              `}
            >
              <AlertCircle className="w-5 h-5" />
            </motion.button>

            {/* Lock Action */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleAction(e, onLock)}
              className={`p-2.5 rounded-xl border transition-all backdrop-blur-md
                ${room.isLocked
                  ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-white/5 hover:bg-amber-500/20 border-white/10 text-white/40 hover:text-amber-400'}
              `}
            >
              <Lock className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Central Content Wrapper (takes up remaining space and centers its content) */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            {/* Central Area (Circle) */}
            <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90 overflow-visible select-none flex-shrink-0">
                    <circle 
                    cx={center} cy={center} r={radius} 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    className="opacity-[0.03]" 
                    />
                    <motion.circle 
                    cx={center} cy={center} r={radius} 
                    fill="none"
                    stroke={themeColor} 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: strokeDasharray }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 6px ${themeColor}66)` }}
                    />
                    <text
                    x={center}
                    y={center}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-4xl font-black transition-colors ${(room.isEmergency || room.isLocked) ? 'fill-white' : 'fill-white/90'}`}
                    style={{ 
                        transform: 'rotate(90deg)', 
                        transformOrigin: `${center}px ${center}px`,
                        letterSpacing: '-0.05em'
                    }}
                    >
                    {room.operations24h}
                    </text>
                </svg>
            </div>
            
            {/* Estimated End Time (large, below circle) */}
            {room.estimatedEndTime && (
                <motion.div
                    className="mt-3 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase opacity-50 mb-1">
                    PŘEDPOKLÁDANÝ KONEC
                    </p>
                    <motion.div
                    className="flex items-center gap-1.5 justify-center"
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    >
                    <Clock className="w-4 h-4" style={{ color: themeColor }} />
                    <span className="text-2xl font-mono font-bold tracking-tight" style={{ color: themeColor }}>
                        {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    </motion.div>
                </motion.div>
            )}
        </div>


        {/* Bottom Info */}
        <div className="w-full space-y-3 shrink-0">
          <div className="w-full text-center">
            <p className={`text-[10px] font-black tracking-[0.2em] truncate uppercase py-2 px-4 rounded-full border transition-all inline-block w-full
              ${room.isEmergency 
                ? 'bg-red-600 text-white border-red-500' 
                : (room.isLocked 
                    ? 'bg-amber-500 text-white border-amber-600' 
                    : 'bg-white/5 border-white/5 text-white/50')}
            `}>
              {room.isEmergency ? 'STAV NOUZE' : (room.isLocked ? 'SÁL UZAMČEN' : currentStep.title)}
            </p>
          </div>
          
          <div className={`flex items-center justify-between pt-3 border-t gap-2 transition-colors
            ${room.isEmergency ? 'border-red-500/20' : (room.isLocked ? 'border-amber-500/20' : 'border-white/5')}
          `}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-xl border overflow-hidden shrink-0 
                ${room.isEmergency ? 'border-red-500/30' : (room.isLocked ? 'border-amber-500/30' : 'border-white/5')}
              `}>
                <img src={`https://i.pravatar.cc/150?u=${room.staff.doctor.name}`} alt="Dr" className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tight truncate transition-colors
                ${room.isEmergency ? 'text-red-200' : (room.isLocked ? 'text-amber-200' : 'text-white/40 group-hover:text-white/60')}
              `}>
                {room.staff.doctor.name?.split(' ').pop()}
              </span>
            </div>
            
            {/* Show start time only if estimated end time is NOT set */}
            {!room.estimatedEndTime && (
              <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-80 transition-opacity shrink-0">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-mono font-bold text-white">
                  {room.currentProcedure?.startTime || '--:--'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;
