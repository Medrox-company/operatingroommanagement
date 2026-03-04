import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, X, Activity,
  Clock, Users, Zap, ChevronRight, AlertTriangle
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS, WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart, Scatter, ScatterChart,
  ReferenceLine, Legend,
} from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type Period = 'den' | 'týden' | 'měsíc';

const accent = '#06B6D4';

// ── Stable mock data ──────────────────────────────────────────────────────────
const weekData = [
  { t: 'Po', v: 92, target: 85 }, { t: 'Út', v: 88, target: 85 },
  { t: 'St', v: 95, target: 85 }, { t: 'Čt', v: 87, target: 85 },
  { t: 'Pá', v: 79, target: 85 }, { t: 'So', v: 45, target: 85 }, { t: 'Ne', v: 30, target: 85 },
];
const dayData = [
  { t: '7', v: 62, target: 80 }, { t: '8', v: 78, target: 80 }, { t: '9', v: 89, target: 80 },
  { t: '10', v: 94, target: 80 }, { t: '11', v: 91, target: 80 }, { t: '12', v: 82, target: 80 },
  { t: '13', v: 76, target: 80 }, { t: '14', v: 88, target: 80 }, { t: '15', v: 85, target: 80 },
  { t: '16', v: 70, target: 80 }, { t: '17', v: 55, target: 80 }, { t: '18', v: 38, target: 80 },
];
const monthData = Array.from({ length: 30 }, (_, i) => ({
  t: `${i + 1}`,
  v: [88,82,90,74,85,91,78,72,86,93,89,84,77,88,92,70,83,87,79,91,85,74,88,93,80,76,89,82,91,86][i],
  target: 85,
}));

const phaseRows = [
  { label: 'Příjezd na sál',      min: 12, pct: 5.5,  trend: -1,  color: '#A78BFA' },
  { label: 'Začátek anestezie',   min: 8,  pct: 3.7,  trend: -0.5, color: '#2DD4BF' },
  { label: 'Chirurgický výkon',   min: 95, pct: 43.8, trend: +2,  color: '#FF3B30' },
  { label: 'Ukončení výkonu',     min: 15, pct: 6.9,  trend: -2,  color: '#FBBF24' },
  { label: 'Ukončení anestezie',  min: 10, pct: 4.6,  trend: 0,   color: '#818CF8' },
  { label: 'Úklid sálu',          min: 20, pct: 9.2,  trend: +1,  color: '#5B65DC' },
  { label: 'Sál připraven',       min: 47, pct: 21.6, trend: +5,  color: '#34C759' },
];

// ── Monthly cumulative ops ────────────────────────────────────────────────────
const monthCumulative = monthData.reduce<{ t: string; v: number; cumul: number }[]>((acc, d) => {
  const prev = acc.length > 0 ? acc[acc.length - 1].cumul : 0;
  acc.push({ t: d.t, v: d.v, cumul: prev + Math.round(d.v * 0.8) });
  return acc;
}, []);

// ── Avg procedure length vs benchmark ────────────────────────────────────────
const procedureLengthData = [
  { dept: 'ORTOPÉDIE',  avg: 118, bench: 100 },
  { dept: 'KARDIOCHIR', avg: 210, bench: 180 },
  { dept: 'NEUROCHIR',  avg: 165, bench: 150 },
  { dept: 'UROLOGIE',   avg: 85,  bench: 90  },
  { dept: 'BŘIŠNÍ',     avg: 95,  bench: 95  },
  { dept: 'CÉVNÍ',      avg: 145, bench: 130 },
];

// ── Turnover time trend ───────────────────────────────────────────────────────
const turnoverData = [
  { t: 'Po', v: 22, target: 20 }, { t: 'Út', v: 19, target: 20 },
  { t: 'St', v: 25, target: 20 }, { t: 'Čt', v: 18, target: 20 },
  { t: 'Pá', v: 21, target: 20 },
];

// ── FCOTS (First Case On-Time Start) ─────────────────────────────────────────
const fcotsData = [
  { dept: 'ORTOPÉDIE',  pct: 88 }, { dept: 'KARDIOCHIR', pct: 72 },
  { dept: 'NEUROCHIR',  pct: 91 }, { dept: 'UROLOGIE',   pct: 85 },
  { dept: 'BŘIŠNÍ',     pct: 78 }, { dept: 'CÉVNÍ',      pct: 95 },
];

// ── Cancellation & delay data ─────────────────────────────────────────────────
const cancellationData = [
  { month: 'Říj', cancelled: 3, delayed: 8, onTime: 89 },
  { month: 'Lis', cancelled: 5, delayed: 12, onTime: 83 },
  { month: 'Pro', cancelled: 2, delayed: 6, onTime: 92 },
  { month: 'Led', cancelled: 4, delayed: 9, onTime: 87 },
  { month: 'Úno', cancelled: 3, delayed: 7, onTime: 90 },
  { month: 'Bře', cancelled: 6, delayed: 11, onTime: 83 },
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
  if (v > 0) return <TrendingUp className="w-3.5 h-3.5" style={{ color: '#F97316' }} />;
  if (v < 0) return <TrendingDown className="w-3.5 h-3.5" style={{ color: '#10B981' }} />;
  return <Minus className="w-3.5 h-3.5 opacity-30" />;
}

const TT = {
  contentStyle: {
    background: 'rgba(2,8,23,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  itemStyle: { color: accent },
  cursor: { stroke: 'rgba(255,255,255,0.08)' },
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

const UPS_DEPTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
function isUPS(room: OperatingRoom) { return room.isEmergency || UPS_DEPTS.includes(room.department); }
function dayMin(room: OperatingRoom) { return isUPS(room) ? 1440 : 720; }
function timeRange(room: OperatingRoom) { return isUPS(room) ? '00:00–24:00' : '07:00–19:00'; }

// ── Timeline ──────────────────────────────────────────────────────────────────
type Seg = { color: string; title: string; pct: number; min: number };

function buildTimeline(room: OperatingRoom): Seg[] {
  const dm = dayMin(room);
  const passes = Math.max(1, Math.floor(room.operations24h * (dm / 1440)));
  const dur = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const cycleTotal = dur.reduce((s, d) => s + d, 0);
  const mpp = Math.floor(dm / passes);
  const raw: Seg[] = [];
  for (let p = 0; p < passes; p++) {
    WORKFLOW_STEPS.forEach((step, si) => {
      const m = Math.round((dur[si] / cycleTotal) * mpp);
      if (m > 0) raw.push({ color: step.color, title: step.title, pct: (m / dm) * 100, min: m });
    });
    if (p < passes - 1) raw.push({ color: 'rgba(255,255,255,0.04)', title: 'Pauza', pct: (4 / dm) * 100, min: 4 });
  }
  const tot = raw.reduce((s, seg) => s + seg.pct, 0);
  return raw.map(seg => ({ ...seg, pct: (seg.pct / tot) * 100 }));
}

function buildDist(room: OperatingRoom): Seg[] {
  const dur = WORKFLOW_STEPS.map((_, i) =>
    i === 2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]
  );
  const tot = dur.reduce((s, d) => s + d, 0);
  return WORKFLOW_STEPS.map((step, i) => ({
    color: step.color, title: step.title,
    pct: Math.round((dur[i] / tot) * 100), min: dur[i],
  }));
}

function merge(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const seg of segs) {
    const last = out[out.length - 1];
    if (last && last.title === seg.title) { last.pct += seg.pct; last.min += seg.min; }
    else out.push({ ...seg });
  }
  return out;
}

function buildDayCurve(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  const ups = isUPS(room);
  const hours = ups ? Array.from({ length: 24 }, (_, h) => h) : Array.from({ length: 12 }, (_, h) => h + 7);
  return hours.map((h, i) => ({
    t: `${h}h`,
    v: Math.max(0, Math.min(100,
      ups
        ? (h >= 7 && h <= 19 ? 75 + ((seed * (i + 1)) % 20) - 10 : 30 + ((seed * (i + 2)) % 25))
        : 60 + ((seed * (i + 1)) % 35) - 5
    )),
    target: 80,
  }));
}

function buildWeekCurve(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return ['Po','Út','St','Čt','Pá','So','Ne'].map((t, i) => ({
    t,
    v: i >= 5 ? Math.round(15 + ((seed * (i + 3)) % 30)) : Math.round(65 + ((seed * (i + 1)) % 30)),
    prev: i >= 5 ? Math.round(10 + ((seed * (i + 5)) % 25)) : Math.round(60 + ((seed * (i + 3)) % 28)),
  }));
}

function buildRadar(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return [
    { subject: 'Využití',    A: Math.min(100, 50 + (seed * 7) % 50) },
    { subject: 'Výkony',     A: Math.min(100, room.operations24h * 10) },
    { subject: 'Efektivita', A: Math.min(100, 60 + (seed * 11) % 40) },
    { subject: 'Personál',   A: Math.min(100, 70 + (seed * 3) % 30) },
    { subject: 'Čistota',    A: Math.min(100, 75 + (seed * 5) % 25) },
    { subject: 'Bezpečnost', A: Math.min(100, 80 + (seed * 2) % 20) },
  ];
}

function buildScatter(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return Array.from({ length: 12 }, (_, i) => ({
    x: 30 + ((seed * (i + 1) * 7) % 60),
    y: 40 + ((seed * (i + 2) * 5) % 55),
    z: 5 + (i % 4) * 3,
  }));
}

// ── Histogram of procedure durations ─────────────────────────────────────────
function buildDurationHistogram(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  const bins = [30, 60, 90, 120, 150, 180, 210, 240];
  return bins.map((b, i) => ({
    range: `${b - 30}–${b}`,
    count: Math.max(0, Math.round(4 - Math.abs(i - 3) * 0.8 + ((seed * (i + 1)) % 4))),
  }));
}

// ── Monthly ops trend for single room ────────────────────────────────────────
function buildMonthOps(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return Array.from({ length: 12 }, (_, i) => ({
    month: ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'][i],
    ops: Math.round(room.operations24h * 25 + ((seed * (i + 1) * 3) % (room.operations24h * 8))),
    target: room.operations24h * 28,
  }));
}

// ── Per-hour efficiency for a room ───────────────────────────────────────────
function buildHourlyEfficiency(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return Array.from({ length: 12 }, (_, i) => ({
    h: `${i + 7}h`,
    eff: Math.max(40, Math.min(100, 70 + ((seed * (i + 1) * 5) % 30) - 5)),
    target: 80,
  }));
}

// ── Incident & delay log mock ─────────────────────────────────────────────────
function buildDelayLog(room: OperatingRoom) {
  const seed = parseInt(room.id, 10) || 1;
  return Array.from({ length: 6 }, (_, i) => ({
    date: `${i + 1}.3.`,
    delay: Math.round(((seed * (i + 1) * 7) % 20)),
    type: ['Pacient','Personál','Technika','Příprava','Anestezie','Úklid'][i % 6],
  }));
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">{children}</p>
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────
function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">{title}</p>
      {children}
    </div>
  );
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
  const dist = useMemo(() => buildDist(room), [room]);
  const utilPct = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const timeline = useMemo(() => merge(buildTimeline(room)), [room]);
  const isBusy = room.status === RoomStatus.BUSY;

  return (
    <motion.button
      className="text-left rounded-2xl p-4 cursor-pointer w-full relative overflow-hidden group"
      style={{
        background: isBusy ? `rgba(249,115,22,0.04)` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isBusy ? `${sc}35` : 'rgba(255,255,255,0.07)'}`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.025 }}
      whileHover={{ scale: 1.015 } as any}
      whileTap={{ scale: 0.99 } as any}
      onClick={onClick}
    >
      {/* Busy pulse ring */}
      {isBusy && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `1px solid ${sc}` }}
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Top row: name + badges */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ background: sc }} />
            {isBusy && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: sc }}
                animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="text-sm font-black text-white/90 truncate leading-tight">{room.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {ups && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(6,182,212,0.14)', color: '#06B6D4' }}>ÚPS</span>
          )}
          {room.isSeptic && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>SEP</span>
          )}
          {room.isEmergency && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>EMG</span>
          )}
        </div>
      </div>

      {/* Dept */}
      <p className="text-[10px] text-white/30 mb-1 font-bold uppercase tracking-wider">{room.department}</p>

      {/* Procedure */}
      <p className="text-xs text-white/50 mb-3 truncate leading-tight min-h-[16px]">
        {room.currentProcedure?.name ?? '—'}
      </p>

      {/* Timeline bar */}
      <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-[1px] mb-3">
        {timeline.map((seg, i) => (
          <div key={i} className="h-full shrink-0 transition-all duration-300"
            style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.88 }} />
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { l: 'Výkony', v: room.operations24h, c: accent },
          { l: 'Výkon %', v: `${utilPct}%`, c: 'rgba(255,255,255,0.7)' },
          { l: 'Fronta', v: room.queueCount, c: room.queueCount > 2 ? '#F97316' : 'rgba(255,255,255,0.7)' },
        ].map(k => (
          <div key={k.l} className="rounded-lg px-2 py-1.5 text-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{k.l}</p>
            <p className="text-sm font-black leading-none" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: `${sc}14`, color: sc }}>
          {statusLabel(room.status)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/20">{ups ? '24 h' : '12 h'}</span>
          <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
      </div>
    </motion.button>
  );
};

// ── Room detail panel ─────────────────────────────────────────────────────────
interface RoomDetailPanelProps {
  room: OperatingRoom;
  onClose: () => void;
}

const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, onClose }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const rawTL      = useMemo(() => buildTimeline(room), [room]);
  const timeline   = useMemo(() => merge(rawTL), [rawTL]);
  const dist       = useMemo(() => buildDist(room), [room]);
  const dayCurve   = useMemo(() => buildDayCurve(room), [room]);
  const weekCurve  = useMemo(() => buildWeekCurve(room), [room]);
  const radar      = useMemo(() => buildRadar(room), [room]);
  const histogram  = useMemo(() => buildDurationHistogram(room), [room]);
  const monthOps   = useMemo(() => buildMonthOps(room), [room]);
  const hourlyEff  = useMemo(() => buildHourlyEfficiency(room), [room]);
  const delayLog   = useMemo(() => buildDelayLog(room), [room]);
  const dm         = dayMin(room);
  const opsDay     = Math.max(1, Math.floor(room.operations24h * (dm / 1440)));
  const utilPct    = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const isBusy     = room.status === RoomStatus.BUSY;
  const avgDelay   = Math.round(delayLog.reduce((s, d) => s + d.delay, 0) / delayLog.length);
  const maxMonthOps = Math.max(...monthOps.map(m => m.ops));

  const phaseBar = dist.map(d => ({
    name: d.title.replace('Chirurgický výkon', 'Chir. výkon').replace('Ukončení ', 'Ukončení '),
    min: d.min, pct: d.pct, color: d.color,
  }));

  const stackedDay = dayCurve.map(d => ({
    t: d.t,
    výkon:     Math.round(d.v * 0.44),
    příprava:  Math.round(d.v * 0.18),
    anestezie: Math.round(d.v * 0.22),
    úklid:     Math.round(d.v * 0.16),
  }));

  const effTrend = Array.from({ length: 14 }, (_, i) => {
    const seed = parseInt(room.id, 10) || 1;
    return { t: `${i + 1}`, v: Math.round(65 + ((seed * (i + 1) * 3) % 30)), bench: 80 };
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', paddingTop: 24, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-6xl rounded-3xl overflow-hidden"
        style={{ background: 'rgb(3,9,24)', border: `1px solid ${sc}28` }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Header ── */}
        <div className="relative px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Subtle glow behind header */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 100% at 20% 50%, ${sc}08, transparent)` }} />
          <div className="relative flex items-center gap-4">
            {/* Status dot */}
            <div className="relative shrink-0">
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: sc, boxShadow: `0 0 12px ${sc}` }} />
              {isBusy && (
                <motion.div className="absolute inset-0 rounded-full" style={{ background: sc }}
                  animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black text-white">{room.name}</h2>
                <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                  style={{ background: `${sc}18`, color: sc }}>{statusLabel(room.status)}</span>
                {ups && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(6,182,212,0.12)', color: '#06B6D4' }}>ÚPS — 24 h</span>}
                {room.isSeptic && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>SEPTICKÝ</span>}
                {room.isEmergency && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>EMERGENCY</span>}
              </div>
              <p className="text-sm text-white/35 mt-1">{room.department} — {room.currentProcedure?.name ?? 'Žádný aktuální výkon'}</p>
            </div>

            <button onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-white/40 hover:text-white/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">

          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { l: 'Výkony / den',     v: String(opsDay),                                     color: accent,                       icon: <Zap className="w-4 h-4" /> },
              { l: 'Využití výkonem',  v: `${utilPct}%`,                                      color: 'rgba(255,255,255,0.8)',       icon: <Activity className="w-4 h-4" /> },
              { l: 'Fronta',           v: String(room.queueCount),                            color: room.queueCount > 2 ? '#F97316' : 'rgba(255,255,255,0.8)', icon: <Users className="w-4 h-4" /> },
              { l: 'Provoz',           v: ups ? '24 h' : '12 h',                              color: ups ? '#06B6D4' : 'rgba(255,255,255,0.6)',                  icon: <Clock className="w-4 h-4" /> },
              { l: 'Průběh výkonu',    v: room.currentProcedure ? `${room.currentProcedure.progress}%` : '—', color: '#A78BFA',   icon: <BarChart3 className="w-4 h-4" /> },
              { l: 'Prům. zpoždění',   v: `${avgDelay} min`,                                  color: avgDelay > 15 ? '#F97316' : '#10B981',                      icon: <AlertTriangle className="w-4 h-4" /> },
              { l: 'Výkony / měsíc',   v: String(maxMonthOps),                                color: 'rgba(255,255,255,0.8)',       icon: <TrendingUp className="w-4 h-4" /> },
              { l: 'Typ provozu',      v: ups ? 'ÚPS' : 'Standard',                           color: ups ? '#06B6D4' : 'rgba(255,255,255,0.5)',                  icon: <Zap className="w-4 h-4" /> },
            ].map((k, i) => (
              <div key={i} className="rounded-2xl px-4 py-4"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-1.5 mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {k.icon}
                  <p className="text-[10px] font-black uppercase tracking-widest">{k.l}</p>
                </div>
                <p className="text-2xl font-black leading-none" style={{ color: k.color }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* ── Timeline bar ── */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/30">
                Barevná časová osa — {timeRange(room)}
              </p>
              <p className="text-xs font-black uppercase tracking-widest"
                style={{ color: ups ? '#06B6D4' : 'rgba(255,255,255,0.25)' }}>
                {ups ? 'ÚPS / Služba — 24 h' : 'Pracovní doba — 12 h'}
              </p>
            </div>

            {/* Bar */}
            <div className="flex h-10 w-full rounded-xl overflow-hidden gap-[1.5px]">
              {timeline.map((seg, i) => (
                <motion.div key={i} className="h-full shrink-0 relative"
                  style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.9 }}
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 0.9, scaleY: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.025, ease: 'easeOut' }}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct >= 9 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black/65 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Legend grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 mt-5">
              {WORKFLOW_STEPS.map((step, si) => {
                const m = timeline.filter(s => s.title === step.title);
                const pct = m.reduce((a, s) => a + s.pct, 0);
                const min = m.reduce((a, s) => a + s.min, 0);
                if (!min) return null;
                return (
                  <div key={si} className="flex items-start gap-2.5 min-w-0">
                    <div className="w-3 h-3 rounded-[3px] shrink-0 mt-0.5" style={{ background: step.color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-white/40 truncate leading-tight mb-0.5">{step.title}</p>
                      <p className="text-sm font-black leading-none" style={{ color: step.color }}>
                        {Math.round(pct)}%
                        <span className="text-white/25 font-normal ml-1.5 text-xs">{min} min</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Chart row 1: Day curve + Stacked area ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Vytížení v průběhu dne">
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={dayCurve} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={`grd-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sc} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={sc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                  <ReferenceLine y={80} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#grd-${room.id})`} strokeWidth={2} dot={false} name="Vytížení" />
                  <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.18)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Cíl" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Týdenní porovnání výkonu">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekCurve} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={3}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                  <Bar dataKey="v" fill={sc} fillOpacity={0.85} radius={[3, 3, 0, 0]} name="Tento týden" barSize={12} />
                  <Bar dataKey="prev" fill="rgba(255,255,255,0.1)" radius={[3, 3, 0, 0]} name="Minulý týden" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Chart row 2: Phases bar + Pie ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Délka fází — průměrný cyklus (min)">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={phaseBar} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                  <XAxis type="number" stroke="rgba(255,255,255,0.08)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v} min`]} />
                  <Bar dataKey="min" radius={[0, 4, 4, 0]} barSize={14} name="Minuty">
                    {phaseBar.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Struktura cyklu — procentuální podíl">
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={dist.filter(d => d.min > 0)} cx="50%" cy="50%"
                      innerRadius={42} outerRadius={70} paddingAngle={2} dataKey="pct" strokeWidth={0}>
                      {dist.filter(d => d.min > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                      ))}
                    </Pie>
                    <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {dist.filter(d => d.min > 0).map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: d.color }} />
                        <span className="text-[11px] text-white/45 truncate max-w-[110px]">{d.title}</span>
                      </div>
                      <span className="text-sm font-black ml-2" style={{ color: d.color }}>{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* ── Chart row 3: Radar + Status dist bars ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Výkonnostní radar">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radar} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={room.name} dataKey="A" stroke={sc} fill={sc} fillOpacity={0.12} strokeWidth={1.5} dot={{ r: 3, fill: sc, strokeWidth: 0 }} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Rozložení statusů — animované proužky">
              <div className="space-y-3.5 mt-1">
                {dist.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-white/55">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/28">{d.min} min</span>
                        <span className="text-sm font-black w-10 text-right" style={{ color: d.color }}>{d.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: d.color, opacity: 0.88 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${d.pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* ── Chart row 4: Stacked + Efficiency trend ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Složení vytížení — rozklad aktivit v čase">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={stackedDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="výkon"    stroke="#FF3B30" fill="#FF3B30" fillOpacity={0.45} strokeWidth={1.5} stackId="1" dot={false} />
                  <Area type="monotone" dataKey="anestezie" stroke="#2DD4BF" fill="#2DD4BF" fillOpacity={0.35} strokeWidth={1.5} stackId="1" dot={false} />
                  <Area type="monotone" dataKey="příprava" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.3} strokeWidth={1.5} stackId="1" dot={false} />
                  <Area type="monotone" dataKey="úklid"    stroke="#5B65DC" fill="#5B65DC" fillOpacity={0.3} strokeWidth={1.5} stackId="1" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {[['Chirurgický výkon','#FF3B30'],['Anestezie','#2DD4BF'],['Příprava','#A78BFA'],['Úklid','#5B65DC']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{ background: c }} />
                    <span className="text-[10px] text-white/35">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Trend efektivity — posledních 14 dní">
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={effTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} domain={[50, 100]} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                  <ReferenceLine y={80} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" label={{ value: 'Cíl', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                  <Area type="monotone" dataKey="v" stroke="#FBBF24" fill="#FBBF24" fillOpacity={0.1} strokeWidth={2} dot={false} name="Efektivita" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Chart row 5: Monthly ops trend + Histogram ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Měsíční trend výkonů — rok">
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={monthOps} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id={`mg-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v} výkonů`]} />
                  <Area type="monotone" dataKey="ops" stroke="#A78BFA" fill={`url(#mg-${room.id})`} strokeWidth={2} dot={false} name="Výkony" />
                  <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Cíl" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Histogram délky výkonů (min)">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={histogram} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barSize={22}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="range" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}×`]} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Počet výkonů">
                    {histogram.map((_, i) => (
                      <Cell key={i} fill={`hsl(${180 + i * 12}, 70%, ${45 + i * 4}%)`} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Chart row 6: Hourly efficiency + Delay log ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ChartCard title="Hodinová efektivita průběhu dne">
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={hourlyEff} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id={`hg-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                  <XAxis dataKey="h" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} domain={[40, 100]} />
                  <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                  <ReferenceLine y={80} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="eff" stroke="#10B981" fill={`url(#hg-${room.id})`} strokeWidth={2} dot={false} name="Efektivita" />
                  <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.15)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Cíl" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Zpoždění výkonů — posledních 6 dní (min)">
              <div className="space-y-3 mt-1">
                {delayLog.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-white/30 w-10 shrink-0">{d.date}</span>
                    <span className="text-xs text-white/40 w-20 shrink-0">{d.type}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: d.delay > 15 ? '#F97316' : d.delay > 8 ? '#FBBF24' : '#10B981', opacity: 0.85 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, d.delay * 5)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                    <span className="text-sm font-black w-10 text-right shrink-0"
                      style={{ color: d.delay > 15 ? '#F97316' : d.delay > 8 ? '#FBBF24' : '#10B981' }}>
                      {d.delay} m
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-white/25 uppercase tracking-wider">Průměr</span>
                <span className="text-xl font-black"
                  style={{ color: avgDelay > 15 ? '#F97316' : avgDelay > 8 ? '#FBBF24' : '#10B981' }}>
                  {avgDelay} min
                </span>
              </div>
            </ChartCard>
          </div>

          {/* ── Personnel + Patient + Workflow ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Personnel */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Personál</p>
              <div className="space-y-4">
                {[
                  { role: 'Chirurg',      name: room.staff.doctor.name,            color: '#FF3B30' },
                  { role: 'Sestra',       name: room.staff.nurse.name,             color: '#2DD4BF' },
                  { role: 'Anesteziolog', name: room.staff.anesthesiologist?.name ?? null, color: '#A78BFA' },
                ].map(p => (
                  <div key={p.role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full shrink-0" style={{ background: p.color, opacity: 0.7 }} />
                      <span className="text-xs text-white/30 uppercase tracking-wider">{p.role}</span>
                    </div>
                    <span className="text-sm font-bold text-white/70">{p.name ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Pacient</p>
              {room.currentPatient ? (
                <div className="space-y-4">
                  {[
                    { l: 'Jméno',        v: room.currentPatient.name },
                    { l: 'Věk',          v: `${room.currentPatient.age} let` },
                    { l: 'Krevní sk.',   v: room.currentPatient.bloodType ?? '—' },
                    { l: 'ID',           v: room.currentPatient.id },
                  ].map(row => (
                    <div key={row.l} className="flex items-center justify-between">
                      <span className="text-xs text-white/30 uppercase tracking-wider">{row.l}</span>
                      <span className="text-sm font-bold text-white/70">{row.v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/25">Žádný pacient</p>
              )}
            </div>

            {/* Procedure */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Výkon</p>
              {room.currentProcedure ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-white/30 uppercase tracking-wider">Název</span>
                    <p className="text-sm font-bold text-white/70 mt-1 leading-snug">{room.currentProcedure.name}</p>
                  </div>
                  {[
                    { l: 'Trvání',   v: `${room.currentProcedure.estimatedDuration} min` },
                    { l: 'Zahájení', v: room.currentProcedure.startTime },
                  ].map(row => (
                    <div key={row.l} className="flex items-center justify-between">
                      <span className="text-xs text-white/30 uppercase tracking-wider">{row.l}</span>
                      <span className="text-sm font-bold text-white/70">{row.v}</span>
                    </div>
                  ))}
                  {room.currentProcedure.progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/30 uppercase tracking-wider">Průběh</span>
                        <span className="text-base font-black" style={{ color: accent }}>{room.currentProcedure.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: accent }}
                          initial={{ width: 0 }}
                          animate={{ width: `${room.currentProcedure.progress}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/25">Žádný výkon</p>
              )}
            </div>
          </div>

          {/* ── Workflow step indicator ── */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Aktuální fáze workflow</p>
            <div className="flex items-center gap-2 flex-wrap">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCurrent = i === room.currentStepIndex;
                const isDone    = i < room.currentStepIndex;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all"
                      style={{
                        background: isCurrent ? `${step.color}20` : isDone ? 'rgba(255,255,255,0.04)' : 'transparent',
                        color: isCurrent ? step.color : isDone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)',
                        border: `1px solid ${isCurrent ? `${step.color}60` : 'rgba(255,255,255,0.07)'}`,
                        boxShadow: isCurrent ? `0 0 12px ${step.color}20` : 'none',
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: step.color, opacity: isCurrent ? 1 : 0.3 }} />
                      {step.title}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Statistics Module ─────────────────────────────────────────────────────
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const rooms = propRooms ?? MOCK_ROOMS;
  const [period, setPeriod] = useState<Period>('den');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  const utilData = period === 'den' ? dayData : period === 'týden' ? weekData : monthData;

  const totalOps    = rooms.reduce((s, r) => s + r.operations24h, 0);
  const busyCount   = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeCount   = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const totalQueue  = rooms.reduce((s, r) => s + r.queueCount, 0);
  const avgOps      = (totalOps / Math.max(1, rooms.length)).toFixed(1);
  const upsCount    = rooms.filter(r => isUPS(r)).length;

  const statusPct = {
    busy:  Math.round((busyCount / rooms.length) * 100),
    free:  Math.round((freeCount / rooms.length) * 100),
    other: Math.round(((rooms.length - busyCount - freeCount) / rooms.length) * 100),
  };

  const deptMap = Object.entries(
    rooms.reduce((acc, r) => { acc[r.department] = (acc[r.department] ?? 0) + r.operations24h; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const roomBarData = rooms.map(r => ({ name: r.name.replace('Sál č. ', 'S'), ops: r.operations24h }));

  // Aggregate workflow totals
  const workflowTotals = WORKFLOW_STEPS.map(step => {
    const totalMin = rooms.reduce((s, r) => {
      const d = buildDist(r).find(d => d.title === step.title);
      return s + (d?.min ?? 0);
    }, 0);
    return { title: step.title, color: step.color, min: totalMin };
  });
  const wtTot = workflowTotals.reduce((s, w) => s + w.min, 0);
  const workflowPct = workflowTotals.map(w => ({ ...w, pct: Math.round((w.min / wtTot) * 100) }));

  // Dept pie
  const deptPie = deptMap.slice(0, 6).map(([dept, count], i) => ({
    name: dept,
    value: count,
    color: ['#06B6D4','#A78BFA','#FF3B30','#FBBF24','#10B981','#818CF8'][i],
  }));

  // Ops trend scatter
  const opsScatter = rooms.map((r, i) => ({
    ops: r.operations24h,
    queue: r.queueCount,
    name: r.name,
    fill: statusColor(r.status),
  }));

  return (
    <div className="min-h-screen font-sans"
      style={{ background: 'rgb(2,8,20)', color: 'rgba(255,255,255,0.9)' }}>

      <div className="max-w-[1400px] mx-auto px-6 py-10">

        {/* ── Module header ── */}
        <div className="mb-14">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-white/20 mb-4">Operační centrum</p>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none text-white mb-6">
            Statistiky
          </h1>
          <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* ── Period switcher ── */}
        <div className="flex items-center gap-2 mb-10">
          {(['den','týden','měsíc'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all"
              style={{
                background: period === p ? `${accent}18` : 'transparent',
                color: period === p ? accent : 'rgba(255,255,255,0.3)',
                border: `1px solid ${period === p ? `${accent}60` : 'rgba(255,255,255,0.08)'}`,
              }}>
              {p}
            </button>
          ))}
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
          {[
            { l: 'Celkem sálů',       v: rooms.length,      hi: false },
            { l: 'Obsazeno',          v: busyCount,          hi: true  },
            { l: 'Volno',             v: freeCount,          hi: false },
            { l: 'Výkony / 24 h',     v: totalOps,           hi: true  },
            { l: 'Průměr / sál',      v: avgOps,             hi: false },
            { l: 'Fronta celkem',     v: totalQueue,         hi: totalQueue > 5 },
          ].map((k, i) => (
            <div key={i} className="rounded-2xl px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-2">{k.l}</p>
              <p className="text-3xl font-black leading-none"
                style={{ color: k.hi ? accent : 'rgba(255,255,255,0.85)' }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* ── Charts row 1 ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

          {/* Utilisation area */}
          <div className="md:col-span-2 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Vytížení v čase — {period}</p>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={utilData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accent} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={12} tickLine={false} axisLine={false} domain={[0,100]} />
                <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                <ReferenceLine y={85} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="v" stroke={accent} fill="url(#ug)" strokeWidth={2} dot={false} name="Vytížení" />
                <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.15)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Cíl" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Status bars */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-6">Stav sálů</p>
            <div className="flex-1 flex flex-col justify-center gap-5">
              {[
                { label: 'Obsazeno', pct: statusPct.busy,  color: '#F97316' },
                { label: 'Volno',    pct: statusPct.free,  color: '#10B981' },
                { label: 'Ostatní', pct: statusPct.other, color: 'rgba(255,255,255,0.2)' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black uppercase tracking-wider text-white/45">{s.label}</span>
                    <span className="text-base font-black" style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-3">Fronta / sál</p>
              <div className="space-y-2">
                {rooms.filter(r => r.queueCount > 0).slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="text-sm text-white/40">{r.name}</span>
                    <span className="text-sm font-black" style={{ color: r.queueCount > 2 ? '#F97316' : 'rgba(255,255,255,0.65)' }}>{r.queueCount}</span>
                  </div>
                ))}
                {rooms.filter(r => r.queueCount > 0).length === 0 && (
                  <p className="text-sm text-white/25">Žádná fronta</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts row 2 ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

          {/* Ops bar */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Operace / sál (24 h)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={roomBarData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={10}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} formatter={(v: number) => [`${v} výkonů`]} />
                <Bar dataKey="ops" fill={accent} fillOpacity={0.82} radius={[3, 3, 0, 0]} name="Výkony" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dept pie */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Výkony dle oddělení</p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={deptPie} cx="50%" cy="50%" outerRadius={52} innerRadius={28} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {deptPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                    ))}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {deptPie.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-white/40 truncate max-w-[70px]">{d.name}</span>
                    </div>
                    <span className="text-sm font-black text-white/70">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scatter: ops vs queue */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Výkony vs. fronta / sál</p>
            <ResponsiveContainer width="100%" height={150}>
              <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" />
                <XAxis dataKey="ops" name="Výkony" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'výkony', position: 'insideBottomRight', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                <YAxis dataKey="queue" name="Fronta" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, name: string) => [v, name === 'ops' ? 'Výkony' : 'Fronta']} />
                <Scatter data={opsScatter} name="Sály">
                  {opsScatter.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Charts row 3: Procedure length + FCOTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Průměrná délka výkonu vs. benchmark (min)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={procedureLengthData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 10 }}>
                <XAxis type="number" stroke="rgba(255,255,255,0.08)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="dept" width={80} stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} formatter={(v: number) => [`${v} min`]} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={10} name="Průměr" fill={accent} fillOpacity={0.8} />
                <Bar dataKey="bench" radius={[0, 4, 4, 0]} barSize={10} name="Benchmark" fill="rgba(255,255,255,0.12)" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3">
              {[{ l: 'Průměr', c: accent }, { l: 'Benchmark', c: 'rgba(255,255,255,0.2)' }].map(l => (
                <div key={l.l} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: l.c }} />
                  <span className="text-xs text-white/35">{l.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">FCOTS — zahájení prvního výkonu včas (%)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fcotsData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 10 }}>
                <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.08)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="dept" width={80} stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} formatter={(v: number) => [`${v}%`]} />
                <ReferenceLine x={90} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={10} name="FCOTS %">
                  {fcotsData.map((entry, i) => (
                    <Cell key={i} fill={entry.pct >= 90 ? '#10B981' : entry.pct >= 80 ? '#FBBF24' : '#F97316'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Charts row 4: Cancellation stacked + Cumulative monthly ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Rušení & zpoždění výkonů — posledních 6 měsíců (%)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cancellationData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={18}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                <Bar dataKey="onTime"    stackId="a" fill="#10B981" fillOpacity={0.75} name="Včas"    radius={[0, 0, 0, 0]} />
                <Bar dataKey="delayed"   stackId="a" fill="#FBBF24" fillOpacity={0.80} name="Zpoždění" />
                <Bar dataKey="cancelled" stackId="a" fill="#F97316" fillOpacity={0.85} name="Zrušeno" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3">
              {[{ l: 'Včas', c: '#10B981' }, { l: 'Zpoždění', c: '#FBBF24' }, { l: 'Zrušeno', c: '#F97316' }].map(l => (
                <div key={l.l} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: l.c }} />
                  <span className="text-xs text-white/35">{l.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Kumulativní výkony — měsíc</p>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={monthCumulative} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FBBF24" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} interval={4} />
                <YAxis yAxisId="left"  stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.1)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                <Bar yAxisId="left" dataKey="v" fill={accent} fillOpacity={0.4} radius={[2, 2, 0, 0]} barSize={8} name="Denní výkony %" />
                <Area yAxisId="right" type="monotone" dataKey="cumul" stroke="#FBBF24" fill="url(#cg)" strokeWidth={2} dot={false} name="Kumulace" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Turnover time ── */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">Doba obrátky sálu — turnover time (min)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={turnoverData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 0" vertical={false} />
                <XAxis dataKey="t" stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.1)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 30]} />
                <Tooltip {...TT} formatter={(v: number) => [`${v} min`]} />
                <ReferenceLine y={20} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="v" stroke="#2DD4BF" fill="url(#tg)" strokeWidth={2} dot={{ r: 3, fill: '#2DD4BF', strokeWidth: 0 }} name="Obrátka" />
                <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.18)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Cíl" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="space-y-3 pt-2">
              {turnoverData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white/45">{d.t}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${(d.v / 30) * 100}%`, background: d.v > 20 ? '#F97316' : '#2DD4BF', opacity: 0.85 }} />
                    </div>
                    <span className="text-sm font-black w-12 text-right"
                      style={{ color: d.v > 20 ? '#F97316' : '#2DD4BF' }}>{d.v} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-4">
            Souhrnné rozložení workflow statusů — všechny sály
          </p>
          <div className="flex h-6 w-full rounded-xl overflow-hidden gap-[1.5px] mb-5">
            {workflowPct.map((seg, i) => (
              <motion.div key={i} className="h-full shrink-0" style={{ background: seg.color, opacity: 0.87 }}
                initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                transition={{ duration: 0.7, delay: i * 0.06 }}
                title={`${seg.title} — ${seg.pct}%`} />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
            {workflowPct.map((seg, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: seg.color, opacity: 0.88 }} />
                    <span className="text-xs text-white/40">{seg.title}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: seg.color }}>{seg.pct}%</span>
                </div>
                <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: seg.color, opacity: 0.85 }}
                    initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Phase durations ── */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Fáze operačního cyklu — průměrné trvání</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            {phaseRows.map((ph, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white/50 flex items-center gap-2">
                    <TrendIcon v={ph.trend} />
                    {ph.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/25">{ph.pct}%</span>
                    <span className="text-sm font-black text-white/75">{ph.min} min</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: ph.color, opacity: 0.85 }}
                    initial={{ width: 0 }} animate={{ width: `${ph.pct * 2}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Heatmapa ── */}
        <div className="rounded-2xl p-5 mb-10"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">Heatmapa vytížení — den × hodina</p>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1" style={{ minWidth: 560 }}>
              <div className="flex gap-1 pl-8">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="w-5 text-center text-[10px] text-white/20 font-bold shrink-0">{h}</div>
                ))}
              </div>
              {DAYS.map((day, di) => (
                <div key={di} className="flex items-center gap-1">
                  <span className="w-7 text-xs font-black text-white/30 shrink-0">{day}</span>
                  {HEATMAP[di].map((v, hi) => (
                    <div key={hi} className="w-5 h-5 rounded-[3px] shrink-0 transition-colors"
                      style={{ background: heatColor(v) }}
                      title={`${day} ${hi}:00 — ${v}%`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-5 mt-4">
            <span className="text-xs text-white/25 font-bold uppercase tracking-wider">Legenda:</span>
            {[
              { c: 'rgba(30,41,59,0.6)',    l: '< 25%' },
              { c: 'rgba(16,185,129,0.60)', l: '25–50%' },
              { c: 'rgba(251,191,36,0.65)', l: '50–70%' },
              { c: 'rgba(249,115,22,0.75)', l: '70–90%' },
              { c: 'rgba(255,59,48,0.85)',  l: '> 90%' },
            ].map(l => (
              <div key={l.l} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-[3px]" style={{ background: l.c }} />
                <span className="text-xs text-white/30">{l.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Room boxes grid ── */}
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-2">
            Statistiky jednotlivých sálů
          </p>
          <p className="text-sm text-white/25 mb-6">
            Kliknutím na sál zobrazíte kompletní statistiky s grafy, časovou osou a detailem výkonu.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rooms.map((room, i) => (
              <RoomBox key={room.id} room={room} index={i} onClick={() => setSelectedRoom(room)} />
            ))}
          </div>
        </div>

        {/* ── Overview table ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-white/25">Přehled sálů</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Sál','Oddělení','Chirurg','Výkony / 24h','Stav','Provoz'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-black uppercase tracking-widest text-white/20 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => {
                  const sc = statusColor(r.status);
                  return (
                    <tr key={r.id}
                      className="cursor-pointer transition-colors hover:bg-white/[0.025]"
                      style={{ borderBottom: i < rooms.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                      onClick={() => setSelectedRoom(r)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc }} />
                          <span className="font-bold text-white/80">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/40">{r.department}</td>
                      <td className="px-5 py-3 text-white/40">{r.staff.doctor.name ?? '—'}</td>
                      <td className="px-5 py-3 font-black" style={{ color: accent }}>{r.operations24h}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                          style={{ background: `${sc}14`, color: sc }}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-black"
                        style={{ color: isUPS(r) ? '#06B6D4' : 'rgba(255,255,255,0.3)' }}>
                        {isUPS(r) ? '24 h — ÚPS' : '12 h'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Room detail modal ── */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatisticsModule;
