
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

// Design tokens for premium dark theme - Vercel-style
const T = {
  bg: '#0a0a0a',
  bgAlt: '#111111',
  surface: 'rgba(255,255,255,0.025)',
  surfaceHover: 'rgba(255,255,255,0.04)',
  surfaceActive: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.05)',
  borderHover: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(255,255,255,0.12)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.35)',
  accent: '#00D9FF',
  green: '#00F5A0',
  yellow: '#FBBF24',
  orange: '#FF9F43',
  red: '#FF6B6B',
  purple: '#A78BFA',
  pink: '#EC4899',
  // Gradients
  gradientCyan: 'linear-gradient(135deg, #00D9FF 0%, #00F5A0 100%)',
  gradientPurple: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 100%)',
  gradientOrange: 'linear-gradient(135deg, #FF9F43 0%, #FBBF24 100%)',
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
      {/* ========== MOBILE LAYOUT (md:hidden) — Premium Glass Morphism Design ========== */}
      <div className="md:hidden w-full h-full flex flex-col relative overflow-hidden">
        {/* Dynamic gradient background based on status */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl"
            style={{ background: activeColor }} />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-10 blur-3xl"
            style={{ background: T.purple }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto hide-scrollbar"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          
          {/* Compact Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <button onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <ChevronLeft className="w-5 h-5" style={{ color: T.textMuted }} />
            </button>
            
            <div className="flex items-center gap-2">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `${T.green}15` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.green }}>Live</span>
              </div>
            </div>
            
            <button onClick={() => setNotificationOverlayOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Bell className="w-5 h-5" style={{ color: T.textMuted }} />
            </button>
          </div>

          {/* Hero Status Section */}
          <div className="px-4 pt-2">
            {/* Room name with status badge */}
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-white">{room.name}</h1>
              {room.isEmergency && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ background: `${T.red}20`, color: T.red }}>
                  <AlertTriangle className="w-3 h-3" /> Nouze
                </span>
              )}
              {room.isLocked && !room.isEmergency && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ background: `${T.yellow}20`, color: T.yellow }}>
                  <Lock className="w-3 h-3" /> Uzamceno
                </span>
              )}
            </div>

            {/* Main Status Card - Glass Morphism */}
            <motion.div
              key={currentStep?.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${T.borderActive}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}>
              
              {/* Animated gradient border effect */}
              <div className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none"
                style={{ 
                  background: `linear-gradient(135deg, ${activeColor}10 0%, transparent 50%, ${T.purple}10 100%)`,
                }} />
              
              {/* Phase indicator ring */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke={T.border} strokeWidth="2.5" />
                      <motion.circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke={activeColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={94}
                        animate={{ strokeDashoffset: 94 - (94 * progressPct / 100) }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{safeStepIndex + 1}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>
                      Faze {safeStepIndex + 1} / {validStepCount}
                    </span>
                    <span className="text-xs font-medium" style={{ color: activeColor }}>
                      {Math.round(progressPct)}% dokonceno
                    </span>
                  </div>
                </div>
                
                {/* Timer badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <Timer className="w-3.5 h-3.5" style={{ color: T.textMuted }} />
                  <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: T.text }}>
                    {elapsedTime}
                  </span>
                </div>
              </div>
              
              {/* Phase name - Large */}
              <AnimatePresence mode="wait">
                <motion.h2
                  key={isPaused ? 'paused' : currentStep?.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-3xl font-bold text-white leading-tight mb-4">
                  {room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamceno' : isPaused ? 'Pozastaveno' : currentStep?.name || 'Status'}
                </motion.h2>
              </AnimatePresence>
              
              {/* Phase progress dots */}
              <div className="flex items-center gap-1">
                {activeDbStatuses.map((status, index) => (
                  <motion.div 
                    key={status.id}
                    className="h-1 rounded-full transition-all duration-300"
                    animate={{
                      flex: index === safeStepIndex ? 4 : 1,
                      opacity: index <= safeStepIndex ? 1 : 0.3,
                    }}
                    style={{
                      background: index <= safeStepIndex ? activeColor : T.border,
                    }} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Next Step Button - Prominent */}
          {!isInteractionBlocked && (
            <div className="px-4 pt-4">
              <motion.button
                onClick={handleNextStep}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all relative overflow-hidden"
                style={{ background: activeColor }}>
                <span className="text-black font-bold">Dalsi faze</span>
                <span className="text-black/70">{nextStep?.name || 'Status'}</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </motion.button>
            </div>
          )}

          {/* Stats Grid - Compact */}
          <div className="px-4 pt-4 grid grid-cols-2 gap-3">
            {/* Estimated End Time */}
            <div className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <span className="text-[10px] font-medium uppercase tracking-widest block mb-1" style={{ color: T.textFaint }}>
                Konec
              </span>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono tabular-nums text-white">
                  {estimatedEndTime && shouldShowTime
                    ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={handleDecreaseTime} disabled={isInteractionBlocked || !estimatedEndTime}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors active:scale-95"
                    style={{ background: T.surfaceActive }}>
                    <Minus className="w-4 h-4" style={{ color: T.textMuted }} />
                  </button>
                  <button onClick={handleIncreaseTime} disabled={isInteractionBlocked}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors active:scale-95"
                    style={{ background: T.accent }}>
                    <Plus className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Status */}
            <div className="rounded-2xl p-4 relative overflow-hidden"
              style={{ 
                background: patientArrivedTime ? `${T.purple}10` : patientCalledTime ? `${T.green}10` : T.surface,
                border: `1px solid ${patientArrivedTime ? `${T.purple}30` : patientCalledTime ? `${T.green}30` : T.border}`,
              }}>
              <span className="text-[10px] font-medium uppercase tracking-widest block mb-1" style={{ color: T.textFaint }}>
                Pacient
              </span>
              <p className="text-lg font-semibold" style={{ 
                color: patientArrivedTime ? T.purple : patientCalledTime ? T.green : T.textMuted 
              }}>
                {patientArrivedTime ? 'Na sale' : patientCalledTime ? patientCallElapsedTime : 'Ceka'}
              </p>
            </div>
          </div>

          {/* Quick Actions - Redesigned */}
          <div className="px-4 pt-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] px-1 mb-3 block" style={{ color: T.textFaint }}>
              Rychle akce
            </span>
            <div className="grid grid-cols-4 gap-2">
              <ModernActionButton
                icon={isPaused ? Play : Pause}
                label={isPaused ? 'Spustit' : 'Pauza'}
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
              
              <ModernActionButton
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
              
              <ModernActionButton
                icon={Phone}
                label="Volat"
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
              
              <ModernActionButton
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

          {/* Team Section - Modern Cards */}
          <div className="px-4 pt-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] px-1 mb-3 block" style={{ color: T.textFaint }}>
              Tym
            </span>
            <div className="flex gap-2">
              <motion.button
                onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center gap-3 p-3 rounded-2xl transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${T.accent}15` }}>
                  <Stethoscope className="w-5 h-5" style={{ color: T.accent }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[9px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>Lekar</span>
                  <span className="text-sm font-medium text-white truncate block">{room?.staff?.doctor?.name || 'Neprirazen'}</span>
                </div>
              </motion.button>
              
              <motion.button
                onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center gap-3 p-3 rounded-2xl transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${T.green}15` }}>
                  <Heart className="w-5 h-5" style={{ color: T.green }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[9px] font-medium uppercase tracking-widest block" style={{ color: T.textFaint }}>Sestra</span>
                  <span className="text-sm font-medium text-white truncate block">{room?.staff?.nurse?.name || 'Neprirazena'}</span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Phase Timeline - Horizontal scroll */}
          <div className="px-4 pt-5 pb-8">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] px-1 mb-3 block" style={{ color: T.textFaint }}>
              Prubeh operace
            </span>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {activeDbStatuses.map((status, index) => (
                <motion.div 
                  key={status.id}
                  animate={{ scale: index === safeStepIndex ? 1 : 0.95, opacity: index === safeStepIndex ? 1 : 0.6 }}
                  className="flex-shrink-0 w-24 p-3 rounded-xl transition-all"
                  style={{
                    background: index === safeStepIndex ? `${activeColor}15` : T.surface,
                    border: `1px solid ${index === safeStepIndex ? `${activeColor}40` : T.border}`,
                  }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                    style={{
                      background: index <= safeStepIndex ? status.color : T.surfaceActive,
                      color: index <= safeStepIndex ? '#000' : T.textMuted,
                    }}>
                    {index + 1}
                  </div>
                  <span className="text-[11px] font-medium leading-tight line-clamp-2" 
                    style={{ color: index === safeStepIndex ? 'white' : T.textMuted }}>
                    {status.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT — Premium Immersive Design ========== */}
      <div className="hidden md:flex w-full h-full">
        {/* Left Panel - Main Status - Hero Section */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Dynamic Background Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Main gradient blob */}
            <motion.div 
              className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full opacity-15 blur-3xl"
              animate={{ 
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: activeColor }} 
            />
            {/* Secondary accent blob */}
            <motion.div 
              className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
              animate={{ 
                x: [0, -20, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: T.purple }} 
            />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ 
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} 
            />
          </div>
          
          {/* Emergency/Locked visual effect */}
          {room.isEmergency && (
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ background: `linear-gradient(135deg, ${T.red}20 0%, transparent 50%)` }} 
            />
          )}

          {/* Header Bar */}
          <div className="relative z-10 flex items-center justify-between p-6 lg:p-8">
            <div className="flex items-center gap-4">
              <motion.button 
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <ChevronLeft className="w-5 h-5" style={{ color: T.textMuted }} />
              </motion.button>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: T.textFaint }}>
                    Operacni sal
                  </span>
                  {/* Live indicator */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${T.green}15` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
                    <span className="text-[9px] font-bold uppercase" style={{ color: T.green }}>Live</span>
                  </div>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mt-0.5 flex items-center gap-3">
                  {room.name}
                  {room.isEmergency && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
                      style={{ background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40` }}>
                      <AlertTriangle className="w-3.5 h-3.5" /> Nouze
                    </span>
                  )}
                  {room.isLocked && !room.isEmergency && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
                      style={{ background: `${T.yellow}20`, color: T.yellow, border: `1px solid ${T.yellow}40` }}>
                      <Lock className="w-3.5 h-3.5" /> Uzamceno
                    </span>
                  )}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button 
                onClick={() => setNotificationOverlayOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <Bell className="w-5 h-5" style={{ color: T.textMuted }} />
              </motion.button>
              <motion.button 
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <X className="w-5 h-5" style={{ color: T.textMuted }} />
              </motion.button>
            </div>
          </div>

          {/* Main Content - Immersive Hero */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
            <motion.div
              key={currentStep?.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-2xl">
              
              {/* Phase progress ring - Large */}
              <div className="relative w-56 h-56 lg:w-64 lg:h-64 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle cx="50" cy="50" r="44" fill="none" stroke={T.border} strokeWidth="2" />
                  {/* Progress arc */}
                  <motion.circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={276}
                    animate={{ strokeDashoffset: 276 - (276 * progressPct / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 12px ${activeColor})` }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={activeColor} />
                      <stop offset="100%" stopColor={T.green} />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl lg:text-6xl font-bold text-white">{Math.round(progressPct)}%</span>
                  <span className="text-xs font-medium mt-1" style={{ color: T.textMuted }}>
                    {safeStepIndex + 1} / {validStepCount} fazi
                  </span>
                </div>
              </div>
              
              {/* Current phase name - Hero Typography */}
              <AnimatePresence mode="wait">
                {isPaused ? (
                  <motion.div
                    key="paused"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6">
                    <h2 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight"
                      style={{ color: T.accent }}>
                      POZASTAVENO
                    </h2>
                    <p className="text-lg mt-2" style={{ color: T.textMuted }}>
                      Operace je docasne pozastavena
                    </p>
                  </motion.div>
                ) : showEndTime && estimatedEndTime && shouldShowTime ? (
                  <motion.div
                    key="endtime"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6">
                    <span className="text-sm font-medium uppercase tracking-widest block mb-2" style={{ color: T.textFaint }}>
                      Odhadovany konec
                    </span>
                    <h2 className="text-6xl lg:text-7xl xl:text-8xl font-bold font-mono tabular-nums text-white">
                      {estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </h2>
                  </motion.div>
                ) : showPatientCalledText ? (
                  <motion.div
                    key="called"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mb-6">
                    <motion.div 
                      animate={{ rotate: [0, -10, 10, -10, 10, 0] }} 
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                      style={{ background: `${T.green}15`, border: `1px solid ${T.green}30` }}>
                      <Phone className="w-10 h-10" style={{ color: T.green }} />
                    </motion.div>
                    <h2 className="text-5xl lg:text-6xl font-bold text-white">Volani pacienta</h2>
                  </motion.div>
                ) : showPatientArrivedText ? (
                  <motion.div
                    key="arrived"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mb-6">
                    <motion.div 
                      animate={{ x: [0, 10, 0] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                      style={{ background: `${T.purple}15`, border: `1px solid ${T.purple}30` }}>
                      <BedDouble className="w-10 h-10" style={{ color: T.purple }} />
                    </motion.div>
                    <h2 className="text-5xl lg:text-6xl font-bold text-white">Prijezd pacienta</h2>
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStep?.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6">
                    <h2 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-tight">
                      {currentStep?.name || 'Status'}
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Timer badge */}
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <Timer className="w-5 h-5" style={{ color: activeColor }} />
                <span className="text-2xl font-mono font-semibold tabular-nums text-white">{elapsedTime}</span>
              </div>
              
              {/* Next step button - Premium */}
              {!isInteractionBlocked && (
                <motion.button
                  onClick={handleNextStep}
                  whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${activeColor}40` }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl font-bold text-lg transition-all relative overflow-hidden"
                  style={{ background: activeColor }}>
                  <span className="text-black">Dalsi faze</span>
                  <span className="text-black/60">{nextStep?.name || 'Status'}</span>
                  <ArrowRight className="w-6 h-6 text-black" />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Bottom Phase Progress - Modern Dots */}
          <div className="relative z-10 flex items-center justify-center gap-3 pb-8">
            {activeDbStatuses.map((status, index) => (
              <motion.div 
                key={status.id}
                className="relative group cursor-default"
                whileHover={{ scale: 1.2 }}>
                <motion.div
                  className="rounded-full transition-all duration-300"
                  animate={{
                    width: index === safeStepIndex ? 40 : 10,
                    height: 10,
                  }}
                  style={{
                    background: index <= safeStepIndex ? activeColor : T.border,
                    boxShadow: index === safeStepIndex ? `0 0 12px ${activeColor}` : 'none',
                  }} 
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: T.surfaceActive, color: T.text }}>
                  {status.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Panel - Premium Glass Sidebar */}
        <div className="w-80 lg:w-[380px] flex flex-col overflow-y-auto hide-scrollbar border-l"
          style={{ background: T.bgAlt, borderColor: T.border }}>
          
          {/* Estimated End Time - Hero Card */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div className="rounded-2xl p-5 relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(167,139,250,0.05) 100%)',
                border: `1px solid ${T.borderActive}`,
              }}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-2" style={{ color: T.textFaint }}>
                Odhadovany konec
              </span>
              <div className="flex items-center justify-between">
                <span className="text-4xl lg:text-5xl font-bold font-mono tabular-nums text-white">
                  {estimatedEndTime && shouldShowTime
                    ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </span>
                <div className="flex items-center gap-2">
                  <motion.button 
                    onClick={handleDecreaseTime} 
                    disabled={isInteractionBlocked || !estimatedEndTime}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <Minus className="w-5 h-5" style={{ color: T.textMuted }} />
                  </motion.button>
                  <motion.button 
                    onClick={handleIncreaseTime} 
                    disabled={isInteractionBlocked}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all"
                    style={{ background: T.accent }}>
                    <Plus className="w-5 h-5 text-black" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Modern Grid */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Rychle akce
            </span>
            <div className="grid grid-cols-2 gap-3">
              <ModernDesktopActionButton
                icon={isPaused ? Play : Pause}
                label={isPaused ? 'Pokracovat' : 'Pauza'}
                description={isPaused ? 'Obnovit operaci' : 'Docasne zastavit'}
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
              <ModernDesktopActionButton
                icon={ShieldAlert}
                label="Hygiena"
                description="Zvysena opatreni"
                active={room.isEnhancedHygiene}
                color={T.orange}
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                }}
              />
              <ModernDesktopActionButton
                icon={Phone}
                label={patientCalledTime ? patientCallElapsedTime : 'Volat'}
                description={patientCalledTime ? 'Ceka na prijezd' : 'Zavolat pacienta'}
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
              <ModernDesktopActionButton
                icon={BedDouble}
                label="Prijezd"
                description={patientArrivedTime ? 'Pacient na sale' : 'Potvrdit prijezd'}
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

          {/* Team - Premium Cards */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Operacni tym
            </span>
            <div className="flex flex-col gap-3">
              <motion.button 
                onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}20` }}>
                  <Stethoscope className="w-6 h-6" style={{ color: T.accent }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: T.textFaint }}>Lekar</span>
                  <span className="text-sm font-semibold text-white">{room?.staff?.doctor?.name || 'Neprirazen'}</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: T.textMuted }} />
              </motion.button>
              
              <motion.button 
                onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${T.green}15`, border: `1px solid ${T.green}20` }}>
                  <Heart className="w-6 h-6" style={{ color: T.green }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: T.textFaint }}>Sestra</span>
                  <span className="text-sm font-semibold text-white">{room?.staff?.nurse?.name || 'Neprirazena'}</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: T.textMuted }} />
              </motion.button>
            </div>
          </div>

          {/* All Phases - Timeline */}
          <div className="p-5 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-4" style={{ color: T.textFaint }}>
              Prubeh operace
            </span>
            <div className="flex flex-col gap-2">
              {activeDbStatuses.map((status, index) => (
                <motion.div 
                  key={status.id}
                  initial={false}
                  animate={{ 
                    scale: index === safeStepIndex ? 1 : 0.98,
                    opacity: index === safeStepIndex ? 1 : 0.7,
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all relative"
                  style={{
                    background: index === safeStepIndex ? `${activeColor}08` : 'transparent',
                    border: `1px solid ${index === safeStepIndex ? `${activeColor}25` : 'transparent'}`,
                  }}>
                  {/* Step number */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold relative"
                    style={{
                      background: index <= safeStepIndex ? status.color : T.surface,
                      color: index <= safeStepIndex ? '#000' : T.textMuted,
                      boxShadow: index === safeStepIndex ? `0 0 12px ${status.color}40` : 'none',
                    }}>
                    {index + 1}
                  </div>
                  
                  {/* Phase name */}
                  <span className="flex-1 text-sm font-medium" 
                    style={{ color: index === safeStepIndex ? 'white' : T.textMuted }}>
                    {status.name}
                  </span>
                  
                  {/* Status indicator */}
                  {index === safeStepIndex && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: `${activeColor}20`, color: activeColor }}>
                      Aktualni
                    </span>
                  )}
                  {index < safeStepIndex && (
                    <span className="text-[9px] font-medium" style={{ color: T.textFaint }}>Hotovo</span>
                  )}
                </motion.div>
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

// Modern Mobile Action Button Component
const ModernActionButton: React.FC<{
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
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 relative overflow-hidden"
    style={{
      background: active ? `${color}12` : T.surface,
      border: `1px solid ${active ? `${color}35` : T.border}`,
      boxShadow: active ? `0 4px 16px ${color}20` : 'none',
    }}>
    {/* Glow effect when active */}
    {active && (
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color}30 0%, transparent 70%)` }} />
    )}
    <Icon className="w-5 h-5 relative z-10" style={{ color: active ? color : T.textMuted }} />
    <span className="text-[9px] font-semibold relative z-10" style={{ color: active ? color : T.textMuted }}>{label}</span>
  </motion.button>
);

// Modern Desktop Action Button Component with description
const ModernDesktopActionButton: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  description?: string;
  active?: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, description, active, color, disabled, onClick }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40 relative overflow-hidden"
    style={{
      background: active ? `${color}12` : T.surface,
      border: `1px solid ${active ? `${color}35` : T.border}`,
      boxShadow: active ? `0 8px 24px ${color}25` : 'none',
    }}>
    {/* Glow effect when active */}
    {active && (
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color}25 0%, transparent 70%)` }} />
    )}
    <div className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10"
      style={{ background: `${color}15` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div className="text-center relative z-10">
      <span className="text-[11px] font-bold block" style={{ color: active ? color : T.text }}>{label}</span>
      {description && (
        <span className="text-[9px] block mt-0.5" style={{ color: T.textFaint }}>{description}</span>
      )}
    </div>
  </motion.button>
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
