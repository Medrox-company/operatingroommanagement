import React, { useMemo, useEffect, useState } from 'react';
import { motion, useSpring, useMotionValueEvent } from 'framer-motion';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { Clock, Stethoscope, Users, X } from 'lucide-react';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   Detail sálu — ANIMOVANÝ TACHOMETR dílčích statusů
   Design dle reference: centrální půlkruhová stupnice s ručičkou, velkým
   procentem uprostřed a satelitními body jednotlivých fází podél oblouku.
   ════════════════════════════════════════════════════════════════════════ */

interface RoomDetailPopupProps {
  room: OperatingRoom;
  onClose: () => void;
  currentTime: Date;
}

// Geometrie tachometru (viewBox souřadnice)
const VB_W = 460;
const VB_H = 250;
const CX = VB_W / 2;
const CY = 215;
const R = 150;        // hlavní oblouk
const R_DOT = R + 26; // satelitní body
const R_LBL = R + 44; // popisky

const polar = (angleDeg: number, radius: number) => {
  // 180° = vlevo, 0° = vpravo, měřeno nad středem
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
};

const RoomDetailPopup: React.FC<RoomDetailPopupProps> = ({ room, onClose, currentTime }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses;
  const [hoverDot, setHoverDot] = useState<number | null>(null);

  // Zavření klávesou Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const stepIndex = Math.max(0, Math.min(room.currentStepIndex, totalSteps - 1));
  const currentStatus = activeStatuses[stepIndex] || null;
  const stepColor = room.isPaused
    ? C.cyan
    : (currentStatus?.accent_color || currentStatus?.color || '#6B7280');
  const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
  const progressPercent = Math.round(progress * 100);
  const isActive = stepIndex > 0 && !room.isPaused;

  // Skutečné minuty strávené v jednotlivých fázích (z historie aktuální operace)
  const phaseMinutes = useMemo(() => {
    const mins: Record<number, number> = {};
    const hist = room.statusHistory || [];
    hist.forEach((entry, idx) => {
      const s = new Date(entry.startedAt).getTime();
      const e = idx + 1 < hist.length
        ? new Date(hist[idx + 1].startedAt).getTime()
        : currentTime.getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        mins[entry.stepIndex] = (mins[entry.stepIndex] || 0) + Math.round((e - s) / 60000);
      }
    });
    return mins;
  }, [room.statusHistory, currentTime]);

  // Uplynulý čas v aktuální fázi
  const elapsedInPhase = useMemo(() => {
    if (!room.phaseStartedAt) return null;
    const ms = currentTime.getTime() - new Date(room.phaseStartedAt).getTime();
    if (ms < 0) return null;
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
  }, [room.phaseStartedAt, currentTime]);

  // Začátek operace + zbývá/skluz
  const operationStart = room.operationStartedAt
    ? new Date(room.operationStartedAt)
    : room.phaseStartedAt ? new Date(room.phaseStartedAt) : null;
  const remainingInfo = (() => {
    if (!room.estimatedEndTime) return null;
    const diffMs = new Date(room.estimatedEndTime).getTime() - currentTime.getTime();
    const abs = Math.abs(diffMs);
    const h = Math.floor(abs / 3600_000);
    const m = Math.floor((abs % 3600_000) / 60_000);
    const text = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
    return diffMs >= 0
      ? { label: 'ZBÝVÁ', text, color: C.green }
      : { label: 'PŘESAH', text, color: C.red };
  })();

  // Oblouk: 180° (vlevo) → 0° (vpravo)
  const arcStart = polar(180, R);
  const arcEnd = polar(0, R);
  const ARC_LEN = Math.PI * R;
  const trackPath = `M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;
  const needleAngle = -90 + progress * 180; // -90° vlevo … +90° vpravo

  // Ručička: pružinová rotace přes SVG atribut `transform` s pevným středem
  // otáčení (CX, CY). CSS transform na SVG elementech počítá počátek jinak,
  // proto se ručička dříve animovala mimo střed — SVG rotate(angle cx cy)
  // garantuje otáčení přesně kolem náboje.
  const needleSpring = useSpring(-90, { stiffness: 55, damping: 11 });
  const [needleDeg, setNeedleDeg] = useState(-90);
  useMotionValueEvent(needleSpring, 'change', (v) => setNeedleDeg(v));
  useEffect(() => {
    needleSpring.set(needleAngle);
  }, [needleAngle, needleSpring]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail sálu ${room.name}`}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl overflow-hidden max-w-3xl w-full relative"
        style={{
          background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
          border: `1px solid ${C.borderStrong}`,
          boxShadow: `0 30px 80px -15px rgba(0, 0, 0, 0.7), 0 0 60px ${stepColor}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[460px] h-[220px] rounded-full pointer-events-none opacity-25"
          style={{ background: `radial-gradient(circle, ${stepColor} 0%, transparent 70%)`, filter: 'blur(70px)' }}
        />

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-1 flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{room.name}</h2>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
                style={{ background: `${stepColor}26`, color: stepColor, border: `1px solid ${stepColor}45` }}
              >
                {isActive && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: stepColor }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: stepColor }} />
                  </span>
                )}
                {room.isPaused ? 'Pauza' : (currentStatus?.name || 'Status')}
              </span>
            </div>
            <p className="text-white/45 text-xs mt-1 uppercase tracking-[0.2em]">
              {room.department} · krok {stepIndex + 1} z {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: C.glass, border: `1px solid ${C.border}` }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* ── Tachometr ── */}
        <div className="relative z-10 px-6">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full select-none" aria-hidden="true">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.accent} />
                <stop offset="100%" stopColor={stepColor} />
              </linearGradient>
            </defs>

            {/* Vnější jemný oblouk */}
            <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="30" strokeLinecap="round" />
            {/* Track */}
            <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="10" strokeLinecap="round" />

            {/* Tick marky */}
            {Array.from({ length: 21 }, (_, i) => {
              const a = 180 - (i / 20) * 180;
              const major = i % 5 === 0;
              const p1 = polar(a, R - (major ? 18 : 13));
              const p2 = polar(a, R - 24);
              return (
                <line
                  key={i}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={i / 20 <= progress ? `${stepColor}99` : 'rgba(255,255,255,0.15)'}
                  strokeWidth={major ? 2 : 1}
                />
              );
            })}

            {/* Animovaný progress oblouk */}
            <motion.path
              d={trackPath}
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              initial={{ strokeDashoffset: ARC_LEN }}
              animate={{ strokeDashoffset: ARC_LEN * (1 - progress) }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              style={{ filter: `drop-shadow(0 0 8px ${stepColor}80)` }}
            />

            {/* Svítící hrot na čele oblouku — „čelo" postupu */}
            {(() => {
              const tip = polar(180 - progress * 180, R);
              return (
                <motion.circle
                  cx={tip.x} cy={tip.y} r="6"
                  fill="#fff"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.15, duration: 0.3 }}
                  style={{ filter: `drop-shadow(0 0 6px ${stepColor}) drop-shadow(0 0 12px ${stepColor})` }}
                />
              );
            })()}

            {/* Satelitní body dílčích statusů podél oblouku */}
            {activeStatuses.map((s, i) => {
              const a = totalSteps > 1 ? 180 - (i / (totalSteps - 1)) * 180 : 90;
              const dot = polar(a, R_DOT);
              const lbl = polar(a, R_LBL);
              const col = s.accent_color || s.color || '#6B7280';
              const done = i < stepIndex;
              const isCurrent = i === stepIndex;
              const mins = phaseMinutes[i];
              const value = mins !== undefined
                ? `${mins} min`
                : done ? '✓' : isCurrent ? '·' : (s.default_duration ? `~${s.default_duration}m` : '—');
              const dim = !done && !isCurrent;
              const isHover = hoverDot === i;
              // zarovnání textu podle strany oblouku
              const anchor = a > 115 ? 'end' : a < 65 ? 'start' : 'middle';
              return (
                <motion.g
                  key={s.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dim && !isHover ? 0.4 : 1 }}
                  transition={{ delay: 0.35 + i * 0.09, duration: 0.4 }}
                  onMouseEnter={() => setHoverDot(i)}
                  onMouseLeave={() => setHoverDot(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* spojnice k oblouku */}
                  <line
                    x1={polar(a, R + 7).x} y1={polar(a, R + 7).y}
                    x2={polar(a, R_DOT - 7).x} y2={polar(a, R_DOT - 7).y}
                    stroke={isHover ? `${col}aa` : `${col}55`} strokeWidth="1" strokeDasharray="2 3"
                  />
                  {(isCurrent || isHover) && (
                    <circle cx={dot.x} cy={dot.y} r="10" fill="none" stroke={`${col}50`} strokeWidth="2">
                      <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={dot.x} cy={dot.y} r={isHover ? 7 : isCurrent ? 5.5 : 4}
                    fill={done || isCurrent || isHover ? col : 'rgba(255,255,255,0.18)'}
                    stroke={isHover ? 'rgba(255,255,255,0.85)' : 'none'}
                    strokeWidth={isHover ? 1.5 : 0}
                    style={done || isCurrent || isHover ? { filter: `drop-shadow(0 0 5px ${col})`, transition: 'r 0.15s ease' } : { transition: 'r 0.15s ease' }}
                  />
                  <text
                    x={lbl.x} y={lbl.y - 4} textAnchor={anchor}
                    fontSize={isHover ? 11 : 10} fontWeight="700"
                    fill={isCurrent || isHover ? col : 'rgba(255,255,255,0.75)'}
                  >
                    {value}
                  </text>
                  <text
                    x={lbl.x} y={lbl.y + 8} textAnchor={anchor}
                    fontSize="8" fill={isHover ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'}
                  >
                    {(s.name || `Fáze ${i + 1}`).length > 17 ? `${(s.name || '').slice(0, 16)}…` : (s.name || `Fáze ${i + 1}`)}
                  </text>
                </motion.g>
              );
            })}

            {/* Ručička — rotace nativním SVG transformem kolem středu náboje */}
            <g transform={`rotate(${needleDeg} ${CX} ${CY})`}>
              <path
                d={`M ${CX - 4} ${CY} L ${CX} ${CY - R + 38} L ${CX + 4} ${CY} Z`}
                fill={stepColor}
                style={{ filter: `drop-shadow(0 0 6px ${stepColor}aa)` }}
              />
            </g>
            {/* Středový náboj — u běžící operace „dýchá" */}
            {isActive && (
              <circle cx={CX} cy={CY} r="13" fill="none" stroke={`${stepColor}40`} strokeWidth="1.5">
                <animate attributeName="r" values="13;20;13" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={CX} cy={CY} r="13" fill={C.bgDeep} stroke={`${stepColor}70`} strokeWidth="2" />
            <circle cx={CX} cy={CY} r="5" fill={stepColor} style={{ filter: `drop-shadow(0 0 6px ${stepColor})` }}>
              {isActive && <animate attributeName="opacity" values="1;0.55;1" dur="2.6s" repeatCount="indefinite" />}
            </circle>
          </svg>

          {/* Středový údaj — POD nábojem ručičky, aby se s ní nikdy nepřekrýval */}
          <div className="relative -mt-2 mb-2 flex flex-col items-center pointer-events-none">
            <motion.p
              className="text-4xl font-black tabular-nums leading-none"
              style={{ color: C.textHi, textShadow: `0 0 30px ${stepColor}50` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {progressPercent}<span className="text-xl font-bold text-white/50">%</span>
            </motion.p>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold mt-1.5">
              Průběh procesu
            </p>
            {elapsedInPhase && (
              <p className="text-[11px] text-white/55 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {elapsedInPhase} v aktuální fázi
              </p>
            )}
          </div>
        </div>

        {/* ── Spodní řádek: tým + časy ── */}
        <motion.div
          className="relative z-10 px-6 pb-6 pt-2 grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${C.purple}20`, border: `1px solid ${C.purple}35` }}>
                  <Stethoscope className="w-4 h-4" style={{ color: C.purple }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-white/40 uppercase tracking-[0.25em] font-semibold">Lékař</p>
                  <p className="text-xs font-semibold text-white truncate">{room.staff?.doctor?.name || '—'}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${C.green}20`, border: `1px solid ${C.green}35` }}>
                  <Users className="w-4 h-4" style={{ color: C.green }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-white/40 uppercase tracking-[0.25em] font-semibold">Sestra</p>
                  <p className="text-xs font-semibold text-white truncate">{room.staff?.nurse?.name || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
              <p className="text-[8px] text-white/40 uppercase tracking-[0.25em] font-semibold mb-1">Začátek</p>
              <p className="text-base font-mono font-bold text-white/85">
                {operationStart ? operationStart.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
            <div className="flex-1 rounded-xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
              <p className="text-[8px] text-white/40 uppercase tracking-[0.25em] font-semibold mb-1">Odhad konce</p>
              <p className="text-base font-mono font-bold" style={{ color: C.accent }}>
                {room.estimatedEndTime
                  ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            {remainingInfo && (
              <div
                className="flex-1 rounded-xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${remainingInfo.color}15 0%, ${remainingInfo.color}05 100%)`,
                  border: `1px solid ${remainingInfo.color}35`,
                }}
              >
                <p className="text-[8px] uppercase tracking-[0.25em] font-semibold mb-1" style={{ color: `${remainingInfo.color}b0` }}>
                  {remainingInfo.label}
                </p>
                <p className="text-base font-mono font-bold" style={{ color: remainingInfo.color }}>{remainingInfo.text}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default RoomDetailPopup;
