import React, { memo, useMemo } from 'react';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { Biohazard, Clock, AlertCircle, Lock, Phone, BedDouble } from 'lucide-react';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onClick, onEmergency, onLock }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses || [];
  
  // Calculate today's operation count (7:00-6:59 window)
  const todayOperationCount = useMemo(() => {
    if (!room.completedOperations || room.completedOperations.length === 0) return 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    const startOfWindow = new Date(now);
    
    if (currentHour >= 7) {
      startOfWindow.setHours(7, 0, 0, 0);
    } else {
      startOfWindow.setDate(startOfWindow.getDate() - 1);
      startOfWindow.setHours(7, 0, 0, 0);
    }
    
    const endOfWindow = new Date(startOfWindow);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(6, 59, 59, 999);
    
    return room.completedOperations.filter(op => {
      if (!op.endedAt) return false;
      const opEnd = new Date(op.endedAt);
      return opEnd >= startOfWindow && opEnd <= endOfWindow;
    }).length;
  }, [room.completedOperations]);
  
  // Memoized computed values
  const { totalSteps, safeIndex, currentStep, themeColor, progressPercent, shouldShowTime, strokeDasharray, strokeDashoffset } = useMemo(() => {
    const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
    const safeIndex = Math.min(Math.max(0, room.currentStepIndex || 0), totalSteps - 1);
    const step = activeStatuses[safeIndex] || null;
    
    const currentStep = {
      title: step?.title || step?.name || 'Status',
      color: step?.accent_color || step?.color || '#6B7280',
    };
    
    const themeColor = room.isEmergency ? '#EF4444' : (room.isLocked ? '#F59E0B' : (room.isPaused ? '#06B6D4' : currentStep.color));
    const progressPercent = ((safeIndex + 1) / totalSteps);
    
    const statusName = (step?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isReadyStatus = statusName.includes('priprav');
    const isCleaningStatus = statusName.includes('uklid');
    const shouldShowTime = !isReadyStatus && !isCleaningStatus;
    
    const radius = 36;
    const strokeDasharray = 2 * Math.PI * radius;
    const strokeDashoffset = strokeDasharray * (1 - progressPercent);
    
    return { totalSteps, safeIndex, currentStep, themeColor, progressPercent, shouldShowTime, strokeDasharray, strokeDashoffset };
  }, [activeStatuses, room.currentStepIndex, room.isEmergency, room.isLocked, room.isPaused]);
  
  const radius = 36;
  const strokeWidth = 3;
  const center = 48;

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  // State-based styles
  const getStateStyles = () => {
    if (room.isEmergency) {
      return {
        card: 'bg-danger/5 border-danger/30 shadow-glow-danger',
        glow: 'bg-danger/20',
        text: 'text-danger',
        textMuted: 'text-danger/60',
      };
    }
    if (room.isLocked) {
      return {
        card: 'bg-warning/5 border-warning/30 shadow-glow-warning',
        glow: 'bg-warning/20',
        text: 'text-warning',
        textMuted: 'text-warning/60',
      };
    }
    if (room.isPaused) {
      return {
        card: 'bg-info/5 border-info/20',
        glow: 'bg-info/15',
        text: 'text-info',
        textMuted: 'text-info/60',
      };
    }
    return {
      card: 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-default',
      glow: 'bg-accent/10',
      text: 'text-text-primary',
      textMuted: 'text-text-tertiary',
    };
  };

  const styles = getStateStyles();

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer h-[320px] w-full"
    >
      {/* Main Card */}
      <div className={`
        absolute inset-0 rounded-2xl border backdrop-blur-xl overflow-hidden
        transition-all duration-300 ${styles.card}
      `}>
        {/* Subtle glow */}
        <div 
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none ${styles.glow}`}
          style={{ opacity: room.isEmergency || room.isLocked ? 0.4 : 0.2 }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full w-full z-10 p-5 flex flex-col">
        
        {/* Header */}
        <div className="w-full flex flex-col items-center text-center shrink-0">
          <p className={`text-[9px] font-semibold tracking-widest uppercase mb-1.5 ${styles.textMuted}`}>
            {room.department}
          </p>
          <h3 className={`text-lg font-bold tracking-tight uppercase ${styles.text}`}>
            {room.name}
          </h3>
        </div>

        {/* Central Progress Ring */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 overflow-visible" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background circle */}
              <circle 
                cx={center} cy={center} r={radius} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                className="text-border-subtle" 
              />
              {/* Progress circle */}
              <circle 
                cx={center} cy={center} r={radius} 
                fill="none"
                stroke={themeColor} 
                strokeWidth={strokeWidth} 
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={room.isPaused ? 0 : strokeDashoffset}
                className="transition-all duration-500"
                style={{ filter: `drop-shadow(0 0 8px ${themeColor}66)` }}
              />
              {/* Center text */}
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-bold transition-colors"
                style={{ 
                  transform: 'rotate(90deg)', 
                  transformOrigin: `${center}px ${center}px`,
                  fontSize: room.isPaused ? '24px' : '28px',
                  fill: room.isPaused ? '#06B6D4' : 'white',
                  fontWeight: 700,
                }}
              >
                {room.isPaused ? 'P' : todayOperationCount}
              </text>
            </svg>
          </div>
          
          {/* Estimated end time */}
          {room.estimatedEndTime && shouldShowTime && (
            <div className="mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span className="text-sm font-mono font-semibold" style={{ color: themeColor }}>
                {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="w-full mb-3">
          <div className={`
            w-full py-2 px-3 rounded-xl text-center text-[10px] font-semibold uppercase tracking-wider
            ${room.isEmergency 
              ? 'bg-danger text-white' 
              : room.isLocked 
                ? 'bg-warning text-black' 
                : 'bg-surface-2 text-text-secondary border border-border-subtle'}
          `}>
            {room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamceno' : currentStep.title}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-2">
          {/* Staff info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle overflow-hidden shrink-0">
              <img 
                src={`https://i.pravatar.cc/150?u=${room?.staff?.doctor?.name || 'default'}`} 
                alt="" 
                className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-80 transition-opacity" 
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-text-secondary truncate">
                {room?.staff?.doctor?.name?.split(' ').pop() || 'Neurčen'}
              </p>
              {room?.staff?.nurse?.name && (
                <p className="text-[9px] text-text-muted truncate">
                  {room?.staff?.nurse?.name?.split(' ').pop()}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {room.isSeptic && (
              <div className="p-1.5 bg-danger/10 rounded-lg border border-danger/20">
                <Biohazard className="w-3.5 h-3.5 text-danger/70" />
              </div>
            )}

            {room.patientCalledAt && !room.patientArrivedAt && (
              <div className="p-1.5 bg-info/10 rounded-lg border border-info/30">
                <Phone className="w-3.5 h-3.5 text-info" />
              </div>
            )}

            {room.patientArrivedAt && (
              <div className="p-1.5 bg-success/10 rounded-lg border border-success/30">
                <BedDouble className="w-3.5 h-3.5 text-success" />
              </div>
            )}

            <button
              onClick={(e) => handleAction(e, onEmergency)}
              className={`
                p-1.5 rounded-lg border transition-all duration-200
                ${room.isEmergency
                  ? 'bg-danger text-white border-danger shadow-lg shadow-danger/30'
                  : 'bg-surface-2 border-border-subtle text-text-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5'}
              `}
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={(e) => handleAction(e, onLock)}
              className={`
                p-1.5 rounded-lg border transition-all duration-200
                ${room.isLocked
                  ? 'bg-warning text-black border-warning shadow-lg shadow-warning/30'
                  : 'bg-surface-2 border-border-subtle text-text-muted hover:text-warning hover:border-warning/30 hover:bg-warning/5'}
              `}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RoomCard;
