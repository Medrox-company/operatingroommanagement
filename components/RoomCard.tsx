
import React from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Biohazard, Clock, AlertCircle, Lock } from 'lucide-react';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, onEmergency, onLock }) => {
  const currentStep = WORKFLOW_STEPS[room.currentStepIndex];
  const themeColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : currentStep.color);
  
  const progressPercent = ((room.currentStepIndex + 1) / WORKFLOW_STEPS.length);
  const radius = 38;
  const strokeWidth = 4;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray * (1 - progressPercent);

  const center = 56;

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer h-[340px] w-full"
    >
      {/* Subtle State Pulse Aura (Emergency or Locked) */}
      {(room.isEmergency || room.isLocked) && (
        <div 
          className={`absolute -inset-1 z-0 rounded-[2.6rem] blur-xl pointer-events-none ${room.isEmergency ? 'bg-red-500/20' : 'bg-amber-500/10'}`}
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
        {room.isEmergency && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-600/5 pointer-events-none" />
        )}
        {room.isLocked && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 pointer-events-none" />
        )}
        
        {/* Static Glow Layer */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000"
          style={{ 
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
            <button
              onClick={(e) => handleAction(e, onEmergency)}
              className={`p-2.5 rounded-xl border transition-all backdrop-blur-md
                ${room.isEmergency 
                  ? 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                  : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-white/40 hover:text-red-400'}
              `}
            >
              <AlertCircle className="w-5 h-5" />
            </button>

            {/* Lock Action */}
            <button
              onClick={(e) => handleAction(e, onLock)}
              className={`p-2.5 rounded-xl border transition-all backdrop-blur-md
                ${room.isLocked
                  ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-white/5 hover:bg-amber-500/20 border-white/10 text-white/40 hover:text-amber-400'}
              `}
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>

                {/* Deep ambient glow */}
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 140, height: 140, backgroundColor: themeColor, filter: 'blur(60px)' }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.35, scale: 1 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />

                {/* Outer orbital ring — tilted 3D perspective */}
                <motion.svg
                  className="absolute overflow-visible"
                  style={{ width: 140, height: 140, perspective: '400px' }}
                  initial={{ opacity: 0, rotateX: 60 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                >
                  <defs>
                    <linearGradient id={`orbit-grad-${room.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={themeColor} stopOpacity="0" />
                      <stop offset="40%" stopColor={themeColor} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                    </linearGradient>
                    <filter id={`glow-${room.id}`}>
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  {/* Outer track */}
                  <ellipse cx="70" cy="70" rx="62" ry="22"
                    fill="none" stroke="white" strokeWidth="1"
                    style={{ opacity: 0.06, transform: 'rotateX(75deg)', transformOrigin: '70px 70px' }}
                  />
                  {/* Animated progress arc */}
                  <motion.ellipse cx="70" cy="70" rx="62" ry="22"
                    fill="none"
                    stroke={`url(#orbit-grad-${room.id})`}
                    strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 62 * progressPercent} ${2 * Math.PI * 62}`}
                    strokeLinecap="round"
                    filter={`url(#glow-${room.id})`}
                    style={{ transform: 'rotateX(75deg)', transformOrigin: '70px 70px' }}
                    initial={{ strokeDasharray: `0 ${2 * Math.PI * 62}` }}
                    animate={{ strokeDasharray: `${2 * Math.PI * 62 * progressPercent} ${2 * Math.PI * 62}` }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                  />
                </motion.svg>

                {/* Inner orbital ring — opposite tilt */}
                <motion.svg
                  className="absolute overflow-visible"
                  style={{ width: 100, height: 100, top: 20, left: 20 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                >
                  <ellipse cx="50" cy="50" rx="44" ry="16"
                    fill="none" stroke={themeColor} strokeWidth="1"
                    style={{ opacity: 0.15, transform: 'rotateX(-70deg)', transformOrigin: '50px 50px' }}
                  />
                </motion.svg>

                {/* 3D Sphere body */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 88, height: 88,
                    top: 26, left: 26,
                    background: `radial-gradient(circle at 38% 32%, ${themeColor}55 0%, ${themeColor}18 40%, rgba(0,0,0,0.85) 100%)`,
                    boxShadow: `inset 0 0 28px ${themeColor}44, inset -6px -6px 20px rgba(0,0,0,0.7), 0 8px 32px ${themeColor}33`,
                    border: `1px solid ${themeColor}30`,
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                >
                  {/* Light sweep highlight */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: 38, height: 22,
                      top: 10, left: 14,
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                      filter: 'blur(4px)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </motion.div>

                {/* Number */}
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{ width: 88, height: 88, top: 26, left: 26 }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
                >
                  <span
                    className="font-black select-none"
                    style={{
                      fontSize: 34,
                      letterSpacing: '-0.05em',
                      color: 'white',
                      textShadow: `0 0 20px ${themeColor}cc, 0 2px 8px rgba(0,0,0,0.8)`,
                      lineHeight: 1,
                    }}
                  >
                    {room.operations24h}
                  </span>
                </motion.div>

                {/* Sparkle dots on orbit */}
                {[0, 120, 240].map((deg, i) => {
                  const rad = (deg * Math.PI) / 180;
                  const x = 70 + 62 * Math.cos(rad) - 4;
                  const y = 70 + 22 * Math.sin(rad) * 0.25 - 4;
                  return (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: 5, height: 5,
                        left: x, top: y,
                        backgroundColor: themeColor,
                        boxShadow: `0 0 6px ${themeColor}`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0.6], scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 1 + i * 0.15 }}
                    />
                  );
                })}
            </div>
            
            {room.estimatedEndTime && (
                <div className="mt-3 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Clock className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      <span className="text-lg font-mono font-bold tracking-tight" style={{ color: themeColor }}>
                          {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                </div>
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
    </div>
  );
};

export default RoomCard;
