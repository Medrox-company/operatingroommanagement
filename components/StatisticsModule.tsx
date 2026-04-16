'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Calendar,
  AlertTriangle, Shield, Clock, Layers, Zap, X, BarChart3,
  ChevronRight, Filter, Download, RefreshCw,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { STEP_DURATIONS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { fetchRoomStatistics, RoomStatistics } from '../lib/db';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }

type Period = 'den' | 'týden' | 'měsíc' | 'rok';
type Tab = 'prehled' | 'saly' | 'faze' | 'heatmapa';

// ── Design System Tokens ────────────────────────────────────────────────────────
const theme = {
  // Primary colors
  primary: '#14b8a6',
  primaryMuted: 'rgba(20, 184, 166, 0.15)',
  
  // Semantic colors
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#0ea5e9',
  infoMuted: 'rgba(14, 165, 233, 0.15)',
  
  // Neutrals
  text: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.56)',
  textFaint: 'rgba(255, 255, 255, 0.36)',
  textGhost: 'rgba(255, 255, 255, 0.18)',
  
  // Surfaces
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceHover: 'rgba(255, 255, 255, 0.05)',
  surfaceActive: 'rgba(255, 255, 255, 0.08)',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  
  // Chart palette
  chart: ['#14b8a6', '#10b981', '#f59e0b', '#f97316', '#a855f7', '#0ea5e9', '#ec4899'],
};

const DEPT_COLORS: Record<string, string> = {
  TRA: '#14b8a6', CHIR: '#f97316', ROBOT: '#a855f7',
  URO: '#ec4899', ORL: '#3b82f6', 'CÉVNÍ': '#10b981',
  'HPB + PLICNÍ': '#f59e0b', 'DĚTSKÉ': '#22c55e', MAMMO: '#818cf8',
};

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

// ── Tooltip Styling ─────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(0, 0, 0, 0.9)',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  labelStyle: { color: theme.textMuted, marginBottom: 4 },
  itemStyle: { color: theme.primary },
};

// ── Helper Functions ────────────────────────────────────────────────────────────
function statusColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return theme.warning;
  if (s === RoomStatus.FREE) return theme.success;
  if (s === RoomStatus.CLEANING) return theme.primary;
  return theme.textFaint;
}

function statusLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return 'Obsazeno';
  if (s === RoomStatus.FREE) return 'Volné';
  if (s === RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}

function heatColor(v: number) {
  if (v >= 90) return 'rgba(239, 68, 68, 0.85)';
  if (v >= 70) return 'rgba(249, 115, 22, 0.75)';
  if (v >= 50) return 'rgba(245, 158, 11, 0.65)';
  if (v >= 25) return 'rgba(16, 185, 129, 0.55)';
  return 'rgba(30, 41, 59, 0.4)';
}

const UPS_DEPTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
function isUPS(r: OperatingRoom) { return r.isEmergency || UPS_DEPTS.includes(r.department); }
function dayMinutes(r: OperatingRoom) { return isUPS(r) ? 1440 : 720; }

type Seg = { color: string; title: string; pct: number; min: number };
type WorkflowStep = { name: string; title: string; color: string; organizer: string; status: string };

function buildTimeline(r: OperatingRoom, workflowSteps: WorkflowStep[]): Seg[] {
  const dm = dayMinutes(r);
  const passes = Math.max(1, Math.floor(r.operations24h * (dm / 1440)));
  const durs = workflowSteps.map((_, i) => i === 2 && r.currentProcedure ? r.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const ct = durs.reduce((s, d) => s + d, 0);
  const mpp = Math.floor(dm / passes);
  const raw: Seg[] = [];
  for (let p = 0; p < passes; p++) {
    workflowSteps.forEach((step, si) => {
      const m = Math.round((durs[si] / ct) * mpp);
      if (m > 0) raw.push({ color: step.color, title: step.title, pct: (m / dm) * 100, min: m });
    });
    if (p < passes - 1) raw.push({ color: 'rgba(255,255,255,0.04)', title: 'Pauza', pct: (5 / dm) * 100, min: 5 });
  }
  const tot = raw.reduce((s, sg) => s + sg.pct, 0);
  return raw.map(sg => ({ ...sg, pct: (sg.pct / tot) * 100 }));
}

function buildDist(r: OperatingRoom, workflowSteps: WorkflowStep[]): Seg[] {
  const durs = workflowSteps.map((_, i) => i === 2 && r.currentProcedure ? r.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const tot = durs.reduce((s, d) => s + d, 0);
  return workflowSteps.map((step, i) => ({ color: step.color, title: step.title, pct: Math.round((durs[i] / tot) * 100), min: durs[i] }));
}

function mergeSeg(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    const l = out[out.length - 1];
    if (l && l.title === s.title) { l.pct += s.pct; l.min += s.min; }
    else out.push({ ...s });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  trend?: number;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, color = theme.text, trend, icon }) => (
  <div className="stat-card-glow rounded-xl p-4 transition-all duration-200 hover:bg-surface-hover"
    style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
    <div className="flex items-start justify-between mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
        {label}
      </span>
      {icon && <span style={{ color: theme.textFaint }}>{icon}</span>}
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
        {subValue && <p className="text-[11px] mt-1" style={{ color: theme.textFaint }}>{subValue}</p>}
      </div>
      {trend !== undefined && <TrendBadge v={trend} />}
    </div>
  </div>
);

// Section Header Component
const SectionHeader: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
      {children}
    </h3>
    {action}
  </div>
);

// Card Component
const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = 
  ({ children, className = '', style = {} }) => (
  <div className={`rounded-xl ${className}`} 
    style={{ background: theme.surface, border: `1px solid ${theme.border}`, ...style }}>
    {children}
  </div>
);

// Trend Badge
const TrendBadge: React.FC<{ v: number }> = ({ v }) => {
  if (v > 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md"
      style={{ background: theme.successMuted, color: theme.success }}>
      <TrendingUp className="w-3 h-3" />+{v}%
    </span>
  );
  if (v < 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md"
      style={{ background: theme.dangerMuted, color: theme.danger }}>
      <TrendingDown className="w-3 h-3" />{v}%
    </span>
  );
  return <span className="text-[10px]" style={{ color: theme.textGhost }}>—</span>;
};

// Loading Skeleton
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg ${className}`} style={{ background: theme.surfaceHover }} />
);

// Empty State
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <BarChart3 className="w-10 h-10 mb-3" style={{ color: theme.textGhost }} />
    <p className="text-sm" style={{ color: theme.textMuted }}>{message}</p>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ROOM MINI CARD
// ══════════════════════════════════════════════════════════════════════════════
interface RoomMiniCardProps { r: OperatingRoom; index: number; onClick: () => void; workflowSteps: WorkflowStep[]; }

const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ r, index, onClick, workflowSteps }) => {
  const sc = statusColor(r.status);
  const tl = useMemo(() => mergeSeg(buildTimeline(r, workflowSteps)), [r, workflowSteps]);
  const utilP = buildDist(r, workflowSteps).find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const ups = isUPS(r);
  
  return (
    <motion.button onClick={onClick}
      className="text-left rounded-xl p-4 w-full group transition-all duration-200"
      style={{
        background: r.status === RoomStatus.BUSY ? `linear-gradient(135deg, ${sc}08, transparent)` : theme.surface,
        border: `1px solid ${r.status === RoomStatus.BUSY ? `${sc}25` : theme.border}`,
      }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      whileHover={{ scale: 1.02, borderColor: theme.borderHover } as any}>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sc, boxShadow: `0 0 8px ${sc}50` }} />
          <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{r.name}</span>
        </div>
        {ups && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: theme.primaryMuted, color: theme.primary }}>ÚPS</span>
        )}
      </div>
      
      <p className="text-[11px] mb-3 truncate" style={{ color: theme.textFaint }}>{r.department}</p>
      
      {/* Timeline bar */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px mb-3">
        {tl.map((seg, si) => (
          <div key={si} className="h-full shrink-0 transition-all" 
            style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.8 }} />
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[9px] uppercase" style={{ color: theme.textGhost }}>Výkony</p>
            <p className="text-base font-bold" style={{ color: theme.primary }}>{r.operations24h}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase" style={{ color: theme.textGhost }}>Využití</p>
            <p className="text-base font-bold" style={{ color: theme.text }}>{utilP}%</p>
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ background: `${sc}15`, color: sc }}>
          {statusLabel(r.status).slice(0, 3)}
        </span>
      </div>
    </motion.button>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
interface RoomPanelProps {
  room: OperatingRoom;
  onClose: () => void;
  workflowSteps: WorkflowStep[];
  dbStats?: RoomStatistics | null;
}

const RoomDetailPanel: React.FC<RoomPanelProps> = ({ room, onClose, workflowSteps, dbStats }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const dm = dayMinutes(room);
  const tl = useMemo(() => mergeSeg(buildTimeline(room, workflowSteps)), [room, workflowSteps]);
  const dist = useMemo(() => buildDist(room, workflowSteps), [room, workflowSteps]);
  const opsDay = Math.max(1, Math.floor(room.operations24h * (dm / 1440)));
  const utilPct = dist.find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;

  const dayCurve = useMemo(() => {
    const start = ups ? 0 : 7; const end = ups ? 24 : 19;
    if (dbStats?.hourlyUtilization) {
      return dbStats.hourlyUtilization
        .filter(h => h.hour >= start && h.hour < end)
        .map(h => ({ t: `${h.hour}`, v: h.utilization }));
    }
    return Array.from({ length: end - start }, (_, i) => ({ t: `${start + i}`, v: 0 }));
  }, [ups, dbStats]);

  const cumulData = useMemo(() => {
    if (dbStats?.operationsByDay) {
      const days = Object.entries(dbStats.operationsByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
      let cum = 0;
      if (days.length > 0) {
        return days.map(([, count], i) => { cum += count; return { d: `${i + 1}`, daily: count, cum }; });
      }
    }
    return Array.from({ length: 30 }, (_, i) => ({ d: `${i + 1}`, daily: 0, cum: 0 }));
  }, [dbStats]);

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.8)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="h-full overflow-y-auto hide-scrollbar w-full max-w-2xl"
        style={{ background: '#000', borderLeft: `1px solid ${theme.border}` }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: 'rgba(0,0,0,0.95)', borderBottom: `1px solid ${theme.border}`, backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: sc, boxShadow: `0 0 12px ${sc}` }} />
            <div>
              <p className="text-base font-bold" style={{ color: theme.text }}>{room.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: theme.textMuted }}>{room.department}</span>
                {ups && <span className="text-[10px] font-bold" style={{ color: theme.primary }}>ÚPS 24h</span>}
                {room.isSeptic && <span className="text-[10px] font-bold" style={{ color: theme.danger }}>SEPTICKÝ</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-surface-hover"
            style={{ color: theme.textMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Výkony/den" value={opsDay} color={theme.primary} />
            <StatCard label="Využití" value={`${utilPct}%`} color={theme.text} />
            <StatCard label="Provoz" value={ups ? '24h' : '12h'} color={ups ? theme.primary : theme.textMuted} />
            <StatCard label="Fronta" value={room.queueCount} color={room.queueCount > 0 ? theme.warning : theme.textMuted} />
          </div>

          {/* Timeline */}
          <Card className="p-5">
            <SectionHeader>Časová osa — {ups ? '00:00–24:00' : '07:00–19:00'}</SectionHeader>
            <div className="flex h-8 w-full rounded-lg overflow-hidden gap-0.5">
              {tl.map((seg, i) => (
                <motion.div key={i} className="h-full relative"
                  style={{ background: seg.color, opacity: 0.85 }}
                  initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  title={`${seg.title} — ${seg.min} min`}>
                  {seg.pct >= 10 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black/70">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {tl.filter(s => s.pct > 2).map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded shrink-0" style={{ background: seg.color }} />
                  <div>
                    <p className="text-[10px]" style={{ color: theme.textMuted }}>{seg.title}</p>
                    <p className="text-xs font-semibold" style={{ color: seg.color }}>
                      {Math.round(seg.pct)}% <span className="font-normal" style={{ color: theme.textFaint }}>{seg.min}m</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Day Curve */}
          <Card className="p-5">
            <SectionHeader>Vytížení v průběhu dne</SectionHeader>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={dayCurve} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id={`rg${room.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sc} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={sc} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
                <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg${room.id})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Cumulative Operations */}
          <Card className="p-5">
            <SectionHeader>Kumulativní operace — 30 dní</SectionHeader>
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={cumulData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="daily" fill={theme.primary} opacity={0.3} radius={[2, 2, 0, 0]} name="Denně" />
                <Line type="monotone" dataKey="cum" stroke={theme.success} strokeWidth={2} dot={false} name="Kumulativně" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STATISTICS MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const WORKFLOW_STEPS = workflowStatuses ?? [];
  
  const rooms = propRooms ?? [];
  const [period, setPeriod] = useState<Period>('den');
  const [tab, setTab] = useState<Tab>('prehled');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [dbStats, setDbStats] = useState<RoomStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load statistics from database
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      const now = new Date();
      let fromDate: Date;
      switch (period) {
        case 'den': fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case 'týden': fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'měsíc': fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case 'rok': fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      }
      const stats = await fetchRoomStatistics(fromDate, now);
      if (stats) setDbStats(stats);
      setIsLoadingStats(false);
    };
    loadStats();
  }, [period]);

  // Computed values
  const busyCount = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeCount = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleanCount = rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const maintCount = rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;
  const septicCnt = rooms.filter(r => r.isSeptic).length;
  const upsCnt = rooms.filter(r => isUPS(r)).length;
  const emergCnt = dbStats?.emergencyCount ?? 0;
  const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);

  // Build utilization data from DB
  const utilData = useMemo(() => {
    if (!dbStats?.hourlyUtilization) {
      return Array.from({ length: 12 }, (_, i) => ({ t: `${7 + i}h`, v: 0, cap: 100 }));
    }
    if (period === 'den') {
      return dbStats.hourlyUtilization.filter(h => h.hour >= 7 && h.hour < 19)
        .map(h => ({ t: `${h.hour}h`, v: h.utilization, cap: 100 }));
    }
    if (period === 'týden') {
      const dayOrder = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
      return dayOrder.map(t => ({ t, v: dbStats.weekdayUtilization?.[t] || 0, cap: 100 }));
    }
    if (period === 'měsíc') {
      const days = Object.entries(dbStats.operationsByDay || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
      if (days.length === 0) return Array.from({ length: 30 }, (_, i) => ({ t: `${i + 1}`, v: 0, cap: 100 }));
      const maxOps = Math.max(...days.map(([, c]) => c), 1);
      return days.map(([, count], i) => ({ t: `${i + 1}`, v: Math.round((count / maxOps) * 100), cap: 100 }));
    }
    const months = ['Led', 'Únr', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Září', 'Říj', 'Lis', 'Pro'];
    const monthlyOps: Record<number, number> = {};
    Object.entries(dbStats.operationsByDay || {}).forEach(([date, count]) => {
      const month = new Date(date).getMonth();
      monthlyOps[month] = (monthlyOps[month] || 0) + count;
    });
    const maxMonthOps = Math.max(...Object.values(monthlyOps), 1);
    return months.map((t, i) => ({ t, v: Math.round(((monthlyOps[i] || 0) / maxMonthOps) * 100), cap: 100 }));
  }, [period, dbStats]);

  const avgUtil = dbStats?.utilizationRate ?? Math.round(utilData.reduce((s, d) => s + d.v, 0) / Math.max(1, utilData.length));
  const avgUtilUPS = dbStats?.utilizationRateUPS ?? 0;
  const peakUtil = dbStats?.peakUtilization?.value ?? Math.max(...utilData.map(d => d.v), 0);
  const minUtil = dbStats?.minUtilization?.value ?? 0;
  const totalOps = dbStats?.totalOperations ?? rooms.reduce((s, r) => s + r.operations24h, 0);
  const workingHoursMinutes = dbStats?.totalOperationMinutes ?? 0;
  const upsMinutes = dbStats?.totalOperationMinutesUPS ?? 0;
  const availableWorkingMinutes = dbStats?.totalAvailableMinutes ?? 1;
  const availableUPSMinutes = dbStats?.totalAvailableMinutesUPS ?? 1;

  // Aggregated workflow data
  const workflowAgg = useMemo(() => {
    const totals: Record<string, { color: string; title: string; pct: number; min: number }> = {};
    rooms.forEach(r => {
      const d = buildDist(r, WORKFLOW_STEPS);
      d.forEach(seg => {
        if (!totals[seg.title]) totals[seg.title] = { ...seg, pct: 0, min: 0 };
        totals[seg.title].pct += seg.pct; totals[seg.title].min += seg.min;
      });
    });
    const arr = Object.values(totals);
    const tP = arr.reduce((s, x) => s + x.pct, 0);
    return arr.map(x => ({ ...x, pct: Math.round((x.pct / tP) * 100), min: Math.round(x.min / rooms.length) }));
  }, [rooms, WORKFLOW_STEPS]);

  // Status pie data
  const statusPie = [
    { name: 'Obsazeno', value: busyCount, color: theme.warning },
    { name: 'Volno', value: freeCount, color: theme.success },
    { name: 'Úklid', value: cleanCount, color: theme.primary },
    { name: 'Údržba', value: maintCount, color: theme.textFaint },
  ];

  // Room bar data
  const roomBarData = rooms.map(r => ({
    name: r.name.replace('Sál ', ''),
    ops: r.operations24h,
    util: buildDist(r, WORKFLOW_STEPS).find(d => d.title === 'Chirurgický výkon')?.pct ?? 0,
    color: DEPT_COLORS[r.department] ?? theme.primary,
  }));

  // Operations trend (7 days)
  const opsTrend = useMemo(() => {
    if (dbStats?.operationsByDay) {
      const days = Object.entries(dbStats.operationsByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
      return days.map(([date, count]) => ({ t: new Date(date).toLocaleDateString('cs', { weekday: 'short' }), v: count }));
    }
    return DAYS.map(t => ({ t, v: 0 }));
  }, [dbStats]);

  // Room status bar for stacked chart
  const roomStatusBar = rooms.map(r => {
    const d = buildDist(r, WORKFLOW_STEPS);
    const base: Record<string, string | number> = { name: r.name.replace('Sál ', '') };
    WORKFLOW_STEPS.forEach(step => { base[step.title] = d.find(x => x.title === step.title)?.pct ?? 0; });
    return base;
  });

  // Department map
  const deptMap = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department] || 0) + r.operations24h; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rooms]);

  // Interval comparison (weekly utilization from DB)
  const intervalCompare = useMemo(() => {
    if (dbStats?.weekdayUtilization) {
      return DAYS.map(t => ({ t, v: dbStats.weekdayUtilization[t] || 0 }));
    }
    return DAYS.map(t => ({ t, v: 0 }));
  }, [dbStats]);

  // Tabs configuration
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'prehled', label: 'Přehled', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'saly', label: 'Sály', icon: <Layers className="w-4 h-4" /> },
    { id: 'faze', label: 'Fáze', icon: <Activity className="w-4 h-4" /> },
    { id: 'heatmapa', label: 'Heatmapa', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full min-h-screen p-6" style={{ background: '#000' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.text }}>Statistiky</h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            Přehled výkonnosti operačních sálů a pracovních procesů
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center p-1 rounded-lg" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            {(['den', 'týden', 'měsíc', 'rok'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: period === p ? theme.primaryMuted : 'transparent',
                  color: period === p ? theme.primary : theme.textMuted,
                }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Action buttons */}
          <button className="p-2.5 rounded-lg transition-colors" 
            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted }}
            title="Obnovit data">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2.5 rounded-lg transition-colors"
            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted }}
            title="Exportovat">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 p-1 rounded-lg w-fit"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? theme.surfaceActive : 'transparent',
              color: tab === t.id ? theme.text : theme.textMuted,
            }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'prehled' && (
          <motion.div key="prehled" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* Top KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <StatCard label="Sálů celkem" value={rooms.length} icon={<Layers className="w-4 h-4" />} />
              <StatCard label="Obsazeno" value={`${busyCount}/${rooms.length}`} color={theme.warning} />
              <StatCard label="Volno" value={`${freeCount}/${rooms.length}`} color={theme.success} />
              <StatCard label="Úklid" value={cleanCount} color={theme.primary} />
              <StatCard label="Využití (prac.)" value={`${avgUtil}%`} color={theme.success} subValue="Pracovní doba" />
              <StatCard label="Využití (ÚPS)" value={`${avgUtilUPS}%`} color={theme.warning} subValue="Mimo prac. dobu" />
              <StatCard label="Peak" value={`${peakUtil}%`} color={peakUtil > 90 ? theme.danger : theme.warning} />
              <StatCard label="Výkony" value={totalOps} color={theme.primary} icon={<Activity className="w-4 h-4" />} />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Utilization Chart */}
              <Card className="lg:col-span-2 p-5">
                <SectionHeader>
                  Procentuální vytížení — {period}
                  <span className="text-xs" style={{ color: theme.textFaint }}>Reálná data z DB</span>
                </SectionHeader>
                {isLoadingStats ? (
                  <Skeleton className="h-48" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={utilData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                      <XAxis dataKey="t" stroke={theme.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={theme.textGhost} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} 
                        tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
                      <Line type="monotone" dataKey="cap" stroke={theme.textGhost} strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      <Area type="monotone" dataKey="v" stroke={theme.primary} fill="url(#utilGrad)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Status Pie */}
              <Card className="p-5">
                <SectionHeader>Stav sálů</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle.contentStyle} formatter={(v: number, name: string) => [`${v} sálů`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {statusPie.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs" style={{ color: theme.textMuted }}>{s.name}</span>
                      <span className="text-xs font-bold ml-auto" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                {/* Alert badges */}
                {(emergCnt > 0 || septicCnt > 0 || upsCnt > 0) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                    {emergCnt > 0 && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md"
                        style={{ background: theme.warningMuted, color: theme.warning }}>
                        <AlertTriangle className="w-3 h-3" />{emergCnt} Emerg.
                      </span>
                    )}
                    {septicCnt > 0 && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md"
                        style={{ background: theme.dangerMuted, color: theme.danger }}>
                        <Shield className="w-3 h-3" />{septicCnt} Septické
                      </span>
                    )}
                    {upsCnt > 0 && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md"
                        style={{ background: theme.primaryMuted, color: theme.primary }}>
                        <Zap className="w-3 h-3" />{upsCnt} ÚPS
                      </span>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Operations per room */}
              <Card className="p-5">
                <SectionHeader>Výkony / sál (24h)</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={roomBarData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }} barSize={10}>
                    <XAxis dataKey="name" stroke={theme.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Výkony']} />
                    <Bar dataKey="ops" radius={[3, 3, 0, 0]}>
                      {roomBarData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Department breakdown */}
              <Card className="p-5">
                <SectionHeader>Oddělení — výkony / 24h</SectionHeader>
                <div className="space-y-3">
                  {deptMap.slice(0, 6).map(([dept, count], i) => {
                    const color = DEPT_COLORS[dept] ?? theme.primary;
                    return (
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded" style={{ background: color }} />
                            <span className="text-xs" style={{ color: theme.textMuted }}>{dept}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: theme.text }}>{count}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: theme.surfaceHover }}>
                          <motion.div className="h-full rounded-full" style={{ background: color, opacity: 0.8 }}
                            initial={{ width: 0 }} animate={{ width: `${(count / deptMap[0][1]) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 7-day trend */}
              <Card className="p-5">
                <SectionHeader>Trend výkonů — 7 dní</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={opsTrend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Operace']} />
                    <Bar dataKey="v" fill={theme.primary} opacity={0.2} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="v" stroke={theme.success} strokeWidth={2} dot={{ fill: theme.success, r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Working Hours vs UPS Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly utilization comparison */}
              <Card className="p-5">
                <SectionHeader>Využití dle dne v týdnu</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={intervalCompare} margin={{ top: 0, right: 0, bottom: 0, left: -24 }} barSize={18}>
                    <XAxis dataKey="t" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} 
                      tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
                    <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                      {intervalCompare.map((e, i) => (
                        <Cell key={i} fill={e.v >= 80 ? theme.success : e.v >= 60 ? theme.primary : e.v >= 40 ? theme.warning : theme.danger} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Working hours vs UPS */}
              <Card className="lg:col-span-2 p-5">
                <SectionHeader>Pracovní doba vs. ÚPS — porovnání</SectionHeader>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg" style={{ background: theme.successMuted }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.success }}>
                      Pracovní doba
                    </p>
                    <p className="text-4xl font-bold mb-1" style={{ color: theme.success }}>{avgUtil}%</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {Math.round(workingHoursMinutes)} min využito / {Math.round(availableWorkingMinutes)} min dostupných
                    </p>
                    <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${avgUtil}%`, background: theme.success }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: theme.warningMuted }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.warning }}>
                      ÚPS (mimo prac. dobu)
                    </p>
                    <p className="text-4xl font-bold mb-1" style={{ color: theme.warning }}>{avgUtilUPS}%</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {Math.round(upsMinutes)} min využito / {Math.round(availableUPSMinutes)} min dostupných
                    </p>
                    <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${avgUtilUPS}%`, background: theme.warning }} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'saly' && (
          <motion.div key="saly" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* Status summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Obsazeno" value={busyCount} color={theme.warning}
                subValue={`${Math.round((busyCount / Math.max(1, rooms.length)) * 100)}% kapacity`} />
              <StatCard label="Volno" value={freeCount} color={theme.success}
                subValue={`${Math.round((freeCount / Math.max(1, rooms.length)) * 100)}% kapacity`} />
              <StatCard label="Úklid" value={cleanCount} color={theme.primary} subValue="V sanitaci" />
              <StatCard label="Údržba" value={maintCount} color={theme.textFaint} subValue="Mimo provoz" />
            </div>

            {/* Stacked workflow bar */}
            <Card className="p-5">
              <SectionHeader>Procentuální využití workflow fází — jednotlivé sály</SectionHeader>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roomStatusBar} margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={28}>
                  <XAxis dataKey="name" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip {...tooltipStyle} />
                  {WORKFLOW_STEPS.map(step => (
                    <Bar key={step.title} dataKey={step.title} stackId="r" fill={step.color} opacity={0.85} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                {WORKFLOW_STEPS.map(s => (
                  <div key={s.title} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded" style={{ background: s.color }} />
                    <span className="text-xs" style={{ color: theme.textMuted }}>{s.title}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Room cards grid */}
            <div>
              <SectionHeader>Sály — kliknutím zobrazíte detail</SectionHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {rooms.map((r, i) => (
                  <RoomMiniCard key={r.id} r={r} index={i} onClick={() => setSelectedRoom(r)} workflowSteps={WORKFLOW_STEPS} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'faze' && (
          <motion.div key="faze" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* Workflow aggregate timeline */}
            <Card className="p-5">
              <SectionHeader>Průměrné procentuální zastoupení workflow fází</SectionHeader>
              <div className="flex h-10 w-full rounded-lg overflow-hidden gap-0.5 mb-4">
                {workflowAgg.map((seg, i) => (
                  <motion.div key={i} className="h-full relative"
                    style={{ background: seg.color, opacity: 0.85 }}
                    initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    title={`${seg.title} — ${seg.pct}%`}>
                    {seg.pct >= 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black/70">
                        {seg.pct}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {workflowAgg.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ background: seg.color }} />
                    <div className="min-w-0">
                      <p className="text-xs truncate" style={{ color: theme.textMuted }}>{seg.title}</p>
                      <p className="text-sm font-bold" style={{ color: seg.color }}>
                        {seg.pct}% <span className="text-xs font-normal" style={{ color: theme.textFaint }}>~{seg.min}m</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Phase duration bar chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5">
                <SectionHeader>Průměrné trvání fází (z DB)</SectionHeader>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={WORKFLOW_STEPS.map((step, i) => ({
                    name: step.title.split(' ').slice(-1)[0],
                    min: dbStats?.averageStepDurations?.[step.title] ?? STEP_DURATIONS[i],
                    color: step.color,
                  }))} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barSize={12}>
                    <XAxis type="number" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke={theme.textGhost} fontSize={9} tickLine={false} axisLine={false} width={60} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} min`, 'Trvání']} />
                    <Bar dataKey="min" radius={[0, 4, 4, 0]}>
                      {WORKFLOW_STEPS.map((_, i) => <Cell key={i} fill={WORKFLOW_STEPS[i].color} opacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <SectionHeader>Distribuce fází — % z celkového cyklu</SectionHeader>
                <div className="space-y-3">
                  {workflowAgg.map((seg, i) => {
                    const realMin = dbStats?.averageStepDurations?.[seg.title] ?? STEP_DURATIONS[i];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded" style={{ background: seg.color }} />
                            <span className="text-xs" style={{ color: theme.textMuted }}>{seg.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: theme.textFaint }}>{realMin} min</span>
                            <span className="text-sm font-bold w-10 text-right" style={{ color: seg.color }}>{seg.pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.surfaceHover }}>
                          <motion.div className="h-full rounded-full" style={{ background: seg.color, opacity: 0.85 }}
                            initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.06 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'heatmapa' && (
          <motion.div key="heatmapa" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* Peak cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Nejvyšší využití (prac.)" value={`${dbStats?.peakUtilization?.value ?? 0}%`} color={theme.danger}
                subValue={dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : '-'} />
              <StatCard label="Využití prac. doba" value={`${avgUtil}%`} color={theme.success}
                subValue={`${Math.round(availableWorkingMinutes / 60)} h dostupných`} />
              <StatCard label="Využití ÚPS" value={`${avgUtilUPS}%`} color={theme.warning}
                subValue={`${Math.round(availableUPSMinutes / 60)} h dostupných`} />
              <StatCard label="Nejnižší využití (prac.)" value={`${dbStats?.minUtilization?.value ?? 0}%`} color={theme.primary}
                subValue={dbStats?.minUtilization ? `${dbStats.minUtilization.day} ${dbStats.minUtilization.hour}:00` : '-'} />
            </div>

            {/* Heatmap */}
            <Card className="p-5">
              <SectionHeader>
                Heatmapa vytížení — den x hodina
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: theme.surfaceHover, color: theme.textFaint }}>
                  Plné = prac. doba | Čárkované = ÚPS
                </span>
              </SectionHeader>
              {dbStats?.heatmapData && dbStats.heatmapData.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="inline-flex flex-col gap-1" style={{ minWidth: 600 }}>
                    {/* Hour labels */}
                    <div className="flex gap-1 pl-10">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="w-5 text-center text-[9px] font-medium shrink-0" style={{ color: theme.textFaint }}>
                          {h}
                        </div>
                      ))}
                    </div>
                    {/* Days */}
                    {DAYS.map((day, di) => {
                      const workingHours = dbStats.heatmapWorkingHours?.[di] || Array(24).fill(true);
                      return (
                        <div key={di} className="flex items-center gap-1">
                          <span className="w-9 text-xs font-semibold shrink-0 text-right pr-2" style={{ color: theme.textMuted }}>
                            {day}
                          </span>
                          {(dbStats.heatmapData[di] || Array(24).fill(0)).map((v, hi) => {
                            const isWorkingHour = workingHours[hi];
                            return (
                              <motion.div key={hi} className="w-5 h-5 rounded shrink-0"
                                style={{
                                  background: heatColor(v),
                                  border: isWorkingHour ? 'none' : '1px dashed rgba(255,255,255,0.25)',
                                  opacity: isWorkingHour ? 1 : 0.5,
                                }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: isWorkingHour ? 1 : 0.5, scale: 1 }}
                                transition={{ duration: 0.15, delay: (di * 24 + hi) * 0.002 }}
                                title={`${day} ${hi}:00 — ${v}% ${isWorkingHour ? '(prac.)' : '(ÚPS)'}`} />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState message={isLoadingStats ? 'Načítání dat...' : 'Žádná data za vybrané období'} />
              )}
              
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-6 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Legenda
                </span>
                {[
                  { c: 'rgba(30,41,59,0.4)', l: '< 25%' },
                  { c: 'rgba(16,185,129,0.55)', l: '25–50%' },
                  { c: 'rgba(245,158,11,0.65)', l: '50–70%' },
                  { c: 'rgba(249,115,22,0.75)', l: '70–90%' },
                  { c: 'rgba(239,68,68,0.85)', l: '> 90%' },
                ].map(l => (
                  <div key={l.l} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ background: l.c }} />
                    <span className="text-xs" style={{ color: theme.textMuted }}>{l.l}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-4">
                  <div className="w-4 h-4 rounded" style={{ background: 'rgba(30,41,59,0.4)', border: '1px dashed rgba(255,255,255,0.4)' }} />
                  <span className="text-xs" style={{ color: theme.textMuted }}>= ÚPS</span>
                </div>
              </div>
            </Card>

            {/* Hourly and daily charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5">
                <SectionHeader>Průměrné hodinové vytížení — prac. týden</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart
                    data={Array.from({ length: 24 }, (_, h) => {
                      const heatmap = dbStats?.heatmapData || [];
                      const pracDays = heatmap.slice(0, 5);
                      const vikendDays = heatmap.slice(5);
                      return {
                        h: `${h}`,
                        prac: pracDays.length > 0 ? Math.round(pracDays.reduce((s, d) => s + (d[h] || 0), 0) / Math.max(1, pracDays.length)) : 0,
                        vikend: vikendDays.length > 0 ? Math.round(vikendDays.reduce((s, d) => s + (d[h] || 0), 0) / Math.max(1, vikendDays.length)) : 0,
                      };
                    })}
                    margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.textMuted} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={theme.textMuted} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                    <XAxis dataKey="h" stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} 
                      tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name === 'prac' ? 'Pracovní dny' : 'Víkend']} />
                    <Area type="monotone" dataKey="prac" stroke={theme.primary} fill="url(#hg1)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="vikend" stroke={theme.textMuted} fill="url(#hg2)" strokeWidth={1} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-3">
                  {[{ c: theme.primary, l: 'Pracovní dny' }, { c: theme.textMuted, l: 'Víkend' }].map(x => (
                    <div key={x.l} className="flex items-center gap-2">
                      <div className="w-3 h-0.5 rounded-full" style={{ background: x.c }} />
                      <span className="text-xs" style={{ color: theme.textMuted }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader>Denní průměrné vs. peak vytížení</SectionHeader>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={DAYS.map((day, di) => {
                      const heatmap = dbStats?.heatmapData || [];
                      const dayData = heatmap[di] || Array(24).fill(0);
                      return {
                        day,
                        avg: Math.round(dayData.reduce((s, v) => s + v, 0) / 24),
                        peak: Math.max(...dayData, 0),
                      };
                    })}
                    margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barSize={20}>
                    <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke={theme.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.textGhost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name === 'avg' ? 'Průměr' : 'Peak']} />
                    <Bar dataKey="avg" fill={theme.primary} opacity={0.5} radius={[3, 3, 0, 0]} name="avg" />
                    <Bar dataKey="peak" fill={theme.warning} opacity={0.7} radius={[3, 3, 0, 0]} name="peak" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-3">
                  {[{ c: theme.primary, l: 'Průměrné využití' }, { c: theme.warning, l: 'Peak využití' }].map(x => (
                    <div key={x.l} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: x.c }} />
                      <span className="text-xs" style={{ color: theme.textMuted }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room detail panel */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} 
            workflowSteps={WORKFLOW_STEPS} dbStats={dbStats} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatisticsModule;
