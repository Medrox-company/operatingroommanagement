import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, User, SprayCan, Check, CheckCircle2 } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 220;
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

/* --- Step colors with vibrant gradients inspired by design images --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; gradient: string }> = {
  0: { bg: 'rgba(147,51,234,0.15)', fill: 'rgba(147,51,234,0.35)', border: 'rgba(147,51,234,0.45)', text: '#9333EA', glow: 'rgba(147,51,234,0.2)', gradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)' },
  1: { bg: 'rgba(6,182,212,0.15)', fill: 'rgba(6,182,212,0.35)', border: 'rgba(6,182,212,0.45)', text: '#06B6D4', glow: 'rgba(6,182,212,0.2)', gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)' },
  2: { bg: 'rgba(59,130,246,0.15)', fill: 'rgba(59,130,246,0.35)', border: 'rgba(59,130,246,0.45)', text: '#3B82F6', glow: 'rgba(59,130,246,0.2)', gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' },
  3: { bg: 'rgba(251,146,60,0.15)', fill: 'rgba(251,146,60,0.35)', border: 'rgba(251,146,60,0.45)', text: '#FB923C', glow: 'rgba(251,146,60,0.2)', gradient: 'linear-gradient(135deg, #FB923C 0%, #FDBA74 100%)' },
  4: { bg: 'rgba(129,140,248,0.15)', fill: 'rgba(129,140,248,0.35)', border: 'rgba(129,140,248,0.45)', text: '#818CF8', glow: 'rgba(129,140,248,0.2)', gradient: 'linear-gradient(135deg, #818CF8 0%, #A5B4FC 100%)' },
  5: { bg: 'rgba(168,85,247,0.15)', fill: 'rgba(168,85,247,0.35)', border: 'rgba(168,85,247,0.45)', text: '#A855F7', glow: 'rgba(168,85,247,0.2)', gradient: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)' },
  6: { bg: 'rgba(34,197,94,0.08)', fill: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.20)', text: '#22C55E', glow: 'rgba(34,197,94,0.12)', gradient: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)' },
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
      <motion.div 
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl" 
        onClick={onClose}
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: 'blur(32px)' }}
        exit={{ backdropFilter: 'blur(0px)' }}
      />

      <motion.div
        className="relative w-full max-w-[900px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 100px ${themeColor}20`
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className="absolute top-0 left-0 right-0 h-[2px]" 
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
            filter: `drop-shadow(0 0 10px ${themeColor})`
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

        <motion.div 
          className="flex items-center justify-between px-7 py-5 border-b relative"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.25)' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center gap-5">
            <motion.div 
              className="relative w-16 h-16 flex-shrink-0"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring', bounce: 0.4 }}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <motion.circle 
                  cx="32" cy="32" r="26" fill="none"
                  stroke={themeColor}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 26}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 26 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 8px ${themeColor}80)` }}
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
                    className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider border" 
                    style={{ color: themeColor, borderColor: `${themeColor}50`, background: `${themeColor}20` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {step.title}
                  </motion.span>
                )}
                {room.isEmergency && (
                  <motion.span 
                    className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-red-500/25 text-red-400 border border-red-500/50"
                    animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 25px rgba(239,68,68,0.5)', '0 0 0 rgba(239,68,68,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    EMERGENCY
                  </motion.span>
                )}
                {room.isLocked && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/25 text-amber-400 border border-amber-500/50">UZAMCENO</span>
                )}
              </div>
              <p className="text-xs font-medium text-white/35 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
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
                <p className="text-[8px] font-bold text-white/30 tracking-[0.15em] uppercase mb-1">DOBA OPERACE</p>
                <motion.p 
                  className="text-2xl font-black font-mono tracking-widest" 
                  style={{ color: themeColor, textShadow: `0 0 25px ${themeColor}50` }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {elapsedStr}
                </motion.p>
              </motion.div>
            )}
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
              style={{ 
                background: 'rgba(255, 255, 255, 0.06)', 
                borderColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)'
              }}
              whileHover={{ 
                scale: 1.05, 
                background: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <X className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>
        </motion.div>

        <div className="px-7 py-5 space-y-5">
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Activity className="w-4 h-4 text-white/35" />
                <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/55">Postup operace</h3>
              </div>
              <div className="flex gap-3 items-stretch">
                <motion.div 
                  className="flex-1 rounded-2xl p-4 border relative overflow-hidden"
                  style={{ background: `${themeColor}15`, borderColor: `${themeColor}35`, backdropFilter: 'blur(20px)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  whileHover={{ scale: 1.02, borderColor: `${themeColor}50` }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }} 
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }} 
                      />
                      <span className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ color: themeColor, background: `${themeColor}20` }}>
                      Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border"
                      style={{ background: `${themeColor}20`, borderColor: `${themeColor}40` }}
                    >
                      <step.Icon className="w-5 h-5" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{step.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/25" />
                        <span className="text-[10px] text-white/35">{room.currentProcedure?.startTime || '--:--'}</span>
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
                        style={{ background: `${nextColors.text}15`, borderColor: `${nextColors.text}30` }}
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
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.18)' }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white/20" />
                          <span className="text-[9px] font-black tracking-[0.12em] uppercase text-white/40">NASLEDUJICI</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-white/30 bg-white/[0.06]">
                          Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-white/[0.05] border-white/[0.1]">
                          <nextStep.Icon className="w-5 h-5 text-white/35" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white/55">{nextStep.title}</p>
                          <p className="text-[10px] text-white/25 mt-1">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Stethoscope className="w-4 h-4 text-white/35" />
              <h3 className="text-[10px] font-black tracking-[0.15em] uppercase text-white/55">Prubeh vykonu</h3>
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
                          background: isCurrent ? `${sc.text}25` : isCompleted ? `${sc.text}12` : 'rgba(255,255,255,0.04)',
                          borderColor: isCurrent ? `${sc.text}60` : isCompleted ? `${sc.text}25` : 'rgba(255,255,255,0.08)',
                          boxShadow: isCurrent ? `0 0 25px ${sc.glow}` : 'none',
                        }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        animate={isCurrent ? { y: [0, -3, 0] } : {}}
                        transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                      >
                        <ws.Icon className="w-4 h-4" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.25)' }} />
                      </motion.div>
                      <span className={`text-[7px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/75' : isCompleted ? 'text-white/35' : 'text-white/12'}`}>{ws.title}</span>
                      {isCurrent && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded mt-1" style={{ color: sc.text, background: `${sc.text}20` }}>LIVE</span>}
                    </motion.div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="h-[1.5px] flex-shrink-0 rounded-full mt-4" style={{ width: 10, backgroundColor: i < stepIndex ? `${sc.text}40` : 'rgba(255,255,255,0.06)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-white/35" />
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/55">Tym</h3>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A855F7', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#06B6D4', icon: Users },
                ].map((member) => (
                  <motion.div 
                    key={member.label} 
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                    whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0" style={{ background: `${member.color}15`, borderColor: `${member.color}30` }}>
                      <member.icon className="w-3.5 h-3.5" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/30">{member.label}</p>
                      <p className={`text-[10px] font-bold truncate ${member.name ? 'text-white/65' : 'text-white/18 italic'}`}>{member.name || 'Neprirazeno'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-white/35" />
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/55">Casy</h3>
              </div>
              <div className="flex gap-2">
                <motion.div 
                  className="rounded-xl border px-4 py-2.5 text-center min-w-[80px]"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/25 mb-0.5">ZACATEK</p>
                  <p className="text-lg font-black font-mono tracking-wider text-white/75">{room.currentProcedure?.startTime || '--:--'}</p>
                </motion.div>
                <motion.div 
                  className="rounded-xl border px-4 py-2.5 text-center min-w-[80px]"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/25 mb-0.5">ODHAD</p>
                  <p className="text-lg font-black font-mono tracking-wider" style={{ color: isActive ? themeColor : 'rgba(255,255,255,0.3)' }}>{endTimeStr}</p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================== */
/* Main Timeline Component        */
/* ============================== */
const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimePercent = getTimePercent(currentTime);

  const stats = useMemo(() => {
    const operations = rooms.filter(r => r.currentStepIndex < 6 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5).length;
    const free = rooms.filter(r => r.currentStepIndex === 6).length;
    const completed = rooms.reduce((sum, r) => sum + r.operations24h, 0);
    const doctors = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex < 6).length;
    const nurses = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex < 6).length;
    const emergency = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, doctors, nurses, emergency };
  }, [rooms]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AnimatePresence>{selectedRoom && <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />}</AnimatePresence>

      {/* Top Stats Bar */}
      <motion.div 
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'rgba(0, 0, 0, 0.3)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/40" />
          <h2 className="text-sm font-black tracking-[0.15em] uppercase text-white/60">OPERACNI SALY</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#9333EA', icon: Activity },
            { label: 'UKLID', value: stats.cleaning, color: '#FB923C', icon: SprayCan },
            { label: 'VOLNE', value: stats.free, color: '#22C55E', icon: Check },
            { label: 'DOKONCENO', value: stats.completed, color: '#818CF8', icon: CheckCircle2 },
            { label: 'LEKARI', value: stats.doctors, color: '#A855F7', icon: User },
            { label: 'SESTRY', value: stats.nurses, color: '#06B6D4', icon: Users },
            ...(stats.emergency > 0 ? [{ label: 'EMERGENCY', value: stats.emergency, color: '#FF3B30', icon: AlertTriangle, highlight: true }] : []),
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider border ${
                s.highlight ? 'bg-red-500/20 border-red-500/40' : 'bg-white/[0.04] border-white/[0.08]'
              }`}
              style={{ backdropFilter: 'blur(10px)' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.05, background: s.highlight ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)' }}
            >
              <s.icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
              <span className="uppercase" style={{ color: s.highlight ? '#FF3B30' : 'rgba(255,255,255,0.6)' }}>{s.label}</span>
              <span className="font-black" style={{ color: s.color }}>{s.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Time header */}
        <div className="flex-shrink-0 flex items-stretch border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <div className="flex-shrink-0 flex items-center justify-center px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'rgba(0, 0, 0, 0.25)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <CalendarDays className="w-4 h-4 text-white/30 mr-2" />
            <span className="text-xs font-black tracking-widest uppercase text-white/50">TIMELINE</span>
          </div>
          <div className="relative flex-1" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            {TIME_MARKERS.slice(0, -1).map((hour, i) => (
              <div key={i} className="absolute top-0 bottom-0 flex flex-col items-center justify-center" style={{ left: `${(i / HOURS_COUNT) * 100}%`, transform: 'translateX(-50%)' }}>
                <span className="text-[11px] font-bold font-mono tracking-wider text-white/50">{hourLabel(hour)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline rows */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
          <div className="flex flex-col">
            {rooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
              const isActive = stepIndex < 6;
              const isFree = stepIndex === 6;

              let boxLeftPct = 0;
              let boxWidthPct = 0;
              let progressPct = 0;
              const startDate = new Date();

              if (room.currentProcedure?.startTime && isActive) {
                const [startHour, startMin] = room.currentProcedure.startTime.split(':').map(Number);
                startDate.setHours(startHour, startMin, 0, 0);
                const startMinFrom7 = getMinutesFrom7(startDate);
                const duration = room.currentProcedure.estimatedDuration || 60;
                boxLeftPct = (startMinFrom7 / (HOURS_COUNT * 60)) * 100;
                boxWidthPct = (duration / (HOURS_COUNT * 60)) * 100;
                progressPct = room.currentProcedure.progress || 0;
              }

              if (room.isEmergency) {
                return (
                  <motion.div
                    key={room.id}
                    className="flex items-stretch flex-1 min-h-[50px] border-b cursor-pointer"
                    style={{ borderColor: 'rgba(255,59,48,0.15)' }}
                    onClick={() => setSelectedRoom(room)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                    whileHover={{ background: 'rgba(255,59,48,0.05)' }}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.20) 0%, rgba(255,59,48,0.10) 100%)', borderColor: 'rgba(255,59,48,0.2)' }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ background: 'rgba(255,59,48,0.3)', borderColor: 'rgba(255,59,48,0.5)' }}>
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-full border-2 border-red-500/60" animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[10px] font-medium text-red-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.06]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.30) 0%, rgba(255,59,48,0.18) 50%, rgba(255,59,48,0.30) 100%)', border: '2px solid rgba(255,59,48,0.25)' }}>
                        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,59,48,1) 10px, rgba(255,59,48,1) 11px), repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,59,48,1) 10px, rgba(255,59,48,1) 11px)' }} />
                        <span className="text-lg font-black tracking-[0.5em] text-white/70 uppercase select-none relative z-10">E M E R G E N C Y</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              if (room.isLocked) {
                return (
                  <motion.div
                    key={room.id}
                    className="flex items-stretch flex-1 min-h-[50px] border-b cursor-pointer"
                    style={{ borderColor: 'rgba(251,191,36,0.12)' }}
                    onClick={() => setSelectedRoom(room)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                    whileHover={{ background: 'rgba(251,191,36,0.04)' }}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.06) 100%)', borderColor: 'rgba(251,191,36,0.18)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ background: 'rgba(251,191,36,0.2)', borderColor: 'rgba(251,191,36,0.3)' }}>
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-[10px] font-medium text-amber-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.05]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center gap-3 overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.06) 50%, rgba(251,191,36,0.12) 100%)', border: '1px solid rgba(251,191,36,0.15)' }}>
                        <Lock className="w-4 h-4 text-amber-400/35" />
                        <span className="text-base font-black tracking-[0.35em] text-amber-400/50 uppercase select-none">UZAMCENO</span>
                        <Lock className="w-4 h-4 text-amber-400/35" />
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
                  transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                  className="flex items-stretch flex-1 min-h-[50px] border-b group cursor-pointer"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => setSelectedRoom(room)}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r transition-colors" style={{ width: ROOM_LABEL_WIDTH, background: 'rgba(0, 0, 0, 0.25)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    {/* Team avatars inspired by design images */}
                    <div className="flex gap-1.5">
                      <motion.div 
                        className="w-3.5 h-3.5 rounded-full border-2"
                        style={{ 
                          background: room.staff?.doctor?.name && isActive ? colors.gradient : 'rgba(255,255,255,0.08)', 
                          borderColor: room.staff?.doctor?.name && isActive ? colors.text : 'rgba(255,255,255,0.15)'
                        }}
                        whileHover={{ scale: 1.2 }}
                        animate={room.staff?.doctor?.name && isActive ? { boxShadow: [`0 0 0 ${colors.text}00`, `0 0 10px ${colors.text}60`, `0 0 0 ${colors.text}00`] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div 
                        className="w-3.5 h-3.5 rounded-full border-2"
                        style={{ 
                          background: room.staff?.nurse?.name && isActive ? '#06B6D4' : 'rgba(255,255,255,0.08)', 
                          borderColor: room.staff?.nurse?.name && isActive ? '#06B6D4' : 'rgba(255,255,255,0.15)'
                        }}
                        whileHover={{ scale: 1.2 }}
                        animate={room.staff?.nurse?.name && isActive ? { boxShadow: ['0 0 0 #06B6D400', '0 0 10px #06B6D460', '0 0 0 #06B6D400'] } : {}}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-bold tracking-tight uppercase truncate leading-tight ${isActive ? 'text-white/90' : 'text-white/50'}`}>{room.name}</p>
                      {isFree ? (
                        <p className="text-[10px] font-medium text-white/30 truncate">Volny</p>
                      ) : (
                        <p className="text-[10px] font-medium truncate" style={{ color: `${colors.text}80` }}>{room.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`} style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />;
                    })}

                    {/* Shift markers */}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-cyan-400/20" style={{ left: `${((0) / HOURS_COUNT) * 100}%` }} />
                    <div className="absolute top-0 bottom-0 w-[2px] bg-orange-400/20" style={{ left: `${((12) / HOURS_COUNT) * 100}%` }} />

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.9 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, delay: roomIndex * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[3px] bottom-[3px] rounded-xl overflow-hidden"
                        style={{ left: `${Math.max(0, boxLeftPct)}%`, width: `${boxWidthPct}%`, transformOrigin: 'left center' }}
                        whileHover={{ scale: 1.02, y: -1 }}
                      >
                        <div className="absolute inset-0 rounded-xl" style={{ background: colors.gradient, border: `2px solid ${colors.border}`, boxShadow: `0 0 25px ${colors.glow}, 0 0 0 1px ${colors.text}20 inset` }} />
                        <motion.div 
                          className="absolute top-0 bottom-0 left-0 rounded-l-xl" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${progressPct}%` }} 
                          transition={{ duration: 1.5, ease: 'easeOut' }} 
                          style={{ background: `linear-gradient(90deg, ${colors.fill}, ${colors.bg})` }} 
                        />
                        {/* Enhanced diagonal stripe pattern */}
                        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${colors.text} 10px, ${colors.text} 11px), repeating-linear-gradient(-45deg, transparent, transparent 10px, ${colors.text} 10px, ${colors.text} 11px)` }} />
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl" style={{ background: colors.text, boxShadow: `0 0 10px ${colors.text}80` }} />
                        <div className="relative flex items-center h-full px-4 gap-2.5 z-10">
                          <span className="text-[11px] font-bold uppercase tracking-wide truncate" style={{ color: colors.text }}>{step.title}</span>
                          {room.currentPatient && boxWidthPct > 8 && (
                            <>
                              <div className="w-px h-4 flex-shrink-0" style={{ background: `${colors.text}30` }} />
                              <span className="text-[10px] text-white/40 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                          {boxWidthPct > 10 && (
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] font-mono font-medium text-white/30">{room.currentProcedure?.startTime}</span>
                              <span className="text-[8px] text-white/20">-</span>
                              <span className="text-[10px] font-mono font-bold" style={{ color: `${colors.text}` }}>
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
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-xl flex items-center justify-center" style={{ border: '2px dashed rgba(255,255,255,0.1)' }}>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-white/15 uppercase select-none">V O L N Y</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Current time indicator */}
          <motion.div
            className="fixed top-0 bottom-0 w-[3px] rounded-full pointer-events-none z-50"
            style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${currentTimePercent / 100})`, background: 'linear-gradient(180deg, #06B6D4 0%, #22D3EE 100%)', boxShadow: '0 0 20px #06B6D4, 0 0 40px #06B6D480' }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[9px] font-black text-white whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', boxShadow: '0 4px 20px #06B6D440' }}>
              {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
