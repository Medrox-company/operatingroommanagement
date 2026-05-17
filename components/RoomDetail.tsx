
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity, BedDouble, ChevronLeft, Bell,
  Clock, Timer, Users, Zap, CircleDot, ArrowRight, TrendingUp
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

// Design tokens for premium dark theme
const T = {
  bg: '#0a0a0a',
  surface: 'rgba(255,255,255,0.02)',
  surfaceHover: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.10)',
  text: 'rgba(255,255,255,0.88)',
  textMuted: 'rgba(255,255,255,0.50)',
  textFaint: 'rgba(255,255,255,0.30)',
  accent: '#00D9FF',
  green: '#00F5A0',
  yellow: '#FBBF24',
  orange: '#FF9F43',
  red: '#FF6B6B',
  purple: '#A78BFA',
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
    ? T.red 
    : (room.isLocked 
        ? T.yellow 
        : (isPaused ? T.accent : (currentStep?.color || '#6B7280')));

  const changeStep = (newIndex: number) => {
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
    const newStepColor = newStep?.color || '#6B7280';

    // ============================================================
    // OPTIMISTIC UI UPDATE — fire IMMEDIATELY, do not await DB
    // ============================================================
    // 1) Propagate step change to App (this triggers optimistic setRooms + DB write in App)
    onStepChange(newIndex, newStepColor);
    // 2) Reset local phase timer immediately so the elapsed counter starts from zero
    setPhaseStartTime(new Date());

    // Update estimated end time hints (purely local UI state)
    if (newIndex === 1 && currentStepIndex === 0) {
      // Default estimated end time: current time + 60 minutes, rounded to 15 min
      const defaultEndTime = roundUpTo15Min(new Date(now.getTime() + 60 * 60 * 1000));
      onEndTimeChange(defaultEndTime);
    } else if (newIndex === 0 && currentStepIndex === validStepCount - 1) {
      onEndTimeChange(null);
    }

    // Reset patient call/arrival status when transitioning to "Příjezd na sál"
    const newStepName = (newStep?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isArrivalToOR = newStepName.includes('prijezd na sal') || newStepName.includes('arrival');
    if (isArrivalToOR && (patientCalledTime || patientArrivedTime)) {
      isResettingRef.current = true;
      setPatientCalledTime(null);
      setPatientArrivedTime(null);
      setPatientCallElapsedTime('00:00');
      onPatientStatusChange?.(null, null);
      // Fire-and-forget DB persist
      updateOperatingRoom(room.id, { patient_called_at: null, patient_arrived_at: null }).catch(() => {});
      setTimeout(() => { isResettingRef.current = false; }, 1500);
    }

    // ============================================================
    // FIRE-AND-FORGET ANALYTICS — never block UI
    // ============================================================
    // These writes go to room_status_history (analytics only). They are not
    // required for correctness of the room state, so we run them in the
    // background without awaiting. Errors are logged but never surfaced.
    void recordStatusEvent({
      operating_room_id: room.id,
      event_type: 'step_change',
      step_index: newIndex,
      step_name: previousStep?.name || 'Status',
      duration_seconds: durationSeconds,
      metadata: {
        previous_step: previousStep?.name || 'Status',
        previous_step_index: currentStepIndex,
      },
    }).catch((err) => console.error('[v0] step_change event failed', err));

    if (newIndex === 1 && currentStepIndex === 0) {
      void recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_start',
        step_index: newIndex,
        step_name: newStep?.name || 'Status',
      }).catch((err) => console.error('[v0] operation_start event failed', err));
    } else if (newIndex === 0 && currentStepIndex === validStepCount - 1) {
      void recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_end',
        step_index: currentStepIndex,
        step_name: 'Operation End',
        duration_seconds: durationSeconds,
        metadata: {
          completed_step: previousStep?.name || 'Status',
          previous_step: previousStep?.name || 'Status',
        },
      }).catch((err) => console.error('[v0] operation_end event failed', err));
    }
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

  // Progress percentage for current step
  const progressPct = ((safeStepIndex + 1) / validStepCount) * 100;

  return (
    <motion.div 
      className="fixed inset-0 z-50 text-white font-sans overflow-hidden"
      style={{ background: T.bg }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ========== MOBILE LAYOUT (md:hidden) — Premium Vercel-style ========== */}
      <div className="md:hidden w-full h-full flex flex-col relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,217,255,0.08) 0%, transparent 60%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto hide-scrollbar"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <button onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <ChevronLeft className="w-5 h-5" style={{ color: T.textMuted }} />
            </button>
            
            <div className="flex flex-col items-center flex-1 px-4">
              <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: T.textFaint }}>
                Operacni sal
              </span>
              <h1 className="text-base font-semibold text-white mt-0.5">{room.name}</h1>
            </div>
            
            <button onClick={() => setNotificationOverlayOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Bell className="w-5 h-5" style={{ color: T.textMuted }} />
            </button>
          </div>

          {/* Status Badge */}
          {(room.isEmergency || room.isLocked || isPaused) && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: room.isEmergency ? `${T.red}15` : room.isLocked ? `${T.yellow}15` : `${T.accent}15`,
                  border: `1px solid ${room.isEmergency ? T.red : room.isLocked ? T.yellow : T.accent}30`,
                }}>
                {room.isEmergency ? <AlertTriangle className="w-4 h-4" style={{ color: T.red }} /> :
                 room.isLocked ? <Lock className="w-4 h-4" style={{ color: T.yellow }} /> :
                 <Pause className="w-4 h-4" style={{ color: T.accent }} />}
                <span className="text-xs font-semibold" style={{ color: room.isEmergency ? T.red : room.isLocked ? T.yellow : T.accent }}>
                  {room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamceno' : 'Pozastaveno'}
                </span>
              </div>
            </div>
          )}

          {/* Main Status Card */}
          <div className="px-4 pt-4">
            <motion.div
              key={currentStep?.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              
              {/* Accent glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)` }} />
              
              {/* Phase label and counter */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: T.textFaint }}>
                  Aktualni faze
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
                  <span className="text-[11px] font-mono font-semibold tabular-nums" style={{ color: T.textMuted }}>
                    {safeStepIndex + 1} / {validStepCount}
                  </span>
                </div>
              </div>
              
              {/* Phase name */}
              <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                {room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamceno' : currentStep?.name || 'Status'}
              </h2>
              
              {/* Timer */}
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" style={{ color: T.textMuted }} />
                <span className="text-sm font-mono tabular-nums" style={{ color: T.textMuted }}>
                  {elapsedTime}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: T.border }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: activeColor }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
            </motion.div>
          </div>

          {/* Next Step Button */}
          {!isInteractionBlocked && (
            <div className="px-4 pt-4">
              <motion.button
                onClick={handleNextStep}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: activeColor, color: '#000' }}>
                <span>Dalsi faze: {nextStep?.name || 'Status'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* End Time Card */}
          <div className="px-4 pt-4">
            <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: T.textFaint }}>
                    Odhadovany konec
                  </span>
                  <p className="text-3xl font-bold font-mono tabular-nums text-white mt-1">
                    {estimatedEndTime && shouldShowTime
                      ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDecreaseTime} disabled={isInteractionBlocked || !estimatedEndTime}
                    className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <Minus className="w-5 h-5" style={{ color: T.textMuted }} />
                  </button>
                  <button onClick={handleIncreaseTime} disabled={isInteractionBlocked}
                    className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
                    style={{ background: T.accent }}>
                    <Plus className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 pt-4">
            <span className="text-[10px] font-medium uppercase tracking-widest px-1 mb-3 block" style={{ color: T.textFaint }}>
              Rychle akce
            </span>
            <div className="grid grid-cols-4 gap-2">
              {/* Pause */}
              <ActionButton
                icon={isPaused ? Play : Pause}
                label={isPaused ? 'Pokracovat' : 'Pauza'}
                active={isPaused}
                color={T.accent}
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
              />
              
              {/* Hygiene */}
              <ActionButton
                icon={ShieldAlert}
                label="Hygiena"
                active={room.isEnhancedHygiene}
                color={T.orange}
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
              />
              
              {/* Call Patient */}
              <ActionButton
                icon={Phone}
                label={patientCalledTime ? patientCallElapsedTime : 'Volat'}
                active={!!patientCalledTime && !patientArrivedTime}
                color={T.green}
                disabled={!!patientCalledTime}
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
                      step_name: currentStep?.name || 'Status',
                    });
                    onPatientStatusChange?.(now.toISOString(), null);
                  }
                }}
              />
              
              {/* Patient Arrived */}
              <ActionButton
                icon={BedDouble}
                label="Prijezd"
                active={!!patientArrivedTime}
                color={T.purple}
                disabled={!patientCalledTime || !!patientArrivedTime}
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                    await updateOperatingRoom(room.id, { patient_arrived_at: now.toISOString() });
                    await recordStatusEvent({
                      operating_room_id: room.id,
                      event_type: 'patient_arrived',
                      step_index: currentStepIndex,
                      step_name: currentStep?.name || 'Status',
                    });
                    onPatientStatusChange?.(patientCalledTime!.toISOString(), now.toISOString());
                    setTimeout(() => setShowPatientArrivedText(false), 5000);
                  }
                }}
              />
            </div>
          </div>

          {/* Team Section */}
          <div className="px-4 pt-4 pb-4">
            <span className="text-[10px] font-medium uppercase tracking-widest px-1 mb-3 block" style={{ color: T.textFaint }}>
              Tym
            </span>
            <div className="flex flex-col gap-2">
              <TeamMemberButton
                icon={Stethoscope}
                role="Lekar"
                name={room?.staff?.doctor?.name || 'Neprirazen'}
                color={T.accent}
                onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
              />
              <TeamMemberButton
                icon={Heart}
                role="Sestra"
                name={room?.staff?.nurse?.name || 'Neprirazena'}
                color={T.green}
                onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
              />
            </div>
          </div>

          {/* Phase Timeline */}
          <div className="px-4 pb-6">
            <span className="text-[10px] font-medium uppercase tracking-widest px-1 mb-3 block" style={{ color: T.textFaint }}>
              Prubeh fazi
            </span>
            <div className="flex items-center gap-1.5">
              {activeDbStatuses.map((status, index) => (
                <div key={status.id}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    flex: index === safeStepIndex ? 3 : 1,
                    background: index <= safeStepIndex ? activeColor : T.border,
                    opacity: index <= safeStepIndex ? 1 : 0.5,
                  }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (hidden on mobile) ========== */}
      <div className="hidden md:flex w-full h-full">
        {/* Left Panel - Main Status */}
        <div className="flex-1 flex flex-col relative overflow-hidden" style={{ borderRight: `1px solid ${T.border}` }}>
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
              style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)` }} />
          </div>
          
          {/* Emergency/Locked overlay */}
          {room.isEmergency && (
            <div className="absolute inset-0 pointer-events-none border-[6px]" style={{ borderColor: `${T.red}40` }} />
          )}
          {room.isLocked && !room.isEmergency && (
            <div className="absolute inset-0 pointer-events-none border-[6px]" style={{ borderColor: `${T.yellow}30` }} />
          )}

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between p-6 lg:p-8">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: T.textFaint }}>
                Operacni sal
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mt-1 flex items-center gap-4">
                {room.name}
                {room.isEmergency && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: `${T.red}20`, color: T.red }}>
                    <AlertTriangle className="w-4 h-4" /> NOUZE
                  </span>
                )}
                {room.isLocked && !room.isEmergency && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: `${T.yellow}20`, color: T.yellow }}>
                    <Lock className="w-4 h-4" /> UZAMCENO
                  </span>
                )}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setNotificationOverlayOpen(true)}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <Bell className="w-5 h-5" style={{ color: T.textMuted }} />
              </button>
              <button onClick={onClose}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <X className="w-5 h-5" style={{ color: T.textMuted }} />
              </button>
            </div>
          </div>

          {/* Main Content - Centered */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
            {/* Central Status Display */}
            <motion.div
              key={currentStep?.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-xl">
              
              {/* Phase indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeColor, boxShadow: `0 0 12px ${activeColor}` }} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: T.textMuted }}>
                  Faze {safeStepIndex + 1} z {validStepCount}
                </span>
              </div>
              
              {/* Current phase name */}
              <AnimatePresence mode="wait">
                {isPaused ? (
                  <motion.h2
                    key="paused"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-4"
                    style={{ color: T.accent }}>
                    PAUZA
                  </motion.h2>
                ) : showEndTime && estimatedEndTime && shouldShowTime ? (
                  <motion.h2
                    key="endtime"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-5xl lg:text-6xl xl:text-7xl font-bold font-mono tabular-nums tracking-tight mb-4 text-white">
                    {estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </motion.h2>
                ) : showPatientCalledText ? (
                  <motion.div
                    key="called"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-4 mb-4">
                    <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}>
                      <Phone className="w-16 h-16" style={{ color: T.green }} />
                    </motion.div>
                    <h2 className="text-4xl lg:text-5xl font-bold text-white">Volani pacienta</h2>
                  </motion.div>
                ) : showPatientArrivedText ? (
                  <motion.div
                    key="arrived"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-4 mb-4">
                    <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <BedDouble className="w-16 h-16" style={{ color: T.purple }} />
                    </motion.div>
                    <h2 className="text-4xl lg:text-5xl font-bold text-white">Prijezd pacienta</h2>
                  </motion.div>
                ) : (
                  <motion.h2
                    key={currentStep?.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-4 text-white">
                    {currentStep?.name || 'Status'}
                  </motion.h2>
                )}
              </AnimatePresence>
              
              {/* Elapsed time */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <Timer className="w-5 h-5" style={{ color: T.textMuted }} />
                <span className="text-xl font-mono tabular-nums" style={{ color: T.textMuted }}>{elapsedTime}</span>
              </div>
              
              {/* Progress ring */}
              <div className="relative w-48 h-48 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke={T.border} strokeWidth="3" />
                  <motion.circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke={activeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={283}
                    animate={{ strokeDashoffset: 283 - (283 * progressPct / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{Math.round(progressPct)}%</span>
                  <span className="text-xs" style={{ color: T.textMuted }}>dokonceno</span>
                </div>
              </div>
              
              {/* Next step button */}
              {!isInteractionBlocked && (
                <motion.button
                  onClick={handleNextStep}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                  style={{ background: activeColor, color: '#000' }}>
                  <span>Dalsi: {nextStep?.name || 'Status'}</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Bottom Progress Dots */}
          <div className="relative z-10 flex items-center justify-center gap-2 pb-8">
            {activeDbStatuses.map((status, index) => (
              <div key={status.id}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: index === safeStepIndex ? 32 : 8,
                  background: index <= safeStepIndex ? activeColor : T.border,
                }} />
            ))}
          </div>
        </div>

        {/* Right Panel - Controls & Info */}
        <div className="w-80 lg:w-96 flex flex-col overflow-y-auto hide-scrollbar" style={{ background: T.bg }}>
          {/* Estimated End Time */}
          <div className="p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-3" style={{ color: T.textFaint }}>
              Odhadovany konec
            </span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold font-mono tabular-nums text-white">
                {estimatedEndTime && shouldShowTime
                  ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleDecreaseTime} disabled={isInteractionBlocked || !estimatedEndTime}
                  className="w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <Minus className="w-4 h-4" style={{ color: T.textMuted }} />
                </button>
                <button onClick={handleIncreaseTime} disabled={isInteractionBlocked}
                  className="w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                  style={{ background: T.accent }}>
                  <Plus className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Rychle akce
            </span>
            <div className="grid grid-cols-2 gap-3">
              <DesktopActionButton
                icon={isPaused ? Play : Pause}
                label={isPaused ? 'Pokracovat' : 'Pauza'}
                active={isPaused}
                color={T.accent}
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
              />
              <DesktopActionButton
                icon={ShieldAlert}
                label="Hygiena"
                active={room.isEnhancedHygiene}
                color={T.orange}
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                }}
              />
              <DesktopActionButton
                icon={Phone}
                label={patientCalledTime ? patientCallElapsedTime : 'Volat pacienta'}
                active={!!patientCalledTime && !patientArrivedTime}
                color={T.green}
                disabled={!!patientCalledTime}
                onClick={async () => {
                  if (!patientCalledTime) {
                    const now = new Date();
                    setPatientCalledTime(now);
                    setShowPatientCalledText(true);
                    setTimeout(() => setShowPatientCalledText(false), 5000);
                    await updateOperatingRoom(room.id, { patient_called_at: now.toISOString() });
                    onPatientStatusChange?.(now.toISOString(), null);
                  }
                }}
              />
              <DesktopActionButton
                icon={BedDouble}
                label="Prijezd pacienta"
                active={!!patientArrivedTime}
                color={T.purple}
                disabled={!patientCalledTime || !!patientArrivedTime}
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                    await updateOperatingRoom(room.id, { patient_arrived_at: now.toISOString() });
                    onPatientStatusChange?.(patientCalledTime!.toISOString(), now.toISOString());
                    setTimeout(() => setShowPatientArrivedText(false), 5000);
                  }
                }}
              />
            </div>
          </div>

          {/* Team */}
          <div className="p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Tym
            </span>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
                className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${T.accent}15` }}>
                  <Stethoscope className="w-5 h-5" style={{ color: T.accent }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>Lekar</span>
                  <span className="text-sm font-medium text-white">{room?.staff?.doctor?.name || 'Neprirazen'}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.textMuted }} />
              </button>
              
              <button onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
                className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${T.green}15` }}>
                  <Heart className="w-5 h-5" style={{ color: T.green }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>Sestra</span>
                  <span className="text-sm font-medium text-white">{room?.staff?.nurse?.name || 'Neprirazena'}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.textMuted }} />
              </button>
            </div>
          </div>

          {/* All Phases */}
          <div className="p-6 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Vsechny faze
            </span>
            <div className="flex flex-col gap-2">
              {activeDbStatuses.map((status, index) => (
                <div key={status.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: index === safeStepIndex ? `${activeColor}10` : 'transparent',
                    border: `1px solid ${index === safeStepIndex ? `${activeColor}30` : 'transparent'}`,
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: index <= safeStepIndex ? status.color : T.surface,
                      color: index <= safeStepIndex ? '#000' : T.textMuted,
                    }}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium" style={{ color: index === safeStepIndex ? 'white' : T.textMuted }}>
                    {status.name}
                  </span>
                  {index === safeStepIndex && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider" style={{ color: activeColor }}>
                      Aktualni
                    </span>
                  )}
                  {index < safeStepIndex && (
                    <span className="ml-auto text-[10px]" style={{ color: T.textFaint }}>Dokonceno</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
        title={staffPickerRole === 'doctor' ? 'Lekar — vyber a sprava' : 'Sestra — vyber a sprava'}
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
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                roomId: room.id,
                roomName: room.name,
                customReason,
              }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result?.error || `Odeslani selhalo (${response.status})`);
            }
          } catch (error) {
            console.error('[RoomDetail] Error sending notification:', error);
            throw error;
          }
        }}
        roomName={room.name}
      />
    </motion.div>
  );
};

// Mobile Action Button Component
const ActionButton: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, color, disabled, onClick }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40"
    style={{
      background: active ? `${color}15` : T.surface,
      border: `1px solid ${active ? `${color}40` : T.border}`,
    }}>
    <Icon className="w-5 h-5" style={{ color: active ? color : T.textMuted }} />
    <span className="text-[9px] font-semibold" style={{ color: active ? color : T.textMuted }}>{label}</span>
  </motion.button>
);

// Desktop Action Button Component
const DesktopActionButton: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, color, disabled, onClick }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40"
    style={{
      background: active ? `${color}15` : T.surface,
      border: `1px solid ${active ? `${color}40` : T.border}`,
    }}>
    <Icon className="w-6 h-6" style={{ color: active ? color : T.textMuted }} />
    <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: active ? color : T.textMuted }}>{label}</span>
  </motion.button>
);

// Team Member Button Component
const TeamMemberButton: React.FC<{
  icon: React.ComponentType<any>;
  role: string;
  name: string;
  color: string;
  onClick: () => void;
}> = ({ icon: Icon, role, name, color, onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-xl transition-all group"
    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ background: `${color}15` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div className="flex-1 text-left">
      <span className="text-[10px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>{role}</span>
      <span className="text-sm font-medium text-white">{name}</span>
    </div>
    <ChevronRight className="w-4 h-4" style={{ color: T.textFaint }} />
  </button>
);

// Custom memo comparator
export default memo(RoomDetail, (prev, next) => {
  if (prev.room !== next.room) return false;
  if (prev.onClose !== next.onClose) return false;
  if (prev.onStepChange !== next.onStepChange) return false;
  if (prev.onEndTimeChange !== next.onEndTimeChange) return false;
  if (prev.onEnhancedHygieneToggle !== next.onEnhancedHygieneToggle) return false;
  if (prev.onStaffChange !== next.onStaffChange) return false;
  if (prev.onPatientStatusChange !== next.onPatientStatusChange) return false;
  if ((prev.allRooms?.length || 0) !== (next.allRooms?.length || 0)) return false;
  return true;
});
