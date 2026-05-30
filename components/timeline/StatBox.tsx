import React from 'react';
import { motion } from 'framer-motion';
import { C } from './constants';

// Helper Component - Stat Box (Modern glass-morphism)
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  glow?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, glow }) => (
  <motion.div
    whileHover={{ scale: 1.03, y: -2 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-xl cursor-pointer`}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`
        : `linear-gradient(135deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
      border: glow ? `1px solid ${color}40` : `1px solid ${C.border}`,
      boxShadow: glow
        ? `0 0 30px ${color}20, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
        : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}
  >
    {/* Ambient glow for emergency/special states */}
    {glow && (
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse at 50% -20%, ${color}30 0%, transparent 60%)`,
        }}
      />
    )}
    {/* Top accent line */}
    <div
      className="absolute top-0 left-0 right-0 h-[2px]"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: glow ? 0.8 : 0.4 }}
    />
    <div className="relative flex items-center gap-3 h-full">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 12px ${color}20`,
        }}
      >
        <span style={{ color }}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/50 uppercase tracking-[0.25em] font-semibold">{label}</p>
        <p className="text-sm font-bold leading-tight" style={{ color: glow ? color : C.textHi }}>{value}</p>
      </div>
    </div>
  </motion.div>
);

export default StatBox;
