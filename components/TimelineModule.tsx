import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 200;
const TIME_MARKERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
const HOURS_COUNT = 24;

const getMinutesFrom0 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom0(date) / (HOURS_COUNT * 60)) * 100;

const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

/* --- Step colors --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string }> = {
  0: { bg: 'rgba(167,139,250,0.15)', fill: 'rgba(167,139,250,0.35)', border: 'rgba(167,139,250,0.40)', text: '#A78BFA', glow: 'rgba(167,139,250,0.15)' },
  1: { bg: 'rgba(45,212,191,0.15)', fill: 'rgba(45,212,191,0.35)', border: 'rgba(45,212,191,0.40)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.15)' },
  2: { bg: 'rgba(103,194,255,0.15)', fill: 'rgba(103,194,255,0.35)', border: 'rgba(103,194,255,0.40)', text: '#67C2FF', glow: 'rgba(103,194,255,0.15)' },
  3: { bg: 'rgba(251,191,36,0.15)', fill: 'rgba(251,191,36,0.35)', border: 'rgba(251,191,36,0.40)', text: '#FBBF24', glow: 'rgba(251,191,36,0.15)' },
  4: { bg: 'rgba(129,140,248,0.15)', fill: 'rgba(129,140,248,0.35)', border: 'rgba(129,140,248,0.40)', text: '#818CF8', glow: 'rgba(129,140,248,0.15)' },
  5: { bg: 'rgba(91,101,220,0.15)', fill: 'rgba(91,101,220,0.35)', border: 'rgba(91,101,220,0.40)', text: '#5B65DC', glow: 'rgba(91,101,220,0.15)' },
  6: { bg: 'rgba(52,199,89,0.06)', fill: 'rgba(52,199,89,0.12)', border: 'rgba(52,199,89,0.15)', text: '#34C759', glow: 'rgba(52,199,89,0.08)' },
};

/* ============================== */
/* Room Detail Popup Component    */
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glassmorph backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/60 backdrop-blur-2xl" 
        onClick={onClose}
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: 'blur(32px)' }}
        exit={{ backdropFilter: 'blur(0px)' }}
      />

      {/* Popup with glassmorph */}
      <motion.div
        className="relative w-full max-w-[900px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px ${themeColor}15`
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated top glow */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-[2px]" 
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
            filter: `drop-shadow(0 0 8px ${themeColor})`
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Ambient glow orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

        {/* ---- Header ---- */}
        <motion.div 
          className="flex items-center justify-between px-7 py-5 border-b relative"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center gap-5">
            {/* Animated progress ring */}
            <motion.div 
              className="relative w-16 h-16 flex-shrink-0"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring', bounce: 0.4 }}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <motion.circle 
                  cx="32" cy="32" r="26" fill="none"
                  stroke={themeColor}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 26}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 26 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 6px ${themeColor}60)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span 
                  className="text-sm font-black text-white"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  {progress}%
                </motion.span>
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <motion.h2 
                  className="text-2xl font-black tracking-tight text-white"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {room.name}
                </motion.h2>
                {isActive && (
                  <motion.span 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider border" 
                    style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}15` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {step.title}
                  </motion.span>
                )}
                {room.isEmergency && (
                  <motion.span 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-red-500/20 text-red-400 border border-red-500/40"
                    animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.4)', '0 0 0 rgba(239,68,68,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    EMERGENCY
                  </motion.span>
                )}
                {room.isLocked && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">UZAMCENO</span>
                )}
              </div>
              <p className="text-xs font-medium text-white/30 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {isActive && (
              <motion.div 
                className="text-right"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <p className="text-[8px] font-bold text-white/25 tracking-[0.15em] uppercase mb-1">DOBA OPERACE</p>
                <motion.p 
                  className="text-2xl font-black font-mono tracking-widest" 
                  style={{ color: themeColor, textShadow: `0 0 20px ${themeColor}40` }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {elapsedStr}
                </motion.p>
              </motion.div>
            )}
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}
              whileHover={{ 
                scale: 1.05, 
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <X className="w-4 h-4 text-white/50" />
            </motion.button>
          </div>
        </motion.div>

        {/* ---- Body ---- */}
        <div className="px-7 py-5 space-y-5">

          {/* Postup operace */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Activity className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Postup operace</h3>
              </div>
              <div className="flex gap-3 items-stretch">
                <motion.div 
                  className="flex-1 rounded-2xl p-4 border relative overflow-hidden"
                  style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}25`, backdropFilter: 'blur(20px)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  whileHover={{ scale: 1.02, borderColor: `${themeColor}40` }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} 
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }} 
                      />
                      <span className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: themeColor, backgroundColor: `${themeColor}15` }}>
                      Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}
                    >
                      <step.Icon className="w-5 h-5" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{step.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] text-white/30">{room.currentProcedure?.startTime || '--:--'}</span>
                        <span className="text-[10px] font-bold" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <motion.div 
                        className="w-9 h-9 rounded-full flex items-center justify-center border"
                        style={{ backgroundColor: `${nextColors.text}12`, borderColor: `${nextColors.text}25` }}
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <svg className="w-4 h-4" style={{ color: nextColors.text }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </div>
                    <motion.div
                      className="flex-1 rounded-2xl p-4 border"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.15)' }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white/15" />
                          <span className="text-[9px] font-black tracking-[0.12em] uppercase text-white/35">NASLEDUJICI</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-white/25 bg-white/[0.05]">
                          Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-white/[0.04] border-white/[0.08]">
                          <nextStep.Icon className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white/50">{nextStep.title}</p>
                          <p className="text-[10px] text-white/20 mt-1">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Prubeh vykonu */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Stethoscope className="w-4 h-4 text-white/30" />
              <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Prubeh vykonu</h3>
            </div>
            <div className="flex items-start gap-1">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <React.Fragment key={i}>
                    <motion.div 
                      className="flex flex-col items-center flex-1 min-w-0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                    >
                      <motion.div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-1.5 transition-all ${!isCurrent && !isCompleted ? 'opacity-30' : ''}`}
                        style={{
                          backgroundColor: isCurrent ? `${sc.text}20` : isCompleted ? `${sc.text}10` : 'rgba(255,255,255,0.03)',
                          borderColor: isCurrent ? `${sc.text}50` : isCompleted ? `${sc.text}20` : 'rgba(255,255,255,0.06)',
                          boxShadow: isCurrent ? `0 0 20px ${sc.glow}` : 'none',
                        }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        animate={isCurrent ? { y: [0, -3, 0] } : {}}
                        transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                      >
                        <ws.Icon className="w-4 h-4" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.2)' }} />
                      </motion.div>
                      <span className={`text-[7px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/80' : isCompleted ? 'text-white/40' : 'text-white/15'}`}>
                        {ws.title}
                      </span>
                      {isCurrent && (
                        <motion.span 
                          className="text-[7px] font-bold px-1.5 py-0.5 rounded-md mt-1" 
                          style={{ color: sc.text, backgroundColor: `${sc.text}15` }}
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          LIVE
                        </motion.span>
                      )}
                    </motion.div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="h-[2px] flex-shrink-0 rounded-full mt-4" style={{ width: 16, backgroundColor: i < stepIndex ? `${sc.text}40` : 'rgba(255,255,255,0.06)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Tym + Casy -- horizontal layout */}
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {/* Team - only anesteziolog + sestra */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Users className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Tym</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#2DD4BF', icon: Users },
                ].map((member, idx) => (
                  <motion.div 
                    key={member.label} 
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.03, borderColor: `${member.color}30` }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: `${member.color}0c`, borderColor: `${member.color}20` }}>
                      <member.icon className="w-3.5 h-3.5" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/25">{member.label}</p>
                      <p className={`text-[10px] font-bold truncate ${member.name ? 'text-white/60' : 'text-white/15 italic'}`}>{member.name || 'Neprirazeno'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <Clock className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/50">Casy</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ZACATEK', value: room.currentProcedure?.startTime || '--:--', color: 'text-white/70' },
                  { label: 'ODHAD', value: endTimeStr, color: isActive ? '' : 'text-white/30', highlight: isActive }
                ].map((time, idx) => (
                  <motion.div 
                    key={time.label}
                    className="rounded-xl border px-5 py-3 text-center min-w-[100px]"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05, borderColor: time.highlight ? `${themeColor}40` : 'rgba(255,255,255,0.15)' }}
                  >
                    <p className="text-[8px] font-black tracking-[0.12em] uppercase text-white/25 mb-1">{time.label}</p>
                    <p 
                      className={`text-2xl font-black font-mono tracking-wider ${time.color}`} 
                      style={time.highlight ? { color: themeColor, textShadow: `0 0 15px ${themeColor}30` } : {}}
                    >
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
/* Timeline Module                */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  /* --- Stats --- */
  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + 1 : acc, 0);
    const emergency = rooms.filter(r => r.isEmergency).length;
    const workingDoctors = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex < 6).length;
    const freeDoctors = rooms.filter(r => r.currentStepIndex >= 6 && r.staff?.doctor?.name).length;
    const workingNurses = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex < 6).length;
    const freeNurses = rooms.filter(r => r.currentStepIndex >= 6 && r.staff?.nurse?.name).length;
    return { operations, cleaning, free, completed, emergency, workingDoctors, freeDoctors, workingNurses, freeNurses };
  }, [rooms]);

  /* --- Sorted rooms --- */
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

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative bg-[#0a0b0f]">

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* ======== Top Stats Bar ======== */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D8C1]/10 border border-[#00D8C1]/20">
          <div className="w-2 h-2 rounded-full bg-[#00D8C1]" />
          <span className="text-xs font-mono font-black text-[#00D8C1]">{stats.operations}</span>
          <span className="text-[10px] font-bold text-[#00D8C1]/60">OPERACE</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-mono font-black text-amber-400">{stats.cleaning}</span>
          <span className="text-[10px] font-bold text-amber-400/60">UKLID</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-mono font-black text-blue-400">{stats.free}</span>
          <span className="text-[10px] font-bold text-blue-400/60">VOLNE</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-mono font-black text-emerald-400">{stats.completed}</span>
          <span className="text-[10px] font-bold text-emerald-400/60">DOKONCENO</span>
        </div>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Users className="w-3 h-3 text-white/30" />
          <span className="text-xs font-mono font-black text-white/50">{stats.workingDoctors}</span>
          <span className="text-[10px] font-bold text-white/30">LEKARI PRACUJI</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span className="text-xs font-mono font-black text-white/50">{stats.freeDoctors}</span>
          <span className="text-[10px] font-bold text-white/30">LEKARI VOLNI</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Users className="w-3 h-3 text-white/30" />
          <span className="text-xs font-mono font-black text-white/50">{stats.workingNurses}</span>
          <span className="text-[10px] font-bold text-white/30">SESTRY PRACUJI</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span className="text-xs font-mono font-black text-white/50">{stats.freeNurses}</span>
          <span className="text-[10px] font-bold text-white/30">SESTRY VOLNE</span>
        </div>
        {stats.emergency > 0 && (
          <>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-xs font-mono font-black text-red-400">{stats.emergency}</span>
              <span className="text-[10px] font-bold text-red-400/70">EMERGENCY</span>
            </div>
          </>
        )}
      </div>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden">
        
        {/* Time Axis Header */}
        <div className="flex flex-shrink-0 border-b border-white/[0.08] bg-[#0f1014]">
          <div className="flex-shrink-0 flex items-center px-4 gap-2.5 border-r border-white/[0.08]" style={{ width: ROOM_LABEL_WIDTH }}>
            <Activity className="w-4 h-4 text-[#00D8C1]/50" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white/40">OPERACNI SALY</span>
          </div>
          <div className="flex-1 flex items-center h-12 relative">
            {TIME_MARKERS.map((hour, i) => {
              const isLast = i === TIME_MARKERS.length - 1;
              const widthPct = 100 / HOURS_COUNT;
              const leftPct = i * widthPct;
              const isNight = hour >= 19 || hour < 7;
              const isCurrentHour = !isLast && (() => {
                const hFrom0 = hour * 60;
                const nextH = TIME_MARKERS[i + 1];
                const nFrom0 = nextH * 60;
                const nowMin = getMinutesFrom0(currentTime);
                return nowMin >= hFrom0 && nowMin < nFrom0;
              })();
              return (
                <div key={`h-${hour}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}>
                  <div className={`w-px h-full ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.05]'}`} />
                  {!isLast && !isCurrentHour && (
                    <span className={`ml-2.5 text-xs font-mono font-bold ${isNight ? 'text-white/[0.12]' : 'text-white/30'}`}>{hourLabel(hour)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Rows */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto">
          {/* Now indicator - tyrkysová bublina */}
          <AnimatePresence>
            {nowPercent >= 0 && nowPercent <= 100 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute top-0 bottom-0 z-40 pointer-events-none" 
                style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
              >
                <div className="absolute -left-6 top-0 bottom-0 w-12 bg-[#00D8C1] opacity-[0.08] blur-2xl" />
                <div className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#00D8C1]/60" />
                <div className="absolute -left-[30px] top-3 px-3 py-1.5 rounded-lg border border-[#00D8C1]/40 bg-[#00D8C1]/90 shadow-[0_0_20px_rgba(0,216,193,0.6)]">
                  <span className="text-xs font-mono font-black text-black tracking-wider">{timeStr}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shift boundaries - orange lines at 07:00 and 19:00 */}
          {[7, 19].map(hour => {
            const percent = (hour * 60 / (HOURS_COUNT * 60)) * 100;
            return (
              <div key={`shift-${hour}`} className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${percent / 100})` }}>
                <div className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#FF9500]/50" />
              </div>
            );
          })}

          {/* Rows */}
          {sortedRooms.map((room, roomIndex) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
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

            /* Emergency row */
            if (room.isEmergency) {
              return (
                <div
                  key={room.id}
                  className="flex items-stretch h-14 border-b border-red-500/10 cursor-pointer hover:bg-red-500/[0.02] transition-colors"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-red-500/15 bg-red-500/[0.08]" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <motion.div className="absolute inset-0 rounded-full border-2 border-red-500/40" animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-400 leading-tight">EMERGENCY</p>
                      <p className="text-[9px] font-medium text-red-400/40 truncate">{room.name}</p>
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                    ))}
                    <div className="absolute inset-y-2 left-0 right-0 rounded-lg flex items-center justify-center overflow-hidden bg-red-500/15 border border-red-500/25">
                      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,59,48,1) 10px, rgba(255,59,48,1) 11px)' }} />
                      <span className="text-lg font-black tracking-[0.5em] text-white/50 uppercase select-none relative z-10">E M E R G E N C Y</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* Locked row */
            if (room.isLocked) {
              return (
                <div
                  key={room.id}
                  className="flex items-stretch h-14 border-b border-amber-500/10 cursor-pointer hover:bg-amber-500/[0.02] transition-colors"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-amber-500/15 bg-amber-500/[0.05]" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-amber-400 leading-tight">UZAMCENO</p>
                      <p className="text-[9px] font-medium text-amber-400/40 truncate">{room.name}</p>
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                    ))}
                    <div className="absolute inset-y-2 left-0 right-0 rounded-lg flex items-center justify-center gap-3 overflow-hidden bg-amber-500/[0.08] border border-amber-500/15">
                      <Lock className="w-4 h-4 text-amber-400/30" />
                      <span className="text-base font-black tracking-[0.4em] text-amber-400/30 uppercase select-none">UZAMCENO</span>
                      <Lock className="w-4 h-4 text-amber-400/30" />
                    </div>
                  </div>
                </div>
              );
            }

            /* Active / Free row */
            return (
              <div
                key={room.id}
                className="flex items-stretch h-14 border-b border-white/[0.04] group hover:bg-white/[0.01] transition-colors cursor-pointer"
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-white/[0.06] bg-[#0f1014] group-hover:bg-white/[0.01] transition-colors" style={{ width: ROOM_LABEL_WIDTH }}>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Status icons - zelené/oranžové kroužky jako na obrázku */}
                    {room.staff?.doctor?.name && isActive && (
                      <div className="w-5 h-5 rounded-full bg-[#34C759]/20 border-2 border-[#34C759] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                      </div>
                    )}
                    {room.staff?.nurse?.name && isActive && (
                      <div className="w-5 h-5 rounded-full bg-[#FF9500]/20 border-2 border-[#FF9500] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#FF9500]" />
                      </div>
                    )}
                    {isFree && (
                      <div className="w-5 h-5 rounded-full bg-white/[0.05] border-2 border-white/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white/80 leading-tight truncate">{room.name}</p>
                    <p className="text-[9px] font-medium text-white/25 truncate">{isFree ? 'Volný' : room.department}</p>
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {TIME_MARKERS.slice(0, -1).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.02]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                  ))}
                  {isActive && boxWidthPct > 0 && (
                    <div 
                      className="absolute inset-y-2 rounded-lg overflow-hidden border group-hover:scale-[1.01] transition-transform"
                      style={{ 
                        left: `${boxLeftPct}%`, 
                        width: `${boxWidthPct}%`,
                        backgroundColor: `${colors.text}20`,
                        borderColor: `${colors.text}40`
                      }}
                    >
                      {/* Diagonal stripe pattern */}
                      <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, ${colors.text} 8px, ${colors.text} 9px)` }} />
                      <div className="absolute inset-0 flex items-center px-3 gap-2">
                        <span className="text-[10px] font-bold truncate" style={{ color: colors.text }}>{room.currentProcedure?.name || 'Operace'}</span>
                        {room.currentProcedure?.startTime && (
                          <span className="text-[9px] font-mono font-medium ml-auto flex-shrink-0" style={{ color: `${colors.text}80` }}>
                            {room.currentProcedure.startTime}
                          </span>
                        )}
                      </div>
                    </div>
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

export default TimelineModule;
