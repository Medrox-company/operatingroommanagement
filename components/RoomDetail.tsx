
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity, BedDouble, ChevronLeft, Bell
} from 'lucide-react';
import { recordStatusEvent, updateOperatingRoom, fetchBackgroundSettings, BackgroundSettings } from '../lib/db';
import StaffPickerModal, { StaffRole } from './StaffPickerModal';
import StepConfirmationOverlay from './StepConfirmationOverlay';
import NotificationOverlay from './NotificationOverlay';

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
  const [notificationOverlayOpen, setNotificationOverlayOpen] = useState(false);
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
      {/* ========== MOBILE LAYOUT (md:hidden) — Ultra-minimalist fintech style ========== */}
      <div
        className="md:hidden w-full h-full flex flex-col relative overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #13302a 0%, #0c1f1a 45%, #081512 100%)',
        }}
      >
        {/* Ambient glow — subtle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #0099FF 0%, transparent 65%)' }}
          />
        </div>

        {/* Content */}
        <div
          className="relative z-10 flex flex-col h-full px-5 pt-4 overflow-y-auto hide-scrollbar"
          style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Header — minimal */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 outline-none select-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <ChevronLeft className="w-[18px] h-[18px] text-white/70" strokeWidth={2} />
            </button>
            <div className="flex flex-col items-center flex-1 min-w-0 px-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40 leading-none">
                Operační sál
              </p>
              <h1 className="text-lg font-semibold text-white truncate mt-1.5 leading-none">
                {room.name}
              </h1>
            </div>
            <button
              onClick={() => setNotificationOverlayOpen(true)}
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 outline-none select-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Bell className="w-[18px] h-[18px] text-white/70" strokeWidth={2} />
            </button>
          </div>

          {/* Hero: Current phase card (minimal, no ring) */}
          <motion.div
            key={currentStep?.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Ambient accent behind text */}
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-30"
              style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 65%)` }}
            />

            <div className="relative flex items-start justify-between gap-3 mb-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/40 leading-none">
                Aktuální fáze
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: activeColor,
                    boxShadow: `0 0 8px ${activeColor}`,
                  }}
                />
                <span className="text-[10px] font-mono font-medium tabular-nums text-white/60 leading-none">
                  {safeStepIndex + 1}/{validStepCount}
                </span>
              </div>
            </div>

            <p className="relative text-[28px] font-semibold text-white leading-[1.15] tracking-tight text-balance">
              {room.isEmergency
                ? 'Stav nouze'
                : room.isLocked
                ? 'Uzamčen'
                : currentStep?.name || 'Status'}
            </p>

            <p className="relative text-sm font-mono tabular-nums text-white/55 mt-3 leading-none">
              {elapsedTime}
            </p>

            {/* Progress bar — thin, minimal */}
            <div className="relative mt-5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: activeColor, boxShadow: `0 0 10px ${activeColor}80` }}
                animate={{ width: `${((safeStepIndex + 1) / validStepCount) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Primary CTA — mint pill */}
          {!isInteractionBlocked && (
            <button
              onClick={handleNextStep}
              className="w-full py-4 rounded-full mt-5 mb-6 active:scale-[0.98] outline-none select-none transition-transform"
              style={{
                background: '#0099FF',
                color: '#062720',
                boxShadow: '0 10px 30px -10px rgba(79,237,199,0.45)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {isFinalStep ? 'Nový cyklus' : 'Spustit další fázi'}
            </button>
          )}

          {/* End Time Card */}
          <div
            className="rounded-3xl p-5 mb-4"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40 leading-none">
                  Odhadované ukončení
                </p>
                <p className="text-[34px] font-semibold text-white font-mono tabular-nums mt-2 leading-none tracking-tight">
                  {estimatedEndTime && shouldShowTime
                    ? estimatedEndTime.toLocaleTimeString('cs-CZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDecreaseTime}
                  disabled={isInteractionBlocked || !estimatedEndTime}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 outline-none select-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Minus className="w-[18px] h-[18px] text-white/80" strokeWidth={2.25} />
                </button>
                <button
                  onClick={handleIncreaseTime}
                  disabled={isInteractionBlocked}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 outline-none select-none transition-all"
                  style={{
                    background: '#0099FF',
                    color: '#062720',
                  }}
                >
                  <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Categories — action tiles (2x2 grid, like fintech categories) */}
          <div className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-3 px-1">
              Akce
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {/* Pause */}
              <button
                onClick={async () => {
                  const newPaused = !isPaused;
                  setIsPaused(newPaused);
                  await updateOperatingRoom(room.id, { is_paused: newPaused });
                  await recordStatusEvent({
                    operating_room_id: room.id,
                    event_type: newPaused ? 'pause' : 'resume',
                    step_index: currentStepIndex,
                    step_name: currentStep?.name || 'Status',
                  });
                }}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 outline-none select-none transition-all"
                style={{
                  background: isPaused ? 'rgba(79,237,199,0.12)' : 'rgba(255,255,255,0.025)',
                  border: isPaused
                    ? '1px solid rgba(79,237,199,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {isPaused ? (
                  <Play className="w-[22px] h-[22px]"               style={{ color: '#0099FF' }} strokeWidth={1.75} />
                ) : (
                  <Pause className="w-[22px] h-[22px] text-white/70" strokeWidth={1.75} />
                )}
                <span
                  className="text-[10px] font-medium tracking-tight"
                  style={{ color: isPaused ? '#0099FF' : 'rgba(255,255,255,0.55)' }}
                >
                  {isPaused ? 'Pokračovat' : 'Pauza'}
                </span>
              </button>

              {/* Hygiene */}
              <button
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                  await recordStatusEvent({
                    operating_room_id: room.id,
                    event_type: newH ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
                    step_index: currentStepIndex,
                    step_name: currentStep?.name || 'Status',
                  });
                }}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 outline-none select-none transition-all"
                style={{
                  background: room.isEnhancedHygiene
                    ? 'rgba(251,146,60,0.12)'
                    : 'rgba(255,255,255,0.025)',
                  border: room.isEnhancedHygiene
                    ? '1px solid rgba(251,146,60,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ShieldAlert
                  className="w-[22px] h-[22px]"
                  style={{
                    color: room.isEnhancedHygiene ? '#fb923c' : 'rgba(255,255,255,0.7)',
                  }}
                  strokeWidth={1.75}
                />
                <span
                  className="text-[10px] font-medium tracking-tight"
                  style={{
                    color: room.isEnhancedHygiene ? '#fb923c' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  Hygiena
                </span>
              </button>

              {/* Call patient */}
              <button
                onClick={async () => {
                  if (!patientCalledTime) {
                    const now = new Date();
                    setPatientCalledTime(now);
                    setShowPatientCalledText(true);
                    setTimeout(() => setShowPatientCalledText(false), 5000);
                    await updateOperatingRoom(room.id, {
                      patient_called_at: now.toISOString(),
                    });
                    await recordStatusEvent({
                      operating_room_id: room.id,
                      event_type: 'patient_call',
                      step_index: currentStepIndex,
                      step_name: currentStep?.name || 'Status',
                    });
                    onPatientStatusChange?.(now.toISOString(), null);
                  }
                }}
                disabled={!!patientCalledTime}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 disabled:active:scale-100 outline-none select-none transition-all"
                style={{
                  background: patientCalledTime
                    ? 'rgba(79,237,199,0.12)'
                    : 'rgba(255,255,255,0.025)',
                  border: patientCalledTime
                    ? '1px solid rgba(79,237,199,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Phone
                  className="w-[22px] h-[22px]"
                  style={{ color: patientCalledTime ? '#0099FF' : 'rgba(255,255,255,0.7)' }}
                  strokeWidth={1.75}
                />
                <span
                  className="text-[10px] font-medium tracking-tight tabular-nums"
                  style={{ color: patientCalledTime ? '#0099FF' : 'rgba(255,255,255,0.55)' }}
                >
                  {patientCalledTime ? patientCallElapsedTime : 'Volat'}
                </span>
              </button>

              {/* Patient arrived */}
              <button
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                    await updateOperatingRoom(room.id, {
                      patient_arrived_at: now.toISOString(),
                    });
                    await recordStatusEvent({
                      operating_room_id: room.id,
                      event_type: 'patient_arrived',
                      step_index: currentStepIndex,
                      step_name: currentStep?.name || 'Status',
                    });
                    onPatientStatusChange?.(
                      patientCalledTime!.toISOString(),
                      now.toISOString(),
                    );
                    setTimeout(() => {
                      setShowPatientArrivedText(false);
                    }, 5000);
                  }
                }}
                disabled={!patientCalledTime || !!patientArrivedTime}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 disabled:active:scale-100 outline-none select-none transition-all disabled:opacity-40"
                style={{
                  background: patientArrivedTime
                    ? 'rgba(168,85,247,0.12)'
                    : 'rgba(255,255,255,0.025)',
                  border: patientArrivedTime
                    ? '1px solid rgba(168,85,247,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <BedDouble
                  className="w-[22px] h-[22px]"
                  style={{ color: patientArrivedTime ? '#c084fc' : 'rgba(255,255,255,0.7)' }}
                  strokeWidth={1.75}
                />
                <span
                  className="text-[10px] font-medium tracking-tight"
                  style={{ color: patientArrivedTime ? '#c084fc' : 'rgba(255,255,255,0.55)' }}
                >
                  Příjezd
                </span>
              </button>
            </div>
          </div>

          {/* Staff — clean rows */}
          <div className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-3 px-1">
              Tým
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setStaffPickerRole('doctor');
                  setStaffPickerOpen(true);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.99] text-left w-full outline-none select-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(79,237,199,0.1)' }}
                >
                  <Stethoscope className="w-[18px] h-[18px]"               style={{ color: '#0099FF' }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40 leading-none">
                    Lékař
                  </p>
                  <p className="text-sm font-medium text-white truncate mt-1.5 leading-none">
                    {room?.staff?.doctor?.name || 'Nepřiřazen'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" strokeWidth={2} />
              </button>
              <button
                onClick={() => {
                  setStaffPickerRole('nurse');
                  setStaffPickerOpen(true);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.99] text-left w-full outline-none select-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(79,237,199,0.1)' }}
                >
                  <Heart className="w-[18px] h-[18px]"               style={{ color: '#0099FF' }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40 leading-none">
                    Sestra
                  </p>
                  <p className="text-sm font-medium text-white truncate mt-1.5 leading-none">
                    {room?.staff?.nurse?.name || 'Nepřiřazena'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" strokeWidth={2} />
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

      {/* Content wrapper — creates positioning context offset from Sidebar (96px).
          All absolute children centered via left-1/2 / flex justify-center will
          be centered in the true content area, not under the sidebar. */}
      <div className="content-safe">

      {/* Header — left is wrapper-relative (so 160px total from viewport on desktop) */}
      <header className="absolute top-4 md:top-8 lg:top-12 left-4 md:left-8 lg:left-16 right-28 md:right-32 lg:right-40 flex justify-between items-start z-50 pointer-events-none">
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={room.name + room.isEmergency + room.isLocked}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-6"
            >
              <h1 className={`text-[clamp(1.75rem,4.5vw,3.75rem)] font-bold tracking-tight uppercase leading-none truncate max-w-[60vw]
                ${room.isEmergency ? 'text-red-500' : (room.isLocked ? 'text-amber-500' : 'text-white/95')}
              `}>
                {room.name}
              </h1>
              
              {room.isEmergency && (
                <div className="bg-red-500 text-white px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-2xl flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <AlertTriangle className="w-[clamp(1rem,2vw,2rem)] h-[clamp(1rem,2vw,2rem)]" />
                  <span className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-black uppercase tracking-widest">EMERGENCY</span>
                </div>
              )}
              
              {room.isLocked && !room.isEmergency && (
                <div className="bg-amber-500 text-white px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-2xl flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <Lock className="w-[clamp(1rem,1.8vw,1.75rem)] h-[clamp(1rem,1.8vw,1.75rem)]" />
                  <span className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-black uppercase tracking-widest">SÁL UZAMČEN</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="text-[clamp(8px,0.8vw,11px)] font-black text-white/30 tracking-[0.5em] uppercase mt-[clamp(0.75rem,1.5vw,1.25rem)]">CHIRURGICKÝ BLOK • OVLÁDÁNÍ SÁLU</p>
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
      {/* Close Button and Notification Button - Top Right */}
      <div className="absolute top-2 sm:top-4 md:top-6 lg:top-8 right-2 sm:right-4 md:right-6 lg:right-8 flex flex-col gap-2 sm:gap-3 md:gap-4 z-50">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="p-2 sm:p-3 md:p-4 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex items-center justify-center h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
        </button>

        {/* Notification Button */}
        <motion.button 
          onClick={() => setNotificationOverlayOpen(true)}
          className="p-2 sm:p-3 md:p-4 hover:bg-orange-500/20 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex flex-col items-center justify-center gap-1 h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 hover:border-orange-500/40"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white/60" />
          <span className="hidden sm:block text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-white/40">Notifikace</span>
        </motion.button>
      </div>

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
      <main className="w-full h-full flex items-center justify-center relative z-20 px-2 sm:px-4">
        {/* Background decorative rings — hidden on small screens to avoid overflow */}
        <div
          className="hidden lg:block absolute rounded-full border border-white/5 pointer-events-none"
          style={{ width: 'min(70vw,700px)', height: 'min(70vw,700px)' }}
        />
        <div
          className="hidden lg:block absolute rounded-full border border-dashed border-white/[0.03] pointer-events-none"
          style={{ width: 'min(75vw,750px)', height: 'min(75vw,750px)' }}
        />
        
        <div
          className="flex items-center justify-center relative max-w-full"
          style={{ gap: 'clamp(0.25rem,4vw,9rem)' }}
        >
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
                className="relative flex items-center justify-center shrink-0"
                style={{ width: 'clamp(90px,16vw,280px)', height: 'clamp(90px,16vw,280px)' }}
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
            className={`relative flex items-center justify-center rounded-full group transition-all focus:outline-none z-10 shrink-0
              ${isInteractionBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ width: 'clamp(180px,30vw,500px)', height: 'clamp(180px,30vw,500px)' }}
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
                    <Lock className="text-white mb-[clamp(0.5rem,1.5vw,1rem)]" style={{ width: 'clamp(2.5rem,4vw,5rem)', height: 'clamp(2.5rem,4vw,5rem)' }} />
                    <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-black tracking-tighter text-white uppercase">
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
                    <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-white font-mono">
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
                    className="flex flex-col items-center gap-[clamp(0.75rem,2vw,1.5rem)]"
                  >
                    <p className="text-[clamp(8px,0.8vw,10px)] font-black tracking-[0.2em] uppercase text-white/25">
                      SPECIÁLNÍ STAV
                    </p>
                    {/* Animované sluchátko */}
                    <motion.div
                      animate={{ rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.1, 1.1, 1.1, 1.1, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
                      style={{ color: activeColor }}
                    >
                      <Phone style={{ width: 'clamp(2.5rem,4vw,5rem)', height: 'clamp(2.5rem,4vw,5rem)' }} strokeWidth={1.5} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[clamp(1.5rem,4vw,3rem)] font-bold tracking-tight leading-tight text-center text-white"
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
                    className="flex flex-col items-center gap-[clamp(0.75rem,2vw,1.5rem)]"
                  >
                    <p className="text-[clamp(8px,0.8vw,10px)] font-black tracking-[0.2em] uppercase text-white/25">
                      SPECIÁLNÍ STAV
                    </p>
                    {/* Animovaná postel s pojezdem */}
                    <motion.div
                      animate={{ x: [0, 14, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }}
                      style={{ color: activeColor }}
                    >
                      <BedDouble style={{ width: 'clamp(2.5rem,4vw,5rem)', height: 'clamp(2.5rem,4vw,5rem)' }} strokeWidth={1.5} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[clamp(1.5rem,4vw,3rem)] font-bold tracking-tight leading-tight text-center text-white"
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
                    <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tighter text-white uppercase">
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
                    <p className={`text-[clamp(8px,0.8vw,10px)] font-black tracking-[0.2em] mb-[clamp(0.75rem,2vw,1.5rem)] uppercase ${room.isEmergency ? 'text-red-400' : 'text-white/25'}`}>
                      PROBÍHAJÍCÍ FÁZE
                    </p>
                    
                    <motion.h2
                      key={currentStep.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-[clamp(1.5rem,5vw,3.75rem)] font-bold tracking-tight leading-tight mb-[clamp(0.75rem,2vw,1.5rem)] break-words ${room.isEmergency ? 'text-red-400' : 'text-white'}`}
                    >
                      {currentStep.title}
                    </motion.h2>


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
            className="relative flex items-center justify-center cursor-pointer shrink-0"
            style={{ width: 'clamp(90px,16vw,280px)', height: 'clamp(90px,16vw,280px)' }}
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
        
        {/* Time adjustment buttons - positioned below center circle, responsive to circle size */}
        {!isInteractionBlocked && (
          <>
            {/* Minus button - left of center, below circle */}
            <button 
              onClick={handleDecreaseTime}
              className="absolute rounded-full border-2 flex items-center justify-center opacity-80 hover:opacity-90 transition-opacity cursor-pointer backdrop-blur-md shadow-lg z-50 -translate-x-1/2 -translate-y-1/2"
              style={{
                borderColor: `${activeColor}66`,
                backgroundColor: 'rgba(255,255,255,0.03)',
                width: 'clamp(5rem,9vw,14rem)',
                height: 'clamp(5rem,9vw,14rem)',
                left: 'clamp(20%,32%,35%)',
                top: 'calc(50% + clamp(130px, 20vw, 320px))',
              }}
              aria-label="Zkrátit odhadovaný čas"
            >
              <Minus className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-20 lg:h-20 text-white" strokeWidth={2} />
            </button>

            {/* Plus button - right of center, below circle */}
            <button 
              onClick={handleIncreaseTime}
              className="absolute rounded-full border-2 flex items-center justify-center opacity-80 hover:opacity-90 transition-opacity cursor-pointer backdrop-blur-md shadow-lg z-50 translate-x-1/2 -translate-y-1/2"
              style={{
                borderColor: `${activeColor}66`,
                backgroundColor: 'rgba(255,255,255,0.03)',
                width: 'clamp(5rem,9vw,14rem)',
                height: 'clamp(5rem,9vw,14rem)',
                right: 'clamp(20%,32%,35%)',
                top: 'calc(50% + clamp(130px, 20vw, 320px))',
              }}
              aria-label="Prodloužit odhadovaný čas"
            >
              <Plus className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-20 lg:h-20 text-white" strokeWidth={2} />
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
      </div>{/* end content-safe wrapper */}
      </div>{/* end desktop wrapper */}

      {/* Step Confirmation Overlay */}
      <StepConfirmationOverlay
        pendingStepIndex={pendingStepIndex}
        activeDbStatuses={activeDbStatuses}
        safeStepIndex={safeStepIndex}
        validStepCount={validStepCount}
        onConfirm={confirmStepChange}
        onCancel={cancelStepChange}
      />

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

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={notificationOverlayOpen}
        onClose={() => setNotificationOverlayOpen(false)}
        onSendNotification={async (type, customReason) => {
          try {
            const response = await fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                roomId: room.id,
                roomName: room.name,
                customReason,
              }),
            });
            const result = await response.json();
            console.log('[v0] Notification sent:', result);
          } catch (error) {
            console.error('[v0] Error sending notification:', error);
            throw error;
          }
        }}
        roomName={room.name}
      />
    </motion.div>
  );
};

export default RoomDetail;
