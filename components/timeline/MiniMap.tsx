'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../../types';

// Design tokens
const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  border: 'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.03)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
};

interface MiniMapProps {
  rooms: OperatingRoom[];
  viewportStart: number; // 0-100 percent
  viewportEnd: number;   // 0-100 percent
  nowPercent: number;
  onViewportChange: (start: number, end: number) => void;
  statusColors: Record<number, string>;
}

export function MiniMap({
  rooms,
  viewportStart,
  viewportEnd,
  nowPercent,
  onViewportChange,
  statusColors,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, viewStart: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;
    
    // Check if clicking on viewport handle
    if (percent >= viewportStart && percent <= viewportEnd) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, viewStart: viewportStart });
    } else {
      // Jump to clicked position
      const viewportWidth = viewportEnd - viewportStart;
      const newStart = Math.max(0, Math.min(100 - viewportWidth, percent - viewportWidth / 2));
      onViewportChange(newStart, newStart + viewportWidth);
    }
  }, [viewportStart, viewportEnd, onViewportChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaPercent = (deltaX / rect.width) * 100;
    
    const viewportWidth = viewportEnd - viewportStart;
    const newStart = Math.max(0, Math.min(100 - viewportWidth, dragStart.viewStart + deltaPercent));
    
    onViewportChange(newStart, newStart + viewportWidth);
  }, [isDragging, dragStart, viewportStart, viewportEnd, onViewportChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.muted }}>
          Navigator
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: C.text }}>
          {Math.round(viewportStart)}% - {Math.round(viewportEnd)}%
        </span>
      </div>
      
      <div
        ref={containerRef}
        className="relative h-12 rounded-lg overflow-hidden cursor-crosshair select-none"
        style={{ 
          background: C.surface,
          border: `1px solid ${C.border}` 
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Time grid */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 border-r" 
              style={{ borderColor: C.border }}
            />
          ))}
        </div>

        {/* Room bars */}
        {rooms.slice(0, 8).map((room, idx) => {
          const rowHeight = 12 / Math.min(rooms.length, 8);
          const top = idx * rowHeight * (12 / Math.min(rooms.length, 8));
          const color = statusColors[room.currentStepIndex] || C.muted;
          
          // Simple representation - show active rooms as colored bars
          if (room.currentStepIndex > 0 && !room.isLocked) {
            return (
              <div
                key={room.id}
                className="absolute rounded-sm"
                style={{
                  top: `${4 + idx * 5}px`,
                  left: '10%',
                  right: '30%',
                  height: '3px',
                  background: room.isEmergency ? C.red : color,
                  opacity: 0.7,
                }}
              />
            );
          }
          return null;
        })}

        {/* Now line */}
        <div 
          className="absolute top-0 bottom-0 w-px"
          style={{ 
            left: `${nowPercent}%`,
            background: '#73ff00',
            boxShadow: '0 0 4px #73ff00'
          }}
        />

        {/* Viewport indicator */}
        <motion.div
          className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
          style={{
            left: `${viewportStart}%`,
            width: `${viewportEnd - viewportStart}%`,
            background: `${C.accent}15`,
            borderLeft: `2px solid ${C.accent}`,
            borderRight: `2px solid ${C.accent}`,
          }}
          animate={{
            boxShadow: isDragging 
              ? `0 0 12px ${C.accent}50` 
              : `0 0 4px ${C.accent}30`
          }}
        />

        {/* Hour labels */}
        <div className="absolute bottom-0 left-0 right-0 flex text-[8px] font-medium" style={{ color: C.muted }}>
          {[7, 12, 18, 24, 6].map((hour, i) => (
            <span 
              key={i} 
              className="flex-1 text-center"
              style={{ opacity: 0.5 }}
            >
              {hour}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tooltip for operation details
export function OperationTooltip({
  visible,
  x,
  y,
  room,
  stepName,
  stepColor,
  startTime,
  duration,
  progress,
}: {
  visible: boolean;
  x: number;
  y: number;
  room: OperatingRoom;
  stepName: string;
  stepColor: string;
  startTime: string;
  duration: string;
  progress: number;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="fixed z-[100] pointer-events-none"
      style={{ 
        left: x,
        top: y - 10,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div 
        className="px-4 py-3 rounded-xl backdrop-blur-xl min-w-[200px]"
        style={{ 
          background: 'rgba(11, 17, 32, 0.95)',
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ background: stepColor }}
          />
          <span className="text-sm font-semibold" style={{ color: C.text }}>
            {room.name}
          </span>
        </div>

        {/* Status */}
        <div 
          className="inline-block px-2 py-1 rounded-md text-xs font-medium mb-2"
          style={{ 
            background: `${stepColor}20`,
            color: stepColor
          }}
        >
          {stepName}
        </div>

        {/* Details */}
        <div className="space-y-1 text-[11px]" style={{ color: C.muted }}>
          <div className="flex justify-between">
            <span>Start</span>
            <span style={{ color: C.text }}>{startTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Doba trvani</span>
            <span style={{ color: C.text }}>{duration}</span>
          </div>
          <div className="flex justify-between">
            <span>Progress</span>
            <span style={{ color: stepColor }}>{progress.toFixed(0)}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div 
          className="mt-2 h-1 rounded-full overflow-hidden"
          style={{ background: C.surface }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: stepColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        {/* Arrow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
          style={{ 
            background: 'rgba(11, 17, 32, 0.95)',
            borderRight: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
          }}
        />
      </div>
    </motion.div>
  );
}

export default MiniMap;
