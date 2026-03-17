import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Clock, Zap, X, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Layers, AlertTriangle, Heart, Users,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import { fetchRoomStatistics, fetchStatusHistory, RoomStatistics, StatusHistoryRow } from '../lib/db';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
} from 'recharts';

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }

type Period = 'den' | 'týden' | 'měsíc' | 'rok';

// ── Design System ──────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#00D8C1',
  secondary: '#A855F7',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F97316',
  danger: '#EF4444',
  info: '#3B82F6',
  pink: '#EC4899',
  yellow: '#FBBF24',
  
  bg: '#0a0a0f',
  surface: 'rgba(255,255,255,0.02)',
  surfaceHover: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.5)',
  textFaint: 'rgba(255,255,255,0.25)',
};

const DEPT_COLORS: Record<string, string> = {
  TRA: '#06B6D4', CHIR: '#F97316', ROBOT: '#A855F7',
  URO: '#EC4899', ORL: '#3B82F6', CÉVNÍ: '#14B8A6',
  'HPB + PLICNÍ': '#FBBF24', DĚTSKÉ: '#10B981', MAMMO: '#818CF8',
};

// ── Tooltip style ──────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: { 
    background: 'rgba(10, 10, 15, 0.95)', 
    border: `1px solid ${COLORS.border}`, 
    borderRadius: 12, 
    fontSize: 12,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: COLORS.textMuted, fontWeight: 700 },
  itemStyle: { color: COLORS.text },
};

// ── Data Generators ────────────────────────────────────────────────────────────
const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const HOURS = ['6:00', '8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function genDayData() { 
  return Array.from({ length: 12 }, (_, i) => ({ 
    t: `${7 + i}:00`, 
    v: [32, 58, 78, 89, 94, 91, 86, 82, 76, 65, 45, 28][i], 
    ops: [2, 4, 6, 8, 7, 6, 5, 4, 3, 2, 1, 0][i],
  })); 
}
function genWeekData() { 
  return DAYS.map((t, i) => ({ 
    t, 
    v: [92, 88, 95, 91, 85, 42, 28][i], 
    ops: [28, 26, 31, 27, 24, 8, 4][i],
  })); 
}
function genMonthData() { 
  return Array.from({ length: 30 }, (_, i) => ({ 
    t: `${i + 1}`, 
    v: Math.round(65 + Math.sin(i * 0.3) * 25 + Math.random() * 10),
    ops: Math.round(15 + Math.sin(i * 0.5) * 10 + Math.random() * 5),
  })); 
}
function genYearData() {
  const months = ['Led', 'Únr', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
  return months.map((t, i) => ({ 
    t, 
    v: [78, 80, 85, 88, 91, 87, 75, 72, 88, 90, 84, 76][i],
    ops: [420, 380, 450, 470, 490, 460, 380, 350, 480, 510, 440, 390][i],
  }));
}

// ── Heatmap Data ───────────────────────────────────────────────────────────────
const HEATMAP: number[][] = [
  [5, 5, 5, 5, 8, 28, 65, 88, 95, 92, 89, 85, 82, 88, 90, 85, 72, 58, 38, 18, 8, 5, 5, 5],
  [5, 5, 5, 5, 10, 32, 68, 90, 96, 94, 91, 87, 84, 89, 92, 87, 74, 60, 40, 20, 9, 5, 5, 5],
  [5, 5, 5, 5, 9, 30, 66, 89, 94, 92, 90, 86, 83, 88, 91, 86, 72, 58, 38, 19, 8, 5, 5, 5],
  [5, 5, 5, 5, 10, 29, 64, 88, 93, 91, 89, 85, 82, 87, 90, 85, 71, 57, 37, 18, 8, 5, 5, 5],
  [5, 5, 5, 5, 8, 24, 55, 78, 86, 84, 82, 78, 75, 80, 83, 78, 64, 50, 32, 15, 7, 5, 5, 5],
  [5, 5, 5, 5, 5, 10, 22, 38, 52, 58, 55, 50, 46, 50, 54, 48, 35, 24, 14, 8, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 10, 18, 28, 32, 30, 28, 26, 28, 30, 26, 18, 12, 8, 5, 5, 5, 5, 5],
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function statusColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return COLORS.warning;
  if (s === RoomStatus.FREE) return COLORS.success;
  if (s === RoomStatus.CLEANING) return COLORS.secondary;
  return COLORS.textFaint;
}
function statusLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return 'Obsazeno';
  if (s === RoomStatus.FREE) return 'Volno';
  if (s === RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}
function heatColor(v: number) {
  if (v >= 90) return 'rgba(239, 68, 68, 0.9)';
  if (v >= 70) return 'rgba(249, 115, 22, 0.8)';
  if (v >= 50) return 'rgba(251, 191, 36, 0.7)';
  if (v >= 25) return 'rgba(16, 185, 129, 0.6)';
  return 'rgba(30, 41, 59, 0.4)';
}

const UPS_DEPTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
function isUPS(r: OperatingRoom) { return r.isEmergency || UPS_DEPTS.includes(r.department); }
function dayMinutes(r: OperatingRoom) { return isUPS(r) ? 1440 : 720; }

type Seg = { color: string; title: string; pct: number; min: number };
function buildDist(r: OperatingRoom): Seg[] {
  const durs = WORKFLOW_STEPS.map((_, i) => i === 2 && r.currentProcedure ? r.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const tot = durs.reduce((s, d) => s + d, 0);
  return WORKFLOW_STEPS.map((step, i) => ({ color: step.color, title: step.title, pct: Math.round((durs[i] / tot) * 100), min: durs[i] }));
}

// ── Animated Number ────────────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number | string; className?: string; style?: React.CSSProperties }> = ({ value, className, style }) => (
  <motion.span 
    key={String(value)} 
    initial={{ opacity: 0, y: 10 }} 
    animate={{ opacity: 1, y: 0 }} 
    className={className}
    style={style}
  >
    {value}
  </motion.span>
);

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  color?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, color = COLORS.text, icon, sparkline, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
    style={{ 
      background: COLORS.surface, 
      border: `1px solid ${COLORS.border}`,
    }}
  >
    {/* Glow effect on hover */}
    <div 
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ 
        background: `radial-gradient(circle at 50% 0%, ${color}15 0%, transparent 70%)`,
      }}
    />
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              <div style={{ color }}>{icon}</div>
            </div>
          )}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
            {label}
          </span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${trend > 0 ? 'bg-emerald-500/15 text-emerald-400' : trend < 0 ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-white/40'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      
      <AnimatedNumber 
        value={value} 
        className="text-4xl font-black tracking-tight"
        style={{ color }}
      />
      
      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline.map((v, i) => ({ v, i }))}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="v" 
                stroke={color} 
                fill={`url(#spark-${label})`} 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </motion.div>
);

// ── Glass Card ─────────────────────────────────────────────────────────────────
const GlassCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', title, subtitle, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl overflow-hidden ${className}`}
    style={{ 
      background: COLORS.surface, 
      border: `1px solid ${COLORS.border}`,
    }}
  >
    {(title || action) && (
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: COLORS.border }}>
        <div>
          {title && (
            <h3 className="text-sm font-bold" style={{ color: COLORS.text }}>{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STATISTICS MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const rooms = propRooms ?? [];
  const [period, setPeriod] = useState<Period>('den');
  const [dbStats, setDbStats] = useState<RoomStatistics | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Load statistics from database
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const now = new Date();
      let fromDate: Date;
      switch (period) {
        case 'den': fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case 'týden': fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'měsíc': fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case 'rok': fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      }
      const [stats, history] = await Promise.all([
        fetchRoomStatistics(fromDate, now),
        fetchStatusHistory({ fromDate, toDate: now, limit: 500 }),
      ]);
      if (stats) setDbStats(stats);
      if (history) setStatusHistory(history);
      setIsLoading(false);
    };
    loadStats();
  }, [period]);

  // Computed data
  const utilData = useMemo(() => {
    if (period === 'den') return genDayData();
    if (period === 'týden') return genWeekData();
    if (period === 'měsíc') return genMonthData();
    return genYearData();
  }, [period]);

  const avgUtil = dbStats?.utilizationRate ?? Math.round(utilData.reduce((s, d) => s + d.v, 0) / utilData.length);
  const peakUtil = Math.max(...utilData.map(d => d.v));
  const totalOps = dbStats?.totalOperations ?? rooms.reduce((s, r) => s + r.operations24h, 0);
  const busyCount = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeCount = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleanCount = rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);
  const emergCnt = dbStats?.emergencyCount ?? rooms.filter(r => r.isEmergency).length;

  // Department distribution
  const deptData = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department] ?? 0) + r.operations24h; });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: DEPT_COLORS[name] || COLORS.accent }));
  }, [rooms]);

  // Status distribution for pie
  const statusPie = [
    { name: 'Obsazeno', value: busyCount, color: COLORS.warning },
    { name: 'Volno', value: freeCount, color: COLORS.success },
    { name: 'Úklid', value: cleanCount, color: COLORS.secondary },
  ].filter(s => s.value > 0);

  // Room performance data
  const roomPerf = rooms.map(r => ({
    name: r.name.replace('Sál č. ', 'S'),
    fullName: r.name,
    ops: r.operations24h,
    util: Math.round(buildDist(r).find(d => d.title === 'Chirurgický výkon')?.pct ?? 0),
    queue: r.queueCount,
    status: r.status,
    color: statusColor(r.status),
    department: r.department,
  }));

  // Workflow aggregation
  const workflowAgg = useMemo(() => WORKFLOW_STEPS.map(step => {
    const avg = Math.round(rooms.reduce((s, r) => {
      const d = buildDist(r).find(d => d.title === step.title);
      return s + (d?.pct ?? 0);
    }, 0) / Math.max(1, rooms.length));
    return { title: step.title, color: step.color, pct: avg };
  }), [rooms]);

  // Sparkline data
  const sparkData = utilData.map(d => d.v);
  const opsSparkData = utilData.map(d => d.ops);

  return (
    <div className="w-full min-h-screen pb-24">
      {/* ── Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${COLORS.primary}15` }}>
            <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: COLORS.textMuted }}>
            Analytika & Statistiky
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter" style={{ color: COLORS.text }}>
          Statistiky
        </h1>
        <p className="text-base mt-3" style={{ color: COLORS.textMuted }}>
          Přehled výkonnosti operačních sálů v reálném čase
        </p>
      </motion.div>

      {/* ── Period Selector ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-8"
      >
        {(['den', 'týden', 'měsíc', 'rok'] as Period[]).map((p, i) => (
          <motion.button
            key={p}
            onClick={() => setPeriod(p)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              background: period === p ? `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.secondary}20)` : 'transparent',
              color: period === p ? COLORS.text : COLORS.textMuted,
              border: `1px solid ${period === p ? COLORS.primary : COLORS.border}`,
            }}
          >
            {period === p && (
              <motion.div
                layoutId="period-indicator"
                className="absolute inset-0 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}15)`,
                  border: `1px solid ${COLORS.primary}`,
                }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{p}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── KPI Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Celkové využití"
          value={`${avgUtil}%`}
          trend={5}
          color={COLORS.primary}
          icon={<Activity className="w-4 h-4" />}
          sparkline={sparkData}
          delay={0.1}
        />
        <StatCard
          label="Operace"
          value={totalOps}
          trend={12}
          color={COLORS.accent}
          icon={<Heart className="w-4 h-4" />}
          sparkline={opsSparkData}
          delay={0.15}
        />
        <StatCard
          label="Sály aktivní"
          value={`${busyCount}/${rooms.length}`}
          color={COLORS.warning}
          icon={<Layers className="w-4 h-4" />}
          delay={0.2}
        />
        <StatCard
          label="Ve frontě"
          value={totalQueue}
          trend={totalQueue > 3 ? 8 : -5}
          color={totalQueue > 5 ? COLORS.danger : COLORS.success}
          icon={<Users className="w-4 h-4" />}
          delay={0.25}
        />
      </div>

      {/* ── Main Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Large Area Chart */}
        <GlassCard 
          className="lg:col-span-2" 
          title="Vytížení v čase"
          subtitle={`Průměr: ${avgUtil}% • Peak: ${peakUtil}%`}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={utilData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <stop offset="50%" stopColor={COLORS.primary} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="opsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" stroke={COLORS.textFaint} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.textFaint} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke={COLORS.primary} 
                  fill="url(#utilGrad)" 
                  strokeWidth={2.5}
                  name="Využití %"
                />
                <Line 
                  type="monotone" 
                  dataKey="ops" 
                  stroke={COLORS.secondary} 
                  strokeWidth={2}
                  dot={false}
                  name="Operace"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.primary }} />
              <span className="text-xs" style={{ color: COLORS.textMuted }}>Využití sálů</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.secondary }} />
              <span className="text-xs" style={{ color: COLORS.textMuted }}>Počet operací</span>
            </div>
          </div>
        </GlassCard>

        {/* Status Distribution */}
        <GlassCard title="Stav sálů" subtitle="Aktuální rozložení">
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {statusPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {statusPie.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>
                  {s.name} <span style={{ color: s.color }}>{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Room Performance Grid ── */}
      <GlassCard title="Výkon jednotlivých sálů" subtitle="Operace a vytížení za období" className="mb-8">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomPerf} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke={COLORS.textFaint} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={COLORS.textFaint} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="ops" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Operace" />
              <Bar dataKey="util" fill={COLORS.secondary} radius={[4, 4, 0, 0]} name="Využití %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* ── Workflow Phases & Heatmap Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Workflow Phases */}
        <GlassCard title="Fáze operací" subtitle="Průměrné rozložení času">
          <div className="space-y-4">
            {workflowAgg.map((phase, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: phase.color }} />
                    <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>{phase.title}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: phase.color }}>{phase.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: phase.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${phase.pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Heatmap */}
        <GlassCard title="Teplotní mapa vytížení" subtitle="Hodiny × Dny v týdnu">
          <div className="grid grid-cols-[auto_1fr] gap-2">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between py-1">
              {DAYS.map((day, i) => (
                <span key={i} className="text-[10px] font-bold pr-2" style={{ color: COLORS.textMuted, height: 28, display: 'flex', alignItems: 'center' }}>
                  {day}
                </span>
              ))}
            </div>
            
            {/* Heatmap grid */}
            <div className="grid grid-rows-7 gap-1">
              {HEATMAP.map((row, ri) => (
                <div key={ri} className="grid grid-cols-24 gap-0.5">
                  {row.map((val, ci) => (
                    <motion.div
                      key={ci}
                      className="h-6 rounded-sm cursor-pointer transition-transform hover:scale-110"
                      style={{ background: heatColor(val) }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (ri * 24 + ci) * 0.002 }}
                      title={`${DAYS[ri]} ${ci}:00 - ${val}%`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Nízké</span>
            <div className="flex gap-1">
              {[10, 35, 55, 75, 95].map((v, i) => (
                <div key={i} className="w-6 h-3 rounded-sm" style={{ background: heatColor(v) }} />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Vysoké</span>
          </div>
        </GlassCard>
      </div>

      {/* ── Department Distribution ── */}
      <GlassCard title="Operace podle oddělení" subtitle="Distribuce za vybrané období">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {deptData.map((dept, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl text-center transition-all hover:scale-105"
              style={{ 
                background: `${dept.color}08`, 
                border: `1px solid ${dept.color}20`,
              }}
            >
              <div 
                className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-sm font-black"
                style={{ background: `${dept.color}20`, color: dept.color }}
              >
                {dept.name.slice(0, 2)}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>
                {dept.name}
              </p>
              <p className="text-2xl font-black" style={{ color: dept.color }}>
                {dept.value}
              </p>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

export default StatisticsModule;
