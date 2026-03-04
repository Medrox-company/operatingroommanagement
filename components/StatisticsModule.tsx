import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Minus, X, Activity } from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS, WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
} from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type Period = 'den' | 'týden' | 'měsíc';

const accent = '#06B6D4';

// ── Stable mock data ──────────────────────────────────────────────────────────
const weekData = [
  { t: 'Po', v: 92 }, { t: 'Út', v: 88 }, { t: 'St', v: 95 },
  { t: 'Čt', v: 87 }, { t: 'Pá', v: 79 }, { t: 'So', v: 45 }, { t: 'Ne', v: 30 },
];
const dayData = [
  { t: '7', v: 62 }, { t: '8', v: 78 }, { t: '9', v: 89 },
  { t: '10', v: 94 }, { t: '11', v: 91 }, { t: '12', v: 82 },
  { t: '13', v: 76 }, { t: '14', v: 88 }, { t: '15', v: 85 },
  { t: '16', v: 70 }, { t: '17', v: 55 }, { t: '18', v: 38 },
];
const monthData = Array.from({ length: 30 }, (_, i) => ({
  t: `${i + 1}`,
  v: [88,82,90,74,85,91,78,72,86,93,89,84,77,88,92,70,83,87,79,91,85,74,88,93,80,76,89,82,91,86][i],
}));

const phaseRows = [
  { label: 'Příjezd na sál',      min: 12, pct: 5.5,  trend: -1  },
  { label: 'Začátek anestezie',   min: 8,  pct: 3.7,  trend: -0.5},
  { label: 'Chirurgický výkon',   min: 95, pct: 43.8, trend: +2  },
  { label: 'Ukončení výkonu',     min: 15, pct: 6.9,  trend: -2  },
  { label: 'Ukončení anestezie',  min: 10, pct: 4.6,  trend: 0   },
  { label: 'Úklid sálu',         min: 20, pct: 9.2,  trend: +1  },
  { label: 'Sál připraven',       min: 47, pct: 21.6, trend: +5  },
];

const HEATMAP: number[][] = [
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
  return 'rgba(30,41,59,0.6)';
}

function TrendIcon({ v }: { v: number }) {
  if (v > 0) return <TrendingUp className="w-4 h-4" style={{ color: '#F97316' }} />;
  if (v < 0) return <TrendingDown className="w-4 h-4" style={{ color: '#10B981' }} />;
  return <Minus className="w-4 h-4 opacity-30" />;
}

const TooltipStyle = {
  contentStyle: {
    background: 'rgba(2,8,23,0.97)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)' },
  itemStyle: { color: accent },
};

// ── Room helpers ──────────────────────────────────────────────────────────────
function statusLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return 'Obsazeno';
  if (s === RoomStatus.FREE) return 'Volno';
  if (s === RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}
function statusColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return '#F97316';
  if (s === RoomStatus.FREE) return '#10B981';
  if (s === RoomStatus.CLEANING) return '#06B6D4';
  return '#6B7280';
}

const UPS_DEPARTMENTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
function isUPS(room: OperatingRoom) {
  return room.isEmergency || UPS_DEPARTMENTS.includes(room.department);
}
function scheduleDayMin(room: OperatingRoom) {
  return isUPS(room) ? 1440 : 720;
}
function scheduleTimeRange(room: OperatingRoom) {
  return isUPS(room) ? '00:00–24:00' : '07:00–19:00';
}

// ── Timeline segments ─────────────────────────────────────────────────────────
type Segment = { color: string; title: string; pct: number; min: number };

function buildTimeline(room: OperatingRoom): Segment[] {
  const dayMin = scheduleDayMin(room);
  const passCount = Math.max(1, Math.floor(room.operations24h * (dayMin / 1440)));
  const cycleDurations = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const cycleTotal = cycleDurations.reduce((s, d) => s + d, 0);
  const mpp = Math.floor(dayMin / passCount);
  const raw: Segment[] = [];
  for (let pass = 0; pass < passCount; pass++) {
    WORKFLOW_STEPS.forEach((step, si) => {
      const scaledMin = Math.round((cycleDurations[si] / cycleTotal) * mpp);
      if (scaledMin > 0) raw.push({ color: step.color, title: step.title, pct: (scaledMin / dayMin) * 100, min: scaledMin });
    });
    if (pass < passCount - 1) raw.push({ color: 'rgba(255,255,255,0.05)', title: 'Pauza', pct: (5 / dayMin) * 100, min: 5 });
  }
  const total = raw.reduce((s, seg) => s + seg.pct, 0);
  return raw.map(seg => ({ ...seg, pct: (seg.pct / total) * 100 }));
}

function buildStatusDist(room: OperatingRoom): Segment[] {
  const durations = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const total = durations.reduce((s, d) => s + d, 0);
  return WORKFLOW_STEPS.map((step, i) => ({
    color: step.color, title: step.title,
    pct: Math.round((durations[i] / total) * 100), min: durations[i],
  }));
}

function mergeSegments(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segs) {
    const last = out[out.length - 1];
    if (last && last.title === seg.title) { last.pct += seg.pct; last.min += seg.min; }
    else out.push({ ...seg });
  }
  return out;
}

// ── Per-room mini day curve (stable, seeded by room id) ───────────────────────
function buildRoomDayCurve(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  const ups = isUPS(room);
  const hours = ups
    ? Array.from({ length: 24 }, (_, h) => h)
    : Array.from({ length: 12 }, (_, h) => h + 7);
  return hours.map((h, i) => ({
    t: `${h}`,
    v: Math.max(0, Math.min(100,
      ups
        ? (h >= 7 && h <= 19 ? 75 + ((seed * (i + 1)) % 20) - 10 : 30 + ((seed * (i + 2)) % 25))
        : 60 + ((seed * (i + 1)) % 35) - 5
    )),
  }));
}

// ── Radar data for a room ─────────────────────────────────────────────────────
function buildRadarData(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return [
    { subject: 'Využití', A: Math.min(100, 50 + (seed * 7) % 50) },
    { subject: 'Výkony', A: Math.min(100, room.operations24h * 10) },
    { subject: 'Efektivita', A: Math.min(100, 60 + (seed * 11) % 40) },
    { subject: 'Personál', A: Math.min(100, 70 + (seed * 3) % 30) },
    { subject: 'Čistota', A: Math.min(100, 75 + (seed * 5) % 25) },
  ];
}

// ── Room mini box ─────────────────────────────────────────────────────────────
interface RoomBoxProps {
  room: OperatingRoom;
  index: number;
  onClick: () => void;
}

const RoomBox: React.FC<RoomBoxProps> = ({ room, index, onClick }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const dist = useMemo(() => buildStatusDist(room), [room]);
  const utilPct = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const timeline = useMemo(() => mergeSegments(buildTimeline(room)), [room]);

  return (
    <motion.button
      className="text-left rounded-xl p-4 cursor-pointer w-full"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${room.status === RoomStatus.BUSY ? `${sc}30` : 'rgba(255,255,255,0.06)'}`,
      }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.04)' } as any}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 6px ${sc}` }} />
          <span className="text-sm font-black text-white/90 leading-tight">{room.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {ups && (
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4' }}>ÚPS</span>
          )}
          {room.isSeptic && (
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>SEP</span>
          )}
          {room.isEmergency && (
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>EMG</span>
          )}
        </div>
      </div>

      {/* Dept + procedure */}
      <p className="text-xs text-white/30 mb-1 truncate">{room.department}</p>
      <p className="text-xs text-white/50 mb-3 truncate leading-tight">
        {room.currentProcedure?.name ?? 'Žádný výkon'}
      </p>

      {/* Mini timeline bar */}
      <div className="flex h-3 w-full rounded overflow-hidden gap-px mb-3">
        {timeline.map((seg, i) => (
          <div key={i} className="h-full shrink-0"
            style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.85 }} />
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest">Výkony</p>
          <p className="text-base font-black" style={{ color: accent }}>{room.operations24h}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest">Výkon %</p>
          <p className="text-base font-black text-white/70">{utilPct}%</p>
        </div>
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest">Fronta</p>
          <p className="text-base font-black text-white/70">{room.queueCount}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: `${sc}14`, color: sc }}>
          {statusLabel(room.status)}
        </span>
        <span className="text-[10px] text-white/20 ml-2">{ups ? '24 h' : '12 h'}</span>
      </div>
    </motion.button>
  );
};

// ── Room detail modal / overlay ───────────────────────────────────────────────
interface RoomDetailPanelProps {
  room: OperatingRoom;
  onClose: () => void;
}

const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, onClose }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const rawTimeline = useMemo(() => buildTimeline(room), [room]);
  const timeline    = useMemo(() => mergeSegments(rawTimeline), [rawTimeline]);
  const dist        = useMemo(() => buildStatusDist(room), [room]);
  const dayCurve    = useMemo(() => buildRoomDayCurve(room), [room]);
  const radarData   = useMemo(() => buildRadarData(room), [room]);
  const dayMin      = scheduleDayMin(room);
  const opsDay      = Math.max(1, Math.floor(room.operations24h * (dayMin / 1440)));
  const utilPct     = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;

  // Additional statistics
  const avgProcedureDuration = Math.round(STEP_DURATIONS[2]);
  const patientsPerDay = Math.max(1, Math.floor(opsDay * 0.8));
  const patientsPerMonth = patientsPerDay * 22;
  const workflowEfficiency = Math.min(100, 60 + (parseInt(room.id) % 40));
  const topProcedures = ['Vasektomie', 'Karpální tunel', 'Stenóza tepen'].slice(0, 3);
  const staffAvailability = 92 + (parseInt(room.id) % 8);

  // 7-day trend for this room (stable seeded)
  const roomOpsTrend = [
    { t: 'Po', v: Math.max(0, opsDay - 2 + (parseInt(room.id) % 3)) },
    { t: 'Út', v: Math.max(0, opsDay + 1 + (parseInt(room.id) % 2)) },
    { t: 'St', v: Math.max(0, opsDay - 1 + (parseInt(room.id) % 3)) },
    { t: 'Čt', v: Math.max(0, opsDay + 2) },
    { t: 'Pá', v: Math.max(0, opsDay + (parseInt(room.id) % 3)) },
    { t: 'So', v: Math.max(0, Math.floor(opsDay * 0.6)) },
    { t: 'Ne', v: Math.max(0, Math.floor(opsDay * 0.3)) },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-5xl rounded-2xl overflow-hidden"
        style={{ background: 'rgb(4,11,28)', border: `1px solid ${sc}30` }}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.22 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-7 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 10px ${sc}` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-white/95">{room.name}</h2>
              <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background: `${sc}18`, color: sc }}>{statusLabel(room.status)}</span>
              {ups && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4' }}>ÚPS — 24 h</span>}
              {room.isSeptic && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>SEPTICKÝ</span>}
              {room.isEmergency && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>EMERGENCY</span>}
            </div>
            <p className="text-sm text-white/35 mt-1">{room.department} — {room.currentProcedure?.name ?? 'Žádný výkon'}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-2 rounded-lg transition-colors hover:bg-white/10 text-white/40 hover:text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 space-y-8">

          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { l: 'Výkony / den', v: opsDay, hi: true },
              { l: 'Využití výkonem', v: `${utilPct}%`, hi: false },
              { l: 'Fronta', v: room.queueCount, hi: false },
              { l: 'Provoz', v: ups ? '24 h' : '12 h', hi: ups },
            ].map((k, i) => (
              <div key={i} className="px-5 py-4"
                style={{ background: 'rgba(255,255,255,0.025)', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">{k.l}</p>
                <p className="text-3xl font-black leading-none" style={{ color: k.hi ? accent : 'rgba(255,255,255,0.85)' }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* ── Timeline bar ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/30">
                Časová osa — {scheduleTimeRange(room)}
              </p>
              <p className="text-xs font-black uppercase tracking-widest"
                style={{ color: ups ? '#06B6D4' : 'rgba(255,255,255,0.3)' }}>
                {ups ? 'ÚPS / Služba — 24 h' : 'Pracovní doba — 07:00–19:00'}
              </p>
            </div>
            <div className="flex h-8 w-full rounded-lg overflow-hidden gap-[1px]">
              {timeline.map((seg, i) => (
                <motion.div key={i} className="h-full shrink-0 relative"
                  style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.88 }}
                  initial={{ opacity: 0 }} animate={{ opacity: 0.88 }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct >= 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-black/70 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2.5 mt-4">
              {WORKFLOW_STEPS.map((step, si) => {
                const match = timeline.filter(s => s.title === step.title);
                const pct = match.reduce((a, s) => a + s.pct, 0);
                const min = match.reduce((a, s) => a + s.min, 0);
                if (!min) return null;
                return (
                  <div key={si} className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: step.color }} />
                    <div className="min-w-0">
                      <p className="text-xs text-white/45 truncate">{step.title}</p>
                      <p className="text-sm font-black" style={{ color: step.color }}>
                        {Math.round(pct)}%<span className="text-white/30 font-normal ml-1">{min} min</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Charts row 1: Day curve + Status distribution ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Mini area — vytížení v průběhu dne */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
                Vytížení v průběhu dne
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={dayCurve} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id={`rg-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sc} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={sc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v}%`, 'Vytížení']} />
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg-${room.id})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Status distribution bars */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
                Rozložení statusů — cyklus
              </p>
              <div className="space-y-3">
                {dist.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-white/55">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/30">{d.min} min</span>
                        <span className="text-sm font-black w-10 text-right" style={{ color: d.color }}>{d.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: d.color, opacity: 0.85 }}
                        initial={{ width: 0 }} animate={{ width: `${d.pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Charts row 2: Phase bar + Radar + Pie ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Phase duration bar chart */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
                Délka fází (min)
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={phaseBarData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }} barSize={8}>
                  <XAxis type="number" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} width={56} />
                  <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v} min`, 'Trvání']} />
                  <Bar dataKey="min" radius={[0, 2, 2, 0]}>
                    {phaseBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar chart */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">
                Výkonnostní profil
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} />
                  <Radar dataKey="A" stroke={sc} fill={sc} fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">
                Struktura cyklu
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="pct" nameKey="title" cx="50%" cy="50%"
                    innerRadius={42} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TooltipStyle.contentStyle}
                    formatter={(v: number, name: string) => [`${v}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-white/40">{d.title.split(' ').slice(-1)[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Charts row 3: Workflow step progress line ── */}
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
              Průběh workflow fází
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={WORKFLOW_STEPS.map((step, i) => ({
                name: step.title.split(' ').slice(-1)[0],
                min: i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i],
                color: step.color,
              }))} margin={{ top: 4, right: 10, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v} min`, 'Trvání']} />
                <Line type="monotone" dataKey="min" stroke={sc} strokeWidth={1.5} dot={{ fill: sc, strokeWidth: 0, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Workflow step indicator ── */}
          <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Aktuální fáze workflow</p>
            <div className="flex items-center gap-2 flex-wrap">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCurrent = i === room.currentStepIndex;
                const isDone    = i < room.currentStepIndex;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-black uppercase tracking-wider transition-all"
                      style={{
                        background: isCurrent ? `${step.color}22` : isDone ? 'rgba(255,255,255,0.04)' : 'transparent',
                        color:      isCurrent ? step.color : isDone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)',
                        border:     `1px solid ${isCurrent ? step.color : 'rgba(255,255,255,0.07)'}`,
                      }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: step.color, opacity: isCurrent ? 1 : 0.3 }} />
                      {step.title}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="w-3 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Personnel & patient ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Personál</p>
              <div className="space-y-3">
                {[
                  { role: 'Chirurg',      name: room.staff.doctor.name },
                  { role: 'Sestra',       name: room.staff.nurse.name },
                  { role: 'Anesteziolog', name: room.staff.anesthesiologist?.name ?? null },
                ].map(p => (
                  <div key={p.role} className="flex items-center justify-between">
                    <span className="text-xs text-white/30 uppercase tracking-wider">{p.role}</span>
                    <span className="text-sm font-bold text-white/70">{p.name ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {room.currentPatient && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Aktuální pacient</p>
                  <div className="space-y-3">
                    {[
                      { l: 'Jméno',        v: room.currentPatient.name },
                      { l: 'Věk',          v: `${room.currentPatient.age} let` },
                      { l: 'Krev. skupina', v: room.currentPatient.bloodType ?? '—' },
                    ].map(row => (
                      <div key={row.l} className="flex items-center justify-between">
                        <span className="text-xs text-white/30 uppercase tracking-wider">{row.l}</span>
                        <span className="text-sm font-bold text-white/70">{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {room.currentProcedure && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Aktuální výkon</p>
                  <div className="space-y-3">
                    {[
                      { l: 'Výkon',    v: room.currentProcedure.name },
                      { l: 'Trvání',   v: `${room.currentProcedure.estimatedDuration} min` },
                      { l: 'Zahájení', v: room.currentProcedure.startTime },
                    ].map(row => (
                      <div key={row.l} className="flex items-center justify-between">
                        <span className="text-xs text-white/30 uppercase tracking-wider">{row.l}</span>
                        <span className="text-sm font-bold text-white/70 text-right max-w-[220px] truncate">{row.v}</span>
                      </div>
                    ))}
                    {room.currentProcedure.progress > 0 && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/30 uppercase tracking-wider">Průběh výkonu</span>
                          <span className="text-base font-black" style={{ color: accent }}>{room.currentProcedure.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div className="h-full rounded-full" style={{ background: accent }}
                            initial={{ width: 0 }} animate={{ width: `${room.currentProcedure.progress}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SCHEDULE-SPECIFIC STATISTICS ── */}
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-white/30">
                  {ups ? 'Statistiky ÚPS — 24h provoz' : 'Statistiky pracovní doby'}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded text-xs font-black uppercase tracking-wider"
                style={{ background: ups ? 'rgba(6,182,212,0.15)' : 'rgba(249,115,22,0.15)', 
                         color: ups ? '#06B6D4' : '#F97316' }}>
                {ups ? 'ÚPS' : 'STD'}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Day availability */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Dostupnost / den</p>
                <div className="text-2xl font-black text-white/80">{ups ? '24' : '12'}</div>
                <p className="text-xs text-white/25 mt-1">hodin</p>
              </div>

              {/* Avg ops per schedule */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Prům. výkony</p>
                <div className="text-2xl font-black" style={{ color: accent }}>{opsDay}</div>
                <p className="text-xs text-white/25 mt-1">za provozní dobu</p>
              </div>

              {/* Utilization during hours */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Aut. vytížení</p>
                <div className="text-2xl font-black text-white/80">{utilPct}%</div>
                <p className="text-xs text-white/25 mt-1">výkonu</p>
              </div>

              {/* Peak hour efficiency */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Peak efekt.</p>
                <div className="text-2xl font-black" style={{ color: '#10B981' }}>{Math.min(100, utilPct + 15)}%</div>
                <p className="text-xs text-white/25 mt-1">vrchol dne</p>
              </div>
            </div>
          </div>

          {/* ── SCHEDULE COMPARISON (if both exist conceptually) ── */}
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Srovnění provozních režimů</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { mode: 'Pracovní doba', hours: '12 h', ops: Math.floor(opsDay * 0.7), util: Math.floor(utilPct * 0.9), color: '#F97316' },
                { mode: 'ÚPS/Služba', hours: '24 h', ops: Math.floor(opsDay * 1.4), util: Math.floor(utilPct * 0.6), color: '#06B6D4' },
              ].map(m => (
                <div key={m.mode} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${m.color}20` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black text-white/70">{m.mode}</span>
                    <span className="px-2 py-1 rounded text-[10px] font-black" style={{ background: `${m.color}20`, color: m.color }}>
                      {m.hours}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">Výkony</span>
                      <span className="text-sm font-bold text-white/70">{m.ops}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">Vytížení</span>
                      <span className="text-sm font-bold" style={{ color: m.color }}>{m.util}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SAFETY & COMPLIANCE ── */}
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Bezpečnost & Compliance</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Sterilní stav', value: '100', unit: '%', color: '#10B981' },
                { label: 'Příprava sálu', value: '98', unit: '%', color: '#06B6D4' },
                { label: 'Incidenty', value: '0', unit: 'za měsíc', color: '#F97316' },
                { label: 'Audit status', value: 'OK', unit: '', color: '#10B981' },
                { label: 'Servis stav', value: 'Aktuální', unit: '', color: '#06B6D4' },
                { label: 'Certifikace', value: 'Platná', unit: '', color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{s.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                    {s.unit && <span className="text-xs text-white/30">{s.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STAFF ALLOCATION & ROTATION ── */}
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Obsazení a rotace personálu</p>
            <div className="space-y-4">
              {[
                { role: 'Chirurgové',      current: 2, available: 5, util: 40 },
                { role: 'Operační sestry', current: 2, available: 6, util: 33 },
                { role: 'Anesteziologové', current: 1, available: 3, util: 33 },
                { role: 'Asistenti',       current: 1, available: 4, util: 25 },
              ].map(st => (
                <div key={st.role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white/50">{st.role}</span>
                    <span className="text-xs font-black text-white/40">{st.current}/{st.available}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: accent, opacity: 0.85 }}
                      initial={{ width: 0 }} animate={{ width: `${st.util}%` }}
                      transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rozšířené statistiky ── */}
          <div className="pt-6 space-y-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30">Rozšířené statistiky</p>

            {/* Grid of stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Avg Procedure Duration */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Průměrná doba výkonu</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: accent }}>{avgProcedureDuration}</span>
                  <span className="text-xs text-white/30">minut</span>
                </div>
              </div>

              {/* Patients Per Day */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Pacienti / den</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white/80">{patientsPerDay}</span>
                  <span className="text-xs text-white/30">osob</span>
                </div>
              </div>

              {/* Patients Per Month */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Pacienti / měsíc</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white/80">{patientsPerMonth}</span>
                  <span className="text-xs text-white/30">osob</span>
                </div>
              </div>

              {/* Workflow Efficiency */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Efektivita workflow</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: workflowEfficiency > 80 ? '#10B981' : accent }}>{workflowEfficiency}</span>
                  <span className="text-xs text-white/30">%</span>
                </div>
              </div>

              {/* Staff Availability */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Dostupnost personálu</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white/80">{staffAvailability}</span>
                  <span className="text-xs text-white/30">%</span>
                </div>
              </div>

              {/* Total Patients YTD */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Pacientů / rok (est.)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white/80">{Math.round(patientsPerMonth * 12 / 100) * 100}</span>
                  <span className="text-xs text-white/30">osob</span>
                </div>
              </div>
            </div>

            {/* Top Procedures */}
            <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-4">Nejčastější výkony (tento měsíc)</p>
              <div className="space-y-3">
                {topProcedures.map((proc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-white/50">{proc}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full" style={{ width: 60, background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: accent, opacity: 0.85 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - i * 20}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs text-white/30 w-6 text-right">{100 - i * 20}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-day trend for this room */}
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Trend operací (týdenní)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={roomOpsTrend} margin={{ top: 4, right: 10, bottom: 0, left: -24 }}>
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v} op.`, 'Výkony']} />
                  <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={2} dot={{ fill: accent, r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>{/* end Rozšířené statistiky */}

        </div>{/* end p-7 space-y-8 */}
      </motion.div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [period, setPeriod] = useState<Period>('týden');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  const utilData = period === 'den' ? dayData : period === 'týden' ? weekData : monthData;

  const totalOps  = useMemo(() => rooms.reduce((s, r) => s + r.operations24h, 0), [rooms]);
  const busyRooms = useMemo(() => rooms.filter(r => r.status === RoomStatus.BUSY).length, [rooms]);
  const freeRooms = useMemo(() => rooms.filter(r => r.status === RoomStatus.FREE).length, [rooms]);
  const avgOps    = useMemo(() => (totalOps / rooms.length).toFixed(1), [totalOps, rooms]);
  const avgUtil   = useMemo(() => Math.round(utilData.reduce((s, d) => s + d.v, 0) / utilData.length), [utilData]);

  const roomBarData = useMemo(() =>
    rooms.map(r => ({ name: r.name.replace('Sál č. ', 'S'), ops: r.operations24h })), [rooms]);

  const deptMap = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department] || 0) + r.operations24h; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rooms]);

  const statusPct = useMemo(() => ({
    busy:  Math.round((busyRooms / rooms.length) * 100),
    free:  Math.round((freeRooms / rooms.length) * 100),
    other: Math.round(((rooms.length - busyRooms - freeRooms) / rooms.length) * 100),
  }), [busyRooms, freeRooms, rooms.length]);

  const workflowTotals = useMemo(() => {
    const totals = WORKFLOW_STEPS.map(step => ({ color: step.color, title: step.title, totalMin: 0 }));
    rooms.forEach(room => {
      WORKFLOW_STEPS.forEach((_, i) => {
        totals[i].totalMin += (i === 2 && room.currentProcedure) ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i];
      });
    });
    const grand = totals.reduce((s, t) => s + t.totalMin, 0);
    return totals.map(t => ({ ...t, pct: Math.round((t.totalMin / grand) * 100) }));
  }, [rooms]);

  // Global dept pie
  const deptPieData = useMemo(() =>
    deptMap.map(([name, value], i) => ({
      name, value,
      color: ['#06B6D4','#F97316','#10B981','#FBBF24','#A78BFA','#2DD4BF','#818CF8','#EC4899'][i % 8],
    })), [deptMap]);

  // Ops trend line (stable)
  const opsTrendData = [
    { t: 'T-6', v: 198 }, { t: 'T-5', v: 212 }, { t: 'T-4', v: 205 },
    { t: 'T-3', v: 221 }, { t: 'T-2', v: 215 }, { t: 'T-1', v: 228 }, { t: 'Dnes', v: totalOps },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col text-white">

      {/* ── Header ── */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <BarChart3 className="w-4 h-4" style={{ color: accent }} />
            <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: accent }}>
              ANALÝZY A METRIKY
            </p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            STATISTIKY <span className="text-white/20">SYSTÉMU</span>
          </h1>
        </div>
      </header>

      {/* ── Period switcher ── */}
      <div className="flex items-center gap-1.5 mb-10">
        {(['den','týden','měsíc'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded transition-all"
            style={{
              background: period === p ? `${accent}18` : 'transparent',
              color: period === p ? accent : 'rgba(255,255,255,0.3)',
              border: `1px solid ${period === p ? accent : 'rgba(255,255,255,0.08)'}`,
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px mb-10"
        style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {[
          { label: 'Sálů celkem',         value: rooms.length },
          { label: 'Aktivních',           value: busyRooms,    hi: busyRooms > 0 },
          { label: 'Volných',             value: freeRooms },
          { label: 'Operací / 24 h',      value: totalOps,     hi: true },
          { label: 'Průměr / sál',        value: `${avgOps}` },
          { label: `Využití (${period})`, value: `${avgUtil}%` },
        ].map((k, i) => (
          <div key={i} className="flex flex-col justify-between px-4 py-4"
            style={{ background: 'rgba(255,255,255,0.02)', borderRight: i < 5 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">{k.label}</p>
            <p className="text-3xl font-black leading-none" style={{ color: (k as any).hi ? accent : 'white' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Utilization area chart */}
        <motion.section className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Vytížení v čase — {period}</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={utilData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="rgba(255,255,255,0.15)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={12} tickLine={false} axisLine={false} domain={[0,100]} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
              <Area type="monotone" dataKey="v" stroke={accent} fill="url(#ug)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.section>

        {/* Status breakdown */}
        <motion.section className="rounded-xl p-5 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-6">Stav sálů</p>
          <div className="flex-1 flex flex-col justify-center gap-5">
            {[
              { label: 'Obsazeno', pct: statusPct.busy,  color: '#F97316' },
              { label: 'Volno',    pct: statusPct.free,  color: '#10B981' },
              { label: 'Ostatní', pct: statusPct.other, color: 'rgba(255,255,255,0.2)' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black uppercase tracking-wider text-white/50">{s.label}</span>
                  <span className="text-base font-black" style={{ color: s.color }}>{s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: s.color }}
                    initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">Fronta / sál</p>
            <div className="space-y-2">
              {rooms.filter(r => r.queueCount > 0).slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-white/40">{r.name}</span>
                  <span className="text-sm font-black text-white/70">{r.queueCount}</span>
                </div>
              ))}
              {rooms.filter(r => r.queueCount > 0).length === 0 && (
                <p className="text-sm text-white/25">Žádná fronta</p>
              )}
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── Row 2: Bar + Dept + Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Ops per room bar */}
        <motion.section className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Operace / sál (24 h)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={roomBarData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }} barSize={10}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [v, 'Operace']} />
              <Bar dataKey="ops" fill={accent} opacity={0.75} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        {/* Dept pie + bars */}
        <motion.section className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.09 }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">Výkony dle oddělení</p>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={deptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={28} outerRadius={44} paddingAngle={2} strokeWidth={0}>
                {deptPieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
              </Pie>
              <Tooltip contentStyle={TooltipStyle.contentStyle} formatter={(v: number, name: string) => [v, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {deptMap.slice(0,5).map(([dept, count], i) => (
              <div key={dept}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{ background: deptPieData[i]?.color ?? accent }} />
                    <span className="text-xs text-white/55">{dept}</span>
                  </div>
                  <span className="text-xs font-black text-white/75">{count}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: deptPieData[i]?.color ?? accent, opacity: 0.8 }}
                    initial={{ width: 0 }} animate={{ width: `${(count / deptMap[0][1]) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Ops trend line */}
        <motion.section className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.10 }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Trend operací (7 dní)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={opsTrendData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [v, 'Operace']} />
              <Line type="monotone" dataKey="v" stroke="#10B981" strokeWidth={1.5}
                dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.section>
      </div>

      {/* ── Aggregate workflow status ── */}
      <motion.section className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.11 }}>
        <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
          Souhrnné rozložení workflow statusů — všechny sály
        </p>
        <div className="flex h-5 w-full rounded overflow-hidden gap-px mb-5">
          {workflowTotals.map((seg, i) => (
            <motion.div key={i} className="h-full" style={{ background: seg.color, opacity: 0.85 }}
              initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
              title={`${seg.title} — ${seg.pct}%`} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
          {workflowTotals.map((seg, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[1px] shrink-0" style={{ background: seg.color, opacity: 0.85 }} />
                  <span className="text-xs text-white/45">{seg.title}</span>
                </div>
                <span className="text-xs font-black" style={{ color: seg.color }}>{seg.pct}%</span>
              </div>
              <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full" style={{ background: seg.color, opacity: 0.7 }}
                  initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }} />
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Phase breakdown ── */}
      <motion.section className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
        <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-5">Fáze operačního cyklu — průměrné trvání</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {phaseRows.map((ph, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/55 flex items-center gap-2">
                  <TrendIcon v={ph.trend} />
                  {ph.label}
                </span>
                <span className="text-sm font-black text-white/80">{ph.min} min</span>
              </div>
              <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div className="h-full"
                  style={{ background: ph.pct > 20 ? accent : 'rgba(255,255,255,0.25)' }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(ph.pct * 2, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }} />
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Heatmap ── */}
      <motion.section className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
        <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-5">Heatmapa vytížení — den × hodina</p>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5" style={{ minWidth: 520 }}>
            <div className="flex gap-0.5 pl-7">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="w-5 text-center text-[9px] text-white/20 font-bold shrink-0">{h}</div>
              ))}
            </div>
            {DAYS.map((day, di) => (
              <div key={di} className="flex items-center gap-0.5">
                <span className="w-6 text-xs font-black text-white/30 shrink-0">{day}</span>
                {HEATMAP[di].map((val, hi) => (
                  <div key={hi} className="w-5 h-4 rounded-[2px] shrink-0"
                    style={{ background: heatColor(val) }}
                    title={`${day} ${hi}:00 — ${val}%`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { c: 'rgba(30,41,59,0.6)',    l: '< 25%'  },
            { c: 'rgba(16,185,129,0.60)', l: '25–50%' },
            { c: 'rgba(251,191,36,0.65)', l: '50–70%' },
            { c: 'rgba(249,115,22,0.75)', l: '70–90%' },
            { c: 'rgba(255,59,48,0.85)',  l: '> 90%'  },
          ].map(l => (
            <div key={l.l} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-[2px]" style={{ background: l.c }} />
              <span className="text-xs text-white/30">{l.l}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════════════════
          ── Sály — mřížka malých boxů ──
          ══════════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-1">
              Sály — kliknutím zobrazíte detailní statistiky
            </p>
            <p className="text-sm text-white/25">
              Každý box zobrazuje miniaturní časovou osu, KPIs a stav sálu.
              Sály ÚPS jsou označeny modře a mají 24h provoz.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4" style={{ color: accent }} />
            <span className="text-xs font-black" style={{ color: accent }}>{rooms.length} sálů</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rooms.map((room, i) => (
            <RoomBox key={room.id} room={room} index={i} onClick={() => setSelectedRoom(room)} />
          ))}
        </div>
      </div>

      {/* ── Summary table ── */}
      <motion.section className="rounded-xl mb-16"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }}>
        <div className="px-5 pt-5 pb-1">
          <p className="text-xs font-black uppercase tracking-widest text-white/30">Přehled sálů</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Sál','Oddělení','Chirurg','Operace / 24h','Stav'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-black uppercase tracking-widest text-white/25 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={r.id}
                  className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  onClick={() => setSelectedRoom(r)}
                  style={{ borderBottom: i < rooms.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="px-5 py-3 font-bold text-white/80">{r.name}</td>
                  <td className="px-5 py-3 text-white/40">{r.department}</td>
                  <td className="px-5 py-3 text-white/40">{r.staff.doctor.name ?? '—'}</td>
                  <td className="px-5 py-3 font-black" style={{ color: accent }}>{r.operations24h}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded"
                      style={{
                        background: r.status === RoomStatus.BUSY  ? 'rgba(249,115,22,0.12)'
                                  : r.status === RoomStatus.FREE  ? 'rgba(16,185,129,0.12)'
                                  : 'rgba(255,255,255,0.06)',
                        color:      r.status === RoomStatus.BUSY  ? '#F97316'
                                  : r.status === RoomStatus.FREE  ? '#10B981'
                                  : 'rgba(255,255,255,0.4)',
                      }}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ── Room detail overlay ── */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </AnimatePresence>

    </div>
  );
};

export default StatisticsModule;
