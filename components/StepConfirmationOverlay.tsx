'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X } from 'lucide-react';

interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  order_index: number;
  default_duration?: number;
  default_duration_minutes?: number;
}

interface StepConfirmationOverlayProps {
  pendingStepIndex: number | null;
  activeDbStatuses: WorkflowStatus[];
  safeStepIndex: number;
  validStepCount: number;
  elapsedSeconds: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const StepConfirmationOverlay: React.FC<StepConfirmationOverlayProps> = ({
  pendingStepIndex,
  activeDbStatuses,
  safeStepIndex,
  validStepCount,
  elapsedSeconds,
  onConfirm,
  onCancel,
}) => {
  if (pendingStepIndex === null) return null;

  const pendingStep = activeDbStatuses[Math.min(pendingStepIndex, activeDbStatuses.length - 1)];
  const pendingColor = pendingStep?.color || '#6B7280';
  const isReset = pendingStepIndex === 0 && safeStepIndex === validStepCount - 1;
  const currentStep = activeDbStatuses[Math.min(safeStepIndex, activeDbStatuses.length - 1)];
  const averageMinutes = Math.max(
    1,
    currentStep?.default_duration_minutes || currentStep?.default_duration || 5,
  );
  const isShortInterval = elapsedSeconds !== null && elapsedSeconds < 5 * 60;
  const elapsedLabel = elapsedSeconds === null
    ? '—'
    : elapsedSeconds < 60
      ? `${elapsedSeconds} s`
      : `${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} s`;

  return (
    <AnimatePresence>
      <motion.div
        key="step-confirm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-confirm-title"
        aria-describedby={isShortInterval ? 'step-short-interval-warning' : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden"
      >
        {/* Background — mobil: světlý dle nového designu, desktop: tmavý */}
        <div className="absolute inset-0 bg-[#EDF1F8] md:bg-black" />
        <div className="absolute inset-0 hidden md:block bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.95)_100%)]" />

        {/* Atmospheric Edge Glows - matching main circle style */}
        <div
          className="absolute -left-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-10 md:opacity-25"
          style={{ backgroundColor: '#ef4444' }}
        />
        <div
          className="absolute -right-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-10 md:opacity-30"
          style={{ backgroundColor: '#10b981' }}
        />

        {/* Central glow for pending step color */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 md:opacity-15"
          style={{ backgroundColor: pendingColor }}
        />

        {/* Main content */}
        <div className="flex flex-col items-center relative z-10 px-4">
          
          {/* Title section - matching app typography */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`text-center ${isShortInterval ? 'mb-5 md:mb-6' : 'mb-12 md:mb-16'}`}
          >
            <p className="text-[10px] sm:text-[11px] font-bold text-[#7C8AA5] md:text-white/30 tracking-[0.5em] uppercase mb-4">
              POTVRZENÍ PŘECHODU
            </p>
            <AnimatePresence mode="wait">
              <motion.h2
                id="step-confirm-title"
                key={pendingStep?.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#17233F] md:text-white"
              >
                {isReset ? 'Nový cyklus' : pendingStep?.name || 'Další fáze'}
              </motion.h2>
            </AnimatePresence>
          </motion.div>

          {isShortInterval && (
            <motion.div
              id="step-short-interval-warning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="w-full max-w-2xl mb-7 rounded-2xl px-5 py-4"
              style={{
                background: 'rgba(251,191,36,0.10)',
                border: '1px solid rgba(251,191,36,0.34)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
              role="alert"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-300/10 border border-amber-300/25">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 md:text-amber-200">
                    Neobvykle krátký interval
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5B6B85] md:text-white/70">
                    Fáze <span className="font-semibold text-[#17233F] md:text-white">{currentStep?.name || 'aktuální krok'}</span> trvá pouze{' '}
                    <span className="font-bold text-amber-600 md:text-amber-200">{elapsedLabel}</span>. To je méně než 5 minut
                    a kratší než nastavený časový průměr tohoto kroku ({averageMinutes} min).
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#5B6B85] md:text-white/55">
                    <Clock className="w-3.5 h-3.5 text-amber-600/80 md:text-amber-200/80" />
                    Opravdu chcete přejít na další fázi?
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Two circles container */}
          <div className="flex items-center gap-8 sm:gap-12 md:gap-20 lg:gap-32">

            {/* ZRUŠIT - Red circle matching main app style */}
            <motion.button
              onClick={onCancel}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[240px] md:h-[240px] lg:w-[300px] lg:h-[300px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer"
            >
              {/* Světlý disk na mobilu — kruh působí jako bílá karta */}
              <div className="absolute inset-2 rounded-full bg-white md:bg-transparent shadow-[0_12px_32px_rgba(23,43,99,0.10)] md:shadow-none" />
              {/* Primary Background Glow - matching main circle */}
              <div
                className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-25 group-hover:opacity-40"
                style={{ backgroundColor: '#ef4444' }}
              />

              {/* Inner Glow Core */}
              <div 
                className="absolute inset-10 rounded-full blur-[80px] opacity-20 group-hover:opacity-35 transition-all duration-500"
                style={{ backgroundColor: '#ef4444' }}
              />

              {/* Animated Ring - matching main circle SVG style */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
                <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                <motion.circle 
                  cx="150" cy="150" r="140" fill="none"
                  stroke="#ef4444" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="880"
                  initial={{ strokeDashoffset: 880 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.5))' }}
                  className="opacity-80"
                />
              </svg>

              {/* Pulsing Animation Ring - matching main circle */}
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: '#ef4444' }}
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

              {/* Center Content */}
              <div className="text-center relative z-20 pointer-events-none flex flex-col items-center">
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <X className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#E5484D] md:text-white/90 md:group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                </motion.div>
                <span className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg font-bold tracking-[0.2em] uppercase text-[#41506B] md:text-white/70 md:group-hover:text-white transition-colors duration-300">
                  Zrušit
                </span>
              </div>
            </motion.button>

            {/* POTVRDIT - Green circle matching main app style */}
            <motion.button
              onClick={onConfirm}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[240px] md:h-[240px] lg:w-[300px] lg:h-[300px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer"
            >
              {/* Světlý disk na mobilu — kruh působí jako bílá karta */}
              <div className="absolute inset-2 rounded-full bg-white md:bg-transparent shadow-[0_12px_32px_rgba(23,43,99,0.10)] md:shadow-none" />
              {/* Primary Background Glow - matching main circle */}
              <div
                className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-30 group-hover:opacity-50"
                style={{ backgroundColor: '#10b981' }}
              />

              {/* Inner Glow Core */}
              <div 
                className="absolute inset-10 rounded-full blur-[80px] opacity-25 group-hover:opacity-40 transition-all duration-500"
                style={{ backgroundColor: '#10b981' }}
              />

              {/* Animated Ring - matching main circle SVG style */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
                <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                <motion.circle 
                  cx="150" cy="150" r="140" fill="none"
                  stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="880"
                  initial={{ strokeDashoffset: 880 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: 'drop-shadow(0 0 15px rgba(16,185,129,0.6))' }}
                  className="opacity-90"
                />
              </svg>

              {/* Pulsing Animation Ring - matching main circle */}
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: '#10b981' }}
                animate={{ 
                  scale: [1, 1.08, 1],
                  opacity: [0.5, 0.15, 0.5]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Second pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-500/30"
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              />

              {/* Center Content */}
              <div className="text-center relative z-20 pointer-events-none flex flex-col items-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#10b981] md:text-white/90 md:group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <span className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg font-bold tracking-[0.2em] uppercase text-[#41506B] md:text-white/70 md:group-hover:text-white transition-colors duration-300">
                  Potvrdit
                </span>
              </div>
            </motion.button>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StepConfirmationOverlay;
