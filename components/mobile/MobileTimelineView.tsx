'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OperatingRoom } from '../../types';
import {
  MobileHeader,
  MobileCard,
  MobilePillTabs,
  MobileSectionLabel,
} from './MobileShell';
import { Activity, Stethoscope, Sparkles, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/* =============================================================================
   MobileTimelineView
   Mobilní redesign "Časové osy". Obsahuje dvě zobrazení přes pill toggle:
   - "Seznam" — karty s barvou statusu, progress barem a zbývajícím časem
   - "Osa"    — horizontálně scrollovatelná 24h timeline (7:00–7:00)
   Barvy stavů se čerpají ŽIVĚ z `statusByOrderIndex` (DB → modul Statusy).
   ========================================================================== */

// Design tokens
const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  yellow: '#FFE66D',
  orange: '#FF9F43',
  red: '#FF6B6B',
  purple: '#A78BFA',
  surface: 'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
};

const TIMELINE_START_HOUR = 7;
const TIMELINE_HOURS = 24;
// Šířka 24h osy v pixelech; jeden blok na hodinu ≈ 48 px, celková ≈ 1150
const HOUR_PX = 48;
const AXIS_WIDTH = TIMELINE_HOURS * HOUR_PX;

type WorkflowStatus = {
  order_index: number;
  title?: string;
  name?: string;
  color?: string | null;
  accent_color?: string | null;
};

type Stats = {
  operations: number;
  cleaning: number;
  free: number;
  completed: number;
  emergencyCount: number;
};

interface Props {
  rooms: OperatingRoom[];
  statusByOrderIndex: Record<number, WorkflowStatus | undefined>;
  activeStatuses: WorkflowStatus[];
  currentTime: Date;
  stats: Stats;
  mobileView: 'list' | 'axis';
  onViewChange: (v: 'list' | 'axis') => void;
  onSelectRoom: (room: OperatingRoom) => void;
  getRemainingTime: (room: OperatingRoom) => string;
}

// --- Pomocné funkce -----------------------------------------------------------

const parseTimeToDate = (timeString: string, ref: Date): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/** Window start = 7:00 dnešního (nebo včerejšího) dne podle currentTime. */
const getWindowStart = (currentTime: Date): Date => {
  const w = new Date(currentTime);
  w.setHours(TIMELINE_START_HOUR, 0, 0, 0);
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    w.setDate(w.getDate() - 1);
  }
  return w;
};

const toAxisPercent = (date: Date, windowStart: Date): number => {
  const diffH = (date.getTime() - windowStart.getTime()) / (1000 * 60 * 60);
  return (diffH / TIMELINE_HOURS) * 100;
};

/** Získej start a end pro operaci v sále, pokud jsou dostupné. */
function getRoomRange(
  room: OperatingRoom,
  windowStart: Date,
): { start: Date; end: Date } | null {
  const startStr = room.currentProcedure?.startTime;
  let start: Date | null = null;
  if (startStr) start = parseTimeToDate(startStr, windowStart);

  let end: Date | null = null;
  if (room.estimatedEndTime) {
    end = new Date(room.estimatedEndTime);
  } else if (start && room.currentProcedure?.estimatedDuration) {
    end = new Date(start.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
  }

  if (!start || !end) return null;
  return { start, end };
}

// --- Komponenta ---------------------------------------------------------------

const MobileTimelineView: React.FC<Props> = ({
  rooms,
  statusByOrderIndex,
  activeStatuses,
  currentTime,
  stats,
  mobileView,
  onViewChange,
  onSelectRoom,
  getRemainingTime,
}) => {
  const windowStart = useMemo(() => getWindowStart(currentTime), [currentTime]);
  const nowPercent = useMemo(() => {
    const pct = toAxisPercent(currentTime, windowStart);
    return Math.max(0, Math.min(100, pct));
  }, [currentTime, windowStart]);

  const totalSteps = activeStatuses.length || 1;

  const kpis = [
    { label: 'Aktivní', value: stats.operations, color: C.green, icon: Activity },
    { label: 'Úklid', value: stats.cleaning, color: C.orange, icon: Sparkles },
    { label: 'Volné', value: stats.free, color: C.accent, icon: Stethoscope },
    { label: 'Dnes', value: stats.completed, color: C.purple, icon: CheckCircle2 },
    ...(stats.emergencyCount > 0
      ? [{ label: 'Emergency', value: stats.emergencyCount, color: C.red, icon: AlertTriangle } as const]
      : []),
  ];

  return (
    <>
      {/* Mobile background — modern glass-morphism */}
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, #0a1525 0%, #050d18 45%, #000810 100%)',
        }}
      />
      {/* Ambient cyan glow - enhanced */}
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 60%)` }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${C.green} 0%, transparent 60%)` }}
        />
      </div>

      <div
        className="md:hidden h-full w-full overflow-y-auto hide-scrollbar relative"
        style={{
          zIndex: 1,
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex flex-col gap-5 px-5 pt-5">
        {/* Header */}
        <MobileHeader
          kicker="Časová osa"
          title="Přehled sálů"
          right={
            <div
              className="text-right rounded-xl px-3 py-1.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 leading-none">
                Čas
              </p>
              <p className="text-sm font-semibold text-white tabular-nums mt-1">
                {currentTime.toLocaleTimeString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          }
        />

        {/* KPI chipy - enhanced design */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {kpis.map((k, idx) => {
            const Icon = k.icon;
            return (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2.5 shrink-0 rounded-2xl px-4 py-3"
                style={{
                  background: `linear-gradient(135deg, ${k.color}12 0%, ${C.surface} 100%)`,
                  border: `1px solid ${k.color}30`,
                  backdropFilter: 'blur(16px)',
                  boxShadow: `0 4px 20px rgba(0,0,0,0.2), 0 0 20px ${k.color}10`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ 
                    background: `${k.color}20`, 
                    border: `1px solid ${k.color}40`,
                    boxShadow: `0 0 12px ${k.color}20`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: k.color }} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: C.muted }}>
                    {k.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Toggle Seznam / Osa */}
        <MobilePillTabs
          tabs={[
            { id: 'list', label: 'Seznam' },
            { id: 'axis', label: 'Osa' },
          ]}
          value={mobileView}
          onChange={onViewChange}
        />

        {mobileView === 'list' ? (
          /* ---------- SEZNAM ---------- */
          <>
            <MobileSectionLabel>Sály ({rooms.length})</MobileSectionLabel>
            <div className="flex flex-col gap-3">
              {rooms.map(room => {
                const step = statusByOrderIndex[room.currentStepIndex];
                const color =
                  room.isEmergency
                    ? '#EF4444'
                    : room.isLocked
                      ? '#FBBF24'
                      : step?.accent_color || step?.color || '#6B7280';
                const statusName = step?.title || step?.name || 'Status';
                const remaining = getRemainingTime(room);
                const stepIndex = room.currentStepIndex;
                const isFree = stepIndex >= totalSteps - 1;
                const progress = ((stepIndex + 1) / totalSteps) * 100;

                return (
                  <MobileCard
                    key={room.id}
                    accent={color}
                    onClick={() => onSelectRoom(room)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: color,
                              boxShadow: `0 0 8px ${color}aa`,
                            }}
                          />
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 leading-none truncate">
                            {statusName}
                          </p>
                        </div>
                        <h3 className="text-lg font-semibold text-white leading-tight truncate">
                          {room.name}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        {isFree ? (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Volný
                          </span>
                        ) : remaining ? (
                          <>
                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 leading-none">
                              Zbývá
                            </p>
                            <p
                              className="text-sm font-semibold tabular-nums mt-1"
                              style={{ color }}
                            >
                              {remaining}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Pills row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {room.isEmergency && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          Emergency
                        </span>
                      )}
                      {room.isLocked && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                          Uzamčen
                        </span>
                      )}
                      {room.isPaused && !room.isEmergency && !room.isLocked && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                          Pauza
                        </span>
                      )}
                      {room.staff?.doctor?.name && (
                        <span className="text-[11px] text-white/60 truncate">
                          {room.staff.doctor.name}
                        </span>
                      )}
                    </div>

                    {/* Progress - enhanced */}
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: C.surface2 }}
                    >
                      <motion.div
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', stiffness: 180, damping: 28 }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${color} 0%, ${color}bb 100%)`,
                          boxShadow: `0 0 16px ${color}50`,
                        }}
                      />
                    </div>

                    {/* Footer */}
                    {room.estimatedEndTime && !isFree && (
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-white/40">Plánované ukončení</span>
                        <span className="text-white/80 font-medium tabular-nums">
                          {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </MobileCard>
                );
              })}
            </div>
          </>
        ) : (
          /* ---------- OSA ---------- */
          <AxisView
            rooms={rooms}
            statusByOrderIndex={statusByOrderIndex}
            activeStatuses={activeStatuses}
            currentTime={currentTime}
            windowStart={windowStart}
            nowPercent={nowPercent}
            onSelectRoom={onSelectRoom}
          />
        )}
      </div>
      </div>
    </>
  );
};

// --- Axis (horizontální 24h osa) ---------------------------------------------

const AxisView: React.FC<{
  rooms: OperatingRoom[];
  statusByOrderIndex: Record<number, WorkflowStatus | undefined>;
  activeStatuses: WorkflowStatus[];
  currentTime: Date;
  windowStart: Date;
  nowPercent: number;
  onSelectRoom: (room: OperatingRoom) => void;
}> = ({
  rooms,
  statusByOrderIndex,
  activeStatuses,
  currentTime,
  windowStart,
  nowPercent,
  onSelectRoom,
}) => {
  // Živé barvy statusů z DB (stejně jako desktop Timeline)
  const stepColorMap: Record<number, string> = {};
  activeStatuses.forEach((s) => {
    stepColorMap[s.order_index] = s.accent_color || s.color || '#6b7280';
  });
  const LABEL_W = 76; // px — šířka levého sloupce s názvem sálu
  const anchorStartMs = windowStart.getTime();
  const anchorEndMs = anchorStartMs + TIMELINE_HOURS * 60 * 60 * 1000;
  const nowMs = currentTime.getTime();

  // --- Chytrý zoom: najdi skutečné aktivní okno dne, ať jsou segmenty velké ---
  let activityStart = Infinity;
  let activityEnd = -Infinity;
  rooms.forEach((room) => {
    const history = room.statusHistory || [];
    if (history.length > 0) {
      const first = new Date(history[0].startedAt).getTime();
      const last = new Date(history[history.length - 1].startedAt).getTime();
      activityStart = Math.min(activityStart, first);
      activityEnd = Math.max(activityEnd, Math.max(last, nowMs));
    } else {
      const range = getRoomRange(room, windowStart);
      if (range) {
        activityStart = Math.min(activityStart, range.start.getTime());
        activityEnd = Math.max(activityEnd, range.end.getTime());
      }
    }
  });

  // Fallback, když není žádná aktivita: okno kolem „teď".
  if (!isFinite(activityStart) || !isFinite(activityEnd)) {
    activityStart = nowMs - 2 * 60 * 60 * 1000;
    activityEnd = nowMs + 2 * 60 * 60 * 1000;
  }

  // Vždy zahrň „teď" + 30 min odsazení po stranách.
  const PAD = 30 * 60 * 1000;
  let viewStartMs = Math.min(activityStart, nowMs) - PAD;
  let viewEndMs = Math.max(activityEnd, nowMs) + PAD;

  // Drž se uvnitř 7:00–7:00 kotvy.
  viewStartMs = Math.max(anchorStartMs, viewStartMs);
  viewEndMs = Math.min(anchorEndMs, viewEndMs);

  // Minimální rozsah okna ~4 h, ať jsou segmenty čitelné.
  const MIN_SPAN = 4 * 60 * 60 * 1000;
  if (viewEndMs - viewStartMs < MIN_SPAN) {
    const center = (viewStartMs + viewEndMs) / 2;
    viewStartMs = center - MIN_SPAN / 2;
    viewEndMs = center + MIN_SPAN / 2;
    if (viewStartMs < anchorStartMs) {
      viewStartMs = anchorStartMs;
      viewEndMs = anchorStartMs + MIN_SPAN;
    }
    if (viewEndMs > anchorEndMs) {
      viewEndMs = anchorEndMs;
      viewStartMs = anchorEndMs - MIN_SPAN;
    }
  }

  const viewSpanMs = viewEndMs - viewStartMs;
  const pctOf = (ms: number) => ((ms - viewStartMs) / viewSpanMs) * 100;
  const nowPct = Math.max(0, Math.min(100, pctOf(nowMs)));

  // --- Hodinové popisky uvnitř okna, adaptivní krok ---
  const spanHours = viewSpanMs / (60 * 60 * 1000);
  const step = Math.max(1, Math.ceil(spanHours / 6)); // ~6 popisků na šířku
  const hourMarks: { ms: number; label: string }[] = [];
  const firstMark = new Date(viewStartMs);
  firstMark.setMinutes(0, 0, 0);
  if (firstMark.getTime() < viewStartMs) firstMark.setHours(firstMark.getHours() + 1);
  while (firstMark.getHours() % step !== 0) firstMark.setHours(firstMark.getHours() + 1);
  for (let t = firstMark.getTime(); t <= viewEndMs; t += step * 60 * 60 * 1000) {
    const d = new Date(t);
    hourMarks.push({ ms: t, label: `${d.getHours().toString().padStart(2, '0')}:00` });
  }

  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <MobileSectionLabel className="mb-3">
        Provoz · {fmt(viewStartMs)} – {fmt(viewEndMs)} · teď {fmt(nowMs)}
      </MobileSectionLabel>
      <div
        className="rounded-3xl p-3 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Pravítko hodin — vejde se na šířku, žádné rolování */}
        <div className="flex items-end mb-1.5">
          <div className="shrink-0 pr-2" style={{ width: LABEL_W }} />
          <div className="flex-1 relative h-4">
            {hourMarks.map((m) => (
              <span
                key={m.ms}
                className="absolute -translate-x-1/2 text-[9px] tabular-nums text-white/55 font-medium"
                style={{ left: `${pctOf(m.ms)}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Řady sálů — celý den vměstnaný na šířku */}
        <div className="flex flex-col gap-1.5">
          {rooms.map((room) => {
            const currentStep = statusByOrderIndex[room.currentStepIndex];
            const currentColor =
              room.isEmergency
                ? '#EF4444'
                : room.isLocked
                  ? '#FBBF24'
                  : currentStep?.accent_color || currentStep?.color || '#6B7280';

            // Segmenty statusů z historie, omezené na dynamické okno provozu.
            const history = room.statusHistory || [];

            type Segment = { leftPct: number; widthPct: number; color: string; isCurrent: boolean };
            const segments: Segment[] = [];

            if (history.length > 0) {
              history.forEach((entry, idx) => {
                const segStartRaw = new Date(entry.startedAt).getTime();
                const nextEntry = history[idx + 1];
                const isCurrent = idx === history.length - 1;
                const segEndRaw = nextEntry ? new Date(nextEntry.startedAt).getTime() : nowMs;
                const segStart = Math.max(segStartRaw, viewStartMs);
                const segEnd = Math.min(segEndRaw, viewEndMs);
                if (segEnd <= segStart) return;
                const leftPct = pctOf(segStart);
                const widthPct = ((segEnd - segStart) / viewSpanMs) * 100;
                if (widthPct <= 0) return;
                const phaseColor = stepColorMap[entry.stepIndex] || entry.color || '#6b7280';
                segments.push({ leftPct: Math.max(0, leftPct), widthPct: Math.max(0.6, widthPct), color: phaseColor, isCurrent });
              });
            } else {
              const range = getRoomRange(room, windowStart);
              if (range) {
                const segStart = Math.max(range.start.getTime(), viewStartMs);
                const segEnd = Math.min(range.end.getTime(), viewEndMs);
                if (segEnd > segStart) {
                  segments.push({
                    leftPct: pctOf(segStart),
                    widthPct: ((segEnd - segStart) / viewSpanMs) * 100,
                    color: currentColor,
                    isCurrent: true,
                  });
                }
              }
            }

            const isActive = segments.length > 0;

            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="flex items-center gap-0 outline-none active:opacity-80 transition-opacity w-full"
              >
                {/* Název sálu (pevný levý sloupec) */}
                <div className="shrink-0 pr-2 text-left flex items-center gap-1.5" style={{ width: LABEL_W }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: currentColor, boxShadow: `0 0 6px ${currentColor}99` }}
                  />
                  <span className="text-[10px] font-semibold text-white/90 truncate leading-tight">
                    {room.name}
                  </span>
                </div>

                {/* Dráha — celých 24 h na šířku */}
                <div
                  className="flex-1 relative rounded-md overflow-hidden"
                  style={{ height: 30, background: 'rgba(255,255,255,0.025)' }}
                >
                  {/* hodinová mřížka */}
                  {hourMarks.map((m) => (
                    <div
                      key={m.ms}
                      className="absolute top-0 bottom-0 w-px"
                      style={{ left: `${pctOf(m.ms)}%`, background: 'rgba(255,255,255,0.06)' }}
                    />
                  ))}
                  {/* segmenty statusů */}
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="absolute top-1 bottom-1 rounded-[3px]"
                      style={{
                        left: `${seg.leftPct}%`,
                        width: `${seg.widthPct}%`,
                        background: seg.isCurrent
                          ? `linear-gradient(180deg, ${seg.color} 0%, ${seg.color}cc 100%)`
                          : `${seg.color}cc`,
                        boxShadow: seg.isCurrent ? `0 0 8px ${seg.color}55` : 'none',
                      }}
                    />
                  ))}
                  {/* prázdný sál — jemný text */}
                  {!isActive && (
                    <span className="absolute inset-0 flex items-center pl-2 text-[9px] text-white/25 pointer-events-none">
                      volný
                    </span>
                  )}
                  {/* linka „teď" — oranžová jako na desktopu */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px]"
                    style={{ left: `${nowPct}%`, background: '#FF9800' }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* legenda času pod osou */}
        <div className="flex items-center justify-between mt-2 px-1" style={{ paddingLeft: LABEL_W }}>
          <span className="text-[8px] text-white/30 tabular-nums">{fmt(viewStartMs)}</span>
          <span className="text-[8px] font-semibold tabular-nums" style={{ color: '#FF9800' }}>
            teď {fmt(nowMs)}
          </span>
          <span className="text-[8px] text-white/30 tabular-nums">{fmt(viewEndMs)}</span>
        </div>
      </div>
    </div>
  );
};

export default MobileTimelineView;
