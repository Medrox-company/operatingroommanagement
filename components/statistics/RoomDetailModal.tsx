'use client';
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Clock, DollarSign, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import { C, Card, KPIBlock, ProgressRing, Sparkline, formatPercent, formatMinutes, formatNumber } from './shared';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: OperatingRoom | null;
  statusHistory: StatusHistoryRow[];
  utilizationData?: Record<string, number>;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  isOpen,
  onClose,
  room,
  statusHistory,
  utilizationData = {},
}) => {
  if (!room) return null;

  // Compute detailed metrics for this room from statusHistory
  const metrics = useMemo(() => {
    const roomHistory = statusHistory.filter(h => h.operating_room_id === room.id);
    
    // Utilization percentage
    const inUse = roomHistory.filter(h => h.event_type === 'in_use' || h.event_type === 'started').length;
    const utilization = roomHistory.length > 0 ? (inUse / roomHistory.length) * 100 : 0;
    
    // Average operation duration
    const durations = roomHistory
      .filter(h => h.duration_seconds && h.duration_seconds > 0)
      .map(h => h.duration_seconds!);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    // Operations count
    const operations = roomHistory.filter(h => h.event_type === 'started').length;
    
    // Cost calculation (example: Kč per minute)
    const costPerHour = room.hourlyOperatingCost ?? 100;
    const costPerMin = costPerHour / 60;
    const totalCost = (avgDuration * operations * costPerMin);
    
    // Septic operations - počítáme z operací které mají septic v názvu
    const septicOps = roomHistory.filter(h => h.event_type?.includes('septic')).length;
    const septicPct = operations > 0 ? (septicOps / operations) * 100 : 0;
    
    // Peak hour
    const hourCounts = new Map<number, number>();
    roomHistory.forEach(h => {
      const hour = new Date(h.created_at).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    });
    const peakHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    
    // Trend (last 7 hours)
    const trend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const hourTime = new Date();
      hourTime.setHours(hourTime.getHours() - i);
      const hour = hourTime.getHours();
      trend.push(hourCounts.get(hour) ?? 0);
    }
    
    return {
      utilization: Math.round(utilization),
      avgDuration: Math.round(avgDuration / 60),
      operations,
      totalCost: Math.round(totalCost),
      septicPct: Math.round(septicPct),
      peakHour,
      trend,
      roomHistoryCount: roomHistory.length,
    };
  }, [room.id, statusHistory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="max-h-[90vh] overflow-y-auto rounded-3xl max-w-2xl w-full"
            style={{
              background: `linear-gradient(180deg, ${C.surface3} 0%, ${C.surface2} 100%)`,
              border: `1px solid ${C.borderActive}`,
              boxShadow: `0 20px 60px rgba(0,217,255,0.1)`,
            }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b" style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: C.textHi }}>{room.name}</h2>
                <p className="text-xs mt-1" style={{ color: C.muted }}>{room.department} • Sál ID: {room.id}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: C.surfaceHover }}
              >
                <X size={18} color={C.text} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Main metrics grid */}
              <div className="grid grid-cols-2 gap-3">
                <KPIBlock
                  label="Utilization"
                  value={metrics.utilization}
                  unit="%"
                  icon={TrendingUp}
                  color={metrics.utilization > 70 ? C.red : metrics.utilization > 50 ? C.orange : C.green}
                  accent={C.accent}
                />
                <KPIBlock
                  label="Avg Op Time"
                  value={metrics.avgDuration}
                  unit="min"
                  icon={Clock}
                  color={C.accent}
                  accent={C.accent}
                />
                <KPIBlock
                  label="Operations"
                  value={metrics.operations}
                  icon={CheckCircle2}
                  color={C.green}
                  accent={C.accent}
                />
                <KPIBlock
                  label="Septic %"
                  value={metrics.septicPct}
                  unit="%"
                  icon={AlertCircle}
                  color={metrics.septicPct > 30 ? C.orange : C.green}
                  accent={C.accent}
                />
              </div>

              {/* Status information */}
              <Card
                title="Room Status"
                accent={C.accent}
                className="p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Current Status</span>
                    <span className="font-semibold" style={{ color: room.status === 'BUSY' ? C.green : C.muted }}>
                      {room.status === 'BUSY' ? 'In Use' : 'Available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Department</span>
                    <span className="font-semibold" style={{ color: C.text }}>{room.department}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Cost/Hour</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {formatNumber(room.hourlyOperatingCost ?? 0)} Kč
                    </span>
                  </div>
                </div>
              </Card>

              {/* Trend chart */}
              <Card
                title="7-Hour Trend"
                accent={C.accent}
                className="p-4"
              >
                <div className="h-20">
                  <Sparkline
                    data={metrics.trend}
                    color={C.accent}
                    fillOpacity={0.12}
                    width={250}
                    height={80}
                  />
                </div>
              </Card>

              {/* Peak information */}
              <Card
                title="Peak Activity"
                accent={C.orange}
                className="p-4"
              >
                <div className="text-center py-4">
                  <div className="text-4xl font-bold mb-2" style={{ color: C.orange }}>
                    {metrics.peakHour}:00
                  </div>
                  <p style={{ color: C.muted }}>Highest activity hour</p>
                </div>
              </Card>

              {/* Cost summary */}
              <Card
                title="Cost Analysis"
                accent={C.blue}
                className="p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: C.muted }}>Total Operations</span>
                    <span className="font-semibold" style={{ color: C.text }}>{metrics.operations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: C.muted }}>Estimated Cost</span>
                    <span className="text-lg font-bold" style={{ color: C.blue }}>
                      {formatNumber(metrics.totalCost)} Kč
                    </span>
                  </div>
                </div>
              </Card>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold transition-all"
                style={{
                  background: C.accent,
                  color: C.bg,
                }}
              >
                Close Detail View
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoomDetailModal;
