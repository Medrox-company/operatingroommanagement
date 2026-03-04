'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, X, Activity, Users, Clock,
  LayoutGrid, BarChart3, Thermometer, ChevronRight,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS, WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

type View = 'overview' | 'rooms' | 'charts' | 'heatmap';

const ACCENT = '#06B6D4';
const GREEN  = '#10B981';
const ORANGE = '#F97316';
const YELLOW = '#FBBF24';

const UPS_DEPTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
const isUPS = (r: OperatingRoom) => r.isEmergency || UPS_DEPTS.includes(r.department);
const dayMin = (r: OperatingRoom) => (isUPS(r) ? 1440 : 720);

function scColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY)      return ORANGE;
  if (s === RoomStatus.FREE)      return GREEN;
  if (s === RoomStatus.CLEANING)  return ACCENT;
  return '#6B7280';
}
function scLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY)      return 'Obsazeno';
  if (s === RoomStatus.FREE)      return 'Volno';
  if (s === RoomStatus.CLEANING)  return 'Úklid';
  return 'Údržba';
}

type Seg = { color: string; title: string; pct: number; min: number };

function buildTimeline(room: OperatingRoom): Seg[] {
  const dm = dayMin(room);
  const passes = Math.max(1, Math.floor(room.operations24h * (dm / 1440)));
  const durs = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const cycleTotal = durs.reduce((a, b) => a + b, 0);
  const mpp = Math.floor(dm / passes);
  const raw: Seg[] = [];
  for (let p = 0; p < passes; p++) {
    WORKFLOW_STEPS.forEach((step, si) => {
      const m = Math.round((durs[si] / cycleTotal) * mpp);
      if (m > 0) raw.push({ color: step.color, title: step.title, pct: (m / dm) * 100, min: m });
    });
    if (p < passes - 1) raw.push({ color: 'rgba(255,255,255,0.06)', title: 'Pauza', pct: (4 / dm) * 100, min: 4 });
  }
  const total = raw.reduce((a, s) => a + s.pct, 0);
  return raw.map(s => ({ ...s, pct: (s.pct / total) * 100 }));
}

function mergeSeg(segs: Seg[]): Seg[] {
  return segs.reduce<Seg[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.title === s.title) { last.pct += s.pct; last.min += s.min; }
    else acc.push({ ...s });
    return acc;
  }, []);
}

function buildDist(room: OperatingRoom): Seg[] {
  const durs = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const total = durs.reduce((a, b) => a + b, 0);
  return WORKFLOW_STEPS.map((s, i) => ({
    color: s.color, title: s.title,
    pct: Math.round((durs[i] / total) * 100), min: durs[i],
  }));
}

// Seeded random-ish helpers
const seed = (id: string, n: number) => (parseInt(id, 10) * 31 + n * 17) % 100;

function dayCurve(room: OperatingRoom) {
  const ups = isUPS(room);
  const start = ups ? 0 : 7;
  const len   = ups ? 24 : 12;
  return Array.from({ length: len }, (_, i) => ({
    t: `${start + i}`,
    v: Math.max(5, Math.min(100, 55 + seed(room.id, i) - 25 + (i < 3 ? i * 8 : i > 9 ? -(i - 9) * 5 : 20))),
  }));
}

function weekBars(room: OperatingRoom) {
  const days = ['Po','Út','St','Čt','Pá','So','Ne'];
  return days.map((d, di) => {
    const base: Record<string, number | string> = { d };
    WORKFLOW_STEPS.forEach((step, si) => {
      const dur = si === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[si];
      base[step.title] = di >= 5 ? Math.floor(dur * 0.3) : Math.max(1, dur + seed(room.id, di + si) % 15 - 7);
    });
    return base;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────────────────────
const TT = {
  contentStyle: { background: 'rgba(4,11,28,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  labelStyle: { color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  itemStyle: { color: ACCENT },
};

// ─────────────────────────────────────────────────────────────────────────────
// Global mock data
// ─────────────────────────────────────────────────────────────────────────────
const WEEK_DATA = [
  { t: 'Po', v: 92 }, { t: 'Út', v: 88 }, { t: 'St', v: 95 },
  { t: 'Čt', v: 87 }, { t: 'Pá', v: 79 }, { t: 'So', v: 45 }, { t: 'Ne', v: 30 },
];
const MONTH_DATA = Array.from({ length: 30 }, (_, i) => ({
  t: `${i + 1}`,
  v: [88,82,90,74,85,91,78,72,86,93,89,84,77,88,92,70,83,87,79,91,85,74,88,93,80,76,89,82,91,86][i],
}));
const HEAT: number[][] = [
  [5,5,5,5,5,5,5,10,45,80,95,90,88,85,90,92,88,75,60,40,20,10,5,5],
  [5,5,5,5,5,5,5,12,50,82,96,91,89,86,91,93,89,76,61,41,21,10,5,5],
  [5,5,5,5,5,5,5,10,48,79,94,90,88,85,90,92,88,74,59,39,20,9,5,5],
  [5,5,5,5,5,5,5,11,47,81,93,89,87,84,89,91,87,73,58,38,19,9,5,5],
  [5,5,5,5,5,5,5,9,40,72,86,82,80,77,82,84,80,66,51,32,15,7,5,5],
  [5,5,5,5,5,5,5,5,15,30,45,52,48,44,48,50,44,32,22,14,8,5,5,5],
  [5,5,5,5,5,5,5,5,5,10,18,22,20,18,20,22,18,12,8,5,5,5,5,5],
];
const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];

function heatColor(v: number) {
  if (v >= 90) return 'rgba(255,59,48,0.85)';
  if (v >= 70) return 'rgba(249,115,22,0.75)';
  if (v >= 50) return 'rgba(251,191,36,0.65)';
  if (v >= 25) return 'rgba(16,185,129,0.60)';
  return 'rgba(255,255,255,0.05)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared card wrapper
// ─────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl p-5 ${className}`}
    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">{children}</p>
);

// ─────────────────────────────────────────────────────────────────────────────
// Room mini box
// ─────────────────────────────────────────────────────────────────────────────
const RoomBox: React.FC<{ room: OperatingRoom; idx: number; onSelect: () => void }> = ({ room, idx, onSelect }) => {
  const sc       = scColor(room.status);
  const ups      = isUPS(room);
  const timeline = useMemo(() => mergeSeg(buildTimeline(room)), [room]);
  const dist     = useMemo(() => buildDist(room), [room]);
  const util     = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;

  return (
    <motion.button
      onClick={onSelect}
      className="text-left w-full rounded-lg p-3 flex flex-col gap-2"
      style={{
        background: room.status === RoomStatus.BUSY ? `${sc}0A` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${room.status === RoomStatus.BUSY ? `${sc}40` : 'rgba(255,255,255,0.07)'}`,
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: idx * 0.02 }}
      whileHover={{ scale: 1.025 } as any}
    >
      {/* Row 1: dot + name + badges */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 4px ${sc}` }} />
        <span className="text-xs font-black text-white/85 truncate flex-1">{room.name}</span>
        {ups      && <span className="text-[8px] font-black px-1 py-px rounded shrink-0" style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}>ÚPS</span>}
        {room.isSeptic && <span className="text-[8px] font-black px-1 py-px rounded shrink-0" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>SEP</span>}
      </div>

      {/* Row 2: dept */}
      <p className="text-[9px] text-white/30 truncate leading-none">{room.department}</p>

      {/* Row 3: timeline */}
      <div className="flex h-1.5 w-full rounded overflow-hidden gap-px">
        {timeline.map((seg, i) => (
          <div key={i} className="h-full shrink-0" style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.9 }} />
        ))}
      </div>

      {/* Row 4: KPIs + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[9px] text-white/25">Ops <span className="font-black text-white/70" style={{ color: ACCENT }}>{room.operations24h}</span></span>
          <span className="text-[9px] text-white/25">Výk <span className="font-black text-white/60">{util}%</span></span>
          <span className="text-[9px] text-white/25">Fr <span className="font-black text-white/60">{room.queueCount}</span></span>
        </div>
        <span className="text-[8px] font-black uppercase px-1.5 py-px rounded" style={{ background: `${sc}15`, color: sc }}>
          {scLabel(room.status).slice(0, 3)}
        </span>
      </div>
    </motion.button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Room detail slide-over
// ─────────────────────────────────────────────────────────────────────────────
const RoomDetail: React.FC<{ room: OperatingRoom; onClose: () => void }> = ({ room, onClose }) => {
  const sc        = scColor(room.status);
  const ups       = isUPS(room);
  const dm        = dayMin(room);
  const opsDay    = Math.max(1, Math.floor(room.operations24h * (dm / 1440)));
  const timeline  = useMemo(() => mergeSeg(buildTimeline(room)), [room]);
  const dist      = useMemo(() => buildDist(room), [room]);
  const curve     = useMemo(() => dayCurve(room), [room]);
  const weekly    = useMemo(() => weekBars(room), [room]);
  const util      = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const pieData   = useMemo(() => dist.filter(d => d.min > 0), [dist]);

  const phaseData = WORKFLOW_STEPS.map((step, i) => ({
    name: step.title.split(' ').pop() ?? step.title,
    min: i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i],
    color: step.color,
  }));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Slide-over panel */}
      <motion.div
        className="ml-auto h-full w-full max-w-3xl overflow-y-auto"
        style={{ background: 'rgb(5,13,30)', borderLeft: `1px solid ${sc}25` }}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4"
          style={{ background: 'rgb(5,13,30)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 8px ${sc}` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white/95">{room.name}</h2>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${sc}18`, color: sc }}>{scLabel(room.status)}</span>
              {ups && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4' }}>ÚPS 24 h</span>}
              {room.isSeptic && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>SEPTICKÝ</span>}
            </div>
            <p className="text-xs text-white/30 mt-0.5">{room.department} — {room.currentProcedure?.name ?? 'Žádný výkon'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/35 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: 'Výkony / den', v: opsDay,       c: ACCENT },
              { l: 'Využití',      v: `${util}%`,   c: 'rgba(255,255,255,0.8)' },
              { l: 'Fronta',       v: room.queueCount, c: 'rgba(255,255,255,0.8)' },
              { l: 'Provoz',       v: ups ? '24 h' : '12 h', c: ups ? ACCENT : 'rgba(255,255,255,0.5)' },
            ].map((k, i) => (
              <Card key={i} className="!p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 leading-tight">{k.l}</p>
                <p className="text-2xl font-black leading-none" style={{ color: k.c }}>{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Timeline bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>Časová osa — {ups ? '00:00–24:00' : '07:00–19:00'}</SectionTitle>
              <span className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: ups ? ACCENT : 'rgba(255,255,255,0.2)' }}>
                {ups ? 'ÚPS / Služba' : 'Pracovní doba'}
              </span>
            </div>
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-px">
              {timeline.map((seg, i) => (
                <div key={i} className="h-full shrink-0 relative" style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.88 }}
                  title={`${seg.title} — ${seg.min} min`}>
                  {seg.pct >= 9 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-black/65 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Step legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {WORKFLOW_STEPS.map((step, si) => {
                const match = timeline.filter(s => s.title === step.title);
                const pct = match.reduce((a, s) => a + s.pct, 0);
                const min = match.reduce((a, s) => a + s.min, 0);
                if (!min) return null;
                return (
                  <div key={si} className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-[2px] shrink-0 mt-0.5" style={{ background: step.color }} />
                    <div>
                      <p className="text-[9px] text-white/35 leading-tight truncate">{step.title}</p>
                      <p className="text-xs font-black leading-tight" style={{ color: step.color }}>
                        {Math.round(pct)}%
                        <span className="text-white/25 font-normal ml-1">{min} min</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts: 2 column */}
          <div className="grid grid-cols-2 gap-4">

            {/* Day curve */}
            <Card>
              <SectionTitle>Vytížení v průběhu dne</SectionTitle>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={curve} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id={`g${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={sc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`, 'Vytížení']} />
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#g${room.id})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Status dist horizontal bars */}
            <Card>
              <SectionTitle>Rozložení statusů</SectionTitle>
              <div className="space-y-2.5">
                {dist.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-white/50">{d.title}</span>
                      </div>
                      <span className="text-xs font-black" style={{ color: d.color }}>{d.pct}%
                        <span className="text-white/25 font-normal ml-1">{d.min} min</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: d.color, opacity: 0.85 }}
                        initial={{ width: 0 }} animate={{ width: `${d.pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Charts: 3 column */}
          <div className="grid grid-cols-3 gap-4">

            {/* Phase duration bar (horizontal) */}
            <Card>
              <SectionTitle>Délka fází</SectionTitle>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={phaseData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barSize={7}>
                  <XAxis type="number" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} width={52} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v} min`, 'Trvání']} />
                  <Bar dataKey="min" radius={[0,2,2,0]}>
                    {phaseData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.82} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie chart */}
            <Card>
              <SectionTitle>Struktura cyklu</SectionTitle>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={pieData} dataKey="pct" nameKey="title" cx="50%" cy="50%"
                    innerRadius={32} outerRadius={54} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={TT.contentStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-[1px] shrink-0" style={{ background: d.color }} />
                    <span className="text-[8px] text-white/35">{d.title.split(' ').pop()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Radar */}
            <Card>
              <SectionTitle>Výkonnostní profil</SectionTitle>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={[
                  { s: 'Využití', A: Math.min(100, 50 + (parseInt(room.id) * 7) % 50) },
                  { s: 'Výkony',  A: Math.min(100, room.operations24h * 10) },
                  { s: 'Efekt.',  A: Math.min(100, 60 + (parseInt(room.id) * 11) % 40) },
                  { s: 'Personál', A: Math.min(100, 70 + (parseInt(room.id) * 3) % 30) },
                  { s: 'Čistota', A: Math.min(100, 75 + (parseInt(room.id) * 5) % 25) },
                ]} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="s" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700 }} />
                  <Radar dataKey="A" stroke={sc} fill={sc} fillOpacity={0.12} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Weekly stacked bar */}
          <Card>
            <SectionTitle>Týdenní rozložení workflow (min / den)</SectionTitle>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekly} margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={18}>
                <XAxis dataKey="d" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                {WORKFLOW_STEPS.map(s => (
                  <Bar key={s.title} dataKey={s.title} stackId="w" fill={s.color} opacity={0.82} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {WORKFLOW_STEPS.map(s => (
                <div key={s.title} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: s.color }} />
                  <span className="text-[9px] text-white/35">{s.title}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Personnel + patient */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Personál</SectionTitle>
              <div className="space-y-3">
                {[
                  { role: 'Chirurg', name: room.staff.doctor.name },
                  { role: 'Sestra', name: room.staff.nurse.name },
                  { role: 'Anesteziolog', name: room.staff.anesthesiologist?.name ?? null },
                ].map(p => (
                  <div key={p.role} className="flex items-center justify-between">
                    <span className="text-xs text-white/30 uppercase tracking-wider">{p.role}</span>
                    <span className="text-xs font-bold text-white/65">{p.name ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Card>

            {room.currentPatient ? (
              <Card>
                <SectionTitle>Aktuální pacient</SectionTitle>
                <div className="space-y-3">
                  {[
                    { l: 'Jméno', v: room.currentPatient.name },
                    { l: 'Věk', v: `${room.currentPatient.age} let` },
                    { l: 'Krevní skupina', v: room.currentPatient.bloodType ?? '—' },
                  ].map(f => (
                    <div key={f.l} className="flex items-center justify-between">
                      <span className="text-xs text-white/30 uppercase tracking-wider">{f.l}</span>
                      <span className="text-xs font-bold text-white/65">{f.v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <SectionTitle>Aktuální výkon</SectionTitle>
                <p className="text-xs text-white/25">Žádný aktivní pacient</p>
              </Card>
            )}
          </div>

          {/* Workflow indicator */}
          <Card>
            <SectionTitle>Aktuální fáze workflow</SectionTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCur  = i === room.currentStepIndex;
                const isDone = i < room.currentStepIndex;
                return (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wide"
                      style={{
                        background: isCur ? `${step.color}20` : isDone ? 'rgba(255,255,255,0.04)' : 'transparent',
                        color:      isCur ? step.color : isDone ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
                        border:     `1px solid ${isCur ? step.color : 'rgba(255,255,255,0.07)'}`,
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: step.color, opacity: isCur ? 1 : 0.3 }} />
                      {step.title}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="w-2.5 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>

        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────────────────────────────────────

const OverviewView: React.FC<{ rooms: OperatingRoom[] }> = ({ rooms }) => {
  const busy     = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const free     = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleaning = rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const totalOps = rooms.reduce((a, r) => a + r.operations24h, 0);
  const totalQ   = rooms.reduce((a, r) => a + r.queueCount, 0);
  const avgUtil  = Math.round(rooms.reduce((a, r) => {
    const d = buildDist(r);
    return a + (d.find(x => x.title === 'Chirurgický výkon')?.pct ?? 0);
  }, 0) / rooms.length);

  // ops trend per department
  const deptData = Object.entries(
    rooms.reduce<Record<string, number>>((acc, r) => {
      acc[r.department] = (acc[r.department] ?? 0) + r.operations24h;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d, v]) => ({ d, v }));

  // status pie
  const statusPie = [
    { name: 'Obsazeno', value: busy,     color: ORANGE },
    { name: 'Volno',    value: free,     color: GREEN  },
    { name: 'Úklid',    value: cleaning, color: ACCENT },
    { name: 'Údržba',   value: rooms.length - busy - free - cleaning, color: '#6B7280' },
  ].filter(d => d.value > 0);

  // workflow aggregate
  const workflowAgg = WORKFLOW_STEPS.map(step => {
    const dist = rooms.flatMap(r => buildDist(r));
    const matching = dist.filter(d => d.title === step.title);
    return {
      name: step.title,
      color: step.color,
      pct: Math.round(matching.reduce((a, d) => a + d.pct, 0) / rooms.length),
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { l: 'Celkem sálů',  v: rooms.length,  c: 'rgba(255,255,255,0.9)' },
          { l: 'Obsazeno',     v: busy,           c: ORANGE },
          { l: 'Volno',        v: free,           c: GREEN  },
          { l: 'Ops / 24 h',   v: totalOps,       c: ACCENT },
          { l: 'Fronta',       v: totalQ,         c: YELLOW },
          { l: 'Avg. využití', v: `${avgUtil}%`,  c: 'rgba(255,255,255,0.7)' },
        ].map((k, i) => (
          <Card key={i} className="!p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 leading-tight">{k.l}</p>
            <p className="text-3xl font-black leading-none" style={{ color: k.c }}>{k.v}</p>
          </Card>
        ))}
      </div>

      {/* Row: area chart + status pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <SectionTitle>Vytížení — posledních 7 dní</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={WEEK_DATA} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="rgba(255,255,255,0.12)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.12)" fontSize={11} tickLine={false} axisLine={false} domain={[0,100]} />
              <Tooltip {...TT} formatter={(v: number) => [`${v}%`, 'Vytížení']} />
              <Area type="monotone" dataKey="v" stroke={ACCENT} fill="url(#wg)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Stav sálů</SectionTitle>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={38} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                {statusPie.map((e, i) => <Cell key={i} fill={e.color} opacity={0.85} />)}
              </Pie>
              <Tooltip contentStyle={TT.contentStyle} formatter={(v: number, name: string) => [v, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {statusPie.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-[2px]" style={{ background: d.color }} />
                <span className="text-xs text-white/40">{d.name} <span className="font-black text-white/70">{d.value}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row: dept bar + workflow agg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Výkony dle oddělení (24 h)</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }} barSize={9}>
              <XAxis type="number" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="d" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} width={70} />
              <Tooltip {...TT} formatter={(v: number) => [v, 'Výkony']} />
              <Bar dataKey="v" fill={ACCENT} opacity={0.7} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Souhrnné rozložení workflow</SectionTitle>
          <div className="flex h-5 w-full rounded overflow-hidden gap-px mb-4">
            {workflowAgg.map((w, i) => (
              <motion.div key={i} className="h-full" style={{ background: w.color, opacity: 0.85 }}
                initial={{ width: 0 }} animate={{ width: `${w.pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
                title={`${w.name} — ${w.pct}%`} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {workflowAgg.map((w, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{ background: w.color }} />
                    <span className="text-xs text-white/45">{w.name}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: w.color }}>{w.pct}%</span>
                </div>
                <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: w.color }}
                    initial={{ width: 0 }} animate={{ width: `${w.pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly area */}
      <Card>
        <SectionTitle>Vytížení — posledních 30 dní</SectionTitle>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={MONTH_DATA} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.2} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false}
              ticks={['1','5','10','15','20','25','30']} />
            <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} />
            <Tooltip {...TT} formatter={(v: number) => [`${v}%`, 'Vytížení']} />
            <Area type="monotone" dataKey="v" stroke={ACCENT} fill="url(#mg)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const RoomsView: React.FC<{ rooms: OperatingRoom[]; onSelect: (r: OperatingRoom) => void }> = ({ rooms, onSelect }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-xs text-white/30">Kliknutím na sál zobrazíte podrobné statistiky.</p>
      <div className="flex items-center gap-4 text-xs text-white/30">
        {[{ c: ORANGE, l: 'Obsazeno' }, { c: GREEN, l: 'Volno' }, { c: ACCENT, l: 'Úklid' }].map(x => (
          <div key={x.l} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
            {x.l}
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {rooms.map((r, i) => (
        <RoomBox key={r.id} room={r} idx={i} onSelect={() => onSelect(r)} />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const ChartsView: React.FC<{ rooms: OperatingRoom[] }> = ({ rooms }) => {
  const phaseRows = [
    { label: 'Příjezd na sál',     min: 12, pct: 5.5,  trend: -1   },
    { label: 'Začátek anestezie',  min: 8,  pct: 3.7,  trend: -0.5 },
    { label: 'Chirurgický výkon',  min: 95, pct: 43.8, trend: +2   },
    { label: 'Ukončení výkonu',    min: 15, pct: 6.9,  trend: -2   },
    { label: 'Ukončení anestezie', min: 10, pct: 4.6,  trend: 0    },
    { label: 'Úklid sálu',        min: 20, pct: 9.2,  trend: +1   },
    { label: 'Sál připraven',      min: 47, pct: 21.6, trend: +5   },
  ];

  const roomBarData = rooms.map(r => ({ name: r.name.replace('Sál č. ', '#'), ops: r.operations24h }));

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ops per room */}
        <Card>
          <SectionTitle>Výkony dle sálu (24 h)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roomBarData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={12}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TT} formatter={(v: number) => [v, 'Výkony']} />
              <Bar dataKey="ops" fill={ACCENT} opacity={0.75} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Phase cycle */}
        <Card>
          <SectionTitle>Průměrná délka fáze cyklu</SectionTitle>
          <div className="space-y-3">
            {phaseRows.map((ph, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {ph.trend > 0
                      ? <TrendingUp className="w-3 h-3 shrink-0" style={{ color: ORANGE }} />
                      : ph.trend < 0
                        ? <TrendingDown className="w-3 h-3 shrink-0" style={{ color: GREEN }} />
                        : <Minus className="w-3 h-3 shrink-0 opacity-25" />}
                    <span className="text-xs text-white/50">{ph.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30">{ph.min} min</span>
                    <span className="text-sm font-black" style={{ color: ACCENT }}>{ph.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: ACCENT, opacity: 0.75 }}
                    initial={{ width: 0 }} animate={{ width: `${ph.pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ComposedChart: ops bar + utilisation line */}
      <Card>
        <SectionTitle>Srovnání sálů — výkony vs. využití výkonem</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={rooms.map(r => {
            const dist = buildDist(r);
            return {
              name: r.name.replace('Sál č. ', '#'),
              ops: r.operations24h,
              util: dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0,
            };
          })} margin={{ top: 4, right: 10, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="l" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="r" orientation="right" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip {...TT} />
            <Bar yAxisId="l" dataKey="ops" fill={ACCENT} opacity={0.6} radius={[2,2,0,0]} name="Výkony" />
            <Line yAxisId="r" type="monotone" dataKey="util" stroke={ORANGE} strokeWidth={2}
              dot={{ fill: ORANGE, r: 3, strokeWidth: 0 }} name="Využití %" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3">
          {[{ c: ACCENT, l: 'Výkony' }, { c: ORANGE, l: 'Využití výkonem %' }].map(x => (
            <div key={x.l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-[2px]" style={{ background: x.c }} />
              <span className="text-xs text-white/35">{x.l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Queue + UPS breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Fronta dle sálu</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rooms.filter(r => r.queueCount > 0).map(r => ({ name: r.name.replace('Sál č. ', '#'), q: r.queueCount }))}
              margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={14}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TT} formatter={(v: number) => [v, 'Fronta']} />
              <Bar dataKey="q" fill={YELLOW} opacity={0.7} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Přehled sálů</SectionTitle>
          <div className="space-y-2">
            {rooms.map(r => {
              const sc = scColor(r.status);
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc }} />
                  <span className="text-xs text-white/60 w-20 truncate">{r.name}</span>
                  <span className="text-xs text-white/30 flex-1 truncate">{r.department}</span>
                  <span className="text-xs font-black" style={{ color: ACCENT }}>{r.operations24h}</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-px rounded"
                    style={{ background: `${sc}14`, color: sc }}>{scLabel(r.status).slice(0,3)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const HeatmapView: React.FC = () => (
  <div className="space-y-4">
    <Card>
      <SectionTitle>Heatmapa vytížení — den × hodina</SectionTitle>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1" style={{ minWidth: 560 }}>
          <div className="flex gap-1 pl-8">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="w-5 text-center text-[8px] text-white/20 font-bold shrink-0">{h}</div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={di} className="flex items-center gap-1">
              <span className="w-7 text-xs font-black text-white/30 shrink-0">{day}</span>
              {HEAT[di].map((v, hi) => (
                <div key={hi} className="w-5 h-5 rounded-[3px] shrink-0 flex items-center justify-center"
                  style={{ background: heatColor(v) }}
                  title={`${day} ${hi}:00 — ${v}%`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-5 mt-4">
        {[
          { c: heatColor(10),  l: '< 25%'  },
          { c: heatColor(35),  l: '25–50%' },
          { c: heatColor(60),  l: '50–70%' },
          { c: heatColor(80),  l: '70–90%' },
          { c: heatColor(95),  l: '> 90%'  },
        ].map(x => (
          <div key={x.l} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[3px]" style={{ background: x.c }} />
            <span className="text-xs text-white/35">{x.l}</span>
          </div>
        ))}
      </div>
    </Card>

    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day, di) => {
        const avg = Math.round(HEAT[di].reduce((a, b) => a + b, 0) / 24);
        const peak = Math.max(...HEAT[di]);
        return (
          <Card key={di} className="!p-3">
            <p className="text-xs font-black text-white/30 mb-2">{day}</p>
            <p className="text-2xl font-black" style={{ color: heatColor(avg) }}>{avg}%</p>
            <p className="text-[9px] text-white/25 mt-0.5">avg</p>
            <p className="text-sm font-black mt-2" style={{ color: heatColor(peak) }}>{peak}%</p>
            <p className="text-[9px] text-white/25">peak</p>
          </Card>
        );
      })}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface StatisticsModuleProps { rooms?: OperatingRoom[] }

const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
  { id: 'overview', label: 'Přehled',    Icon: BarChart3   },
  { id: 'rooms',    label: 'Sály',       Icon: LayoutGrid  },
  { id: 'charts',   label: 'Grafy',      Icon: Activity    },
  { id: 'heatmap',  label: 'Heatmapa',   Icon: Thermometer },
];

export default function StatisticsModule({ rooms: propRooms }: StatisticsModuleProps) {
  const rooms   = propRooms ?? MOCK_ROOMS;
  const [view,   setView]   = useState<View>('overview');
  const [detail, setDetail] = useState<OperatingRoom | null>(null);

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>

      {/* ── Title (matches SettingsPage) ── */}
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/20 mb-2">Modul</p>
        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none text-white">
          Statistiky
        </h1>
        <p className="text-sm text-white/25 mt-3 max-w-lg">
          Přehled výkonu operačních sálů, vytížení workflow a podrobné statistiky každého sálu.
        </p>
      </div>

      {/* ── Layout: nav + content ── */}
      <div className="flex gap-0 px-8 pb-8">

        {/* Side nav */}
        <nav className="shrink-0 w-36 mr-6 space-y-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all"
              style={{
                background: view === n.id ? `${ACCENT}18` : 'transparent',
                color:      view === n.id ? ACCENT          : 'rgba(255,255,255,0.28)',
                border:     `1px solid ${view === n.id ? `${ACCENT}40` : 'transparent'}`,
              }}
            >
              <n.Icon className="w-3.5 h-3.5 shrink-0" />
              {n.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {view === 'overview' && <OverviewView rooms={rooms} />}
              {view === 'rooms'    && <RoomsView rooms={rooms} onSelect={r => setDetail(r)} />}
              {view === 'charts'   && <ChartsView rooms={rooms} />}
              {view === 'heatmap'  && <HeatmapView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Room detail slide-over */}
      <AnimatePresence>
        {detail && <RoomDetail room={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}
