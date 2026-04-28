import React, { memo, useMemo } from 'react';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { Biohazard, AlertCircle, Lock, Phone, BedDouble } from 'lucide-react';

/**
 * INDUSTRIAL CONTROL ROOM CARD — Siemens SaaS aesthetic.
 *
 * Layout (zhora dolů):
 *   1. Top bar — UNIT.ID kód (mono) + LIVE indikátor + dept tag
 *   2. Status row — barevný hairline-bordered status pill
 *   3. Hero metric — velké mono číslo (počet operací dnes) + label
 *   4. Telemetry grid — 2 sloupce: ETA / FÁZE
 *   5. Crew row — lékař + sestra (mono jména)
 *   6. Action bar — emergency / lock toggly + indikátory
 *
 * Žádné rounded blobs, žádné gradients, žádné glassmorph aura efekty.
 * Pure black surface + 1px hairlines + sharp 4px radius. Color jen jako accent.
 */

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onClick, onEmergency, onLock }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses || [];

  /* Today's operation count — okno 7:00 dneska → 6:59 zítra (nebo včera→dneska) */
  const todayOperationCount = useMemo(() => {
    if (!room.completedOperations || room.completedOperations.length === 0) return 0;

    const now = new Date();
    const startOfWindow = new Date(now);
    if (now.getHours() >= 7) {
      startOfWindow.setHours(7, 0, 0, 0);
    } else {
      startOfWindow.setDate(startOfWindow.getDate() - 1);
      startOfWindow.setHours(7, 0, 0, 0);
    }
    const endOfWindow = new Date(startOfWindow);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(6, 59, 59, 999);

    return room.completedOperations.filter(op => {
      if (!op.endedAt) return false;
      const opEnd = new Date(op.endedAt);
      return opEnd >= startOfWindow && opEnd <= endOfWindow;
    }).length;
  }, [room.completedOperations]);

  const { currentStep, themeColor, progressPct, shouldShowTime, statusKey } = useMemo(() => {
    const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
    const safeIndex = Math.min(Math.max(0, room.currentStepIndex || 0), totalSteps - 1);
    const step = activeStatuses[safeIndex] || null;

    const currentStep = {
      title: step?.title || step?.name || 'Status',
      color: step?.accent_color || step?.color || '#00D4FF',
    };

    const themeColor = room.isEmergency
      ? 'hsl(var(--critical))'
      : (room.isLocked
          ? 'hsl(var(--warning))'
          : (room.isPaused ? 'hsl(var(--accent))' : currentStep.color));

    const progressPct = ((safeIndex + 1) / totalSteps) * 100;

    const statusName = (step?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isReadyStatus = statusName.includes('priprav');
    const isCleaningStatus = statusName.includes('uklid');
    const shouldShowTime = !isReadyStatus && !isCleaningStatus;

    const statusKey: 'emergency' | 'locked' | 'paused' | 'ready' | 'active' = room.isEmergency
      ? 'emergency'
      : room.isLocked
        ? 'locked'
        : room.isPaused
          ? 'paused'
          : isReadyStatus
            ? 'ready'
            : 'active';

    return { currentStep, themeColor, progressPct, shouldShowTime, statusKey };
  }, [activeStatuses, room.currentStepIndex, room.isEmergency, room.isLocked, room.isPaused]);

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  /* Unit ID — technical identifier z room.id (např. „or-001" → „OR-001") */
  const unitId = useMemo(() => {
    const id = (room.id || '').toString();
    const parts = id.split('-');
    if (parts.length >= 2) {
      return `${parts[0].toUpperCase()}-${parts[1].padStart(3, '0').slice(-3)}`;
    }
    const num = id.replace(/\D/g, '').padStart(3, '0').slice(-3);
    return `OR-${num}`;
  }, [room.id]);

  /* Border accent — emergency/locked posunují border na color, jinak hairline */
  const borderClass = statusKey === 'emergency'
    ? 'border-critical/60'
    : statusKey === 'locked'
      ? 'border-warning/50'
      : 'border-hairline-strong hover:border-accent/40';

  const statusLabel = statusKey === 'emergency'
    ? 'STAV NOUZE'
    : statusKey === 'locked'
      ? 'UZAMČEN'
      : statusKey === 'paused'
        ? 'PAUZA'
        : currentStep.title;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={`relative cursor-pointer h-[260px] sm:h-[300px] w-full bg-panel border ${borderClass} transition-colors group focus:outline-none focus-visible:ring-1 focus-visible:ring-accent`}
    >
      {/* Top hairline accent — color barva podle stavu, sharp top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-colors"
        style={{ backgroundColor: themeColor, opacity: statusKey === 'active' ? 0.4 : 0.9 }}
        aria-hidden
      />

      {/* Critical/Locked subtle inset glow — extrémně decentní, jen pro alarmové stavy */}
      {(statusKey === 'emergency' || statusKey === 'locked') && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: `inset 0 0 24px ${themeColor}22` }}
          aria-hidden
        />
      )}

      <div className="relative h-full w-full flex flex-col">

        {/* ── 1. Top bar: UNIT.ID + LIVE indikátor + dept ─────────── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-1.5 h-1.5 shrink-0"
              style={{
                backgroundColor: themeColor,
                animation: statusKey === 'active' || statusKey === 'emergency' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
              }}
              aria-hidden
            />
            <span className="font-mono text-[10px] tracking-[0.18em] text-foreground uppercase truncate">
              {unitId}
            </span>
            <span className="hidden sm:inline font-mono text-[9px] tracking-[0.15em] text-foreground-faint">
              ·
            </span>
            <span className="hidden sm:inline font-mono text-[9px] tracking-[0.18em] text-foreground-dim uppercase truncate">
              {room.department}
            </span>
          </div>
          {room.isSeptic && (
            <Biohazard className="w-3 h-3 text-critical shrink-0" aria-label="Septický" />
          )}
        </div>

        {/* ── 2. Room name (hlavní identifier) ─────────────────────── */}
        <div className="px-3 pt-3 pb-2">
          <h3 className="font-sans text-base sm:text-xl font-light tracking-tight text-foreground truncate leading-tight">
            {room.name}
          </h3>
        </div>

        {/* ── 3. Hero metric block: dnešní operace / pauza ─────────── */}
        <div className="flex-1 flex items-center justify-between px-3 min-h-0 gap-3">
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[9px] tracking-[0.2em] text-foreground-dim uppercase mb-0.5">
              {statusKey === 'paused' ? 'STAV' : 'DNES / OPS'}
            </span>
            <span
              className="font-mono text-[44px] sm:text-[56px] font-light leading-none tabular-nums"
              style={{ color: statusKey === 'paused' ? themeColor : 'hsl(var(--foreground))' }}
            >
              {statusKey === 'paused' ? 'P' : String(todayOperationCount).padStart(2, '0')}
            </span>
          </div>

          {/* Progress meter — vertikální stripes (Siemens-style) */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-mono text-[9px] tracking-[0.2em] text-foreground-dim uppercase">
              FÁZE
            </span>
            <div className="flex items-end gap-[3px] h-10">
              {Array.from({ length: Math.max(activeStatuses.length, 1) }).map((_, i) => {
                const reached = ((i + 1) / Math.max(activeStatuses.length, 1)) * 100 <= progressPct;
                return (
                  <div
                    key={i}
                    className="w-1 transition-colors"
                    style={{
                      height: `${20 + (i % 3) * 10}px`,
                      backgroundColor: reached ? themeColor : 'hsl(var(--border-strong))',
                      opacity: reached ? 1 : 0.5,
                    }}
                    aria-hidden
                  />
                );
              })}
            </div>
            <span className="font-mono text-[10px] font-medium tabular-nums text-foreground-muted">
              {Math.round(progressPct)}%
            </span>
          </div>
        </div>

        {/* ── 4. Telemetry row: ETA + STATUS ───────────────────────── */}
        <div className="grid grid-cols-2 border-t border-hairline divide-x divide-hairline">
          <div className="px-3 py-2">
            <div className="font-mono text-[9px] tracking-[0.2em] text-foreground-dim uppercase mb-0.5">
              ETA
            </div>
            <div className="font-mono text-sm font-medium tabular-nums text-foreground">
              {room.estimatedEndTime && shouldShowTime
                ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                : '——:——'}
            </div>
          </div>
          <div className="px-3 py-2 min-w-0">
            <div className="font-mono text-[9px] tracking-[0.2em] text-foreground-dim uppercase mb-0.5">
              STATUS
            </div>
            <div
              className="font-sans text-[11px] font-medium tracking-tight uppercase truncate"
              style={{ color: themeColor }}
              title={statusLabel}
            >
              {statusLabel}
            </div>
          </div>
        </div>

        {/* ── 5. Crew row + action bar ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-hairline">
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[9px] tracking-[0.2em] text-foreground-dim uppercase">
              CREW
            </span>
            <span className="font-sans text-[11px] font-medium text-foreground truncate">
              {room?.staff?.doctor?.name?.split(' ').pop() || '——'}
              {room?.staff?.nurse?.name && (
                <span className="text-foreground-dim"> · {room.staff.nurse.name.split(' ').pop()}</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {room.patientCalledAt && !room.patientArrivedAt && (
              <div className="p-1 border border-accent/40 bg-accent-soft" title="Pacient volán">
                <Phone className="w-3 h-3 text-accent" />
              </div>
            )}
            {room.patientArrivedAt && (
              <div className="p-1 border border-success/40" style={{ backgroundColor: 'hsla(142, 70%, 45%, 0.12)' }} title="Pacient na sále">
                <BedDouble className="w-3 h-3 text-success" />
              </div>
            )}
            <button
              onClick={(e) => handleAction(e, onEmergency)}
              aria-label={room.isEmergency ? 'Zrušit stav nouze' : 'Vyhlásit stav nouze'}
              className={`p-1 border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-critical
                ${room.isEmergency
                  ? 'border-critical bg-critical text-background'
                  : 'border-hairline-strong text-foreground-dim hover:text-critical hover:border-critical/60'}
              `}
            >
              <AlertCircle className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleAction(e, onLock)}
              aria-label={room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'}
              className={`p-1 border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-warning
                ${room.isLocked
                  ? 'border-warning bg-warning text-background'
                  : 'border-hairline-strong text-foreground-dim hover:text-warning hover:border-warning/60'}
              `}
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.room === next.room);

RoomCard.displayName = 'RoomCard';

export default RoomCard;
