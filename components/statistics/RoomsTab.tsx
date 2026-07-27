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
  Activity, Clock, Users, Zap, AlertTriangle, CheckCircle2,
  ChevronRight, Filter, LayoutGrid, List, TrendingUp, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadialBarChart, RadialBar, Legend, PieChart, Pie
} from 'recharts';

import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card, ProgressRing, Sparkline, AnimatedCounter,
  formatMinutes, formatPercent, formatNumber
} from './shared';
// Čitelné grafy v jazyce aplikace (stejné jako v záložce Přehled)
import { BarList, SegmentBar, GaugeRing, RingRow, InsightPanel, StatSectionLabel } from './AppCharts';
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

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip config
// ─────────────────────────────────────────────────────────────────────────────
const TIP = {
  contentStyle: {
    background: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize: 11,
    padding: '8px 12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  itemStyle: { color: C.text },
  labelStyle: { color: C.muted, marginBottom: 4 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Status badge mini chip */
const StatusBadge = memo(({ status, color }: { status: string; color: string }) => (
  <div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
  >
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    {status}
  </div>
));
StatusBadge.displayName = 'StatusBadge';

/** Mini metric row inside room cards */
const MetricRow = memo(({ icon: Icon, label, value, color, unit }: {
  icon: IconComponent;
  label: string;
  value: number | string;
  color?: string;
  unit?: string;
}) => (
  <div className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: C.ghost }}>
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color: color ?? C.muted }} strokeWidth={2} />
      <span className="text-[12px]" style={{ color: C.muted }}>{label}</span>
    </div>
    <span className="text-[14px] font-bold tabular-nums" style={{ color: color ?? C.textHi }}>
      {value}{unit && <span className="text-[11px] font-normal ml-0.5" style={{ color: C.muted }}>{unit}</span>}
    </span>
  </div>
));
MetricRow.displayName = 'MetricRow';

/** Enhanced room card with rich details */
const RoomCard = memo(({
  room,
  utilization,
  opsCount,
  avgOpTime,
  onClick,
  statusHistory,
}: {
  room: OperatingRoom;
  utilization: number;
  opsCount: number;
  avgOpTime: number | null;
  onClick: () => void;
  statusHistory?: StatusHistoryRow[];
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

  // Calculate trend data from REAL statusHistory (last 12 periods/hours)
  const trend = useMemo(() => {
    if (!statusHistory || statusHistory.length === 0) {
      return [];
    }

    // Filter status history for this room and group by hour (last 12 hours)
    const now = new Date();
    const roomHistory = statusHistory
      .filter(entry => entry.operating_room_id === room.id)
      .filter(entry => {
        const entryTime = new Date(entry.created_at).getTime();
        const hoursDiff = (now.getTime() - entryTime) / (1000 * 60 * 60);
        return hoursDiff <= 12;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Group by hour and calculate utilization for each
    const hourlyUtilization: number[] = [];
    for (let i = 0; i < 12; i++) {
      const hourStart = new Date(now.getTime() - (12 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000);
      
      const hourEntries = roomHistory.filter(entry => {
        const entryTime = new Date(entry.created_at);
        return entryTime >= hourStart && entryTime < hourEnd;
      });

      if (hourEntries.length > 0) {
        const operatingCount = hourEntries.filter(
          e => e.event_type === 'in_use' || e.event_type === 'started' || e.event_type === 'occupied'
        ).length;
        const utilPct = Math.round((operatingCount / hourEntries.length) * 100);
        hourlyUtilization.push(utilPct);
      } else {
        hourlyUtilization.push(0);
      }
    }

    return hourlyUtilization;
  }, [room.id, statusHistory]);

  return (
    <button type="button" onClick={onClick} className="w-full cursor-pointer text-left group">
      <Card elevated className="p-4 h-full relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 relative">
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold truncate leading-tight" style={{ color: C.textHi }}>{room.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <StatusBadge status={st.label} color={st.color} />
              {room.isSeptic && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">SEP</span>
              )}
              {room.isEmergency && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">URG</span>
              )}
            </div>
          </div>

          {/* Utilization ring */}
          <ProgressRing
            value={utilization}
            size={60}
            strokeWidth={6}
            color={utilColor}
            label={`${Math.round(utilization)}`}
            sublabel="%"
          />
        </div>

        {/* Denní průběh vytížení */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>
            Průběh dne
          </p>
          {trend.length >= 2
            ? <Sparkline data={trend} width={220} height={36} color={utilColor} />
            : <p className="text-[11px] py-2" style={{ color: C.faint }}>Bez historických dat</p>}
        </div>

        {/* Metrics */}
        <div className="space-y-0">
          <MetricRow icon={Activity} label="Výkony" value={opsCount} color={C.accent} />
          <MetricRow icon={Clock} label="Prům. čas" value={avgOpTime === null ? '—' : formatMinutes(avgOpTime)} />
          <MetricRow icon={Users} label="Fronta" value={room.queueCount ?? 0} unit="pac." />
          {room.hourlyOperatingCost && (
            <MetricRow
              icon={Zap}
              label="Sazba"
              value={formatNumber(room.hourlyOperatingCost, 0)}
              unit="Kč/h"
            />
          )}
        </div>

        {/* Footer CTA */}
        <div
          className="flex items-center justify-end gap-1 mt-3 pt-2 text-[12px] font-semibold"
          style={{ color: C.accent, borderTop: `1px solid ${C.ghost}` }}
        >
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
    <Card className="p-4 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
      </div>

      <p className="text-4xl font-bold leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>{label}</p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
          <div className="h-full rounded-full" style={{ background: color, width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{formatPercent(pct, 0)}</span>
      </div>
    </Card>
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

  // ── Bar chart data ──
  const barData = useMemo(() => {
    return sortedRooms.map(r => ({
      name: r.room.name.replace('Operační sál ', 'OS ').replace('Sál ', 'S'),
      utilization: Math.round(r.utilization),
      operations: r.operations,
      fill: r.utilization >= 80 ? C.green : r.utilization >= 50 ? C.yellow : r.utilization > 0 ? C.orange : C.muted,
    }));
  }, [sortedRooms]);

  // ── Radial data for top 6 ──
  const radialData = useMemo(() => {
    return sortedRooms.slice(0, 6).map((r, i) => ({
      name: r.room.name.replace('Operační sál ', 'OS '),
      value: Math.round(r.utilization),
      fill: [C.accent, C.green, C.blue, C.purple, C.orange, C.pink][i % 6],
    }));
  }, [sortedRooms]);

  // Barva hlavního prstence dle úrovně vytížení
  const avgUtilColor = avgUtilization >= 80 ? C.green
    : avgUtilization >= 50 ? C.accent
    : avgUtilization > 0 ? C.orange : C.muted;

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

  /** Fáze operačního cyklu — podíl času jednotlivých statusů z historie. */
  const phaseRings = useMemo(() => {
    if (!statusHistory || statusHistory.length === 0 || workflowSteps.length === 0) return [];
    const totals: Record<string, number> = {};
    workflowSteps.forEach(s => { totals[s.title] = 0; });
    statusHistory
      .filter(e => e.event_type === 'step_change' && e.duration_seconds)
      .forEach(e => {
        if (e.step_name && totals[e.step_name] !== undefined) {
          totals[e.step_name] += e.duration_seconds || 0;
        }
      });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    // „Sál připraven" je klidový stav, ne fáze cyklu — nezobrazujeme
    const isIdle = (name: string) => {
      const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes('priprav') && n.includes('sal');
    };
    return workflowSteps
      .map(s => ({
        label: s.title,
        percent: (totals[s.title] / total) * 100,
        detail: formatMinutes(Math.round(totals[s.title] / 60)),
        color: s.color,
      }))
      .filter(s => s.percent > 0 && !isIdle(s.label))
      .sort((a, b) => b.percent - a.percent);
  }, [statusHistory, workflowSteps]);

  // ── Status distribution pie ──
  const statusPieData = useMemo(() => [
    { name: 'Obsazeno', value: busyCount, fill: C.orange },
    { name: 'Volno', value: freeCount, fill: C.green },
    { name: 'Úklid', value: cleanCount, fill: C.accent },
    { name: 'Údržba', value: maintCount, fill: C.muted },
  ].filter(d => d.value > 0), [busyCount, freeCount, cleanCount, maintCount]);

  return (
    <div className="space-y-5">
      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryKPI
          label="Obsazeno"
          value={busyCount}
          total={rooms.length}
          color={C.orange}
          icon={Activity}
        />
        <SummaryKPI
          label="Volno"
          value={freeCount}
          total={rooms.length}
          color={C.green}
          icon={CheckCircle2}
        />
        <SummaryKPI
          label="Úklid"
          value={cleanCount}
          total={rooms.length}
          color={C.accent}
          icon={Sparkles}
        />
        <SummaryKPI
          label="Mimo provoz"
          value={maintCount}
          total={rooms.length}
          color={C.faint}
          icon={AlertTriangle}
        />
      </div>

      {/* ── Hero panel — velký prstenec vytížení + doporučení ── */}
      <Card elevated className="p-6 lg:p-8">
        {/* Vlevo prstenec + fáze pod ním (společně vycentrované), vpravo
            doporučení — malé prstence tak sedí pod středem velkého grafu. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-8 items-start">
          <div className="flex flex-col items-center">
            <GaugeRing
              value={avgUtilization}
              size={300}
              color={avgUtilColor}
              kicker="Průměrné vytížení"
              sublabel={`${totalOps} výkonů · ${busyCount}/${rooms.length} sálů v provozu`}
            />

            {/* Fáze operačního cyklu — podíl času jednotlivých statusů */}
            {phaseRings.length > 0 && (
              <div className="w-full mt-8 pt-7" style={{ borderTop: `1px solid ${C.ghost}` }}>
                <StatSectionLabel className="mb-6">Fáze operačního cyklu</StatSectionLabel>
                <RingRow items={phaseRings} />
              </div>
            )}
          </div>

          {/* Doporučení */}
          <InsightPanel
            title="Co zlepšit a urychlit"
            icon={<TrendingUp size={14} color={C.accent} />}
            items={insights}
          />
        </div>
      </Card>

      {/* ── Utilization comparison chart ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[15px] font-bold" style={{ color: C.textHi }}>Využití podle sálů</p>
            <p className="text-[12px]" style={{ color: C.muted }}>Porovnání efektivity jednotlivých operačních sálů</p>
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
        
        {/* Žebříček místo sloupcového grafu s 9px popisky — plné názvy sálů,
            hodnota vpravo a barevný pruh, stejně jako v záložce Přehled. */}
        <BarList
          max={sortBy === 'operations' ? undefined : 100}
          barHeight={9}
          items={sortedRooms.map(r => {
            const color = r.utilization >= 80 ? C.green
              : r.utilization >= 50 ? C.yellow
              : r.utilization > 0 ? C.orange : C.muted;
            return sortBy === 'operations'
              ? {
                  label: r.room.name,
                  value: r.operations,
                  display: `${r.operations} výk.`,
                  sub: `${Math.round(r.utilization)} %`,
                  color,
                }
              : {
                  label: r.room.name,
                  value: Math.round(r.utilization),
                  display: `${Math.round(r.utilization)} %`,
                  sub: `${r.operations} výk.`,
                  color,
                };
          })}
          emptyText="Žádné sály k zobrazení."
        />

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

      {/* ── Room cards header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold" style={{ color: C.textHi }}>
            Operační sály ({rooms.length})
          </p>
          <p className="text-[12px]" style={{ color: C.muted }}>
            Kliknutím na kartu zobrazíte podrobné statistiky
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: C.ghost }}>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white/10' : ''}`}
          >
            <LayoutGrid size={14} style={{ color: viewMode === 'grid' ? C.accent : C.muted }} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white/10' : ''}`}
          >
            <List size={14} style={{ color: viewMode === 'list' ? C.accent : C.muted }} />
          </button>
        </div>
      </div>

      {/* ── Room cards grid ── */}
      <div
          key={viewMode}
          className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
            : 'space-y-2'
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
              statusHistory={statusHistory}
            />
          ))}
      </div>

      {/* ── Performance comparison table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.ghost}` }}>
          <p className="text-[15px] font-bold" style={{ color: C.textHi }}>Srovnávací tabulka výkonnosti</p>
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
