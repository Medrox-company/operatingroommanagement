
import React, { memo, useMemo } from 'react';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { Biohazard, Clock, AlertCircle, Lock, Phone, BedDouble, User } from 'lucide-react';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onClick, onEmergency, onLock }) => {
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Add null safety
  const activeStatuses = workflowStatuses || [];
  
  // Filter completed operations for today (7:00 yesterday/today to 6:59 today/tomorrow)
  // The window is: if current time >= 7:00, count from 7:00 today to 6:59 tomorrow
  //                if current time < 7:00, count from 7:00 yesterday to 6:59 today
  const todayOperationCount = useMemo(() => {
    if (!room.completedOperations || room.completedOperations.length === 0) return 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Determine the start of the 24h window based on current time
    const startOfWindow = new Date(now);
    if (currentHour >= 7) {
      // After 7 AM - window starts at 7:00 today
      startOfWindow.setHours(7, 0, 0, 0);
    } else {
      // Before 7 AM - window starts at 7:00 yesterday
      startOfWindow.setDate(startOfWindow.getDate() - 1);
      startOfWindow.setHours(7, 0, 0, 0);
    }
    
    // End of window is 24h after start (6:59:59 next day)
    const endOfWindow = new Date(startOfWindow);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(6, 59, 59, 999);
    
    const count = room.completedOperations.filter(op => {
      if (!op.endedAt) return false; // Use endedAt for completed operations
      const opEnd = new Date(op.endedAt);
      return opEnd >= startOfWindow && opEnd <= endOfWindow;
    }).length;
    
    return count;
  }, [room.completedOperations]);
  
  // Memoize computed values using database statuses
  const { totalSteps, safeIndex, currentStep, themeColor, progressPercent, shouldShowTime, strokeDasharray, strokeDashoffset } = useMemo(() => {
    const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
    const safeIndex = Math.min(Math.max(0, room.currentStepIndex || 0), totalSteps - 1);
    const step = activeStatuses[safeIndex] || null;
    
    const currentStep = {
      title: step?.title || step?.name || 'Status',
      color: step?.accent_color || step?.color || '#6B7280',
    };
    
    const themeColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : (room.isPaused ? '#22D3EE' : currentStep.color));
    const progressPercent = ((safeIndex + 1) / totalSteps);
    
    // Don't show time for "Sal priprav*" and "Uklid" statuses (ASCII-safe)
    const statusName = (step?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isReadyStatus = statusName.includes('priprav');
    const isCleaningStatus = statusName.includes('uklid');
    const shouldShowTime = !isReadyStatus && !isCleaningStatus;
    
    const radius = 38;
    const strokeDasharray = 2 * Math.PI * radius;
    const strokeDashoffset = strokeDasharray * (1 - progressPercent);
    
    return { totalSteps, safeIndex, currentStep, themeColor, progressPercent, shouldShowTime, strokeDasharray, strokeDashoffset };
  }, [activeStatuses, room.currentStepIndex, room.isEmergency, room.isLocked, room.isPaused]);
  
  const radius = 38;
  const strokeWidth = 4;

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
        
        {/* Header — centered */}
        <div className="w-full flex flex-col items-center text-center shrink-0">
          <p className={`text-[9px] font-black tracking-[0.3em] uppercase leading-none mb-2 transition-colors
            ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white/30')}
          `}>
            {room.department}
          </p>
          <h3 className={`text-xl font-bold tracking-tight uppercase leading-none transition-colors
            ${(room.isEmergency || room.isLocked) ? 'text-white' : 'text-white/90 group-hover:text-white'}
          `}>
            {room.name}
          </h3>
        </div>

        {/* Central Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="relative flex items-center justify-center">
                {/* Static glow behind the circle - replaced motion for performance */}
                <div
                  className="absolute rounded-full blur-[40px] transition-all duration-500"
                  style={{ width: 80, height: 80, backgroundColor: themeColor, opacity: 0.25 }}
                />
                <svg
                  className="w-28 h-28 overflow-visible select-none flex-shrink-0"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      className="opacity-[0.03]" 
                    />
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="none"
                      stroke={themeColor} 
                      strokeWidth={strokeWidth} 
                      strokeLinecap="round"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={room.isPaused ? 0 : strokeDashoffset}
                      className="transition-all duration-500"
                      style={{ filter: `drop-shadow(0 0 6px ${themeColor}99)` }}
                    />
                    {room.isPaused ? (
                      <text
                        x={center}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#22D3EE"
                        className="text-4xl font-black"
                        style={{ 
                          transform: 'rotate(90deg)', 
                          transformOrigin: `${center}px ${center}px`,
                          fontSize: '28px',
                          fontWeight: 900,
                          letterSpacing: '-0.05em'
                        }}
                      >
                        P
                      </text>
                    ) : (
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
                        {todayOperationCount}
                      </text>
                    )}
                </svg>
            </div>
            
            {room.estimatedEndTime && shouldShowTime && (
                <div className="-mt-1 text-center">
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
            ${room.isEmergency ? 'border-red-500/20' : (room.isLocked ? 'border-amber-500/20' : (room.isPaused ? 'border-cyan-500/20' : 'border-white/5'))}
          `}>
            {/* Left: avatar + names */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-xl border shrink-0 flex items-center justify-center
                ${room.isEmergency ? 'border-red-500/30 bg-red-500/10' : (room.isLocked ? 'border-amber-500/30 bg-amber-500/10' : (room.isPaused ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/10 bg-white/5'))}
              `}>
                <User className={`w-4 h-4 transition-opacity
                  ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : (room.isPaused ? 'text-cyan-400' : 'text-white/40 group-hover:text-white/60'))}
                `} />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-tight truncate transition-colors
                  ${room.isEmergency ? 'text-red-200' : (room.isLocked ? 'text-amber-200' : (room.isPaused ? 'text-cyan-200' : 'text-white/40 group-hover:text-white/60'))}
                `}>
                  {room?.staff?.doctor?.name?.split(' ').pop() || 'Neurčen'}
                </span>
                {room?.staff?.nurse?.name && (
                  <span className={`text-[9px] font-medium uppercase tracking-tight truncate transition-colors
                    ${room.isEmergency ? 'text-red-300/60' : (room.isLocked ? 'text-amber-300/60' : (room.isPaused ? 'text-cyan-300/60' : 'text-white/25 group-hover:text-white/40'))}
                  `}>
                    {room?.staff?.nurse?.name?.split(' ').pop()}
                  </span>
                )}
              </div>
            </div>

            {/* Right: action buttons / status badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {room.isSeptic && (
                <div className="p-1.5 bg-red-500/10 rounded-xl border border-red-500/20 backdrop-blur-md">
                  <Biohazard className="w-3.5 h-3.5 text-red-500/70" />
                </div>
              )}

              {/* Patient called indicator */}
              {room.patientCalledAt && !room.patientArrivedAt && (
                <div className="p-2 rounded-xl border transition-all backdrop-blur-md bg-blue-500/20 border-blue-400/40">
                  <Phone className="w-4 h-4 text-blue-400" />
                </div>
              )}

              {/* Patient arrived indicator */}
              {room.patientArrivedAt && (
                <div className="p-2 rounded-xl border transition-all backdrop-blur-md bg-green-500/20 border-green-400/40">
                  <BedDouble className="w-4 h-4 text-green-400" />
                </div>
              )}

              {/* Emergency button */}
              <button
                onClick={(e) => handleAction(e, onEmergency)}
                className={`p-2 rounded-xl border transition-all backdrop-blur-md
                  ${room.isEmergency
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                    : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-white/40 hover:text-red-400'}
                `}
              >
                <AlertCircle className="w-4 h-4" />
              </button>

              {/* Lock button */}
              <button
                onClick={(e) => handleAction(e, onLock)}
                className={`p-2 rounded-xl border transition-all backdrop-blur-md
                  ${room.isLocked
                    ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                    : 'bg-white/5 hover:bg-amber-500/20 border-white/10 text-white/40 hover:text-amber-400'}
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
});

export default RoomCard;
