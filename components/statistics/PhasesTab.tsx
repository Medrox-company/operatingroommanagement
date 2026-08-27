'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  Clock, Timer, Zap, BarChart3,
  Layers, CheckCircle2,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card, AnimatedCounter,
} from './shared';
import { GlassCalendar } from './AppCharts';

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

const PHASE_CARD_CLASS = '!rounded-xl [background:var(--stats-surface)!important] [box-shadow:none!important]';
const INNER_PANEL_STYLE: React.CSSProperties = {
  background: 'var(--stats-surface-2)',
  border: `1px solid ${C.border}`,
};

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
function isIdlePhaseName(name: string): boolean {
  const normalized = (name || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '');
  return normalized.includes('priprav') && normalized.includes('sal');
}

const PhaseMetric: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, detail, icon: Icon, color }) => (
  <div className="group relative min-h-[112px] overflow-hidden rounded-xl p-4" style={INNER_PANEL_STYLE}>
    <span className="absolute inset-x-4 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div className="flex min-h-[44px] items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium" style={{ color: C.textHi }}>{label}</p>
        <p className="mt-1 truncate text-[10px]" style={{ color: C.muted }}>{detail}</p>
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105" style={{ color, border: `1px solid ${color}35`, background: `${color}0e` }}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </div>
    <p className="mt-3 truncate text-[26px] font-light leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
  </div>
);

const PhaseRing: React.FC<{
  label: string;
  duration: number;
  percentage: number;
  color: string;
}> = ({ label, duration, percentage, color }) => {
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
          <span className="text-xl font-light tabular-nums" style={{ color: C.textHi }}>{Math.round(duration)}</span>
          <span className="text-[8px] uppercase tracking-wider" style={{ color: C.muted }}>min</span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[30px] text-[10px] font-semibold leading-4" style={{ color: C.textHi }}>{label}</p>
      <p className="mt-0.5 text-[9px] tabular-nums" style={{ color }}>{percentage} % cyklu</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase Card Component — jednotlivá fáze s detailem
// ─────────────────────────────────────────────────────────────────────────────
const PhaseCard = ({
  step,
  duration,
  pct,
  isBottleneck,
  roomsInPhase,
  totalRooms,
}: {
  step: WorkflowStep;
  duration: number;
  pct: number;
  isBottleneck: boolean;
  roomsInPhase: number;
  totalRooms: number;
}) => {
  return (
    <div
      className="group relative min-h-[176px] overflow-hidden rounded-xl p-4 transition-colors hover:bg-white/[0.025]"
      style={{
        background: isBottleneck ? `linear-gradient(145deg, ${C.red}0d, var(--stats-surface-2))` : C.surface2,
        border: `1px solid ${isBottleneck ? 'rgba(239,68,68,0.3)' : C.border}`,
      }}
    >
      <span className="absolute inset-x-4 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }} />
      {/* Longest measured phase badge */}
      {isBottleneck && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: 'rgba(239,68,68,0.15)', color: C.red }}>
            Nejdelší fáze
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `${step.color}20`,
            border: `1px solid ${step.color}40`,
          }}
        >
          <Layers className="h-4 w-4" style={{ color: step.color }} strokeWidth={1.9} />
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
            <span className="text-[26px] font-light leading-none tabular-nums" style={{ color: C.textHi }}>
              {Math.round(duration)}
            </span>
            <span className="text-xs" style={{ color: C.faint }}>min</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>
            Podíl cyklu
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-light leading-none tabular-nums" style={{ color: C.textHi }}>
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
          <div className="h-full rounded-full" style={{
            background: step.color,
            width: `${(roomsInPhase / Math.max(1, totalRooms)) * 100}%`,
          }} />
        </div>
      </div>
    </div>
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
  // „Sál připraven" je klidový stav mezi výkony, ne fáze operačního cyklu —
  // v timeline ho vynecháváme, aby nezkresloval podíly ostatních fází.
  const steps = workflowSteps
    .map((step, i) => ({ step, duration: avgStepDurations[i] || 0 }))
    .filter(({ step }) => !isIdlePhaseName(step.title) && !isIdlePhaseName(step.name));

  const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
  return (
    <div className="space-y-3">
      {/* Timeline bar */}
      <div className="relative h-14 overflow-hidden rounded-xl" style={INNER_PANEL_STYLE}>
        <div className="absolute inset-0 flex">
          {steps.map(({ step, duration }) => {
            const widthPct = (duration / Math.max(1, totalDuration)) * 100;

            return (
              <div
                key={step.name}
                className="h-full relative group cursor-pointer"
                style={{ width: `${widthPct}%` }}
              >
                <div
                  className="absolute inset-0.5 rounded-lg flex items-center justify-center"
                  style={{
                    // Solid accent_color — must match the current-status badge color shown on RoomCard.
                    // Previously a 135° gradient dimmed the bottom-right to 80% opacity, so the same
                    // workflow phase looked visibly different from the room's actual status pill.
                    background: `${step.color}c9`,
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
              </div>
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
  avgStepDurations: periodAvgStepDurations,
  workflowAgg: periodWorkflowAgg,
}: PhasesTabProps) {
  const [calendarDay, setCalendarDay] = useState(() => {
    const day = new Date();
    if (day.getHours() < 7) day.setDate(day.getDate() - 1);
    day.setHours(0, 0, 0, 0);
    return day;
  });
  const [calendarSelectionActive, setCalendarSelectionActive] = useState(false);

  const selectedDayHistory = useMemo(() => {
    if (!calendarSelectionActive) return [];
    const start = new Date(calendarDay);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return statusHistory.filter(event => {
      const timestamp = new Date(event.timestamp).getTime();
      return timestamp >= start.getTime() && timestamp < end.getTime();
    });
  }, [calendarDay, calendarSelectionActive, statusHistory]);

  const selectedDayStepTotals = useMemo(() => {
    const totals = new Map<string, number>();
    selectedDayHistory.forEach(event => {
      if (event.event_type !== 'step_change' || !event.step_name || !event.duration_seconds) return;
      if (isIdlePhaseName(event.step_name)) return;
      totals.set(event.step_name, (totals.get(event.step_name) || 0) + event.duration_seconds);
    });
    return totals;
  }, [selectedDayHistory]);

  const selectedDayStepDurations = useMemo(() => workflowSteps.map(step => {
    if (isIdlePhaseName(step.title)) return 0;
    const samples = selectedDayHistory.filter(event => (
      event.event_type === 'step_change'
      && event.step_name === step.title
      && Boolean(event.duration_seconds)
    ));
    if (samples.length === 0) return 0;
    return Math.round(samples.reduce((sum, event) => sum + (event.duration_seconds || 0), 0) / samples.length / 60);
  }), [selectedDayHistory, workflowSteps]);

  const selectedDayTotalSeconds = useMemo(
    () => Array.from(selectedDayStepTotals.values()).reduce((sum, value) => sum + value, 0),
    [selectedDayStepTotals],
  );

  const selectedDayWorkflowAgg = useMemo(() => workflowSteps.map(step => {
    const seconds = isIdlePhaseName(step.title) ? 0 : selectedDayStepTotals.get(step.title) || 0;
    return {
      title: step.title,
      color: step.color,
      pct: selectedDayTotalSeconds > 0 ? Math.round((seconds / selectedDayTotalSeconds) * 100) : 0,
    };
  }), [selectedDayStepTotals, selectedDayTotalSeconds, workflowSteps]);

  const avgStepDurations = calendarSelectionActive ? selectedDayStepDurations : periodAvgStepDurations;
  const workflowAgg = calendarSelectionActive ? selectedDayWorkflowAgg : periodWorkflowAgg;

  const calendarHeat = useMemo(() => {
    const counts: Record<string, number> = {};
    statusHistory.forEach(event => {
      if (event.event_type !== 'step_change' || !event.timestamp || isIdlePhaseName(event.step_name || '')) return;
      const date = new Date(event.timestamp);
      if (date.getHours() < 7) date.setDate(date.getDate() - 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const maximum = Math.max(1, ...Object.values(counts));
    return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / maximum]));
  }, [statusHistory]);

  // ── Computed metrics ──
  const cyclePhaseIndices = useMemo(
    () => workflowSteps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => !isIdlePhaseName(step.title) && !isIdlePhaseName(step.name))
      .map(({ index }) => index),
    [workflowSteps],
  );

  const avgCycleDuration = useMemo(
    () => cyclePhaseIndices.reduce((sum, index) => sum + (avgStepDurations[index] || 0), 0),
    [avgStepDurations, cyclePhaseIndices],
  );

  const longestPhaseIdx = useMemo(
    () => cyclePhaseIndices.reduce(
      (maxIdx, index) => (avgStepDurations[index] > (avgStepDurations[maxIdx] || 0) ? index : maxIdx),
      cyclePhaseIndices[0] ?? 0,
    ),
    [avgStepDurations, cyclePhaseIndices],
  );

  const shortestPhaseIdx = useMemo(() => {
    const measured = cyclePhaseIndices.filter(index => (avgStepDurations[index] || 0) > 0);
    return measured.reduce(
      (minIdx, index) => (avgStepDurations[index] < avgStepDurations[minIdx] ? index : minIdx),
      measured[0] ?? cyclePhaseIndices[0] ?? 0,
    );
  }, [avgStepDurations, cyclePhaseIndices]);

  // Room counts per phase
  const roomsPerPhase = useMemo(() => 
    workflowSteps.map((_, i) => rooms.filter(r => r.currentStepIndex === i).length),
    [rooms, workflowSteps]
  );

  // Data for charts
  const barChartData = cyclePhaseIndices.map(i => ({
    step: workflowSteps[i],
    i,
  })).map(({ step, i }) => ({
    name: step.title.split(' ').slice(-1)[0],
    duration: avgStepDurations[i] || 0,
    color: step.color,
    fullName: step.title,
  }));

  let cumulativeMinutes = 0;
  const cumulativeData = cyclePhaseIndices.map(i => {
    const step = workflowSteps[i];
    cumulativeMinutes += avgStepDurations[i] || 0;
    return {
      name: step.title.split(' ').slice(-1)[0],
      duration: avgStepDurations[i] || 0,
      cumulative: cumulativeMinutes,
      color: step.color,
    };
  });

  const cycleWorkflowAgg = cyclePhaseIndices.map(index => ({
    ...(workflowAgg[index] ?? { title: workflowSteps[index].title, color: workflowSteps[index].color, pct: 0 }),
    index,
  }));

  const activePeriodLabel = calendarSelectionActive
    ? calendarDay.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : periodLabel;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 xl:order-2">
          <Card className={`relative overflow-hidden p-5 ${PHASE_CARD_CLASS}`}>
            <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}aa, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: C.muted }}>Fáze</p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>
                  Průběh operačního cyklu
                </h2>
                <p className="mt-1 text-[11px]" style={{ color: C.muted }}>
                  Délky fází, jejich podíl a aktuální rozložení operačních sálů
                </p>
              </div>
              <span className="rounded-md px-3 py-2 text-[11px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
                Období: {activePeriodLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <PhaseMetric label="Průměrný cyklus" value={`${Math.round(avgCycleDuration)} min`} detail="součet průměrných fází" icon={Timer} color={C.accent} />
              <PhaseMetric label="Nejdelší fáze" value={`${Math.round(avgStepDurations[longestPhaseIdx] || 0)} min`} detail={workflowSteps[longestPhaseIdx]?.title || 'Bez dat'} icon={Clock} color={C.red} />
              <PhaseMetric label="Nejrychlejší fáze" value={`${Math.round(avgStepDurations[shortestPhaseIdx] || 0)} min`} detail={workflowSteps[shortestPhaseIdx]?.title || 'Bez dat'} icon={Zap} color={C.green} />
              <PhaseMetric label="Operační sály" value={String(rooms.length)} detail={`${cyclePhaseIndices.filter(index => roomsPerPhase[index] > 0).length} aktivních fází cyklu`} icon={Layers} color={C.purple} />
            </div>
          </Card>

          <Card className={`p-5 lg:p-6 ${PHASE_CARD_CLASS}`}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Podíl jednotlivých fází</h3>
                <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Poměr průměrného času vůči celému operačnímu cyklu</p>
              </div>
              <span className="rounded-md px-2.5 py-1 text-[10px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
                {cycleWorkflowAgg.filter(item => item.pct > 0).length} měřených fází
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-5">
              {cycleWorkflowAgg.filter(item => item.pct > 0).map(item => (
                <PhaseRing
                  key={`${item.title}-${item.index}`}
                  label={item.title}
                  duration={avgStepDurations[item.index] || 0}
                  percentage={item.pct}
                  color={item.color}
                />
              ))}
            </div>
          </Card>

          <Card className={`p-5 ${PHASE_CARD_CLASS}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: C.accent, background: `${C.accent}14`, border: `1px solid ${C.accent}2e` }}>
                  <Layers size={16} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Timeline operačního cyklu</h3>
                  <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Průměrná návaznost a délka fází</p>
                </div>
              </div>
              <span className="rounded-md px-2.5 py-1 text-[10px] font-medium" style={{ background: C.ghost, color: C.muted, border: `1px solid ${C.border}` }}>{activePeriodLabel}</span>
            </div>
            <TimelineGantt workflowSteps={workflowSteps} avgStepDurations={avgStepDurations} />
          </Card>

          <Card className={`relative overflow-hidden p-5 ${PHASE_CARD_CLASS}`}>
            <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.green}aa, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium" style={{ color: C.green }}>Evropská referenční praxe</p>
                <h3 className="mt-1 text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Optimální timeline operačního cyklu</h3>
                <p className="mt-1 text-[10px]" style={{ color: C.muted }}>Procesní benchmark pro elektivní provoz; délka samotného výkonu zůstává závislá na typu operace.</p>
              </div>
              <span className="rounded-md px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.green, background: `${C.green}0d`, border: `1px solid ${C.green}30` }}>NHS England 2025</span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { order: '01', title: 'Příprava dalšího pacienta', time: '−20 až 0 min', note: 'Probíhá souběžně před uvolněním sálu', color: C.blue },
                { order: '02', title: 'Převzetí pacienta', time: 'čekání max. 5–10 min', note: 'Pacient nemá čekat zbytečně v anesteziologickém prostoru', color: C.cyan },
                { order: '03', title: 'Anesteziologický přechod', time: 'kritická cesta ≈ 10 min', note: 'Další pacient je připraven při návratu anesteziologa', color: C.purple },
                { order: '04', title: 'Operační výkon', time: 'dle výkonu a oboru', note: 'Klinickou délku nelze bezpečně stanovit jedním limitem', color: C.green },
              ].map(item => (
                <div key={item.order} className="relative overflow-hidden rounded-xl p-3.5" style={INNER_PANEL_STYLE}>
                  <span className="absolute inset-x-3 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }} />
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-mono" style={{ color: item.color, background: `${item.color}12`, border: `1px solid ${item.color}2a` }}>{item.order}</span>
                    <p className="text-[10px] font-semibold leading-4" style={{ color: C.textHi }}>{item.title}</p>
                  </div>
                  <p className="mt-3 text-[14px] font-light tabular-nums" style={{ color: item.color }}>{item.time}</p>
                  <p className="mt-1 text-[9px] leading-4" style={{ color: C.muted }}>{item.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: C.border }}>
              <span className="rounded-md px-2.5 py-1 text-[9px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>Cíl touch-time využití ≥ 85 %</span>
              <span className="rounded-md px-2.5 py-1 text-[9px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>První pacient bez pozdního startu</span>
              <a
                href="https://www.england.nhs.uk/long-read/theatres-surgery-and-perioperative-care/"
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-[9px] font-medium underline decoration-white/20 underline-offset-2 hover:decoration-white/50"
                style={{ color: C.muted }}
              >
                Zdroj a metodika
              </a>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 xl:order-1">
          <Card className={`relative overflow-hidden p-5 ${PHASE_CARD_CLASS}`}>
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.accent }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.accent, background: `${C.accent}0f`, border: `1px solid ${C.accent}2f` }}>
                  <Timer className="h-5 w-5" />
                </span>
                <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: C.accent, border: `1px solid ${C.accent}35` }}>reálná data</span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>Průměrný cyklus</p>
              <div className="mt-1 flex items-end gap-2">
                <AnimatedCounter value={avgCycleDuration} format={value => Math.round(value).toString()} className="text-[52px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }} />
                <span className="pb-1 text-[11px]" style={{ color: C.muted }}>minut</span>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>{activePeriodLabel} · naměřené fáze výkonu</p>

              <div className="mt-5 flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                {cycleWorkflowAgg.filter(item => item.pct > 0).map(item => (
                  <span key={`${item.title}-${item.index}`} style={{ width: `${item.pct}%`, background: item.color }} title={`${item.title}: ${item.pct} %`} />
                ))}
              </div>
              <div className="mt-4 space-y-2.5">
                {[...cycleWorkflowAgg]
                  .sort((a, b) => b.pct - a.pct)
                  .slice(0, 4)
                  .map(item => (
                    <div key={`${item.title}-${item.index}`} className="flex items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>{item.title}</span>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{item.pct} %</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="relative mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: C.border }}>
              {[
                ['Nejdelší fáze', workflowSteps[longestPhaseIdx]?.title || '–'],
                ['Nejkratší fáze', workflowSteps[shortestPhaseIdx]?.title || '–'],
                ['Počet fází', String(cyclePhaseIndices.length)],
                ['Počet sálů', String(rooms.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
                  <span className="max-w-[145px] truncate text-[11px] font-semibold" style={{ color: C.textHi }} title={value}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="print-hide">
            <GlassCalendar
              value={calendarDay}
              onChange={day => {
                setCalendarDay(day);
                setCalendarSelectionActive(true);
              }}
              heat={calendarHeat}
              accent={C.blue}
            />
            {calendarSelectionActive && (
              <button
                type="button"
                onClick={() => setCalendarSelectionActive(false)}
                className="mt-2 w-full rounded-lg px-3 py-2 text-[10px] font-medium transition-colors hover:bg-white/5"
                style={{ color: C.text, background: C.surface2, border: `1px solid ${C.border}` }}
              >
                Zobrazit celé období
              </button>
            )}
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={`p-5 ${PHASE_CARD_CLASS}`} icon={BarChart3} title="Trvání jednotlivých fází" subtitle="Průměr v minutách" accent={C.blue}>
          <div className="mt-3 rounded-lg p-3" style={INNER_PANEL_STYLE}>
            <ResponsiveContainer width="100%" height={190} minWidth={0} minHeight={0}>
              <BarChart data={barChartData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 58 }} barSize={13}>
                <CartesianGrid stroke={C.ghost} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="fullName" stroke={C.ghost} fontSize={8} tickLine={false} axisLine={false} width={54} />
                <Tooltip {...TIP} formatter={(value: number) => [`${Math.round(value)} min`, 'Trvání']} />
                <Bar dataKey="duration" radius={[0, 5, 5, 0]}>
                  {barChartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className={`p-5 ${PHASE_CARD_CLASS}`} icon={Timer} title="Kumulativní průběh" subtitle="Nárůst času během cyklu" accent={C.cyan}>
          <div className="mt-3 rounded-lg p-3" style={INNER_PANEL_STYLE}>
            <ResponsiveContainer width="100%" height={190} minWidth={0} minHeight={0}>
              <AreaChart data={cumulativeData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.ghost} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.ghost} fontSize={8} tickLine={false} axisLine={false} />
                <YAxis stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip {...TIP} formatter={(value: number) => [`${Math.round(value)} min`, 'Kumulativně']} />
                <Area type="monotone" dataKey="cumulative" stroke={C.accent} strokeWidth={2} fill="url(#cumGradient)" dot={{ fill: C.accent, strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className={`p-5 ${PHASE_CARD_CLASS}`} icon={Layers} title="Nejvýznamnější fáze" subtitle="Pořadí podle podílu cyklu" accent={C.purple}>
          <div className="mt-4 space-y-3">
            {[...cycleWorkflowAgg]
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 5)
              .map((item, rank) => (
                <div key={`${item.title}-${item.index}`} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[9px] font-semibold tabular-nums" style={{ color: item.color, background: `${item.color}12`, border: `1px solid ${item.color}30` }}>{String(rank + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[10px] font-medium" style={{ color: C.text }}>{item.title}</span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.textHi }}>{item.pct} %</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                      <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <Card className={`p-5 ${PHASE_CARD_CLASS}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Přehled jednotlivých fází</h3>
            <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Délka, podíl cyklu a počet sálů v každé fázi</p>
          </div>
          <span className="rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>{cyclePhaseIndices.length} fází</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cyclePhaseIndices.map(index => {
            const step = workflowSteps[index];
            return (
            <PhaseCard
              key={step.name}
              step={step}
              duration={avgStepDurations[index] || 0}
              pct={workflowAgg[index]?.pct || 0}
              isBottleneck={index === longestPhaseIdx && avgStepDurations[index] > 0}
              roomsInPhase={roomsPerPhase[index]}
              totalRooms={rooms.length}
            />
            );
          })}
        </div>
      </Card>

      <Card className={`p-5 ${PHASE_CARD_CLASS}`}>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: C.blue, background: C.ghost, border: `1px solid ${C.border}` }}><Layers className="h-4 w-4" /></span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Podrobná evidence fází</h3>
            <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Úplné pořadí, naměřené časy a aktuální stav sálů</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg" style={INNER_PANEL_STYLE}>
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr style={{ background: C.ghost }}>
                {['Fáze', 'Trvání', 'Podíl', 'Sály', 'Vyhodnocení'].map((label, index) => (
                  <th key={label} className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] ${index === 0 ? 'text-left' : index === 4 ? 'text-center' : 'text-right'}`} style={{ color: C.faint }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cyclePhaseIndices.map((index, phasePosition) => {
                const step = workflowSteps[index];
                const duration = avgStepDurations[index] || 0;
                const pct = workflowAgg[index]?.pct || 0;
                const isBottleneck = index === longestPhaseIdx && duration > 0;
                const isFastest = index === shortestPhaseIdx && duration > 0;
                return (
                  <tr key={step.name} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-mono" style={{ color: step.color, background: `${step.color}14`, border: `1px solid ${step.color}28` }}>{String(phasePosition + 1).padStart(2, '0')}</span>
                        <span className="font-medium" style={{ color: C.textHi }}>{step.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums" style={{ color: step.color }}>{Math.round(duration)} min</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: C.muted }}>{pct} %</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: C.text }}>{roomsPerPhase[index]}</td>
                    <td className="px-3 py-3 text-center">
                      {isBottleneck ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${C.red}15`, color: C.red }}>Nejdelší fáze</span>
                      ) : isFastest ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${C.green}15`, color: C.green }}><CheckCircle2 size={9} /> Nejkratší fáze</span>
                      ) : <span className="text-[9px]" style={{ color: C.muted }}>Standardní průběh</span>}
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
