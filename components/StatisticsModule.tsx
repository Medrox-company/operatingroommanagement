import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Clock, Zap, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Layers, AlertTriangle, Heart, Users,
  ArrowUpRight, Sparkles, Timer, Target, Gauge,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import { fetchRoomStatistics, fetchStatusHistory, RoomStatistics, StatusHistoryRow } from '../lib/db';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart, Legend,
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
    borderRadius: 16, 
    fontSize: 12,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
    padding: '12px 16px',
  },
  labelStyle: { color: COLORS.textMuted, fontWeight: 700, marginBottom: 8 },
  itemStyle: { color: COLORS.text },
};

// ── Data Generators ────────────────────────────────────────────────────────────
const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

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

function heatColor(v: number) {
  if (v >= 90) return 'rgba(239, 68, 68, 0.95)';
  if (v >= 70) return 'rgba(249, 115, 22, 0.85)';
  if (v >= 50) return 'rgba(251, 191, 36, 0.75)';
  if (v >= 25) return 'rgba(16, 185, 129, 0.65)';
  return 'rgba(30, 41, 59, 0.4)';
}

const UPS_DEPTS = ['EMERGENCY', 'CÉVNÍ', 'ROBOT'];
function isUPS(r: OperatingRoom) { return r.isEmergency || UPS_DEPTS.includes(r.department); }

type Seg = { color: string; title: string; pct: number; min: number };
function buildDist(r: OperatingRoom): Seg[] {
  const durs = WORKFLOW_STEPS.map((_, i) => i === 2 && r.currentProcedure ? r.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const tot = durs.reduce((s, d) => s + d, 0);
  return WORKFLOW_STEPS.map((step, i) => ({ color: step.color, title: step.title, pct: Math.round((durs[i] / tot) * 100), min: durs[i] }));
}

// ── Animated Counter ───────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{ value: number; suffix?: string; className?: string }> = ({ value, suffix = '', className }) => {
  const [displayed, setDisplayed] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{displayed}{suffix}</span>;
};

// ── Metric Card (Bento Style) ──────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  chart?: React.ReactNode;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, suffix = '', trend, icon, color, size = 'md', chart, delay = 0 
}) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-3xl ${sizeClasses[size]} transition-all duration-500 hover:scale-[1.02] cursor-default`}
      style={{ 
        background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
        border: `1px solid rgba(255,255,255,0.06)`,
      }}
    >
      {/* Gradient glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ 
          background: `radial-gradient(ellipse at 50% 0%, ${color}20 0%, transparent 70%)`,
        }}
      />
      
      {/* Accent line */}
      <div 
        className="absolute top-0 left-6 right-6 h-[2px] rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{ 
              background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
              boxShadow: `0 0 20px ${color}20`,
            }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          
          {trend !== undefined && (
            <div 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40'
              }`}
              style={{ 
                background: trend > 0 ? 'rgba(16,185,129,0.15)' : trend < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'
              }}
            >
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {title}
        </p>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          {typeof value === 'number' ? (
            <AnimatedCounter value={value} suffix={suffix} className="text-4xl font-black tracking-tight text-white" />
          ) : (
            <span className="text-4xl font-black tracking-tight text-white">{value}{suffix}</span>
          )}
        </div>

        {/* Optional Chart */}
        {chart && (
          <div className="mt-4 -mx-2">
            {chart}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Bento Chart Card ───────────────────────────────────────────────────────────
const BentoCard: React.FC<{ 
  children: React.ReactNode; 
  title?: string;
  subtitle?: string;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}> = ({ children, title, subtitle, className = '', delay = 0, noPadding = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`relative overflow-hidden rounded-3xl ${className}`}
    style={{ 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    {(title || subtitle) && (
      <div className="px-6 pt-6 pb-4">
        {title && (
          <h3 className="text-base font-bold text-white">{title}</h3>
        )}
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>
        )}
      </div>
    )}
    <div className={noPadding ? '' : 'px-6 pb-6'}>
      {children}
    </div>
  </motion.div>
);

// ── Circular Progress ──────────────────────────────────────────────────────────
const CircularProgress: React.FC<{ value: number; color: string; size?: number; strokeWidth?: number }> = ({ 
  value, color, size = 120, strokeWidth = 8 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${color}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter value={value} suffix="%" className="text-2xl font-black text-white" />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STATISTICS MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const rooms = propRooms ?? [];
  const [period, setPeriod] = useState<Period>('den');
  const [dbStats, setDbStats] = useState<RoomStatistics | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'workflow'>('overview');

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

  // Workflow aggregation
  const workflowAgg = useMemo(() => WORKFLOW_STEPS.map(step => {
    const avg = Math.round(rooms.reduce((s, r) => {
      const d = buildDist(r).find(d => d.title === step.title);
      return s + (d?.pct ?? 0);
    }, 0) / Math.max(1, rooms.length));
    return { title: step.title, color: step.color, pct: avg };
  }), [rooms]);

  // Mini sparkline component
  const MiniSparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 40 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ v, i }))}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="v" 
          stroke={color} 
          fill={`url(#spark-${color.replace('#', '')})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <div className="w-full min-h-screen pb-32">
      {/* ── Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary}25 0%, ${COLORS.primary}10 100%)` }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: COLORS.textMuted }}>
            Analytika & Statistiky
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
          Statistiky
        </h1>
        <p className="text-base mt-3" style={{ color: COLORS.textMuted }}>
          Přehled výkonnosti operačních sálů v reálném čase
        </p>
      </motion.div>

      {/* ── Controls Bar ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center justify-between gap-4 mb-8"
      >
        {/* Period Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {(['den', 'týden', 'měsíc', 'rok'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                period === p ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {period === p && (
                <motion.div
                  layoutId="period-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS.primary}30 0%, ${COLORS.secondary}20 100%)`,
                    border: `1px solid ${COLORS.primary}40`,
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{p}</span>
            </button>
          ))}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2">
          {[
            { id: 'overview', label: 'Přehled', icon: <Layers className="w-4 h-4" /> },
            { id: 'rooms', label: 'Sály', icon: <Target className="w-4 h-4" /> },
            { id: 'workflow', label: 'Workflow', icon: <Activity className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Bento Grid Layout ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
          >
            {/* Main KPI - Utilization */}
            <div className="col-span-2 row-span-2">
              <BentoCard delay={0.1} className="h-full">
                <div className="flex flex-col items-center justify-center py-4">
                  <CircularProgress value={avgUtil} color={COLORS.primary} size={160} strokeWidth={12} />
                  <p className="text-sm font-bold uppercase tracking-widest mt-4" style={{ color: COLORS.textMuted }}>
                    Celkové vytížení
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-bold">+5% oproti včerejšku</span>
                  </div>
                </div>
              </BentoCard>
            </div>

            {/* Operations Count */}
            <MetricCard
              title="Operace celkem"
              value={totalOps}
              trend={12}
              icon={<Heart className="w-5 h-5" />}
              color={COLORS.pink}
              delay={0.15}
            />

            {/* Active Rooms */}
            <MetricCard
              title="Aktivní sály"
              value={`${busyCount}`}
              suffix={`/${rooms.length}`}
              icon={<Gauge className="w-5 h-5" />}
              color={COLORS.warning}
              delay={0.2}
            />

            {/* Queue */}
            <MetricCard
              title="Ve frontě"
              value={totalQueue}
              trend={totalQueue > 3 ? 8 : -5}
              icon={<Users className="w-5 h-5" />}
              color={totalQueue > 5 ? COLORS.danger : COLORS.success}
              delay={0.25}
            />

            {/* Emergency */}
            <MetricCard
              title="Akutní"
              value={emergCnt}
              icon={<AlertTriangle className="w-5 h-5" />}
              color={COLORS.danger}
              delay={0.3}
            />

            {/* Main Chart - Full Width */}
            <div className="col-span-2 md:col-span-4 lg:col-span-6">
              <BentoCard 
                title="Vytížení v čase" 
                subtitle={`Průměr: ${avgUtil}% • Maximum: ${Math.max(...utilData.map(d => d.v))}%`}
                delay={0.35}
              >
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={utilData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="utilGradNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.5} />
                          <stop offset="50%" stopColor={COLORS.primary} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="t" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Area 
                        type="monotone" 
                        dataKey="v" 
                        stroke={COLORS.primary} 
                        fill="url(#utilGradNew)" 
                        strokeWidth={3}
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
                <div className="flex items-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS.primary }} />
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>Využití sálů</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS.secondary }} />
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>Počet operací</span>
                  </div>
                </div>
              </BentoCard>
            </div>

            {/* Status Pie */}
            <div className="col-span-2">
              <BentoCard title="Status sálů" delay={0.4}>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {statusPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {statusPie.map((s) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-white/50">{s.name}</span>
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </div>

            {/* Departments Bar */}
            <div className="col-span-2 md:col-span-4">
              <BentoCard title="Operace dle oddělení" delay={0.45}>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} layout="vertical" margin={{ left: 60, right: 20 }}>
                      <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} width={55} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {deptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BentoCard>
            </div>

            {/* Heatmap */}
            <div className="col-span-2 md:col-span-4 lg:col-span-6">
              <BentoCard title="Heatmapa vytížení" subtitle="Týdenní přehled podle hodin" delay={0.5}>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex mb-2">
                      <div className="w-12" />
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 text-center text-[9px] text-white/30">
                          {i < 10 ? `0${i}` : i}
                        </div>
                      ))}
                    </div>
                    {HEATMAP.map((row, ri) => (
                      <div key={ri} className="flex mb-1">
                        <div className="w-12 text-[10px] text-white/40 flex items-center">{DAYS[ri]}</div>
                        {row.map((v, ci) => (
                          <motion.div
                            key={ci}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + (ri * 24 + ci) * 0.002 }}
                            className="flex-1 h-6 mx-0.5 rounded-sm cursor-default transition-transform hover:scale-110"
                            style={{ background: heatColor(v) }}
                            title={`${DAYS[ri]} ${ci}:00 - ${v}%`}
                          />
                        ))}
                      </div>
                    ))}
                    <div className="flex items-center justify-end gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(30, 41, 59, 0.4)' }} />
                        <span className="text-[10px] text-white/40">Nízké</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(16, 185, 129, 0.6)' }} />
                        <span className="text-[10px] text-white/40">Střední</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(249, 115, 22, 0.8)' }} />
                        <span className="text-[10px] text-white/40">Vysoké</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(239, 68, 68, 0.9)' }} />
                        <span className="text-[10px] text-white/40">Kritické</span>
                      </div>
                    </div>
                  </div>
                </div>
              </BentoCard>
            </div>
          </motion.div>
        )}

        {activeTab === 'rooms' && (
          <motion.div
            key="rooms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {rooms.map((room, i) => {
              const dist = buildDist(room);
              const mainOp = dist.find(d => d.title === 'Chirurgický výkon');
              return (
                <BentoCard key={room.id} delay={0.1 + i * 0.05}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">{room.name}</h4>
                      <p className="text-xs text-white/40">{room.department}</p>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        background: `${statusColor(room.status)}20`,
                        color: statusColor(room.status),
                      }}
                    >
                      {room.status === RoomStatus.BUSY ? 'Obsazeno' : room.status === RoomStatus.FREE ? 'Volno' : 'Úklid'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xl font-black text-white">{room.operations24h}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Operace</p>
                    </div>
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xl font-black text-white">{mainOp?.pct || 0}%</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Využití</p>
                    </div>
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xl font-black text-white">{room.queueCount}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Fronta</p>
                    </div>
                  </div>

                  {/* Mini workflow bar */}
                  <div className="flex rounded-full overflow-hidden h-2">
                    {dist.map((seg, j) => (
                      <div 
                        key={j}
                        style={{ width: `${seg.pct}%`, background: seg.color }}
                        title={`${seg.title}: ${seg.pct}%`}
                      />
                    ))}
                  </div>
                </BentoCard>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'workflow' && (
          <motion.div
            key="workflow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Workflow Steps */}
            <BentoCard title="Průměrné trvání fází" delay={0.1}>
              <div className="space-y-3 mt-4">
                {workflowAgg.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: step.color }}
                    />
                    <span className="text-sm text-white/60 flex-1 truncate">{step.title}</span>
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${step.pct}%` }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: step.color }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">{step.pct}%</span>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* Radar Chart */}
            <BentoCard title="Porovnání workflow" delay={0.2}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={workflowAgg.map(w => ({ subject: w.title.split(' ')[0], value: w.pct }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <Radar
                      name="Průměr"
                      dataKey="value"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </BentoCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatisticsModule;
