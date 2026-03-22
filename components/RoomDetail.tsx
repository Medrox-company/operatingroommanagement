
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { 
  Plus, Minus, X, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, Play, AlertTriangle, Lock,
  Phone, UserCheck, Stethoscope, Heart, ShieldAlert
} from 'lucide-react';
import { recordStatusEvent } from '../lib/db';

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
  const [isPaused, setIsPaused] = useState(false);
  const [pauseElapsedTime, setPauseElapsedTime] = useState('00:00');
  const [showEndTime, setShowEndTime] = useState(false);
  const endTimeTimeoutRef = useRef<number | null>(null);
  const [patientCalledTime, setPatientCalledTime] = useState<Date | null>(null);
  const [patientArrivedTime, setPatientArrivedTime] = useState<Date | null>(null);
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
  
    // Snap current time to 15-min floor, then subtract 15 minutes
    const snapped = snapTo15Min(estimatedEndTime);
    const potentialNewTime = new Date(snapped.getTime() - 15 * 60 * 1000);
    if (potentialNewTime < new Date()) return;
  
    onEndTimeChange(potentialNewTime);
  
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
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
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

      {/* ENHANCED HYGIENE MODE - Fullscreen Quarantine Overlay */}
      <AnimatePresence>
        {room.isEnhancedHygiene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 pointer-events-none z-[100]"
          >
            {/* Animated corner brackets */}
            <svg className="absolute inset-0 w-full h-full">
              {/* Top-left corner */}
              <motion.path 
                d="M 40,80 L 40,40 L 80,40" 
                fill="none" stroke="#EF4444" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' }}
              />
              {/* Top-right corner */}
              <motion.path 
                d="M calc(100% - 80px),40 L calc(100% - 40px),40 L calc(100% - 40px),80" 
                fill="none" stroke="#EF4444" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' }}
              />
              {/* Bottom-left corner */}
              <motion.path 
                d="M 40,calc(100% - 80px) L 40,calc(100% - 40px) L 80,calc(100% - 40px)" 
                fill="none" stroke="#EF4444" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' }}
              />
              {/* Bottom-right corner */}
              <motion.path 
                d="M calc(100% - 80px),calc(100% - 40px) L calc(100% - 40px),calc(100% - 40px) L calc(100% - 40px),calc(100% - 80px)" 
                fill="none" stroke="#EF4444" strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' }}
              />
            </svg>

            {/* Horizontal scan line */}
            <motion.div
              className="absolute left-0 right-0 h-[2px]"
              style={{ 
                background: 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.8) 20%, rgba(239,68,68,1) 50%, rgba(239,68,68,0.8) 80%, transparent 100%)',
                boxShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)'
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Subtle grid overlay */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(239,68,68,1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />

            {/* Red vignette glow at edges */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(239,68,68,0.15) 100%)',
                boxShadow: 'inset 0 0 150px rgba(239,68,68,0.2)'
              }}
            />

            {/* Top center status badge */}
            <motion.div
              className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div 
                className="flex items-center gap-4 px-8 py-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(185,28,28,0.1) 100%)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                {/* Animated warning icon */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ShieldAlert className="w-7 h-7 text-red-400" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }} />
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-red-400/60 tracking-[0.3em] uppercase">AKTIVNÍ PROTOKOL</span>
                  <span className="text-lg font-black text-red-300 tracking-[0.15em] uppercase">ZVÝŠENÁ HYGIENA</span>
                </div>
                {/* Blinking indicator */}
                <motion.div
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.9, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ boxShadow: '0 0 10px rgba(239,68,68,0.8)' }}
                />
              </div>
            </motion.div>

            {/* Bottom status bar */}
            <motion.div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Biohazard icon */}
              <motion.svg
                viewBox="0 0 64 64" className="w-12 h-12"
                fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="32" cy="32" r="6" />
                <path d="M32 26 Q24 12 14 18 Q4 24 10 36" strokeLinecap="round" />
                <path d="M32 26 Q40 12 50 18 Q60 24 54 36" strokeLinecap="round" />
                <path d="M26 36 Q26 52 32 52 Q38 52 38 36" strokeLinecap="round" />
              </motion.svg>
              
              <div className="h-8 w-px bg-red-500/30" />
              
              <span className="text-xs font-mono text-red-400/50 tracking-wider">
                DEZINFEKČNÍ PROTOKOL AKTIVOVÁN
              </span>
              
              <div className="h-8 w-px bg-red-500/30" />
              
              {/* Animated bars */}
              <div className="flex items-end gap-1 h-6">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-red-500/70 rounded-sm"
                    animate={{ height: ['30%', '100%', '30%'] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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


      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end gap-3 z-50">
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
          className={`rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-1 h-24 w-24 disabled:cursor-not-allowed border ${
            patientCalledTime && !patientArrivedTime
              ? 'bg-green-500/20 border-green-500/40 opacity-100 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
              : patientArrivedTime
              ? 'bg-white/5 border-white/10 opacity-60'
              : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'
          }`}
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

        {/* Patient Arrival Button */}
        <motion.button
          onClick={async () => {
            if (patientCalledTime && !patientArrivedTime) {
              const arrivalTime = new Date();
              const waitDuration = Math.floor((arrivalTime.getTime() - patientCalledTime.getTime()) / 1000);
              setPatientArrivedTime(arrivalTime);
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
                // Reset call state so Volat can be used again
                setPatientCalledTime(null);
                setPatientArrivedTime(null);
                setPatientCallElapsedTime('00:00');
              }, 3000);
            }
          }}
          disabled={!patientCalledTime || !!patientArrivedTime}
          className={`rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex flex-col items-center justify-center gap-2 h-24 w-24 disabled:opacity-60 disabled:cursor-not-allowed ${
            patientArrivedTime
              ? 'bg-blue-500/20 border-blue-500/40 opacity-100 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              : ''
          }`}
        >
          <UserCheck className={`w-8 h-8 ${patientArrivedTime ? 'text-blue-300' : 'text-white/60'}`} strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Příjezd</span>
        </motion.button>
      </div>

      {/* Pause Button - Bottom Right */}
      {!(room.isLocked && isFinalStep) && (
        <motion.button
          onClick={async () => {
            const newPaused = !isPaused;
            setIsPaused(newPaused);
            await recordStatusEvent({
              operating_room_id: room.id,
              event_type: newPaused ? 'pause' : 'resume',
              step_index: currentStepIndex,
              step_name: WORKFLOW_STEPS[currentStepIndex].title,
            });
          }}
          className={`absolute bottom-8 right-8 rounded-2xl transition-all backdrop-blur-md opacity-40 hover:opacity-100 flex flex-col items-center justify-center gap-2 border h-24 w-24 z-50 ${
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

      {/* Enhanced Hygiene Mode Toggle - Bottom Right, next to Pause */}
      <motion.button
        onClick={async () => {
          const newHygieneState = !room.isEnhancedHygiene;
          onEnhancedHygieneToggle?.(newHygieneState);
          await recordStatusEvent({
            operating_room_id: room.id,
            event_type: newHygieneState ? 'enhanced_hygiene_on' : 'enhanced_hygiene_off',
            step_index: currentStepIndex,
            step_name: WORKFLOW_STEPS[currentStepIndex].title,
          });
        }}
        className={`absolute bottom-8 right-40 rounded-2xl transition-all backdrop-blur-md flex flex-col items-center justify-center gap-2 border h-24 w-24 z-50 ${
          room.isEnhancedHygiene
            ? 'bg-orange-500/20 border-orange-500/40 opacity-100 shadow-[0_0_20px_rgba(255,107,53,0.5)]'
            : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ShieldAlert className={`w-8 h-8 ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`} strokeWidth={2} />
        <span className={`text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${room.isEnhancedHygiene ? 'text-orange-300' : 'text-white/60'}`}>
          {room.isEnhancedHygiene ? 'Hygienický\nrežim' : 'Hygien.\nrežim'}
        </span>
      </motion.button>

      {/* Enhanced Hygiene Mode - Top Alert Banner */}
      <AnimatePresence>
        {room.isEnhancedHygiene && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            className="absolute top-0 left-0 right-0 z-[60] overflow-hidden"
          >
            {/* Main banner container */}
            <div 
              className="relative py-4 backdrop-blur-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(255,107,53,0.15) 0%, rgba(255,107,53,0.05) 100%)',
                borderBottom: '1px solid rgba(255,107,53,0.3)'
              }}
            >
              {/* Animated scan line */}
              <motion.div
                className="absolute inset-0 h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.15) 50%, transparent 100%)',
                  width: '30%'
                }}
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-center gap-6">
                {/* Left icon cluster */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#FF6B35" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10"/>
                      <path d="M2 12h20"/>
                      <path d="M12 2c2.5 0 5 4.5 5 10s-2.5 10-5 10"/>
                    </svg>
                  </motion.div>
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-orange-500/50 to-transparent"/>
                </div>

                {/* Main text with typewriter effect */}
                <div className="flex items-center gap-4">
                  <motion.span
                    className="text-xs font-black tracking-[0.4em] text-orange-400 uppercase"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    AKTIVNÍ
                  </motion.span>
                  <span className="text-sm font-black tracking-[0.25em] text-white/90 uppercase">
                    ZVÝŠENÝ HYGIENICKÝ REŽIM
                  </span>
                  <motion.span
                    className="text-xs font-black tracking-[0.4em] text-orange-400 uppercase"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    AKTIVNÍ
                  </motion.span>
                </div>

                {/* Right icon cluster */}
                <div className="flex items-center gap-3">
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-orange-500/50 to-transparent"/>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ShieldAlert className="w-6 h-6 text-orange-400"/>
                  </motion.div>
                </div>
              </div>

              {/* Bottom progress indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ width: '50%' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Immersive Dial */}
      <main className="w-full h-full flex items-center justify-center relative z-20">
        <div className="relative w-[650px] h-[650px] flex items-center justify-center">
          
          {/* Static Rings */}
          <div className="absolute inset-0 border border-white/5 rounded-full" />
          <div className="absolute inset-10 border border-dashed border-white/5 rounded-full" />

          {/* Workflow Icons Outer Ring */}
          <motion.div 
            className="absolute inset-0 z-30 pointer-events-none"
            animate={{ rotate: rotation }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {WORKFLOW_STEPS.map((step, index) => {
              const angle = (index / WORKFLOW_STEPS.length) * 360;
              const isActive = index === currentStepIndex;
              
              // In locked state, only allow clicking forward icons
              const isSelectable = !isPaused && (!room.isLocked || (index > currentStepIndex && index !== 0));
              
              return (
                <div key={index} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                  <motion.div 
                    className="absolute top-[-30px] left-1/2 -ml-6 w-12 h-12 flex items-center justify-center"
                    animate={{ rotate: -angle - rotation }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  >
                    <button 
                      onClick={() => isSelectable && changeStep(index)}
                      disabled={!isSelectable}
                      className={`w-full h-full rounded-2xl border flex items-center justify-center transition-all duration-500 backdrop-blur-md pointer-events-auto
                        ${isActive ? 'bg-white/10 shadow-lg scale-125' : (isSelectable ? 'bg-white/5 opacity-40 hover:opacity-100' : 'bg-white/5 opacity-5 cursor-not-allowed')}
                      `}
                      style={{ 
                        borderColor: isActive ? activeColor : 'rgba(255,255,255,0.1)',
                        boxShadow: isActive ? `0 0 20px ${activeColor}44` : 'none'
                      }}
                    >
                      <step.Icon className="w-5 h-5" style={{ color: isActive ? activeColor : 'white' }} />
                    </button>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          {/* Navigation Controls */}
          {!isInteractionBlocked && (
            <>
              <div className="absolute left-[-180px] top-1/2 -translate-y-1/2 z-50">
                <motion.button 
                  onClick={handleDecreaseTime}
                  className="w-32 h-32 rounded-full border flex items-center justify-center opacity-70 hover:opacity-100 transition-all cursor-pointer backdrop-blur-md shadow-2xl overflow-hidden"
                  style={{
                    borderColor: `${activeColor}44`,
                    boxShadow: `0 0 20px ${activeColor}33`
                  }}
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-white/5" />
                  <Minus className="w-12 h-12 text-white relative z-10" strokeWidth={1.5} />
                </motion.button>
              </div>

              <div className="absolute right-[-180px] top-1/2 -translate-y-1/2 z-50">
                <motion.button 
                  onClick={handleIncreaseTime}
                  className="w-32 h-32 rounded-full border flex items-center justify-center opacity-70 hover:opacity-100 transition-all cursor-pointer backdrop-blur-md shadow-2xl overflow-hidden"
                  style={{
                    borderColor: `${activeColor}44`,
                    boxShadow: `0 0 20px ${activeColor}33`
                  }}
                  whileHover={{ scale: 1.1, x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-white/5" />
                  <Plus className="w-12 h-12 text-white relative z-10" strokeWidth={1.5} />
                </motion.button>
              </div>
            </>
          )}

          {/* Core Visual Elements - INTERACTIVE BUTTON CENTER */}
          <motion.button 
            onClick={handleNextStep}
            disabled={isInteractionBlocked}
            className={`relative w-[480px] h-[480px] flex items-center justify-center rounded-full group transition-all focus:outline-none 
              ${isInteractionBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
            whileHover={isInteractionBlocked ? {} : { scale: 1.05 }}
            whileTap={isInteractionBlocked ? {} : { scale: 0.96 }}
          >
            {/* Primary Background Glow - static */}
            <div 
              className="absolute inset-0 rounded-full blur-[100px] transition-colors duration-700"
              style={{ 
                backgroundColor: activeColor,
                opacity: (room.isEmergency || room.isLocked) ? 0.45 : 0.25,
              }}
            />

            {/* Inner Glow Core */}
            <div 
              className="absolute inset-10 rounded-full blur-[80px] opacity-20 transition-colors duration-500"
              style={{ backgroundColor: activeColor }}
            />

            <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.1]">
               <circle cx="240" cy="240" r="210" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
               <motion.circle 
                  key={currentStepIndex}
                  cx="240" cy="240" r="210" fill="none"
                  stroke={activeColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray="1320"
                  initial={{ strokeDashoffset: 1320 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: `drop-shadow(0 0 15px ${activeColor}88)` }}
                  className="opacity-80"
               />
            </svg>

            {/* ENHANCED HYGIENE MODE - Futuristic Decontamination Scanner */}
            <AnimatePresence>
              {room.isEnhancedHygiene && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {/* Hexagonal Grid Overlay - subtle tech pattern */}
                  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 480 480">
                    <defs>
                      <pattern id="hexGrid" width="30" height="52" patternUnits="userSpaceOnUse">
                        <path d="M15 0 L30 8.66 L30 25.98 L15 34.64 L0 25.98 L0 8.66 Z" fill="none" stroke="#FF6B35" strokeWidth="0.5"/>
                        <path d="M15 17.32 L30 25.98 L30 43.3 L15 51.96 L0 43.3 L0 25.98 Z" fill="none" stroke="#FF6B35" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hexGrid)"/>
                  </svg>

                  {/* Outer rotating scanner ring - clockwise */}
                  <motion.svg 
                    className="absolute inset-0 w-full h-full scale-[1.25]" 
                    viewBox="0 0 480 480"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  >
                    <defs>
                      <linearGradient id="scanGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FF6B35" stopOpacity="0"/>
                        <stop offset="50%" stopColor="#FF6B35" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#F7C59F" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Segmented arc pieces */}
                    {[0, 72, 144, 216, 288].map((angle, i) => (
                      <motion.path
                        key={i}
                        d={`M 240 30 A 210 210 0 0 1 ${240 + 210 * Math.sin((60 * Math.PI) / 180)} ${240 - 210 * Math.cos((60 * Math.PI) / 180)}`}
                        fill="none"
                        stroke="url(#scanGrad1)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 240 240)`}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.6))' }}
                      />
                    ))}
                  </motion.svg>

                  {/* Inner counter-rotating ring - dashed */}
                  <motion.svg 
                    className="absolute inset-0 w-full h-full scale-[1.18]" 
                    viewBox="0 0 480 480"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                  >
                    <circle 
                      cx="240" cy="240" r="210" 
                      fill="none" 
                      stroke="rgba(255,107,53,0.2)" 
                      strokeWidth="1"
                      strokeDasharray="8 16"
                    />
                  </motion.svg>

                  {/* Scanning beam effect - vertical sweep */}
                  <motion.div
                    className="absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 origin-center"
                    style={{
                      background: 'linear-gradient(180deg, transparent 0%, rgba(255,107,53,0.1) 20%, rgba(255,107,53,0.4) 50%, rgba(255,107,53,0.1) 80%, transparent 100%)'
                    }}
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Corner accent brackets */}
                  {[0, 90, 180, 270].map((angle) => (
                    <motion.div
                      key={angle}
                      className="absolute w-16 h-16"
                      style={{
                        top: angle === 0 || angle === 270 ? '5%' : 'auto',
                        bottom: angle === 90 || angle === 180 ? '5%' : 'auto',
                        left: angle === 0 || angle === 90 ? '5%' : 'auto',
                        right: angle === 180 || angle === 270 ? '5%' : 'auto',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: angle / 180 }}
                    >
                      <svg viewBox="0 0 64 64" className="w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                        <path d="M 2 20 L 2 2 L 20 2" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </motion.div>
                  ))}

                  {/* Pulsing data points around the circle */}
                  {[30, 75, 120, 165, 210, 255, 300, 345].map((angle, i) => (
                    <motion.div
                      key={angle}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: `calc(50% + ${Math.cos((angle - 90) * Math.PI / 180) * 260}px)`,
                        top: `calc(50% + ${Math.sin((angle - 90) * Math.PI / 180) * 260}px)`,
                        background: '#FF6B35',
                        boxShadow: '0 0 10px rgba(255,107,53,0.8)'
                      }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>



            <div className="text-center relative z-20 pointer-events-none">
              <AnimatePresence mode="wait">
                {room.isLocked && isFinalStep ? (
                  <motion.div
                    key="locked-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center"
                  >
                    <Lock className="w-24 h-24 text-white mb-6" />
                    <h2 className="text-6xl font-black tracking-tighter text-white uppercase">
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
                    <h2 className="text-8xl font-black tracking-tighter text-white font-mono">
                      {estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </h2>
                  </motion.div>
                ) : showPatientCalledText ? (
                  <motion.div
                    key="patient-called-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <Phone className="w-16 h-16" strokeWidth={1.5} />
                    <h2 className="text-5xl font-bold tracking-tight leading-tight text-center max-w-xs drop-shadow-2xl">
                      Volání pacienta
                    </h2>
                  </motion.div>
                ) : showPatientArrivedText ? (
                  <motion.div
                    key="patient-arrived-text"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="h-36 flex items-center justify-center"
                  >
                    <h2 className="text-6xl font-bold tracking-tight leading-tight text-center max-w-xs drop-shadow-2xl">
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
                    <h2 className="text-8xl font-black tracking-tighter text-white uppercase">
                      PAUZA
                    </h2>
                  </motion.div>
                ) : (
                  <motion.div
                    key="run-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className={`text-[12px] font-black tracking-[0.4em] mb-6 uppercase group-hover:text-white/40 transition-colors ${room.isEmergency ? 'text-red-400' : 'text-white/20'}`}>
                      {room.isLocked ? 'DOKONČIT DO FÁZE PŘIPRAVEN' : (currentStepIndex === WORKFLOW_STEPS.length - 1 ? 'SPUSTIT FÁZI' : 'SPUSTIT DALŠÍ FÁZI')}
                    </p>
                    
                    <motion.div
                      key={nextStep.title}
                      initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="h-36 flex items-center justify-center mb-4"
                    >
                      <h2 className={`text-6xl font-bold tracking-tight leading-tight text-center max-w-xs drop-shadow-2xl ${room.isEmergency ? 'text-red-400' : ''}`}>
                        {nextStep.title}
                      </h2>
                    </motion.div>
    
                    <div className="flex items-center justify-center gap-3">
                      <p className={`text-sm font-bold tracking-widest uppercase ${room.isEmergency ? 'text-red-300' : 'text-white/40'}`}>
                        {currentStep.title}
                      </p>
                      <div className="group-hover:block hidden">
                        <ChevronRight className="w-5 h-5" style={{ color: activeColor }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        </div>
      </main>

      {/* Left Info Panel */}
      <div className="absolute left-32 bottom-16 space-y-10 z-50">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`badge-${currentStepIndex}-${isPaused}-${room.isEmergency}-${room.isLocked}`}
              className="px-6 py-2.5 rounded-full border inline-block text-[12px] font-black uppercase tracking-[0.2em] backdrop-blur-md"
              style={{ 
                borderColor: `${activeColor}66`, 
                backgroundColor: `${activeColor}15`, 
                color: activeColor 
              }}
            >
              {room.isEmergency ? 'EMERGENCY AKTIVNÍ' : (room.isLocked ? (isFinalStep ? 'SÁL UZAM��EN' : 'DOKONČOVÁNÍ PŘED UZAMČENÍM') : (isPaused ? 'POZASTAVENO' : currentStep.status))}
            </motion.div>
          </AnimatePresence>
          
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: '#c0bdb7' }}>
              {isPaused ? 'DOBA TRVÁNÍ PAUZY' : 'DOBA TRVÁNÍ FÁZE'}
            </p>
            <div className="flex items-center gap-5">
                <span className={`text-5xl font-bold tracking-tighter font-mono tabular-nums ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : '')}`}>
                  {isPaused ? pauseElapsedTime : elapsedTime}
                </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.h3
              key={`title-${currentStepIndex}-${isPaused}-${room.isLocked}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-6xl font-bold tracking-tight ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white/95')}`}
            >
              {room.isEmergency ? 'Urgentní příjem' : (room.isLocked && isFinalStep ? 'Sál uzamčen' : (isPaused ? 'Probíhá pauza' : currentStep.title))}
            </motion.h3>
          </AnimatePresence>
        </div>



        {/* Patient Status Indicators */}
        {/* Patient status info removed */}
      </div>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
        {WORKFLOW_STEPS.map((_, i) => (
          <div 
            key={i} 
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: i === currentStepIndex ? 36 : 10,
              backgroundColor: i === currentStepIndex ? activeColor : 'rgba(255,255,255,0.1)',
              opacity: i === currentStepIndex ? 1 : 0.3
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default RoomDetail;
