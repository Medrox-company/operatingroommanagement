'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OperatingRoom } from '../../types';
import {
  MobileHeader,
  MobileCard,
  MobilePillTabs,
  MobileSectionLabel,
} from './MobileShell';
import { Activity, Stethoscope, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

/* =============================================================================
   MobileTimelineView
   Mobilní redesign "Časové osy". Obsahuje dvě zobrazení přes pill toggle:
   - "Seznam" — karty s barvou statusu, progress barem a zbývajícím časem
   - "Osa"    — horizontálně scrollovatelná 24h timeline (7:00–7:00)
   Barvy stavů se čerpají ŽIVĚ z `statusByOrderIndex` (DB → modul Statusy).
   ========================================================================== */

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
    { label: 'Aktivní', value: stats.operations, color: '#22C55E', icon: Activity },
    { label: 'Úklid', value: stats.cleaning, color: '#F97316', icon: Sparkles },
    { label: 'Volné', value: stats.free, color: '#22D3EE', icon: Stethoscope },
    { label: 'Dnes', value: stats.completed, color: '#6366F1', icon: CheckCircle2 },
    ...(stats.emergencyCount > 0
      ? [{ label: 'Emergency', value: stats.emergencyCount, color: '#EF4444', icon: AlertTriangle } as const]
      : []),
  ];

  return (
    <>
      {/* Mobile background — unified with RoomDetail / NotificationOverlay */}
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
        }}
      />
      {/* Ambient cyan glow */}
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 65%)' }}
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

        {/* KPI chipy */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="flex items-center gap-2.5 shrink-0 rounded-2xl px-3.5 py-2.5"
                style={{
                  background: `linear-gradient(135deg, ${k.color}14 0%, rgba(255,255,255,0.02) 100%)`,
                  border: `1px solid ${k.color}33`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${k.color}22` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: k.color }} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 leading-none">
                    {k.label}
                  </p>
                  <p className="text-base font-semibold text-white tabular-nums">{k.value}</p>
                </div>
              </div>
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

                    {/* Progress */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <motion.div
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', stiffness: 180, damping: 28 }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${color} 0%, ${color}aa 100%)`,
                          boxShadow: `0 0 12px ${color}55`,
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
  windowStart: Date;
  nowPercent: number;
  onSelectRoom: (room: OperatingRoom) => void;
}> = ({ rooms, statusByOrderIndex, windowStart, nowPercent, onSelectRoom }) => {
  const hours = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i);

  return (
    <div>
      <MobileSectionLabel className="mb-3">24 h přehled (7:00 – 7:00)</MobileSectionLabel>
      <div
        className="rounded-3xl p-3 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Hlavička os — sticky left label + scrollable ruler */}
        <div className="flex">
          {/* Left spacer to align with rows below */}
          <div className="shrink-0 w-20 pr-3" />
          <div className="flex-1 overflow-x-auto hide-scrollbar" id="mobile-axis-scroll">
            <div
              className="relative"
              style={{ width: `${AXIS_WIDTH}px`, height: '18px' }}
            >
              {hours.map(h => {
                const pct = (h / TIMELINE_HOURS) * 100;
                const display = (TIMELINE_START_HOUR + h) % 24;
                const isMajor = h % 3 === 0;
                return (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                  >
                    <span
                      className={`text-[9px] tabular-nums ${
                        isMajor ? 'text-white/60 font-medium' : 'text-white/20'
                      }`}
                    >
                      {display.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Řady sálů */}
        <div className="flex flex-col gap-2 mt-2">
          {rooms.map(room => {
            const step = statusByOrderIndex[room.currentStepIndex];
            const color =
              room.isEmergency
                ? '#EF4444'
                : room.isLocked
                  ? '#FBBF24'
                  : step?.accent_color || step?.color || '#6B7280';
            const range = getRoomRange(room, windowStart);

            let barStyle: React.CSSProperties | null = null;
            if (range) {
              const leftPct = Math.max(0, toAxisPercent(range.start, windowStart));
              const endPct = Math.min(100, toAxisPercent(range.end, windowStart));
              const width = Math.max(0, endPct - leftPct);
              if (width > 0) {
                barStyle = {
                  left: `${leftPct}%`,
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                  boxShadow: `0 0 12px ${color}66`,
                };
              }
            }

            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="flex items-center outline-none active:opacity-80 transition-opacity"
              >
                {/* Left sticky label */}
                <div className="shrink-0 w-20 pr-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}99`,
                      }}
                    />
                    <span className="text-[11px] font-semibold text-white truncate">
                      {room.name}
                    </span>
                  </div>
                </div>
                {/* Bar track */}
                <div
                  className="flex-1 overflow-x-auto hide-scrollbar"
                  // sync scroll s hlavičkou: shared scroll container style
                >
                  <div
                    className="relative"
                    style={{ width: `${AXIS_WIDTH}px`, height: '28px' }}
                  >
                    {/* Subtle hourly grid */}
                    {hours.map(h => (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${(h / TIMELINE_HOURS) * 100}%`,
                          width: '1px',
                          background:
                            h % 3 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        }}
                      />
                    ))}
                    {/* Operation bar */}
                    {barStyle && (
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-md"
                        style={barStyle}
                      />
                    )}
                    {/* Now marker */}
                    <div
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${nowPercent}%`,
                        width: '2px',
                        background: '#FFFFFF',
                        boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-white/40 text-center">
          Posuňte prstem vodorovně pro zobrazení celé 24 h osy.
        </p>
      </div>
    </div>
  );
};

export default MobileTimelineView;
