'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Calendar, Clock, Users, Zap,
  AlertTriangle, Shield, X, BarChart3, PieChart as PieIcon, Grid3X3,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus, Layers, Timer,
  Heart, Stethoscope, Thermometer, Building2, CircleDot, Server
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { STEP_DURATIONS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { fetchRoomStatistics, RoomStatistics } from '../lib/db';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart, Legend,
} from 'recharts';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════
interface StatisticsModuleProps { rooms?: OperatingRoom[]; }
type Period = '24h' | '7d' | '30d' | '1y';
type View = 'overview' | 'utilization' | 'rooms' | 'workflow' | 'heatmap';

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ══════════════════════════════════════════════════════════════════════════════
const colors = {
  // Primary
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  // Status
  green: '#22C55E',
  greenMuted: 'rgba(34, 197, 94, 0.15)',
  orange: '#F97316',
  orangeMuted: 'rgba(249, 115, 22, 0.15)',
  yellow: '#EAB308',
  yellowMuted: 'rgba(234, 179, 8, 0.15)',
  red: '#EF4444',
  redMuted: 'rgba(239, 68, 68, 0.15)',
  blue: '#3B82F6',
  blueMuted: 'rgba(59, 130, 246, 0.15)',
  purple: '#A855F7',
  purpleMuted: 'rgba(168, 85, 247, 0.15)',
  // Neutral
  text: 'rgba(255, 255, 255, 0.92)',
  textSecondary: 'rgba(255, 255, 255, 0.64)',
  textTertiary: 'rgba(255, 255, 255, 0.40)',
  textGhost: 'rgba(255, 255, 255, 0.20)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  surface: 'rgba(255, 255, 255, 0.02)',
  surfaceHover: 'rgba(255, 255, 255, 0.04)',
  surfaceActive: 'rgba(255, 255, 255, 0.06)',
};

const statusColors: Record<RoomStatus, string> = {
  [RoomStatus.BUSY]: colors.orange,
  [RoomStatus.FREE]: colors.green,
  [RoomStatus.CLEANING]: colors.blue,
  [RoomStatus.MAINTENANCE]: colors.textTertiary,
};

const statusLabels: Record<RoomStatus, string> = {
  [RoomStatus.BUSY]: 'Probíhá operace',
  [RoomStatus.FREE]: 'Volný',
  [RoomStatus.CLEANING]: 'Sanitace',
  [RoomStatus.MAINTENANCE]: 'Údržba',
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function getHeatColor(value: number): string {
  if (value >= 90) return colors.red;
  if (value >= 70) return colors.orange;
  if (value >= 50) return colors.yellow;
  if (value >= 25) return colors.green;
  return colors.textGhost;
}

function getTrendColor(trend: number): string {
  if (trend > 0) return colors.green;
  if (trend < 0) return colors.red;
  return colors.textTertiary;
}

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
  icon?: React.ReactNode;
  sparklineData?: number[];
}

const MetricCard: React.FC<MetricCardProps> = memo(({
  label, value, subValue, trend, trendLabel, color = colors.text, icon, sparklineData
}) => (
  <motion.div
    className="stat-card stat-card-glow p-5"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
        {label}
      </span>
      {icon && <span style={{ color: colors.textTertiary }}>{icon}</span>}
    </div>
    
    <div className="flex items-end justify-between">
      <div>
        <p className="stat-metric text-3xl font-bold leading-none mb-1" style={{ color }}>
          {value}
        </p>
        {subValue && (
          <p className="text-xs" style={{ color: colors.textTertiary }}>{subValue}</p>
        )}
      </div>
      
      {trend !== undefined && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md" 
          style={{ background: trend > 0 ? colors.greenMuted : trend < 0 ? colors.redMuted : colors.surface }}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" style={{ color: colors.green }} /> :
           trend < 0 ? <ArrowDownRight className="w-3 h-3" style={{ color: colors.red }} /> :
           <Minus className="w-3 h-3" style={{ color: colors.textTertiary }} />}
          <span className="text-xs font-semibold" style={{ color: getTrendColor(trend) }}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
    
    {sparklineData && sparklineData.length > 0 && (
      <div className="mt-3 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
            <defs>
              <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#spark-${label.replace(/\s/g, '')})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </motion.div>
));

// Status Indicator
const StatusDot: React.FC<{ status: RoomStatus; size?: 'sm' | 'md' | 'lg' }> = ({ status, size = 'md' }) => {
  const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
  return (
    <span 
      className={`${sizeMap[size]} rounded-full inline-block`}
      style={{ 
        backgroundColor: statusColors[status],
        boxShadow: `0 0 8px ${statusColors[status]}50`
      }}
    />
  );
};

// Section Header
const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
      {title}
    </h3>
    {action}
  </div>
);

// Progress Bar
const ProgressBar: React.FC<{ value: number; max?: number; color?: string; showLabel?: boolean }> = ({
  value, max = 100, color = colors.accent, showLabel = false
}) => {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full">
      <div className="stat-progress">
        <motion.div
          className="stat-progress-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: colors.textTertiary }}>{value}</span>
          <span className="text-xs" style={{ color: colors.textTertiary }}>{max}</span>
        </div>
      )}
    </div>
  );
};

// Circular Gauge
const CircularGauge: React.FC<{ value: number; label: string; color?: string; size?: number }> = ({
  value, label, color = colors.accent, size = 80
}) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="stat-gauge -rotate-90">
        <circle
          className="stat-gauge-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          className="stat-gauge-fill"
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
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="stat-metric text-lg font-bold" style={{ color }}>{value}%</span>
      </div>
      <span className="text-xs mt-2" style={{ color: colors.textSecondary }}>{label}</span>
    </div>
  );
};

// Tooltip styles for Recharts
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(0, 0, 0, 0.9)',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  labelStyle: { color: colors.textSecondary, marginBottom: '4px', fontSize: '11px' },
  itemStyle: { color: colors.text, fontSize: '12px', padding: '2px 0' },
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
interface RoomDetailPanelProps {
  room: OperatingRoom;
  onClose: () => void;
  workflowSteps: Array<{ name: string; title: string; color: string }>;
  dbStats: RoomStatistics | null;
}

const RoomDetailPanel: React.FC<RoomDetailPanelProps> = memo(({ room, onClose, workflowSteps, dbStats }) => {
  const roomOps = dbStats?.operationsByRoom?.[room.id] || room.operations24h;
  const utilization = dbStats?.utilizationRate || 0;
  
  // Calculate phase distribution
  const phaseData = workflowSteps.map((step, i) => ({
    name: step.title.split(' ').pop() || step.title,
    fullName: step.title,
    duration: dbStats?.averageStepDurations?.[step.title] || STEP_DURATIONS[i],
    color: step.color,
  }));
  
  const totalDuration = phaseData.reduce((sum, p) => sum + p.duration, 0);
  
  // Hourly utilization data
  const hourlyData = dbStats?.hourlyUtilization?.map(h => ({
    hour: `${h.hour}:00`,
    value: h.utilization,
  })) || [];
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="h-full w-full max-w-2xl overflow-y-auto hide-scrollbar"
        style={{ background: '#0A0A0A', borderLeft: `1px solid ${colors.border}` }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-5 flex items-center justify-between"
          style={{ background: 'rgba(10, 10, 10, 0.95)', borderBottom: `1px solid ${colors.border}`, backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-4">
            <StatusDot status={room.status} size="lg" />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>{room.name}</h2>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {room.department}
                {room.isEmergency && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded" style={{ background: colors.redMuted, color: colors.red }}>AKUTNÍ</span>}
                {room.isSeptic && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded" style={{ background: colors.purpleMuted, color: colors.purple }}>SEPTICKÝ</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Operace/den', value: roomOps, color: colors.accent },
              { label: 'Využití', value: `${utilization}%`, color: colors.green },
              { label: 'Fronta', value: room.queueCount, color: room.queueCount > 0 ? colors.yellow : colors.textTertiary },
              { label: 'Status', value: statusLabels[room.status].split(' ')[0], color: statusColors[room.status] },
            ].map((stat) => (
              <div key={stat.label} className="stat-card p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: colors.textTertiary }}>{stat.label}</p>
                <p className="stat-metric text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
          
          {/* Current Procedure */}
          {room.currentProcedure && (
            <div className="stat-card p-5">
              <SectionHeader title="Probíhající výkon" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium mb-1" style={{ color: colors.text }}>{room.currentProcedure.name}</p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>{room.currentProcedure.surgeon}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: colors.accent }}>
                    {room.currentProcedure.estimatedDuration} min
                  </p>
                  <p className="text-xs" style={{ color: colors.textTertiary }}>odhadovaná délka</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: colors.textSecondary }}>Průběh</span>
                  <span style={{ color: colors.textTertiary }}>
                    Fáze {room.currentStepIndex + 1} / {workflowSteps.length}
                  </span>
                </div>
                <ProgressBar 
                  value={room.currentStepIndex + 1} 
                  max={workflowSteps.length} 
                  color={workflowSteps[room.currentStepIndex]?.color || colors.accent}
                />
              </div>
            </div>
          )}
          
          {/* Workflow Timeline */}
          <div className="stat-card p-5">
            <SectionHeader title="Workflow fáze" />
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {phaseData.map((phase, i) => (
                <motion.div
                  key={i}
                  className="h-full"
                  style={{ backgroundColor: phase.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(phase.duration / totalDuration) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  title={`${phase.fullName}: ${phase.duration} min`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {phaseData.map((phase, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: phase.color }} />
                    <span className="text-xs" style={{ color: colors.textSecondary }}>{phase.name}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: colors.text }}>{phase.duration}m</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Hourly Utilization Chart */}
          {hourlyData.length > 0 && (
            <div className="stat-card p-5">
              <SectionHeader title="Hodinové vytížení" />
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={statusColors[room.status]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={statusColors[room.status]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                    <XAxis dataKey="hour" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={statusColors[room.status]}
                      strokeWidth={2}
                      fill="url(#hourlyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STATISTICS MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  const WORKFLOW_STEPS = useMemo(() =>
    workflowStatuses.map(s => ({
      name: s.name,
      title: s.title || s.name,
      color: s.accent_color || s.color,
    })),
    [workflowStatuses]
  );
  
  const rooms = propRooms ?? [];
  const [period, setPeriod] = useState<Period>('7d');
  const [view, setView] = useState<View>('overview');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [dbStats, setDbStats] = useState<RoomStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load statistics from database
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const now = new Date();
      const periodMap: Record<Period, number> = {
        '24h': 1, '7d': 7, '30d': 30, '1y': 365
      };
      const fromDate = new Date(now.getTime() - periodMap[period] * 24 * 60 * 60 * 1000);
      const stats = await fetchRoomStatistics(fromDate, now);
      if (stats) setDbStats(stats);
      setIsLoading(false);
    };
    loadStats();
  }, [period]);
  
  // Computed values
  const totalRooms = rooms.length;
  const busyCount = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeCount = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleaningCount = rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const maintenanceCount = rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;
  const totalOperations = dbStats?.totalOperations || rooms.reduce((s, r) => s + r.operations24h, 0);
  const avgOperationDuration = dbStats?.averageOperationDuration || 0;
  const utilizationRate = dbStats?.utilizationRate || 0;
  const utilizationRateUPS = dbStats?.utilizationRateUPS || 0;
  const emergencyCount = dbStats?.emergencyCount || 0;
  const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);
  
  // Trend calculations (simulated - would come from comparing periods)
  const opsTrend = 5;
  const utilTrend = -2;
  
  // Chart data
  const utilizationByDay = useMemo(() => {
    const days = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
    return days.map(day => ({
      day,
      working: dbStats?.weekdayUtilization?.[day] || 0,
      ups: Math.max(0, (dbStats?.utilizationRateUPS || 0) - 10 + Math.random() * 20),
    }));
  }, [dbStats]);
  
  const operationsByRoom = useMemo(() => {
    return rooms.map(r => ({
      name: r.name.replace('Sál č. ', 'S'),
      fullName: r.name,
      operations: dbStats?.operationsByRoom?.[r.id] || r.operations24h,
      status: r.status,
    })).sort((a, b) => b.operations - a.operations);
  }, [rooms, dbStats]);
  
  const statusDistribution = [
    { name: 'Obsazeno', value: busyCount, color: colors.orange },
    { name: 'Volný', value: freeCount, color: colors.green },
    { name: 'Sanitace', value: cleaningCount, color: colors.blue },
    { name: 'Údržba', value: maintenanceCount, color: colors.textTertiary },
  ].filter(s => s.value > 0);
  
  const workflowDistribution = useMemo(() => 
    WORKFLOW_STEPS.map((step, i) => ({
      name: step.title.split(' ').pop() || step.title,
      fullName: step.title,
      duration: dbStats?.averageStepDurations?.[step.title] || STEP_DURATIONS[i],
      color: step.color,
      roomsInPhase: rooms.filter(r => r.currentStepIndex === i).length,
    })),
    [WORKFLOW_STEPS, dbStats, rooms]
  );
  
  // Navigation items
  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Přehled', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'utilization', label: 'Vytížení', icon: <Activity className="w-4 h-4" /> },
    { id: 'rooms', label: 'Sály', icon: <Building2 className="w-4 h-4" /> },
    { id: 'workflow', label: 'Workflow', icon: <Layers className="w-4 h-4" /> },
    { id: 'heatmap', label: 'Heatmapa', icon: <BarChart3 className="w-4 h-4" /> },
  ];
  
  const periodOptions: { id: Period; label: string }[] = [
    { id: '24h', label: '24h' },
    { id: '7d', label: '7 dní' },
    { id: '30d', label: '30 dní' },
    { id: '1y', label: '1 rok' },
  ];
  
  return (
    <div className="w-full min-h-screen pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: colors.accent }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: colors.accent }}>
            Analytics Dashboard
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: colors.text }}>
          Statistiky operačních sálů
        </h1>
        <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          Real-time metriky a analýzy výkonu operačních sálů
        </p>
      </div>
      
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`stat-tab flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${view === item.id ? 'active' : ''}`}
              style={{
                background: view === item.id ? colors.surfaceActive : 'transparent',
                color: view === item.id ? colors.text : colors.textSecondary,
              }}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: colors.textTertiary }} />
          <div className="flex items-center gap-1">
            {periodOptions.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`period-pill px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p.id ? 'active' : ''}`}
                style={{
                  background: period === p.id ? colors.accentMuted : 'transparent',
                  color: period === p.id ? colors.accent : colors.textSecondary,
                  border: `1px solid ${period === p.id ? colors.accent + '50' : colors.border}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card stat-loading h-32 rounded-xl" />
          ))}
        </div>
      )}
      
      {/* Content */}
      <AnimatePresence mode="wait">
        {!isLoading && (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* ════════════════════════════════════════════════════════════════════
                OVERVIEW VIEW
            ════════════════════════════════════════════════════════════════════ */}
            {view === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Celkem operací"
                    value={formatNumber(totalOperations)}
                    trend={opsTrend}
                    color={colors.accent}
                    icon={<Stethoscope className="w-4 h-4" />}
                    sparklineData={Object.values(dbStats?.operationsByDay || {}).slice(-7)}
                  />
                  <MetricCard
                    label="Využití (prac. doba)"
                    value={`${utilizationRate}%`}
                    trend={utilTrend}
                    color={colors.green}
                    icon={<Activity className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Využití (ÚPS)"
                    value={`${utilizationRateUPS}%`}
                    color={colors.orange}
                    icon={<Zap className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Průměrná délka"
                    value={formatDuration(avgOperationDuration)}
                    subValue="operace"
                    color={colors.blue}
                    icon={<Timer className="w-4 h-4" />}
                  />
                </div>
                
                {/* Status Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Obsazeno', value: busyCount, total: totalRooms, color: colors.orange },
                    { label: 'Volné', value: freeCount, total: totalRooms, color: colors.green },
                    { label: 'Ve frontě', value: totalQueue, color: colors.yellow, suffix: 'pacientů' },
                    { label: 'Urgentní', value: emergencyCount, color: colors.red, suffix: 'případů' },
                  ].map(stat => (
                    <div key={stat.label} className="stat-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                          {stat.label}
                        </span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      </div>
                      <p className="stat-metric text-2xl font-bold mb-1" style={{ color: stat.color }}>
                        {stat.value}
                        {stat.total && <span className="text-lg font-normal" style={{ color: colors.textTertiary }}> / {stat.total}</span>}
                      </p>
                      {stat.suffix && (
                        <p className="text-xs" style={{ color: colors.textTertiary }}>{stat.suffix}</p>
                      )}
                      {stat.total && (
                        <ProgressBar value={stat.value} max={stat.total} color={stat.color} />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Utilization by Day */}
                  <div className="stat-card p-5">
                    <SectionHeader title="Vytížení podle dne" />
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={utilizationByDay} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                          <XAxis dataKey="day" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip {...tooltipStyle} />
                          <Bar dataKey="working" name="Pracovní doba" fill={colors.green} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ups" name="ÚPS" fill={colors.orange} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-6 mt-4 justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.green }} />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>Pracovní doba</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.orange }} />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>ÚPS</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Distribution */}
                  <div className="stat-card p-5">
                    <SectionHeader title="Distribuce stavu sálů" />
                    <div className="flex items-center gap-8">
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={3}
                              strokeWidth={0}
                            >
                              {statusDistribution.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip {...tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-3">
                        {statusDistribution.map((status, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: status.color }} />
                              <span className="text-sm" style={{ color: colors.textSecondary }}>{status.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: colors.text }}>{status.value}</span>
                              <span className="text-xs" style={{ color: colors.textTertiary }}>
                                ({Math.round((status.value / totalRooms) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Operations by Room */}
                <div className="stat-card p-5">
                  <SectionHeader title="Operace podle sálu" />
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationsByRoom.slice(0, 12)} margin={{ top: 10, right: 10, bottom: 10, left: -20 }} layout="vertical">
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} width={40} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} operací`, 'Počet']} />
                        <Bar dataKey="operations" radius={[0, 4, 4, 0]}>
                          {operationsByRoom.slice(0, 12).map((entry, i) => (
                            <Cell key={i} fill={statusColors[entry.status]} opacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* ════════════════════════════════════════════════════════════════════
                UTILIZATION VIEW
            ════════════════════════════════════════════════════════════════════ */}
            {view === 'utilization' && (
              <div className="space-y-6">
                {/* Gauges */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="stat-card p-6 flex flex-col items-center">
                    <CircularGauge value={utilizationRate} label="Pracovní doba" color={colors.green} size={100} />
                  </div>
                  <div className="stat-card p-6 flex flex-col items-center">
                    <CircularGauge value={utilizationRateUPS} label="ÚPS" color={colors.orange} size={100} />
                  </div>
                  <div className="stat-card p-6 flex flex-col items-center">
                    <CircularGauge value={Math.round((busyCount / totalRooms) * 100)} label="Obsazenost" color={colors.blue} size={100} />
                  </div>
                  <div className="stat-card p-6 flex flex-col items-center">
                    <CircularGauge value={Math.round((freeCount / totalRooms) * 100)} label="Dostupnost" color={colors.accent} size={100} />
                  </div>
                </div>
                
                {/* Detailed Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="stat-card p-5">
                    <SectionHeader title="Pracovní doba" />
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>Využité minuty</span>
                          <span className="text-sm font-semibold" style={{ color: colors.green }}>
                            {formatNumber(Math.round(dbStats?.totalOperationMinutes || 0))}
                          </span>
                        </div>
                        <ProgressBar value={dbStats?.totalOperationMinutes || 0} max={dbStats?.totalAvailableMinutes || 1} color={colors.green} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>Dostupné minuty</span>
                          <span className="text-sm font-semibold" style={{ color: colors.textTertiary }}>
                            {formatNumber(Math.round(dbStats?.totalAvailableMinutes || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stat-card p-5">
                    <SectionHeader title="ÚPS (mimo pracovní dobu)" />
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>Využité minuty</span>
                          <span className="text-sm font-semibold" style={{ color: colors.orange }}>
                            {formatNumber(Math.round(dbStats?.totalOperationMinutesUPS || 0))}
                          </span>
                        </div>
                        <ProgressBar value={dbStats?.totalOperationMinutesUPS || 0} max={dbStats?.totalAvailableMinutesUPS || 1} color={colors.orange} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>Dostupné minuty</span>
                          <span className="text-sm font-semibold" style={{ color: colors.textTertiary }}>
                            {formatNumber(Math.round(dbStats?.totalAvailableMinutesUPS || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stat-card p-5">
                    <SectionHeader title="Peak vytížení" />
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border }}>
                        <span className="text-sm" style={{ color: colors.textSecondary }}>Maximum</span>
                        <div className="text-right">
                          <span className="text-lg font-bold" style={{ color: colors.red }}>{dbStats?.peakUtilization?.value || 0}%</span>
                          <p className="text-xs" style={{ color: colors.textTertiary }}>
                            {dbStats?.peakUtilization?.day} {dbStats?.peakUtilization?.hour}:00
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm" style={{ color: colors.textSecondary }}>Minimum</span>
                        <div className="text-right">
                          <span className="text-lg font-bold" style={{ color: colors.accent }}>{dbStats?.minUtilization?.value || 0}%</span>
                          <p className="text-xs" style={{ color: colors.textTertiary }}>
                            {dbStats?.minUtilization?.day} {dbStats?.minUtilization?.hour}:00
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hourly Chart */}
                <div className="stat-card p-5">
                  <SectionHeader title="Hodinové vytížení (průměr)" />
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dbStats?.hourlyUtilization || []} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                        <defs>
                          <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="hour" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} tickFormatter={h => `${h}:00`} />
                        <YAxis stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip {...tooltipStyle} labelFormatter={h => `${h}:00`} formatter={(v: number) => [`${v}%`, 'Využití']} />
                        <Area type="monotone" dataKey="utilization" stroke={colors.accent} strokeWidth={2} fill="url(#hourlyGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* ════════════════════════════════════════════════════════════════════
                ROOMS VIEW
            ════════════════════════════════════════════════════════════════════ */}
            {view === 'rooms' && (
              <div className="space-y-6">
                {/* Room Status Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Obsazeno', count: busyCount, color: colors.orange, bg: colors.orangeMuted },
                    { label: 'Volné', count: freeCount, color: colors.green, bg: colors.greenMuted },
                    { label: 'Sanitace', count: cleaningCount, color: colors.blue, bg: colors.blueMuted },
                    { label: 'Údržba', count: maintenanceCount, color: colors.textTertiary, bg: colors.surface },
                  ].map(status => (
                    <motion.div
                      key={status.label}
                      className="stat-card p-5"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ borderLeft: `3px solid ${status.color}` }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                        {status.label}
                      </p>
                      <p className="stat-metric text-4xl font-bold" style={{ color: status.color }}>{status.count}</p>
                      <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                        {Math.round((status.count / totalRooms) * 100)}% kapacity
                      </p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Rooms Grid */}
                <div>
                  <SectionHeader title="Všechny sály" action={
                    <span className="text-xs" style={{ color: colors.textTertiary }}>{totalRooms} sálů celkem</span>
                  } />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {rooms.map((room, i) => (
                      <motion.button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className="stat-card stat-card-glow p-4 text-left transition-all hover:scale-[1.02]"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{ borderTop: `2px solid ${statusColors[room.status]}` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: colors.text }}>{room.name}</p>
                            <p className="text-xs" style={{ color: colors.textTertiary }}>{room.department}</p>
                          </div>
                          <StatusDot status={room.status} />
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs" style={{ color: colors.textTertiary }}>Operací</p>
                            <p className="stat-metric text-xl font-bold" style={{ color: colors.accent }}>
                              {dbStats?.operationsByRoom?.[room.id] || room.operations24h}
                            </p>
                          </div>
                          {room.queueCount > 0 && (
                            <span className="text-xs px-2 py-1 rounded" style={{ background: colors.yellowMuted, color: colors.yellow }}>
                              {room.queueCount} ve frontě
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex gap-1">
                          {room.isEmergency && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: colors.redMuted, color: colors.red }}>AKUT</span>
                          )}
                          {room.isSeptic && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: colors.purpleMuted, color: colors.purple }}>SEPT</span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Comparison Chart */}
                <div className="stat-card p-5">
                  <SectionHeader title="Porovnání výkonu sálů" />
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationsByRoom} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} operací`, 'Počet']} />
                        <Bar dataKey="operations" radius={[4, 4, 0, 0]}>
                          {operationsByRoom.map((entry, i) => (
                            <Cell key={i} fill={statusColors[entry.status]} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* ════════════════════════════════════════════════════════════════════
                WORKFLOW VIEW
            ════════════════════════════════════════════════════════════════════ */}
            {view === 'workflow' && (
              <div className="space-y-6">
                {/* Workflow Distribution Bar */}
                <div className="stat-card p-5">
                  <SectionHeader title="Distribuce workflow fází" />
                  <div className="flex h-8 rounded-lg overflow-hidden gap-0.5 mb-4">
                    {workflowDistribution.map((phase, i) => {
                      const total = workflowDistribution.reduce((s, p) => s + p.duration, 0);
                      const pct = (phase.duration / total) * 100;
                      return (
                        <motion.div
                          key={i}
                          className="h-full relative group"
                          style={{ backgroundColor: phase.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          title={`${phase.fullName}: ${phase.duration} min (${Math.round(pct)}%)`}
                        >
                          {pct > 8 && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-black/70">
                              {Math.round(pct)}%
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {workflowDistribution.map((phase, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: phase.color }} />
                        <div>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>{phase.name}</p>
                          <p className="text-sm font-semibold" style={{ color: colors.text }}>{phase.duration}m</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Phase Duration Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="stat-card p-5">
                    <SectionHeader title="Průměrné trvání fází" />
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workflowDistribution} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} width={70} />
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} min`, 'Trvání']} />
                          <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
                            {workflowDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} opacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="stat-card p-5">
                    <SectionHeader title="Sály podle aktuální fáze" />
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workflowDistribution} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                          <XAxis dataKey="name" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} sálů`, 'Počet']} />
                          <Bar dataKey="roomsInPhase" radius={[4, 4, 0, 0]}>
                            {workflowDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} opacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Workflow Table */}
                <div className="stat-card p-5">
                  <SectionHeader title="Detaily workflow fází" />
                  <div className="overflow-x-auto stat-table-scroll">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Fáze</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Trvání</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>% cyklu</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Aktivní sály</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Podíl</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowDistribution.map((phase, i) => {
                          const total = workflowDistribution.reduce((s, p) => s + p.duration, 0);
                          const pct = Math.round((phase.duration / total) * 100);
                          return (
                            <tr key={i} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${colors.border}` }}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: phase.color }} />
                                  <span className="text-sm" style={{ color: colors.text }}>{phase.fullName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-medium" style={{ color: colors.text }}>{phase.duration} min</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-medium" style={{ color: phase.color }}>{pct}%</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-medium" style={{ color: colors.accent }}>{phase.roomsInPhase}</span>
                              </td>
                              <td className="py-3 px-4 w-32">
                                <ProgressBar value={pct} color={phase.color} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* ════════════════════════════════════════════════════════════════════
                HEATMAP VIEW
            ════════════════════════════════════════════════════════════════════ */}
            {view === 'heatmap' && (
              <div className="space-y-6">
                {/* Peak Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Peak vytížení"
                    value={`${dbStats?.peakUtilization?.value || 0}%`}
                    subValue={dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : '-'}
                    color={colors.red}
                    icon={<TrendingUp className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Minimum vytížení"
                    value={`${dbStats?.minUtilization?.value || 0}%`}
                    subValue={dbStats?.minUtilization ? `${dbStats.minUtilization.day} ${dbStats.minUtilization.hour}:00` : '-'}
                    color={colors.green}
                    icon={<TrendingDown className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Pracovní doba"
                    value={`${utilizationRate}%`}
                    subValue={`${Math.round((dbStats?.totalAvailableMinutes || 0) / 60)}h dostupných`}
                    color={colors.accent}
                  />
                  <MetricCard
                    label="ÚPS vytížení"
                    value={`${utilizationRateUPS}%`}
                    subValue={`${Math.round((dbStats?.totalAvailableMinutesUPS || 0) / 60)}h dostupných`}
                    color={colors.orange}
                  />
                </div>
                
                {/* Heatmap Grid */}
                <div className="stat-card p-5">
                  <SectionHeader 
                    title="Heatmapa vytížení" 
                    action={
                      <div className="flex items-center gap-2 text-xs" style={{ color: colors.textTertiary }}>
                        <span>Den × Hodina (%)</span>
                      </div>
                    }
                  />
                  
                  {dbStats?.heatmapData && dbStats.heatmapData.length > 0 ? (
                    <div className="overflow-x-auto stat-table-scroll">
                      <div className="inline-flex flex-col gap-1" style={{ minWidth: 600 }}>
                        {/* Hour labels */}
                        <div className="flex gap-1 pl-12">
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="w-6 text-center text-[10px] font-medium" style={{ color: colors.textTertiary }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        
                        {/* Heatmap rows */}
                        {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, di) => {
                          const isWorkingHours = dbStats?.heatmapWorkingHours?.[di] || Array(24).fill(true);
                          return (
                            <div key={di} className="flex items-center gap-1">
                              <span className="w-10 text-xs font-medium text-right pr-2" style={{ color: colors.textSecondary }}>
                                {day}
                              </span>
                              {(dbStats.heatmapData[di] || Array(24).fill(0)).map((value, hi) => {
                                const isWorking = isWorkingHours[hi];
                                return (
                                  <motion.div
                                    key={hi}
                                    className="heatmap-cell w-6 h-6 rounded cursor-pointer"
                                    style={{
                                      backgroundColor: getHeatColor(value),
                                      opacity: isWorking ? 1 : 0.4,
                                      border: !isWorking ? `1px dashed ${colors.textGhost}` : 'none',
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: isWorking ? 1 : 0.4 }}
                                    transition={{ duration: 0.2, delay: (di * 24 + hi) * 0.002 }}
                                    title={`${day} ${hi}:00 - ${value}%${!isWorking ? ' (ÚPS)' : ''}`}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48" style={{ color: colors.textTertiary }}>
                      Žádná data za vybrané období
                    </div>
                  )}
                  
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-6 mt-6 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      Legenda
                    </span>
                    {[
                      { color: colors.textGhost, label: '< 25%' },
                      { color: colors.green, label: '25-50%' },
                      { color: colors.yellow, label: '50-70%' },
                      { color: colors.orange, label: '70-90%' },
                      { color: colors.red, label: '> 90%' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>{item.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.textGhost, border: `1px dashed ${colors.textTertiary}` }} />
                      <span className="text-xs" style={{ color: colors.textSecondary }}>ÚPS</span>
                    </div>
                  </div>
                </div>
                
                {/* Weekly Summary */}
                <div className="stat-card p-5">
                  <SectionHeader title="Týdenní přehled vytížení" />
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={utilizationByDay} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                        <defs>
                          <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${Math.round(v)}%`, 'Využití']} />
                        <Area type="monotone" dataKey="working" stroke={colors.accent} strokeWidth={2} fill="url(#weeklyGrad)" name="Pracovní doba" />
                        <Line type="monotone" dataKey="ups" stroke={colors.orange} strokeWidth={2} dot={false} name="ÚPS" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Room Detail Panel */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            workflowSteps={WORKFLOW_STEPS}
            dbStats={dbStats}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatisticsModule;
