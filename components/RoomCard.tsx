
import React from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { Biohazard, Clock, AlertCircle, Lock, Pause } from 'lucide-react';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, onEmergency, onLock }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  const activeDbStatuses = workflowStatuses
    .filter(s => s.is_active && !s.is_special)
    .sort((a, b) => a.order_index - b.order_index);
  
  const totalSteps = activeDbStatuses.length > 0 ? activeDbStatuses.length : 1;
  const safeIndex = Math.min(room.currentStepIndex, totalSteps - 1);
  const dbStatus = activeDbStatuses.length > 0 ? activeDbStatuses[safeIndex] : null;
  
  const currentStep = {
    title: dbStatus?.name || 'Status',
    color: dbStatus?.color || '#6B7280',
  };

  // Accent color only for special states — neutral for normal
  const accentColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : (room.isPaused ? '#22D3EE' : 'rgba(255,255,255,0.15)'));
  const progressPercent = ((safeIndex + 1) / totalSteps);
  const isFinalStep = safeIndex === activeDbStatuses.length - 1;
  const radius = 38;
  const strokeWidth = 4;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray * (1 - progressPercent);
  const center = 56;

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  const isSpecialState = room.isEmergency || room.isLocked || room.isPaused;

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer h-[340px] w-full"
    >
      {/* Emergency / Locked pulse aura */}
      {(room.isEmergency || room.isLocked) && (
        <div 
          className={`absolute -inset-1 z-0 rounded-[2.6rem] blur-xl pointer-events-none ${room.isEmergency ? 'bg-red-500/20' : 'bg-amber-500/10'}`}
        />
      )}

      {/* Main Card — unified dark glass style */}
      <div className={`absolute inset-0 z-0 rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-[60px] transition-all duration-500
        ${room.isEmergency 
          ? 'bg-red-950/25 border-red-500/30' 
          : room.isLocked 
            ? 'bg-amber-950/20 border-amber-500/25'
            : 'bg-white/[0.04] border-white/[0.07] group-hover:bg-white/[0.06]'}
      `}>
        {/* Subtle tinted overlay for special states only */}
        {room.isEmergency && <div className="absolute inset-0 bg-gradient-to-br from-red-600/8 to-transparent pointer-events-none" />}
        {room.isLocked && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />}
        
        {/* Ambient glow — muted for normal, visible for special states */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-all duration-700"
          style={{ 
            backgroundColor: isSpecialState ? accentColor : 'white',
            opacity: isSpecialState ? 0.2 : 0.04
          }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full w-full z-10 p-6 flex flex-col">
        
        {/* Header — centered */}
        <div className="w-full flex flex-col items-center text-center shrink-0">
          <p className={`text-[9px] font-black tracking-[0.3em] uppercase leading-none mb-2 transition-colors
            ${room.isEmergency ? 'text-red-400' : room.isLocked ? 'text-amber-400' : 'text-white/25'}
          `}>
            UNIT {room.department}
          </p>
          <h3 className="text-xl font-bold tracking-tight uppercase leading-none text-white/90 group-hover:text-white transition-colors">
            {room.name}
          </h3>
        </div>

        {/* Center — progress ring */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative flex items-center justify-center">
            {/* Glow behind ring — only special states */}
            {isSpecialState && (
              <div
                className="absolute rounded-full blur-[36px] pointer-events-none"
                style={{ width: 72, height: 72, backgroundColor: accentColor, opacity: 0.25 }}
              />
            )}
            <motion.svg
              className="w-28 h-28 overflow-visible select-none flex-shrink-0"
              style={{ rotate: '-90deg' }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Track */}
              <circle cx={center} cy={center} r={radius} fill="none" stroke="white" strokeWidth="1" className="opacity-[0.06]" />
              {/* Progress arc */}
              <motion.circle
                cx={center} cy={center} r={radius}
                fill="none"
                stroke={isSpecialState ? accentColor : 'rgba(255,255,255,0.35)'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                initial={{ strokeDashoffset: strokeDasharray }}
                animate={{ strokeDashoffset: room.isPaused ? 0 : strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ filter: isSpecialState ? `drop-shadow(0 0 5px ${accentColor}88)` : 'none' }}
              />
              {/* Center text */}
              {room.isPaused ? (
                <text
                  x={center} y={center}
                  textAnchor="middle" dominantBaseline="central"
                  fill="#22D3EE"
                  style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px`, fontSize: '26px', fontWeight: 900 }}
                >P</text>
              ) : (
                <text
                  x={center} y={center}
                  textAnchor="middle" dominantBaseline="central"
                  fill="rgba(255,255,255,0.85)"
                  style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px`, letterSpacing: '-0.05em', fontSize: '28px', fontWeight: 800 }}
                >
                  {room.operations24h}
                </text>
              )}
            </motion.svg>
          </div>

          {room.estimatedEndTime && !isFinalStep && (
            <div className="-mt-1 text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <span className="text-lg font-mono font-bold tracking-tight text-white/60">
                  {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="w-full space-y-3 shrink-0">
          {/* Status pill — color only for special states */}
          <div className="w-full text-center">
            <p className={`text-[10px] font-black tracking-[0.2em] truncate uppercase py-2 px-4 rounded-full border transition-all inline-block w-full
              ${room.isEmergency 
                ? 'bg-red-600/80 text-white border-red-500/60' 
                : room.isLocked 
                  ? 'bg-amber-500/80 text-white border-amber-400/60'
                  : 'bg-white/[0.04] border-white/[0.07] text-white/40'}
            `}>
              {room.isEmergency ? 'STAV NOUZE' : room.isLocked ? 'SÁL UZAMČEN' : currentStep.title}
            </p>
          </div>

          {/* Staff row + action buttons */}
          <div className={`flex items-center justify-between pt-3 border-t gap-2 transition-colors
            ${room.isEmergency ? 'border-red-500/20' : room.isLocked ? 'border-amber-500/20' : room.isPaused ? 'border-cyan-500/15' : 'border-white/[0.06]'}
          `}>
            {/* Avatar + names */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl border border-white/[0.07] overflow-hidden shrink-0">
                <img src={`https://i.pravatar.cc/150?u=${room.staff.doctor.name}`} alt="Dr" className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-80 transition-opacity" />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-tight truncate text-white/40 group-hover:text-white/60 transition-colors">
                  {room.staff.doctor.name?.split(' ').pop()}
                </span>
                {room.staff.nurse?.name && (
                  <span className="text-[9px] font-medium uppercase tracking-tight truncate text-white/25 group-hover:text-white/40 transition-colors">
                    {room.staff.nurse.name?.split(' ').pop()}
                  </span>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {room.isSeptic && (
                <div className="p-1.5 bg-red-500/10 rounded-xl border border-red-500/20">
                  <Biohazard className="w-3.5 h-3.5 text-red-500/70" />
                </div>
              )}
              {!room.isPaused && !room.estimatedEndTime && (
                <div className="hidden sm:flex items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] font-mono font-bold text-white">
                    {room.currentProcedure?.startTime || '--:--'}
                  </span>
                </div>
              )}
              <button
                onClick={(e) => handleAction(e, onEmergency)}
                className={`p-2 rounded-xl border transition-all
                  ${room.isEmergency
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.35)]'
                    : 'bg-white/[0.04] hover:bg-red-500/15 border-white/[0.08] text-white/30 hover:text-red-400'}
                `}
              >
                <AlertCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleAction(e, onLock)}
                className={`p-2 rounded-xl border transition-all
                  ${room.isLocked
                    ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                    : 'bg-white/[0.04] hover:bg-amber-500/15 border-white/[0.08] text-white/30 hover:text-amber-400'}
                `}
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
