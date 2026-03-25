
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert, Activity
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
  
  const [rotation, setRotation] = useState(-currentStepIndex * (360 / WORKFLOW_STEPS.length));

  useEffect(() => {
    if (prevStepIndex === undefined) return;

    const anglePerStep = 360 / WORKFLOW_STEPS.length;
    const stepDiff = currentStepIndex - prevStepIndex;

    if (stepDiff === 1 || stepDiff < -1) {
      setRotation(r => r - anglePerStep);
    } else {
      setRotation(r => r + anglePerStep);
    }
  }, [currentStepIndex]);

  const currentStep = WORKFLOW_STEPS[currentStepIndex];
  const nextStep = WORKFLOW_STEPS[(currentStepIndex + 1) % WORKFLOW_STEPS.length];
  
  // Logic to determine if actions are allowed even if locked
  const isFinalStep = currentStepIndex === WORKFLOW_STEPS.length - 1;
  const isInteractionBlocked = isPaused || (room.isLocked && isFinalStep);

  // Dynamic theme color based on status
  const activeColor = room.isEmergency 
    ? '#FF3B30' 
    : (room.isLocked 
        ? '#FBBF24' 
        : (isPaused ? '#06b6d4' : currentStep.color));

  const changeStep = async (newIndex: number) => {
    if (isInteractionBlocked) return;
    
    // SEQUENTIAL STEP RESTRICTION: Only allow next step (+1) or reset to 0 (from final step)
    const isNextStep = newIndex === currentStepIndex + 1;
    const isResetToStart = newIndex === 0 && currentStepIndex === WORKFLOW_STEPS.length - 1;
    
    if (!isNextStep && !isResetToStart) {
      return; // Block skipping steps
    }
    
    // Additional security for locked state: only allow forward progression
    if (room.isLocked) {
      if (newIndex <= currentStepIndex && !isFinalStep) return;
      if (newIndex === 0) return; // Never allow starting over if locked
    }

    // Calculate duration of previous step
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - phaseStartTime.getTime()) / 1000);
    const previousStep = WORKFLOW_STEPS[currentStepIndex];
    const newStep = WORKFLOW_STEPS[newIndex];

    // Record step change to database
    await recordStatusEvent({
      operating_room_id: room.id,
      event_type: 'step_change',
      step_index: newIndex,
      step_name: newStep.title,
      duration_seconds: durationSeconds,
      metadata: { 
        previous_step: previousStep.title,
        previous_step_index: currentStepIndex,
      },
    });

    // Record operation start/end events
    if (newIndex === 1 && currentStepIndex === 0) {
      // Starting operation (moving from "Volný sál" to first active step)
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_start',
        step_index: newIndex,
        step_name: newStep.title,
      });
    } else if (newIndex === 0 && currentStepIndex === WORKFLOW_STEPS.length - 1) {
      // Ending operation (completing last step)
      await recordStatusEvent({
        operating_room_id: room.id,
        event_type: 'operation_end',
        duration_seconds: durationSeconds,
        metadata: { completed_step: previousStep.title },
      });
    }

    onStepChange(newIndex);
    setPhaseStartTime(new Date());
  };

  const handleNextStep = () => {
    if (isInteractionBlocked) return;
    let nextIndex = currentStepIndex + 1;
    if (nextIndex >= WORKFLOW_STEPS.length) {
      nextIndex = 0;
    }
    
    // Prevent loop back if locked
    if (room.isLocked && nextIndex === 0) return;

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
        {/* mobile bg */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-zinc-950" />
          <div className="absolute inset-0" style={{ backgroundColor: activeColor, opacity: 0.04 }} />
          {room.isEnhancedHygiene && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(239,68,68,0.08) 80%, rgba(239,68,68,0.18) 100%)', boxShadow: 'inset 0 0 80px rgba(239,68,68,0.12)' }} />
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-3 p-4 pb-8">
          {/* Mobile Header */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30">UNIT {room.department}</p>
              <h1 className={`text-2xl font-black tracking-tight uppercase leading-none ${room.isEmergency ? 'text-red-400' : room.isLocked ? 'text-amber-400' : 'text-white'}`}>
                {room.name}
              </h1>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status badge */}
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between border" style={{ backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30` }}>
            <div>
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 mb-0.5">Aktivní fáze</p>
              <p className="text-base font-black uppercase tracking-wide" style={{ color: activeColor }}>
                {room.isEmergency ? 'STAV NOUZE' : room.isLocked ? 'SÁL UZAMČEN' : WORKFLOW_STEPS[currentStepIndex].title}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 mb-0.5">Čas ve fázi</p>
              <p className="text-xl font-mono font-black text-white">{elapsedTime}</p>
            </div>
          </div>

          {/* Next phase button - prominent on mobile */}
          {!isInteractionBlocked && (
            <button
              onClick={() => {
                const isFinalStep = currentStepIndex === WORKFLOW_STEPS.length - 1;
                const nextIndex = isFinalStep ? 0 : currentStepIndex + 1;
                onStepChange(nextIndex);
              }}
              className="w-full rounded-2xl py-6 font-black text-base tracking-[0.2em] uppercase border transition-all"
              style={{ backgroundColor: `${activeColor}20`, borderColor: `${activeColor}40`, color: activeColor }}
            >
              {currentStepIndex === WORKFLOW_STEPS.length - 1 ? 'Nový cyklus' : 'Spustit další fázi'} →
            </button>
          )}

          {/* Time + Staff row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Estimated end time */}
            <div className="rounded-2xl p-3 border border-white/5 bg-white/[0.03]">
              <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-2">Ukončení</p>
              <div className="flex items-center gap-2">
                <button onClick={handleDecreaseTime} disabled={isInteractionBlocked || !estimatedEndTime} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30">
                  <Minus className="w-3 h-3" />
                </button>
                <p className="flex-1 text-center text-lg font-mono font-black text-white">
                  {estimatedEndTime && currentStepIndex !== 6
                    ? estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </p>
                <button onClick={handleIncreaseTime} disabled={isInteractionBlocked} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-2xl p-3 border border-white/5 bg-white/[0.03]">
              <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-2">Personál</p>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-bold text-white/80 truncate">{room.staff.doctor.name}</p>
                <p className="text-[10px] text-white/40 truncate">{room.staff.nurse.name}</p>
                {room.staff.anesthesiologist?.name && (
                  <p className="text-[10px] text-white/40 truncate">{room.staff.anesthesiologist.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Pause */}
            <button
              onClick={async () => {
                const newPaused = !isPaused;
                setIsPaused(newPaused);
                await updateOperatingRoom(room.id, { is_paused: newPaused });
                await recordStatusEvent({ operating_room_id: room.id, event_type: newPaused ? 'pause' : 'resume', step_index: currentStepIndex, step_name: WORKFLOW_STEPS[currentStepIndex].title });
              }}
              className={`rounded-2xl py-4 flex flex-col items-center gap-1.5 border transition-all ${isPaused ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/5 border-white/10'}`}
            >
              {isPaused ? <Play className="w-5 h-5 text-cyan-300" /> : <Pause className="w-5 h-5 text-white/60" />}
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{isPaused ? 'Pokračovat' : 'Pauza'}</span>
            </button>

            {/* Hygiene */}
            <button
              onClick={async () => {
                const newH = !room.isEnhancedHygiene;
                onEnhancedHygieneToggle?.(newH);
                await updateOperatingRoom(room.id, { is_enhanced_hygiene: newH });
                await recordStatusEvent({ operating_room_id: room.id, event_type: newH ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off', step_index: currentStepIndex, step_name: WORKFLOW_STEPS[currentStepIndex].title });
              }}
              className={`rounded-2xl py-4 flex flex-col items-center gap-1.5 border transition-all ${room.isEnhancedHygiene ? 'bg-orange-500/20 border-orange-500/40' : 'bg-white/5 border-white/10'}`}
            >
              <ShieldAlert className={`w-5 h-5 ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">Hygiena</span>
            </button>

            {/* Patient call */}
            <button
              onClick={async () => {
                if (!patientCalledTime) {
                  const now = new Date();
                  setPatientCalledTime(now);
                  await updateOperatingRoom(room.id, { patient_called_at: now.toISOString() });
                  await recordStatusEvent({ operating_room_id: room.id, event_type: 'patient_call', step_index: currentStepIndex, step_name: WORKFLOW_STEPS[currentStepIndex].title });
                }
              }}
              disabled={!!patientCalledTime}
              className={`rounded-2xl py-4 flex flex-col items-center gap-1.5 border transition-all ${patientCalledTime ? 'bg-green-500/20 border-green-500/40' : 'bg-white/5 border-white/10'}`}
            >
              <Phone className={`w-5 h-5 ${patientCalledTime ? 'text-green-300' : 'text-white/60'}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                {patientCalledTime ? patientCallElapsedTime : 'Volat'}
              </span>
            </button>
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
        className="absolute top-8 right-8 p-4 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex items-center justify-center h-24 w-24 z-50"
      >
        <X className="w-8 h-8" />
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


      {/* Pause Button - Right Side, vertical stack */}
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
              step_name: WORKFLOW_STEPS[currentStepIndex].title,
            });
          }}
          className={`absolute right-8 top-1/2 -translate-y-1/2 translate-y-32 rounded-2xl transition-all backdrop-blur-md opacity-40 hover:opacity-100 flex flex-col items-center justify-center gap-2 border h-24 w-24 z-50 ${
            isPaused
              ? 'bg-cyan-500/20 border-cyan-500/40 opacity-100 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
              : 'bg-white/5 border-white/10'
          }`}
        >
          {isPaused ? (
            <Play className={`w-8 h-8 text-cyan-300`} strokeWidth={2} />
          ) : (
            <Pause className={`w-8 h-8 text-white/60`} strokeWidth={2} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">{isPaused ? 'Pokr.' : 'Pauza'}</span>
        </motion.button>
      )}

      {/* Enhanced Hygiene Mode Toggle - Right Side, above Pause */}
      <motion.button
        onClick={async () => {
          const newHygieneState = !room.isEnhancedHygiene;
          onEnhancedHygieneToggle?.(newHygieneState);
          await updateOperatingRoom(room.id, { is_enhanced_hygiene: newHygieneState });
          await recordStatusEvent({
            operating_room_id: room.id,
            event_type: newHygieneState ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
            step_index: currentStepIndex,
            step_name: WORKFLOW_STEPS[currentStepIndex].title,
          });
        }}
        className={`absolute right-8 top-1/2 -translate-y-1/2 translate-y-[116px] rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-24 w-24 z-50 ${
          room.isEnhancedHygiene
            ? 'bg-orange-500/20 border-orange-500/40 opacity-100 shadow-[0_0_20px_rgba(255,107,53,0.5)]'
            : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ShieldAlert className={`w-8 h-8 ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`} strokeWidth={2} />
        <span className={`text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`}>
          Hygien.
        </span>
      </motion.button>

      {/* Patient Arrival Button - Right Side */}
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
              step_name: WORKFLOW_STEPS[currentStepIndex].title,
              duration_seconds: waitDuration,
              metadata: { call_time: patientCalledTime.toISOString() },
            });
            setTimeout(() => {
              setShowPatientArrivedText(false);
              setPatientCalledTime(null);
              setPatientArrivedTime(null);
              updateOperatingRoom(room.id, { patient_called_at: null, patient_arrived_at: null });
              setPatientCallElapsedTime('00:00');
            }, 3000);
          }
        }}
        disabled={!patientCalledTime || !!patientArrivedTime}
        className={`absolute right-8 top-1/2 -translate-y-1/2 -translate-y-4 rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-24 w-24 z-50 disabled:cursor-not-allowed ${
          patientArrivedTime
            ? 'bg-blue-500/20 border-blue-500/40 opacity-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
            : !patientCalledTime
            ? 'bg-white/5 border-white/10 opacity-40'
            : 'bg-blue-500/10 border-blue-500/30 opacity-100 hover:opacity-100'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <UserCheck className={`w-8 h-8 ${patientArrivedTime ? 'text-blue-300' : patientCalledTime ? 'text-blue-300' : 'text-white/60'}`} strokeWidth={2} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Příjezd</span>
      </motion.button>

      {/* Volat Button - Right Side, at top */}
      <motion.button
        onClick={async () => {
          if (!patientCalledTime) {
            setPatientCalledTime(new Date());
            setShowPatientCalledText(true);
            setTimeout(() => setShowPatientCalledText(false), 3000);
            await recordStatusEvent({
              operating_room_id: room.id,
              event_type: 'patient_call',
              step_index: currentStepIndex,
              step_name: WORKFLOW_STEPS[currentStepIndex].title,
            });
          }
        }}
        disabled={!!patientCalledTime}
        className={`absolute right-8 top-1/2 -translate-y-1/2 -translate-y-[116px] rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-1 border h-24 w-24 z-50 disabled:cursor-not-allowed ${
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
              <Phone className="w-5 h-5 text-green-300" strokeWidth={2} />
              <span className="text-lg font-black tracking-tighter font-mono tabular-nums text-green-300 leading-none">
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
              <Phone className={`w-8 h-8 ${patientArrivedTime ? 'text-white/30' : 'text-white/60'}`} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Volat</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Main Three-Circle Status Display */}
      <main className="w-full h-full flex items-center justify-center relative z-20">
        {/* Background decorative ring */}
        <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5" />
        <div className="absolute w-[750px] h-[750px] rounded-full border border-dashed border-white/[0.03]" />
        
        <div className="flex items-center justify-center gap-20 relative">
          {/* Previous Step - Left Circle (smaller) */}
          {(() => {
            const prevStepIdx = currentStepIndex === 0 ? WORKFLOW_STEPS.length - 1 : currentStepIndex - 1;
            const prevStep = WORKFLOW_STEPS[prevStepIdx];
            return (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative w-[280px] h-[280px] flex items-center justify-center"
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
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/25 mb-4">
                    SPUSTIT DALŠÍ FÁZI
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-white leading-tight mb-3">
                    {prevStep.title}
                  </h3>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">
                    {prevStep.status}
                  </p>
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
            className={`relative w-[500px] h-[500px] flex items-center justify-center rounded-full group transition-all focus:outline-none z-10
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
            <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.0]">
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <Phone className="w-14 h-14" strokeWidth={1.5} />
                    <h2 className="text-4xl font-bold tracking-tight leading-tight text-center">
                      Volání pacienta
                    </h2>
                  </motion.div>
                ) : showPatientArrivedText ? (
                  <motion.div
                    key="patient-arrived-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center justify-center"
                  >
                    <h2 className="text-5xl font-bold tracking-tight leading-tight text-center">
                      Příjezd pacienta
                    </h2>
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
                      SPUSTIT DALŠÍ FÁZI
                    </p>
                    
                    <motion.h2
                      key={currentStep.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-6xl font-bold tracking-tight leading-tight mb-6 ${room.isEmergency ? 'text-red-400' : 'text-white'}`}
                    >
                      {currentStep.title}
                    </motion.h2>

                    <p className={`text-[11px] font-bold tracking-widest uppercase ${room.isEmergency ? 'text-red-300/60' : 'text-white/30'}`}>
                      {currentStep.status}
                    </p>
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
            className="relative w-[280px] h-[280px] flex items-center justify-center cursor-pointer"
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
              <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/25 mb-4">
                {currentStepIndex === WORKFLOW_STEPS.length - 1 ? 'NOVÝ CYKLUS' : 'NÁSLEDUJE'}
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-white leading-tight mb-3">
                {nextStep.title}
              </h3>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">
                {nextStep.status}
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Time adjustment buttons - positioned below circles */}
        {!isInteractionBlocked && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
            <motion.button 
              onClick={handleDecreaseTime}
              className="w-32 h-32 rounded-full border flex items-center justify-center opacity-60 hover:opacity-100 transition-all cursor-pointer backdrop-blur-md"
              style={{
                borderColor: `${activeColor}44`,
                backgroundColor: 'rgba(255,255,255,0.03)'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Minus className="w-12 h-12 text-white" strokeWidth={1.5} />
            </motion.button>

            <div className="px-6 py-3 rounded-full border backdrop-blur-md" style={{ borderColor: `${activeColor}44`, backgroundColor: `${activeColor}15` }}>
              <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/50 text-center mb-1">MONITORING</p>
            </div>

            <motion.button 
              onClick={handleIncreaseTime}
              className="w-32 h-32 rounded-full border flex items-center justify-center opacity-60 hover:opacity-100 transition-all cursor-pointer backdrop-blur-md"
              style={{
                borderColor: `${activeColor}44`,
                backgroundColor: 'rgba(255,255,255,0.03)'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-12 h-12 text-white" strokeWidth={1.5} />
            </motion.button>
          </div>
        )}
      </main>

      {/* Bottom Center - Phase Duration & Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
        {/* Phase duration timer */}
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
            {isPaused ? 'DOBA TRVÁNÍ PAUZY' : 'DOBA TRVÁNÍ FÁZE'}
          </p>
          <span className={`text-6xl font-black tracking-tighter font-mono tabular-nums ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white')}`}>
            {isPaused ? pauseElapsedTime : elapsedTime}
          </span>
        </div>

        {/* Navigation Indicators */}
        <div className="flex gap-3">
          {WORKFLOW_STEPS.map((_, i) => (
            <div 
              key={i} 
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === currentStepIndex ? 32 : 8,
                backgroundColor: i === currentStepIndex ? activeColor : 'rgba(255,255,255,0.15)',
                opacity: i === currentStepIndex ? 1 : 0.4
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
