import React, { useMemo, useEffect, useState } from 'react';
import { motion, useSpring, useMotionValueEvent } from 'framer-motion';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, Clock, Flag, Lightbulb, Stethoscope, Timer, TrendingUp, Users, X } from 'lucide-react';
import { C } from './constants';
import { getReadableTextColor } from './utils';
import { MobileThemeToggle } from '../mobile/MobileShell';
import { RapidSurgeryWarning } from '../room/RapidSurgeryWarning';
import { useNowMs } from '../../hooks/useSharedClock';

/* ════════════════════════════════════════════════════════════════════════
   Detail sálu — ANIMOVANÝ TACHOMETR dílčích statusů
   Design dle reference: centrální půlkruhová stupnice s ručičkou, velkým
   procentem uprostřed a satelitními body jednotlivých fází podél oblouku.
   ════════════════════════════════════════════════════════════════════════ */

interface RoomDetailPopupProps {
  room: OperatingRoom;
  onClose: () => void;
  currentTime: Date;
  selectedPhaseEndTime?: Date | null;
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

const RoomDetailPopup: React.FC<RoomDetailPopupProps> = ({ room, onClose, currentTime, selectedPhaseEndTime }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses;
  const [hoverDot, setHoverDot] = useState<number | null>(null);
  const isHistoricalSnapshot = selectedPhaseEndTime != null;

  // Živý čas bere ze sdíleného tiku aplikace. U historického náhledu se hodnota
  // stejně nepoužije, takže překreslování nic nestojí.
  const liveTimeMs = useNowMs();

  const displayTimeMs = isHistoricalSnapshot ? currentTime.getTime() : liveTimeMs;

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
  const stepTextColor = getReadableTextColor(stepColor);
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
        : displayTimeMs;
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        // Nezaokrouhlujeme jednotlivé úseky před výpočtem procent. Krátké fáze
        // dokončených cyklů by jinak zmizely nebo změnily poměr celého cyklu.
        mins[entry.stepIndex] = (mins[entry.stepIndex] || 0) + ((e - s) / 60000);
      }
    });
    return mins;
  }, [room.statusHistory, displayTimeMs]);

  // Procentuální zastoupení jednotlivých fází. Jakmile existuje historie,
  // počítáme výhradně reálné naměřené časy (budoucí fáze mají 0 %).
  // Výchozí délky slouží pouze jako fallback před prvním měřením.
  const phaseShares = useMemo(() => {
    const measuredWeights = activeStatuses.map((_, index) => Math.max(0, phaseMinutes[index] || 0));
    const measuredTotal = measuredWeights.reduce((sum, value) => sum + value, 0);
    const weights = measuredTotal > 0
      ? measuredWeights
      : activeStatuses.map(status => Math.max(1, Number(status.default_duration) || 1));
    const total = weights.reduce((sum, value) => sum + value, 0) || 1;
    return weights.map(value => (value / total) * 100);
  }, [activeStatuses, phaseMinutes]);

  const phaseGradient = useMemo(() => {
    let cursor = 0;
    const stops = activeStatuses.map((status, index) => {
      const color = status.accent_color || status.color || '#6B7280';
      const start = cursor;
      cursor += phaseShares[index] || 0;
      return `${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });
    return stops.length > 0
      ? `conic-gradient(from -90deg, ${stops.join(', ')})`
      : 'conic-gradient(rgba(255,255,255,.08) 0% 100%)';
  }, [activeStatuses, phaseShares]);

  const recommendations = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isSurgical = (name: string) => {
      const normalized = normalize(name);
      return normalized.includes('chirurg') || normalized.includes('operac') || normalized.includes('vykon');
    };
    const measured = activeStatuses.flatMap((status, index) => {
      const minutes = phaseMinutes[index] || 0;
      const baseline = Math.max(0, Number(status.default_duration) || 0);
      const name = status.name || `Fáze ${index + 1}`;
      if (minutes <= 0 || baseline <= 0 || isSurgical(name)) return [];
      const over = minutes - baseline;
      if (over < 3 || minutes <= baseline * 1.15) return [];
      return [{ name, minutes, baseline, over, color: status.accent_color || status.color || C.yellow }];
    }).sort((a, b) => b.over - a.over);

    if (measured.length > 0) {
      return measured.slice(0, 2).map(item => {
        const normalized = normalize(item.name);
        const action = normalized.includes('prijezd')
          ? 'Prověřte včasné zavolání pacienta a koordinaci transportu.'
          : normalized.includes('uklid')
            ? 'Připravte úklidový tým ještě před ukončením výkonu.'
            : normalized.includes('odjezd')
              ? 'Koordinujte předání pacienta s dospávacím pokojem předem.'
              : 'Prověřte návaznost personálu, materiálu a předání mezi fázemi.';
        return {
          tone: 'warn' as const,
          title: `${item.name} lze urychlit`,
          text: `Skutečnost ${Math.round(item.minutes)} min, obvykle ${Math.round(item.baseline)} min. Potenciál úspory přibližně ${Math.round(item.over)} min. ${action}`,
          color: item.color,
        };
      });
    }

    const hasMeasuredData = Object.values(phaseMinutes).some(value => value > 0);
    return hasMeasuredData
      ? [{ tone: 'good' as const, title: 'Průběh odpovídá očekávání', text: 'U zrychlitelných fází nebylo zjištěno významné překročení obvyklé doby.', color: C.green }]
      : [{ tone: 'info' as const, title: 'Sbíráme data pro doporučení', text: 'Doporučení se zobrazí po dokončení prvních měřených fází. Chirurgický výkon se do návrhů na zkrácení nezahrnuje.', color: C.cyan }];
  }, [activeStatuses, phaseMinutes]);

  // Uplynulý čas v aktuální fázi
  const elapsedInPhase = useMemo(() => {
    if (!room.phaseStartedAt) return null;
    const phaseEnd = selectedPhaseEndTime?.getTime() ?? displayTimeMs;
    const ms = phaseEnd - new Date(room.phaseStartedAt).getTime();
    if (ms < 0) return null;
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
  }, [room.phaseStartedAt, displayTimeMs, selectedPhaseEndTime]);

  // Začátek operace + zbývá/skluz
  const operationStart = room.operationStartedAt
    ? new Date(room.operationStartedAt)
    : room.phaseStartedAt ? new Date(room.phaseStartedAt) : null;
  const remainingInfo = (() => {
    if (!room.estimatedEndTime) return null;
    const diffMs = new Date(room.estimatedEndTime).getTime() - displayTimeMs;
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
      {/* ════════ MOBILNÍ VARIANTA — fitness styl (tmavý sheet, kruhový ring) ════════ */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="mobile-timeline-room-detail mobile-theme-surface md:hidden fixed inset-0 flex flex-col overflow-hidden"
      >
        {/* Header — zpět · název · oddělení */}
        <div className="shrink-0 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          <div className="mobile-timeline-detail-header mobile-glass-card rounded-[24px] px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              aria-label="Zavřít detail sálu"
              className="w-10 h-10 rounded-[14px] flex items-center justify-center active:scale-95 transition-transform shrink-0"
              style={{ background: 'var(--m-card-2)', border: '1px solid var(--m-border)', color: 'var(--m-text)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-0 px-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] truncate" style={{ color: 'var(--m-muted)' }}>Operační sál</p>
              <h2 className="text-[18px] font-extrabold uppercase leading-tight truncate mt-1" style={{ color: 'var(--m-text-strong)' }}>{room.name}</h2>
              <p className="text-[10px] uppercase tracking-[0.18em] mt-1 truncate" style={{ color: 'var(--m-muted)' }}>
                {room.department || 'Operační sál'}
              </p>
            </div>
            <MobileThemeToggle />
          </div>
        </div>

        {/* Obsah */}
        <div
          className="flex-1 overflow-y-auto hide-scrollbar px-5 pt-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}
        >
          <RapidSurgeryWarning room={room} statuses={activeStatuses} className="mb-5" />

          <section className="mobile-timeline-progress-card rounded-[26px] px-4 pt-5 pb-6 mb-5">
          {/* Aktivní status */}
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[12px] font-bold"
              style={{ background: stepColor, color: stepTextColor, boxShadow: `0 8px 24px ${stepColor}45` }}
            >
              {isActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: stepTextColor }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: stepTextColor }} />
                </span>
              )}
              {room.isPaused ? 'Pauza' : (currentStatus?.name || 'Status')}
            </span>
          </div>

          {/* ── Kruhový progress ring ── */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative" style={{ width: 216, height: 216 }}>
              <svg width="216" height="216" viewBox="0 0 216 216" className="-rotate-90">
                <circle cx="108" cy="108" r="94" fill="none" stroke="var(--m-track)" strokeWidth="13" />
                <motion.circle
                  cx="108" cy="108" r="94"
                  fill="none"
                  stroke={stepColor}
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 94}
                  initial={{ strokeDashoffset: 2 * Math.PI * 94 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 94 * (1 - Math.max(progress, 0.005)) }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  style={{ filter: `drop-shadow(0 0 10px ${stepColor}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium" style={{ color: 'var(--m-muted)' }}>Průběh</p>
                <p className="text-[44px] font-black tabular-nums leading-none mt-1" style={{ color: 'var(--m-text-strong)' }}>
                  {progressPercent}<span className="text-[22px] font-bold" style={{ color: 'var(--m-muted)' }}>%</span>
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--m-muted)' }}>krok {stepIndex + 1} z {totalSteps}</p>
              </div>
              {/* Pilulka cíle — jako „Goal: 10,000" */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 px-3.5 h-7 rounded-full flex items-center gap-1.5"
                style={{ background: 'var(--m-card-solid)', border: '1px solid var(--m-border)', backdropFilter: 'blur(8px)', boxShadow: 'var(--m-card-shadow)' }}
              >
                <Flag className="w-3 h-3" style={{ color: 'var(--m-muted)' }} />
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--m-text)' }}>
                  Cíl: {room.estimatedEndTime
                    ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
          </section>

          {/* ── Tři statistické karty ── */}
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {[
              {
                icon: Clock,
                label: 'Začátek',
                value: operationStart
                  ? operationStart.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                  : '--:--',
                unit: 'čas',
                color: stepColor,
              },
              {
                icon: Timer,
                label: 'Ve fázi',
                value: elapsedInPhase || '—',
                unit: 'aktuální',
                color: stepColor,
              },
              {
                icon: Flag,
                label: remainingInfo ? (remainingInfo.label === 'ZBÝVÁ' ? 'Zbývá' : 'Přesah') : 'Zbývá',
                value: remainingInfo?.text || '—',
                unit: 'odhad',
                color: remainingInfo?.color || stepColor,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="mobile-timeline-detail-card rounded-[20px] px-3 py-4 flex flex-col items-center text-center"
                >
                  <Icon className="w-4 h-4 mb-2" style={{ color: card.color }} />
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--m-muted)' }}>{card.label}</p>
                  <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: 'var(--m-text-strong)' }}>{card.value}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--m-faint)' }}>{card.unit}</p>
                </div>
              );
            })}
          </div>

          {/* ── Tým ── */}
          <div className="grid grid-cols-2 gap-2.5 mb-7">
            {[
              { icon: Stethoscope, label: 'Lékař', value: room.staff?.doctor?.name || '—' },
              { icon: Users, label: 'Sestra', value: room.staff?.nurse?.name || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="mobile-timeline-detail-card rounded-[20px] px-4 py-3.5 flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${stepColor}1A` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stepColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px]" style={{ color: 'var(--m-muted)' }}>{label}</p>
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--m-text-strong)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Fáze procesu — „Recent Workouts" styl ── */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--m-text-strong)' }}>Fáze procesu</h3>
            <span className="text-[11px] font-semibold" style={{ color: stepColor }}>
              {stepIndex} / {totalSteps} hotovo
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {activeStatuses.map((s, i) => {
              const col = s.accent_color || s.color || '#6B7280';
              const done = i < stepIndex;
              const isCurrent = i === stepIndex && !room.isPaused;
              const mins = phaseMinutes[i];
              const sub = mins !== undefined
                ? `${mins < 1 ? '< 1' : Math.round(mins)} min`
                : done ? 'dokončeno' : isCurrent ? 'probíhá' : (s.default_duration ? `~${s.default_duration} min` : 'čeká');
              return (
                <motion.div
                  key={s.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: done || isCurrent ? 1 : 0.45, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="mobile-timeline-phase-card rounded-[20px] px-4 py-3 flex items-center gap-3"
                  style={{
                    background: isCurrent ? `linear-gradient(120deg, ${col}18, var(--m-card-solid))` : 'var(--m-card)',
                    border: `1px solid ${isCurrent ? `${col}50` : 'var(--m-border)'}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative"
                    style={{ background: `${col}1C` }}
                  >
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-2xl animate-ping opacity-25" style={{ background: col }} />
                    )}
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}99` }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--m-text-strong)' }}>{s.name || `Fáze ${i + 1}`}</p>
                    <p className="text-[11px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{sub}</p>
                  </div>
                  {done && (
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: col }}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} style={{ color: getReadableTextColor(col) }} />
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                      style={{ background: `${col}22`, color: col }}
                    >
                      Teď
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ════════ DESKTOPOVÁ VARIANTA — operační puls + cesta fází ════════ */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="hidden md:block rounded-3xl overflow-y-auto hide-scrollbar max-h-[calc(100vh-32px)] max-w-4xl w-full relative"
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

        <div className="relative z-10 px-6 pt-4">
          <RapidSurgeryWarning room={room} statuses={activeStatuses} variant="desktop" />
        </div>

        {/* ── Cesta výkonu — jediná hlavní vizualizace detailu ── */}
        <div className="relative z-10 px-6 pt-5 pb-5">
          <div className="hidden">
            {/* Jemné orbitální kružnice */}
            <div className="absolute w-[306px] h-[306px] rounded-full border border-dashed border-white/10">
              {activeStatuses.slice(0, 8).map((s, i) => {
                const angle = (i / Math.max(1, Math.min(activeStatuses.length, 8))) * Math.PI * 2;
                const col = s.accent_color || s.color || '#6B7280';
                return (
                  <span
                    key={s.id || i}
                    className="absolute w-2.5 h-2.5 rounded-full"
                    style={{
                      left: `calc(50% + ${Math.cos(angle) * 148}px - 5px)`,
                      top: `calc(50% + ${Math.sin(angle) * 148}px - 5px)`,
                      background: i <= stepIndex ? col : 'rgba(255,255,255,.14)',
                      boxShadow: i === stepIndex ? `0 0 15px ${col}` : 'none',
                    }}
                  />
                );
              })}
            </div>

            <div className="absolute w-[270px] h-[270px] rounded-full border border-white/[0.06]" />
            <div className="relative w-[244px] h-[244px]">
              <svg viewBox="0 0 244 244" className="w-full h-full -rotate-90">
                <circle cx="122" cy="122" r="105" fill="rgba(255,255,255,.018)" stroke="rgba(255,255,255,.065)" strokeWidth="14" />
                {/* Tenký vícebarevný prstenec ukazuje zastoupení všech fází. */}
                {activeStatuses.map((status, index) => {
                  const radius = 116;
                  const circumference = 2 * Math.PI * radius;
                  const before = phaseShares.slice(0, index).reduce((sum, value) => sum + value, 0);
                  const share = phaseShares[index] || 0;
                  const gap = Math.min(1.2, share * .16);
                  const color = status.accent_color || status.color || '#6B7280';
                  return (
                    <circle
                      key={status.id || index}
                      cx="122" cy="122" r={radius} fill="none" stroke={color} strokeWidth={index === stepIndex ? 4 : 2.5}
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, ((share - gap) / 100) * circumference)} ${circumference}`}
                      strokeDashoffset={-(before / 100) * circumference}
                      opacity={index <= stepIndex ? 1 : .32}
                      style={index === stepIndex ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
                    />
                  );
                })}
                <circle
                  cx="122" cy="122" r="105" fill="none" stroke={stepColor} strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 105}
                  strokeDashoffset={2 * Math.PI * 105 * (1 - Math.max(progress, 0.008))}
                  style={{ filter: `drop-shadow(0 0 12px ${stepColor}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[50px] font-black tabular-nums leading-none text-white mt-2" style={{ textShadow: `0 0 35px ${stepColor}45` }}>
                  {progressPercent}<span className="text-[22px] text-white/40">%</span>
                </p>
                <p className="text-[11px] mt-2 font-semibold" style={{ color: stepColor }}>
                  {room.isPaused ? 'Pauza' : (currentStatus?.name || 'Status')}
                </p>
                {elapsedInPhase && <p className="text-[10px] text-white/40 mt-1 tabular-nums">{elapsedInPhase} v této fázi</p>}
              </div>
            </div>
          </div>

          <div className="min-w-0 w-full">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/35 font-semibold">Cesta výkonu</p>
                <p className="text-sm font-bold text-white mt-1">Průběh jednotlivých fází</p>
              </div>
              <span className="text-[10px] text-white/35 tabular-nums">{stepIndex + 1} / {totalSteps}</span>
            </div>

            {/* Souhrnná linka přes celou šířku — zastoupení všech fází */}
            <div className="mb-5 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,.022)', border: '1px solid rgba(255,255,255,.075)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] uppercase tracking-[.22em] font-semibold text-white/35">Procentuální zastoupení všech fází</span>
                <span className="text-[9px] font-mono text-white/30">100 %</span>
              </div>
              <div className="flex w-full h-11 rounded-xl overflow-hidden gap-[2px] bg-white/[0.035] p-[2px]">
                {activeStatuses.map((status, index) => {
                  const share = phaseShares[index] || 0;
                  const color = status.accent_color || status.color || '#6B7280';
                  const labelColor = getReadableTextColor(color);
                  const current = index === stepIndex;
                  return (
                    <motion.div
                      key={`${status.id || index}-${stepIndex}`}
                      title={`${status.name || `Fáze ${index + 1}`} · ${share.toFixed(1)} %`}
                      className="relative h-full flex items-center justify-center overflow-hidden transition-[filter] duration-200 hover:brightness-125"
                      style={{
                        width: `${share}%`,
                        minWidth: share > 0 ? 5 : 0,
                        transformOrigin: 'left center',
                        background: `linear-gradient(180deg, ${color}, ${color}b8)`,
                        boxShadow: current ? `inset 0 0 0 2px rgba(255,255,255,.55), 0 0 14px ${color}55` : 'inset 0 1px 0 rgba(255,255,255,.18)',
                      }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: .08 + index * .08, duration: .55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {share >= 7 && (
                        <span
                          className="text-[11px] font-black tabular-nums whitespace-nowrap"
                          style={{ color: labelColor, textShadow: labelColor === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,.65)' : '0 1px 1px rgba(255,255,255,.2)' }}
                        >
                          {share.toFixed(1)} %
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="relative h-[390px] w-full overflow-hidden rounded-[26px] border border-white/[0.055] bg-white/[0.012]">
              <motion.div
                key={`phase-flash-${stepIndex}`}
                className="absolute inset-0 pointer-events-none z-20"
                initial={{ opacity: .32 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.15, ease: 'easeOut' }}
                style={{ background: `radial-gradient(circle at 50% 50%, ${stepColor}38 0%, ${stepColor}0d 28%, transparent 66%)` }}
              />
              {/* Proudící spojnice dávají radiálnímu diagramu jasnou strukturu. */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 840 390" preserveAspectRatio="none" aria-hidden="true">
                {[58, 195, 332].map((y, index) => (
                  <React.Fragment key={y}>
                    <motion.path
                      d={`M 236 ${y} C 300 ${y}, 314 195, 345 195`}
                      fill="none" stroke={stepColor} strokeOpacity=".38" strokeWidth="1.5" strokeDasharray="6 7"
                      animate={{ strokeDashoffset: [0, -26], opacity: [.3, .9, .3] }}
                      transition={{ duration: 2.6 + index * .28, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.path
                      d={`M 495 195 C 526 195, 540 ${y}, 604 ${y}`}
                      fill="none" stroke={stepColor} strokeOpacity=".38" strokeWidth="1.5" strokeDasharray="6 7"
                      animate={{ strokeDashoffset: [0, 26], opacity: [.3, .9, .3] }}
                      transition={{ duration: 2.7 + index * .28, repeat: Infinity, ease: 'linear' }}
                    />
                  </React.Fragment>
                ))}
              </svg>

              {/* Centrální kruhový graf všech fází */}
              <motion.div
                key={`center-phase-${stepIndex}`}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[190px] h-[190px] rounded-full p-[14px]"
                style={{ background: phaseGradient, boxShadow: `0 0 45px ${stepColor}18, inset 0 0 0 1px rgba(255,255,255,.15)` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, boxShadow: [`0 0 28px ${stepColor}12`, `0 0 58px ${stepColor}30`, `0 0 28px ${stepColor}12`] }}
                transition={{ opacity: { duration: .45 }, boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }}
              >
                <div className="w-full h-full rounded-full flex flex-col items-center justify-center text-center" style={{ background: 'radial-gradient(circle at 40% 30%, #172238, #080e1b 72%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}>
                  <span className="text-[9px] uppercase tracking-[.24em] text-white/30 font-semibold">Celkový průběh</span>
                  <motion.span
                    key={`progress-value-${stepIndex}`}
                    className="text-[42px] font-black text-white tabular-nums leading-none mt-2"
                    style={{ textShadow: `0 0 28px ${stepColor}45` }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: .08 }}
                  >
                    {progressPercent}<span className="text-[18px] text-white/40"> %</span>
                  </motion.span>
                  <span className="text-[10px] font-bold mt-2 max-w-[130px] truncate" style={{ color: stepColor }}>
                    {room.isPaused ? 'Pauza' : (currentStatus?.name || 'Status')}
                  </span>
                  <span className="text-[9px] text-white/30 mt-1">{stepIndex + 1}. fáze z {totalSteps}</span>
                </div>
              </motion.div>

              {activeStatuses.map((s, i) => {
                const col = s.accent_color || s.color || '#6B7280';
                const colText = getReadableTextColor(col);
                const done = i < stepIndex;
                const current = i === stepIndex;
                const mins = phaseMinutes[i];
                const share = phaseShares[i] || 0;
                const highlighted = hoverDot === i;
                const leftCount = Math.ceil(activeStatuses.length / 2);
                const onLeft = i < leftCount;
                const localIndex = onLeft ? i : i - leftCount;
                const groupCount = onLeft ? leftCount : Math.max(1, activeStatuses.length - leftCount);
                const left = onLeft ? 15 : 85;
                const top = groupCount <= 1 ? 50 : 15 + (localIndex / (groupCount - 1)) * 70;
                return (
                  <motion.button
                    type="button"
                    key={`${s.id || i}-${stepIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: .15 + i * .09, duration: .45 }}
                    onMouseEnter={() => setHoverDot(i)}
                    onMouseLeave={() => setHoverDot(null)}
                    className="absolute z-10 w-[238px] rounded-2xl p-4 min-h-[88px] text-left backdrop-blur-md transition-[filter,box-shadow,border-color] duration-200 hover:brightness-115"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                      background: current || highlighted ? `${col}1f` : 'rgba(10,17,31,.88)',
                      border: `1px solid ${current || highlighted ? `${col}55` : 'rgba(255,255,255,.075)'}`,
                      boxShadow: current ? `0 12px 38px ${col}2c, inset 0 1px 0 rgba(255,255,255,.08)` : '0 10px 26px rgba(0,0,0,.2)',
                      opacity: i > stepIndex && !highlighted ? .48 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
                        style={{ background: done || current ? col : 'rgba(255,255,255,.07)', color: done || current ? colText : 'rgba(255,255,255,.4)' }}
                      >
                        {done ? <Check className="w-4 h-4" /> : i + 1}
                        {current && <span className="absolute -inset-1 rounded-full border animate-ping opacity-25" style={{ borderColor: col }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold leading-tight text-white/95 whitespace-normal line-clamp-2">{s.name || `Fáze ${i + 1}`}</span>
                        <span className="block text-[10px] mt-1.5 tabular-nums" style={{ color: current ? col : 'rgba(255,255,255,.35)' }}>
                          {mins !== undefined ? `${mins < 1 ? '< 1' : Math.round(mins)} min` : current ? (elapsedInPhase || 'probíhá') : done ? 'dokončeno' : (s.default_duration ? `odhad ${s.default_duration} min` : 'čeká')}
                        </span>
                      </span>
                      <span className="shrink-0 text-right leading-none">
                        <strong className="block text-[22px] font-black tabular-nums tracking-tight" style={{ color: col }}>{share.toFixed(1)} %</strong>
                        <span className="block text-[8px] uppercase tracking-[.18em] text-white/25 mt-1.5">Zastoupení</span>
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Textová doporučení podle skutečného průběhu měřených fází. */}
            <motion.section
              key={`recommendations-${stepIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .32, duration: .5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${stepColor}16`, border: `1px solid ${stepColor}35` }}>
                  <TrendingUp className="w-4 h-4" style={{ color: stepColor }} />
                </span>
                <div>
                  <h3 className="text-[12px] uppercase tracking-[.18em] font-bold text-white/85">Co zlepšit a urychlit</h3>
                  <p className="text-[9px] text-white/35 mt-0.5">Doporučení z reálných časů · chirurgický výkon se nezkracuje</p>
                </div>
              </div>
              <div className={`grid gap-2.5 ${recommendations.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {recommendations.map((recommendation, index) => {
                  const Icon = recommendation.tone === 'warn' ? AlertTriangle : recommendation.tone === 'good' ? CheckCircle2 : Lightbulb;
                  return (
                    <motion.div
                      key={`${recommendation.title}-${index}`}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: .44 + index * .1, duration: .4 }}
                      className="rounded-xl p-3 flex items-start gap-2.5"
                      style={{ background: `${recommendation.color}0e`, border: `1px solid ${recommendation.color}30` }}
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: recommendation.color }} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white leading-tight">{recommendation.title}</p>
                        <p className="text-[10px] text-white/55 leading-relaxed mt-1">{recommendation.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Původní tachometr je ponechán pouze jako skrytá historická implementace. */}
        <div className="hidden" aria-hidden="true">
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
                ? `${mins < 1 ? '< 1' : Math.round(mins)} min`
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
