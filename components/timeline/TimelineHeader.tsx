'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Clock, TrendingUp, Users, Zap, Calendar,
  ChevronDown, RefreshCw, Maximize2, Download, Settings
} from 'lucide-react';
import { OperatingRoom } from '../../types';

// Design tokens
const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  yellow: '#FFE66D',
  border: 'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.03)',
  glass: 'rgba(255,255,255,0.04)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
  textHi: 'rgba(255,255,255,0.95)',
};

interface TimelineHeaderProps {
  rooms: OperatingRoom[];
  currentTime: Date;
  period: '12h' | '24h' | '7d';
  onPeriodChange: (period: '12h' | '24h' | '7d') => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  onExport: () => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

// KPI Card component
const KPICard = ({ 
  icon: Icon, 
  label, 
  value, 
  suffix = '', 
  trend,
  accent = C.accent,
  pulse = false
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: { value: number; positive: boolean };
  accent?: string;
  pulse?: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="relative flex items-center gap-3 px-4 py-3 rounded-xl overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${accent}08 0%, ${accent}03 100%)`,
      border: `1px solid ${accent}20`,
    }}
  >
    {/* Glow effect */}
    <div 
      className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
      style={{ 
        background: `radial-gradient(circle at center, ${accent}10 0%, transparent 70%)` 
      }}
    />
    
    {/* Icon */}
    <div 
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ 
        background: `${accent}15`,
        border: `1px solid ${accent}30`
      }}
    >
      <Icon className="w-5 h-5" style={{ color: accent }} />
    </div>
    
    {/* Content */}
    <div className="relative flex-1 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider truncate" style={{ color: C.muted }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <p className="text-xl font-bold tabular-nums" style={{ color: C.textHi }}>
          {value}
        </p>
        {suffix && (
          <span className="text-xs font-medium" style={{ color: C.muted }}>{suffix}</span>
        )}
        {trend && (
          <span 
            className="text-[10px] font-semibold ml-1"
            style={{ color: trend.positive ? C.green : C.red }}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

// Period selector
const PeriodSelector = ({ 
  value, 
  onChange 
}: { 
  value: '12h' | '24h' | '7d';
  onChange: (v: '12h' | '24h' | '7d') => void;
}) => {
  const options = [
    { value: '12h' as const, label: '12h' },
    { value: '24h' as const, label: '24h' },
    { value: '7d' as const, label: '7 dní' },
  ];

  return (
    <div 
      className="flex items-center rounded-lg p-1"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
          style={{
            color: value === opt.value ? C.textHi : C.muted,
            background: value === opt.value ? `${C.accent}15` : 'transparent',
          }}
        >
          {value === opt.value && (
            <motion.div
              layoutId="period-indicator"
              className="absolute inset-0 rounded-md"
              style={{ 
                background: `${C.accent}15`,
                border: `1px solid ${C.accent}30`
              }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

// Zoom control
const ZoomControl = ({ 
  value, 
  onChange 
}: { 
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.muted }}>
      Zoom
    </span>
    <input
      type="range"
      min={25}
      max={200}
      step={25}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 h-1 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, ${C.accent} 0%, ${C.accent} ${((value - 25) / 175) * 100}%, ${C.border} ${((value - 25) / 175) * 100}%, ${C.border} 100%)`,
      }}
    />
    <span className="text-xs font-semibold tabular-nums w-10" style={{ color: C.text }}>
      {value}%
    </span>
  </div>
);

// Action button
const ActionButton = ({ 
  icon: Icon, 
  onClick, 
  label,
  accent = C.accent
}: { 
  icon: React.ElementType;
  onClick: () => void;
  label: string;
  accent?: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
    style={{
      background: C.glass,
      border: `1px solid ${C.border}`,
    }}
    title={label}
  >
    <Icon className="w-4 h-4" style={{ color: accent }} />
    <span className="text-xs font-medium hidden lg:block" style={{ color: C.text }}>{label}</span>
  </motion.button>
);

export function TimelineHeader({
  rooms,
  currentTime,
  period,
  onPeriodChange,
  onRefresh,
  onFullscreen,
  onExport,
  zoomLevel,
  onZoomChange,
}: TimelineHeaderProps) {
  // Calculate KPIs from rooms data
  const stats = useMemo(() => {
    const activeRooms = rooms.filter(r => 
      !r.isLocked && 
      !r.isEmergency && 
      r.currentStepIndex > 0
    );
    const emergencyRooms = rooms.filter(r => r.isEmergency);
    const lockedRooms = rooms.filter(r => r.isLocked);
    const freeRooms = rooms.filter(r => 
      !r.isLocked && 
      !r.isEmergency && 
      r.currentStepIndex === 0
    );

    // Calculate average operation duration
    let totalDuration = 0;
    let opCount = 0;
    activeRooms.forEach(r => {
      if (r.operationStartedAt) {
        const start = new Date(r.operationStartedAt);
        const duration = (currentTime.getTime() - start.getTime()) / (1000 * 60);
        totalDuration += duration;
        opCount++;
      }
    });
    const avgDuration = opCount > 0 ? Math.round(totalDuration / opCount) : 0;

    // Calculate utilization
    const utilization = rooms.length > 0 
      ? Math.round((activeRooms.length / rooms.length) * 100) 
      : 0;

    return {
      activeCount: activeRooms.length,
      emergencyCount: emergencyRooms.length,
      freeCount: freeRooms.length,
      lockedCount: lockedRooms.length,
      avgDuration,
      utilization,
      totalRooms: rooms.length,
    };
  }, [rooms, currentTime]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Top row: Title + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${C.accent}20 0%, ${C.accent}05 100%)`,
              border: `1px solid ${C.accent}30`
            }}
          >
            <Calendar className="w-5 h-5" style={{ color: C.accent }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.textHi }}>
              Casova osa
            </h2>
            <p className="text-xs" style={{ color: C.muted }}>
              {currentTime.toLocaleDateString('cs-CZ', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ZoomControl value={zoomLevel} onChange={onZoomChange} />
          <div className="w-px h-6 mx-2" style={{ background: C.border }} />
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <div className="w-px h-6 mx-2" style={{ background: C.border }} />
          <ActionButton icon={RefreshCw} onClick={onRefresh} label="Obnovit" />
          <ActionButton icon={Maximize2} onClick={onFullscreen} label="Fullscreen" />
          <ActionButton icon={Download} onClick={onExport} label="Export" />
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard
          icon={Activity}
          label="Aktivni operace"
          value={stats.activeCount}
          accent={C.green}
          pulse={stats.activeCount > 0}
        />
        <KPICard
          icon={Zap}
          label="Stav nouze"
          value={stats.emergencyCount}
          accent={stats.emergencyCount > 0 ? C.red : C.muted}
          pulse={stats.emergencyCount > 0}
        />
        <KPICard
          icon={Clock}
          label="Prumerna doba"
          value={stats.avgDuration}
          suffix="min"
          accent={C.orange}
        />
        <KPICard
          icon={TrendingUp}
          label="Vytizenost"
          value={stats.utilization}
          suffix="%"
          accent={stats.utilization > 80 ? C.green : stats.utilization > 50 ? C.yellow : C.orange}
          trend={{ value: 5, positive: true }}
        />
        <KPICard
          icon={Users}
          label="Volne saly"
          value={stats.freeCount}
          suffix={`/ ${stats.totalRooms}`}
          accent={C.accent}
        />
        <KPICard
          icon={Settings}
          label="Uzamcene"
          value={stats.lockedCount}
          accent={C.yellow}
        />
      </div>
    </div>
  );
}

export default TimelineHeader;
