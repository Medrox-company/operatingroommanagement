'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, CartesianGrid, Area, AreaChart
} from 'recharts';
import type { OperatingRoom } from '../../types';
import { RoomStatus } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import { C, Card, formatMinutes, SectionHeader } from './shared';

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

const TIP = {
  contentStyle: {
    background: 'rgba(15,23,42,0.95)',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 11,
    color: C.text,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.muted }}>
    {children}
  </h3>
);

export function PhasesTab({
  rooms,
  statusHistory,
  periodLabel,
  workflowSteps,
  avgStepDurations,
  workflowAgg,
}: PhasesTabProps) {
  // KPI: Průměrná doba cyklu
  const avgCycleDuration = useMemo(
    () => avgStepDurations.reduce((a, b) => a + b, 0),
    [avgStepDurations]
  );

  // KPI: Nejdelší fáze
  const longestPhaseIdx = useMemo(
    () => avgStepDurations.reduce((maxIdx, val, i) => (val > avgStepDurations[maxIdx] ? i : maxIdx), 0),
    [avgStepDurations]
  );

  return (
    <div className="space-y-5">
      {/* ── KPI karty ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>
            Cyklus
          </p>
          <p className="text-2xl font-bold" style={{ color: C.accent }}>
            {Math.round(avgCycleDuration)}
          </p>
          <p className="text-xs mt-1" style={{ color: C.faint }}>
            minut
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>
            Nejdelší fáze
          </p>
          <p className="text-2xl font-bold" style={{ color: workflowSteps[longestPhaseIdx]?.color || C.orange }}>
            {Math.round(avgStepDurations[longestPhaseIdx] || 0)}
          </p>
          <p className="text-xs mt-1" style={{ color: C.faint }}>
            {workflowSteps[longestPhaseIdx]?.title || '–'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>
            Sály v provozu
          </p>
          <p className="text-2xl font-bold" style={{ color: C.green }}>
            {rooms.filter(r => r.status === RoomStatus.BUSY).length}
          </p>
          <p className="text-xs mt-1" style={{ color: C.faint }}>
            z {rooms.length} sálů
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>
            Období
          </p>
          <p className="text-lg font-bold" style={{ color: C.text }}>
            {periodLabel}
          </p>
          <p className="text-xs mt-1" style={{ color: C.faint }}>
            Vybraná data
          </p>
        </Card>
      </div>

      {/* ── Workflow agregace — stacked bar ── */}
      <Card className="p-5">
        <SectionLabel>Průměrné procentuální zastoupení fází ({periodLabel})</SectionLabel>
        <div className="flex h-10 w-full rounded-lg overflow-hidden gap-px mb-4">
          {workflowAgg.map((seg, i) => (
            <motion.div
              key={i}
              className="h-full relative"
              style={{ background: seg.color, opacity: 0.85 }}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
              title={`${seg.title} — ${seg.pct}%`}
            >
              {seg.pct >= 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black/70 pointer-events-none">
                  {seg.pct}%
                </span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {workflowAgg.map((seg, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-[2px]" style={{ background: seg.color }} />
                <span className="text-xs" style={{ color: C.muted }}>
                  {seg.title}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: seg.color, opacity: 0.8 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${seg.pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs font-bold mt-1 text-right" style={{ color: seg.color }}>
                {seg.pct}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Trvání fází — horizontal bar chart ── */}
      <Card className="p-5">
        <SectionLabel>Průměrné trvání fází — minuty ({periodLabel})</SectionLabel>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={workflowSteps.map((step, i) => ({
              name: step.title.split(' ').slice(-1)[0],
              min: avgStepDurations[i] || 0,
              color: step.color,
            }))}
            layout="vertical"
            margin={{ top: 0, right: 24, bottom: 0, left: 60 }}
            barSize={16}
          >
            <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip {...TIP} formatter={(v: number) => [`${v} min`, 'Trvání']} />
            <Bar dataKey="min" radius={[0, 4, 4, 0]}>
              {workflowSteps.map((_, i) => (
                <Cell key={i} fill={workflowSteps[i].color} opacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Aktuální distribuce sálů ── */}
      <Card className="p-5">
        <SectionLabel>Aktuální workflow fáze — počet sálů na každém kroku</SectionLabel>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={workflowSteps.map((step, i) => ({
              name: step.title.split(' ').slice(-1)[0],
              count: rooms.filter(r => r.currentStepIndex === i).length,
              color: step.color,
            }))}
            margin={{ top: 0, right: 0, bottom: 0, left: -24 }}
            barSize={28}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...TIP} formatter={(v: number) => [`${v} sálů`, 'Počet']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {workflowSteps.map((_, i) => (
                <Cell key={i} fill={workflowSteps[i].color} opacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Pie + tabulka fází ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionLabel>Struktura operačního cyklu (Pie)</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={workflowAgg.filter(s => s.pct > 0)}
                dataKey="pct"
                nameKey="title"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={0}
              >
                {workflowAgg.filter(s => s.pct > 0).map((seg, i) => (
                  <Cell key={i} fill={seg.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip {...TIP} formatter={(v: number) => [`${v}%`, 'Podíl']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <SectionLabel>Detail fází — procenta a minuty</SectionLabel>
          <div className="space-y-3">
            {workflowAgg.map((seg, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: seg.color }} />
                    <span className="text-sm" style={{ color: C.text }}>
                      {seg.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono" style={{ color: C.faint }}>
                      {Math.round(avgStepDurations[i] || 0)} min
                    </span>
                    <span className="text-sm font-bold w-12 text-right" style={{ color: seg.color }}>
                      {seg.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: seg.color, opacity: 0.85 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${seg.pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
