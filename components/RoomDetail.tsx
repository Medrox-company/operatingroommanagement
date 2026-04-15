
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity, BedDouble, ChevronLeft
} from 'lucide-react';
import { recordStatusEvent, updateOperatingRoom, fetchBackgroundSettings, BackgroundSettings } from '../lib/db';
import StaffPickerModal, { StaffRole } from './StaffPickerModal';

interface RoomDetailProps {
  room: OperatingRoom;
  allRooms?: OperatingRoom[];
  onClose: () => void;
  onStepChange: (index: number, stepColor?: string) => void;
  onEndTimeChange: (newTime: Date | null) => void;
  onEnhancedHygieneToggle?: (enabled: boolean) => void;
  onStaffChange?: (role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => void;
  onPatientStatusChange?: (calledAt: string | null, arrivedAt: string | null) => void;
}

const usePrevious = (value: number) => {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room, allRooms = [], onClose, onStepChange, onEndTimeChange, onEnhancedHygieneToggle, onStaffChange, onPatientStatusChange }) => {
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Add null safety fallback to prevent crashes if context is not ready
  const activeDbStatuses = workflowStatuses || [];

  const [phaseStartTime, setPhaseStartTime] = useState(() => new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isPaused, setIsPaused] = useState(room.isPaused || false);
  const [pauseElapsedTime, setPauseElapsedTime] = useState('00:00');
  const [showEndTime, setShowEndTime] = useState(false);
  const endTimeTimeoutRef = useRef<number | null>(null);
  const [patientCalledTime, setPatientCalledTime] = useState<Date | null>(room.patientCalledAt ? new Date(room.patientCalledAt) : null);
  const [patientArrivedTime, setPatientArrivedTime] = useState<Date | null>(room.patientArrivedAt ? new Date(room.patientArrivedAt) : null);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings | null>(null);
  const [staffPickerRole, setStaffPickerRole] = useState<'doctor' | 'nurse'>('doctor');
  const [pendingStepIndex, setPendingStepIndex] = useState<number | null>(null);
  const [patientCallElapsedTime, setPatientCallElapsedTime] = useState('00:00');
  const [showPatientCalledText, setShowPatientCalledText] = useState(false);
  const [showPatientArrivedText, setShowPatientArrivedText] = useState(false);
  const patientCallTimerRef = useRef<number | null>(null);

  // Simple local state for estimated end time - initialized from props
  const [localEndTime, setLocalEndTime] = useState<Date | null>(() => 
    room.estimatedEndTime ? new Date(room.estimatedEndTime) : null
  );
  const updateTimeoutRef = useRef<number | null>(null);
  const isLocalUpdateRef = useRef(false); // Track if update came from local buttons
  
  // Cleanup all timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (endTimeTimeoutRef.current) clearTimeout(endTimeTimeoutRef.current);
      if (patientCallTimerRef.current) clearInterval(patientCallTimerRef.current);
    };
  }, []);
  
  // Sync with props only when not actively editing locally
  useEffect(() => {
    if (isLocalUpdateRef.current) return; // Skip if local update in progress
    const propsTime = room.estimatedEndTime ? new Date(room.estimatedEndTime) : null;
    setLocalEndTime(propsTime);
  }, [room.estimatedEndTime]);
  
  const estimatedEndTime = localEndTime;

  // Update elapsed time every second
  useEffect(() => {
    if (isPaused) return;
    
    const updateElapsedTime = () => {
      const now = new Date();
      const diff = now.getTime() - phaseStartTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setElapsedTime(`${minutes}:${seconds}`);
    };
    
    updateElapsedTime();
    const timer = setInterval(updateElapsedTime, 1000);
    
    return () => clearInterval(timer);
  }, [phaseStartTime, isPaused]);

  // Update pause time every second
  useEffect(() => {
    if (!isPaused) {
      setPauseElapsedTime('00:00');
      return;
    }

    const pauseStartTime = new Date();
    const updatePauseTime = () => {
      const now = new Date();
      const diff = now.getTime() - pauseStartTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setPauseElapsedTime(`${minutes}:${seconds}`);
    };
    
    updatePauseTime();
    const timer = setInterval(updatePauseTime, 1000);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Load background settings and listen for changes
  useEffect(() => {
    const loadBackgroundSettings = async () => {
      const settings = await fetchBackgroundSettings();
      if (settings) setBackgroundSettings(settings);
    };
    loadBackgroundSettings();

    const handleBackgroundChange = (e: CustomEvent<BackgroundSettings>) => {
      setBackgroundSettings(e.detail);
    };
    window.addEventListener('backgroundSettingsChanged', handleBackgroundChange as EventListener);
    return () => {
      window.removeEventListener('backgroundSettingsChanged', handleBackgroundChange as EventListener);
    };
  }, []);

  // Patient call timer - update every second
  useEffect(() => {
    if (!patientCalledTime || patientArrivedTime) return;

    const updatePatientCallTime = () => {
      const now = new Date();
      const diff = now.getTime() - patientCalledTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setPatientCallElapsedTime(`${minutes}:${seconds}`);
    };
    
    updatePatientCallTime();
    patientCallTimerRef.current = window.setInterval(updatePatientCallTime, 1000);

    return () => {
      if (patientCallTimerRef.current) clearInterval(patientCallTimerRef.current);
    };
  }, [patientCalledTime, patientArrivedTime]);

  useEffect(() => {
    if (patientArrivedTime && patientCallTimerRef.current) {
      clearInterval(patientCallTimerRef.current);
    }
  }, [patientArrivedTime]);

  // Track if we're in the middle of a local reset to prevent sync overwriting
  const isResettingRef = useRef(false);

  // Sync local state with room object (for real-time updates from other devices)
  useEffect(() => {
    setIsPaused(room.isPaused || false);
  }, [room.isPaused]);

  useEffect(() => {
    // Don't sync if we're resetting locally
    if (isResettingRef.current) return;
    setPatientCalledTime(room.patientCalledAt ? new Date(room.patientCalledAt) : null);
  }, [room.patientCalledAt]);

  useEffect(() => {
    // Don't sync if we're resetting locally
    if (isResettingRef.current) return;
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
    : { name: 'Waiting', color: '#6B7280', title: 'Waiting' };
  
  const nextStepIndex = (safeStepIndex + 1) % Math.max(activeDbStatuses.length, 1);
  const nextStep = activeDbStatuses.length > 0
    ? activeDbStatuses[nextStepIndex]
    : currentStep;
  
  // Logic to determine if actions are allowed even if locked
  const validStepCount = activeDbStatuses.length > 0 ? activeDbStatuses.length : 1;
  const isFinalStep = activeDbStatuses.length > 0 && safeStepIndex === activeDbStatuses.length - 1;
  const isInteractionBlocked = isPaused || (room.isLocked && isFinalStep);
  
  // Don't show time only for "Sal priprav*" status (ASCII-safe)
  // Normalize string to remove diacritics for comparison
  const statusName = (currentStep?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isReadyStatus = statusName.includes('priprav');
  const shouldShowTime = !isReadyStatus;

  // Dynamic theme color based on status
  const activeColor = room.isEmergency 
    ? '#FF3B30' 
    : (room.isLocked 
        ? '#FBBF24' 
        : (isPaused ? '#06b6d4' : (currentStep?.color || '#6B7280')));

  const changeStep = async (newIndex: number) => {
    if (isInteractionBlocked) return;
    
    // SEQUENTIAL STEP RESTRICTION: Only allow next step (+1) or reset to 0 (from final step)
    const isNextStep = newIndex === safeStepIndex + 1;
    const isResetToStart = newIndex === 0 && safeStepIndex === validStepCount - 1;
    
    if (!isNextStep && !isResetToStart) return; // Block skipping steps
    
    // Additional security for locked state: only allow forward progression
    if (room.isLocked) {
      if (newIndex <= safeStepIndex && !isFinalStep) return;
      if (newIndex === 0) return; // Never allow starting over if locked
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
      // Starting operation (transitioning to "Příjezd na sál")
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_start',
        step_index: newIndex,
        step_name: newStep?.name || 'Status',
      });
      
      // Set default estimated end time: current time + 60 minutes, rounded to 15 min
      const defaultEndTime = roundUpTo15Min(new Date(now.getTime() + 60 * 60 * 1000));
      onEndTimeChange(defaultEndTime);
    } else if (newIndex === 0 && currentStepIndex === validStepCount - 1) {
      // Ending operation (completing last step)
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_end',
        step_index: currentStepIndex,
        step_name: 'Operation End',
        duration_seconds: durationSeconds,
        metadata: { 
          completed_step: previousStep?.name || 'Status',
          previous_step: previousStep?.name || 'Status',
        },
      });
      
      // Reset estimated end time when returning to "ready" status
      onEndTimeChange(null);
    }

    // Reset patient call/arrival status only when transitioning to "Příjezd na sál"
    // (patient is no longer waiting in pre-OR area)
    const newStepName = (newStep?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isArrivalToOR = newStepName.includes('prijezd na sal') || newStepName.includes('arrival');
    if (isArrivalToOR && (patientCalledTime || patientArrivedTime)) {
      // Prevent sync effects from overwriting during reset - keep flag on longer
      isResettingRef.current = true;
      // Update local state first (immediate)
      setPatientCalledTime(null);
      setPatientArrivedTime(null);
      setPatientCallElapsedTime('00:00');
      // Optimistic update in App.tsx (immediate, before DB)
      onPatientStatusChange?.(null, null);
      // Then persist to database (async, don't await to avoid blocking)
      updateOperatingRoom(room.id, { patient_called_at: null, patient_arrived_at: null });
      // Allow sync again after realtime update has likely arrived
      setTimeout(() => { isResettingRef.current = false; }, 1500);
    }

  // Pass the color of the new status for history tracking
  const newStepColor = newStep?.color || '#6B7280';
  onStepChange(newIndex, newStepColor);
  setPhaseStartTime(new Date());
  };

  const handleNextStep = () => {
    if (isInteractionBlocked) return;
    
    let nextIndex = safeStepIndex + 1;
    if (nextIndex >= validStepCount) {
      nextIndex = 0;
    }
    
    // Prevent loop back if locked
    if (room.isLocked && nextIndex === 0) return;

    // Show confirmation overlay instead of immediately changing
    setPendingStepIndex(nextIndex);
  };

  const confirmStepChange = () => {
    if (pendingStepIndex === null) return;
    changeStep(pendingStepIndex);
    setPendingStepIndex(null);
  };

  const cancelStepChange = () => {
    setPendingStepIndex(null);
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
    
    // Mark that we're doing a local update
    isLocalUpdateRef.current = true;
  
    setLocalEndTime(prev => {
      let newTime;
      if (prev === null) {
        newTime = roundUpTo15Min(new Date());
      } else {
        newTime = new Date(prev.getTime() + 15 * 60 * 1000);
      }
      
      // Debounce propagation to parent
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = window.setTimeout(() => {
        onEndTimeChange(newTime);
        // Allow props sync after debounce completes
        setTimeout(() => { isLocalUpdateRef.current = false; }, 100);
      }, 300);
      
      return newTime;
    });
  
    if (endTimeTimeoutRef.current) clearTimeout(endTimeTimeoutRef.current);
    setShowEndTime(true);
    endTimeTimeoutRef.current = window.setTimeout(() => setShowEndTime(false), 2000);
  };
  
  const handleDecreaseTime = () => {
    if (isInteractionBlocked || localEndTime === null) return;
    
    // Mark that we're doing a local update
    isLocalUpdateRef.current = true;

    setLocalEndTime(prev => {
      if (prev === null) return null;
      
      const newTime = new Date(prev.getTime() - 15 * 60 * 1000);
      
      // Block if new time would be before or equal to phase start time
      if (newTime <= phaseStartTime) return prev;
      
      // Debounce propagation to parent
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = window.setTimeout(() => {
        onEndTimeChange(newTime);
        // Allow props sync after debounce completes
        setTimeout(() => { isLocalUpdateRef.current = false; }, 100);
      }, 300);
      
      return newTime;
    });
  
    if (endTimeTimeoutRef.current) clearTimeout(endTimeTimeoutRef.current);
    setShowEndTime(true);
    endTimeTimeoutRef.current = window.setTimeout(() => setShowEndTime(false), 2000);
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ========== MOBILE LAYOUT (md:hidden) - LoginPage Design ========== */}
      <div className="md:hidden w-full h-full flex flex-col bg-[#0a0a0f] relative overflow-hidden">
        {/* Background Effects - same as LoginPage */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)` }} 
          />
          <div 
            className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #00D8C1 0%, transparent 70%)' }} 
          />
        </div>

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-95 outline-none select-none"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <h1 className="text-2xl font-bold text-white">{room.name}</h1>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-95 outline-none select-none"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Circular Progress with Status */}
          <div className="flex flex-col items-center relative py-4">
            {/* Text in circle - absolute positioning */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
              key={currentStep?.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center px-8">
                {(room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamčen' : currentStep?.name || 'Status')
                  .split(' ')
                  .map((word, i) => <div key={i} className="text-2xl font-bold text-white leading-tight">{word}</div>)}
              </div>
            </motion.div>
            
            {/* Pure SVG circle - no box container */}
            <svg width="240" height="240" viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
              <defs>
                <filter id="mobile-glow-ring" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Background track */}
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="2"
              />
              {/* Animated glow layer */}
              <motion.circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={activeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`}
                style={{ transformOrigin: '50px 50px', transform: 'rotate(-90deg)', filter: 'url(#mobile-glow-ring)' }}
                animate={{
                  strokeDasharray: `${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`,
                  opacity: [0.2, 0.45, 0.2]
                }}
                transition={{
                  strokeDasharray: { duration: 0.8, ease: 'easeOut' },
                  opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
                }}
              />
              {/* Main progress */}
              <motion.circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={activeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46`}
                style={{ transformOrigin: '50px 50px', transform: 'rotate(-90deg)' }}
                animate={{ strokeDasharray: `${((safeStepIndex + 1) / validStepCount) * 276.46} 276.46` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
          </div>

          {/* Main CTA Button - moved up */}
          {!isInteractionBlocked && (
            <button
              onClick={handleNextStep}
              className="w-full py-4 rounded-xl font-semibold text-white mb-4 active:scale-[0.98] outline-none select-none"
              style={{
                background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}80 100%)`,
                boxShadow: `0 0 30px ${activeColor}40`
              }}
            >
              {isFinalStep ? 'Nový cyklus' : 'Spustit další fázi'}
            </button>
          )}

          {/* Main Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex-1 flex flex-col">
            {/* End Time Control */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 mb-3">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-2 text-center">Ukončení</p>
              <div className="flex items-center justify-between">
            <button
              onClick={handleDecreaseTime}
              disabled={isInteractionBlocked || !estimatedEndTime}
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center disabled:opacity-30 active:scale-95 outline-none select-none"
            >
              <Minus className="w-4 h-4 text-white/60" />
            </button>
                <p className="text-2xl font-mono font-bold text-white">
                  {estimatedEndTime && shouldShowTime ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
            <button
                  onClick={handleIncreaseTime}
                  disabled={isInteractionBlocked}
                  className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center disabled:opacity-30 active:scale-95 outline-none select-none"
                >
                  <Plus className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={async () => {
                  const newPaused = !isPaused;
                  setIsPaused(newPaused);
                  await updateOperatingRoom(room.id, { is_paused: newPaused });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: newPaused ? 'pause' : 'resume', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 outline-none select-none ${
                  isPaused
                    ? 'bg-[#00D8C1]/20 border-[#00D8C1]/50'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                {isPaused ? <Play className="w-5 h-5 text-[#00D8C1]" /> : <Pause className="w-5 h-5 text-white/40" />}
                        <span className="text-[8px] font-medium text-white/40 uppercase">{isPaused ? 'Pokračovat' : 'Pauza'}</span>
              </button>

              <button
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: newH ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 outline-none select-none ${
                  room.isEnhancedHygiene
                    ? 'bg-orange-500/20 border-orange-500/50'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <ShieldAlert className={`w-5 h-5 ${room.isEnhancedHygiene ? 'text-orange-400' : 'text-white/40'}`} />
                <span className="text-[8px] font-medium text-white/40 uppercase">Hygiena</span>
              </button>

              <button
                onClick={async () => {
                  if (!patientCalledTime) {
                    const now = new Date();
                    setPatientCalledTime(now);
                    setShowPatientCalledText(true);
                    setTimeout(() => setShowPatientCalledText(false), 5000);
                  await updateOperatingRoom(room.id, { patient_called_at: now.toISOString() });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: 'patient_call', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                  onPatientStatusChange?.(now.toISOString(), null);
                  }
                }}
                disabled={!!patientCalledTime}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50 outline-none select-none ${
                  patientCalledTime
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <Phone className={`w-5 h-5 ${patientCalledTime ? 'text-green-400' : 'text-white/40'}`} />
                <span className="text-[8px] font-medium text-white/40 uppercase">{patientCalledTime ? patientCallElapsedTime : 'Volat'}</span>
              </button>

              <button
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                  await updateOperatingRoom(room.id, { patient_arrived_at: now.toISOString() });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: 'patient_arrived', step_index: currentStepIndex, step_name: currentStep?.name || 'Status' });
                  onPatientStatusChange?.(patientCalledTime!.toISOString(), now.toISOString());
                  // Just hide the text after 5 seconds, patient status stays in DB until step change
                    setTimeout(() => {
                      setShowPatientArrivedText(false);
                    }, 5000);
                  }
                }}
                disabled={!patientCalledTime || !!patientArrivedTime}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-30 outline-none select-none ${
                  patientArrivedTime
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <BedDouble className={`w-5 h-5 ${patientArrivedTime ? 'text-purple-400' : 'text-white/40'}`} />
                <span className="text-[8px] font-medium text-white/40 uppercase">Příjezd</span>
              </button>
            </div>

            {/* Staff Section */}
            <div className="grid grid-cols-2 gap-2">
              {/* Doctor */}
              <button
                onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all active:scale-[0.98] text-left w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/40 uppercase tracking-wide">Lékař</p>
                  <p className="text-xs font-medium text-white/80 truncate">{room?.staff?.doctor?.name || 'Nepřiřazen'}</p>
                </div>
              </button>
              {/* Nurse */}
              <button
                onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all active:scale-[0.98] text-left w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/40 uppercase tracking-wide">Sestra</p>
                  <p className="text-xs font-medium text-white/80 truncate">{room?.staff?.nurse?.name || 'Nepřiřazena'}</p>
                </div>
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
          src={backgroundSettings?.imageUrl || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000"} 
          alt="Operating Environment" 
          className="w-full h-full object-cover grayscale scale-105"
          style={{ 
            opacity: (backgroundSettings?.imageOpacity ?? 20) / 100,
            filter: `blur(${backgroundSettings?.imageBlur ?? 0}px) grayscale(1)`
          }}
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

      {/* Staff Names - Top Right next to close button (Desktop only) */}
      <div className="hidden lg:flex absolute top-8 right-40 flex-row gap-3 h-24 z-50">
        {/* Doctor Button */}
        <button
          onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md whitespace-nowrap flex flex-col justify-center gap-1 hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer active:scale-95 h-full"
        >
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-bold text-violet-300">{room?.staff?.doctor?.name || 'Vybrat lékaře'}</span>
          </div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider text-left">
            {room?.staff?.doctor?.name ? 'Kliknout pro správu' : 'Kliknout pro přiřazení'}
          </p>
        </button>
        {/* Nurse Button */}
        <button
          onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 backdrop-blur-md whitespace-nowrap flex flex-col justify-center gap-1 hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer active:scale-95 h-full"
        >
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-300">{room?.staff?.nurse?.name || 'Vybrat sestru'}</span>
          </div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider text-left">
            {room?.staff?.nurse?.name ? 'Kliknout pro správu' : 'Kliknout pro přiřazení'}
          </p>
        </button>
      </div>


      {/* Right Side Buttons Container - All 4 buttons in one row */}
      <div className="absolute right-2 sm:right-3 md:right-4 lg:right-8 bottom-6 sm:bottom-8 md:bottom-12 lg:bottom-16 flex flex-row gap-2 sm:gap-3 md:gap-4 z-50">
        {/* VOLAT and PŘÍJEZD Container - Vertical */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          {/* Volat Button */}
  <motion.button
            onClick={async () => {
              if (!patientCalledTime) {
                const now = new Date();
                setPatientCalledTime(now);
                setShowPatientCalledText(true);
                setTimeout(() => setShowPatientCalledText(false), 5000);
                await updateOperatingRoom(room.id, { patient_called_at: now.toISOString() });
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: 'patient_call',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                });
                onPatientStatusChange?.(now.toISOString(), null);
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
                onPatientStatusChange?.(patientCalledTime.toISOString(), arrivalTime.toISOString());
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: 'patient_arrival',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                  duration_seconds: waitDuration,
                  metadata: { call_time: patientCalledTime.toISOString() },
                });
                // Just hide the text after 5 seconds, keep patient status in database
                // Patient status will be reset when moving to next step
                setTimeout(() => {
                  setShowPatientArrivedText(false);
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
                <span className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">{isPaused ? 'Pokračovat' : 'Pauza'}</span>
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
                ) : showEndTime && estimatedEndTime && shouldShowTime ? (
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

                    {/* Time display under title - hide for "ready" status */}
                    {shouldShowTime && (
                      <div className="mt-3 sm:mt-6 md:mt-8 lg:mt-10">
                        <span className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter font-mono tabular-nums ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white')}`}>
                          {isPaused ? pauseElapsedTime : elapsedTime}
                        </span>
                      </div>
                    )}
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

      {/* Step Confirmation Overlay */}
      <AnimatePresence>
        {pendingStepIndex !== null && (() => {
          const pendingStep = activeDbStatuses[Math.min(pendingStepIndex, activeDbStatuses.length - 1)];
          const pendingColor = pendingStep?.color || '#6B7280';
          const isReset = pendingStepIndex === 0 && safeStepIndex === validStepCount - 1;

          return (
            <motion.div
              key="step-confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-[200] flex items-center justify-center"
              style={{ background: 'rgba(5, 5, 12, 0.85)', backdropFilter: 'blur(16px)' }}
            >
              {/* Decorative background rings */}
              <div className="absolute w-[700px] h-[700px] rounded-full border border-white/[0.04]" />
              <div className="absolute w-[750px] h-[750px] rounded-full border border-dashed border-white/[0.025]" />

              <div className="flex flex-col items-center gap-10 relative z-10">
                {/* Label */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <p className="text-[11px] font-black tracking-[0.4em] uppercase text-white/30 mb-3">
                    PŘECHOD NA NOVOU FÁZI
                  </p>
                  <p className="text-2xl font-bold text-white/80">
                    {isReset ? 'Nový cyklus' : pendingStep?.name || 'Další fáze'}
                  </p>
                </motion.div>

                {/* Two confirmation circles */}
                <div className="flex items-center gap-8 sm:gap-12 md:gap-20">

                  {/* POTVRDIT — green */}
                  <motion.button
                    onClick={confirmStepChange}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[220px] md:h-[220px] lg:w-[260px] lg:h-[260px] rounded-full flex items-center justify-center focus:outline-none cursor-pointer group"
                  >
                    {/* Glow */}
                    <div className="absolute inset-0 rounded-full blur-[60px] opacity-30 group-hover:opacity-50 transition-opacity duration-300 bg-emerald-500" />
                    {/* Animated SVG ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260" preserveAspectRatio="xMidYMid meet">
                      <circle cx="130" cy="130" r="118" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <motion.circle
                        cx="130" cy="130" r="118" fill="none"
                        stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="741"
                        initial={{ strokeDashoffset: 741 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        style={{ filter: 'drop-shadow(0 0 12px #10b98188)' }}
                      />
                    </svg>
                    {/* Pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-emerald-500/50"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.1, 0.5] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Inner background */}
                    <div className="absolute inset-4 rounded-full bg-emerald-500/10" />
                    {/* Label */}
                    <div className="relative z-10 text-center pointer-events-none">
                      <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                      <p className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-emerald-400">POTVRDIT</p>
                    </div>
                  </motion.button>

                  {/* ZRUŠIT — red */}
                  <motion.button
                    onClick={cancelStepChange}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[220px] md:h-[220px] lg:w-[260px] lg:h-[260px] rounded-full flex items-center justify-center focus:outline-none cursor-pointer group"
                  >
                    {/* Glow */}
                    <div className="absolute inset-0 rounded-full blur-[60px] opacity-25 group-hover:opacity-45 transition-opacity duration-300 bg-red-500" />
                    {/* Animated SVG ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260" preserveAspectRatio="xMidYMid meet">
                      <circle cx="130" cy="130" r="118" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <motion.circle
                        cx="130" cy="130" r="118" fill="none"
                        stroke="#ef4444" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="741"
                        initial={{ strokeDashoffset: 741 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        style={{ filter: 'drop-shadow(0 0 12px #ef444488)' }}
                      />
                    </svg>
                    {/* Pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-red-500/40"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.08, 0.4] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    />
                    {/* Inner background */}
                    <div className="absolute inset-4 rounded-full bg-red-500/10" />
                    {/* Label */}
                    <div className="relative z-10 text-center pointer-events-none">
                      <X className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-2 text-red-400" strokeWidth={2.5} />
                      <p className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-red-400">ZRUŠIT</p>
                    </div>
                  </motion.button>

                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Staff Picker Modal */}
      <StaffPickerModal
        isOpen={staffPickerOpen}
        onClose={() => setStaffPickerOpen(false)}
        onSelect={(staffId, staffName) => {
          if (onStaffChange) {
            onStaffChange(staffPickerRole, staffId, staffName);
          }
        }}
        onUnassign={() => {
          if (onStaffChange) {
            onStaffChange(staffPickerRole, '', '');
          }
        }}
        currentStaffId={staffPickerRole === 'doctor' ? room?.staff?.doctor?.id : room?.staff?.nurse?.id}
        currentStaffName={staffPickerRole === 'doctor' ? room?.staff?.doctor?.name : room?.staff?.nurse?.name}
        filterRole={staffPickerRole === 'doctor' ? 'DOCTOR' : 'NURSE'}
        title={staffPickerRole === 'doctor' ? 'Lékař — výběr a správa' : 'Sestra — výběr a správa'}
        allRooms={allRooms}
        currentRoomId={room.id}
      />
    </motion.div>
  );
};

export default RoomDetail;
