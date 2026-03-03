import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, ChevronRight, Zap } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

const ROOM_LABEL_WIDTH = 256;
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

const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string; pill: string }> = {
  0: { bg: 'rgba(167,139,250,0.12)', fill: 'rgba(167,139,250,0.40)', border: 'rgba(167,139,250,0.30)', text: '#A78BFA', glow: 'rgba(167,139,250,0.40)', solid: '#A78BFA', pill: 'rgba(167,139,250,0.18)' },
  1: { bg: 'rgba(45,212,191,0.12)', fill: 'rgba(45,212,191,0.40)', border: 'rgba(45,212,191,0.30)', text: '#2DD4BF', glow: 'rgba(45,212,191,0.40)', solid: '#2DD4BF', pill: 'rgba(45,212,191,0.18)' },
  2: { bg: 'rgba(255,59,48,0.12)', fill: 'rgba(255,59,48,0.40)', border: 'rgba(255,59,48,0.30)', text: '#FF6B6B', glow: 'rgba(255,59,48,0.40)', solid: '#FF6B6B', pill: 'rgba(255,59,48,0.18)' },
  3: { bg: 'rgba(251,191,36,0.12)', fill: 'rgba(251,191,36,0.40)', border: 'rgba(251,191,36,0.30)', text: '#FBBF24', glow: 'rgba(251,191,36,0.40)', solid: '#FBBF24', pill: 'rgba(251,191,36,0.18)' },
  4: { bg: 'rgba(129,140,248,0.12)', fill: 'rgba(129,140,248,0.40)', border: 'rgba(129,140,248,0.30)', text: '#818CF8', glow: 'rgba(129,140,248,0.40)', solid: '#818CF8', pill: 'rgba(129,140,248,0.18)' },
  5: { bg: 'rgba(91,101,220,0.12)', fill: 'rgba(91,101,220,0.40)', border: 'rgba(91,101,220,0.30)', text: '#7C85E8', glow: 'rgba(91,101,220,0.40)', solid: '#7C85E8', pill: 'rgba(91,101,220,0.18)' },
  6: { bg: 'rgba(52,199,89,0.06)', fill: 'rgba(52,199,89,0.25)', border: 'rgba(52,199,89,0.20)', text: '#34C759', glow: 'rgba(52,199,89,0.30)', solid: '#34C759', pill: 'rgba(52,199,89,0.12)' },
};

/* ======================================================= */
/* Room Detail Popup                                        */
/* ======================================================= */
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
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-[920px] rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,10,14,0.96)',
          border: `1px solid ${themeColor}22`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 120px ${themeColor}10`
        }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top color bar */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${themeColor} 40%, ${themeColor}80 70%, transparent 100%)` }} />

        {/* Ambient glows */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: themeColor }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none" style={{ background: themeColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-5">
            {/* Progress ring */}
            <div className="relative w-[72px] h-[72px] flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <motion.circle
                  cx="36" cy="36" r="28" fill="none"
                  stroke={themeColor}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 28}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - progress / 100)}` }}
                  transition={{ delay: 0.2, duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 8px ${themeColor}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black text-white">{progress}%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-3xl font-black tracking-tight text-white">{room.name}</h2>
                {isActive && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider border uppercase"
                    style={{ color: themeColor, borderColor: `${themeColor}35`, backgroundColor: `${themeColor}12` }}>
                    {step.title}
                  </span>
                )}
                {room.isEmergency && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider bg-red-500/15 text-red-400 border border-red-500/35 uppercase">
                    EMERGENCY
                  </span>
                )}
                {room.isLocked && (
                  <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/35 uppercase">UZAMCENO</span>
                )}
              </div>
              <p className="text-xs font-medium text-white/30 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {isActive && (
              <div className="text-right">
                <p className="text-[9px] font-bold text-white/20 tracking-[0.18em] uppercase mb-1">DOBA OPERACE</p>
                <p className="text-3xl font-black font-mono tracking-wider" style={{ color: themeColor, textShadow: `0 0 24px ${themeColor}50` }}>
                  {elapsedStr}
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">

          {/* Current + Next step */}
          {isActive && (
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Activity className="w-4 h-4" style={{ color: themeColor }} />
                <h3 className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>Postup operace</h3>
              </div>
              <div className="flex gap-3 items-stretch">
                <div className="flex-1 rounded-2xl p-5 border relative overflow-hidden"
                  style={{ backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}28` }}>
                  {/* Inner glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: themeColor }} />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }}
                        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      <span className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: themeColor }}>PRÁVĚ PROBÍHÁ</span>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg" style={{ color: themeColor, backgroundColor: `${themeColor}15` }}>
                      {stepIndex + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0"
                      style={{ backgroundColor: `${themeColor}18`, borderColor: `${themeColor}35` }}>
                      <step.Icon className="w-6 h-6" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white tracking-tight">{step.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/25" />
                        <span className="text-[10px] text-white/35">{room.currentProcedure?.startTime || '--:--'}</span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <ChevronRight className="w-4 h-4 text-white/25" />
                      </div>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white/12" />
                          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-white/30">NÁSLEDUJÍCÍ</span>
                        </div>
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg text-white/20 bg-white/[0.04]">
                          {stepIndex + 2}/{WORKFLOW_STEPS.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-white/[0.03] border-white/[0.07] flex-shrink-0">
                          <nextStep.Icon className="w-6 h-6 text-white/25" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white/45 tracking-tight">{nextStep.title}</p>
                          <p className="text-[10px] text-white/20 mt-1">Čeká na zahájení</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Workflow progress bar */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Stethoscope className="w-4 h-4 text-white/30" />
              <h3 className="text-[10px] font-black tracking-[0.18em] uppercase text-white/40">Průběh výkonu</h3>
            </div>
            <div className="flex gap-1 items-stretch">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-2 transition-all ${!isCurrent && !isCompleted ? 'opacity-25' : ''}`}
                        style={{
                          backgroundColor: isCurrent ? `${sc.text}20` : isCompleted ? `${sc.text}10` : 'rgba(255,255,255,0.03)',
                          borderColor: isCurrent ? `${sc.text}55` : isCompleted ? `${sc.text}22` : 'rgba(255,255,255,0.06)',
                          boxShadow: isCurrent ? `0 0 20px ${sc.glow}, 0 0 0 1px ${sc.text}20 inset` : 'none',
                        }}
                      >
                        <ws.Icon className="w-4 h-4" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.18)' }} />
                      </div>
                      <span className={`text-[7px] font-bold text-center leading-tight tracking-wide uppercase max-w-[52px] ${isCurrent ? 'text-white/75' : isCompleted ? 'text-white/30' : 'text-white/12'}`}>
                        {ws.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md mt-1.5"
                          style={{ color: sc.text, backgroundColor: `${sc.text}18` }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="h-[2px] flex-shrink-0 rounded-full mt-5" style={{ width: 10, backgroundColor: i < stepIndex ? `${STEP_COLORS[i]?.text}35` : 'rgba(255,255,255,0.05)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Team + Times */}
          <div className="flex gap-4">
            {/* Team */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Users className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.18em] uppercase text-white/40">Tým</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#2DD4BF', icon: Users },
                ].map((member, idx) => (
                  <div key={member.label} className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0"
                      style={{ backgroundColor: `${member.color}12`, borderColor: `${member.color}28` }}>
                      <member.icon className="w-4.5 h-4.5" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black tracking-[0.15em] uppercase text-white/25 mb-0.5">{member.label}</p>
                      <p className={`text-sm font-bold truncate ${member.name ? 'text-white/70' : 'text-white/20 italic'}`}>
                        {member.name || 'Nepřiřazeno'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-4">
                <Clock className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black tracking-[0.18em] uppercase text-white/40">Časy</h3>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ZAČÁTEK', value: room.currentProcedure?.startTime || '--:--', highlight: false },
                  { label: 'ODHAD KONCE', value: endTimeStr, highlight: isActive }
                ].map((time) => (
                  <div key={time.label} className="rounded-2xl border px-6 py-4 text-center min-w-[116px]"
                    style={{
                      background: time.highlight ? `${themeColor}0a` : 'rgba(255,255,255,0.025)',
                      borderColor: time.highlight ? `${themeColor}28` : 'rgba(255,255,255,0.07)'
                    }}>
                    <p className="text-[8px] font-black tracking-[0.15em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{time.label}</p>
                    <p className="text-2xl font-black font-mono tracking-wider"
                      style={time.highlight ? { color: themeColor, textShadow: `0 0 16px ${themeColor}40` } : { color: 'rgba(255,255,255,0.6)' }}>
                      {time.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ======================================================= */
/* Timeline Module                                          */
/* ======================================================= */
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

      {/* ======== HEADER ======== */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 md:pl-28 md:pr-6 pt-5 pb-4 flex-shrink-0 border-b border-white/[0.04]">
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-2 opacity-40">
            <Shield className="w-3.5 h-3.5 text-[#00D8C1]" />
            <span className="text-[8px] font-black text-[#00D8C1] tracking-[0.3em] uppercase hidden lg:inline">OPERATINGROOM CONTROL</span>
          </div>
          <div className="w-px h-5 bg-white/[0.08]" />
          <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">TIMELINE</h1>

          {/* Stat pills */}
          <div className="hidden xl:flex items-center gap-2">
            {[
              { label: 'OPERACE', value: stats.operations, color: '#34C759' },
              { label: 'ÚKLID', value: stats.cleaning, color: '#FBBF24' },
              { label: 'VOLNÉ', value: stats.free, color: '#00D8C1' },
              { label: 'HOTOVO', value: stats.completed, color: '#818CF8' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold"
                style={{ background: `${s.color}12`, border: `1px solid ${s.color}25`, color: s.color }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-mono font-black">{s.value}</span>
                <span className="opacity-60 uppercase tracking-widest text-[7px]">{s.label}</span>
              </div>
            ))}
            {stats.emergency > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/12 border border-red-500/30 text-red-400 text-[9px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-mono font-black">{stats.emergency}</span>
                <span className="text-[7px] uppercase tracking-widest opacity-70">EMERGENCY</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Personnel */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03]">
            <Users className="w-3 h-3 text-white/30" />
            <span className="text-[9px] font-mono font-bold text-white/45">
              {stats.doctors} <span className="text-white/20">/</span> {stats.nurses}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03]">
            <CalendarDays className="w-3 h-3 text-white/25" />
            <span className="text-[9px] font-bold text-white/35 tracking-wider">
              {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ background: 'rgba(0,216,193,0.06)', borderColor: 'rgba(0,216,193,0.20)' }}>
            <Clock className="w-3.5 h-3.5 text-[#00D8C1]" />
            <span className="text-sm font-mono font-black tracking-widest text-white">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* ======== TIMELINE BODY ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-6 py-4 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.008)' }}>

          {/* ---- Time axis ---- */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)' }}>
            {/* Room col label */}
            <div className="flex-shrink-0 flex items-center gap-2 px-5 border-r" style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Stethoscope className="w-3 h-3 text-[#00D8C1]/50" />
              <span className="text-[8px] font-black tracking-[0.2em] uppercase text-white/25">SÁLY</span>
            </div>
            {/* Hour markers */}
            <div className="flex-1 flex items-center h-10 relative">
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
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.025]' : 'bg-white/[0.05]'}`} />
                    {!isLast && (
                      isCurrentHour ? (
                        <div className="ml-1.5 px-2 py-0.5 rounded-md" style={{ background: '#00D8C1', boxShadow: '0 0 12px rgba(0,216,193,0.6)' }}>
                          <span className="text-[9px] font-mono font-black text-black tracking-wider">{shortTimeStr}</span>
                        </div>
                      ) : (
                        <span className={`ml-1.5 text-[9px] font-mono font-medium ${isNight ? 'text-white/12' : 'text-white/28'}`}>{hourLabel(hour)}</span>
                      )
                    )}
                  </div>
                );
              })}
              {/* Half-hour ticks */}
              {TIME_MARKERS.slice(0, -1).map((_, i) => (
                <div key={`half-${i}`} className="absolute bottom-0 w-px h-2 bg-white/[0.03]" style={{ left: `${((i + 0.5) / HOURS_COUNT) * 100}%` }} />
              ))}
            </div>
          </div>

          {/* ---- Room rows ---- */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">

            {/* Now line */}
            {nowPercent >= 0 && nowPercent <= 100 && (
              <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}>
                {/* Glow halo */}
                <div className="absolute -left-6 top-0 bottom-0 w-12 opacity-[0.07]" style={{ background: 'radial-gradient(ellipse at center, #00D8C1 0%, transparent 70%)' }} />
                {/* Line */}
                <div className="absolute -left-px top-0 bottom-0 w-[1.5px]" style={{ background: 'linear-gradient(to bottom, #00D8C1 0%, #00D8C1aa 60%, transparent 100%)' }} />
                {/* Top dot */}
                <div className="absolute -left-[5px] -top-[1px] w-[11px] h-[11px] rounded-full" style={{ background: '#00D8C1', boxShadow: '0 0 10px #00D8C1, 0 0 24px rgba(0,216,193,0.5)' }} />
              </div>
            )}

            {/* 19:00 shift boundary */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})` }}>
              <div className="absolute -left-px top-0 bottom-0 w-px opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 4px, transparent 4px, transparent 8px)' }} />
            </div>

            {/* Night zone */}
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ background: 'rgba(8,8,22,0.25)', left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0 }} />

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

              /* ---- EMERGENCY row ---- */
              if (room.isEmergency) {
                return (
                  <div key={room.id}
                    className="flex items-stretch flex-1 min-h-0 cursor-pointer group"
                    style={{ borderBottom: '1px solid rgba(255,59,48,0.10)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-5 border-r group-hover:brightness-110 transition-all"
                      style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.20) 0%, rgba(255,59,48,0.06) 100%)', borderColor: 'rgba(255,59,48,0.18)' }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
                          <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-full border-2 border-red-500/50"
                          animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.2, repeat: Infinity }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black tracking-widest uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[9px] font-medium text-red-400/45 truncate mt-0.5">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.04]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[4px] left-1 right-1 rounded-xl flex items-center justify-center overflow-hidden"
                        style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.22) 0%, rgba(255,59,48,0.12) 50%, rgba(255,59,48,0.22) 100%)', border: '1px solid rgba(255,59,48,0.22)' }}>
                        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,59,48,1) 8px, rgba(255,59,48,1) 9px)' }} />
                        <span className="text-sm font-black tracking-[0.5em] text-white/50 uppercase select-none relative z-10">E M E R G E N C Y</span>
                      </div>
                    </div>
                  </div>
                );
              }

              /* ---- LOCKED row ---- */
              if (room.isLocked) {
                return (
                  <div key={room.id}
                    className="flex items-stretch flex-1 min-h-0 cursor-pointer group"
                    style={{ borderBottom: '1px solid rgba(251,191,36,0.08)' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-5 border-r"
                      style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.03) 100%)', borderColor: 'rgba(251,191,36,0.14)' }}>
                      <div className="w-9 h-9 rounded-full bg-amber-500/12 flex items-center justify-center border border-amber-500/25">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black tracking-widest uppercase text-amber-400 leading-tight">UZAMČENO</p>
                        <p className="text-[9px] font-medium text-amber-400/40 truncate mt-0.5">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[4px] left-1 right-1 rounded-xl flex items-center justify-center gap-3"
                        style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.10)' }}>
                        <Lock className="w-3.5 h-3.5 text-amber-400/25" />
                        <span className="text-xs font-black tracking-[0.35em] text-amber-400/35 uppercase select-none">UZAMČENO</span>
                        <Lock className="w-3.5 h-3.5 text-amber-400/25" />
                      </div>
                    </div>
                  </div>
                );
              }

              /* ---- ACTIVE / FREE row ---- */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: roomIndex * 0.012, duration: 0.25 }}
                  className="flex items-stretch flex-1 min-h-0 group cursor-pointer transition-colors duration-150"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.035)' }}
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Room label */}
                  <div
                    className="flex-shrink-0 flex items-center gap-3 px-5 border-r group-hover:bg-white/[0.015] transition-colors"
                    style={{ width: ROOM_LABEL_WIDTH, borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.18)' }}
                  >
                    {/* Status dot with pulse */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
                        style={{
                          backgroundColor: isActive ? `${colors.text}12` : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? `${colors.text}30` : 'rgba(255,255,255,0.05)',
                        }}>
                        {isActive
                          ? <step.Icon className="w-4 h-4" style={{ color: colors.text }} />
                          : <div className="w-2 h-2 rounded-full bg-white/10" />
                        }
                      </div>
                      {isActive && (
                        <motion.div className="absolute inset-0 rounded-xl border" style={{ borderColor: `${colors.text}45` }}
                          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2.5, repeat: Infinity }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-black tracking-tight truncate leading-tight ${isActive ? 'text-white/85' : 'text-white/38'}`}>{room.name}</p>
                      {isFree ? (
                        <p className="text-[9px] font-medium text-white/20 truncate mt-0.5">Volný</p>
                      ) : (
                        <p className="text-[9px] font-semibold truncate mt-0.5" style={{ color: `${colors.text}65` }}>{room.department}</p>
                      )}
                    </div>

                    {/* Mini progress percentage */}
                    {isActive && (
                      <div className="flex-shrink-0 text-right">
                        <span className="text-[9px] font-black font-mono" style={{ color: colors.text }}>
                          {Math.round(progressPct)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timeline track */}
                  <div className="relative flex-1 overflow-hidden group-hover:brightness-110 transition-all">
                    {/* Hour grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.012]' : 'bg-white/[0.025]'}`} style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />;
                    })}

                    {/* Active procedure block */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.85 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, delay: roomIndex * 0.018, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[4px] bottom-[4px] overflow-hidden"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          transformOrigin: 'left center',
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          boxShadow: `0 2px 20px ${colors.glow}50, 0 0 0 1px ${colors.border} inset`,
                        }}
                      >
                        {/* Base background */}
                        <div className="absolute inset-0" style={{ background: colors.bg, borderRadius: 10 }} />

                        {/* Progress fill */}
                        <motion.div
                          className="absolute inset-0"
                          initial={{ clipPath: 'inset(0 100% 0 0 round 10px)' }}
                          animate={{ clipPath: `inset(0 ${100 - progressPct}% 0 0 round 10px)` }}
                          transition={{ duration: 1.4, ease: [0.45, 0, 0.15, 1] }}
                          style={{
                            background: `linear-gradient(90deg, ${colors.solid}cc 0%, ${colors.fill} 100%)`,
                            borderRadius: 10,
                          }}
                        />

                        {/* Subtle top highlight */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] opacity-50" style={{ background: `linear-gradient(90deg, transparent, ${colors.text}80, transparent)` }} />

                        {/* Content */}
                        <div className="relative flex items-center h-full px-3 gap-2 z-10">
                          {/* Step icon */}
                          <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                            style={{ background: progressPct > 35 ? 'rgba(0,0,0,0.15)' : `${colors.text}20` }}>
                            <step.Icon className="w-3 h-3" style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.7)' : colors.text }} />
                          </div>

                          {/* Step name */}
                          <span className="text-[11px] font-bold tracking-tight truncate"
                            style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)' }}>
                            {step.title}
                          </span>

                          {/* Patient name */}
                          {room.currentPatient && boxWidthPct > 9 && (
                            <>
                              <div className="w-px h-3.5 flex-shrink-0 opacity-30" style={{ backgroundColor: progressPct > 35 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }} />
                              <span className="text-[10px] font-medium truncate"
                                style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)' }}>
                                {room.currentPatient.name}
                              </span>
                            </>
                          )}

                          {/* Times at right edge */}
                          {boxWidthPct > 13 && (
                            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                              <span className="text-[9px] font-mono opacity-60" style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                                {room.currentProcedure?.startTime}
                              </span>
                              <span className="text-[8px] opacity-30" style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.5)' : 'white' }}>—</span>
                              <span className="text-[9px] font-mono font-bold" style={{ color: progressPct > 35 ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }}>
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

                    {/* Free room placeholder */}
                    {isFree && (
                      <div className="absolute inset-y-[4px] left-1 right-1 rounded-xl flex items-center justify-center"
                        style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
                        <span className="text-[8px] font-bold tracking-[0.3em] text-white/8 uppercase select-none">V O L N Ý</span>
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
