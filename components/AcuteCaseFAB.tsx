"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface AcuteCaseFABProps {
  onClick: () => void;
}

const AcuteCaseFAB: React.FC<AcuteCaseFABProps> = ({ onClick }) => {
  const RED = '#ef4444';
  
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label="Přidat akutní výkon"
      className="fixed z-50 group"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        right: '20px',
      }}
    >
      {/* Outer pulse ring */}
      <motion.span
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: RED, filter: 'blur(8px)' }}
      />

      {/* Main button */}
      <div
        className="relative flex items-center gap-2.5 h-14 rounded-full px-5 backdrop-blur-md transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${RED}dd 100%)`,
          boxShadow: `0 10px 32px ${RED}50, 0 0 24px ${RED}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
          border: `1.5px solid ${RED}80`,
        }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-3 right-3 h-px rounded-full opacity-60"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
        />
        
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <Zap className="w-4 h-4 text-white" />
        </motion.div>
        
        <div className="hidden sm:flex flex-col items-start pr-1">
          <span className="text-[9px] font-semibold text-white/80 uppercase tracking-[0.25em] leading-none">
            Akutní
          </span>
          <span className="text-sm font-bold text-white leading-tight">
            Výkon
          </span>
        </div>
      </div>
    </motion.button>
  );
};

export default AcuteCaseFAB;
