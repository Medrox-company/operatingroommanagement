import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 280;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;
const SHIFT_END_OFFSET = 12;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;

const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

/* --- Step colors with enhanced gradients --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; gradient: string }> = {
  0: { bg: 'rgba(167,139,250,0.15)', fill: 'rgba(167,139,250,0.35)', border: 'rgba(167,139,250,0.40)', text: '#A78BFA', glow: 'rgba(167,139,250,0.2)', gradient: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(167,139,250,0.05) 100%)' },
  1: { bg: 'rgba(45,212,191,0.15)', fill: 'rgba(45,212,191,0.35)', border: 'rgba(45,212,191,0.40)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.2)', gradient: 'linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(45,212,191,0.05) 100%)' },
  2: { bg: 'rgba(103,194,255,0.15)', fill: 'rgba(103,194,255,0.35)', border: 'rgba(103,194,255,0.40)', text: '#67C2FF', glow: 'rgba(103,194,255,0.2)', gradient: 'linear-gradient(135deg, rgba(103,194,255,0.2) 0%, rgba(103,194,255,0.05) 100%)' },
  3: { bg: 'rgba(251,191,36,0.15)', fill: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.40)', text: '#FBBF24', glow: 'rgba(251,191,36,0.2)', gradient: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.05) 100%)' },
  4: { bg: 'rgba(129,140,248,0.15)', fill: 'rgba(129,140,248,0.35)', border: 'rgba(129,140,248,0.40)', text: '#818CF8', glow: 'rgba(129,140,248,0.2)', gradient: 'linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(129,140,248,0.05) 100%)' },
  5: { bg: 'rgba(91,101,220,0.15)', fill: 'rgba(91,101,220,0.35)', border: 'rgba(91,101,220,0.40)', text: '#5B65DC', glow: 'rgba(91,101,220,0.2)', gradient: 'linear-gradient(135deg, rgba(91,101,220,0.2) 0%, rgba(91,101,220,0.05) 100%)' },
  6: { bg: 'rgba(52,199,89,0.06)', fill: 'rgba(52,199,89,0.12)', border: 'rgba(52,199,89,0.15)', text: '#34C759', glow: 'rgba(52,199,89,0.1)', gradient: 'linear-gradient(135deg, rgba(52,199,89,0.1) 0%, rgba(52,199,89,0.02) 100%)' },
};

/* ============================== */
/* Premium Room Detail Popup      */
/* ============================== */
const RoomDetailPopup: React.FC<{ room: OperatingRoom; onClose: () => void; currentTime: Date }> = ({ room, onClose, currentTime }) => {
  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
  const step = WORKFLOW_STEPS[stepIndex];
  const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
  const isActive = stepIndex < 6;
  const nextStep = stepIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[stepIndex + 1] : null;
  const nextColors = stepIndex < 6 ? (STEP_COLORS[stepIndex + 1] || STEP_COLORS[6]) : null;

  const startParts = room.currentProcedure?.startTime?.split(':');
  let elapsedStr = '--:--:--';
  if (startParts && startParts.length === 2 && isActive) {
    const startDate = new Date();
    startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    const elapsed = Math.max(0, Math.floor((currentTime.getTime() - startDate.getTime()) / 1000));
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    elapsedStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  let endTimeStr = '--:--';
  if (room.estimatedEndTime) {
    endTimeStr = new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  } else if (room.currentProcedure?.estimatedDuration && startParts && startParts.length === 2) {
    const sd = new Date();
    sd.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    endTimeStr = new Date(sd.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }

  const progress = room.currentProcedure?.progress || 0;
  const themeColor = room.isEmergency ? '#FF3B30' : room.isLocked ? '#FBBF24' : colors.text;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Premium glassmorph backdrop */}
      <motion.div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.75) 100%)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
        }}
        onClick={onClose}
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: 'blur(40px) saturate(120%)' }}
        exit={{ backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.4 }}
      />

      {/* Popup with ultra-premium glassmorph */}
      <motion.div
        className="relative w-full max-w-[960px] rounded-[32px] overflow-hidden shadow-2xl"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
          backdropFilter: 'blur(60px) saturate(200%)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: `0 24px 96px rgba(0, 0, 0, 0.6), 
                      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
                      0 0 120px ${themeColor}20,
                      0 8px 32px rgba(0, 0, 0, 0.4)`
        }}
        initial={{ scale: 0.88, y: 40, opacity: 0, rotateX: 8 }}
        animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
        exit={{ scale: 0.92, y: 30, opacity: 0, rotateX: 4 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated top accent with glow */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-[3px] z-50" 
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
            filter: `drop-shadow(0 0 12px ${themeColor}80)`,
          }}
          animate={{ 
            opacity: [0.5, 1, 0.5],
            boxShadow: [`0 0 20px ${themeColor}40`, `0 0 40px ${themeColor}80`, `0 0 20px ${themeColor}40`]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Ambient floating orbs */}
        <motion.div 
          className="absolute -top-48 -right-48 w-96 h-96 rounded-full pointer-events-none blur-[100px]" 
          style={{ background: `radial-gradient(circle, ${themeColor}30 0%, transparent 70%)` }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute -bottom-48 -left-48 w-96 h-96 rounded-full pointer-events-none blur-[100px]" 
          style={{ background: `radial-gradient(circle, ${themeColor}25 0%, transparent 70%)` }}
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Header with sophisticated glassmorph */}
        <motion.div 
          className="flex items-center justify-between px-8 py-6 border-b relative"
          style={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)', 
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%)',
            backdropFilter: 'blur(20px)'
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-6">
            {/* Animated premium progress ring */}
            <motion.div 
              className="relative w-20 h-20 flex-shrink-0"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, duration: 0.8, type: 'spring', bounce: 0.35 }}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <defs>
                  <linearGradient id={`progress-gradient-${room.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={themeColor} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={themeColor} stopOpacity="0.4" />
                  </linearGradient>
                  <filter id={`glow-${room.id}`}>
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                <motion.circle 
                  cx="40" cy="40" r="34" fill="none"
                  stroke={`url(#progress-gradient-${room.id})`}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  filter={`url(#glow-${room.id})`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 34}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 34 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.4, duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span 
                  className="text-lg font-black text-white tracking-tight"
                  style={{ textShadow: `0 0 20px ${themeColor}40` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4, type: 'spring', bounce: 0.4 }}
                >
                  {progress}%
                </motion.span>
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-3.5 mb-1.5">
                <motion.h2 
                  className="text-3xl font-black tracking-tight text-white"
                  style={{ textShadow: '0 2px 20px rgba(0, 0, 0, 0.4)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                >
                  {room.name}
                </motion.h2>
                {isActive && (
                  <motion.span 
                    className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider border backdrop-blur-sm" 
                    style={{ 
                      color: themeColor, 
                      borderColor: `${themeColor}50`, 
                      background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}10)`,
                      boxShadow: `0 0 20px ${themeColor}20, inset 0 1px 0 rgba(255,255,255,0.1)`
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                  >
                    {step.title}
                  </motion.span>
                )}
                {room.isEmergency && (
                  <motion.span 
                    className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider border backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,59,48,0.25), rgba(255,59,48,0.15))',
                      borderColor: 'rgba(255,59,48,0.5)',
                      color: '#FF3B30'
                    }}
                    animate={{ 
                      boxShadow: [
                        '0 0 0 rgba(255,59,48,0)', 
                        '0 0 30px rgba(255,59,48,0.5)', 
                        '0 0 0 rgba(255,59,48,0)'
                      ] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    EMERGENCY
                  </motion.span>
                )}
                {room.isLocked && (
                  <span className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider border backdrop-blur-sm" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.15))', borderColor: 'rgba(251,191,36,0.5)', color: '#FBBF24' }}>
                    UZAMCENO
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white/35 tracking-wide">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {isActive && (
              <motion.div 
                className="text-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <p className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase mb-1.5">DOBA OPERACE</p>
                <motion.p 
                  className="text-3xl font-black font-mono tracking-wider" 
                  style={{ 
                    color: themeColor, 
                    textShadow: `0 0 30px ${themeColor}50, 0 2px 10px rgba(0,0,0,0.5)`
                  }}
                  animate={{ opacity: [1, 0.75, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {elapsedStr}
                </motion.p>
              </motion.div>
            )}
            <motion.button
              onClick={onClose}
              className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)', 
                borderColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
              whileHover={{ 
                scale: 1.08, 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 6px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <X className="w-5 h-5 text-white/60" />
            </motion.button>
          </div>
        </motion.div>

        {/* Body with stagger animations */}
        <div className="px-8 py-6 space-y-6">

          {/* Postup operace with premium cards */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-white/35" />
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/55">Postup operace</h3>
              </div>
              <div className="flex gap-4 items-stretch">
                <motion.div 
                  className="flex-1 rounded-[20px] p-5 border relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}08)`,
                    borderColor: `${themeColor}30`,
                    backdropFilter: 'blur(30px)',
                    boxShadow: `0 8px 32px ${themeColor}15, inset 0 1px 0 rgba(255,255,255,0.08)`
                  }}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ 
                    scale: 1.02, 
                    borderColor: `${themeColor}45`,
                    boxShadow: `0 12px 40px ${themeColor}20, inset 0 1px 0 rgba(255,255,255,0.12)`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <motion.div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: themeColor, boxShadow: `0 0 16px ${themeColor}` }} 
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }} 
                        transition={{ duration: 1.8, repeat: Infinity }} 
                      />
                      <span className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl" style={{ color: themeColor, background: `${themeColor}18`, boxShadow: `0 2px 8px ${themeColor}15` }}>
                      Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                      style={{ background: `${themeColor}20`, borderColor: `${themeColor}35`, boxShadow: `0 4px 16px ${themeColor}15` }}
                    >
                      <step.Icon className="w-6 h-6" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white tracking-tight mb-1">{step.title}</p>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-white/25" />
                        <span className="text-xs text-white/35 font-medium">{room.currentProcedure?.startTime || '--:--'}</span>
                        <span className="text-xs font-bold" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <motion.div 
                        className="w-11 h-11 rounded-full flex items-center justify-center border"
                        style={{ background: `${nextColors.text}15`, borderColor: `${nextColors.text}30`, backdropFilter: 'blur(20px)' }}
                        animate={{ x: [0, 8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <svg className="w-5 h-5" style={{ color: nextColors.text }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </div>
                    <motion.div
                      className="flex-1 rounded-[20px] p-5 border"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', 
                        borderColor: 'rgba(255,255,255,0.1)', 
                        backdropFilter: 'blur(30px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                      }}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ 
                        scale: 1.02, 
                        borderColor: 'rgba(255,255,255,0.18)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                          <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white/40">NASLEDUJICI</span>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl text-white/30 bg-white/[0.06]">
                          Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-white/[0.05] border-white/[0.1]">
                          <nextStep.Icon className="w-6 h-6 text-white/35" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white/55 tracking-tight mb-1">{nextStep.title}</p>
                          <p className="text-xs text-white/25">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Prubeh vykonu with micro-interactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Stethoscope className="w-5 h-5 text-white/35" />
              <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/55">Prubeh vykonu</h3>
            </div>
            <div className="flex items-start gap-1.5">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <React.Fragment key={i}>
                    <motion.div 
                      className="flex flex-col items-center flex-1 min-w-0"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <motion.div
                        className={`w-11 h-11 rounded-[14px] flex items-center justify-center border mb-2 transition-all ${!isCurrent && !isCompleted ? 'opacity-30' : ''}`}
                        style={{
                          background: isCurrent ? sc.gradient : isCompleted ? `${sc.text}12` : 'rgba(255,255,255,0.03)',
                          borderColor: isCurrent ? `${sc.text}60` : isCompleted ? `${sc.text}25` : 'rgba(255,255,255,0.08)',
                          boxShadow: isCurrent ? `0 0 24px ${sc.glow}, 0 4px 16px ${sc.glow}, inset 0 1px 0 rgba(255,255,255,0.1)` : isCompleted ? `0 2px 8px ${sc.glow}` : 'none',
                        }}
                        whileHover={{ scale: 1.15, y: -4, transition: { duration: 0.2 } }}
                        animate={isCurrent ? { y: [0, -4, 0], boxShadow: [`0 0 24px ${sc.glow}`, `0 0 32px ${sc.glow}`, `0 0 24px ${sc.glow}`] } : {}}
                        transition={isCurrent ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                      >
                        <ws.Icon className="w-5 h-5" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.2)' }} />
                      </motion.div>
                      <span className={`text-[8px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/80' : isCompleted ? 'text-white/40' : 'text-white/15'}`}>{ws.title}</span>
                      {isCurrent && (
                        <motion.span 
                          className="text-[8px] font-black px-2 py-1 rounded-lg mt-1.5" 
                          style={{ color: sc.text, background: `${sc.text}18`, boxShadow: `0 2px 8px ${sc.glow}` }}
                          animate={{ boxShadow: [`0 2px 8px ${sc.glow}`, `0 4px 16px ${sc.glow}`, `0 2px 8px ${sc.glow}`] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          LIVE
                        </motion.span>
                      )}
                    </motion.div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div 
                        className="h-[2px] flex-shrink-0 rounded-full mt-[22px]" 
                        style={{ 
                          width: 14, 
                          background: i < stepIndex ? `linear-gradient(90deg, ${sc.text}50, ${STEP_COLORS[i+1]?.text || sc.text}50)` : 'rgba(255,255,255,0.06)' 
                        }} 
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Tym + Casy with sophisticated layout */}
          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Team */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-white/35" />
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/55">Tym</h3>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#2DD4BF', icon: Users },
                ].map((member, idx) => (
                  <motion.div 
                    key={member.label} 
                    className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-[18px] border"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + idx * 0.08, duration: 0.5 }}
                    whileHover={{ 
                      scale: 1.03, 
                      borderColor: 'rgba(255,255,255,0.15)',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0" style={{ background: `${member.color}15`, borderColor: `${member.color}30`, boxShadow: `0 2px 8px ${member.color}15` }}>
                      <member.icon className="w-4 h-4" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black tracking-[0.15em] uppercase text-white/30 mb-0.5">{member.label}</p>
                      <p className={`text-xs font-bold truncate ${member.name ? 'text-white/70' : 'text-white/20 italic'}`}>{member.name || 'Neprirazeno'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-white/35" />
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/55">Casy</h3>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'ZACATEK', value: room.currentProcedure?.startTime || '--:--', color: 'rgba(255,255,255,0.75)' },
                  { label: 'ODHAD', value: endTimeStr, color: isActive ? themeColor : 'rgba(255,255,255,0.3)' }
                ].map((time, idx) => (
                  <motion.div 
                    key={time.label} 
                    className="rounded-[18px] border px-5 py-3.5 text-center min-w-[100px]"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + idx * 0.08, duration: 0.5 }}
                    whileHover={{ 
                      scale: 1.05, 
                      borderColor: 'rgba(255,255,255,0.15)',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                    }}
                  >
                    <p className="text-[9px] font-black tracking-[0.15em] uppercase text-white/25 mb-1">{time.label}</p>
                    <p className="text-2xl font-black font-mono tracking-wide" style={{ color: time.color, textShadow: idx === 1 && isActive ? `0 0 16px ${themeColor}30` : 'none' }}>
                      {time.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Main Timeline Component        */
/* ============================== */
export default function TimelineModule({ rooms }: TimelineModuleProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentSec = currentTime.getSeconds();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;
  const shortTimeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const emergency = rooms.filter(r => r.isEmergency).length;
    const doctors = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex < 6).length;
    const nurses = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex < 6).length;
    return { operations, cleaning, free, completed, emergency, doctors, nurses };
  }, [rooms]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      const aActive = a.currentStepIndex < 6;
      const bActive = b.currentStepIndex < 6;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [rooms]);

  const shiftEndPercent = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* Premium Header */}
      <header className="relative z-10 flex items-center justify-between gap-6 px-6 md:pl-32 md:pr-8 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2.5 opacity-60">
            <Shield className="w-5 h-5 text-[#00D8C1]" />
            <span className="text-[10px] font-black text-[#00D8C1] tracking-[0.35em] uppercase hidden lg:inline">OPERATINGROOM CONTROL</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>TIMELINE</h1>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap justify-end">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#34C759', dot: true },
            { label: 'UKLID', value: stats.cleaning, color: '#FBBF24', dot: true },
            { label: 'VOLNE', value: stats.free, color: '#00D8C1', highlight: true },
            { label: 'HOTOVO', value: stats.completed, color: '#818CF8', dot: true },
          ].map((s) => (
            <motion.div
              key={s.label}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-bold tracking-wider ${
                s.highlight ? 'border' : 'border'
              }`}
              style={{
                background: s.highlight ? `linear-gradient(135deg, ${s.color}20, ${s.color}10)` : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                borderColor: s.highlight ? `${s.color}40` : 'rgba(255,255,255,0.08)',
                color: s.highlight ? s.color : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(20px)',
                boxShadow: s.highlight ? `0 4px 16px ${s.color}15, inset 0 1px 0 rgba(255,255,255,0.1)` : '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
              whileHover={{ scale: 1.05 }}
            >
              {s.dot && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}80` }} />}
              <span className="font-mono font-black text-sm">{s.value}</span>
              <span className="text-[8px] uppercase tracking-widest opacity-70 hidden xl:inline">{s.label}</span>
            </motion.div>
          ))}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', color: 'rgba(255,255,255,0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <Users className="w-4 h-4 text-white/35" />
            <span className="font-mono">{stats.doctors}</span>
            <span className="text-[8px] opacity-50">{'/'}</span>
            <span className="font-mono">{stats.nurses}</span>
          </div>
          {stats.emergency > 0 && (
            <motion.div 
              className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[10px] font-bold" 
              style={{ background: 'linear-gradient(135deg, rgba(255,59,48,0.2), rgba(255,59,48,0.1))', borderColor: 'rgba(255,59,48,0.4)', color: '#FF3B30', backdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(255,59,48,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' }}
              animate={{ boxShadow: ['0 4px 16px rgba(255,59,48,0.2)', '0 6px 24px rgba(255,59,48,0.4)', '0 4px 16px rgba(255,59,48,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="font-mono font-black">{stats.emergency}</span>
              <span className="text-[8px] uppercase tracking-widest opacity-70 hidden xl:inline">EMERGENCY</span>
            </motion.div>
          )}
          <div className="w-px h-6 bg-white/15 mx-1" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <CalendarDays className="w-4 h-4 text-white/30" />
            <span className="text-[10px] font-bold text-white/40 tracking-wide">
              {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>
          <motion.div 
            className="flex items-center gap-2.5 px-5 py-2 rounded-full border" 
            style={{ background: 'linear-gradient(135deg, rgba(0,216,193,0.15), rgba(0,216,193,0.08))', borderColor: 'rgba(0,216,193,0.4)', backdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(0,216,193,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            animate={{ boxShadow: ['0 4px 16px rgba(0,216,193,0.2)', '0 6px 24px rgba(0,216,193,0.3)', '0 4px 16px rgba(0,216,193,0.2)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Clock className="w-4 h-4 text-[#00D8C1]" />
            <span className="text-base font-mono font-black tracking-wider text-white" style={{ textShadow: '0 0 20px rgba(0,216,193,0.4)' }}>{timeStr}</span>
          </motion.div>
        </div>
      </header>

      {/* Premium Timeline Grid */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 md:pl-32 md:pr-8 pb-4 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[24px] border" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          {/* Time Axis Header */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.25) 100%)', backdropFilter: 'blur(20px)' }}>
            <div className="flex-shrink-0 flex items-center px-5 gap-3 border-r" style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Stethoscope className="w-4 h-4 text-[#00D8C1]/50" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40">OPERACNI SALY</span>
            </div>
            <div className="flex-1 flex items-center h-12 relative">
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / HOURS_COUNT;
                const leftPct = i * widthPct;
                const isNight = hour >= 19 || hour < 7;
                const isCurrentHour = !isLast && (() => {
                  const hFrom7 = hour >= 7 ? (hour - 7) * 60 : (hour + 17) * 60;
                  const nextH = TIME_MARKERS[i + 1];
                  const nFrom7 = nextH >= 7 ? (nextH - 7) * 60 : (nextH + 17) * 60;
                  const nowMin = getMinutesFrom7(currentTime);
                  return nowMin >= hFrom7 && nowMin < nFrom7;
                })();
                return (
                  <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}>
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.04]' : 'bg-white/[0.08]'}`} />
                    {!isLast && (
                      isCurrentHour ? (
                        <motion.div 
                          className="ml-3 px-3 py-1.5 rounded-xl border" 
                          style={{ background: 'linear-gradient(135deg, #00D8C1, #00B8A3)', borderColor: '#00D8C1', boxShadow: '0 0 24px rgba(0,216,193,0.6), 0 4px 16px rgba(0,216,193,0.4)' }}
                          animate={{ boxShadow: ['0 0 24px rgba(0,216,193,0.6)', '0 0 32px rgba(0,216,193,0.8)', '0 0 24px rgba(0,216,193,0.6)'] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="text-xs font-mono font-black text-black tracking-wide">{shortTimeStr}</span>
                        </motion.div>
                      ) : (
                        <span className={`ml-3 text-xs font-mono font-semibold ${isNight ? 'text-white/20' : 'text-white/45'}`}>{hourLabel(hour)}</span>
                      )
                    )}
                  </div>
                );
              })}
              {TIME_MARKERS.slice(0, -1).map((_, i) => (
                <div key={`half-${i}`} className="absolute bottom-0 w-px h-3 bg-white/[0.05]" style={{ left: `${((i + 0.5) / HOURS_COUNT) * 100}%` }} />
              ))}
            </div>
          </div>

          {/* Room Rows */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            {/* Premium now indicator */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  <motion.div 
                    className="absolute -left-8 top-0 bottom-0 w-16 opacity-[0.08] blur-2xl" 
                    style={{ background: '#00D8C1' }}
                    animate={{ opacity: [0.08, 0.15, 0.08] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute -left-px top-0 bottom-0 w-[3px] rounded-full" style={{ background: 'linear-gradient(to bottom, #00D8C1 0%, #00D8C1BB 50%, #00D8C166 100%)', boxShadow: '0 0 16px rgba(0,216,193,0.6)' }} />
                  <motion.div 
                    className="absolute -left-[7px] -top-[2px] w-[17px] h-[17px] rounded-full" 
                    style={{ background: 'radial-gradient(circle, #00D8C1 0%, #00B8A3 100%)', boxShadow: '0 0 16px #00D8C1, 0 0 32px rgba(0,216,193,0.6), 0 2px 8px rgba(0,0,0,0.3)' }}
                    animate={{ 
                      boxShadow: [
                        '0 0 16px #00D8C1, 0 0 32px rgba(0,216,193,0.6)', 
                        '0 0 24px #00D8C1, 0 0 48px rgba(0,216,193,0.8)', 
                        '0 0 16px #00D8C1, 0 0 32px rgba(0,216,193,0.6)'
                      ] 
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shift boundary */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})` }}>
              <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 5px, transparent 5px, transparent 10px)' }} />
            </div>

            {/* Night zone overlay */}
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-gradient-to-r from-[#0a0a2a]/30 to-[#0a0a2a]/20" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0 }} />

            {/* Rows */}
            {sortedRooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const isActive = stepIndex < 6;
              const isFree = stepIndex >= 6;
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];

              const startParts = room.currentProcedure?.startTime?.split(':');
              const startDate = new Date();
              if (startParts && startParts.length === 2) {
                startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
              }
              const boxLeftPct = getTimePercent(startDate);
              let boxRightPct: number;
              if (room.estimatedEndTime) {
                boxRightPct = getTimePercent(new Date(room.estimatedEndTime));
              } else if (room.currentProcedure?.estimatedDuration) {
                const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                boxRightPct = getTimePercent(endDate);
              } else {
                boxRightPct = boxLeftPct + 5;
              }
              const boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
              const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

              if (room.isEmergency) {
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: roomIndex * 0.02, duration: 0.4 }}
                    className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer"
                    style={{ borderColor: 'rgba(255,59,48,0.12)' }}
                    onClick={() => setSelectedRoom(room)}
                    whileHover={{ backgroundColor: 'rgba(255,59,48,0.03)' }}
                  >
                    <div className="flex-shrink-0 flex items-center gap-4 px-5 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.20) 0%, rgba(255,59,48,0.10) 100%)', borderColor: 'rgba(255,59,48,0.2)', backdropFilter: 'blur(20px)' }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ background: 'rgba(255,59,48,0.3)', borderColor: 'rgba(255,59,48,0.5)', boxShadow: '0 0 20px rgba(255,59,48,0.4)' }}>
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'rgba(255,59,48,0.6)' }} animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-xs font-medium text-red-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.05]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.28) 0%, rgba(255,59,48,0.18) 50%, rgba(255,59,48,0.28) 100%)', border: '1px solid rgba(255,59,48,0.25)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(255,59,48,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,59,48,1) 10px, rgba(255,59,48,1) 11px), repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,59,48,1) 10px, rgba(255,59,48,1) 11px)' }} />
                        <span className="text-lg font-black tracking-[0.6em] text-white/70 uppercase select-none relative z-10">E M E R G E N C Y</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              if (room.isLocked) {
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: roomIndex * 0.02, duration: 0.4 }}
                    className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer"
                    style={{ borderColor: 'rgba(251,191,36,0.12)' }}
                    onClick={() => setSelectedRoom(room)}
                    whileHover={{ backgroundColor: 'rgba(251,191,36,0.02)' }}
                  >
                    <div className="flex-shrink-0 flex items-center gap-4 px-5 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.06) 100%)', borderColor: 'rgba(251,191,36,0.2)', backdropFilter: 'blur(20px)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ background: 'rgba(251,191,36,0.2)', borderColor: 'rgba(251,191,36,0.35)', boxShadow: '0 0 16px rgba(251,191,36,0.3)' }}>
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-xs font-medium text-amber-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.04]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-xl flex items-center justify-center gap-4 overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.05) 50%, rgba(251,191,36,0.10) 100%)', border: '1px solid rgba(251,191,36,0.15)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 12px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                        <Lock className="w-5 h-5 text-amber-400/35" />
                        <span className="text-base font-black tracking-[0.4em] text-amber-400/45 uppercase select-none">UZAMCENO</span>
                        <Lock className="w-5 h-5 text-amber-400/35" />
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: roomIndex * 0.02, duration: 0.4 }}
                  className="flex items-stretch flex-1 min-h-0 border-b group cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  onClick={() => setSelectedRoom(room)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex-shrink-0 flex items-center gap-4 px-5 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 100%)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ background: isActive ? `${colors.text}18` : 'rgba(255,255,255,0.04)', borderColor: isActive ? `${colors.text}40` : 'rgba(255,255,255,0.08)', boxShadow: isActive ? `0 0 16px ${colors.glow}` : 'none' }}>
                        {isActive ? <Activity className="w-4 h-4" style={{ color: colors.text }} /> : <div className="w-2.5 h-2.5 rounded-full bg-white/15" />}
                      </div>
                      {isActive && (
                        <motion.div className="absolute inset-0 rounded-full border" style={{ borderColor: `${colors.text}60` }} animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-black tracking-tight uppercase truncate leading-tight ${isActive ? 'text-white/90' : 'text-white/50'}`}>{room.name}</p>
                      {isFree ? (
                        <p className="text-xs font-medium text-white/30 truncate">Volny</p>
                      ) : (
                        <p className="text-xs font-medium truncate" style={{ color: `${colors.text}80` }}>{room.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`} style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />;
                    })}

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.9 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.6, delay: roomIndex * 0.025, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[3px] bottom-[3px] rounded-xl overflow-hidden"
                        style={{ left: `${Math.max(0, boxLeftPct)}%`, width: `${boxWidthPct}%`, transformOrigin: 'left center' }}
                      >
                        <div className="absolute inset-0 rounded-xl" style={{ background: colors.gradient, border: `1px solid ${colors.border}`, boxShadow: `0 0 24px ${colors.glow}, 0 4px 16px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`, backdropFilter: 'blur(10px)' }} />
                        <motion.div 
                          className="absolute top-0 bottom-0 left-0 rounded-l-xl" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${progressPct}%` }} 
                          transition={{ duration: 1.5, ease: 'easeOut' }} 
                          style={{ background: `linear-gradient(90deg, ${colors.fill}, ${colors.bg})` }} 
                        />
                        <div className="absolute inset-0 flex items-center px-4 text-white z-10">
                          <div className="flex items-center gap-2.5">
                            <step.Icon className="w-5 h-5" style={{ color: colors.text, filter: `drop-shadow(0 0 6px ${colors.glow})` }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate text-white leading-tight">{step.title}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-semibold text-white/60">{room.currentProcedure?.startTime || '--:--'}</span>
                                <span className="text-white/30">→</span>
                                <span className="font-mono font-semibold text-white/60">{room.estimatedEndTime ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black font-mono tracking-wide" style={{ color: colors.text, textShadow: `0 0 16px ${colors.glow}` }}>{room.currentProcedure?.progress || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
