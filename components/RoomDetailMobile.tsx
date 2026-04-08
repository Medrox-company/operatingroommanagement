import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { ChevronLeft, X, Plus, Minus, Pause, Play } from 'lucide-react';
import { recordStatusEvent, updateOperatingRoom } from '../lib/db';

interface RoomDetailMobileProps {
  room: OperatingRoom;
  onClose: () => void;
  onStepChange: (index: number, stepColor?: string) => void;
  onEndTimeChange: (newTime: Date | null) => void;
}

const RoomDetailMobile: React.FC<RoomDetailMobileProps> = ({ 
  room, 
  onClose, 
  onStepChange, 
  onEndTimeChange 
}) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeDbStatuses = workflowStatuses;

  const [phaseStartTime, setPhaseStartTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isPaused, setIsPaused] = useState(room.isPaused || false);
  const [localEndTime, setLocalEndTime] = useState<Date | null>(
    room.estimatedEndTime ? new Date(room.estimatedEndTime) : null
  );
  const isLocalUpdateRef = useRef(false);
  const updateTimeoutRef = useRef<number | null>(null);

  // Lookup mapa pro správné mapování
  const statusByOrderIndex = useMemo(() => {
    const map: Record<number, typeof activeDbStatuses[number]> = {};
    activeDbStatuses.forEach((s) => {
      map[s.order_index] = s;
    });
    return map;
  }, [activeDbStatuses]);

  const currentStepIndex = room.currentStepIndex;
  const validStepCount = activeDbStatuses.length > 0 ? activeDbStatuses.length : 1;
  const currentStep = statusByOrderIndex[currentStepIndex];
  const isFinalStep = currentStepIndex === validStepCount - 1;

  // Dynamická barva podle stavu
  const activeColor = room.isEmergency 
    ? '#EF4444' 
    : (room.isLocked 
        ? '#FBBF24' 
        : (isPaused ? '#06B6D4' : (currentStep?.color || '#10B981')));

  // Sync elapsed time
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

  // Sync local end time s room propsem
  useEffect(() => {
    if (isLocalUpdateRef.current) return;
    const propsTime = room.estimatedEndTime ? new Date(room.estimatedEndTime) : null;
    setLocalEndTime(propsTime);
  }, [room.estimatedEndTime]);

  const handleNextStep = async () => {
    if (isPaused || (room.isLocked && isFinalStep)) return;

    let nextIndex = currentStepIndex + 1;
    if (nextIndex >= validStepCount) nextIndex = 0;
    
    if (room.isLocked && nextIndex === 0) return;

    const durationSeconds = Math.floor((new Date().getTime() - phaseStartTime.getTime()) / 1000);
    
    // Record step change
    await recordStatusEvent({
      operating_room_id: room.id,
      event_type: 'step_change',
      step_index: nextIndex,
      step_name: currentStep?.name || 'Status',
      duration_seconds: durationSeconds,
    });

    // Default end time logic
    if (nextIndex === 1 && currentStepIndex === 0) {
      const defaultEndTime = new Date(new Date().getTime() + 60 * 60 * 1000);
      onEndTimeChange(defaultEndTime);
    } else if (nextIndex === 0 && currentStepIndex === validStepCount - 1) {
      onEndTimeChange(null);
    }

    const newStep = statusByOrderIndex[nextIndex];
    const newStepColor = newStep?.color || '#10B981';
    onStepChange(nextIndex, newStepColor);
    setPhaseStartTime(new Date());
  };

  const handleIncreaseTime = () => {
    if (isPaused) return;
    
    isLocalUpdateRef.current = true;
    setLocalEndTime(prev => {
      let newTime;
      if (prev === null) {
        newTime = new Date();
        const remainder = newTime.getMinutes() % 15;
        if (remainder !== 0) newTime.setMinutes(newTime.getMinutes() + (15 - remainder));
      } else {
        newTime = new Date(prev.getTime() + 15 * 60 * 1000);
      }
      
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = window.setTimeout(() => {
        onEndTimeChange(newTime);
        setTimeout(() => { isLocalUpdateRef.current = false; }, 100);
      }, 300);
      
      return newTime;
    });
  };

  const handleDecreaseTime = () => {
    if (isPaused || !localEndTime) return;
    
    isLocalUpdateRef.current = true;
    setLocalEndTime(prev => {
      if (!prev) return null;
      const newTime = new Date(prev.getTime() - 15 * 60 * 1000);
      if (newTime <= phaseStartTime) return prev;
      
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = window.setTimeout(() => {
        onEndTimeChange(newTime);
        setTimeout(() => { isLocalUpdateRef.current = false; }, 100);
      }, 300);
      
      return newTime;
    });
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="md:hidden w-full h-full flex flex-col bg-gradient-to-b from-[#0d3d3a] to-[#0a1f1e] relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
            style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)` }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header - Minimal */}
          <div className="flex items-center justify-between px-4 pt-3 pb-4 border-b border-white/5">
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{room.name}</h1>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content - Vertical Stack */}
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">Aktuální stav</p>
              <motion.div
                key={currentStep?.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-white text-balance">
                  {room.isEmergency ? 'Stav nouze' : room.isLocked ? 'Uzamčen' : currentStep?.name || 'Status'}
                </p>
                <p className="text-sm font-mono text-white/40 mt-2">{elapsedTime}</p>
              </motion.div>
              
              {/* Mini Progress Bar */}
              <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: activeColor }}
                  animate={{ width: `${((currentStepIndex + 1) / validStepCount) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* End Time Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3 text-center">Ukončení</p>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleDecreaseTime}
                  disabled={isPaused || !localEndTime}
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center active:scale-95 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <p className="text-3xl font-mono font-bold flex-1 text-center">
                  {localEndTime ? localEndTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
                <button
                  onClick={handleIncreaseTime}
                  disabled={isPaused}
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center active:scale-95 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Staff Info Card */}
            {room.staff && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">Tým</p>
                <div className="space-y-2 text-sm">
                  <p><span className="text-white/50">Lékař:</span> <span className="font-medium">{room.staff.doctor.name}</span></p>
                  {room.staff.nurse && <p><span className="text-white/50">Sestra:</span> <span className="font-medium">{room.staff.nurse.name}</span></p>}
                  {room.staff.anesthesiologist && <p><span className="text-white/50">Anestezio:</span> <span className="font-medium">{room.staff.anesthesiologist.name}</span></p>}
                </div>
              </div>
            )}

            {/* Status Info Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">Flags</p>
              <div className="flex gap-2 flex-wrap">
                {room.isEmergency && <span className="text-xs px-3 py-1 bg-red-500/20 text-red-300 rounded-lg font-medium">EMERGENCY</span>}
                {room.isLocked && <span className="text-xs px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-medium">UZAMČEN</span>}
                {room.isPaused && <span className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg font-medium">PAUZA</span>}
                {room.isEnhancedHygiene && <span className="text-xs px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg font-medium">HYGIENA</span>}
              </div>
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="px-4 pb-4 border-t border-white/5">
            <button
              onClick={handleNextStep}
              disabled={isPaused || (room.isLocked && isFinalStep)}
              className="w-full py-4 rounded-xl font-semibold text-white active:scale-95 disabled:opacity-50 transition-all"
              style={{
                background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}66 100%)`,
                boxShadow: `0 0 20px ${activeColor}40`
              }}
            >
              {isFinalStep ? 'Nový cyklus' : 'Spustit další fázi'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomDetailMobile;
