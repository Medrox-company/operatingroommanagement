
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity, BedDouble, ChevronLeft
} from 'lucide-react';
import { recordStatusEvent, updateOperatingRoom } from '../lib/db';

interface RoomDetailProps {
  room: OperatingRoom;
  onClose: () => void;
  onStepChange: (index: number) => void;
  onEndTimeChange: (newTime: Date | null) => void;
  onEnhancedHygieneToggle?: (enabled: boolean) => void;
}

const usePrevious = (value: number) => {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room, onClose, onStepChange, onEndTimeChange, onEnhancedHygieneToggle }) => {
  // Get workflow statuses from database context - ONLY main workflow, no special statuses
  const { workflowStatuses, getStatusColor, getStatusByIndex } = useWorkflowStatusesContext();
  
  // Get ONLY main workflow statuses (bez speciálních), sorted by order_index
  const activeDbStatuses = workflowStatuses
    .filter(s => s.is_active && !s.is_special)
    .sort((a, b) => a.order_index - b.order_index);

  const [phaseStartTime, setPhaseStartTime] = useState(() => new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isPaused, setIsPaused] = useState(room.isPaused || false);
  const [pauseElapsedTime, setPauseElapsedTime] = useState('00:00');
  const [showEndTime, setShowEndTime] = useState(false);
  const endTimeTimeoutRef = useRef<number | null>(null);
  const [patientCalledTime, setPatientCalledTime] = useState<Date | null>(room.patientCalledAt ? new Date(room.patientCalledAt) : null);
  const [patientArrivedTime, setPatientArrivedTime] = useState<Date | null>(room.patientArrivedAt ? new Date(room.patientArrivedAt) : null);
  const [patientCallElapsedTime, setPatientCallElapsedTime] = useState('00:00');
  const [showPatientCalledText, setShowPatientCalledText] = useState(false);
  const [showPatientArrivedText, setShowPatientArrivedText] = useState(false);
  const patientCallTimerRef = useRef<number | null>(null);

  const estimatedEndTime = room.estimatedEndTime ? new Date(room.estimatedEndTime) : null;

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - phaseStartTime.getTime();
      
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phaseStartTime, isPaused]);

  useEffect(() => {
    if (!isPaused) {
      setPauseElapsedTime('00:00');
      return;
    }

    const pauseStartTime = new Date();
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - pauseStartTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setPauseElapsedTime(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Patient call timer
  useEffect(() => {
    if (!patientCalledTime || patientArrivedTime) return;

    patientCallTimerRef.current = window.setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - patientCalledTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setPatientCallElapsedTime(`${minutes}:${seconds}`);
    }, 1000);

    return () => {
      if (patientCallTimerRef.current) clearInterval(patientCallTimerRef.current);
    };
  }, [patientCalledTime, patientArrivedTime]);

  useEffect(() => {
    if (patientArrivedTime && patientCallTimerRef.current) {
      clearInterval(patientCallTimerRef.current);
    }
  }, [patientArrivedTime]);

  // Sync local state with room object (for real-time updates from other devices)
  useEffect(() => {
    setIsPaused(room.isPaused || false);
  }, [room.isPaused]);

  useEffect(() => {
    setPatientCalledTime(room.patientCalledAt ? new Date(room.patientCalledAt) : null);
  }, [room.patientCalledAt]);

  useEffect(() => {
    setPatientArrivedTime(room.patientArrivedAt ? new Date(room.patientArrivedAt) : null);
  }, [room.patientArrivedAt]);


  const currentStepIndex = room.currentStepIndex;
  const prevStepIndex = usePrevious(currentStepIndex);
  
  // Use active statuses count for rotation calculation
  const stepsCount = activeDbStatuses.length > 0 ? activeDbStatuses.length : 1;
  const [rotation, setRotation] = useState(-Math.min(currentStepIndex, stepsCount - 1) * (360 / stepsCount));

  useEffect(() => {
    if (prevStepIndex === undefined) return;

    const anglePerStep = 360 / stepsCount;
    const stepDiff = currentStepIndex - prevStepIndex;

    if (stepDiff === 1 || stepDiff < -1) {
      setRotation(r => r - anglePerStep);
    } else {
      setRotation(r => r + anglePerStep);
    }
  }, [currentStepIndex, stepsCount]);

  // Use database statuses - don't fallback to WORKFLOW_STEPS
  const safeStepIndex = activeDbStatuses.length > 0 
    ? Math.min(room.currentStepIndex, activeDbStatuses.length - 1)
    : 0;
  
  const currentStep = activeDbStatuses.length > 0
    ? activeDbStatuses[safeStepIndex]
    : { name: 'Čekání', color: '#6B7280', title: 'Čekání' };
  
  const nextStepIndex = (safeStepIndex + 1) % Math.max(activeDbStatuses.length, 1);
  const nextStep = activeDbStatuses.length > 0
    ? activeDbStatuses[nextStepIndex]
    : currentStep;
  
  // Logic to determine if actions are allowed even if locked
  const validStepCount = activeDbStatuses.length > 0 ? activeDbStatuses.length : 1;
  const isFinalStep = activeDbStatuses.length > 0 && safeStepIndex === activeDbStatuses.length - 1;
  const isInteractionBlocked = isPaused || (room.isLocked && isFinalStep);
  
  console.log('[v0] RoomDetail state:', { 
    roomCurrentStepIndex: room.currentStepIndex, 
    safeStepIndex, 
    validStepCount, 
    activeDbStatusesLength: activeDbStatuses.length,
    isFinalStep,
    isInteractionBlocked,
    isPaused,
    isLocked: room.isLocked
  });

  // Dynamic theme color based on status
  const activeColor = room.isEmergency 
    ? '#FF3B30' 
    : (room.isLocked 
        ? '#FBBF24' 
        : (isPaused ? '#06b6d4' : (currentStep?.color || '#6B7280')));

  const changeStep = async (newIndex: number) => {
    console.log('[v0] changeStep called:', { newIndex, safeStepIndex, validStepCount, isInteractionBlocked });
    
    if (isInteractionBlocked) {
      console.log('[v0] changeStep blocked - isInteractionBlocked');
      return;
    }
    
    // SEQUENTIAL STEP RESTRICTION: Only allow next step (+1) or reset to 0 (from final step)
    const isNextStep = newIndex === safeStepIndex + 1;
    const isResetToStart = newIndex === 0 && safeStepIndex === validStepCount - 1;
    
    console.log('[v0] changeStep validation:', { isNextStep, isResetToStart, expectedNext: safeStepIndex + 1 });
    
    if (!isNextStep && !isResetToStart) {
      console.log('[v0] changeStep blocked - not next step or reset');
      return; // Block skipping steps
    }
    
    // Additional security for locked state: only allow forward progression
    if (room.isLocked) {
      if (newIndex <= safeStepIndex && !isFinalStep) {
        console.log('[v0] changeStep blocked - locked and going backwards');
        return;
      }
      if (newIndex === 0) {
        console.log('[v0] changeStep blocked - locked and trying to reset');
        return; // Never allow starting over if locked
      }
    }

    // Calculate duration of previous step
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - phaseStartTime.getTime()) / 1000);
    const previousStep = activeDbStatuses.length > 0 ? activeDbStatuses[safeStepIndex] : currentStep;
    const newStep = activeDbStatuses.length > 0 ? activeDbStatuses[Math.min(newIndex, activeDbStatuses.length - 1)] : nextStep;

    // Record step change to database
    await recordStatusEvent({
      operating_room_id: room.id,
      event_type: 'step_change',
      step_index: newIndex,
      step_name: previousStep?.name || 'Status',
      duration_seconds: durationSeconds,
      metadata: { 
        previous_step: previousStep?.name || 'Status',
        previous_step_index: currentStepIndex,
      },
    });

    // Record operation start/end events
    if (newIndex === 1 && currentStepIndex === 0) {
      // Starting operation
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_start',
        step_index: newIndex,
        step_name: newStep?.name || 'Status',
      });
    } else if (newIndex === 0 && currentStepIndex === validStepCount - 1) {
      // Ending operation (completing last step)
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_end',
        duration_seconds: durationSeconds,
        metadata: { completed_step: previousStep?.name || 'Status' },
      });
    }

    onStepChange(newIndex);
    setPhaseStartTime(new Date());
  };

  const handleNextStep = () => {
    console.log('[v0] handleNextStep called:', { safeStepIndex, validStepCount, isInteractionBlocked });
    
    if (isInteractionBlocked) {
      console.log('[v0] handleNextStep blocked');
      return;
    }
    
    let nextIndex = safeStepIndex + 1;
    if (nextIndex >= validStepCount) {
      nextIndex = 0;
    }
    
    // Prevent loop back if locked
    if (room.isLocked && nextIndex === 0) {
      console.log('[v0] handleNextStep - locked, cannot reset');
      return;
    }

    console.log('[v0] handleNextStep - calling changeStep with:', nextIndex);
    changeStep(nextIndex);
  };
  
  const roundUpTo15Min = (date: Date): Date => {
    const newDate = new Date(date.getTime());
    const minutes = newDate.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      newDate.setMinutes(minutes + (15 - remainder));
    }
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const snapTo15Min = (date: Date): Date => {
    const newDate = new Date(date.getTime());
    const minutes = newDate.getMinutes();
    const remainder = minutes % 15;
    newDate.setMinutes(minutes - remainder);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };
  
  const handleIncreaseTime = () => {
    if (isInteractionBlocked) return;
  
    let newTime;
    if (estimatedEndTime === null) {
      // First press: round up current time to next 15-min boundary
      newTime = roundUpTo15Min(new Date());
    } else {
      // Snap current time to 15-min floor, then add 15 minutes
      const snapped = snapTo15Min(estimatedEndTime);
      newTime = new Date(snapped.getTime() + 15 * 60 * 1000);
    }
    onEndTimeChange(newTime);
  
    if (endTimeTimeoutRef.current) {
      clearTimeout(endTimeTimeoutRef.current);
    }
    setShowEndTime(true);
    endTimeTimeoutRef.current = window.setTimeout(() => {
      setShowEndTime(false);
    }, 2000);
  };
  
  const handleDecreaseTime = () => {
    if (isInteractionBlocked || estimatedEndTime === null) return;
  
    // Simple: subtract 15 minutes, allow down to current time
    const newTime = new Date(estimatedEndTime.getTime() - 15 * 60 * 1000);
    const now = new Date();
    
    // Only block if new time would be in the past
    if (newTime <= now) return;
  
    onEndTimeChange(newTime);
  
    if (endTimeTimeoutRef.current) {
      clearTimeout(endTimeTimeoutRef.current);
    }
    setShowEndTime(true);
    endTimeTimeoutRef.current = window.setTimeout(() => {
      setShowEndTime(false);
    }, 2000);
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ========== MOBILE LAYOUT (md:hidden) ========== */}
      <div className="md:hidden w-full h-full overflow-y-auto">
        {/* Dark gradient background like reference */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[#0d0d14]" />
          <div 
            className="absolute inset-0 opacity-[0.08]" 
            style={{ background: `radial-gradient(ellipse at 50% 30%, ${activeColor}, transparent 70%)` }} 
          />
          {room.isEnhancedHygiene && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.12) 100%)' }} />
          )}
        </div>

        <div className="relative z-10 flex flex-col h-full min-h-screen pb-20">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <button onClick={onClose} className="p-2 -ml-2">
              <ChevronLeft className="w-6 h-6 text-white/60" />
            </button>
            <p className="text-3xl font-black text-white tracking-tight">{room.name}</p>
            <button onClick={onClose} className="p-2 -mr-2">
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          {/* Main circular progress area */}
          <div className="flex flex-col items-center px-6 pt-2">
            {/* Velký kruh */}
            <div className="relative w-72 h-72 mb-3">
              {/* SVG kruh - overflow visible aby záře nebyla oříznutá */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* SVG filter pro kruhovou záři - žádný čtvercový artefakt */}
                  <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Track kruh */}
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />

                {/* Záře vrstva - průhledný kruh s filtrem blur */}
                <motion.circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`}
                  initial={false}
                  animate={{
                    strokeDasharray: `${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`,
                    opacity: [0.25, 0.45, 0.25],
                  }}
                  transition={{
                    strokeDasharray: { duration: 0.6, ease: 'easeOut' },
                    opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  style={{ filter: 'url(#glow-filter)' }}
                />

                {/* Hlavní progress kruh */}
                <motion.circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={`${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`}
                  initial={false}
                  animate={{ strokeDasharray: `${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </svg>

              {/* Center content - větší text ve dvou řádcích, bez čísla fáze */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
                <p className="text-3xl font-black text-white text-center leading-tight whitespace-pre-line">
                  {room.isEmergency
                    ? 'Stav\nnouze'
                    : room.isLocked
                    ? 'Sál\nuzamčen'
                    : (currentStep?.name
                        ? currentStep.name.includes(' ')
                          ? currentStep.name.replace(/^(\S+)\s/, '$1\n')
                          : currentStep.name
                        : 'Status')}
                </p>
              </div>
            </div>

            {/* Čas pod kruhem */}
            <div className="text-center mb-2">
              <p className="text-4xl font-mono font-black tracking-tight" style={{ color: activeColor }}>
                {elapsedTime}
              </p>
              <p className="text-xs font-medium text-white/40 mt-0.5 uppercase tracking-wider">Čas ve fázi</p>
            </div>

            {/* Step indicator dots - centrované */}
            <div className="flex items-center justify-center gap-2">
              {activeDbStatuses.map((status, idx) => (
                <motion.div
                  key={status.id}
                  className="rounded-full"
                  style={{ width: idx === safeStepIndex ? 24 : 8, height: 8, backgroundColor: idx === safeStepIndex ? activeColor : 'rgba(255,255,255,0.15)' }}
                  animate={{ width: idx === safeStepIndex ? 24 : 8, backgroundColor: idx === safeStepIndex ? activeColor : 'rgba(255,255,255,0.15)' }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-4" />

          {/* Bottom section */}
          <div className="px-5 pb-4 space-y-2.5">
            {/* CTA tlačítko - větší */}
            {!isInteractionBlocked && (
              <motion.button
                onClick={handleNextStep}
                className="w-full rounded-2xl py-6 font-bold text-lg tracking-wide"
                style={{ backgroundColor: activeColor, color: '#000', boxShadow: `0 8px 32px ${activeColor}40` }}
                whileTap={{ scale: 0.98 }}
              >
                {isFinalStep ? 'Nový cyklus' : 'Spustit další fázi'}
              </motion.button>
            )}

            {/* Info cards row - Lékař + Sestra */}
            <div className="grid grid-cols-2 gap-2">
              {/* Estimated end time - full width, stejná výška jako CTA */}
              <div className="col-span-2 rounded-2xl px-5 py-5 bg-[#1a1a24] border border-white/[0.06] flex items-center justify-between gap-3">
                <button
                  onClick={handleDecreaseTime}
                  disabled={isInteractionBlocked || !estimatedEndTime}
                  className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform flex-shrink-0"
                >
                  <Minus className="w-5 h-5 text-white/80" />
                </button>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">Ukončení</p>
                  <p className="text-xl font-mono font-bold text-white leading-none whitespace-nowrap">
                    {estimatedEndTime && !isFinalStep ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
                <button
                  onClick={handleIncreaseTime}
                  disabled={isInteractionBlocked}
                  className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform flex-shrink-0"
                >
                  <Plus className="w-5 h-5 text-white/80" />
                </button>
              </div>

              {/* Lékař */}
              <div className="rounded-2xl p-3.5 bg-[#1a1a24] border border-white/[0.06]">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Lékař</p>
                <p className="text-sm font-bold text-white/90 leading-snug line-clamp-2">{room.staff.doctor.name}</p>
              </div>

              {/* Sestra */}
              <div className="rounded-2xl p-3.5 bg-[#1a1a24] border border-white/[0.06]">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Sestra</p>
                <p className="text-sm font-bold text-white/90 leading-snug line-clamp-2">{room.staff.nurse.name}</p>
              </div>
            </div>

            {/* Action buttons - 4 columns */}
            <div className="grid grid-cols-4 gap-2">
              {/* Pause */}
              <button
                onClick={async () => {
                  const newPaused = !isPaused;
                  setIsPaused(newPaused);
                  await updateOperatingRoom(room.id, { is_paused: newPaused });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: newPaused ? 'pause' : 'resume', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                }}
                className="rounded-2xl py-3.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: isPaused ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isPaused ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)'}` }}
              >
                {isPaused ? <Play className="w-5 h-5 text-cyan-400" /> : <Pause className="w-5 h-5 text-white/50" />}
                <span className="text-[9px] font-semibold uppercase tracking-wide text-white/50">{isPaused ? 'Play' : 'Pauza'}</span>
              </button>

              {/* Hygiene */}
              <button
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: newH ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                }}
                className="rounded-2xl py-3.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: room.isEnhancedHygiene ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${room.isEnhancedHygiene ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)'}` }}
              >
                <ShieldAlert className={`w-5 h-5 ${room.isEnhancedHygiene ? 'text-orange-400' : 'text-white/50'}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wide text-white/50">Hygiena</span>
              </button>

              {/* Patient call */}
              <button
                onClick={async () => {
                  if (!patientCalledTime) {
                    const now = new Date();
                    setPatientCalledTime(now);
                    setShowPatientCalledText(true);
                    setTimeout(() => setShowPatientCalledText(false), 5000);
                    await updateOperatingRoom(room.id, { patient_called_at: now.toISOString() });
                    await recordStatusEvent({ operating_room_id: room.id, event_type: 'patient_call', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                  }
                }}
                disabled={!!patientCalledTime}
                className="rounded-2xl py-3.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: patientCalledTime ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${patientCalledTime ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}` }}
              >
                <Phone className={`w-5 h-5 ${patientCalledTime ? 'text-green-400' : 'text-white/50'}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wide text-white/50">{patientCalledTime ? patientCallElapsedTime : 'Volat'}</span>
              </button>

              {/* Patient arrived */}
              <button
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                    setTimeout(() => {
                      setShowPatientArrivedText(false);
                      setPatientCalledTime(null);
                      setPatientArrivedTime(null);
                      updateOperatingRoom(room.id, { patient_called_at: null, patient_arrived_at: null });
                      setPatientCallElapsedTime('00:00');
                    }, 5000);
                    await updateOperatingRoom(room.id, { patient_arrived_at: now.toISOString() });
                    await recordStatusEvent({ operating_room_id: room.id, event_type: 'patient_arrived', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                  }
                }}
                disabled={!patientCalledTime || !!patientArrivedTime}
                className="rounded-2xl py-3.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-30"
                style={{ backgroundColor: patientArrivedTime ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${patientArrivedTime ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}` }}
              >
                <BedDouble className={`w-5 h-5 ${patientArrivedTime ? 'text-purple-400' : 'text-white/50'}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wide text-white/50">Příjezd</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (hidden on mobile) ========== */}
      <div className="hidden md:block w-full h-full overflow-hidden">
      {/* Status Overlay Effects */}
      {room.isEmergency && (
        <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-red-500/30" />
      )}
      {room.isLocked && !room.isEmergency && (
        <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-amber-500/20" />
      )}

      {/* Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000" 
          alt="Operating Environment" 
          className="w-full h-full object-cover opacity-20 grayscale scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.9)_100%)]" />
      </div>

      {/* Atmospheric Edge Glows - static, color via inline style */}
      <div 
        className="absolute -left-10 top-0 bottom-0 w-44 blur-[140px] z-10 opacity-30 transition-colors duration-700"
        style={{ backgroundColor: activeColor }}
      />
      <div 
        className="absolute -right-10 top-0 bottom-0 w-44 blur-[140px] z-10 opacity-30 transition-colors duration-700"
        style={{ backgroundColor: activeColor }}
      />

      {/* Header */}
      <header className="absolute top-12 left-40 right-16 flex justify-between items-start z-50">
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={room.name + room.isEmergency + room.isLocked}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-6"
            >
              <h1 className={`text-6xl font-bold tracking-tight uppercase leading-none 
                ${room.isEmergency ? 'text-red-500' : (room.isLocked ? 'text-amber-500' : 'text-white/95')}
              `}>
                {room.name}
              </h1>
              
              {room.isEmergency && (
                <div className="bg-red-500 text-white px-6 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <AlertTriangle className="w-8 h-8" />
                  <span className="text-2xl font-black uppercase tracking-widest">EMERGENCY</span>
                </div>
              )}
              
              {room.isLocked && !room.isEmergency && (
                <div className="bg-amber-500 text-white px-6 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <Lock className="w-7 h-7" />
                  <span className="text-2xl font-black uppercase tracking-widest">SÁL UZAMČEN</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="text-[11px] font-black text-white/30 tracking-[0.5em] uppercase mt-5">CHIRURGICKÝ BLOK • OVLÁDÁNÍ SÁLU</p>
        </div>
      </header>

      {/* ENHANCED HYGIENE MODE - subtle red vignette only */}
      {room.isEnhancedHygiene && (
        <div
          className="fixed inset-0 pointer-events-none z-[100]"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(239,68,68,0.08) 80%, rgba(239,68,68,0.18) 100%)',
            boxShadow: 'inset 0 0 120px rgba(239,68,68,0.15)'
          }}
        />
      )}

      {/* Right Column Action Buttons - Absolute Positioning */}
      {/* Close Button - Top Right */}
      <button 
        onClick={onClose}
        className="absolute top-2 sm:top-4 md:top-6 lg:top-8 right-2 sm:right-4 md:right-6 lg:right-8 p-2 sm:p-3 md:p-4 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex items-center justify-center h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 z-50"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
      </button>

      {/* ARO Staff Names - Top Right next to close button */}
      <div className="absolute top-8 right-40 flex flex-row gap-3 h-24 z-40">
        {room.staff.anesthesiologist?.name && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md whitespace-nowrap flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" style={{ color: activeColor }} />
              <span className="text-sm font-bold" style={{ color: activeColor }}>{room.staff.anesthesiologist.name}</span>
            </div>
          </div>
        )}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md whitespace-nowrap flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: '#c0bdb7' }} />
            <span className="text-sm font-bold" style={{ color: '#c0bdb7' }}>{room.staff.nurse.name}</span>
          </div>
        </div>
      </div>


      {/* Right Side Buttons Container - All 4 buttons in one row */}
      <div className="absolute right-2 sm:right-3 md:right-4 lg:right-8 bottom-6 sm:bottom-8 md:bottom-12 lg:bottom-16 flex flex-row gap-2 sm:gap-3 md:gap-4 z-50">
        {/* VOLAT and PŘÍJEZD Container - Vertical */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          {/* Volat Button */}
          <motion.button
            onClick={async () => {
              if (!patientCalledTime) {
                setPatientCalledTime(new Date());
    setShowPatientCalledText(true);
    setTimeout(() => setShowPatientCalledText(false), 5000);
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: 'patient_call',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                });
              }
            }}
            disabled={!!patientCalledTime}
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-1 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 disabled:cursor-not-allowed ${
              patientCalledTime && !patientArrivedTime
                ? 'bg-green-500/20 border-green-500/40 opacity-100 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : patientArrivedTime
                ? 'bg-white/5 border-white/10 opacity-60'
                : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {patientCalledTime && !patientArrivedTime ? (
                <motion.div
                  key="call-timer"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-1"
                >
                  <Phone className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-green-300" strokeWidth={2} />
                  <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-tighter font-mono tabular-nums text-green-300 leading-none">
                    {patientCallElapsedTime}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="call-idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Phone className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${patientArrivedTime ? 'text-white/30' : 'text-white/60'}`} strokeWidth={2} />
                  <span className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">Volat</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Příjezd Button */}
          <motion.button
            onClick={async () => {
              if (patientCalledTime && !patientArrivedTime) {
                const arrivalTime = new Date();
                const waitDuration = Math.floor((arrivalTime.getTime() - patientCalledTime.getTime()) / 1000);
                setPatientArrivedTime(arrivalTime);
                await updateOperatingRoom(room.id, { patient_arrived_at: arrivalTime.toISOString() });
                setShowPatientArrivedText(true);
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: 'patient_arrival',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                  duration_seconds: waitDuration,
                  metadata: { call_time: patientCalledTime.toISOString() },
                });
  setTimeout(() => {
    setShowPatientArrivedText(false);
    setPatientCalledTime(null);
    setPatientArrivedTime(null);
    updateOperatingRoom(room.id, { patient_called_at: null, patient_arrived_at: null });
    setPatientCallElapsedTime('00:00');
  }, 5000);
              }
            }}
            disabled={!patientCalledTime || !!patientArrivedTime}
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 disabled:cursor-not-allowed ${
              patientArrivedTime
                ? 'bg-blue-500/20 border-blue-500/40 opacity-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : !patientCalledTime
                ? 'bg-white/5 border-white/10 opacity-40'
                : 'bg-blue-500/10 border-blue-500/30 opacity-100 hover:opacity-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserCheck className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${patientArrivedTime ? 'text-blue-300' : patientCalledTime ? 'text-blue-300' : 'text-white/60'}`} strokeWidth={2} />
            <span className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-white/60">Příjezd</span>
          </motion.button>
        </div>

        {/* HYGIENA and PAUZA Container - Vertical */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          {/* Enhanced Hygiene Mode Toggle */}
          <motion.button
            onClick={async () => {
              const newHygieneState = !room.isEnhancedHygiene;
              onEnhancedHygieneToggle?.(newHygieneState);
              await updateOperatingRoom(room.id, { is_enhanced_hygiene: newHygieneState });
              await recordStatusEvent({
                operating_room_id: room.id,
                event_type: newHygieneState ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
                step_index: currentStepIndex,
                step_name: currentStep.title,
              });
            }}
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 ${
              room.isEnhancedHygiene
                ? 'bg-orange-500/20 border-orange-500/40 opacity-100 shadow-[0_0_20px_rgba(255,107,53,0.5)]'
                : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ShieldAlert className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`} strokeWidth={2} />
            <span className={`text-[4px] sm:text-[5px] md:text-[6px] lg:text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`}>
              Hygien.
            </span>
          </motion.button>

          {/* Pause Button */}
          {!(room.isLocked && isFinalStep) && (
            <motion.button
              onClick={async () => {
                const newPaused = !isPaused;
                setIsPaused(newPaused);
                await updateOperatingRoom(room.id, { is_paused: newPaused });
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: newPaused ? 'pause' : 'resume',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                });
              }}
              className={`rounded-2xl transition-all backdrop-blur-md opacity-40 hover:opacity-100 flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 ${
                isPaused
                  ? 'bg-cyan-500/20 border-cyan-500/40 opacity-100 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                  : 'bg-white/5 border-white/10'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? (
                <Play className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 text-cyan-300`} strokeWidth={2} />
              ) : (
                <Pause className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 text-white/60`} strokeWidth={2} />
              )}
              <span className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">{isPaused ? 'Pokr.' : 'Pauza'}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Three-Circle Status Display */}
      <main className="w-full h-full flex items-center justify-center relative z-20">
        {/* Background decorative ring */}
        <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5" />
        <div className="absolute w-[750px] h-[750px] rounded-full border border-dashed border-white/[0.03]" />
        
        <div className="flex items-center justify-center gap-1 sm:gap-3 md:gap-8 lg:gap-20 relative">
          {/* Previous Step - Left Circle (smaller) */}
          {(() => {
const prevStepIdx = currentStepIndex === 0 ? validStepCount - 1 : currentStepIndex - 1;
const prevStep = activeDbStatuses.length > 0 
  ? activeDbStatuses[Math.min(prevStepIdx, activeDbStatuses.length - 1)]
  : currentStep;
            return (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] md:w-[200px] md:h-[200px] lg:w-[280px] lg:h-[280px] flex items-center justify-center"
              >
                {/* Gradient Glow - transparent from center */}
                <div 
                  className="absolute inset-0 rounded-full blur-[60px] transition-colors duration-700"
                  style={{
                    background: `radial-gradient(circle at center, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 100%)`
                  }}
                />
                
                {/* Ring */}
                <div 
                  className="absolute inset-0 rounded-full border-2 opacity-30 transition-colors duration-500"
                  style={{ borderColor: 'rgba(255,255,255,0.3)' }}
                />
                
                {/* Inner content */}
                <div className="relative z-10 text-center px-4">
                  <p className="text-[5px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-black tracking-[0.2em] uppercase text-white/25 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
                    DOKONČENÁ FÁZE
                  </p>
                  <h3 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
                    {prevStep.title}
                  </h3>
                </div>
              </motion.div>
            );
          })()}

          {/* Current Step - Center Circle (large, interactive) */}
          <motion.button
            onClick={handleNextStep}
            disabled={isInteractionBlocked}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`relative w-[180px] h-[180px] sm:w-[250px] sm:h-[250px] md:w-[350px] md:h-[350px] lg:w-[500px] lg:h-[500px] flex items-center justify-center rounded-full group transition-all focus:outline-none z-10
              ${isInteractionBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
            whileTap={isInteractionBlocked ? {} : { scale: 0.96 }}
          >
            {/* Primary Background Glow - subtle */}
            <div 
              className="absolute inset-0 rounded-full blur-[100px] transition-colors duration-700"
              style={{ 
                backgroundColor: activeColor,
                opacity: (room.isEmergency || room.isLocked) ? 0.45 : 0.25,
              }}
            />

            {/* Inner Glow Core - subtle */}
            <div 
              className="absolute inset-10 rounded-full blur-[80px] opacity-20 transition-colors duration-500"
              style={{ backgroundColor: activeColor }}
            />

            {/* Animated Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.0]" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet">
              <circle cx="250" cy="250" r="230" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
              <motion.circle 
                key={currentStepIndex}
                cx="250" cy="250" r="230" fill="none"
                stroke={activeColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray="1447"
                initial={{ strokeDashoffset: 1447 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 15px ${activeColor}88)` }}
                className="opacity-80"
              />
            </svg>

            {/* Subtle Pulsing Animation Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: activeColor }}
              animate={{ 
                scale: [1, 1.08, 1],
                opacity: [0.4, 0.1, 0.4]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Enhanced Hygiene subtle indicator */}
            <AnimatePresence>
              {room.isEnhancedHygiene && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-full"
                  style={{
                    background: 'radial-gradient(circle at center, transparent 40%, rgba(16, 185, 129, 0.04) 50%, rgba(16, 185, 129, 0.02) 65%, transparent 75%)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Center Content */}
            <div className="text-center relative z-20 pointer-events-none px-8">
              <AnimatePresence mode="wait">
                {room.isLocked && isFinalStep ? (
                  <motion.div
                    key="locked-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center"
                  >
                    <Lock className="w-20 h-20 text-white mb-4" />
                    <h2 className="text-5xl font-black tracking-tighter text-white uppercase">
                      UZAMČENO
                    </h2>
                  </motion.div>
                ) : showEndTime && estimatedEndTime ? (
                  <motion.div
                    key="end-time-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <h2 className="text-7xl font-black tracking-tighter text-white font-mono">
                      {estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </h2>
                  </motion.div>
                ) : showPatientCalledText ? (
                  <motion.div
                    key="patient-called-text"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/25">
                      SPECIÁLNÍ STAV
                    </p>
                    {/* Animované sluchátko */}
                    <motion.div
                      animate={{ rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.1, 1.1, 1.1, 1.1, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
                      style={{ color: activeColor }}
                    >
                      <Phone className="w-20 h-20" strokeWidth={1.5} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-5xl font-bold tracking-tight leading-tight text-center text-white"
                    >
                      Volání<br/>pacienta
                    </motion.h2>
                  </motion.div>
                ) : showPatientArrivedText ? (
                  <motion.div
                    key="patient-arrived-text"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/25">
                      SPECIÁLNÍ STAV
                    </p>
                    {/* Animovaná postel s pojezdem */}
                    <motion.div
                      animate={{ x: [0, 14, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }}
                      style={{ color: activeColor }}
                    >
                      <BedDouble className="w-20 h-20" strokeWidth={1.5} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-5xl font-bold tracking-tight leading-tight text-center text-white"
                    >
                      Příjezd<br/>pacienta
                    </motion.h2>
                  </motion.div>
                ) : isPaused ? (
                  <motion.div
                    key="pause-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <h2 className="text-7xl font-black tracking-tighter text-white uppercase">
                      PAUZA
                    </h2>
                  </motion.div>
                ) : (
                  <motion.div
                    key="current-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className={`text-[10px] font-black tracking-[0.2em] mb-6 uppercase ${room.isEmergency ? 'text-red-400' : 'text-white/25'}`}>
                      PROBÍHAJÍCÍ FÁZE
                    </p>
                    
                    <motion.h2
                      key={currentStep.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-6xl font-bold tracking-tight leading-tight mb-6 ${room.isEmergency ? 'text-red-400' : 'text-white'}`}
                    >
                      {currentStep.title}
                    </motion.h2>

                    {/* Time display under title */}
                    <div className="mt-3 sm:mt-6 md:mt-8 lg:mt-10">
                      <span className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter font-mono tabular-nums ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white')}`}>
                        {isPaused ? pauseElapsedTime : elapsedTime}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

          {/* Next Step - Right Circle */}
          <motion.div
            onClick={handleNextStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] md:w-[200px] md:h-[200px] lg:w-[280px] lg:h-[280px] flex items-center justify-center cursor-pointer"
          >
            {/* Glow - gradient transparent from center */}
            <div 
              className="absolute inset-0 rounded-full blur-[60px] transition-colors duration-700"
              style={{
                background: `radial-gradient(circle at center, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 100%)`
              }}
            />
            
            {/* Ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 opacity-30 transition-colors duration-500"
              style={{ borderColor: 'rgba(255,255,255,0.3)' }}
            />
            
            {/* Inner content */}
            <div className="relative z-10 text-center px-4">
              <p className="text-[5px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-black tracking-[0.2em] uppercase text-white/25 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
                {isFinalStep ? 'NOVÝ CYKLUS' : 'NÁSLEDUJÍCÍ FÁZE'}
              </p>
              <h3 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
                {nextStep.title}
              </h3>
            </div>
          </motion.div>
        </div>
        
        {/* Time adjustment buttons - positioned between small and center circles on sides */}
        {!isInteractionBlocked && (
          <>
            {/* Minus button - left side */}
            <button 
              onClick={handleDecreaseTime}
              className="absolute w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full border-2 flex items-center justify-center opacity-80 hover:opacity-90 transition-opacity cursor-pointer backdrop-blur-md shadow-lg z-50"
              style={{
                borderColor: `${activeColor}66`,
                backgroundColor: 'rgba(255,255,255,0.03)',
                left: '30%',
                top: 'calc(50% + 320px)',
                transform: 'translateY(-50%)'
              }}
            >
              <Minus className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-white" strokeWidth={2} />
            </button>

            {/* Plus button - right side */}
            <button 
              onClick={handleIncreaseTime}
              className="absolute w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full border-2 flex items-center justify-center opacity-80 hover:opacity-90 transition-opacity cursor-pointer backdrop-blur-md shadow-lg z-50"
              style={{
                borderColor: `${activeColor}66`,
                backgroundColor: 'rgba(255,255,255,0.03)',
                right: '30%',
                top: 'calc(50% + 320px)',
                transform: 'translateY(-50%)'
              }}
            >
              <Plus className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 text-white" strokeWidth={2} />
            </button>
          </>
        )}
      </main>

      {/* Bottom Center - Phase Duration & Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
        {/* Navigation Indicators - only show active statuses */}
        <div className="flex gap-3">
        {activeDbStatuses.map((status, index) => (
          <div 
            key={status.id} 
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: index === Math.min(currentStepIndex, activeDbStatuses.length - 1) ? 32 : 8,
              backgroundColor: index === Math.min(currentStepIndex, activeDbStatuses.length - 1) ? activeColor : 'rgba(255,255,255,0.15)',
              opacity: index === Math.min(currentStepIndex, activeDbStatuses.length - 1) ? 1 : 0.4
            }}
          />
        ))}
        </div>
      </div>
      </div>{/* end desktop wrapper */}
    </motion.div>
  );
};

export default RoomDetail;
