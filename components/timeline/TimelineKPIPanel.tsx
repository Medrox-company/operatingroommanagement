'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, Clock, TrendingUp, Users, BarChart3
} from 'lucide-react';
import { OperatingRoom } from '../../types';

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

interface TimelineKPIPanelProps {
  rooms: OperatingRoom[];
  currentTime: Date;
}

interface KPIMetric {
  icon: React.ElementType;
  label: string;
  value: number | string;
  unit?: string;
  accent: string;
  trend?: { value: number; positive: boolean };
}

export function TimelineKPIPanel({ rooms, currentTime }: TimelineKPIPanelProps) {
  const metrics = useMemo(() => {
    const activeRooms = rooms.filter(r => !r.isLocked && r.currentStepIndex > 0);
    const emergencyRooms = rooms.filter(r => r.isEmergency);
    const lockedRooms = rooms.filter(r => r.isLocked);
    const freeRooms = rooms.filter(r => !r.isLocked && r.currentStepIndex === 0);

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

    // Calculate emergency percentage
    const emergencyPct = rooms.length > 0
      ? Math.round((emergencyRooms.length / rooms.length) * 100)
      : 0;

    // Estimate overruns (operations longer than average)
    const avgExpectedDuration = 120; // Default expected duration
    const overruns = activeRooms.filter(r => {
      if (!r.operationStartedAt) return false;
      const start = new Date(r.operationStartedAt);
      const duration = (currentTime.getTime() - start.getTime()) / (1000 * 60);
      return duration > avgExpectedDuration;
    }).length;

    return [
      {
        icon: Activity,
        label: 'Aktivní operace',
        value: activeRooms.length,
        unit: `/ ${rooms.length}`,
        accent: C.green,
        trend: { value: 12, positive: true },
      } as KPIMetric,
      {
        icon: AlertTriangle,
        label: 'Stav nouze',
        value: emergencyRooms.length,
        unit: `(${emergencyPct}%)`,
        accent: emergencyRooms.length > 0 ? C.red : C.muted,
        trend: emergencyRooms.length > 0 ? { value: -5, positive: true } : undefined,
      } as KPIMetric,
      {
        icon: BarChart3,
        label: 'Využití',
        value: utilization,
        unit: '%',
        accent: utilization > 80 ? C.green : utilization > 50 ? C.yellow : C.orange,
        trend: { value: 8, positive: true },
      } as KPIMetric,
      {
        icon: Clock,
        label: 'Průměr. doba',
        value: avgDuration,
        unit: 'min',
        accent: avgDuration > 150 ? C.orange : C.accent,
      } as KPIMetric,
      {
        icon: TrendingUp,
        label: 'Překročení',
        value: overruns,
        unit: 'ks',
        accent: overruns > 0 ? C.orange : C.green,
      } as KPIMetric,
      {
        icon: Users,
        label: 'Volné sály',
        value: freeRooms.length,
        unit: 'sálů',
        accent: C.accent,
      } as KPIMetric,
    ];
  }, [rooms, currentTime]);

  return (
    <div className="fixed right-4 top-24 z-40 w-80 flex flex-col gap-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${C.accent}10 0%, ${C.accent}03 100%)`,
          border: `1px solid ${C.accent}20`,
        }}
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${C.accent}20`, border: `1px solid ${C.accent}30` }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: C.accent }} />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide" style={{ color: C.textHi }}>
            REALTIME METRIKY
          </p>
          <p className="text-[9px]" style={{ color: C.muted }}>
            {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>

      {/* Metrics cards */}
      <div className="flex flex-col gap-2">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative px-3 py-2.5 rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${metric.accent}08 0%, ${metric.accent}03 100%)`,
              border: `1px solid ${metric.accent}15`,
            }}
          >
            {/* Hover glow */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ 
                background: `radial-gradient(circle at center, ${metric.accent}10 0%, transparent 70%)` 
              }}
            />

            <div className="relative flex items-center justify-between gap-2">
              {/* Icon + Label */}
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${metric.accent}15`, border: `1px solid ${metric.accent}25` }}
                >
                  <metric.icon className="w-3.5 h-3.5" style={{ color: metric.accent }} />
                </div>
                <p className="text-[10px] font-medium truncate" style={{ color: C.muted }}>
                  {metric.label}
                </p>
              </div>

              {/* Value */}
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <p className="text-sm font-bold tabular-nums" style={{ color: metric.accent }}>
                  {metric.value}
                </p>
                {metric.unit && (
                  <span className="text-[9px] font-medium" style={{ color: C.muted }}>
                    {metric.unit}
                  </span>
                )}
              </div>
            </div>

            {/* Trend indicator */}
            {metric.trend && (
              <div className="mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" style={{ color: metric.trend.positive ? C.green : C.red }} />
                <span className="text-[9px] font-semibold" style={{ color: metric.trend.positive ? C.green : C.red }}>
                  {metric.trend.positive ? '+' : ''}{metric.trend.value}%
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[9px] px-3 py-2 rounded-lg text-center"
        style={{
          color: C.muted,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}
      >
        Aktualizace každých 5 sekund
      </motion.div>
    </div>
  );
}

export default TimelineKPIPanel;
