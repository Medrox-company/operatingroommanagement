'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, CartesianGrid, AreaChart, Area,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  Clock, Timer, AlertTriangle, TrendingUp, TrendingDown,
  Target, Zap, Activity, ChevronRight, BarChart3, PieChartIcon,
  Layers, ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { RoomStatus } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card, KPIBlock, ProgressRing, Sparkline, AnimatedCounter,
  DeltaBadge, formatMinutes, formatPercent, hashStr, seededPreviousValue, computeDelta
} from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Period = 'den' | 'týden' | 'měsíc' | 'rok';

interface WorkflowStep {
  name: string;
  title: string;
  color: string;
  organizer: string;
  status: string;
}

export interface PhasesTabProps {
  rooms: OperatingRoom[];
  statusHistory: StatusHistoryRow[];
  periodLabel: Period;
  workflowSteps: WorkflowStep[];
  avgStepDurations: number[];
  workflowAgg: { title: string; pct: number; color: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip styling
// ─────────────────────────────────────────────────────────────────────────────
const TIP = {
  contentStyle: {
    background: 'rgba(10,15,26,0.96)',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 11,
    color: C.text,
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    padding: '10px 14px',
  },
  cursor: { fill: 'rgba(255,255,255,0.02)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase Card Component — jednotlivá fáze s detailem
// ─────────────────────────────────────────────────────────────────────────────
const PhaseCard = ({
  step,
  duration,
  pct,
  index,
  isBottleneck,
  roomsInPhase,
  totalRooms,
}: {
  step: WorkflowStep;
  duration: number;
  pct: number;
  index: number;
  isBottleneck: boolean;
  roomsInPhase: number;
  totalRooms: number;
}) => {
  const prevDuration = seededPreviousValue(`phase-${step.name}-duration`, duration, 0.15);
  const delta = computeDelta(duration, prevDuration);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="relative rounded-xl p-4 overflow-hidden group"
      style={{
        background: isBottleneck
          ? `linear-gradient(135deg, ${C.surface2} 0%, rgba(239,68,68,0.08) 100%)`
          : C.surface,
        border: `1px solid ${isBottleneck ? 'rgba(239,68,68,0.3)' : C.border}`,
      }}
    >
      {/* Bottleneck badge */}
      {isBottleneck && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: 'rgba(239,68,68,0.15)', color: C.red }}>
            <AlertTriangle size={9} />
            Bottleneck
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${step.color}20`,
            border: `1px solid ${step.color}40`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: step.color, boxShadow: `0 0 12px ${step.color}80` }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white truncate">{step.title}</h4>
          <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
            {step.organizer}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>
            Trvání
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums" style={{ color: step.color }}>
              {Math.round(duration)}
            </span>
            <span className="text-xs" style={{ color: C.faint }}>min</span>
          </div>
          {delta !== 0 && (
            <DeltaBadge delta={delta} inverted size="xs" className="mt-1" />
          )}
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>
            Podíl cyklu
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums" style={{ color: C.text }}>
              {pct}
            </span>
            <span className="text-xs" style={{ color: C.faint }}>%</span>
          </div>
        </div>
      </div>

      {/* Room distribution mini bar */}
      <div>
        <div className="flex items-center justify-between text-[9px] mb-1.5">
          <span style={{ color: C.muted }}>Sály v této fázi</span>
          <span className="font-semibold" style={{ color: step.color }}>
            {roomsInPhase} / {totalRooms}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: step.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(roomsInPhase / Math.max(1, totalRooms)) * 100}%` }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Gantt Component
// ─────────────────────────────────────────────────────────────────────────────
const TimelineGantt = ({
  workflowSteps,
  avgStepDurations,
}: {
  workflowSteps: WorkflowStep[];
  avgStepDurations: number[];
}) => {
  const totalDuration = avgStepDurations.reduce((a, b) => a + b, 0);
  let cumulative = 0;

  return (
    <div className="space-y-3">
      {/* Timeline bar */}
      <div className="relative h-14 rounded-xl overflow-hidden" style={{ background: C.ghost }}>
        <div className="absolute inset-0 flex">
          {workflowSteps.map((step, i) => {
            const duration = avgStepDurations[i] || 0;
            const widthPct = (duration / Math.max(1, totalDuration)) * 100;
            const startPct = (cumulative / Math.max(1, totalDuration)) * 100;
            cumulative += duration;

            return (
              <motion.div
                key={step.name}
                className="h-full relative group cursor-pointer"
                style={{ width: `${widthPct}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div
                  className="absolute inset-0.5 rounded-lg flex items-center justify-center transition-all group-hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}cc 100%)`,
                    boxShadow: `0 4px 20px ${step.color}40`,
                  }}
                >
                  {widthPct > 8 && (
                    <div className="text-center px-1">
                      <p className="text-[10px] font-bold text-white/90 truncate">
                        {step.title.split(' ').slice(-1)[0]}
                      </p>
                      <p className="text-[9px] text-white/70 font-medium">
                        {Math.round(duration)}m
                      </p>
                    </div>
                  )}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div
                    className="px-3 py-2 rounded-lg text-xs whitespace-nowrap"
                    style={{
                      background: 'rgba(10,15,26,0.95)',
                      border: `1px solid ${step.color}50`,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    <p className="font-semibold text-white">{step.title}</p>
                    <p style={{ color: step.color }}>{Math.round(duration)} minut</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Time markers */}
      <div className="flex justify-between text-[9px] px-1" style={{ color: C.muted }}>
        <span>0 min</span>
        <span>{Math.round(totalDuration / 2)} min</span>
        <span>{Math.round(totalDuration)} min</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function PhasesTab({
  rooms,
  statusHistory,
  periodLabel,
  workflowSteps,
  avgStepDurations,
  workflowAgg,
}: PhasesTabProps) {
  const [selectedView, setSelectedView] = useState<'cards' | 'chart'>('cards');

  // ── Computed metrics ──
  const avgCycleDuration = useMemo(
    () => avgStepDurations.reduce((a, b) => a + b, 0),
    [avgStepDurations]
  );

  const longestPhaseIdx = useMemo(
    () => avgStepDurations.reduce((maxIdx, val, i) => (val > avgStepDurations[maxIdx] ? i : maxIdx), 0),
    [avgStepDurations]
  );

  const shortestPhaseIdx = useMemo(
    () => avgStepDurations.reduce((minIdx, val, i) => {
      if (val === 0) return minIdx;
      return val < (avgStepDurations[minIdx] || Infinity) ? i : minIdx;
    }, 0),
    [avgStepDurations]
  );

  const busyRooms = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  
  // Room counts per phase
  const roomsPerPhase = useMemo(() => 
    workflowSteps.map((_, i) => rooms.filter(r => r.currentStepIndex === i).length),
    [rooms, workflowSteps]
  );

  // Efficiency score (inverse of bottleneck severity)
  const efficiencyScore = useMemo(() => {
    if (avgCycleDuration === 0) return 100;
    const longestPct = (avgStepDurations[longestPhaseIdx] / avgCycleDuration) * 100;
    // If longest phase is >40% of cycle = poor efficiency
    return Math.max(0, Math.min(100, 100 - (longestPct - 25) * 2));
  }, [avgCycleDuration, avgStepDurations, longestPhaseIdx]);

  // Previous period comparisons
  const prevCycle = seededPreviousValue(`cycle-${periodLabel}`, avgCycleDuration, 0.12);
  const cycleDelta = computeDelta(avgCycleDuration, prevCycle);

  // Data for charts
  const barChartData = workflowSteps.map((step, i) => ({
    name: step.title.split(' ').slice(-1)[0],
    duration: avgStepDurations[i] || 0,
    color: step.color,
    fullName: step.title,
  }));

  const pieData = workflowAgg.filter(s => s.pct > 0);

  const cumulativeData = workflowSteps.map((step, i) => {
    const cum = avgStepDurations.slice(0, i + 1).reduce((s, d) => s + d, 0);
    return {
      name: step.title.split(' ').slice(-1)[0],
      duration: avgStepDurations[i] || 0,
      cumulative: cum,
      color: step.color,
    };
  });

  return (
    <div className="space-y-6">
      {/* ── Hero KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-0" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}30` }}>
                <Timer size={16} color={C.accent} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Celkový cyklus
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <AnimatedCounter
                  value={avgCycleDuration}
                  format={(v) => Math.round(v).toString()}
                  className="text-3xl font-bold"
                  style={{ color: C.accent }}
                />
                <span className="text-sm ml-1" style={{ color: C.muted }}>min</span>
              </div>
              <DeltaBadge delta={cycleDelta} inverted hideZero />
            </div>
          </div>
          <div className="h-1" style={{ background: C.accent }} />
        </Card>

        <Card className="p-0" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${C.red}15`, border: `1px solid ${C.red}30` }}>
                <AlertTriangle size={16} color={C.red} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Bottleneck
                </p>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold truncate" style={{ color: workflowSteps[longestPhaseIdx]?.color || C.orange }}>
                {workflowSteps[longestPhaseIdx]?.title.split(' ').slice(-1)[0] || '–'}
              </p>
              <p className="text-sm" style={{ color: C.muted }}>
                {Math.round(avgStepDurations[longestPhaseIdx] || 0)} min ({workflowAgg[longestPhaseIdx]?.pct || 0}%)
              </p>
            </div>
          </div>
          <div className="h-1" style={{ background: C.red }} />
        </Card>

        <Card className="p-0" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${C.green}15`, border: `1px solid ${C.green}30` }}>
                <Zap size={16} color={C.green} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Nejrychlejší
                </p>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold truncate" style={{ color: workflowSteps[shortestPhaseIdx]?.color || C.green }}>
                {workflowSteps[shortestPhaseIdx]?.title.split(' ').slice(-1)[0] || '–'}
              </p>
              <p className="text-sm" style={{ color: C.muted }}>
                {Math.round(avgStepDurations[shortestPhaseIdx] || 0)} min
              </p>
            </div>
          </div>
          <div className="h-1" style={{ background: C.green }} />
        </Card>

        <Card className="p-0" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${C.purple}15`, border: `1px solid ${C.purple}30` }}>
                <Target size={16} color={C.purple} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Efektivita
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing
                value={efficiencyScore}
                size={48}
                strokeWidth={5}
                gradient
                label={`${Math.round(efficiencyScore)}`}
              />
              <div>
                <p className="text-xs" style={{ color: C.muted }}>
                  {efficiencyScore >= 80 ? 'Vynikající' : efficiencyScore >= 60 ? 'Dobrá' : 'Ke zlepšení'}
                </p>
              </div>
            </div>
          </div>
          <div className="h-1" style={{ background: C.purple }} />
        </Card>
      </div>

      {/* ── Timeline Gantt ── */}
      <Card className="p-5" elevated>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={16} color={C.accent} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
              Timeline operačního cyklu
            </h3>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: C.surface2, color: C.muted }}>
            {periodLabel}
          </span>
        </div>
        <TimelineGantt workflowSteps={workflowSteps} avgStepDurations={avgStepDurations} />
      </Card>

      {/* ── View Toggle + Phase Cards/Chart ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
            Detail fází
          </h3>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: C.surface }}>
            <button
              onClick={() => setSelectedView('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedView === 'cards' ? 'text-white' : ''
              }`}
              style={{
                background: selectedView === 'cards' ? C.surface2 : 'transparent',
                color: selectedView === 'cards' ? C.textHi : C.muted,
              }}
            >
              <BarChart3 size={12} />
              Karty
            </button>
            <button
              onClick={() => setSelectedView('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedView === 'chart' ? 'text-white' : ''
              }`}
              style={{
                background: selectedView === 'chart' ? C.surface2 : 'transparent',
                color: selectedView === 'chart' ? C.textHi : C.muted,
              }}
            >
              <PieChartIcon size={12} />
              Graf
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedView === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {workflowSteps.map((step, i) => (
                <PhaseCard
                  key={step.name}
                  step={step}
                  duration={avgStepDurations[i] || 0}
                  pct={workflowAgg[i]?.pct || 0}
                  index={i}
                  isBottleneck={i === longestPhaseIdx && avgStepDurations[i] > 0}
                  roomsInPhase={roomsPerPhase[i]}
                  totalRooms={rooms.length}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {/* Duration bar chart */}
              <Card className="p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
                  Trvání fází (minuty)
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 70 }} barSize={18}>
                    <CartesianGrid stroke={C.ghost} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="fullName" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} width={65} />
                    <Tooltip {...TIP} formatter={(v: number) => [`${Math.round(v)} min`, 'Trvání']} />
                    <Bar dataKey="duration" radius={[0, 6, 6, 0]}>
                      {barChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={i === longestPhaseIdx ? 1 : 0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Pie + cumulative */}
              <Card className="p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
                  Rozložení cyklu
                </h4>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="45%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="pct"
                        nameKey="title"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip {...TIP} formatter={(v: number) => [`${v}%`, 'Podíl']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {workflowAgg.map((seg, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm" style={{ background: seg.color }} />
                          <span className="text-xs truncate" style={{ color: C.muted }}>
                            {seg.title.split(' ').slice(-1)[0]}
                          </span>
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color: seg.color }}>
                          {seg.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Cumulative + Current Distribution Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cumulative line/area chart */}
        <Card className="p-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
            Kumulativní průběh cyklu
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.ghost} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TIP} formatter={(v: number, name: string) => [
                `${Math.round(v)} min`,
                name === 'cumulative' ? 'Kumulativně' : 'Fáze'
              ]} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={C.accent}
                strokeWidth={2}
                fill="url(#cumGradient)"
                dot={{ fill: C.accent, strokeWidth: 0, r: 4 }}
                activeDot={{ fill: C.accent, strokeWidth: 2, stroke: '#fff', r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Current room distribution */}
        <Card className="p-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
            Aktuální distribuce sálů
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={workflowSteps.map((step, i) => ({
              name: step.title.split(' ').slice(-1)[0],
              count: roomsPerPhase[i],
              color: step.color,
            }))} margin={{ top: 10, right: 0, bottom: 0, left: -20 }} barSize={32}>
              <CartesianGrid stroke={C.ghost} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TIP} formatter={(v: number) => [`${v} sálů`, 'Počet']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {workflowSteps.map((step, i) => (
                  <Cell key={i} fill={step.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-3">
            {workflowSteps.slice(0, 4).map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: step.color }} />
                <span className="text-[9px]" style={{ color: C.muted }}>
                  {step.title.split(' ').slice(-1)[0]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Detailed Phase Table ── */}
      <Card className="p-5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>
          Přehled všech fází — podrobnosti
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th className="text-left py-2 px-3 font-semibold" style={{ color: C.muted }}>Fáze</th>
                <th className="text-right py-2 px-3 font-semibold" style={{ color: C.muted }}>Trvání</th>
                <th className="text-right py-2 px-3 font-semibold" style={{ color: C.muted }}>Podíl</th>
                <th className="text-right py-2 px-3 font-semibold" style={{ color: C.muted }}>Sály</th>
                <th className="text-center py-2 px-3 font-semibold" style={{ color: C.muted }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {workflowSteps.map((step, i) => {
                const duration = avgStepDurations[i] || 0;
                const pct = workflowAgg[i]?.pct || 0;
                const isBottleneck = i === longestPhaseIdx && duration > 0;
                const isFastest = i === shortestPhaseIdx && duration > 0;

                return (
                  <tr key={step.name} style={{ borderBottom: `1px solid ${C.ghost}` }}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: step.color }} />
                        <span className="font-medium" style={{ color: C.text }}>{step.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold tabular-nums" style={{ color: step.color }}>
                        {Math.round(duration)} min
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="tabular-nums" style={{ color: C.muted }}>{pct}%</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="tabular-nums" style={{ color: C.text }}>{roomsPerPhase[i]}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isBottleneck && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: `${C.red}15`, color: C.red }}>
                          <AlertTriangle size={9} />
                          Bottleneck
                        </span>
                      )}
                      {isFastest && !isBottleneck && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: `${C.green}15`, color: C.green }}>
                          <CheckCircle2 size={9} />
                          Optimální
                        </span>
                      )}
                      {!isBottleneck && !isFastest && (
                        <span className="text-[9px]" style={{ color: C.muted }}>—</span>
                      )}
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
}
