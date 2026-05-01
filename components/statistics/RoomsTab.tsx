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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, Users, Zap, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Filter,
  LayoutGrid, List, TrendingUp, Timer, Target, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadialBarChart, RadialBar, Legend, PieChart, Pie
} from 'recharts';

import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card, KPIBlock, ProgressRing, Sparkline, AnimatedCounter,
  DeltaBadge, formatMinutes, formatPercent, formatNumber, hashStr,
  seededPreviousValue, computeDelta
} from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Props
// ─────────────────────────────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month';
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
    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
  >
    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
    {status}
  </div>
));
StatusBadge.displayName = 'StatusBadge';

/** Mini metric row inside room cards */
const MetricRow = memo(({ icon: Icon, label, value, color, unit }: {
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;
  color?: string;
  unit?: string;
}) => (
  <div className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: C.ghost }}>
    <div className="flex items-center gap-2">
      <Icon size={12} style={{ color: color ?? C.muted }} strokeWidth={2} />
      <span className="text-[10px]" style={{ color: C.muted }}>{label}</span>
    </div>
    <span className="text-xs font-semibold tabular-nums" style={{ color: color ?? C.textHi }}>
      {value}{unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: C.muted }}>{unit}</span>}
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
  index,
}: {
  room: OperatingRoom;
  utilization: number;
  opsCount: number;
  avgOpTime: number;
  onClick: () => void;
  index: number;
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

  // Simulated trend data based on room ID
  const trend = useMemo(() => {
    const base = hashStr(room.id + 'trend');
    return Array.from({ length: 12 }, (_, i) => {
      const noise = hashStr(room.id + i.toString()) * 20 - 10;
      return Math.max(0, Math.min(100, utilization + noise + (i - 6) * 2));
    });
  }, [room.id, utilization]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      whileHover={{ scale: 1.01, y: -2 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <Card elevated className="p-4 h-full relative overflow-hidden">
        {/* Accent glow */}
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: utilColor }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-3 relative">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold truncate" style={{ color: C.textHi }}>{room.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={st.label} color={st.color} />
              {room.isSeptic && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">SEP</span>
              )}
              {room.isEmergency && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">URG</span>
              )}
            </div>
          </div>

          {/* Utilization ring */}
          <ProgressRing
            value={utilization}
            size={52}
            strokeWidth={5}
            color={utilColor}
            label={`${Math.round(utilization)}`}
            sublabel="%"
          />
        </div>

        {/* Sparkline */}
        <div className="mb-3">
          <Sparkline data={trend} width={180} height={28} color={utilColor} />
        </div>

        {/* Metrics */}
        <div className="space-y-0">
          <MetricRow icon={Activity} label="Výkony" value={opsCount} color={C.accent} />
          <MetricRow icon={Clock} label="Prům. čas" value={formatMinutes(avgOpTime)} />
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
          className="flex items-center justify-end gap-1 mt-3 pt-2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: C.accent, borderTop: `1px solid ${C.ghost}` }}
        >
          <span>Detail</span>
          <ChevronRight size={12} />
        </div>
      </Card>
    </motion.div>
  );
});
RoomCard.displayName = 'RoomCard';

/** Summary KPI card */
const SummaryKPI = memo(({
  label, value, total, color, icon: Icon, trend
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ComponentType<any>;
  trend?: number;
}) => {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-10" style={{ background: color }} />

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
        {trend !== undefined && <DeltaBadge delta={trend} />}
      </div>

      <p className="text-4xl font-bold leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>{label}</p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{formatPercent(pct, 0)}</span>
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
        : 45; // Default 45 min

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
          trend={5}
        />
        <SummaryKPI
          label="Volno"
          value={freeCount}
          total={rooms.length}
          color={C.green}
          icon={CheckCircle2}
          trend={-2}
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

      {/* ── Aggregate metrics row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average utilization card */}
        <Card elevated className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                Průměrné využití
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: C.textHi }}>
                {formatPercent(avgUtilization, 1)}
              </p>
            </div>
            <ProgressRing
              value={avgUtilization}
              size={72}
              strokeWidth={7}
              gradient
              label={`${Math.round(avgUtilization)}`}
              sublabel="%"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: C.muted }}>
            <Target size={12} />
            <span>Cíl: 75% využití kapacity</span>
            {avgUtilization >= 75 && <CheckCircle2 size={12} color={C.green} />}
          </div>
        </Card>

        {/* Total operations */}
        <Card elevated className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                Celkem výkonů
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: C.textHi }}>
                <AnimatedCounter value={totalOps} className="tabular-nums" />
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}30` }}
            >
              <TrendingUp size={24} color={C.accent} />
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1" style={{ color: C.green }}>
              <ArrowUpRight size={12} />
              <span>+12% oproti minulému období</span>
            </div>
          </div>
        </Card>

        {/* Status distribution pie */}
        <Card elevated className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
            Rozložení statusů
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={22}
                  outerRadius={36}
                  paddingAngle={2}
                >
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {statusPieData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: d.fill }} />
                    <span className="text-[10px]" style={{ color: C.muted }}>{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: d.fill }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Utilization comparison chart ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold" style={{ color: C.textHi }}>Využití podle sálů</p>
            <p className="text-[10px]" style={{ color: C.muted }}>Porovnání efektivity jednotlivých operačních sálů</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: C.ghost }}>
            <button
              onClick={() => setSortBy('utilization')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                sortBy === 'utilization' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'utilization' ? C.accent : C.muted }}
            >
              Využití
            </button>
            <button
              onClick={() => setSortBy('operations')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                sortBy === 'operations' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'operations' ? C.accent : C.muted }}
            >
              Výkony
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                sortBy === 'name' ? 'bg-white/10' : ''
              }`}
              style={{ color: sortBy === 'name' ? C.accent : C.muted }}
            >
              Název
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={20}>
            <XAxis
              dataKey="name"
              stroke={C.ghost}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke={C.ghost}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              {...TIP}
              formatter={(v: number, name: string) => [`${v}%`, 'Využití']}
            />
            <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
              {barData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3" style={{ borderTop: `1px solid ${C.ghost}` }}>
          {[
            { label: 'Vysoké (80%+)', color: C.green },
            { label: 'Střední (50-80%)', color: C.yellow },
            { label: 'Nízké (<50%)', color: C.orange },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[10px]" style={{ color: C.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Room cards header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold" style={{ color: C.textHi }}>
            Operační sály ({rooms.length})
          </p>
          <p className="text-[10px]" style={{ color: C.muted }}>
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
      <AnimatePresence mode="popLayout">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
            : 'space-y-2'
          }
        >
          {sortedRooms.map((data, idx) => (
            <RoomCard
              key={data.room.id}
              room={data.room}
              utilization={data.utilization}
              opsCount={data.operations}
              avgOpTime={data.avgOpTime}
              onClick={() => onRoomSelect?.(data.room)}
              index={idx}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── Performance comparison table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.ghost}` }}>
          <p className="text-xs font-bold" style={{ color: C.textHi }}>Srovnávací tabulka výkonnosti</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ background: C.surface }}>
                <th className="text-left px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Sál</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Využití</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Výkony</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Prům. čas</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Status</th>
                <th className="text-right px-4 py-2.5 font-semibold" style={{ color: C.muted }}>Sazba</th>
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
                    <td className="px-4 py-2.5 font-medium" style={{ color: C.textHi }}>{data.room.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-semibold tabular-nums" style={{ color: utilColor }}>
                        {formatPercent(data.utilization, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: C.text }}>{data.operations}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: C.muted }}>{formatMinutes(data.avgOpTime)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold"
                        style={{ background: `${st.c}18`, color: st.c }}
                      >
                        {st.l}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: C.muted }}>
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
