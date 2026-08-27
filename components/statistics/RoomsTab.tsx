/**
 * RoomsTab — Detailní přehled operačních sálů ve statistikách.
 *
 * Zobrazuje:
 *   • Souhrnné KPI karty (obsazeno/volno/úklid/údržba)
 *   • Využití per sál (bar chart + radial gauges)
 *   • Status breakdown per sál (stacked bar)
 *   • Interaktivní karty sálů s detaily
 *   • Porovnávací tabulka výkonu
 */

'use client';

import React, { useMemo, useState, memo } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight,
  LayoutGrid, List, TrendingUp, Sparkles
} from 'lucide-react';

import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card,
  formatMinutes, formatPercent, formatNumber
} from './shared';
// Čitelné grafy v jazyce aplikace (stejné jako v záložce Přehled)
import { InsightPanel } from './AppCharts';
import type { InsightItem } from './AppCharts';
import type { IconComponent } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Props
// ─────────────────────────────────────────────────────────────────────────────
// Stejný Period typ jako v StatisticsModule — česká jména
type Period = 'den' | 'týden' | 'měsíc' | 'rok';
type ViewMode = 'grid' | 'list';

export interface RoomsTabProps {
  rooms: OperatingRoom[];
  statusHistory: StatusHistoryRow[];
  periodLabel: Period;
  onRoomSelect?: (room: OperatingRoom) => void;
  calculateRoomUtilization: (room: OperatingRoom, history: StatusHistoryRow[], period: Period) => number;
  countOperationsInWorkingHours: (room: OperatingRoom, history: StatusHistoryRow[], period: Period) => number;
  workflowSteps: Array<{ title: string; color: string }>;
}

const ROOM_CARD_CLASS = '!rounded-xl [background:var(--stats-surface)!important] [box-shadow:none!important]';
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Vrátí pouze část intervalu, která leží v nastavené pracovní době sálu. */
function roomWorkingOverlapSeconds(room: OperatingRoom, start: Date, end: Date): number {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;

  let seconds = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const schedule = room.weeklySchedule?.[DAY_KEYS[cursor.getDay()]];
    if (schedule?.enabled) {
      const workStart = new Date(cursor);
      workStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);
      const workEnd = new Date(cursor);
      workEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);
      const overlapStart = Math.max(startMs, workStart.getTime());
      const overlapEnd = Math.min(endMs, workEnd.getTime());
      if (overlapEnd > overlapStart) seconds += (overlapEnd - overlapStart) / 1_000;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return seconds;
}

/** Stejná kruhová vizualizace, jakou používá záložka Fáze. */
const CyclePhaseRing: React.FC<{
  label: string;
  percentage: number;
  color: string;
}> = ({ label, percentage, color }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(100, percentage)) / 100 * circumference;

  return (
    <div className="flex w-[126px] shrink-0 flex-col items-center text-center">
      <div className="relative h-[112px] w-[112px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke={C.ghost} strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-light tabular-nums" style={{ color: C.textHi }}>{Math.round(percentage)}</span>
          <span className="text-[8px] uppercase tracking-wider" style={{ color: C.muted }}>%</span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[30px] text-[10px] font-semibold leading-4" style={{ color: C.textHi }}>{label}</p>
      <p className="mt-0.5 text-[9px]" style={{ color }}>podíl cyklu</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Status badge mini chip */
const StatusBadge = memo(({ status, color }: { status: string; color: string }) => (
  <div
    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]"
    style={{ background: `${color}10`, color, border: `1px solid ${color}28` }}
  >
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    {status}
  </div>
));
StatusBadge.displayName = 'StatusBadge';

/** Kompaktní karta sálu ve stejném stylu jako finanční a notifikační dlaždice. */
const RoomCard = memo(({
  room,
  utilization,
  opsCount,
  avgOpTime,
  onClick,
}: {
  room: OperatingRoom;
  utilization: number;
  opsCount: number;
  avgOpTime: number | null;
  onClick: () => void;
}) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'volny': { label: 'Volný', color: C.green },
    'obsazeny': { label: 'Obsazený', color: C.orange },
    'uklid': { label: 'Úklid', color: C.accent },
    'udrzba': { label: 'Údržba', color: C.faint },
    'priprava': { label: 'Příprava', color: C.yellow },
  };
  const st = statusMap[room.status ?? 'volny'] ?? { label: room.status ?? 'Neznámý', color: C.muted };

  const utilColor = utilization >= 80 ? C.green : utilization >= 50 ? C.yellow : utilization > 0 ? C.orange : C.muted;

  return (
    <button type="button" onClick={onClick} className="w-full cursor-pointer text-left group">
      <Card className={`relative h-full overflow-hidden p-4 ${ROOM_CARD_CLASS}`}>
        <span className="absolute inset-x-4 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${utilColor}, transparent)` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em]" style={{ color: C.muted }}>Operační sál</p>
            <h3 className="mt-1 truncate text-[14px] font-semibold leading-tight" style={{ color: C.textHi }}>{room.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={st.label} color={st.color} />
              {room.isSeptic && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">SEP</span>
              )}
              {room.isEmergency && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">URG</span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[26px] font-light leading-none tabular-nums" style={{ color: C.textHi }}>{Math.round(utilization)}<span className="ml-0.5 text-[11px]" style={{ color: utilColor }}>%</span></p>
            <p className="mt-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: C.faint }}>využití</p>
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: C.ghost }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, utilization)}%`, background: utilColor }} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {[
            ['Výkony', String(opsCount)],
            ['Prům. čas', avgOpTime === null ? '—' : formatMinutes(avgOpTime)],
            ['Fronta', `${room.queueCount ?? 0} pac.`],
            ['Sazba', room.hourlyOperatingCost ? `${formatNumber(room.hourlyOperatingCost, 0)} Kč/h` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
              <p className="text-[8px] uppercase tracking-[0.08em]" style={{ color: C.faint }}>{label}</p>
              <p className="mt-1 truncate text-[10px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2 text-[10px] font-semibold" style={{ color: C.accent, borderColor: C.ghost }}>
          <span>Detail</span>
          <ChevronRight size={12} />
        </div>
      </Card>
    </button>
  );
});
RoomCard.displayName = 'RoomCard';

/** Summary KPI card */
const SummaryKPI = memo(({
  label, value, total, color, icon: Icon
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: IconComponent;
}) => {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="group relative min-h-[112px] overflow-hidden rounded-xl p-4" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
      <span className="absolute inset-x-4 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="flex min-h-[44px] items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium" style={{ color: C.textHi }}>{label}</p>
          <p className="mt-1 truncate text-[10px]" style={{ color: C.muted }}>{Math.round(pct)} % z {total} sálů</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105" style={{ color, border: `1px solid ${color}35`, background: `${color}0e` }}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 truncate text-[26px] font-light leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
    </div>
  );
});
SummaryKPI.displayName = 'SummaryKPI';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const RoomsTab: React.FC<RoomsTabProps> = memo(({
  rooms,
  statusHistory,
  periodLabel,
  onRoomSelect,
  calculateRoomUtilization,
  countOperationsInWorkingHours,
  workflowSteps,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'operations'>('utilization');

  // ── Status counts ──
  const { busyCount, freeCount, cleanCount, maintCount } = useMemo(() => {
    let busy = 0, free = 0, clean = 0, maint = 0;
    rooms.forEach(r => {
      const s = r.status?.toLowerCase() ?? 'volny';
      if (s === 'obsazeny' || s === 'priprava') busy++;
      else if (s === 'volny') free++;
      else if (s === 'uklid') clean++;
      else maint++;
    });
    return { busyCount: busy, freeCount: free, cleanCount: clean, maintCount: maint };
  }, [rooms]);

  // ── Room data with computed metrics ──
  const roomsData = useMemo(() => {
    return rooms.map(r => {
      const util = calculateRoomUtilization(r, statusHistory, periodLabel);
      const ops = countOperationsInWorkingHours(r, statusHistory, periodLabel);

      // Compute average operation time from history
      const roomHistory = statusHistory.filter(h => h.operating_room_id === r.id);
      const opDurations = roomHistory
        .filter(h => h.step_name === 'Operace' || h.step_name === 'Zákrok')
        .map(h => h.duration_seconds ?? 0);
      const avgOpTime = opDurations.length > 0
        ? (opDurations.reduce((a, b) => a + b, 0) / opDurations.length) / 60
        : null;

      return { room: r, utilization: util, operations: ops, avgOpTime };
    });
  }, [rooms, statusHistory, periodLabel, calculateRoomUtilization, countOperationsInWorkingHours]);

  // ── Sorted rooms ──
  const sortedRooms = useMemo(() => {
    return [...roomsData].sort((a, b) => {
      if (sortBy === 'utilization') return b.utilization - a.utilization;
      if (sortBy === 'operations') return b.operations - a.operations;
      return a.room.name.localeCompare(b.room.name, 'cs');
    });
  }, [roomsData, sortBy]);

  // ── Aggregate stats ──
  const avgUtilization = useMemo(() => {
    if (roomsData.length === 0) return 0;
    return roomsData.reduce((acc, r) => acc + r.utilization, 0) / roomsData.length;
  }, [roomsData]);

  const totalOps = useMemo(() => roomsData.reduce((acc, r) => acc + r.operations, 0), [roomsData]);

  /* ── Doporučení „Co zlepšit a urychlit" — odvozená z reálných dat ── */
  const insights = useMemo<InsightItem[]>(() => {
    const out: InsightItem[] = [];
    if (roomsData.length === 0) return out;

    // 1) Celkové vytížení
    if (avgUtilization >= 80) {
      out.push({
        tone: 'good',
        title: 'Vysoké vytížení',
        text: `Průměr ${Math.round(avgUtilization)} %. Kapacita je téměř vyčerpaná — zvaž rozšíření provozní doby nebo přesun výkonů na méně vytížené sály.`,
      });
    } else if (avgUtilization >= 50) {
      out.push({
        tone: 'info',
        title: 'Dobré vytížení',
        text: `Průměr ${Math.round(avgUtilization)} %. Stále je prostor zařadit kratší výkon na sály pod průměrem.`,
      });
    } else {
      out.push({
        tone: 'warn',
        title: 'Nízké vytížení',
        text: `Průměr ${Math.round(avgUtilization)} %. Sály zůstávají dlouho volné — prověř plánování programu.`,
      });
    }

    // 2) Nejslabší sál
    const weakest = [...roomsData]
      .filter(r => (r.room.status as string | undefined)?.toLowerCase() !== 'udrzba')
      .sort((a, b) => a.utilization - b.utilization)[0];
    if (weakest && weakest.utilization < 50) {
      out.push({
        tone: 'warn',
        title: `Nevyužitý sál: ${weakest.room.name}`,
        text: `Vytížení jen ${Math.round(weakest.utilization)} % při ${weakest.operations} výkonech. Přesun jednoho výkonu z vytíženého sálu vyrovná zátěž.`,
      });
    }

    // 3) Dlouhý průměrný výkon
    const slowest = [...roomsData]
      .filter(r => r.avgOpTime !== null && r.operations > 0)
      .sort((a, b) => (b.avgOpTime ?? 0) - (a.avgOpTime ?? 0))[0];
    if (slowest?.avgOpTime) {
      out.push({
        tone: 'info',
        title: `Nejdelší výkony: ${slowest.room.name}`,
        text: `Průměrná délka ${formatMinutes(slowest.avgOpTime)} na ${slowest.operations} výkonů. Standardizace přípravy a úklidu přinese nejrychlejší zlepšení.`,
      });
    }

    return out.slice(0, 3);
  }, [roomsData, avgUtilization]);

  /**
   * Fáze operačního cyklu — podíl reálného času jednotlivých statusů.
   * Každý uložený interval ořízneme na pracovní dobu příslušného sálu.
   * „Sál připraven" je součástí přehledu, ale mimo pracovní dobu se stejně
   * jako ostatní fáze nezapočítá.
   */
  const phaseRings = useMemo(() => {
    if (!statusHistory || statusHistory.length === 0 || workflowSteps.length === 0) return [];
    const totals: Record<string, number> = {};
    const roomById = new Map(rooms.map(room => [room.id, room]));
    workflowSteps.forEach(s => { totals[s.title] = 0; });
    totals.Pauza = totals.Pauza ?? 0;

    // Pauza má vlastní dvojici databázových událostí pause → resume. Párujeme
    // je po jednotlivých sálech, aby šlo výhradně o reálně zaznamenaný čas.
    const pauseStartByRoom = new Map<string, Date>();
    const pauseIntervalsByRoom = new Map<string, Array<{ start: Date; end: Date }>>();
    const pauseEvents = statusHistory
      .filter(event => (event.event_type === 'pause' || event.event_type === 'resume') && event.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    pauseEvents.forEach(event => {
      const room = roomById.get(event.operating_room_id);
      const timestamp = new Date(event.timestamp);
      if (!room || !Number.isFinite(timestamp.getTime())) return;

      if (event.event_type === 'pause') {
        if (!pauseStartByRoom.has(room.id)) pauseStartByRoom.set(room.id, timestamp);
        return;
      }

      const pauseStart = pauseStartByRoom.get(room.id);
      if (!pauseStart) return;
      const intervals = pauseIntervalsByRoom.get(room.id) ?? [];
      intervals.push({ start: pauseStart, end: timestamp });
      pauseIntervalsByRoom.set(room.id, intervals);
      pauseStartByRoom.delete(room.id);
    });

    // Otevřená pauza je měřitelná do aktuálního okamžiku pouze tehdy, když je
    // sál podle aktuálního databázového stavu stále skutečně pozastavený.
    pauseStartByRoom.forEach((pauseStart, roomId) => {
      const room = roomById.get(roomId);
      if (!room?.isPaused) return;
      const intervals = pauseIntervalsByRoom.get(roomId) ?? [];
      intervals.push({ start: pauseStart, end: new Date() });
      pauseIntervalsByRoom.set(roomId, intervals);
    });

    pauseIntervalsByRoom.forEach((intervals, roomId) => {
      const room = roomById.get(roomId);
      if (!room) return;
      intervals.forEach(interval => {
        totals.Pauza += roomWorkingOverlapSeconds(room, interval.start, interval.end);
      });
    });

    // Délky běžných fází jsou uložené na události step_change. Pokud do
    // intervalu fáze spadá pauza, odečteme ji z fáze a vykážeme samostatně,
    // takže se stejná minuta nikdy nezapočítá dvakrát.
    statusHistory
      .filter(e => e.event_type === 'step_change' && e.duration_seconds && e.step_name)
      .forEach(e => {
        const room = roomById.get(e.operating_room_id);
        const seconds = Number(e.duration_seconds ?? 0);
        if (!room || !e.step_name || totals[e.step_name] === undefined || !Number.isFinite(seconds) || seconds <= 0) return;

        const end = new Date(e.timestamp);
        const start = new Date(end.getTime() - seconds * 1_000);
        const phaseWorkingSeconds = roomWorkingOverlapSeconds(room, start, end);
        const pausedWorkingSeconds = (pauseIntervalsByRoom.get(room.id) ?? []).reduce((sum, pause) => {
          const overlapStart = new Date(Math.max(start.getTime(), pause.start.getTime()));
          const overlapEnd = new Date(Math.min(end.getTime(), pause.end.getTime()));
          return sum + roomWorkingOverlapSeconds(room, overlapStart, overlapEnd);
        }, 0);
        totals[e.step_name] += Math.max(0, phaseWorkingSeconds - pausedWorkingSeconds);
      });

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    const workflowItems = workflowSteps
      .map(s => ({
        label: s.title,
        percent: (totals[s.title] / total) * 100,
        duration: totals[s.title] / 60,
        detail: formatMinutes(Math.round(totals[s.title] / 60)),
        color: s.color,
      }))
      .filter(s => s.percent > 0)
      .sort((a, b) => b.percent - a.percent);

    if (totals.Pauza > 0 && !workflowSteps.some(step => step.title.toLocaleLowerCase('cs-CZ') === 'pauza')) {
      workflowItems.push({
        label: 'Pauza',
        percent: (totals.Pauza / total) * 100,
        duration: totals.Pauza / 60,
        detail: formatMinutes(Math.round(totals.Pauza / 60)),
        color: C.yellow,
      });
      workflowItems.sort((a, b) => b.percent - a.percent);
    }

    return workflowItems;
  }, [statusHistory, workflowSteps, rooms]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <main className="flex flex-col gap-4 xl:order-2">
          <Card className={`relative overflow-hidden p-5 ${ROOM_CARD_CLASS}`}>
            <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}aa, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: C.muted }}>Sály</p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>Přehled operačních sálů</h2>
                <p className="mt-1 text-[11px]" style={{ color: C.muted }}>Využití, provozní stav a výkonnost operačních sálů</p>
              </div>
              <span className="rounded-md px-3 py-2 text-[11px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>Období: {periodLabel}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryKPI label="Obsazeno" value={busyCount} total={rooms.length} color={C.orange} icon={Activity} />
              <SummaryKPI label="Volno" value={freeCount} total={rooms.length} color={C.green} icon={CheckCircle2} />
              <SummaryKPI label="Úklid" value={cleanCount} total={rooms.length} color={C.accent} icon={Sparkles} />
              <SummaryKPI label="Mimo provoz" value={maintCount} total={rooms.length} color={C.faint} icon={AlertTriangle} />
            </div>
          </Card>

          {phaseRings.length > 0 && (
            <Card className={`p-5 ${ROOM_CARD_CLASS}`} icon={Activity} title="Fáze operačního cyklu" subtitle="Podíl času naměřených provozních fází" accent={C.accent}>
              <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-6">
                {phaseRings.map(phase => (
                  <CyclePhaseRing
                    key={phase.label}
                    label={phase.label}
                    percentage={phase.percent}
                    color={phase.color}
                  />
                ))}
              </div>
            </Card>
          )}
        </main>

        <aside className="flex flex-col gap-4 xl:order-1">
          <Card className={`relative overflow-hidden p-5 ${ROOM_CARD_CLASS}`}>
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.accent }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.accent, background: `${C.accent}0f`, border: `1px solid ${C.accent}2f` }}><LayoutGrid className="h-5 w-5" /></span>
                <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: C.accent, border: `1px solid ${C.accent}35` }}>reálná data</span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>Operační sály</p>
              <p className="mt-1 text-[52px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }}>{rooms.length}</p>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>evidovaných sálů · {periodLabel}</p>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                {[
                  [busyCount, C.orange, 'Obsazeno'], [freeCount, C.green, 'Volno'], [cleanCount, C.accent, 'Úklid'], [maintCount, C.muted, 'Mimo provoz'],
                ].map(([count, color, label]) => Number(count) > 0 && <span key={String(label)} style={{ width: `${(Number(count) / Math.max(1, rooms.length)) * 100}%`, background: String(color) }} title={`${label}: ${count}`} />)}
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  ['Obsazeno', busyCount, C.orange], ['Volno', freeCount, C.green], ['Úklid', cleanCount, C.accent],
                ].map(([label, count, color]) => (
                  <div key={String(label)} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: String(color) }} />
                    <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>{label}</span>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{count}×</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: C.border }}>
              {[
                ['Průměrné vytížení', `${Math.round(avgUtilization)} %`],
                ['Výkonů celkem', String(totalOps)],
                ['Sálů v provozu', String(busyCount)],
                ['Mimo provoz', String(maintCount)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
          <InsightPanel title="Co zlepšit a urychlit" icon={<TrendingUp size={14} color={C.accent} />} items={insights} />
        </aside>
      </div>

      {/* ── Utilization comparison chart ── */}
      <Card className={`p-5 ${ROOM_CARD_CLASS}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Využití podle sálů</h3>
            <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Porovnání efektivity jednotlivých operačních sálů</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: C.ghost }}>
            <button
              onClick={() => setSortBy('utilization')}
              className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors ${
                sortBy === 'utilization' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'utilization' ? C.accent : C.muted }}
            >
              Využití
            </button>
            <button
              onClick={() => setSortBy('operations')}
              className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors ${
                sortBy === 'operations' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'operations' ? C.accent : C.muted }}
            >
              Výkony
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors ${
                sortBy === 'name' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'name' ? C.accent : C.muted }}
            >
              Název
            </button>
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
          {sortedRooms.map(r => {
            const color = r.utilization >= 80 ? C.green
              : r.utilization >= 50 ? C.yellow
              : r.utilization > 0 ? C.orange : C.muted;
            return (
              <button
                type="button"
                key={r.room.id}
                onClick={() => onRoomSelect?.(r.room)}
                aria-label={`${r.room.name}, využití ${Math.round(r.utilization)} procent`}
                className="group relative aspect-square min-w-0 overflow-hidden rounded-xl p-3 text-center transition-colors hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2"
                style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}`, color }}
              >
                <span className="absolute inset-x-3 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                <span className="flex h-full flex-col items-center justify-between">
                  <span className="flex w-full min-w-0 items-center justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.muted }} title={r.room.name}>{r.room.name}</span>
                  </span>
                  <span className="flex items-baseline justify-center">
                    <span className="text-[30px] font-light leading-none tracking-[-0.04em] tabular-nums" style={{ color: C.textHi }}>{Math.round(r.utilization)}</span>
                    <span className="ml-0.5 text-[10px] font-semibold" style={{ color }}>%</span>
                  </span>
                  <span className="text-[9px] tabular-nums" style={{ color: C.faint }}>{r.operations} výkonů</span>
                </span>
              </button>
            );
          })}
          {sortedRooms.length === 0 && <p className="col-span-full py-8 text-center text-[11px]" style={{ color: C.muted }}>Žádné sály k zobrazení.</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-3" style={{ borderTop: `1px solid ${C.ghost}` }}>
          {[
            { label: 'Vysoké (80 % +)', color: C.green },
            { label: 'Střední (50–80 %)', color: C.yellow },
            { label: 'Nízké (< 50 %)', color: C.orange },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[11px]" style={{ color: C.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className={`p-5 ${ROOM_CARD_CLASS}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Operační sály</h3>
            <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Kliknutím na kartu zobrazíte podrobné statistiky</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: C.ghost, border: `1px solid ${C.border}` }}>
            <button type="button" onClick={() => setViewMode('grid')} aria-label="Zobrazit sály v mřížce" className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white/10' : ''}`}>
              <LayoutGrid size={14} style={{ color: viewMode === 'grid' ? C.accent : C.muted }} />
            </button>
            <button type="button" onClick={() => setViewMode('list')} aria-label="Zobrazit sály jako seznam" className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-white/10' : ''}`}>
              <List size={14} style={{ color: viewMode === 'list' ? C.accent : C.muted }} />
            </button>
          </div>
        </div>

        <div
          key={viewMode}
          className={`mt-5 ${viewMode === 'grid'
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'space-y-2'
          }`
          }
        >
          {sortedRooms.map(data => (
            <RoomCard
              key={data.room.id}
              room={data.room}
              utilization={data.utilization}
              opsCount={data.operations}
              avgOpTime={data.avgOpTime}
              onClick={() => onRoomSelect?.(data.room)}
            />
          ))}
        </div>
      </Card>

      {/* ── Performance comparison table ── */}
      <Card className={`p-0 overflow-hidden ${ROOM_CARD_CLASS}`}>
        <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.ghost}` }}>
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Srovnávací tabulka výkonnosti</h3>
          <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Souhrnné porovnání využití, výkonů, času a sazeb</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: C.surface }}>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Sál</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Využití</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Výkony</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Prům. čas</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Sazba</th>
              </tr>
            </thead>
            <tbody>
              {sortedRooms.map((data, idx) => {
                const utilColor = data.utilization >= 80 ? C.green
                  : data.utilization >= 50 ? C.yellow
                  : data.utilization > 0 ? C.orange : C.muted;
                const statusMap: Record<string, { l: string; c: string }> = {
                  'volny': { l: 'Volný', c: C.green },
                  'obsazeny': { l: 'Obsazený', c: C.orange },
                  'uklid': { l: 'Úklid', c: C.accent },
                  'udrzba': { l: 'Údržba', c: C.faint },
                  'priprava': { l: 'Příprava', c: C.yellow },
                };
                const st = statusMap[data.room.status ?? 'volny'] ?? { l: data.room.status ?? '-', c: C.muted };

                return (
                  <tr
                    key={data.room.id}
                    className="border-t cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: C.ghost }}
                    onClick={() => onRoomSelect?.(data.room)}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: C.textHi }}>{data.room.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums" style={{ color: utilColor }}>
                        {formatPercent(data.utilization, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: C.text }}>{data.operations}</td>
                    <td className="px-4 py-3 text-right" style={{ color: C.muted }}>{data.avgOpTime === null ? '—' : formatMinutes(data.avgOpTime)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${st.c}18`, color: st.c }}
                      >
                        {st.l}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: C.muted }}>
                      {data.room.hourlyOperatingCost
                        ? `${formatNumber(data.room.hourlyOperatingCost, 0)} Kč`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});

RoomsTab.displayName = 'RoomsTab';
