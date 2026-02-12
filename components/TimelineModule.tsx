import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* --- Layout constants --- */
const ROOM_LABEL_WIDTH = 210;
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
      className="fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-[820px] mx-4 rounded-3xl border border-white/[0.08] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(12,18,32,0.98) 0%, rgba(8,12,24,0.99) 100%)' }}
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${themeColor}60 50%, transparent 100%)` }} />

        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                <circle cx="24" cy="24" r="20" fill="none" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 4px ${themeColor}40)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-white/60">{progress}%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h2 className="text-lg font-black tracking-tight text-white">{room.name}</h2>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider border" style={{ color: themeColor, borderColor: `${themeColor}35`, backgroundColor: `${themeColor}12` }}>
                    {step.title}
                  </span>
                )}
                {room.isEmergency && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-red-500/15 text-red-400 border border-red-500/25">EMERGENCY</span>}
                {room.isLocked && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">UZAMCENO</span>}
              </div>
              <p className="text-[10px] font-medium text-white/25 tracking-wider uppercase">{room.department} &middot; Krok {stepIndex + 1} z {WORKFLOW_STEPS.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isActive && (
              <div className="text-right">
                <p className="text-[7px] font-bold text-white/20 tracking-[0.15em] uppercase mb-0.5">DOBA OPERACE</p>
                <p className="text-xl font-black font-mono tracking-widest" style={{ color: themeColor }}>{elapsedStr}</p>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </div>

        {/* ---- Body ---- */}
        <div className="px-6 py-4 space-y-4">

          {/* Postup operace */}
          {isActive && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Activity className="w-3.5 h-3.5 text-white/20" />
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">Postup operace</h3>
              </div>
              <div className="flex gap-2.5 items-stretch">
                <div className="flex-1 rounded-xl p-3.5 border" style={{ backgroundColor: `${themeColor}08`, borderColor: `${themeColor}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      <span className="text-[8px] font-black tracking-[0.12em] uppercase" style={{ color: themeColor }}>PRAVE PROBIHA</span>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ color: themeColor, backgroundColor: `${themeColor}12` }}>Krok {stepIndex + 1}/{WORKFLOW_STEPS.length}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20` }}>
                      <step.Icon className="w-4 h-4" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white">{step.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-white/15" />
                        <span className="text-[9px] text-white/25">{room.currentProcedure?.startTime || '--:--'}</span>
                        <span className="text-[9px] font-bold" style={{ color: themeColor }}>{elapsedStr.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {nextStep && nextColors && (
                  <>
                    <div className="flex items-center flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.06]">
                        <svg className="w-3 h-3 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl p-3.5 border bg-white/[0.015] border-white/[0.05]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                          <span className="text-[8px] font-black tracking-[0.12em] uppercase text-white/25">NASLEDUJICI</span>
                        </div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white/15 bg-white/[0.03]">Krok {stepIndex + 2}/{WORKFLOW_STEPS.length}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.025] border border-white/[0.05]">
                          <nextStep.Icon className="w-4 h-4 text-white/20" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/40">{nextStep.title}</p>
                          <p className="text-[9px] text-white/15 mt-0.5">Ceka na zahajeni</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Prubeh vykonu */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Stethoscope className="w-3.5 h-3.5 text-white/20" />
              <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">Prubeh vykonu</h3>
            </div>
            <div className="flex items-start gap-0.5">
              {WORKFLOW_STEPS.map((ws, i) => {
                const isCompleted = i < stepIndex;
                const isCurrent = i === stepIndex;
                const sc = STEP_COLORS[i] || STEP_COLORS[6];
                return (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border mb-1 transition-all ${!isCurrent && !isCompleted ? 'opacity-25' : ''}`}
                        style={{
                          backgroundColor: isCurrent ? `${sc.text}18` : isCompleted ? `${sc.text}0c` : 'rgba(255,255,255,0.02)',
                          borderColor: isCurrent ? `${sc.text}40` : isCompleted ? `${sc.text}18` : 'rgba(255,255,255,0.05)',
                          boxShadow: isCurrent ? `0 0 12px ${sc.glow}` : 'none',
                        }}
                      >
                        <ws.Icon className="w-3.5 h-3.5" style={{ color: isCurrent ? sc.text : isCompleted ? sc.text : 'rgba(255,255,255,0.15)' }} />
                      </div>
                      <span className={`text-[6px] font-bold text-center leading-tight tracking-wider uppercase ${isCurrent ? 'text-white/70' : isCompleted ? 'text-white/30' : 'text-white/10'}`}>{ws.title}</span>
                      {isCurrent && <span className="text-[6px] font-bold px-1 py-0.5 rounded mt-0.5" style={{ color: sc.text, backgroundColor: `${sc.text}12` }}>LIVE</span>}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="h-[1.5px] flex-shrink-0 rounded-full mt-4" style={{ width: 10, backgroundColor: i < stepIndex ? `${sc.text}35` : 'rgba(255,255,255,0.04)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Tym + Casy -- horizontal layout */}
          <div className="flex gap-3">
            {/* Team - only anesteziolog + sestra */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-white/20" />
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">Tym</h3>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'ANESTEZIOLOG', name: room.staff?.anesthesiologist?.name, color: '#A78BFA', icon: Syringe },
                  { label: 'SESTRA', name: room.staff?.nurse?.name, color: '#2DD4BF', icon: Users },
                ].map((member) => (
                  <div key={member.label} className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white/[0.02] border-white/[0.05]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: `${member.color}0c`, borderColor: `${member.color}20` }}>
                      <member.icon className="w-3.5 h-3.5" style={{ color: member.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/25">{member.label}</p>
                      <p className={`text-[10px] font-bold truncate ${member.name ? 'text-white/60' : 'text-white/15 italic'}`}>{member.name || 'Neprirazeno'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-white/20" />
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-white/40">Casy</h3>
              </div>
              <div className="flex gap-2">
                <div className="rounded-xl border bg-white/[0.02] border-white/[0.05] px-4 py-2.5 text-center min-w-[80px]">
                  <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/20 mb-0.5">ZACATEK</p>
                  <p className="text-lg font-black font-mono tracking-wider text-white/70">{room.currentProcedure?.startTime || '--:--'}</p>
                </div>
                <div className="rounded-xl border bg-white/[0.02] border-white/[0.05] px-4 py-2.5 text-center min-w-[80px]">
                  <p className="text-[7px] font-black tracking-[0.12em] uppercase text-white/20 mb-0.5">ODHAD</p>
                  <p className="text-lg font-black font-mono tracking-wider" style={{ color: isActive ? themeColor : 'rgba(255,255,255,0.25)' }}>{endTimeStr}</p>
                </div>
              </div>
            </div>
          </div>
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
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 md:pl-28 md:pr-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-4 h-4 text-[#00D8C1]" />
            <span className="text-[9px] font-black text-[#00D8C1] tracking-[0.3em] uppercase hidden lg:inline">OPERATINGROOM CONTROL</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">TIMELINE</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {[
            { label: 'OPERACE', value: stats.operations, color: '#34C759', dot: true },
            { label: 'UKLID', value: stats.cleaning, color: '#FBBF24', dot: true },
            { label: 'VOLNE', value: stats.free, color: '#00D8C1', highlight: true },
            { label: 'HOTOVO', value: stats.completed, color: '#818CF8', dot: true },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider ${
                s.highlight ? 'bg-[#00D8C1]/10 border border-[#00D8C1]/25 text-[#00D8C1]' : 'bg-white/[0.03] border border-white/[0.06] text-white/50'
              }`}
            >
              {s.dot && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />}
              <span className="font-mono font-black">{s.value}</span>
              <span className="text-[7px] uppercase tracking-widest opacity-60 hidden xl:inline">{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[9px] font-bold text-white/40">
            <Users className="w-3 h-3 text-white/30" />
            <span className="font-mono">{stats.doctors}</span>
            <span className="text-[7px] opacity-50">{'/'}</span>
            <span className="font-mono">{stats.nurses}</span>
          </div>
          {stats.emergency > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-[9px] font-bold">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-mono font-black">{stats.emergency}</span>
              <span className="text-[7px] uppercase tracking-widest opacity-60 hidden xl:inline">EMERGENCY</span>
            </div>
          )}
          <div className="w-px h-5 bg-white/10 mx-1" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <CalendarDays className="w-3 h-3 text-white/25" />
            <span className="text-[9px] font-bold text-white/35 tracking-wider">
              {currentTime.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#00D8C1]" />
            <span className="text-sm font-mono font-black tracking-widest text-white">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-4 md:pl-28 md:pr-6 pb-2 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">

          {/* Time Axis Header */}
          <div className="flex flex-shrink-0 border-b border-white/[0.08] bg-black/30 backdrop-blur-sm">
            <div className="flex-shrink-0 flex items-center px-4 gap-2 border-r border-white/[0.08]" style={{ width: ROOM_LABEL_WIDTH }}>
              <Stethoscope className="w-3.5 h-3.5 text-[#00D8C1]/40" />
              <span className="text-[8px] font-black tracking-[0.15em] uppercase text-white/25">OPERACNI SALY</span>
            </div>
            <div className="flex-1 flex items-center h-9 relative">
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
                    <div className={`w-px h-full ${isNight ? 'bg-white/[0.03]' : 'bg-white/[0.06]'}`} />
                    {!isLast && (
                      isCurrentHour ? (
                        <div className="ml-1.5 px-2 py-0.5 rounded-md bg-[#00D8C1] shadow-[0_0_12px_rgba(0,216,193,0.4)]">
                          <span className="text-[8px] font-mono font-black text-black tracking-wider">{shortTimeStr}</span>
                        </div>
                      ) : (
                        <span className={`ml-1.5 text-[8px] font-mono font-medium ${isNight ? 'text-white/[0.15]' : 'text-white/30'}`}>{hourLabel(hour)}</span>
                      )
                    )}
                  </div>
                );
              })}
              {TIME_MARKERS.slice(0, -1).map((_, i) => (
                <div key={`half-${i}`} className="absolute bottom-0 w-px h-2 bg-white/[0.04]" style={{ left: `${((i + 0.5) / HOURS_COUNT) * 100}%` }} />
              ))}
            </div>
          </div>

          {/* Room Rows */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            {/* Now indicator */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}>
                  <div className="absolute -left-4 top-0 bottom-0 w-8 bg-[#00D8C1] opacity-[0.04] blur-lg" />
                  <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1 0%, #00D8C180 50%, #00D8C140 100%)' }} />
                  <div className="absolute -left-[4px] -top-[1px] w-[10px] h-[10px] rounded-full bg-[#00D8C1] shadow-[0_0_8px_#00D8C1,0_0_20px_rgba(0,216,193,0.4)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shift boundary 19:00 */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})` }}>
              <div className="absolute -left-px top-0 bottom-0 w-[1px]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FF9500 0px, #FF9500 4px, transparent 4px, transparent 8px)' }} />
            </div>

            {/* Night zone overlay */}
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none bg-[#0a0a2a]/30" style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${shiftEndPercent / 100})`, right: 0 }} />

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
                    className="flex items-stretch flex-1 min-h-0 border-b border-red-500/10 cursor-pointer"
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-red-500/15" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(255,59,48,0.18) 0%, rgba(255,59,48,0.08) 100%)' }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-red-500/25 flex items-center justify-center border border-red-500/40">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <motion.div className="absolute inset-0 rounded-full border-2 border-red-500/50" animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                        <p className="text-[7px] font-medium text-red-400/40 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.04]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[2px] left-0 right-0 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(255,59,48,0.25) 0%, rgba(255,59,48,0.15) 50%, rgba(255,59,48,0.25) 100%)', border: '1px solid rgba(255,59,48,0.20)' }}>
                        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,59,48,1) 8px, rgba(255,59,48,1) 9px), repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,59,48,1) 8px, rgba(255,59,48,1) 9px)' }} />
                        <span className="text-sm font-black tracking-[0.5em] text-white/60 uppercase select-none relative z-10">E M E R G E N C Y</span>
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
                    className="flex items-stretch flex-1 min-h-0 border-b border-amber-500/10 cursor-pointer"
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-amber-500/15" style={{ width: ROOM_LABEL_WIDTH, background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 100%)' }}>
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                        <p className="text-[7px] font-medium text-amber-400/40 truncate">{room.name}</p>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                      {TIME_MARKERS.slice(0, -1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.03]" style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />
                      ))}
                      <div className="absolute inset-y-[2px] left-0 right-0 rounded-lg flex items-center justify-center gap-3 overflow-hidden" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.04) 50%, rgba(251,191,36,0.08) 100%)', border: '1px solid rgba(251,191,36,0.10)' }}>
                        <Lock className="w-3 h-3 text-amber-400/30" />
                        <span className="text-xs font-black tracking-[0.35em] text-amber-400/40 uppercase select-none">UZAMCENO</span>
                        <Lock className="w-3 h-3 text-amber-400/30" />
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
                  className="flex items-stretch flex-1 min-h-0 border-b border-white/[0.04] group hover:bg-white/[0.015] transition-colors duration-200 cursor-pointer"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex-shrink-0 flex items-center gap-3 px-4 border-r border-white/[0.06] bg-black/20 group-hover:bg-white/[0.02] transition-colors" style={{ width: ROOM_LABEL_WIDTH }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ backgroundColor: isActive ? `${colors.text}12` : 'rgba(255,255,255,0.03)', borderColor: isActive ? `${colors.text}30` : 'rgba(255,255,255,0.06)' }}>
                        {isActive ? <Activity className="w-3 h-3" style={{ color: colors.text }} /> : <div className="w-2 h-2 rounded-full bg-white/10" />}
                      </div>
                      {isActive && (
                        <motion.div className="absolute inset-0 rounded-full border" style={{ borderColor: `${colors.text}50` }} animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold tracking-tight uppercase truncate leading-tight ${isActive ? 'text-white/80' : 'text-white/40'}`}>{room.name}</p>
                      {isFree ? (
                        <p className="text-[7px] font-medium text-white/20 truncate">Volny</p>
                      ) : (
                        <p className="text-[7px] font-medium truncate" style={{ color: `${colors.text}60` }}>{room.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const isNight = hour >= 19 || hour < 7;
                      return <div key={i} className={`absolute top-0 bottom-0 w-px ${isNight ? 'bg-white/[0.015]' : 'bg-white/[0.03]'}`} style={{ left: `${(i / HOURS_COUNT) * 100}%` }} />;
                    })}

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.85 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, delay: roomIndex * 0.02, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-[2px] bottom-[2px] rounded-lg overflow-hidden"
                        style={{ left: `${Math.max(0, boxLeftPct)}%`, width: `${boxWidthPct}%`, transformOrigin: 'left center' }}
                      >
                        <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, boxShadow: `0 0 20px ${colors.glow}` }} />
                        <motion.div className="absolute top-0 bottom-0 left-0 rounded-l-lg" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} style={{ background: `linear-gradient(90deg, ${colors.fill}, ${colors.bg})` }} />
                        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${colors.text} 6px, ${colors.text} 7px)` }} />
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ backgroundColor: colors.text }} />
                        <div className="relative flex items-center h-full px-3 gap-2 z-10">
                          <span className="text-[8px] font-bold uppercase tracking-wide truncate" style={{ color: colors.text }}>{step.title}</span>
                          {room.currentPatient && (
                            <>
                              <div className="w-px h-3 flex-shrink-0" style={{ backgroundColor: `${colors.text}25` }} />
                              <span className="text-[7px] text-white/30 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                          {boxWidthPct > 6 && (
                            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                              <span className="text-[7px] font-mono text-white/20">{room.currentProcedure?.startTime}</span>
                              <span className="text-[6px] text-white/10">-</span>
                              <span className="text-[7px] font-mono" style={{ color: `${colors.text}70` }}>
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

                    {isFree && room.currentProcedure && (
                      <div className="absolute top-[2px] bottom-[2px] rounded-lg" style={{ left: `${Math.max(0, boxLeftPct)}%`, width: `${boxWidthPct}%`, backgroundColor: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.04)' }} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======== Bottom Legend ======== */}
      <div className="relative z-10 flex items-center justify-between px-4 md:pl-28 md:pr-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/[0.06]" />
            <span className="text-[8px] font-medium text-white/25 uppercase tracking-wider">Dokoncene</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[2px] rounded-full bg-[#00D8C1]" />
            <span className="text-[8px] font-medium text-white/25 uppercase tracking-wider">Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-[2px]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FF9500 0px, #FF9500 3px, transparent 3px, transparent 6px)' }} />
            <span className="text-[8px] font-medium text-white/25 uppercase tracking-wider">Konec smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500/20 border border-pink-500/25" />
            <span className="text-[8px] font-medium text-white/25 uppercase tracking-wider">Presah</span>
          </div>
        </div>
        <span className="text-[8px] text-white/10 font-medium">Kliknete na sal pro zobrazeni detailu</span>
      </div>
    </div>
  );
};

export default TimelineModule;
