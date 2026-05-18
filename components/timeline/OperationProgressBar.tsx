'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  yellow: '#FFE66D',
  border: 'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.03)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
  textHi: 'rgba(255,255,255,0.95)',
};

interface OperationProgressBarProps {
  current: number;
  total: number;
  label?: string;
  color?: string;
  showPercent?: boolean;
  height?: number;
  animated?: boolean;
}

export function OperationProgressBar({
  current,
  total,
  label,
  color = C.accent,
  showPercent = true,
  height = 4,
  animated = true,
}: OperationProgressBarProps) {
  const percent = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(100, (current / total) * 100);
  }, [current, total]);

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Label */}
      {label && (
        <span className="text-[9px] font-medium truncate flex-shrink-0" style={{ color: C.muted }}>
          {label}
        </span>
      )}

      {/* Progress bar container */}
      <div className="flex-1 relative overflow-hidden rounded-full" style={{ height: `${height}px`, background: C.surface }}>
        {/* Background segments (if needed) */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r"
              style={{ borderColor: C.border, opacity: 0.3 }}
            />
          ))}
        </div>

        {/* Progress fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 20,
            duration: 0.3 
          }}
          className="absolute inset-y-0 left-0 rounded-full origin-left"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
            boxShadow: `0 0 12px ${color}50, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        >
          {/* Animated stripe effect */}
          {animated && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 4px,
                  rgba(255, 255, 255, 0.1) 4px,
                  rgba(255, 255, 255, 0.1) 8px
                )`,
                animation: `slide 2s linear infinite`,
              }}
            />
          )}
        </motion.div>

        {/* Current indicator dot */}
        {percent > 0 && (
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full -mr-1"
            style={{
              left: `${percent}%`,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        )}
      </div>

      {/* Percent display */}
      {showPercent && (
        <span className="text-[9px] font-semibold tabular-nums flex-shrink-0 w-8 text-right" style={{ color }}>
          {Math.round(percent)}%
        </span>
      )}

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-8px); }
          100% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

export default OperationProgressBar;
