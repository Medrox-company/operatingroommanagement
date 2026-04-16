'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Calendar, Users,
  AlertTriangle, Shield, Clock, Layers, Zap, X, BarChart3,
  ChevronRight, Filter, Download, RefreshCw, ArrowUpRight,
  Timer, Target, Gauge, PieChart as PieChartIcon, Grid3X3,
  Play, Pause, CheckCircle2, Wrench, Sparkles, Eye,
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

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }

type Period = 'den' | 'tyden' | 'mesic' | 'rok';
type Tab = 'prehled' | 'vyuziti' | 'saly' | 'workflow' | 'heatmapa';

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM - Inspired by Vercel Observability Dashboard
// ══════════════════════════════════════════════════════════════════════════════
const colors = {
  // Core
  bg: '#000000',
  bgElevated: '#0a0a0a',
  bgCard: 'rgba(255,255,255,0.02)',
  bgCardHover: 'rgba(255,255,255,0.04)',
  
  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.1)',
  borderActive: 'rgba(255,255,255,0.15)',
  
  // Text
  text: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  textFaint: 'rgba(255,255,255,0.3)',
  textGhost: 'rgba(255,255,255,0.15)',
  
  // Accent - Cyan/Teal
  accent: '#14b8a6',
  accentMuted: 'rgba(20,184,166,0.15)',
  accentGlow: 'rgba(20,184,166,0.5)',
  
  // Status colors
  success: '#22c55e',
  successMuted: 'rgba(34,197,94,0.15)',
  warning: '#eab308',
  warningMuted: 'rgba(234,179,8,0.15)',
  orange: '#f97316',
  orangeMuted: 'rgba(249,115,22,0.15)',
  danger: '#ef4444',
  dangerMuted: 'rgba(239,68,68,0.15)',
  info: '#3b82f6',
  infoMuted: 'rgba(59,130,246,0.15)',
  purple: '#a855f7',
  purpleMuted: 'rgba(168,85,247,0.15)',
  
  // Chart palette
  chart: ['#14b8a6', '#22c55e', '#3b82f6', '#f97316', '#eab308', '#a855f7', '#ec4899'],
};

const DEPT_COLORS: Record<string, string> = {
  TRA: '#14b8a6', CHIR: '#f97316', ROBOT: '#a855f7',
  URO: '#ec4899', ORL: '#3b82f6', 'CEVNI': '#22c55e',
  'HPB + PLICNI': '#eab308', 'DETSKE': '#10b981', MAMMO: '#818cf8',
};

const DAYS = ['Po', 'Ut', 'St', 'Ct', 'Pa', 'So', 'Ne'];

// ══════════════════════════════════════════════════════════════════════════════
// TOOLTIP STYLING
// ══════════════════════════════════════════════════════════════════════════════
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(0,0,0,0.95)',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    fontSize: 12,
    padding: '10px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
  },
  labelStyle: { color: colors.textMuted, marginBottom: 6, fontWeight: 500 },
  itemStyle: { color: colors.text, padding: '2px 0' },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════
function statusColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return colors.orange;
  if (s === RoomStatus.FREE) return colors.success;
  if (s === RoomStatus.CLEANING) return colors.accent;
  return colors.textFaint;
}

function statusLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return 'Obsazeno';
  if (s === RoomStatus.FREE) return 'Volne';
  if (s === RoomStatus.CLEANING) return 'Uklid';
  return 'Udrzba';
}

function statusIcon(s: RoomStatus) {
  if (s === RoomStatus.BUSY) return <Play className="w-3 h-3" />;
  if (s === RoomStatus.FREE) return <CheckCircle2 className="w-3 h-3" />;
  if (s === RoomStatus.CLEANING) return <Sparkles className="w-3 h-3" />;
  return <Wrench className="w-3 h-3" />;
}

function heatColor(v: number): string {
  if (v >= 90) return 'rgba(239, 68, 68, 0.9)';
  if (v >= 70) return 'rgba(249, 115, 22, 0.8)';
  if (v >= 50) return 'rgba(234, 179, 8, 0.7)';
  if (v >= 25) return 'rgba(34, 197, 94, 0.6)';
  return 'rgba(255, 255, 255, 0.05)';
}

const UPS_DEPTS = ['EMERGENCY', 'CEVNI', 'ROBOT'];
function isUPS(r: OperatingRoom) { return r.isEmergency || UPS_DEPTS.includes(r.department); }
function dayMinutes(r: OperatingRoom) { return isUPS(r) ? 1440 : 720; }

type Seg = { color: string; title: string; pct: number; min: number };
type WorkflowStep = { name: string; title: string; color: string; organizer: string; status: string };

function buildDist(r: OperatingRoom, workflowSteps: WorkflowStep[]): Seg[] {
  const durs = workflowSteps.map((_, i) => i === 2 && r.currentProcedure ? r.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const tot = durs.reduce((s, d) => s + d, 0);
  return workflowSteps.map((step, i) => ({ color: step.color, title: step.title, pct: Math.round((durs[i] / tot) * 100), min: durs[i] }));
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Metric Card - Large KPI display
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  color?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  sparklineData?: number[];
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, value, subValue, change, changeLabel, color = colors.text, icon, size = 'md', sparklineData 
}) => (
  <motion.div 
    className="relative rounded-xl p-4 transition-all duration-200 group overflow-hidden"
    style={{ 
      background: colors.bgCard, 
      border: `1px solid ${colors.border}`,
    }}
    whileHover={{ borderColor: colors.borderHover }}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}>
    
    {/* Gradient glow on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: `radial-gradient(circle at 50% 0%, ${color}08 0%, transparent 70%)` }} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: colors.textMuted }}>
          {label}
        </span>
        {icon && <span style={{ color: colors.textFaint }}>{icon}</span>}
      </div>
      
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-bold tracking-tight leading-none ${
            size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl'
          }`} style={{ color }}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs mt-2 truncate" style={{ color: colors.textFaint }}>{subValue}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end shrink-0">
          {change !== undefined && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md`}
              style={{ 
                background: change > 0 ? colors.successMuted : change < 0 ? colors.dangerMuted : colors.bgCard,
                color: change > 0 ? colors.success : change < 0 ? colors.danger : colors.textMuted,
              }}>
              {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
          {changeLabel && (
            <span className="text-[9px] mt-1" style={{ color: colors.textGhost }}>{changeLabel}</span>
          )}
        </div>
      </div>
      
      {/* Mini sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData.map((v, i) => ({ i, v }))}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} fill={`url(#spark-${label})`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </motion.div>
);

// Section wrapper with header
const Section: React.FC<{ 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className = '' }) => (
  <div className={className}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: colors.text }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: colors.textFaint }}>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// Chart Card wrapper
const ChartCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  noPadding?: boolean;
}> = ({ children, className = '', noPadding = false }) => (
  <div className={`rounded-xl ${noPadding ? '' : 'p-5'} ${className}`}
    style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
    {children}
  </div>
);

// Empty state
const EmptyState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon || <BarChart3 className="w-12 h-12 mb-4" style={{ color: colors.textGhost }} />}
    <p className="text-sm" style={{ color: colors.textMuted }}>{message}</p>
  </div>
);

// Loading skeleton
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg ${className}`} style={{ background: colors.bgCardHover }} />
);

// Tab button
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative"
    style={{
      background: active ? colors.accentMuted : 'transparent',
      color: active ? colors.accent : colors.textMuted,
    }}>
    {icon}
    <span>{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
        style={{ background: colors.accent }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    )}
  </button>
);

// Period selector pill
const PeriodSelector: React.FC<{
  period: Period;
  onChange: (p: Period) => void;
}> = ({ period, onChange }) => (
  <div className="flex items-center p-1 rounded-lg" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
    {([
      { id: 'den', label: '24h' },
      { id: 'tyden', label: '7D' },
      { id: 'mesic', label: '30D' },
      { id: 'rok', label: '1R' },
    ] as { id: Period; label: string }[]).map(p => (
      <button
        key={p.id}
        onClick={() => onChange(p.id)}
        className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
        style={{
          background: period === p.id ? colors.accentMuted : 'transparent',
          color: period === p.id ? colors.accent : colors.textMuted,
        }}>
        {p.label}
      </button>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ROOM MINI CARD
// ══════════════════════════════════════════════════════════════════════════════
interface RoomMiniCardProps { 
  room: OperatingRoom; 
  index: number; 
  onClick: () => void; 
  workflowSteps: WorkflowStep[];
  dbStats?: RoomStatistics | null;
}

const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ room, index, onClick, workflowSteps, dbStats }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const utilPct = buildDist(room, workflowSteps).find(d => d.title === 'Chirurgicky vykon')?.pct ?? 0;
  const roomOps = dbStats?.operationsByRoom?.[room.id] || room.operations24h;
  
  return (
    <motion.button
      onClick={onClick}
      className="text-left rounded-xl p-4 w-full group relative overflow-hidden"
      style={{ 
        background: colors.bgCard, 
        border: `1px solid ${room.status === RoomStatus.BUSY ? `${sc}30` : colors.border}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      whileHover={{ scale: 1.02, borderColor: colors.borderActive }}>
      
      {/* Status glow */}
      {room.status === RoomStatus.BUSY && (
        <div className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 0%, ${sc} 0%, transparent 60%)` }} />
      )}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" 
              style={{ background: sc, boxShadow: room.status === RoomStatus.BUSY ? `0 0 8px ${sc}` : 'none' }} />
            <span className="text-sm font-semibold truncate" style={{ color: colors.text }}>{room.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {ups && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: colors.accentMuted, color: colors.accent }}>UPS</span>
            )}
            {room.isSeptic && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: colors.dangerMuted, color: colors.danger }}>SEP</span>
            )}
          </div>
        </div>
        
        {/* Department */}
        <p className="text-[10px] mb-3" style={{ color: colors.textFaint }}>{room.department}</p>
        
        {/* Status badge */}
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-md w-fit"
          style={{ background: `${sc}15` }}>
          {statusIcon(room.status)}
          <span className="text-[10px] font-semibold" style={{ color: sc }}>
            {statusLabel(room.status)}
          </span>
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div>
            <p className="text-[9px] uppercase" style={{ color: colors.textGhost }}>Vykony</p>
            <p className="text-sm font-bold" style={{ color: colors.accent }}>{roomOps}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase" style={{ color: colors.textGhost }}>Vyuziti</p>
            <p className="text-sm font-bold" style={{ color: colors.text }}>{utilPct}%</p>
          </div>
          <div>
            <p className="text-[9px] uppercase" style={{ color: colors.textGhost }}>Fronta</p>
            <p className="text-sm font-bold" style={{ color: room.queueCount > 0 ? colors.warning : colors.textFaint }}>
              {room.queueCount}
            </p>
          </div>
        </div>
        
        {/* View detail indicator */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
        </div>
      </div>
    </motion.button>
  );
});
RoomMiniCard.displayName = 'RoomMiniCard';

// ══════════════════════════════════════════════════════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
interface RoomDetailPanelProps {
  room: OperatingRoom;
  onClose: () => void;
  workflowSteps: WorkflowStep[];
  dbStats?: RoomStatistics | null;
}

const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, onClose, workflowSteps, dbStats }) => {
  const sc = statusColor(room.status);
  const ups = isUPS(room);
  const dist = useMemo(() => buildDist(room, workflowSteps), [room, workflowSteps]);
  const utilPct = dist.find(d => d.title === 'Chirurgicky vykon')?.pct ?? 0;
  const roomOps = dbStats?.operationsByRoom?.[room.id] || room.operations24h;

  // Hourly data for this room
  const hourlyData = useMemo(() => {
    const start = ups ? 0 : 7;
    const end = ups ? 24 : 19;
    if (dbStats?.hourlyUtilization) {
      return dbStats.hourlyUtilization
        .filter(h => h.hour >= start && h.hour < end)
        .map(h => ({ hour: `${h.hour}:00`, util: h.utilization, isWorking: h.isWorkingHour }));
    }
    return Array.from({ length: end - start }, (_, i) => ({ 
      hour: `${start + i}:00`, util: 0, isWorking: true 
    }));
  }, [ups, dbStats]);

  // 30-day cumulative
  const cumulData = useMemo(() => {
    if (dbStats?.operationsByDay) {
      const days = Object.entries(dbStats.operationsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14);
      let cum = 0;
      return days.map(([date, count], i) => {
        cum += count;
        const d = new Date(date);
        return { 
          d: `${d.getDate()}.${d.getMonth() + 1}`, 
          daily: count, 
          cum 
        };
      });
    }
    return [];
  }, [dbStats]);

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={onClose}>
      
      <motion.div 
        className="h-full overflow-y-auto hide-scrollbar w-full max-w-xl"
        style={{ background: colors.bg, borderLeft: `1px solid ${colors.border}` }}
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: 'rgba(0,0,0,0.95)', borderBottom: `1px solid ${colors.border}`, backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: sc, boxShadow: `0 0 12px ${sc}` }} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.text }}>{room.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: colors.textMuted }}>{room.department}</span>
                {ups && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" 
                  style={{ background: colors.accentMuted, color: colors.accent }}>UPS 24h</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-5 h-5" style={{ color: colors.textMuted }} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Vykony" value={roomOps} color={colors.accent} size="sm" />
            <MetricCard label="Vyuziti" value={`${utilPct}%`} color={colors.text} size="sm" />
            <MetricCard label="Provoz" value={ups ? '24h' : '12h'} color={ups ? colors.accent : colors.textMuted} size="sm" />
            <MetricCard label="Fronta" value={room.queueCount} 
              color={room.queueCount > 0 ? colors.warning : colors.textMuted} size="sm" />
          </div>
          
          {/* Current procedure */}
          {room.currentProcedure && (
            <ChartCard>
              <Section title="Aktualni vykon">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: colors.text }}>
                      {room.currentProcedure.name}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-md" style={{ background: colors.orangeMuted, color: colors.orange }}>
                      {room.currentProcedure.estimatedDuration} min
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: colors.bgCardHover }}>
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ background: colors.orange }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (room.currentProcedure.elapsedTime / room.currentProcedure.estimatedDuration) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: colors.textFaint }}>
                    <span>Uplynulo: {room.currentProcedure.elapsedTime} min</span>
                    <span>Zbýva: {Math.max(0, room.currentProcedure.estimatedDuration - room.currentProcedure.elapsedTime)} min</span>
                  </div>
                </div>
              </Section>
            </ChartCard>
          )}
          
          {/* Workflow distribution */}
          <ChartCard>
            <Section title="Rozlozeni workflow fazi">
              <div className="flex h-8 w-full rounded-lg overflow-hidden gap-0.5 mb-4">
                {dist.map((seg, i) => (
                  <motion.div 
                    key={i} 
                    className="h-full relative group"
                    style={{ background: seg.color }}
                    initial={{ width: 0 }} 
                    animate={{ width: `${seg.pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    title={`${seg.title}: ${seg.pct}%`}>
                    {seg.pct >= 15 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black/70">
                        {seg.pct}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dist.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded" style={{ background: seg.color }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>{seg.title}</span>
                    <span className="text-xs font-semibold ml-auto" style={{ color: seg.color }}>{seg.min}m</span>
                  </div>
                ))}
              </div>
            </Section>
          </ChartCard>
          
          {/* Hourly utilization */}
          <ChartCard>
            <Section title="Hodinove vyuziti" subtitle={ups ? '00:00-24:00' : '07:00-19:00'}>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={hourlyData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id={`roomGrad-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sc} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={sc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Vyuziti']} />
                  <Area type="monotone" dataKey="util" stroke={sc} fill={`url(#roomGrad-${room.id})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </ChartCard>
          
          {/* Operations trend */}
          {cumulData.length > 0 && (
            <ChartCard>
              <Section title="Trend operaci" subtitle="Poslednich 14 dni">
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart data={cumulData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                    <XAxis dataKey="d" stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="daily" fill={colors.accent} opacity={0.3} radius={[2, 2, 0, 0]} name="Denne" />
                    <Line type="monotone" dataKey="cum" stroke={colors.success} strokeWidth={2} dot={false} name="Kumulativne" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Section>
            </ChartCard>
          )}
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
  const [isLoading, setIsLoading] = useState(true);

  // Load statistics from database
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const now = new Date();
      let fromDate: Date;
      switch (period) {
        case 'den': fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case 'tyden': fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'mesic': fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case 'rok': fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      }
      const stats = await fetchRoomStatistics(fromDate, now);
      if (stats) setDbStats(stats);
      setIsLoading(false);
    };
    loadStats();
  }, [period]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  const busyCount = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeCount = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleanCount = rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const maintCount = rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;
  const upsCnt = rooms.filter(r => isUPS(r)).length;
  const septicCnt = rooms.filter(r => r.isSeptic).length;
  const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);
  
  const totalOps = dbStats?.totalOperations ?? rooms.reduce((s, r) => s + r.operations24h, 0);
  const avgUtil = dbStats?.utilizationRate ?? 0;
  const avgUtilUPS = dbStats?.utilizationRateUPS ?? 0;
  const peakUtil = dbStats?.peakUtilization?.value ?? 0;
  const minUtil = dbStats?.minUtilization?.value ?? 0;
  const emergencyCount = dbStats?.emergencyCount ?? 0;
  const avgOpDuration = dbStats?.averageOperationDuration ?? 0;
  const workingMinutes = dbStats?.totalOperationMinutes ?? 0;
  const upsMinutes = dbStats?.totalOperationMinutesUPS ?? 0;
  const availableWorkingMinutes = dbStats?.totalAvailableMinutes ?? 1;
  const availableUPSMinutes = dbStats?.totalAvailableMinutesUPS ?? 1;

  // Utilization chart data
  const utilChartData = useMemo(() => {
    if (!dbStats?.hourlyUtilization) {
      return Array.from({ length: 12 }, (_, i) => ({ t: `${7 + i}h`, v: 0 }));
    }
    if (period === 'den') {
      return dbStats.hourlyUtilization
        .filter(h => h.hour >= 7 && h.hour < 19)
        .map(h => ({ t: `${h.hour}h`, v: h.utilization, isWorking: h.isWorkingHour }));
    }
    if (period === 'tyden') {
      return DAYS.map(t => ({ t, v: dbStats.weekdayUtilization?.[t] || 0 }));
    }
    const days = Object.entries(dbStats.operationsByDay || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);
    if (days.length === 0) return [];
    const maxOps = Math.max(...days.map(([, c]) => c), 1);
    return days.map(([date, count]) => {
      const d = new Date(date);
      return { t: `${d.getDate()}`, v: Math.round((count / maxOps) * 100) };
    });
  }, [period, dbStats]);

  // Operations trend
  const opsTrend = useMemo(() => {
    if (dbStats?.operationsByDay) {
      const days = Object.entries(dbStats.operationsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7);
      return days.map(([date, count]) => ({ 
        t: new Date(date).toLocaleDateString('cs', { weekday: 'short' }), 
        v: count 
      }));
    }
    return DAYS.map(t => ({ t, v: 0 }));
  }, [dbStats]);

  // Status distribution
  const statusData = [
    { name: 'Obsazeno', value: busyCount, color: colors.orange },
    { name: 'Volne', value: freeCount, color: colors.success },
    { name: 'Uklid', value: cleanCount, color: colors.accent },
    { name: 'Udrzba', value: maintCount, color: colors.textFaint },
  ].filter(s => s.value > 0);

  // Department breakdown
  const deptData = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department] || 0) + (dbStats?.operationsByRoom?.[r.id] || r.operations24h); });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([dept, count]) => ({ dept, count, color: DEPT_COLORS[dept] || colors.accent }));
  }, [rooms, dbStats]);

  // Workflow aggregate
  const workflowAgg = useMemo(() => {
    const totals: Record<string, { color: string; title: string; pct: number; min: number }> = {};
    rooms.forEach(r => {
      const d = buildDist(r, WORKFLOW_STEPS);
      d.forEach(seg => {
        if (!totals[seg.title]) totals[seg.title] = { ...seg, pct: 0, min: 0 };
        totals[seg.title].pct += seg.pct;
        totals[seg.title].min += seg.min;
      });
    });
    const arr = Object.values(totals);
    const tP = arr.reduce((s, x) => s + x.pct, 0);
    return arr.map(x => ({ 
      ...x, 
      pct: Math.round((x.pct / tP) * 100), 
      min: dbStats?.averageStepDurations?.[x.title] ?? Math.round(x.min / rooms.length) 
    }));
  }, [rooms, WORKFLOW_STEPS, dbStats]);

  // Room bar chart data
  const roomChartData = rooms.map(r => ({
    name: r.name.replace('Sal ', '').replace('Sál ', ''),
    ops: dbStats?.operationsByRoom?.[r.id] || r.operations24h,
    util: buildDist(r, WORKFLOW_STEPS).find(d => d.title === 'Chirurgicky vykon')?.pct ?? 0,
    color: DEPT_COLORS[r.department] ?? colors.accent,
  }));

  // Stacked workflow data
  const stackedWorkflowData = rooms.map(r => {
    const d = buildDist(r, WORKFLOW_STEPS);
    const base: Record<string, string | number> = { name: r.name.replace('Sal ', '').replace('Sál ', '') };
    WORKFLOW_STEPS.forEach(step => {
      base[step.title] = d.find(x => x.title === step.title)?.pct ?? 0;
    });
    return base;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full min-h-screen" style={{ background: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-4" 
        style={{ background: 'rgba(0,0,0,0.9)', borderBottom: `1px solid ${colors.border}`, backdropFilter: 'blur(12px)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: colors.text }}>Statistiky</h1>
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Analyza vykonnosti operacnich salu a workflow procesu
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <PeriodSelector period={period} onChange={setPeriod} />
            
            <button className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ border: `1px solid ${colors.border}`, color: colors.textMuted }}
              onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto hide-scrollbar">
          <TabButton active={tab === 'prehled'} onClick={() => setTab('prehled')} 
            icon={<Grid3X3 className="w-4 h-4" />} label="Prehled" />
          <TabButton active={tab === 'vyuziti'} onClick={() => setTab('vyuziti')} 
            icon={<Gauge className="w-4 h-4" />} label="Vyuziti" />
          <TabButton active={tab === 'saly'} onClick={() => setTab('saly')} 
            icon={<Layers className="w-4 h-4" />} label="Saly" />
          <TabButton active={tab === 'workflow'} onClick={() => setTab('workflow')} 
            icon={<Activity className="w-4 h-4" />} label="Workflow" />
          <TabButton active={tab === 'heatmapa'} onClick={() => setTab('heatmapa')} 
            icon={<Clock className="w-4 h-4" />} label="Heatmapa" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB: PREHLED */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 'prehled' && (
            <motion.div key="prehled" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Primary metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <MetricCard label="Celkem operaci" value={totalOps} color={colors.accent} size="lg"
                  icon={<Activity className="w-4 h-4" />} 
                  sparklineData={opsTrend.map(o => o.v)} />
                <MetricCard label="Vyuziti (prac.)" value={`${avgUtil}%`} color={colors.success}
                  subValue={`${formatDuration(Math.round(workingMinutes))} z ${formatDuration(Math.round(availableWorkingMinutes))}`} />
                <MetricCard label="Vyuziti (UPS)" value={`${avgUtilUPS}%`} color={colors.warning}
                  subValue={`${formatDuration(Math.round(upsMinutes))} mimo prac. dobu`} />
                <MetricCard label="Peak vyuziti" value={`${peakUtil}%`} 
                  color={peakUtil > 90 ? colors.danger : peakUtil > 70 ? colors.orange : colors.success}
                  subValue={dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : '-'} />
                <MetricCard label="Prum. operace" value={formatDuration(avgOpDuration)} color={colors.info}
                  icon={<Timer className="w-4 h-4" />} />
                <MetricCard label="Emergency" value={emergencyCount} 
                  color={emergencyCount > 0 ? colors.danger : colors.textMuted}
                  icon={<AlertTriangle className="w-4 h-4" />} />
              </div>
              
              {/* Status overview cards */}
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: 'Salu', value: rooms.length, color: colors.text, icon: <Layers className="w-3.5 h-3.5" /> },
                  { label: 'Obsazeno', value: busyCount, color: colors.orange, icon: <Play className="w-3.5 h-3.5" /> },
                  { label: 'Volno', value: freeCount, color: colors.success, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  { label: 'Uklid', value: cleanCount, color: colors.accent, icon: <Sparkles className="w-3.5 h-3.5" /> },
                  { label: 'Udrzba', value: maintCount, color: colors.textFaint, icon: <Wrench className="w-3.5 h-3.5" /> },
                  { label: 'UPS', value: upsCnt, color: colors.info, icon: <Zap className="w-3.5 h-3.5" /> },
                  { label: 'Septicke', value: septicCnt, color: colors.danger, icon: <Shield className="w-3.5 h-3.5" /> },
                  { label: 'Fronta', value: totalQueue, color: totalQueue > 0 ? colors.warning : colors.textMuted, icon: <Users className="w-3.5 h-3.5" /> },
                ].map((item, i) => (
                  <motion.div key={item.label} 
                    className="rounded-lg p-3 text-center"
                    style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}>
                    <div className="flex items-center justify-center mb-2" style={{ color: item.color }}>
                      {item.icon}
                    </div>
                    <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: colors.textFaint }}>{item.label}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Utilization trend */}
                <ChartCard className="lg:col-span-2">
                  <Section title="Trend vyuziti" subtitle={`Za obdobi: ${
                    period === 'den' ? '24 hodin' : period === 'tyden' ? '7 dni' : period === 'mesic' ? '30 dni' : '1 rok'
                  }`}>
                    {isLoading ? <Skeleton className="h-52" /> : utilChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={utilChartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                          <defs>
                            <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                          <XAxis dataKey="t" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} 
                            domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Vyuziti']} />
                          <Area type="monotone" dataKey="v" stroke={colors.accent} fill="url(#utilGradient)" 
                            strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="Zadna data" />}
                  </Section>
                </ChartCard>
                
                {/* Status pie */}
                <ChartCard>
                  <Section title="Stav salu">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} strokeWidth={0}>
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v} salu`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {statusData.map(s => (
                        <div key={s.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-[10px]" style={{ color: colors.textMuted }}>{s.name}</span>
                          <span className="text-xs font-bold ml-auto" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                </ChartCard>
              </div>
              
              {/* Secondary row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Operations by room */}
                <ChartCard>
                  <Section title="Vykony podle salu">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={roomChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={12}>
                        <XAxis dataKey="name" stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Vykonu']} />
                        <Bar dataKey="ops" radius={[4, 4, 0, 0]}>
                          {roomChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Section>
                </ChartCard>
                
                {/* Department breakdown */}
                <ChartCard>
                  <Section title="Vykony podle oddeleni">
                    <div className="space-y-3">
                      {deptData.map((item, i) => (
                        <div key={item.dept}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded" style={{ background: item.color }} />
                              <span className="text-xs" style={{ color: colors.textMuted }}>{item.dept}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: colors.text }}>{item.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: colors.bgCardHover }}>
                            <motion.div className="h-full rounded-full" style={{ background: item.color }}
                              initial={{ width: 0 }} animate={{ width: `${(item.count / deptData[0].count) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </ChartCard>
                
                {/* 7-day trend */}
                <ChartCard>
                  <Section title="Trend operaci (7 dni)">
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={opsTrend} margin={{ top: 8, right: 0, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="t" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Operaci']} />
                        <Bar dataKey="v" fill={colors.accent} opacity={0.2} radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="v" stroke={colors.success} strokeWidth={2} 
                          dot={{ fill: colors.success, r: 3, strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Section>
                </ChartCard>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB: VYUZITI */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 'vyuziti' && (
            <motion.div key="vyuziti" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Utilization metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Pracovni doba" value={`${avgUtil}%`} color={colors.success} size="lg"
                  subValue={`${formatDuration(Math.round(workingMinutes))} vyuzito`}
                  icon={<Target className="w-4 h-4" />} />
                <MetricCard label="Mimo pracovni dobu (UPS)" value={`${avgUtilUPS}%`} color={colors.warning} size="lg"
                  subValue={`${formatDuration(Math.round(upsMinutes))} vyuzito`}
                  icon={<Zap className="w-4 h-4" />} />
                <MetricCard label="Peak vyuziti" value={`${peakUtil}%`} 
                  color={peakUtil > 90 ? colors.danger : colors.orange} size="lg"
                  subValue={dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : '-'} />
                <MetricCard label="Min vyuziti" value={`${minUtil}%`} color={colors.info} size="lg"
                  subValue={dbStats?.minUtilization ? `${dbStats.minUtilization.day} ${dbStats.minUtilization.hour}:00` : '-'} />
              </div>
              
              {/* Capacity gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard>
                  <Section title="Kapacita - pracovni doba" subtitle="Celkovy cas vyuzity vs. dostupny">
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: colors.textMuted }}>Vyuzito</span>
                          <span className="text-sm font-bold" style={{ color: colors.success }}>
                            {formatDuration(Math.round(workingMinutes))}
                          </span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: colors.bgCardHover }}>
                          <motion.div className="h-full rounded-full" style={{ background: colors.success }}
                            initial={{ width: 0 }} animate={{ width: `${avgUtil}%` }}
                            transition={{ duration: 0.8 }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px]" style={{ color: colors.textGhost }}>0%</span>
                          <span className="text-[10px]" style={{ color: colors.textGhost }}>100%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-bold" style={{ color: colors.success }}>{avgUtil}%</p>
                        <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: colors.textFaint }}>
                          Vyuziti
                        </p>
                      </div>
                    </div>
                  </Section>
                </ChartCard>
                
                <ChartCard>
                  <Section title="Kapacita - UPS (mimo prac. dobu)" subtitle="Vyuziti v dobe pohotovosti">
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: colors.textMuted }}>Vyuzito</span>
                          <span className="text-sm font-bold" style={{ color: colors.warning }}>
                            {formatDuration(Math.round(upsMinutes))}
                          </span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: colors.bgCardHover }}>
                          <motion.div className="h-full rounded-full" style={{ background: colors.warning }}
                            initial={{ width: 0 }} animate={{ width: `${avgUtilUPS}%` }}
                            transition={{ duration: 0.8 }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px]" style={{ color: colors.textGhost }}>0%</span>
                          <span className="text-[10px]" style={{ color: colors.textGhost }}>100%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-bold" style={{ color: colors.warning }}>{avgUtilUPS}%</p>
                        <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: colors.textFaint }}>
                          Vyuziti
                        </p>
                      </div>
                    </div>
                  </Section>
                </ChartCard>
              </div>
              
              {/* Weekly breakdown */}
              <ChartCard>
                <Section title="Vyuziti podle dne v tydnu" subtitle="Porovnani pracovnich dnu a vikendu">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart 
                      data={DAYS.map(t => ({ 
                        t, 
                        v: dbStats?.weekdayUtilization?.[t] || 0,
                        isWeekend: t === 'So' || t === 'Ne'
                      }))} 
                      margin={{ top: 8, right: 8, bottom: 0, left: -16 }} 
                      barSize={36}>
                      <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                      <XAxis dataKey="t" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} 
                        domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Vyuziti']} />
                      <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                        {DAYS.map((d, i) => (
                          <Cell key={i} 
                            fill={(d === 'So' || d === 'Ne') ? colors.purple : colors.accent} 
                            opacity={(d === 'So' || d === 'Ne') ? 0.6 : 0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: colors.accent }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>Pracovni dny</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: colors.purple, opacity: 0.6 }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>Vikend</span>
                    </div>
                  </div>
                </Section>
              </ChartCard>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB: SALY */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 'saly' && (
            <motion.div key="saly" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Status cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Obsazeno" value={busyCount} color={colors.orange}
                  subValue={`${Math.round((busyCount / Math.max(1, rooms.length)) * 100)}% kapacity`}
                  icon={<Play className="w-4 h-4" />} />
                <MetricCard label="Volno" value={freeCount} color={colors.success}
                  subValue={`${Math.round((freeCount / Math.max(1, rooms.length)) * 100)}% kapacity`}
                  icon={<CheckCircle2 className="w-4 h-4" />} />
                <MetricCard label="V uklidu" value={cleanCount} color={colors.accent}
                  subValue="V procesu sanitace"
                  icon={<Sparkles className="w-4 h-4" />} />
                <MetricCard label="Udrzba" value={maintCount} color={colors.textFaint}
                  subValue="Mimo provoz"
                  icon={<Wrench className="w-4 h-4" />} />
              </div>
              
              {/* Stacked workflow chart */}
              <ChartCard>
                <Section title="Workflow faze podle salu" subtitle="Procentualni rozlozeni casu jednotlivych fazi">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stackedWorkflowData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barSize={32}>
                      <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} 
                        tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip {...tooltipStyle} />
                      {WORKFLOW_STEPS.map(step => (
                        <Bar key={step.title} dataKey={step.title} stackId="stack" fill={step.color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    {WORKFLOW_STEPS.map(s => (
                      <div key={s.title} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: s.color }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </ChartCard>
              
              {/* Room cards grid */}
              <Section title="Prehled salu" subtitle="Kliknutim zobrazite detail">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {rooms.map((r, i) => (
                    <RoomMiniCard key={r.id} room={r} index={i} onClick={() => setSelectedRoom(r)} 
                      workflowSteps={WORKFLOW_STEPS} dbStats={dbStats} />
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB: WORKFLOW */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 'workflow' && (
            <motion.div key="workflow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Workflow timeline */}
              <ChartCard>
                <Section title="Prumerne rozlozeni workflow fazi" subtitle="Casovy podil jednotlivych kroku operacniho cyklu">
                  <div className="flex h-12 w-full rounded-xl overflow-hidden gap-1 mb-6">
                    {workflowAgg.map((seg, i) => (
                      <motion.div key={i} className="h-full relative group cursor-pointer"
                        style={{ background: seg.color }}
                        initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        title={`${seg.title}: ${seg.pct}%`}>
                        {seg.pct >= 10 && (
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black/80">
                            {seg.pct}%
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {workflowAgg.map((seg, i) => (
                      <div key={i} className="p-3 rounded-lg" style={{ background: colors.bgCardHover }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded" style={{ background: seg.color }} />
                          <span className="text-xs font-medium truncate" style={{ color: colors.text }}>{seg.title}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold" style={{ color: seg.color }}>{seg.pct}%</span>
                          <span className="text-xs" style={{ color: colors.textFaint }}>~{seg.min}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </ChartCard>
              
              {/* Phase charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard>
                  <Section title="Prumerne trvani fazi" subtitle="Minuty (z databaze)">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart 
                        data={WORKFLOW_STEPS.map((step, i) => ({
                          name: step.title.split(' ').slice(-1)[0],
                          fullName: step.title,
                          min: dbStats?.averageStepDurations?.[step.title] ?? STEP_DURATIONS[i],
                          color: step.color,
                        }))} 
                        layout="vertical" 
                        margin={{ top: 0, right: 30, bottom: 0, left: 10 }} 
                        barSize={16}>
                        <XAxis type="number" stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke={colors.textGhost} fontSize={10} 
                          tickLine={false} axisLine={false} width={70} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} min`, 'Trvani']} />
                        <Bar dataKey="min" radius={[0, 6, 6, 0]}>
                          {WORKFLOW_STEPS.map((_, i) => <Cell key={i} fill={WORKFLOW_STEPS[i].color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Section>
                </ChartCard>
                
                <ChartCard>
                  <Section title="Distribuce fazi" subtitle="Procenta z celkoveho cyklu">
                    <div className="space-y-4">
                      {workflowAgg.map((seg, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded" style={{ background: seg.color }} />
                              <span className="text-xs" style={{ color: colors.textMuted }}>{seg.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: colors.textFaint }}>{seg.min} min</span>
                              <span className="text-sm font-bold w-12 text-right" style={{ color: seg.color }}>{seg.pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: colors.bgCardHover }}>
                            <motion.div className="h-full rounded-full" style={{ background: seg.color }}
                              initial={{ width: 0 }} animate={{ width: `${seg.pct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.08 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </ChartCard>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB: HEATMAPA */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {tab === 'heatmapa' && (
            <motion.div key="heatmapa" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Peak metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Nejvy. vyuziti (prac.)" value={`${peakUtil}%`} color={colors.danger}
                  subValue={dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : '-'}
                  icon={<TrendingUp className="w-4 h-4" />} />
                <MetricCard label="Vyuziti prac. doba" value={`${avgUtil}%`} color={colors.success}
                  subValue={`${formatDuration(Math.round(availableWorkingMinutes))} dostupnych`} />
                <MetricCard label="Vyuziti UPS" value={`${avgUtilUPS}%`} color={colors.warning}
                  subValue={`${formatDuration(Math.round(availableUPSMinutes))} dostupnych`} />
                <MetricCard label="Nejn. vyuziti (prac.)" value={`${minUtil}%`} color={colors.info}
                  subValue={dbStats?.minUtilization ? `${dbStats.minUtilization.day} ${dbStats.minUtilization.hour}:00` : '-'}
                  icon={<TrendingDown className="w-4 h-4" />} />
              </div>
              
              {/* Heatmap */}
              <ChartCard>
                <Section title="Heatmapa vyuziti" subtitle="Den v tydnu vs. hodina - plne = prac. doba, carkova ramecky = UPS">
                  {dbStats?.heatmapData && dbStats.heatmapData.length > 0 ? (
                    <div className="overflow-x-auto pb-2">
                      <div className="inline-flex flex-col gap-1.5" style={{ minWidth: 700 }}>
                        {/* Hour labels */}
                        <div className="flex gap-1 pl-12">
                          {Array.from({ length: 24 }, (_, h) => (
                            <div key={h} className="w-6 text-center text-[9px] font-medium" style={{ color: colors.textFaint }}>
                              {h}
                            </div>
                          ))}
                        </div>
                        {/* Days */}
                        {DAYS.map((day, di) => {
                          const workingHours = dbStats.heatmapWorkingHours?.[di] || Array(24).fill(true);
                          return (
                            <div key={di} className="flex items-center gap-1">
                              <span className="w-10 text-xs font-semibold text-right pr-2" style={{ color: colors.textMuted }}>
                                {day}
                              </span>
                              {(dbStats.heatmapData[di] || Array(24).fill(0)).map((v, hi) => {
                                const isWorking = workingHours[hi];
                                return (
                                  <motion.div key={hi} 
                                    className="w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-110"
                                    style={{
                                      background: heatColor(v),
                                      border: isWorking ? 'none' : `1px dashed ${colors.textGhost}`,
                                      opacity: isWorking ? 1 : 0.5,
                                    }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: isWorking ? 1 : 0.5, scale: 1 }}
                                    transition={{ duration: 0.15, delay: (di * 24 + hi) * 0.002 }}
                                    title={`${day} ${hi}:00 - ${v}% ${isWorking ? '(prac.)' : '(UPS)'}`} />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message={isLoading ? 'Nacitani dat...' : 'Zadna data za vybrane obdobi'} />
                  )}
                  
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-6 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                      Legenda
                    </span>
                    {[
                      { c: 'rgba(255,255,255,0.05)', l: '< 25%' },
                      { c: 'rgba(34,197,94,0.6)', l: '25-50%' },
                      { c: 'rgba(234,179,8,0.7)', l: '50-70%' },
                      { c: 'rgba(249,115,22,0.8)', l: '70-90%' },
                      { c: 'rgba(239,68,68,0.9)', l: '> 90%' },
                    ].map(l => (
                      <div key={l.l} className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-md" style={{ background: l.c }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>{l.l}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 ml-4">
                      <div className="w-4 h-4 rounded-md" 
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px dashed ${colors.textGhost}` }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>= UPS</span>
                    </div>
                  </div>
                </Section>
              </ChartCard>
              
              {/* Hourly charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard>
                  <Section title="Hodinove vyuziti - pracovni dny vs vikend">
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart
                        data={Array.from({ length: 24 }, (_, h) => {
                          const heatmap = dbStats?.heatmapData || [];
                          const pracDays = heatmap.slice(0, 5);
                          const vikendDays = heatmap.slice(5);
                          return {
                            h: `${h}`,
                            prac: pracDays.length > 0 ? Math.round(pracDays.reduce((s, d) => s + (d[h] || 0), 0) / pracDays.length) : 0,
                            vikend: vikendDays.length > 0 ? Math.round(vikendDays.reduce((s, d) => s + (d[h] || 0), 0) / vikendDays.length) : 0,
                          };
                        })}
                        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <defs>
                          <linearGradient id="pracGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="vikendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.purple} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={colors.purple} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="h" stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={9} tickLine={false} axisLine={false} 
                          domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip {...tooltipStyle} 
                          formatter={(v: number, name: string) => [`${v}%`, name === 'prac' ? 'Prac. dny' : 'Vikend']} />
                        <Area type="monotone" dataKey="prac" stroke={colors.accent} fill="url(#pracGrad)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="vikend" stroke={colors.purple} fill="url(#vikendGrad)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-6 mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 rounded-full" style={{ background: colors.accent }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Pracovni dny</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 rounded-full" style={{ background: colors.purple }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Vikend</span>
                      </div>
                    </div>
                  </Section>
                </ChartCard>
                
                <ChartCard>
                  <Section title="Prumer vs Peak podle dne">
                    <ResponsiveContainer width="100%" height={180}>
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
                        margin={{ top: 8, right: 8, bottom: 0, left: -16 }} 
                        barSize={20}>
                        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke={colors.textGhost} fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke={colors.textGhost} fontSize={10} tickLine={false} axisLine={false} 
                          tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip {...tooltipStyle} 
                          formatter={(v: number, name: string) => [`${v}%`, name === 'avg' ? 'Prumer' : 'Peak']} />
                        <Bar dataKey="avg" fill={colors.accent} opacity={0.5} radius={[4, 4, 0, 0]} name="avg" />
                        <Bar dataKey="peak" fill={colors.orange} opacity={0.8} radius={[4, 4, 0, 0]} name="peak" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-6 mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: colors.accent, opacity: 0.5 }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Prumerne vyuziti</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: colors.orange }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Peak vyuziti</span>
                      </div>
                    </div>
                  </Section>
                </ChartCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
