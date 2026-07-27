
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, ArrowLeft, ArrowRight, Clock,
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity, BedDouble, ChevronLeft, Bell, Biohazard, Syringe, Megaphone,
  Utensils,
} from 'lucide-react';
import { recordStatusEvent, fetchBackgroundSettings, BackgroundSettings } from '../lib/db';
import StaffPickerModal, { StaffRole } from './StaffPickerModal';
import StepConfirmationOverlay from './StepConfirmationOverlay';
import NotificationOverlay from './NotificationOverlay';
import { useHospital } from '../contexts/HospitalContext';
import { MobileThemeToggle } from './mobile/MobileShell';
import { RapidSurgeryWarning } from './room/RapidSurgeryWarning';

// Formát uplynulého času: do 1 h jako mm:ss, od 1 h výše jako hh:mm.
const formatElapsed = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Kontrastní barva textu k barvě pozadí — světlé barvy fáze (tyrkys, žlutá…)
// dostanou tmavý text, tmavé barvy bílý (výpočet z relativní luminance).
const contrastText = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || '');
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0–255
  return lum > 145 ? '#17233F' : '#FFFFFF';
};

const CLEANING_WARNING_THRESHOLD_MS = 30 * 60 * 1000;
const CLEANING_WARNING_VISIBLE_MS = 10 * 1000;

const resolvePhaseStartTime = (room: OperatingRoom): Date => {
  const latestSegment = room.statusHistory?.[room.statusHistory.length - 1];
  const rawStart = room.phaseStartedAt
    || (latestSegment?.stepIndex === room.currentStepIndex ? latestSegment.startedAt : null);
  const parsed = rawStart ? new Date(rawStart) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface RoomDetailProps {
  room: OperatingRoom;
  allRooms?: OperatingRoom[];
  onClose: () => void;
  onStepChange: (index: number, stepColor?: string) => void;
  onEndTimeChange: (newTime: Date | null) => void;
  onEnhancedHygieneToggle?: (enabled: boolean) => void;
  onPauseChange?: (paused: boolean, pausedAt: string | null) => void;
  onStaffChange?: (role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => void;
  onPatientStatusChange?: (calledAt: string | null, arrivedAt: string | null) => void;
  onClearNotice?: () => void;
}

const usePrevious = (value: number) => {
  const ref = useRef<number | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room, allRooms = [], onClose, onStepChange, onEndTimeChange, onEnhancedHygieneToggle, onPauseChange, onStaffChange, onPatientStatusChange, onClearNotice }) => {
  const { activeHospitalId } = useHospital();
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Add null safety fallback to prevent crashes if context is not ready
  const activeDbStatuses = workflowStatuses || [];

  const [phaseStartTime, setPhaseStartTime] = useState(() => resolvePhaseStartTime(room));
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());
  const [isPaused, setIsPaused] = useState(room.isPaused || false);
  const [pauseStartedAt, setPauseStartedAt] = useState<Date | null>(() => {
    const parsed = room.pausedAt ? new Date(room.pausedAt) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  });
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
  const [pendingStepElapsedSeconds, setPendingStepElapsedSeconds] = useState<number | null>(null);
  const [patientCallElapsedTime, setPatientCallElapsedTime] = useState('00:00');
  const [showPatientCalledText, setShowPatientCalledText] = useState(false);
  const [showPatientArrivedText, setShowPatientArrivedText] = useState(false);
  const patientCallTimerRef = useRef<number | null>(null);
  // Informační zpráva administrátora — popup vyžadující zavření
  const [dismissedNoticeAt, setDismissedNoticeAt] = useState<string | null>(null);
  const showNotice = !!room.noticeMessage && room.noticeAt !== dismissedNoticeAt;
  const handleCloseNotice = () => {
    setDismissedNoticeAt(room.noticeAt ?? null);
    onClearNotice?.();
  };
  // Auto-ukončení úklidu po 30 min + 10s upozornění v kruhové grafice
  const [showCleaningWarning, setShowCleaningWarning] = useState(false);
  const cleaningWarningRef = useRef<{ stepIndex: number; handled: boolean }>({ stepIndex: -1, handled: false });
  const cleaningTimeoutRef = useRef<number | null>(null);

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
      if (cleaningTimeoutRef.current) clearTimeout(cleaningTimeoutRef.current);
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
      setLiveNowMs(now.getTime());
      const diff = now.getTime() - phaseStartTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      setElapsedTime(formatElapsed(totalSeconds));
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

    const pauseStartTime = pauseStartedAt || new Date();
    const updatePauseTime = () => {
      const now = new Date();
      const diff = now.getTime() - pauseStartTime.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      setPauseElapsedTime(formatElapsed(totalSeconds));
    };
    
    updatePauseTime();
    const timer = setInterval(updatePauseTime, 1000);

    return () => clearInterval(timer);
  }, [isPaused, pauseStartedAt]);

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
      setPatientCallElapsedTime(formatElapsed(totalSeconds));
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
    if (!room.isPaused) {
      setPauseStartedAt(null);
      return;
    }
    const parsed = room.pausedAt ? new Date(room.pausedAt) : null;
    setPauseStartedAt(previous => (
      parsed && !Number.isNaN(parsed.getTime()) ? parsed : previous || new Date()
    ));
  }, [room.isPaused, room.pausedAt]);

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
  const latestStatusStartedAt = room.statusHistory?.[room.statusHistory.length - 1]?.startedAt;

  useEffect(() => {
    setPhaseStartTime(resolvePhaseStartTime(room));
  }, [room.id, room.currentStepIndex, room.phaseStartedAt, latestStatusStartedAt]);
  
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

  // Reálné procentuální zastoupení fází aktuálního cyklu. Historické úseky
  // končí začátkem následující fáze, poslední aktivní úsek průběžně roste.
  const livePhaseShares = useMemo(() => {
    if (activeDbStatuses.length === 0) return [];

    const history = (room.statusHistory || [])
      .map(segment => ({ ...segment, startedMs: new Date(segment.startedAt).getTime() }))
      .filter(segment => Number.isFinite(segment.startedMs))
      .sort((a, b) => a.startedMs - b.startedMs);

    let cycleStart = 0;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (history[index].stepIndex === 0) {
        cycleStart = index;
        break;
      }
    }

    const cycle = history.slice(cycleStart);
    const durations = new Array(activeDbStatuses.length).fill(0) as number[];

    cycle.forEach((segment, index) => {
      if (segment.stepIndex < 0 || segment.stepIndex >= durations.length) return;
      const nextStart = cycle[index + 1]?.startedMs;
      const endMs = Number.isFinite(nextStart) ? nextStart : liveNowMs;
      durations[segment.stepIndex] += Math.max(0, endMs - segment.startedMs);
    });

    // Při chybějícím nebo opožděném realtime záznamu stále zobrazujeme
    // aktuální fázi z lokálního phaseStartedAt.
    const latestCycleSegment = cycle[cycle.length - 1];
    if (!latestCycleSegment || latestCycleSegment.stepIndex !== safeStepIndex) {
      durations[safeStepIndex] += Math.max(0, liveNowMs - phaseStartTime.getTime());
    }

    let totalMs = durations.reduce((sum, duration) => sum + duration, 0);
    if (totalMs <= 0) {
      durations[safeStepIndex] = 1;
      totalMs = 1;
    }

    const rawPercentages = durations.map(duration => (duration / totalMs) * 100);
    const percentages = rawPercentages.map(value => Math.floor(value));
    let remainingPoints = 100 - percentages.reduce((sum, value) => sum + value, 0);
    rawPercentages
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder)
      .forEach(item => {
        if (remainingPoints <= 0) return;
        percentages[item.index] += 1;
        remainingPoints -= 1;
      });

    return activeDbStatuses.map((status, index) => ({
      name: status.title || status.name || `Fáze ${index + 1}`,
      color: status.color || '#8B5CF6',
      percentage: percentages[index],
      isActive: index === safeStepIndex,
    }));
  }, [activeDbStatuses, liveNowMs, phaseStartTime, room.statusHistory, safeStepIndex]);
  
  // Don't show time only for "Sal priprav*" status (ASCII-safe)
  // Normalize string to remove diacritics for comparison
  const statusName = (currentStep?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isReadyStatus = statusName.includes('priprav');
  const isCleaningStatus = statusName.includes('uklid');
  const isPauseWorkflowStatus = statusName.includes('pauza') || statusName.includes('obed') || statusName.includes('lunch');
  const isPauseActive = isPaused || isPauseWorkflowStatus;
  const shouldShowTime = !isReadyStatus;

  // Dynamic theme color based on status
  const activeColor = room.isEmergency 
    ? '#FF3B30' 
    : (room.isLocked 
        ? '#FBBF24' 
        : (isPaused ? '#06b6d4' : (currentStep?.color || '#6B7280')));

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
    setPendingStepElapsedSeconds(Math.max(0, Math.floor((Date.now() - phaseStartTime.getTime()) / 1000)));
    setPendingStepIndex(nextIndex);
  };

  // Auto-ukončení úklidu sálu: pokud úklid trvá > 30 min, zobraz 10s upozornění
  // v kruhové grafice a poté automaticky přepni na další status.
  useEffect(() => {
    // Při změně statusu vynuluj příznak a případné upozornění
    if (cleaningWarningRef.current.stepIndex !== safeStepIndex) {
      cleaningWarningRef.current = { stepIndex: safeStepIndex, handled: false };
      setShowCleaningWarning(false);
      if (cleaningTimeoutRef.current) { clearTimeout(cleaningTimeoutRef.current); cleaningTimeoutRef.current = null; }
    }

    if (!isCleaningStatus || isPaused || cleaningWarningRef.current.handled) return;

    // Skutečný začátek úklidu z historie statusů (fallback na lokální časovač fáze)
    const seg = room.statusHistory && room.statusHistory.length > 0
      ? room.statusHistory[room.statusHistory.length - 1]
      : null;
    const startMs = seg && seg.stepIndex === safeStepIndex
      ? new Date(seg.startedAt).getTime()
      : phaseStartTime.getTime();

    const check = () => {
      if (cleaningWarningRef.current.handled) return;
      cleaningWarningRef.current.handled = true;
      setShowCleaningWarning(true);
      // Upozornění zmizí po 10 s; samotné přepnutí statusu řeší globální
      // watcher v App (funguje i bez otevřeného detailu) → žádné dvojí přepnutí.
      cleaningTimeoutRef.current = window.setTimeout(() => {
        setShowCleaningWarning(false);
      }, CLEANING_WARNING_VISIBLE_MS);
    };

    const elapsedMs = Date.now() - startMs;
    const remainingMs = Math.max(0, CLEANING_WARNING_THRESHOLD_MS - elapsedMs);
    cleaningTimeoutRef.current = window.setTimeout(check, remainingMs);

    return () => {
      if (cleaningTimeoutRef.current) {
        clearTimeout(cleaningTimeoutRef.current);
        cleaningTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCleaningStatus, isPaused, safeStepIndex, nextStepIndex, room.statusHistory, phaseStartTime]);

  const confirmStepChange = () => {
    if (pendingStepIndex === null) return;
    changeStep(pendingStepIndex);
    setPendingStepIndex(null);
    setPendingStepElapsedSeconds(null);
  };

  const cancelStepChange = () => {
    setPendingStepIndex(null);
    setPendingStepElapsedSeconds(null);
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
      const now = new Date();
      
      if (prev === null) {
        // Žádný čas nebyl nastaven — začni od aktuálního času zaokrouhleného na 15 min
        newTime = roundUpTo15Min(now);
      } else if (prev.getTime() < now.getTime()) {
        // Starý odhadovaný čas je v minulosti — reset na aktuální čas + 15 min
        newTime = roundUpTo15Min(new Date(now.getTime() + 15 * 60 * 1000));
      } else {
        // Odhadovaný čas je v budoucnosti — přidej 15 min
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
      {/* ========== INFORMAČNÍ ZPRÁVA ADMINISTRÁTORA — popup vyžadující zavření ========== */}
      <AnimatePresence>
        {showNotice && (
          <motion.div
            key="room-notice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="relative w-full max-w-xl rounded-[2rem] border border-white/12 p-8 sm:p-10 text-center overflow-hidden"
              style={{ background: 'rgba(13,19,32,0.98)', backdropFilter: 'blur(40px)', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}
            >
              <div aria-hidden className="absolute inset-x-12 top-0 h-[2px] rounded-full" style={{ background: 'linear-gradient(to right, transparent, #22D3EE, transparent)' }} />
              <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: '#22D3EE', opacity: 0.16 }} />

              <div className="relative flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.14)', border: '1px solid rgba(34,211,238,0.4)' }}>
                  <Megaphone className="w-8 h-8" style={{ color: '#22D3EE' }} />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40">Zpráva pro sál</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug whitespace-pre-wrap break-words max-w-[92%]">
                  {room.noticeMessage}
                </h2>
                {room.noticeSender && (
                  <p className="text-sm text-white/45">— {room.noticeSender}</p>
                )}
                <button
                  onClick={handleCloseNotice}
                  className="mt-2 px-8 py-3 rounded-full text-base font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#22D3EE', boxShadow: '0 10px 28px -8px #22D3EE' }}
                >
                  Rozumím
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE LAYOUT (md:hidden) — světlý design dle předlohy ========== */}
      <div
        className="mobile-room-detail flex md:hidden w-full h-full flex-col relative overflow-hidden"
        style={{ background: 'var(--m-page-bg)' }}
      >

        {/* Content */}
        <div
          className="relative z-10 flex flex-col h-full px-5 overflow-y-auto hide-scrollbar"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
            paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Header — zpět · název + podtitul · zvonek s badge */}
          <div className="mobile-room-detail-header flex items-center gap-3.5 mb-6">
            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 outline-none select-none transition-all"
              style={{ background: 'var(--m-card)', boxShadow: '0 6px 18px rgba(23,43,99,0.10)' }}
            >
              <ArrowLeft className="w-[19px] h-[19px]" style={{ color: 'var(--m-text)' }} strokeWidth={2.25} />
            </button>
            <div className="mobile-room-detail-title flex flex-col flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] leading-none" style={{ color: 'var(--m-muted)' }}>
                Operační sál
              </p>
              <h1 className="text-[17px] font-extrabold truncate leading-none mt-1.5" style={{ color: 'var(--m-text)' }}>
                {room.name}
              </h1>
            </div>
            <MobileThemeToggle className="shrink-0" />
            <button
              onClick={() => setNotificationOverlayOpen(true)}
              className="relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 outline-none select-none transition-all"
              style={{ background: 'var(--m-card)', boxShadow: '0 6px 18px rgba(23,43,99,0.10)' }}
            >
              <Bell className="w-[19px] h-[19px]" style={{ color: 'var(--m-text)' }} strokeWidth={2} />
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#E5484D', borderColor: 'var(--m-card-solid)' }}
              />
            </button>
          </div>

          <RapidSurgeryWarning
            room={room}
            statuses={activeDbStatuses}
            className="mb-5"
          />

          {/* Hero „karta" — plná barva fáze, tmavý text (jako VISA karta) */}
          <motion.div
            key={currentStep?.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mobile-room-phase-card rounded-[24px] p-6 mb-5 relative overflow-hidden"
            style={{
              '--room-phase-color': activeColor,
              // Pastelový tint v barvě AKTUÁLNÍ FÁZE nad bílým podkladem
              background: `linear-gradient(135deg, ${activeColor}40 0%, ${activeColor}20 100%), var(--m-card-solid)`,
              border: `1px solid ${activeColor}4A`,
              boxShadow: `0 14px 34px ${activeColor}24, var(--m-card-shadow)`,
            } as React.CSSProperties}
          >
            <div className="mobile-room-phase-meta relative flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--m-muted)' }}>Aktuální fáze</h2>
              <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--m-muted)' }}>
                <i className="inline-block w-2 h-2 rounded-full mr-2 not-italic" style={{ background: activeColor }} />
                {safeStepIndex + 1}/{validStepCount}
              </span>
            </div>
            <div className="mobile-room-phase-body relative">
              {/* Levá polovina — název fáze + uplynulý čas */}
              <div className="mobile-room-phase-content min-w-0 flex flex-col justify-center py-1">
                <p className="text-[24px] font-extrabold leading-tight tracking-tight" style={{ color: 'var(--m-text)' }}>
                  {room.isEmergency
                    ? 'Stav nouze'
                    : room.isLocked
                    ? 'Uzamčen'
                    : currentStep?.name || 'Status'}
                  {isPaused && <span className="text-[20px] font-extrabold uppercase tracking-[-0.01em]" style={{ color: '#22D3EE' }}> · PAUZA</span>}
                </p>

                <div className="flex items-center gap-1.5 mt-3">
                  <Clock className="mobile-room-elapsed-icon w-4 h-4" style={{ color: 'var(--m-text)' }} strokeWidth={2.25} />
                  <span className="mobile-room-elapsed-label hidden text-[13px] font-medium" style={{ color: 'var(--m-muted)' }}>Uplynulo:</span>
                  <span className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--m-text)' }}>
                    {elapsedTime}
                  </span>
                </div>
                {isPauseActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mobile-room-pause-runtime mt-3 inline-flex self-start items-center gap-2 rounded-[12px] px-2.5 py-2"
                    style={{
                      background: 'rgba(6,182,212,0.13)',
                      border: '1px solid rgba(34,211,238,0.34)',
                      color: '#22D3EE',
                    }}
                  >
                    <span className="text-[13px] font-extrabold uppercase tracking-[0.11em] leading-none">
                      {isPauseWorkflowStatus ? (currentStep?.title || currentStep?.name || 'Pauza') : 'Pauza'}
                    </span>
                    <span className="text-[12px] font-extrabold tabular-nums leading-none">
                      {isPaused ? pauseElapsedTime : elapsedTime}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Pravá polovina boxu — velké tlačítko „Další fáze" se šipkou */}
              {(!isInteractionBlocked || isPauseActive) && (() => {
                const nextIdx = validStepCount > 0 ? (safeStepIndex + 1) % validStepCount : 0;
                const nextName = nextIdx === 0
                  ? 'Nový cyklus'
                  : (activeDbStatuses[nextIdx]?.name || 'Další krok');
                const ctaText = contrastText(activeColor);
                return (
                  <motion.button
                    onClick={isPaused ? undefined : handleNextStep}
                    disabled={isPaused}
                    aria-label={isPauseActive ? 'Probíhá pauza' : 'Přejít na další fázi'}
                    whileTap={{ scale: 0.97 }}
                    className="mobile-room-next-button w-1/2 shrink-0 min-h-[128px] rounded-[18px] flex flex-col items-center justify-center gap-2 px-3 py-4 outline-none select-none relative overflow-hidden disabled:cursor-default"
                    style={{
                      background: `linear-gradient(150deg, ${activeColor} 0%, ${activeColor}D9 100%)`,
                      boxShadow: `0 14px 30px -8px ${activeColor}80, inset 0 1px 0 rgba(255,255,255,0.28)`,
                    }}
                  >
                    {/* Jemný diagonální lesk */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, transparent 42%)' }}
                    />
                    {/* Šipka v bílém kroužku — jemně se posouvá směrem k dalšímu kroku */}
                    <motion.span
                      className={`mobile-room-next-icon relative w-12 h-12 rounded-full flex items-center justify-center${isPauseActive ? ' mobile-room-pause-icon' : ''}`}
                      animate={isPauseActive
                        ? { y: [0, -4, 0], rotate: [-6, 6, -6], scale: [1, 1.08, 1] }
                        : { x: [0, 5, 0] }}
                      transition={{ duration: isPauseActive ? 1.25 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        // Na světlých barvách fáze tmavý kroužek s bílou šipkou, jinak naopak
                        background: ctaText === '#17233F' ? '#17233F' : '#FFFFFF',
                        boxShadow: '0 4px 14px rgba(23,43,99,0.20)',
                      }}
                    >
                      {isPauseActive ? (
                        <>
                          <Utensils className="w-8 h-8" strokeWidth={2.35} />
                          <motion.i
                            aria-hidden
                            className="absolute top-3 left-1/2 w-1.5 h-1.5 rounded-full bg-current not-italic"
                            animate={{ y: [2, -10], opacity: [0, 0.8, 0], scale: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.15, repeat: Infinity, ease: 'easeOut' }}
                          />
                        </>
                      ) : (
                        <Play
                          className="w-6 h-6"
                          style={{ color: ctaText === '#17233F' ? '#FFFFFF' : activeColor }}
                          strokeWidth={2.5}
                        />
                      )}
                    </motion.span>
                    <span className="mobile-room-next-label relative text-[14px] font-bold leading-none mt-1" style={{ color: ctaText }}>
                      Další fáze
                    </span>
                    <span
                      className="mobile-room-next-label relative text-[10.5px] font-medium truncate max-w-full px-1 leading-none"
                      style={{ color: ctaText, opacity: 0.82 }}
                    >
                      {nextName}
                    </span>
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>

          {/* Reálný podíl jednotlivých fází aktuálního cyklu */}
          <section className="mobile-room-phase-shares mb-5">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--m-muted)' }}>
                Zastoupení fází
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#10B981' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Živě
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {livePhaseShares.map((phase, index) => (
                <motion.div
                  key={`${phase.name}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="mobile-room-phase-share min-w-[68px] flex-1 rounded-[14px] px-2 py-2.5 text-center overflow-hidden relative"
                  style={{
                    background: phase.isActive ? `${phase.color}1A` : 'var(--m-card)',
                    border: `1px solid ${phase.isActive ? `${phase.color}55` : 'var(--m-border)'}`,
                    boxShadow: phase.isActive ? `0 8px 20px ${phase.color}18` : 'var(--m-card-shadow)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[2px] rounded-full"
                    style={{ background: phase.color, opacity: phase.isActive ? 1 : 0.45 }}
                  />
                  <p className="text-[16px] font-extrabold tabular-nums leading-none" style={{ color: phase.isActive ? phase.color : 'var(--m-text-strong)' }}>
                    {phase.percentage}<span className="text-[9px] ml-0.5">%</span>
                  </p>
                  <p className="mt-1.5 text-[7px] font-bold uppercase tracking-[0.08em] truncate" style={{ color: 'var(--m-muted)' }} title={phase.name}>
                    {phase.name}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Odhadovaný konec — bílá karta, modrý čas, kruhová ± */}
          <div
            className="mobile-room-estimate-card rounded-[24px] px-5 py-4 mb-6 flex items-center justify-between gap-3"
            style={{ background: 'var(--m-card)', boxShadow: '0 10px 26px rgba(23,43,99,0.07)' }}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-none" style={{ color: 'var(--m-muted)' }}>
                Odhadovaný konec
              </p>
              <p className="text-[30px] font-extrabold tabular-nums mt-2 leading-none tracking-tight" style={{ color: 'var(--m-accent)' }}>
                {estimatedEndTime && shouldShowTime
                  ? estimatedEndTime.toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <motion.button
                onClick={handleDecreaseTime}
                disabled={isInteractionBlocked || !estimatedEndTime}
                whileTap={{ scale: 0.94 }}
                className="mobile-room-time-button w-11 h-11 rounded-[14px] flex items-center justify-center disabled:opacity-30 outline-none select-none"
                style={{ background: 'var(--m-card)', border: '1px solid var(--m-border)', boxShadow: '0 4px 12px rgba(23,43,99,0.07)' }}
              >
                <Minus className="w-5 h-5" strokeWidth={2.25} style={{ color: 'var(--m-text)' }} />
              </motion.button>
              <motion.button
                onClick={handleIncreaseTime}
                disabled={isInteractionBlocked}
                whileTap={{ scale: 0.94 }}
                className="mobile-room-time-button mobile-room-time-button-primary w-11 h-11 rounded-[14px] flex items-center justify-center disabled:opacity-30 outline-none select-none"
                style={{ background: 'var(--m-card)', border: '1px solid var(--m-border)', boxShadow: '0 4px 12px rgba(23,43,99,0.07)' }}
              >
                <Plus className="w-5 h-5" strokeWidth={2.25} style={{ color: 'var(--m-text)' }} />
              </motion.button>
            </div>
          </div>

          {/* Categories — action tiles section */}
          <div className="mb-6">
            <h2 className="text-[15px] font-bold mb-3.5 px-0.5" style={{ color: 'var(--m-text)' }}>Akce</h2>
            <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-3">
              {/* Pause */}
              <motion.button
                onClick={async () => {
                  const newPaused = !isPaused;
                  const pausedAt = newPaused ? new Date() : null;
                  const pausedAtIso = pausedAt?.toISOString() || null;
                  setIsPaused(newPaused);
                  setPauseStartedAt(pausedAt);
                  onPauseChange?.(newPaused, pausedAtIso);
                  await recordStatusEvent({
                    operating_room_id: room.id,
                    event_type: newPaused ? 'pause' : 'resume',
                    step_index: currentStepIndex,
                    step_name: currentStep?.name || 'Status',
                  });
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`mobile-room-action mobile-room-action-pause${isPaused ? ' is-active' : ''} relative overflow-hidden aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 outline-none select-none transition-all`}
                style={{
                  background: isPaused ? 'var(--m-accent-soft)' : 'var(--m-card)',
                  border: isPaused ? '1px solid rgba(var(--m-accent-rgb),0.45)' : '1px solid transparent',
                  boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
                }}
              >
                <div
                  className="mobile-room-action-icon w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--m-accent-soft)', border: '1.5px solid rgba(var(--m-accent-rgb),0.35)' }}
                >
                  {isPaused ? (
                    <Play className="w-6 h-6" strokeWidth={2} style={{ color: 'var(--m-accent)' }} />
                  ) : (
                    <Pause className="w-6 h-6" strokeWidth={2} style={{ color: 'var(--m-accent)' }} />
                  )}
                </div>
                <span
                  className="mobile-room-action-label text-[12px] font-semibold tracking-tight leading-tight"
                  style={{ color: isPaused ? 'var(--m-accent)' : 'var(--m-text)' }}
                >
                  {isPaused ? 'Pokračovat' : 'Pauza'}
                </span>
              </motion.button>

              {/* Hygiene */}
              <motion.button
                onClick={async () => {
                  const newH = !room.isEnhancedHygiene;
                  onEnhancedHygieneToggle?.(newH);
                  await recordStatusEvent({
                    operating_room_id: room.id,
                    event_type: newH ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
                    step_index: currentStepIndex,
                    step_name: currentStep?.name || 'Status',
                  });
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`mobile-room-action mobile-room-action-hygiene${room.isEnhancedHygiene ? ' is-active' : ''} relative overflow-hidden aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 outline-none select-none transition-all`}
                style={{
                  background: room.isEnhancedHygiene ? 'var(--m-accent-soft)' : 'var(--m-card)',
                  border: room.isEnhancedHygiene ? '1px solid rgba(var(--m-accent-rgb),0.45)' : '1px solid transparent',
                  boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
                }}
              >
                <div
                  className="mobile-room-action-icon w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--m-accent-soft)', border: '1.5px solid rgba(var(--m-accent-rgb),0.35)' }}
                >
                  <ShieldAlert className="w-6 h-6" style={{ color: 'var(--m-accent)' }} strokeWidth={2} />
                </div>
                <span
                  className="mobile-room-action-label text-[12px] font-semibold tracking-tight leading-tight"
                  style={{ color: room.isEnhancedHygiene ? 'var(--m-accent)' : 'var(--m-text)' }}
                >
                  Hygiena
                </span>
              </motion.button>

              {/* Call patient */}
              <motion.button
                onClick={async () => {
                  if (!patientCalledTime) {
                    const now = new Date();
                    setPatientCalledTime(now);
                    setShowPatientCalledText(true);
                    setTimeout(() => setShowPatientCalledText(false), 5000);
                    onPatientStatusChange?.(now.toISOString(), null);
                    await recordStatusEvent({
                      operating_room_id: room.id,
                      event_type: 'patient_call',
                      step_index: currentStepIndex,
                      step_name: currentStep?.name || 'Status',
                    });
                  }
                }}
                disabled={!!patientCalledTime}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`mobile-room-action mobile-room-action-call${patientCalledTime ? ' is-active' : ''} relative overflow-hidden aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 outline-none select-none transition-all disabled:cursor-not-allowed`}
                style={{
                  background: patientCalledTime ? 'var(--m-accent-soft)' : 'var(--m-card)',
                  border: patientCalledTime ? '1px solid rgba(var(--m-accent-rgb),0.45)' : '1px solid transparent',
                  boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
                }}
              >
                <div
                  className="mobile-room-action-icon w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--m-accent-soft)', border: '1.5px solid rgba(var(--m-accent-rgb),0.35)' }}
                >
                  <Phone className="w-6 h-6" style={{ color: 'var(--m-accent)' }} strokeWidth={2} />
                </div>
                <span
                  className="mobile-room-action-label text-[12px] font-semibold tracking-tight tabular-nums leading-tight"
                  style={{ color: patientCalledTime ? 'var(--m-accent)' : 'var(--m-text)' }}
                >
                  {patientCalledTime ? patientCallElapsedTime : 'Volat'}
                </span>
              </motion.button>

              {/* Patient arrived */}
              <motion.button
                onClick={async () => {
                  if (patientCalledTime && !patientArrivedTime) {
                    const now = new Date();
                    setPatientArrivedTime(now);
                    setShowPatientArrivedText(true);
                    onPatientStatusChange?.(
                      patientCalledTime.toISOString(),
                      now.toISOString(),
                    );
                    await recordStatusEvent({
                      operating_room_id: room.id,
                      event_type: 'patient_arrived',
                      step_index: currentStepIndex,
                      step_name: currentStep?.name || 'Status',
                    });
                    setTimeout(() => {
                      setShowPatientArrivedText(false);
                    }, 5000);
                  }
                }}
                disabled={!patientCalledTime || !!patientArrivedTime}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`mobile-room-action mobile-room-action-arrival${patientArrivedTime ? ' is-active' : ''} relative overflow-hidden aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 outline-none select-none transition-all disabled:cursor-not-allowed`}
                style={{
                  background: patientArrivedTime ? 'var(--m-accent-soft)' : 'var(--m-card)',
                  border: patientArrivedTime ? '1px solid rgba(var(--m-accent-rgb),0.45)' : '1px solid transparent',
                  boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
                  opacity: !patientCalledTime ? 0.55 : 1,
                }}
              >
                <div
                  className="mobile-room-action-icon w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--m-accent-soft)', border: '1.5px solid rgba(var(--m-accent-rgb),0.35)' }}
                >
                  <BedDouble className="w-6 h-6" style={{ color: 'var(--m-accent)' }} strokeWidth={2} />
                </div>
                <span
                  className="mobile-room-action-label text-[12px] font-semibold tracking-tight leading-tight"
                  style={{ color: patientArrivedTime ? 'var(--m-accent)' : 'var(--m-text)' }}
                >
                  Příjezd
                </span>
              </motion.button>
            </div>
          </div>

          {/* Staff — bílé řádky se jménem a rolí */}
          <div className="mb-4">
            <h2 className="text-[15px] font-bold mb-3 px-0.5" style={{ color: 'var(--m-text)' }}>Tým</h2>
            <div className="mobile-room-team-grid flex flex-col gap-2.5">
              {([
                {
                  role: 'doctor' as const,
                  label: 'Lékař',
                  name: room?.staff?.doctor?.name,
                  fallback: 'Nepřiřazen',
                },
                {
                  role: 'nurse' as const,
                  label: 'Sestra',
                  name: room?.staff?.nurse?.name,
                  fallback: 'Nepřiřazena',
                },
              ]).map(({ role, label, name, fallback }) => (
                <button
                  key={role}
                  onClick={() => {
                    setStaffPickerRole(role);
                    setStaffPickerOpen(true);
                  }}
                  className={`mobile-room-team-card mobile-room-team-${role} flex items-center gap-3.5 px-4 py-3.5 rounded-[18px] active:scale-[0.99] text-left w-full outline-none select-none transition-all`}
                  style={{ background: 'var(--m-card)', boxShadow: '0 8px 20px rgba(23,43,99,0.06)' }}
                >
                  <span className="mobile-room-team-icon w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0">
                    {role === 'doctor'
                      ? <Stethoscope className="w-5 h-5" strokeWidth={2} />
                      : <Heart className="w-5 h-5" strokeWidth={2} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[8px] font-bold uppercase tracking-[0.18em] leading-none" style={{ color: 'var(--m-muted)' }}>
                      {label}
                    </span>
                    <span className="block mt-1.5 text-[13px] font-bold truncate leading-none" style={{ color: 'var(--m-text)' }}>
                      {name || fallback}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--m-faint)' }} strokeWidth={2.25} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (hidden on mobile) ========== */}
      <div className="hidden md:block w-full h-full overflow-hidden">
      {/* Status Overlay Effects — emergency / locked rámeček */}
      {room.isEmergency ? (
        <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-red-500/30" />
      ) : room.isLocked ? (
        <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-amber-500/20" />
      ) : null}


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
              <h1
                className={`text-[clamp(1.75rem,4.5vw,3.75rem)] font-bold tracking-tight uppercase leading-none truncate max-w-[60vw] ${
                  room.isEmergency ? 'text-red-500' : (room.isLocked ? 'text-amber-500' : 'text-white/95')
                }`}
              >
                {room.name}
              </h1>

              {room.isEmergency ? (
                <div className="bg-red-500 text-white px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-2xl flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <AlertTriangle className="w-[clamp(1rem,2vw,2rem)] h-[clamp(1rem,2vw,2rem)]" />
                  <span className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-black uppercase tracking-widest">EMERGENCY</span>
                </div>
              ) : room.isLocked ? (
                <div className="bg-amber-500 text-white px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-2xl flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <Lock className="w-[clamp(1rem,1.8vw,1.75rem)] h-[clamp(1rem,1.8vw,1.75rem)]" />
                  <span className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-black uppercase tracking-widest">SÁL UZAMČEN</span>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
          <p className="text-[clamp(8px,0.8vw,11px)] font-black text-white/30 tracking-[0.5em] uppercase mt-[clamp(0.75rem,1.5vw,1.25rem)]">CHIRURGICKÝ BLOK • OVLÁDÁNÍ SÁLU</p>
        </div>
      </header>

      <div className="absolute left-1/2 top-[clamp(6.5rem,15vh,10rem)] z-50 w-[min(560px,58vw)] -translate-x-1/2">
        <RapidSurgeryWarning
          room={room}
          statuses={activeDbStatuses}
          variant="desktop"
        />
      </div>


      {/* Right Column Action Buttons - Absolute Positioning */}
      {/* Close Button and Notification Button - Top Right */}
      <div className="absolute top-2 sm:top-4 md:top-6 lg:top-8 right-2 sm:right-4 md:right-6 lg:right-8 flex flex-col gap-2 sm:gap-3 md:gap-4 z-50">
        {/* Close Button */}
        <button 
          onClick={onClose}
          aria-label="Zavřít detail sálu"
          className="p-2 sm:p-3 md:p-4 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-70 hover:opacity-100 flex items-center justify-center h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white/70" />
        </button>

        {/* Notification Button */}
        <motion.button 
          onClick={() => setNotificationOverlayOpen(true)}
          aria-label="Otevřít notifikace"
          className="p-2 sm:p-3 md:p-4 hover:bg-orange-500/20 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-70 hover:opacity-100 flex flex-col items-center justify-center gap-1 h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 hover:border-orange-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white/70" />
          <span className="hidden sm:block text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white/70">Notifikace</span>
        </motion.button>
      </div>

      {/* Staff Names - Top Right next to close button (Desktop only) */}
      <div className="hidden lg:flex absolute top-8 right-40 flex-row gap-3 h-24 z-50">
        {/* Notifikace „Infekční pacient" — zobrazí se POUZE při zvýšeném
            hygienickém režimu, ve stejném řádku a zarovnání jako personál. */}
        <AnimatePresence>
          {room.isEnhancedHygiene && (
            <motion.div
              key="hyg-staff-card"
              initial={{ opacity: 0, x: 16, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="rounded-2xl p-3 backdrop-blur-md whitespace-nowrap flex flex-col justify-center gap-1 h-full"
              style={{
                background: 'linear-gradient(135deg, rgba(120,50,10,0.55) 0%, rgba(60,25,5,0.45) 100%)',
                border: '1px solid rgba(249,115,22,0.5)',
                boxShadow: '0 0 24px -6px rgba(249,115,22,0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Biohazard className="w-5 h-5" style={{ color: '#FB923C', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.7))' }} strokeWidth={2.2} />
                </motion.div>
                <span className="text-sm font-bold" style={{ color: '#FDBA74' }}>Infekční pacient</span>
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: '#F97316' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#F97316' }} />
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-wider text-left" style={{ color: 'rgba(253,186,116,0.7)' }}>
                Zvýšený hygienický režim
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Doctor Button */}
        <button
          onClick={() => { setStaffPickerRole('doctor'); setStaffPickerOpen(true); }}
          className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center gap-2 px-1 h-24 w-24 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer active:scale-95"
        >
          <Stethoscope className="w-8 h-8 text-white/70" strokeWidth={2} />
          <span className={`text-[10px] font-bold uppercase tracking-widest leading-tight text-center line-clamp-2 ${room?.staff?.doctor?.name ? 'text-violet-300' : 'text-white/70'}`}>
            {room?.staff?.doctor?.name || 'Lékař'}
          </span>
        </button>
        {/* Nurse Button */}
        <button
          onClick={() => { setStaffPickerRole('nurse'); setStaffPickerOpen(true); }}
          className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center gap-2 px-1 h-24 w-24 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer active:scale-95"
        >
          <Syringe className="w-8 h-8 text-white/70" strokeWidth={2} />
          <span className={`text-[10px] font-bold uppercase tracking-widest leading-tight text-center line-clamp-2 ${room?.staff?.nurse?.name ? 'text-emerald-300' : 'text-white/70'}`}>
            {room?.staff?.nurse?.name || 'Sestra'}
          </span>
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
                onPatientStatusChange?.(now.toISOString(), null);
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: 'patient_call',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                });
              }
            }}
            disabled={!!patientCalledTime}
            aria-label="Volat pacienta"
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-1 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100 ${
              patientCalledTime && !patientArrivedTime
                ? 'bg-green-500/20 border-green-500/40 opacity-100 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : patientArrivedTime
                ? 'bg-white/5 border-white/10 opacity-60'
                : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
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
                  <Phone className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${patientArrivedTime ? 'text-white/30' : 'text-white/70'}`} strokeWidth={2} />
                  <span className={`text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${patientArrivedTime ? 'text-white/30' : 'text-white/70'}`}>Volat</span>
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
            aria-label="Potvrdit příjezd pacienta"
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100 ${
              patientArrivedTime
                ? 'bg-blue-500/20 border-blue-500/40 opacity-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : !patientCalledTime
                ? 'bg-white/5 border-white/10 opacity-40'
                : 'bg-blue-500/10 border-blue-500/30 opacity-100 hover:opacity-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserCheck className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${patientArrivedTime ? 'text-blue-300' : patientCalledTime ? 'text-blue-300' : 'text-white/70'}`} strokeWidth={2} />
            <span className={`text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${patientArrivedTime ? 'text-blue-300' : patientCalledTime ? 'text-blue-300' : 'text-white/70'}`}>Příjezd</span>
          </motion.button>
        </div>

        {/* HYGIENA and PAUZA Container - Vertical */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          {/* Enhanced Hygiene Mode Toggle */}
          <motion.button
            onClick={async () => {
              const newHygieneState = !room.isEnhancedHygiene;
              onEnhancedHygieneToggle?.(newHygieneState);
              await recordStatusEvent({
                operating_room_id: room.id,
                event_type: newHygieneState ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
                step_index: currentStepIndex,
                step_name: currentStep.title,
              });
            }}
            aria-label={room.isEnhancedHygiene ? 'Vypnout hygienický režim' : 'Zapnout hygienický režim'}
            aria-pressed={room.isEnhancedHygiene}
            className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100 ${
              room.isEnhancedHygiene
                ? 'bg-orange-500/20 border-orange-500/40 opacity-100 shadow-[0_0_20px_rgba(255,107,53,0.5)]'
                : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ShieldAlert className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/70'}`} strokeWidth={2} />
            <span className={`text-[5px] sm:text-[6px] md:text-[7px] lg:text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/70'}`}>
              Hygienický<br />režim
            </span>
          </motion.button>

          {/* Pause Button */}
          {!(room.isLocked && isFinalStep) && (
            <motion.button
              onClick={async () => {
                const newPaused = !isPaused;
                const pausedAt = newPaused ? new Date() : null;
                const pausedAtIso = pausedAt?.toISOString() || null;
                setIsPaused(newPaused);
                setPauseStartedAt(pausedAt);
                onPauseChange?.(newPaused, pausedAtIso);
                await recordStatusEvent({
                  operating_room_id: room.id,
                  event_type: newPaused ? 'pause' : 'resume',
                  step_index: currentStepIndex,
                  step_name: currentStep.title,
                });
              }}
              aria-label={isPaused ? 'Pokračovat ve fázi' : 'Pozastavit fázi'}
              aria-pressed={isPaused}
              className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:opacity-100 ${
                isPaused
                  ? 'bg-cyan-500/20 border-cyan-500/40 opacity-100 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                  : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? (
                <Play className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 text-cyan-300`} strokeWidth={2} />
              ) : (
                <Pause className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-8 lg:h-8 text-white/70`} strokeWidth={2} />
              )}
                <span className={`text-[6px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${isPaused ? 'text-cyan-300' : 'text-white/70'}`}>{isPaused ? 'Pokračovat' : 'Pauza'}</span>
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
                {showCleaningWarning ? (
                  <motion.div
                    key="cleaning-warning"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center gap-[clamp(0.75rem,2vw,1.5rem)] px-4"
                  >
                    <p className="text-[clamp(8px,0.8vw,10px)] font-semibold tracking-[0.3em] uppercase text-white/30">
                      Upozornění
                    </p>
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ color: '#FBBF24' }}
                    >
                      <AlertTriangle style={{ width: 'clamp(2.5rem,4vw,5rem)', height: 'clamp(2.5rem,4vw,5rem)' }} strokeWidth={1.5} />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[clamp(1.5rem,4vw,3rem)] font-bold tracking-tight leading-tight text-center text-white"
                    >
                      Úklid sálu<br />přesahuje<br />30 minut
                    </motion.h2>
                    <p className="text-[clamp(0.8rem,1.6vw,1.125rem)] text-white/60 leading-snug max-w-[85%] text-center">
                      Tento krok bude automaticky ukončen.
                    </p>
                  </motion.div>
                ) : room.isLocked && isFinalStep ? (
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
                    <p className="text-[clamp(8px,0.8vw,10px)] font-semibold tracking-[0.3em] uppercase text-white/30">
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
                    <p
                      className={`text-[clamp(8px,0.8vw,10px)] font-black tracking-[0.2em] mb-[clamp(0.75rem,2vw,1.5rem)] uppercase ${
                        room.isEmergency ? 'text-red-400' : 'text-white/25'
                      }`}
                    >
                      PROBÍHAJÍCÍ FÁZE
                    </p>
                    
                    <motion.h2
                      key={currentStep.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-[clamp(1.5rem,5vw,3.75rem)] font-bold tracking-tight leading-tight mb-[clamp(0.75rem,2vw,1.5rem)] break-words ${
                        room.isEmergency ? 'text-red-400' : 'text-white'
                      }`}
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
              backgroundColor: index === Math.min(currentStepIndex, activeDbStatuses.length - 1) ? activeColor : 'rgba(255,255,255,0.22)',
              opacity: index === Math.min(currentStepIndex, activeDbStatuses.length - 1) ? 1 : 0.55
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
        elapsedSeconds={pendingStepElapsedSeconds}
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
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                roomId: room.id,
                roomName: room.name,
                customReason,
                hospitalId: activeHospitalId,
              }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result?.error || `Odeslání selhalo (${response.status})`);
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

// Custom memo comparator — RoomDetail je masivní (1745 řádků s timery, motion, kontext).
// Plně se re-renderoval při KAŽDÉM update jakéhokoli sálu (rooms[] dostane novou referenci
// při realtime updatech), i když se právě otevřený sál vůbec nezměnil. Tohle je jeden
// z hlavních zdrojů „pomalé" aplikace.
//
// Strategie:
//  • re-render POUZE když:
//    - se změnila reference samotného `room` (data otevřeného sálu),
//    - nebo některý z callbacků (selectedRoomId v parentu se změnil → nový sál otevřen),
//    - nebo se změnil POČET sálů (přidán/odebrán → relevantní pro StaffPickerModal).
//  • ignorujeme novou referenci `allRooms` při stejné délce — content jiných sálů se
//    propagují do StaffPickerModalu jen když je otevřený, a tam je to bezpečné.
export default memo(RoomDetail, (prev, next) => {
  if (prev.room !== next.room) return false;
  if (prev.onClose !== next.onClose) return false;
  if (prev.onStepChange !== next.onStepChange) return false;
  if (prev.onEndTimeChange !== next.onEndTimeChange) return false;
  if (prev.onEnhancedHygieneToggle !== next.onEnhancedHygieneToggle) return false;
  if (prev.onStaffChange !== next.onStaffChange) return false;
  if (prev.onPatientStatusChange !== next.onPatientStatusChange) return false;
  // allRooms — jen porovnej délku; obsah jiných sálů ovlivňuje pouze StaffPickerModal,
  // který se otevírá vzácně a snese drobnou latenci sync.
  if ((prev.allRooms?.length || 0) !== (next.allRooms?.length || 0)) return false;
  return true;
});
