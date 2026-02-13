import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Stethoscope, Activity, AlertTriangle, X } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

const STEP_COLORS: Record<number, { subtle: string; accent: string; text: string }> = {
  0: { subtle: 'rgba(167,139,250,0.08)', accent: '#A78BFA', text: 'rgba(167,139,250,0.9)' },
  1: { subtle: 'rgba(45,212,191,0.08)', accent: '#2DD4BF', text: 'rgba(45,212,191,0.9)' },
  2: { subtle: 'rgba(255,59,48,0.08)', accent: '#FF3B30', text: 'rgba(255,59,48,0.9)' },
  3: { subtle: 'rgba(251,191,36,0.08)', accent: '#FBBF24', text: 'rgba(251,191,36,0.9)' },
  4: { subtle: 'rgba(129,140,248,0.08)', accent: '#818CF8', text: 'rgba(129,140,248,0.9)' },
  5: { subtle: 'rgba(91,101,220,0.08)', accent: '#5B65DC', text: 'rgba(91,101,220,0.9)' },
  6: { subtle: 'rgba(52,199,89,0.08)', accent: '#34C759', text: 'rgba(52,199,89,0.9)' },
};

const ROOM_LABEL_WIDTH = 160;
const HOURS_COUNT = 13;
const TIME_MARKERS = Array.from({ length: HOURS_COUNT + 1 }, (_, i) => ((7 + i) % 24));

export const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ operations: 0, cleaning: 0, free: 0, completed: 0, emergency: 0, doctors: 0, nurses: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    const stats = { operations: 0, cleaning: 0, free: 0, completed: 0, emergency: 0, doctors: 2, nurses: 3 };
    rooms.forEach(room => {
      if (room.currentStepIndex < 6) stats.operations++;
      else if (room.currentStepIndex === 6) stats.cleaning++;
      else stats.free++;
      if (room.isEmergency) stats.emergency++;
    });
    stats.completed = Math.floor(Math.random() * 5);
    setStats(stats);
    return () => clearInterval(timer);
  }, [rooms]);

  const getMinutesFrom7 = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (hours >= 7 ? hours - 7 : hours + 17) * 60 + minutes;
  };

  const nowPercent = useMemo(() => {
    const mins = getMinutesFrom7(currentTime);
    return (mins / (HOURS_COUNT * 60)) * 100;
  }, [currentTime]);

  const timeStr = currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
      {/* Header - Ultra Minimal */}
      <header className="flex items-center justify-between px-8 py-5 border-b" style={{ 
        borderColor: 'rgba(255,255,255,0.05)',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)'
      }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Stethoscope className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
          <h1 className="text-sm font-light tracking-wider text-white/70">Timeline</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="text-xs font-light text-white/50">Now</span>
            <span className="font-mono text-xs font-light" style={{ color: 'rgba(255,255,255,0.9)' }}>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Timeline Container */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {/* Time Axis Header - Subtle */}
        <div className="flex flex-shrink-0 border-b" style={{ 
          borderColor: 'rgba(255,255,255,0.04)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div style={{ width: ROOM_LABEL_WIDTH }} className="flex-shrink-0 px-6 py-3 flex items-center border-r" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[11px] font-light text-white/40 tracking-widest">ROOM</span>
          </div>
          <div className="flex-1 relative flex items-center overflow-hidden">
            {TIME_MARKERS.map((hour, i) => {
              const widthPct = 100 / HOURS_COUNT;
              const leftPct = i * widthPct;
              const isNight = hour >= 19 || hour < 7;
              
              return (
                <div key={i} className="absolute top-0 h-full flex items-center text-center" style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                  <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: isNight ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)' }} />
                  <span className="text-[10px] font-light" style={{ color: isNight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)' }}>
                    {`${hour}:00`}
                  </span>
                </div>
              );
            })}

            {/* Current time indicator - Subtle line */}
            {nowPercent >= 0 && nowPercent <= 100 && (
              <motion.div 
                className="absolute top-0 bottom-0 w-px pointer-events-none z-20"
                style={{ left: `${nowPercent}%`, background: 'rgba(255,255,255,0.15)' }}
              />
            )}
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto relative">
          {rooms.map((room, roomIndex) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const step = WORKFLOW_STEPS[stepIndex];
            const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
            const isActive = stepIndex < 6;

            const startParts = room.currentProcedure?.startTime?.split(':');
            const startDate = new Date();
            if (startParts && startParts.length === 2) {
              startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
            }

            const procedureDuration = room.currentProcedure?.estimatedDuration || 60;
            const endDate = new Date(startDate.getTime() + procedureDuration * 60 * 1000);
            const boxLeftPct = Math.max(0, ((getMinutesFrom7(startDate) / (HOURS_COUNT * 60)) * 100));
            const boxRightPct = Math.min(100, ((getMinutesFrom7(endDate) / (HOURS_COUNT * 60)) * 100));
            const boxWidthPct = Math.max(0, boxRightPct - boxLeftPct);
            const progressPct = isActive ? Math.min(100, ((getMinutesFrom7(currentTime) - getMinutesFrom7(startDate)) / procedureDuration / 60) * 100) : 0;

            return (
              <div 
                key={room.id}
                className="flex items-stretch flex-1 min-h-0 border-b group hover:bg-white/[0.01] transition-all duration-200"
                style={{ borderColor: 'rgba(255,255,255,0.03)' }}
              >
                {/* Room Label */}
                <div className="flex-shrink-0 px-6 py-3 flex items-center border-r group-hover:bg-white/[0.02] transition-all" style={{ 
                  width: ROOM_LABEL_WIDTH,
                  borderColor: 'rgba(255,255,255,0.03)',
                  background: isActive ? 'rgba(255,255,255,0.01)' : 'transparent'
                }}>
                  <div className="min-w-0">
                    <p className="text-sm font-light text-white/80 truncate">{room.name}</p>
                    <p className="text-[10px] font-light text-white/30 truncate mt-1">{room.department}</p>
                  </div>
                </div>

                {/* Timeline Area */}
                <div className="relative flex-1 overflow-hidden">
                  {/* Time grid lines - very subtle */}
                  {TIME_MARKERS.slice(0, -1).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute top-0 bottom-0 w-px" 
                      style={{ 
                        left: `${((i + 1) / HOURS_COUNT) * 100}%`,
                        background: 'rgba(255,255,255,0.015)'
                      }} 
                    />
                  ))}

                  {/* Procedure Bar */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0.95 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.5, delay: roomIndex * 0.05 }}
                      className="absolute top-2.5 bottom-2.5 group-hover:top-2 group-hover:bottom-2 transition-all rounded"
                      style={{ 
                        left: `calc(${boxLeftPct}% + 8px)`, 
                        right: `calc(${100 - boxRightPct}% + 8px)`,
                        background: colors.subtle,
                        border: `1px solid ${colors.accent}30`,
                        boxShadow: `0 0 8px ${colors.accent}10`
                      }}
                    >
                      {/* Progress indicator */}
                      <motion.div 
                        className="absolute inset-y-0 left-0 rounded" 
                        initial={{ width: '0%' }} 
                        animate={{ width: `${progressPct}%` }} 
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ 
                          background: `${colors.accent}40`,
                          borderRight: `1px solid ${colors.accent}80`
                        }} 
                      />

                      {/* Content */}
                      <div className="relative h-full px-3 flex items-center gap-2 z-10 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.accent }} />
                        <span className="text-[11px] font-light text-white/80 truncate">{step.title}</span>
                        {room.currentPatient && (
                          <span className="text-[10px] font-light text-white/40 truncate">{room.currentPatient.name}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2 text-[10px] font-light text-white/40 flex-shrink-0">
                          <span>{room.currentProcedure?.startTime}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
