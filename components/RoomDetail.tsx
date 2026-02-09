
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { 
  Plus, Minus, Menu, QrCode, User, Video, Cast, 
  MessageSquare, Layout, Thermometer, Edit3,
  ChevronRight, Pause, AlertTriangle, Lock
} from 'lucide-react';

interface RoomDetailProps {
  room: OperatingRoom;
  onClose: () => void;
  onStepChange: (index: number) => void;
  onEndTimeChange: (newTime: Date | null) => void;
}

const usePrevious = (value: number) => {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room, onClose, onStepChange, onEndTimeChange }) => {
  const [phaseStartTime, setPhaseStartTime] = useState(() => new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isPaused, setIsPaused] = useState(false);
  const [pauseElapsedTime, setPauseElapsedTime] = useState('00:00');
  const [showEndTime, setShowEndTime] = useState(false);
  const endTimeTimeoutRef = useRef<number | null>(null);

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

  const changeStep = (newIndex: number) => {
    if (isInteractionBlocked) return;
    
    // Additional security for locked state: only allow forward progression
    if (room.isLocked) {
      if (newIndex <= currentStepIndex && !isFinalStep) return;
      if (newIndex === 0) return; // Never allow starting over if locked
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
  
  const roundTimeUpToNext15Min = (date: Date): Date => {
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
  
  const handleIncreaseTime = () => {
    if (isInteractionBlocked) return;
  
    let newTime;
    if (estimatedEndTime === null) {
      newTime = roundTimeUpToNext15Min(new Date());
    } else {
      newTime = new Date(estimatedEndTime.getTime() + 15 * 60 * 1000);
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
  
    const potentialNewTime = new Date(estimatedEndTime.getTime() - 15 * 60 * 1000);
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
    <div className="relative w-full h-full bg-black text-white overflow-hidden font-sans">
      {/* Status Overlay Effects */}
      {room.isEmergency && (
        <motion.div 
          className="absolute inset-0 z-10 pointer-events-none border-[12px] border-red-500/20"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      {room.isLocked && !room.isEmergency && (
        <motion.div 
          className="absolute inset-0 z-10 pointer-events-none border-[12px] border-amber-500/15"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
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

      {/* Atmospheric Edge Glows */}
      <motion.div 
        className="absolute -left-10 top-0 bottom-0 w-44 blur-[140px] z-10 opacity-30"
        animate={{ backgroundColor: activeColor }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute -right-10 top-0 bottom-0 w-44 blur-[140px] z-10 opacity-30"
        animate={{ backgroundColor: activeColor }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
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
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="bg-red-500 text-white px-6 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                >
                  <AlertTriangle className="w-8 h-8" />
                  <span className="text-2xl font-black uppercase tracking-widest">EMERGENCY</span>
                </motion.div>
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

        <button 
          onClick={onClose}
          className="p-4 hover:bg-white/10 rounded-2xl transition-all active:scale-95 bg-white/5 border border-white/10 backdrop-blur-md opacity-40 hover:opacity-100 flex items-center gap-3"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest mr-2">Zavřít</span>
          <Menu className="w-8 h-8" />
        </button>
      </header>

      {/* Main Immersive Dial */}
      <main className="w-full h-full flex items-center justify-center relative z-20">
        <div className="relative w-[650px] h-[650px] flex items-center justify-center">
          
          {/* External Spinning Rings */}
          <motion.div 
            className="absolute inset-0 border border-white/5 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute inset-10 border border-dashed border-white/5 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          />

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
                  animate={{ 
                    boxShadow: [`0 0 15px ${activeColor}33`, `0 0 45px ${activeColor}66`, `0 0 15px ${activeColor}33`],
                    borderColor: [`${activeColor}33`, `${activeColor}66`, `${activeColor}33`]
                  }}
                  transition={{
                    boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    borderColor: { duration: 3, repeat: Infinity, ease: "easeInOut" }
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
                  animate={{ 
                    boxShadow: [`0 0 15px ${activeColor}33`, `0 0 45px ${activeColor}66`, `0 0 15px ${activeColor}33`],
                    borderColor: [`${activeColor}33`, `${activeColor}66`, `${activeColor}33`]
                  }}
                  transition={{
                    boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    borderColor: { duration: 3, repeat: Infinity, ease: "easeInOut" }
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
            {/* Primary Background Glow */}
            <motion.div 
              className="absolute inset-0 rounded-full blur-[100px]"
              animate={{ 
                backgroundColor: activeColor,
                opacity: (room.isEmergency || room.isLocked) ? 0.45 : 0.25,
                scale: 1.05
              }}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
            />

            {/* Inner Glow Core */}
            <motion.div 
              className="absolute inset-10 rounded-full blur-[80px] opacity-20"
              animate={{ backgroundColor: activeColor }}
              transition={{ duration: 0.5 }}
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
                    <p className="text-[12px] font-black tracking-[0.4em] text-white/40 mb-6 uppercase">
                      PŘEDPOKLÁDANÝ KONEC
                    </p>
                    <h2 className="text-8xl font-black tracking-tighter text-white font-mono">
                      {estimatedEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
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
                      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="group-hover:block hidden">
                        <ChevronRight className="w-5 h-5" style={{ color: activeColor }} />
                      </motion.div>
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
              {room.isEmergency ? 'EMERGENCY AKTIVNÍ' : (room.isLocked ? (isFinalStep ? 'SÁL UZAMČEN' : 'DOKONČOVÁNÍ PŘED UZAMČENÍM') : (isPaused ? 'POZASTAVENO' : currentStep.status))}
            </motion.div>
          </AnimatePresence>
          
          <div>
            <p className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-2">
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

        <div className="flex items-center gap-7">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-1">Odpovědná osoba</span>
            <span className="text-2xl font-bold text-white/70">{currentStep.organizer}</span>
          </div>
          <div className="flex items-center -space-x-4">
             <div className="w-14 h-14 rounded-full border-4 border-black bg-indigo-600 overflow-hidden shadow-2xl">
                <img src={`https://i.pravatar.cc/150?u=${currentStep.organizer}`} alt="Staff" className="w-full h-full object-cover" />
             </div>
          </div>
        </div>
      </div>

      {/* Control Panel Indicators */}
      <div className="absolute right-16 bottom-16 flex flex-col items-end gap-12 z-50">
        {!isInteractionBlocked && (
          <motion.button 
            onClick={() => setIsPaused(!isPaused)}
            className={`p-5 rounded-3xl border transition-all duration-300 ${isPaused ? 'bg-cyan-400/20 border-cyan-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
              <Pause className={`w-10 h-10 transition-colors duration-300 ${isPaused ? 'text-cyan-300' : 'text-white/50'}`} />
          </motion.button>
        )}
      </div>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
        {WORKFLOW_STEPS.map((_, i) => (
          <motion.div 
            key={i} 
            animate={{ 
              width: i === currentStepIndex ? 36 : 10,
              backgroundColor: i === currentStepIndex ? activeColor : 'rgba(255,255,255,0.1)',
              opacity: i === currentStepIndex ? 1 : 0.3
            }}
            className="h-2 rounded-full transition-all duration-500" 
          />
        ))}
      </div>
    </div>
  );
};

export default RoomDetail;