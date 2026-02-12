import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 230;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const HOURS_COUNT = 24;
const SHIFT_START_HOUR = 7;
const SHIFT_END_HOUR = 19;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePercent = (date: Date) => (getMinutesFrom7(date) / (HOURS_COUNT * 60)) * 100;

const hourLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

/* --- Premium vibrant colors with glow --- */
const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string }> = {
  0: { bg: 'rgba(139,92,246,0.20)', fill: 'rgba(139,92,246,0.45)', border: 'rgba(139,92,246,0.55)', text: '#A78BFA', glow: 'rgba(139,92,246,0.25)' },
  1: { bg: 'rgba(20,184,166,0.20)', fill: 'rgba(20,184,166,0.45)', border: 'rgba(20,184,166,0.55)', text: '#14B8A6', glow: 'rgba(20,184,166,0.25)' },
  2: { bg: 'rgba(59,130,246,0.20)', fill: 'rgba(59,130,246,0.45)', border: 'rgba(59,130,246,0.55)', text: '#3B82F6', glow: 'rgba(59,130,246,0.25)' },
  3: { bg: 'rgba(251,146,60,0.20)', fill: 'rgba(251,146,60,0.45)', border: 'rgba(251,146,60,0.55)', text: '#FB923C', glow: 'rgba(251,146,60,0.25)' },
  4: { bg: 'rgba(129,140,248,0.20)', fill: 'rgba(129,140,248,0.45)', border: 'rgba(129,140,248,0.55)', text: '#818CF8', glow: 'rgba(129,140,248,0.25)' },
  5: { bg: 'rgba(236,72,153,0.20)', fill: 'rgba(236,72,153,0.45)', border: 'rgba(236,72,153,0.55)', text: '#EC4899', glow: 'rgba(236,72,153,0.25)' },
  6: { bg: 'rgba(16,185,129,0.12)', fill: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.35)', text: '#10B981', glow: 'rgba(16,185,129,0.15)' },
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
  const themeColor = room.isEmergency ? '#FF453A' : room.isLocked ? '#FFD60A' : colors.text;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-[920px] rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
          backdropFilter: 'blur(60px) saturate(200%)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.2) inset, 0 0 100px ${themeColor}20`
        }}
        initial={{ scale: 0.88, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 25, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated glow accent */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`, filter: `drop-shadow(0 0 12px ${themeColor})` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }} />

        {/* Header */}
        <motion.div className="flex items-center justify-between px-8 py-6 border-b relative" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.25)' }} initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-6">
            {/* Progress ring */}
            <motion.div className="relative w-20 h-20 flex-shrink-0" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', bounce: 0.35 }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: themeColor, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: themeColor, stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                <motion.circle cx="40" cy="40" r="32" fill="none" stroke="url(#progressGradient)" strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 32}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 32 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.35, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ filter: `drop-shadow(0 0 8px ${themeColor}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black text-white">{progress}%</span>
              </div>
            </motion.div>
            
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-3xl font-black tracking-tight text-white">{room.name}</h2>
                {isActive && <span className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border" style={{ color: themeColor, borderColor: `${themeColor}50`, backgroundColor: `${themeColor}20`, boxShadow: `0 0 16px ${themeColor}30` }}>{step.title}</span>}
                {room.isEmergency && <motion.span className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border" style={{ color: '#FF453A', borderColor: '#FF453A60', backgroundColor: '#FF453A25', boxShadow: '0 0 16px #FF453A40' }} animate={{ boxShadow: ['0 0 16px #FF453A40', '0 0 24px #FF453A60', '0 0 16px #FF453A40'] }} transition={{ duration: 2, repeat: Infinity }}>EMERGENCY</motion.span>}
                {room.isLocked && <span className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border" style={{ color: '#FFD60A', borderColor: '#FFD60A60', backgroundColor: '#FFD60A25', boxShadow: '0 0 16px #FFD60A40' }}>UZAMCENO</span>}
              </div>
              <p className="text-xs font-semibold text-white/35 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {isActive && (
              <div className="text-right">
                <p className="text-[9px] font-bold text-white/30 tracking-[0.15em] uppercase mb-1">DOBA OPERACE</p>
                <motion.p className="text-3xl font-black font-mono tracking-widest" style={{ color: themeColor, textShadow: `0 0 24px ${themeColor}50` }} animate={{ opacity: [1, 0.75, 1] }} transition={{ duration: 2, repeat: Infinity }}>{elapsedStr}</motion.p>
              </div>
            )}
            <motion.button onClick={onClose} className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }} whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.08)' }} whileTap={{ scale: 0.94 }}>
              <X className="w-4.5 h-4.5 text-white/60" />
            </motion.button>
          </div>
        </motion.div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Postup operace */}
          {isActive && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2.5 mb-3.5">
                <Activity className="w-4.5 h-4.5 text-white/35" />
                <h3 className="text-[11px] font-black tracking-[0.15em] uppercase text-white/55">Postup operace</h3>
              </div>
              <div className="flex gap-4 items-stretch">
                <motion.div className="flex-1 rounded-2xl p-5 border relative overflow-hidden" style={{ backgroundColor: `${themeColor}18`, borderColor: `${themeColor}35`, backdropFilter: 'blur(20px)', boxShadow: `0 4px 24px ${themeColor}20` }} whileHover={{ scale: 1.02, boxShadow: `0 6px 32px ${themeColor}30` }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <motion.div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 12px ${themeColor}` }} animate={{ opacity: [1, 0.5, 1], scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      <span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ color: themeColor, backgroundColor: `${themeColor}20` }}>Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40`, boxShadow: `0 0 16px ${themeColor}25` }}>
                      <step.Icon className="w-6 h-6" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{step.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-white/25" />
                        <span className="text-[11px] text-white/35">{room.currentProcedure?.startTime || '--:--'}</span>
                        <span className="text-[11px] font-bold" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <motion.div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${nextColors.text}15`, borderColor: `${nextColors.text}30` }} animate={{ x: [0, 6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                        <svg className="w-4.5 h-4.5" style={{ color: nextColors.text }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </motion.div>
                    </div>
                    <motion.div className="flex-1 rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }} whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                          <span className="text-[10px] font-black tracking-[0.12em] uppercase text-white/40">NASLEDUJICI</span>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white/30 bg-white/[0.06]">Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}</span>
                      </div>
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center border bg-white/[0.05] border-white/[0.10]">
                          <nextStep.Icon className="w-6 h-6 text-white/35" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white/55">{nextStep.title}</p>
                          <p className="text-[11px] text-white/25 mt-1.5">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Prubeh vykonu */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2.5 mb-3.5">
              <Stethoscope className="w-4.5 h-4.5 text-white/35" />
              <h3 className="text-[11px] font-black tracking-[0.15em] uppercase text-white/55">Prubeh vykonu</h3>
            </div>
            <div className="flex items-start gap-1.5">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <React.Fragment key={i}>
                    <motion.div className="flex flex-col items-center flex-1 min-w-0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.06 }}>
                      <motion.div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-2 ${!isCurrent && !isCompleted ? 'opacity-35' : ''}`}
                        style={{
                          backgroundColor: isCurrent ? `${sc.text}25` : isCompleted ? `${sc.text}15` : 'rgba(255,255,255,0.04)',
                          borderColor: isCurrent ? `${sc.text}60` : isCompleted ? `${sc.text}30` : 'rgba(255,255,255,0.08)',
                          boxShadow: isCurrent ? `0 0 24px ${sc.glow}` : 'none'
                        }}
                        whileHover={{ scale: 1.15, y: -2 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <ws.Icon className="w-4.5 h-4.5" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.25)' }} />
                      </motion.div>
                      <span className={`text-[8px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/85' : isCompleted ? 'text-white/40' : 'text-white/20'}`}>{ws.title}</span>
                      {isCurrent && <motion.span className="text-[8px] font-bold px-2 py-0.5 rounded-md mt-1.5" style={{ color: sc.text, backgroundColor: `${sc.text}22`, boxShadow: `0 0 12px ${sc.glow}` }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>LIVE</motion.span>}
                    </motion.div>
                    {i < WORKFLOW_STEPS.length - 1 && <div className="h-[2px] flex-shrink-0 rounded-full mt-5" style={{ width: 14, backgroundColor: i < stepIndex ? `${sc.text}45` : 'rgba(255,255,255,0.06)' }} />}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Tym + Casy */}
          <motion.div className="flex gap-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3.5">
                <Users className="w-4.5 h-4.5 text-white/35" />
                <h3 className="text-[11px] font-black tracking-[0.15em] uppercase text-white/55">Tym</h3>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#14B8A6', icon: Users },
                ].map((member) => (
                  <motion.div key={member.label} className="flex-1 flex items-center gap-4 px-4 py-3.5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }} whileHover={{ scale: 1.04, borderColor: `${member.color}40`, backgroundColor: `${member.color}08` }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: `${member.color}15`, borderColor: `${member.color}35`, boxShadow: `0 0 16px ${member.color}20` }}>
                      <member.icon className="w-4.5 h-4.5" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black tracking-[0.12em] uppercase text-white/35">{member.label}</p>
                      <p className={`text-sm font-bold truncate ${member.name ? 'text-white/75' : 'text-white/25 italic'}`}>{member.name || 'Neprirazeno'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-3.5">
                <Clock className="w-4.5 h-4.5 text-white/35" />
                <h3 className="text-[11px] font-black tracking-[0.15em] uppercase text-white/55">Casy</h3>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'ZACATEK', value: room.currentProcedure?.startTime || '--:--', isHighlight: false },
                  { label: 'ODHAD', value: endTimeStr, isHighlight: isActive }
                ].map((time) => (
                  <motion.div key={time.label} className="rounded-xl border px-6 py-3.5 text-center min-w-[110px]" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }} whileHover={{ scale: 1.06, borderColor: 'rgba(255,255,255,0.15)' }}>
                    <p className="text-[9px] font-black tracking-[0.12em] uppercase text-white/30 mb-1.5">{time.label}</p>
                    <p className="text-3xl font-black font-mono tracking-wider" style={{ color: time.isHighlight ? themeColor : 'rgba(255,255,255,0.75)', textShadow: time.isHighlight ? `0 0 20px ${themeColor}40` : 'none' }}>{time.value}</p>
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

  const stats = useMemo(() => {
    const operations = rooms.filter((r) => r.currentStepIndex < 6 && r.currentStepIndex > 0).length;
    const cleaning = rooms.filter((r) => r.currentStepIndex === 5).length;
    const free = rooms.filter((r) => r.currentStepIndex === 0).length;
    const completed = rooms.filter((r) => r.currentStepIndex === 6).length;
    const emergency = rooms.filter((r) => r.isEmergency).length;
    const doctors = rooms.filter((r) => r.staff?.doctor?.name && r.currentStepIndex < 6).length;
    const doctorsFree = rooms.filter((r) => !r.staff?.doctor?.name || r.currentStepIndex >= 6).length;
    const nurses = rooms.filter((r) => r.staff?.nurse?.name && r.currentStepIndex < 6).length;
    const nursesFree = rooms.filter((r) => !r.staff?.nurse?.name || r.currentStepIndex >= 6).length;
    return { operations, cleaning, free, completed, emergency, doctors, doctorsFree, nurses, nursesFree };
  }, [rooms]);

  const nowPercent = getTimePercent(currentTime);

  const getElapsedBadge = (room: OperatingRoom) => {
    if (!room.currentProcedure?.startTime) return null;
    const [h, m] = room.currentProcedure.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);
    const elapsed = Math.max(0, Math.floor((currentTime.getTime() - startDate.getTime()) / 1000));
    const elapsedHours = Math.floor(elapsed / 3600);
    const elapsedMins = Math.floor((elapsed % 3600) / 60);
    return `+${elapsedHours}h ${elapsedMins}m`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <AnimatePresence>{selectedRoom && <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />}</AnimatePresence>

      {/* ======== Top Stats Bar ======== */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 border-b" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 flex-wrap">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
            { label: 'UKLID', value: stats.cleaning, color: '#FB923C', gradient: 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)' },
            { label: 'VOLNE', value: stats.free, color: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' },
            { label: 'DOKONCENO', value: stats.completed, color: '#818CF8', gradient: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)' },
            { label: 'LEKARI PRACUJI', value: stats.doctors, color: '#A78BFA', gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)', icon: Users },
            { label: 'LEKARI VOLNI', value: stats.doctorsFree, color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)', icon: Users },
            { label: 'SESTRY PRACUJI', value: stats.nurses, color: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)', icon: Users },
            { label: 'SESTRY VOLNE', value: stats.nursesFree, color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)', icon: Users },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border"
              style={{ background: `${s.color}12`, borderColor: `${s.color}30` }}
              whileHover={{ scale: 1.05, boxShadow: `0 0 16px ${s.color}30` }}
            >
              {s.icon ? <s.icon className="w-3 h-3" style={{ color: s.color }} /> : <div className="w-2 h-2 rounded-full" style={{ background: s.gradient, boxShadow: `0 0 8px ${s.color}60` }} />}
              <span className="uppercase text-white/70">{s.label}</span>
              <span className="font-black" style={{ color: s.color }}>{s.value}</span>
            </motion.div>
          ))}
          {stats.emergency > 0 && (
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider border"
              style={{ background: '#FF453A20', borderColor: '#FF453A40', color: '#FF453A' }}
              animate={{ boxShadow: ['0 0 0 rgba(255,69,58,0)', '0 0 20px rgba(255,69,58,0.5)', '0 0 0 rgba(255,69,58,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-3 h-3" />
              <span className="uppercase">EMERGENCY</span>
              <span className="font-black">{stats.emergency}</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-bold text-white/30 tracking-[0.15em] uppercase">DATUM</p>
            <p className="text-sm font-black text-white/70">{currentTime.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
          </div>
          <div className="h-8 w-px bg-white/[0.08]" />
          <div className="text-right">
            <p className="text-[9px] font-bold text-white/30 tracking-[0.15em] uppercase">CAS</p>
            <p className="text-sm font-black text-white/70 font-mono">{currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* ======== Timeline Grid ======== */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-auto">
          {/* Header row */}
          <div className="sticky top-0 z-10 flex items-stretch flex-shrink-0 h-14 border-b" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 100%)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Activity className="w-4 h-4 text-white/40" />
              <span className="text-sm font-black tracking-wider uppercase text-white/70">OPERACNI SALY</span>
            </div>
            <div className="relative flex-1 overflow-hidden">
              {/* Time markers */}
              {TIME_MARKERS.map((hour, i) => {
                if (i === TIME_MARKERS.length - 1) return null;
                const xPct = (i / HOURS_COUNT) * 100;
                const isShiftMarker = hour === SHIFT_START_HOUR || hour === SHIFT_END_HOUR;
                return (
                  <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${xPct}%` }}>
                    <div className={`w-px h-full ${isShiftMarker ? '' : 'bg-white/[0.06]'}`} />
                    <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs font-bold text-white/50 whitespace-nowrap">{hourLabel(hour)}</span>
                  </div>
                );
              })}
              
              {/* Shift markers */}
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed" style={{ left: `${((SHIFT_START_HOUR - 7) / HOURS_COUNT) * 100}%`, borderColor: '#14B8A6', opacity: 0.4 }} />
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed" style={{ left: `${((SHIFT_END_HOUR - 7) / HOURS_COUNT) * 100}%`, borderColor: '#FB923C', opacity: 0.4 }} />
              
              {/* Current time bubble */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
                style={{ left: `${nowPercent}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <motion.div
                  className="px-3 py-1.5 rounded-full text-xs font-black font-mono whitespace-nowrap border"
                  style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)', borderColor: '#14B8A660', color: '#FFFFFF', boxShadow: '0 0 24px #14B8A660' }}
                  animate={{ boxShadow: ['0 0 24px #14B8A660', '0 0 32px #14B8A680', '0 0 24px #14B8A660'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Room rows */}
          <div className="flex-1">
            {rooms.map((room, roomIndex) => {
              const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[stepIndex];
              const colors = STEP_COLORS[stepIndex] || STEP_COLORS[6];
              const isActive = stepIndex < 6 && stepIndex > 0;
              const isFree = stepIndex === 0;

              const startDate = new Date();
              const startParts = room.currentProcedure?.startTime?.split(':');
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
              const boxWidthPct = Math.max(2.5, boxRightPct - boxLeftPct);
              const progressPct = Math.max(0, Math.min(100, ((nowPercent - boxLeftPct) / boxWidthPct) * 100));

              const elapsedBadge = isActive ? getElapsedBadge(room) : null;

              /* Emergency row */
              if (room.isEmergency) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer hover:bg-red-500/[0.03] transition-colors" style={{ borderColor: '#FF453A15' }} onClick={() => setSelectedRoom(room)}>
                    <div className="flex-shrink-0 flex items-center gap-4 px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,69,58,0.20) 0%, rgba(255,69,58,0.10) 100%)', borderColor: '#FF453A20' }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ background: '#FF453A30', borderColor: '#FF453A50' }}>
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: '#FF453A' }} animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[11px] font-semibold text-red-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (<div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i / HOURS_COUNT) * 100}%`, background: '#FF453A08' }} />))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,69,58,0.30) 0%, rgba(255,69,58,0.20) 50%, rgba(255,69,58,0.30) 100%)', border: '1px solid rgba(255,69,58,0.30)', boxShadow: '0 0 32px rgba(255,69,58,0.20)' }}>
                        <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,69,58,1) 10px, rgba(255,69,58,1) 11px)' }} />
                        <span className="text-2xl font-black tracking-[0.5em] text-white/70 uppercase select-none relative z-10">E M E R G E N C Y</span>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Locked row */
              if (room.isLocked) {
                return (
                  <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b cursor-pointer hover:bg-amber-500/[0.03] transition-colors" style={{ borderColor: '#FFD60A15' }} onClick={() => setSelectedRoom(room)}>
                    <div className="flex-shrink-0 flex items-center gap-4 px-4 border-r" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,214,10,0.15) 0%, rgba(255,214,10,0.05) 100%)', borderColor: '#FFD60A20' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ background: '#FFD60A20', borderColor: '#FFD60A35' }}>
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-[11px] font-semibold text-amber-400/50 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (<div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i / HOURS_COUNT) * 100}%`, background: '#FFD60A06' }} />))}
                      <div className="absolute inset-y-[3px] left-0 right-0 rounded-lg flex items-center justify-center gap-4 overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,214,10,0.12) 0%, rgba(255,214,10,0.06) 50%, rgba(255,214,10,0.12) 100%)', border: '1px solid rgba(255,214,10,0.15)' }}>
                        <Lock className="w-5 h-5 text-amber-400/40" />
                        <span className="text-xl font-black tracking-[0.4em] text-amber-400/50 uppercase select-none">UZAMCENO</span>
                        <Lock className="w-5 h-5 text-amber-400/40" />
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
                  transition={{ delay: roomIndex * 0.02 }}
                  className="flex items-stretch flex-1 min-h-0 border-b group cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Room label */}
                  <div className="flex-shrink-0 flex items-center gap-4 px-4 border-r transition-colors" style={{ width: ROOM_LABEL_WIDTH, background: 'rgba(0,0,0,0.20)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    {/* Status circles */}
                    <div className="relative flex-shrink-0 flex gap-1.5">
                      <motion.div
                        className={`w-4 h-4 rounded-full border ${room.staff?.doctor?.name && isActive ? 'border-orange-500' : 'border-gray-600'}`}
                        style={{ background: room.staff?.doctor?.name && isActive ? 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)' : '#4B5563', boxShadow: room.staff?.doctor?.name && isActive ? '0 0 12px rgba(251,146,60,0.6)' : 'none' }}
                        animate={room.staff?.doctor?.name && isActive ? { boxShadow: ['0 0 8px rgba(251,146,60,0.5)', '0 0 16px rgba(251,146,60,0.7)', '0 0 8px rgba(251,146,60,0.5)'] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className={`w-4 h-4 rounded-full border ${room.staff?.nurse?.name && isActive ? 'border-green-500' : 'border-gray-600'}`}
                        style={{ background: room.staff?.nurse?.name && isActive ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#4B5563', boxShadow: room.staff?.nurse?.name && isActive ? '0 0 12px rgba(16,185,129,0.6)' : 'none' }}
                        animate={room.staff?.nurse?.name && isActive ? { boxShadow: ['0 0 8px rgba(16,185,129,0.5)', '0 0 16px rgba(16,185,129,0.7)', '0 0 8px rgba(16,185,129,0.5)'] } : {}}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-bold tracking-tight uppercase truncate leading-tight ${isActive ? 'text-white/90' : 'text-white/45'}`}>{room.name}</p>
                      {isFree ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                          <p className="text-[11px] font-semibold text-white/30">Volny</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          {elapsedBadge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderColor: '#10B98140', color: '#FFFFFF', boxShadow: '0 0 12px rgba(16,185,129,0.3)' }}>{elapsedBadge}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline area */}
                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i / HOURS_COUNT) * 100}%`, background: isNight ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)' }} />;
                    })}

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.8 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.6, delay: roomIndex * 0.025, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[4px] bottom-[4px] rounded-xl overflow-hidden"
                        style={{ left: `${Math.max(0, boxLeftPct)}%`, width: `${boxWidthPct}%`, transformOrigin: 'left center' }}
                      >
                        <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: colors.bg, border: `1.5px solid ${colors.border}`, boxShadow: `0 0 20px ${colors.glow}, 0 4px 16px rgba(0,0,0,0.3)` }} />
                        <motion.div className="absolute top-0 bottom-0 left-0 rounded-l-xl" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1.3, ease: 'easeOut' }} style={{ background: `linear-gradient(90deg, ${colors.fill}, ${colors.bg})` }} />
                        {/* Enhanced diagonal stripe pattern */}
                        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 7px, ${colors.text} 7px, ${colors.text} 8px)` }} />
                        {/* Left accent bar with glow */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: `linear-gradient(180deg, ${colors.text} 0%, ${colors.text}80 100%)`, boxShadow: `0 0 12px ${colors.text}60` }} />
                        {/* Content inside block */}
                        <div className="relative flex items-center h-full px-3.5 gap-2.5 z-10">
                          <span className="text-[12px] font-bold uppercase tracking-wide truncate" style={{ color: colors.text, textShadow: `0 0 12px ${colors.glow}` }}>{step.title}</span>
                          {room.currentPatient && (
                            <>
                              <div className="w-px h-3.5 flex-shrink-0" style={{ backgroundColor: `${colors.text}30` }} />
                              <span className="text-[11px] text-white/40 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                          {boxWidthPct > 6 && (
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] font-mono font-semibold text-white/35">{room.currentProcedure?.startTime}</span>
                              <span className="text-[9px] text-white/20">-</span>
                              <span className="text-[11px] font-mono font-semibold" style={{ color: `${colors.text}90` }}>
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
                        {/* Overtime indicator */}
                        {progressPct >= 92 && (
                          <div className="absolute right-0 top-0 bottom-0 w-10 opacity-50" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2.5px, ${colors.text} 2.5px, ${colors.text} 5px)` }} />
                        )}
                      </motion.div>
                    )}

                    {isFree && (
                      <div className="absolute inset-y-[4px] left-0 right-0 rounded-xl" style={{ border: '1.5px dashed rgba(255,255,255,0.08)' }} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======== Bottom Legend Bar ======== */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2.5 flex-shrink-0 border-t" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-6 text-[11px] font-semibold text-white/35">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-2.5 rounded-sm bg-white/12" />
            <span>Dokoncene</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #14B8A6 0px, #14B8A6 5px, transparent 5px, transparent 10px)' }} />
            <span>Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(to right, #FB923C 0px, #FB923C 5px, transparent 5px, transparent 10px)' }} />
            <span>Konec smeny</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-2.5 rounded-sm border" style={{ background: 'rgba(236,72,153,0.35)', borderColor: 'rgba(236,72,153,0.50)' }} />
            <span>Presah</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/25">
          <Clock className="w-3.5 h-3.5" />
          <span>Kliknete na sal pro zobrazeni detailu</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
