'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, ChevronDown, Eye, EyeOff, Filter, X
} from 'lucide-react';

// Design tokens
const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  yellow: '#FFE66D',
  border: 'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.03)',
  glass: 'rgba(255,255,255,0.04)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
  textHi: 'rgba(255,255,255,0.95)',
};

interface StatusItem {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface TimelineLegendProps {
  statuses: StatusItem[];
  hiddenStatuses: string[];
  onToggleStatus: (statusId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

// Status chip component
const StatusChip = ({ 
  status, 
  isHidden, 
  onToggle 
}: { 
  status: StatusItem;
  isHidden: boolean;
  onToggle: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onToggle}
    className={`
      relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
      ${isHidden ? 'opacity-40' : 'opacity-100'}
    `}
    style={{
      background: isHidden ? C.surface : `${status.color}15`,
      border: `1px solid ${isHidden ? C.border : `${status.color}40`}`,
    }}
  >
    {/* Color dot */}
    <div 
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ 
        background: status.color,
        boxShadow: isHidden ? 'none' : `0 0 8px ${status.color}50`
      }}
    />
    
    {/* Name */}
    <span 
      className="text-xs font-medium truncate max-w-[120px]"
      style={{ color: isHidden ? C.muted : C.text }}
    >
      {status.name}
    </span>
    
    {/* Count badge */}
    <span 
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
      style={{ 
        background: isHidden ? C.border : `${status.color}25`,
        color: isHidden ? C.muted : status.color
      }}
    >
      {status.count}
    </span>
    
    {/* Hidden indicator */}
    {isHidden && (
      <EyeOff className="w-3 h-3 ml-1" style={{ color: C.muted }} />
    )}
  </motion.button>
);

export function TimelineLegend({
  statuses,
  hiddenStatuses,
  onToggleStatus,
  onShowAll,
  onHideAll,
}: TimelineLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hiddenCount = hiddenStatuses.length;
  const visibleCount = statuses.length - hiddenCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div 
        className="rounded-2xl overflow-hidden backdrop-blur-xl"
        style={{ 
          background: 'rgba(11, 17, 32, 0.95)',
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset'
        }}
      >
        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-200 hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}30` }}
            >
              <Filter className="w-4 h-4" style={{ color: C.accent }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: C.textHi }}>
                Legenda statusu
              </p>
              <p className="text-[10px]" style={{ color: C.muted }}>
                {visibleCount} zobrazeno, {hiddenCount} skryto
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick actions */}
            <button
              onClick={(e) => { e.stopPropagation(); onShowAll(); }}
              className="px-2 py-1 text-[10px] font-medium rounded-md transition-colors"
              style={{ 
                color: C.accent, 
                background: `${C.accent}10`,
                border: `1px solid ${C.accent}20`
              }}
            >
              Vše
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onHideAll(); }}
              className="px-2 py-1 text-[10px] font-medium rounded-md transition-colors"
              style={{ 
                color: C.muted, 
                background: C.surface,
                border: `1px solid ${C.border}`
              }}
            >
              Nic
            </button>
            
            {/* Expand toggle */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-5 h-5" style={{ color: C.muted }} />
            </motion.div>
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div 
                className="px-4 pb-4 pt-2 border-t"
                style={{ borderColor: C.border }}
              >
                {/* Status chips grid */}
                <div className="flex flex-wrap gap-2 max-w-[600px]">
                  {statuses.map((status) => (
                    <StatusChip
                      key={status.id}
                      status={status}
                      isHidden={hiddenStatuses.includes(status.id)}
                      onToggle={() => onToggleStatus(status.id)}
                    />
                  ))}
                </div>
                
                {/* Keyboard shortcuts hint */}
                <div className="mt-3 pt-3 border-t flex items-center gap-4" style={{ borderColor: C.border }}>
                  <span className="text-[10px]" style={{ color: C.muted }}>
                    Kliknutím na status jej skryjete/zobrazíte
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Now line component with glow effect
export function NowLine({ 
  percent, 
  containerHeight,
  label = 'Nyní'
}: { 
  percent: number;
  containerHeight: number;
  label?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute top-0 bottom-0 z-30 pointer-events-none"
      style={{ left: `${percent}%` }}
    >
      {/* Glow effect */}
      <div 
        className="absolute -left-4 top-0 bottom-0 w-8"
        style={{ 
          background: 'linear-gradient(90deg, transparent 0%, rgba(115, 255, 0, 0.1) 50%, transparent 100%)'
        }}
      />
      
      {/* Main line */}
      <div 
        className="absolute -left-[1px] top-0 bottom-0 w-[2px]" 
        style={{ 
          background: 'linear-gradient(180deg, #73ff00 0%, #73ff00 90%, transparent 100%)',
          boxShadow: '0 0 12px rgba(115, 255, 0, 0.5), 0 0 24px rgba(115, 255, 0, 0.3)'
        }}
      />
      
      {/* Top label */}
      <div 
        className="absolute -left-6 -top-6 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
        style={{ 
          background: 'rgba(115, 255, 0, 0.15)',
          color: '#73ff00',
          border: '1px solid rgba(115, 255, 0, 0.3)'
        }}
      >
        {label}
      </div>
      
      {/* Animated pulse dot */}
      <motion.div
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute -left-1.5 top-0 w-3 h-3 rounded-full"
        style={{ 
          background: '#73ff00',
          boxShadow: '0 0 12px #73ff00'
        }}
      />
    </motion.div>
  );
}

// Mini sparkline for room utilization
export function MiniSparkline({ 
  data, 
  color = C.accent,
  width = 60,
  height = 20
}: { 
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Fill area */}
      <defs>
        <linearGradient id={`sparkline-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkline-fill-${color.replace('#', '')})`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export default TimelineLegend;
