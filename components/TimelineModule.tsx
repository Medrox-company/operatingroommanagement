import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 240; /* Room label width */
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

/* --- Step colors matching WORKFLOW_STEPS status colors from constants.ts --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string }> = {
  0: { bg: 'rgba(45,212,191,0.25)', fill: 'rgba(45,212,191,0.50)', border: 'rgba(45,212,191,0.35)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.45)', solid: '#2DD4BF' },      // Příjezd na sál
  1: { bg: 'rgba(167,139,250,0.25)', fill: 'rgba(167,139,250,0.50)', border: 'rgba(167,139,250,0.35)', text: '#A78BFA', glow: 'rgba(167,139,250,0.45)', solid: '#A78BFA' },  // Začátek anestezie
  2: { bg: 'rgba(255,59,48,0.25)', fill: 'rgba(255,59,48,0.50)', border: 'rgba(255,59,48,0.35)', text: '#FF3B30', glow: 'rgba(255,59,48,0.45)', solid: '#FF3B30' },          // Chirurgický výkon
  3: { bg: 'rgba(251,191,36,0.25)', fill: 'rgba(251,191,36,0.50)', border: 'rgba(251,191,36,0.35)', text: '#FBBF24', glow: 'rgba(251,191,36,0.45)', solid: '#FBBF24' },      // Ukončení výkonu
  4: { bg: 'rgba(129,140,248,0.25)', fill: 'rgba(129,140,248,0.50)', border: 'rgba(129,140,248,0.35)', text: '#818CF8', glow: 'rgba(129,140,248,0.45)', solid: '#818CF8' },  // Ukončení anestezie
  5: { bg: 'rgba(217,70,239,0.25)', fill: 'rgba(217,70,239,0.50)', border: 'rgba(217,70,239,0.35)', text: '#D946EF', glow: 'rgba(217,70,239,0.45)', solid: '#D946EF' },      // Úklid sálu
  6: { bg: 'rgba(249,115,22,0.25)', fill: 'rgba(249,115,22,0.50)', border: 'rgba(249,115,22,0.35)', text: '#F97316', glow: 'rgba(249,115,22,0.45)', solid: '#F97316' },      // Sál připraven
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
                      <span className={`text-[7px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/80' : isCompleted ? 'text-white/35' : 'text-white/15'}`}>
                        {ws.title}
                      </span>
                      {isCurrent && (
                        <motion.span 
                          className="text-[7px] font-bold px-1.5 py-0.5 rounded-md mt-1" 
                          style={{ color: sc.text, backgroundColor: `${sc.text}18`, boxShadow: `0 0 10px ${sc.glow}` }}
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          LIVE
                        </motion.span>
                      )}
                    </motion.div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <motion.div 
                        className="h-[2px] flex-shrink-0 rounded-full mt-4" 
                        style={{ width: 12, backgroundColor: i < stepIndex ? `${sc.text}40` : 'rgba(255,255,255,0.05)' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Tym + Casy */}
          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {/* Team */}
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
                    className="flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.03, borderColor: `${member.color}30`, background: `${member.color}05` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: `${member.color}10`, borderColor: `${member.color}25` }}>
                      <member.icon className="w-4 h-4" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black tracking-[0.12em] uppercase text-white/30">{member.label}</p>
                      <p className={`text-xs font-bold truncate ${member.name ? 'text-white/70' : 'text-white/20 italic'}`}>
                        {member.name || 'Neprirazeno'}
                      </p>
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
  const currentSec = currentTime.getSeconds();
  const timeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;
  const shortTimeStr = `${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`;

  /* --- Stats --- */
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

  const shiftEndPercent = (SHIFT_END_OFFSET * 60 / (HOURS_COUNT * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* ======== Header ======== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-8 md:pl-32 md:pr-10 pt-10 pb-6 flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <CalendarDays className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
          </div>
          <div className="flex items-baseline gap-8">
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">TIMELINE</h1>
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold tracking-tight text-white/40">
                {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
              </span>
              <span className="text-4xl font-mono font-black tracking-tight text-white/70">{timeStr}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-6 pb-2 overflow-hidden">
        <div 
          className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-3xl border shadow-2xl"
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset'
          }}
        >

          {/* Time Axis Header */}
          <div 
            className="flex flex-shrink-0 border-b"
            style={{ borderColor: 'rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.25)' }}
          >
            <div 
              className="flex-shrink-0 flex items-center px-5 gap-3 border-r" 
              style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255, 255, 255, 0.06)' }}
            >
              <Stethoscope className="w-4 h-4 text-[#00D8C1]/50" />
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-white/40">OPERACNI SALY</span>
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
                        <div 
                          className="ml-2.5 px-3 py-1.5 rounded-xl border"
                          style={{ 
                            background: 'rgba(0,216,193,0.15)', 
                            borderColor: 'rgba(0,216,193,0.3)',
                            boxShadow: '0 0 20px rgba(0,216,193,0.3)'
                          }}
                        >
                          <span className="text-[11px] font-mono font-black text-[#00D8C1] tracking-wider">{shortTimeStr}</span>
                        </div>
                      ) : (
                        <span className={`ml-2.5 text-[11px] font-mono font-medium ${isNight ? 'text-white/20' : 'text-white/40'}`}>{hourLabel(hour)}</span>
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
            {/* Now indicator */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}>
                  <div className="absolute -left-6 top-0 bottom-0 w-12 bg-[#00D8C1] opacity-[0.08] blur-2xl" />
                  <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1 0%, #00D8C190 50%, #00D8C150 100%)' }} />
                  <div className="absolute -left-[6px] -top-[2px] w-[14px] h-[14px] rounded-full bg-[#00D8C1] shadow-[0_0_12px_#00D8C1,0_0_30px_rgba(0,216,193,0.6)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shift boundary 19:00 */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})` }}>
              <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 5px, transparent 5px, transparent 10px)' }} />
            </div>

            {/* Night zone overlay */}
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0, background: 'rgba(10, 10, 30, 0.35)' }} />

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

              /* Emergency row */
              if (room.isEmergency) {
                return (
                  <div
                    key={room.id}
                    className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer transition-all hover:bg-red-500/5"
                    style={{ borderColor: 'rgba(255, 59, 48, 0.2)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-4 px-5 border-r" 
                      style={{ width: ROOM_LABEL_WIDTH, background: 'rgba(0,0,0,0.15)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="flex-shrink-0">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{ background: 'rgba(255,59,48,0.15)', borderColor: 'rgba(255,59,48,0.3)' }}
                        >
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold tracking-tight uppercase text-white/50 leading-tight">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      <div 
                        className="absolute inset-y-[4px] left-[4px] right-[4px] rounded-xl flex items-center justify-center overflow-hidden"
                        style={{ background: '#DC2626', boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)' }}
                      >
                        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }} />
                        <span className="text-xl font-black tracking-[0.5em] text-white uppercase select-none relative z-10 drop-shadow-lg">EMERGENCY</span>
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
                    className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer transition-all hover:bg-amber-500/5"
                    style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-4 px-5 border-r" 
                      style={{ width: ROOM_LABEL_WIDTH, background: 'rgba(0,0,0,0.15)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="flex-shrink-0">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{ background: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)' }}
                        >
                          <Lock className="w-4 h-4 text-amber-400" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold tracking-tight uppercase text-white/50 leading-tight">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      <div 
                        className="absolute inset-y-[4px] left-[4px] right-[4px] rounded-xl flex items-center justify-center gap-3 overflow-hidden"
                        style={{ background: '#D97706', boxShadow: '0 4px 20px rgba(217, 119, 6, 0.4)' }}
                      >
                        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }} />
                        <span className="text-xl font-black tracking-[0.5em] text-white uppercase select-none relative z-10 drop-shadow-lg">UZAMCENO</span>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Active / Free row */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: roomIndex * 0.015, duration: 0.3 }}
                  className="flex items-stretch flex-1 min-h-0 border-b group transition-all duration-200 cursor-pointer"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div 
                    className="flex-shrink-0 flex items-center gap-4 px-5 border-r group-hover:bg-white/[0.02] transition-colors" 
                    style={{ 
                      width: ROOM_LABEL_WIDTH, 
                      background: 'rgba(0,0,0,0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div className="flex-shrink-0">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center border transition-all" 
                        style={{ 
                          backgroundColor: isActive ? `${colors.text}15` : 'rgba(255,255,255,0.03)', 
                          borderColor: isActive ? `${colors.text}30` : 'rgba(255,255,255,0.08)'
                        }}
                      >
                        {isActive ? <Activity className="w-3.5 h-3.5" style={{ color: colors.text }} /> : <div className="w-2 h-2 rounded-full bg-white/15" />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tracking-tight uppercase truncate leading-tight text-white/50">
                        {room.name}
                      </p>
                      {isFree ? (
                        <p className="text-[10px] font-medium text-white/25 truncate">Volny</p>
                      ) : (
                        <p className="text-[10px] font-medium truncate text-white/30">{room.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden group-hover:bg-white/[0.01] transition-colors">
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`} style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />;
                    })}

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: roomIndex * 0.02, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[4px] bottom-[4px] overflow-hidden border"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`, 
                          transformOrigin: 'left center',
                          borderRadius: '12px',
                          borderColor: `${colors.text}40`,
                          boxShadow: `0 0 0 1px ${colors.text}20 inset`
                        }}
                      >
                        {/* Background - transparent with solid border color */}
                        <div 
                          className="absolute inset-0" 
                          style={{ 
                            background: `${colors.solid}25`,
                            borderRadius: '11px',
                          }} 
                        />

                        {/* Crosshatch pattern */}
                        <div
                          className="absolute inset-0"
                          style={{
                            borderRadius: '11px',
                            backgroundImage: `repeating-linear-gradient(45deg, ${colors.solid}18 0px, ${colors.solid}18 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, ${colors.solid}18 0px, ${colors.solid}18 1px, transparent 1px, transparent 8px)`,
                          }}
                        />
                        
                        {/* Animated progress fill */}
                        <motion.div 
                          className="absolute inset-0" 
                          initial={{ clipPath: 'inset(0 100% 0 0 round 11px)' }} 
                          animate={{ clipPath: `inset(0 ${100 - progressPct}% 0 0 round 11px)` }} 
                          transition={{ duration: 1.2, ease: [0.45, 0, 0.15, 1] }} 
                          style={{ 
                            background: `${colors.solid}60`,
                            borderRadius: '11px',
                          }} 
                        />
                        
                        {/* Content overlay */}
                        <div className="relative flex items-center h-full px-4 gap-3 z-10">
                          <span 
                            className="text-[11px] font-bold tracking-tight truncate"
                            style={{ 
                              color: progressPct > 30 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
                              textShadow: `0 1px 2px rgba(0,0,0,0.3)`
                            }}
                          >
                            {step.title}
                          </span>
                          {room.currentPatient && boxWidthPct > 8 && (
                            <>
                              <div className="w-px h-4 flex-shrink-0 bg-white/20" />
                              <span className="text-[10px] font-medium truncate text-white/70">
                                {room.currentPatient.name}
                              </span>
                            </>
                          )}
                          {boxWidthPct > 12 && (
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0 bg-black/20 rounded-lg px-2.5 py-1">
                              <span className="text-[10px] font-mono font-medium text-white/60">
                                {room.currentProcedure?.startTime}
                              </span>
                              <span className="text-[8px] text-white/30">-</span>
                              <span className="text-[10px] font-mono font-semibold text-white/90">
                                {room.estimatedEndTime
                                  ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                  : room.currentProcedure?.estimatedDuration
                                    ? new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                    : ''
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {isFree && (
                      <div 
                        className="absolute inset-y-[4px] left-[4px] right-[4px] rounded-xl flex items-center justify-center" 
                        style={{ border: '1px dashed rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
                      >
                        <span className="text-[10px] font-bold tracking-[0.3em] text-white/10 uppercase select-none">VOLNY</span>
                      </div>
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
};

export default TimelineModule;
