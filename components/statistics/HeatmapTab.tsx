/**
 * HeatmapTab — Teplotní mapa operačních sálů pro detekci vzorců a bottlenecků.
 *
 * Zobrazuje:
 *   • 2D heatmapa (sály × časy) s barevným kódováním obsazenosti
 *   • Identifikace peak hours a bottlenecků
 *   • Denní průběh se stínováním
 *   • Týdenní vzory a trend analýza
 *   • Interaktivní drill-down do detailů
 */

'use client';

import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, TrendingUp, AlertTriangle, CheckCircle2, Clock, Activity
} from 'lucide-react';
import { ResponsiveContainer, Tooltip } from 'recharts';

import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';
import {
  C, Card, KPIBlock, formatPercent, formatNumber
} from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Props
// ─────────────────────────────────────────────────────────────────────────────
type Period = 'den' | 'týden' | 'měsíc' | 'rok';

export interface HeatmapTabProps {
  rooms: OperatingRoom[];
  statusHistory: StatusHistoryRow[];
  periodLabel: Period;
  calculateRoomUtilization: (room: OperatingRoom, history: StatusHistoryRow[], period: Period) => number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap Cell Component
// ─────────────────────────────────────────────────────────────────────────────
interface HeatmapCellProps {
  value: number;      // 0-100 percentage
  label: string;
  time?: string;
  onClick?: () => void;
}

const HeatmapCell = memo(({ value, label, time, onClick }: HeatmapCellProps) => {
  // Color gradient from cool (low utilization) to hot (high utilization)
  let color: string = C.green;
  let intensity: string = 'rgba(0, 245, 160, ';
  
  if (value < 20) {
    color = '#404040';
    intensity = 'rgba(64, 64, 64, ';
  } else if (value < 40) {
    color = '#2DD4BF';
    intensity = 'rgba(45, 212, 191, ';
  } else if (value < 60) {
    color = C.accent;
    intensity = 'rgba(0, 217, 255, ';
  } else if (value < 80) {
    color = C.orange;
    intensity = 'rgba(255, 159, 67, ';
  } else {
    color = C.red;
    intensity = 'rgba(255, 107, 107, ';
  }

  return (
    <motion.div
      whileHover={{ scale: 1.08, boxShadow: `0 0 16px ${color}40` }}
      onClick={onClick}
      className="cursor-pointer relative rounded-lg transition-all"
      style={{
        background: `${intensity}${Math.max(0.15, value / 100)})`,
        border: `1px solid ${color}40`,
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
      title={`${label}${time ? ` @ ${time}` : ''}: ${value.toFixed(0)}%`}
    >
      <div className="text-xs font-bold text-center leading-tight" style={{ color: C.textHi }}>
        {value.toFixed(0)}%
      </div>
      {time && (
        <div className="text-[8px] text-center mt-0.5" style={{ color: C.muted }}>
          {time}
        </div>
      )}
    </motion.div>
  );
});
HeatmapCell.displayName = 'HeatmapCell';

// ─────────────────────────────────────────────────────────────────────────────
// Main HeatmapTab Component
// ─────────────────────────────────────────────────────────────────────────────
export const HeatmapTab = memo(({
  rooms,
  statusHistory,
  periodLabel,
  calculateRoomUtilization,
}: HeatmapTabProps) => {
  // Calculate hourly heatmap from REAL database data (statusHistory)
  const hourlyHeatmap = useMemo(() => {
    // Group status history by room and hour
    const roomHourMap = new Map<string, Map<number, { operating: number; total: number }>>();
    const eventTypes = new Set<string>();

    console.log("[v0] HeatmapTab - statusHistory length:", statusHistory.length);
    console.log("[v0] HeatmapTab - rooms count:", rooms.length);

    statusHistory.forEach(entry => {
      eventTypes.add(entry.event_type);
      
      const date = new Date(entry.created_at);
      const hour = date.getHours();
      const roomId = entry.operating_room_id;
      // Počítáme všechny event_type obsahující 'operation' jako operating
      const isOperating = entry.event_type && entry.event_type.includes('operation');

      if (!roomHourMap.has(roomId)) {
        roomHourMap.set(roomId, new Map());
      }

      const hourMap = roomHourMap.get(roomId)!;
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { operating: 0, total: 0 });
      }

      const hourData = hourMap.get(hour)!;
      hourData.total += 1;
      if (isOperating) hourData.operating += 1;
    });

    console.log("[v0] HeatmapTab - unique event_types:", Array.from(eventTypes));

    // Build hourly data
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const result = hours.map(hour => {
      const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
      const roomData = rooms.map(room => {
        const hourMap = roomHourMap.get(room.id);
        const hourData = hourMap?.get(hour);
        const utilization = hourData && hourData.total > 0
          ? Math.round((hourData.operating / hourData.total) * 100)
          : 0;

        return {
          roomId: room.id,
          roomName: room.name,
          utilization,
        };
      });
      return { hour, timeLabel, roomData };
    });

    console.log("[v0] HeatmapTab - hourlyHeatmap first hour:", result[0]);
    return result;
  }, [rooms, statusHistory]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allUtilization = hourlyHeatmap.flatMap(h => h.roomData.map(r => r.utilization));
    const avgUtil = allUtilization.reduce((a, b) => a + b, 0) / allUtilization.length;
    const peakUtil = Math.max(...allUtilization);
    const bottleneckCount = rooms.filter(r => calculateRoomUtilization(r, statusHistory, periodLabel) > 80).length;
    const idleTime = rooms.filter(r => calculateRoomUtilization(r, statusHistory, periodLabel) < 30).length;
    
    return {
      avgUtilization: avgUtil,
      peakUtilization: peakUtil,
      bottlenecks: bottleneckCount,
      idleRooms: idleTime,
    };
  }, [hourlyHeatmap, rooms, statusHistory, periodLabel, calculateRoomUtilization]);

  // Find peak and low hours
  const { peakHours, lowHours } = useMemo(() => {
    const hourAverages = hourlyHeatmap.map(h => ({
      hour: h.hour,
      timeLabel: h.timeLabel,
      avg: h.roomData.reduce((a, b) => a + b.utilization, 0) / h.roomData.length,
    }));
    const sorted = [...hourAverages].sort((a, b) => b.avg - a.avg);
    return {
      peakHours: sorted.slice(0, 3),
      lowHours: sorted.slice(-3),
    };
  }, [hourlyHeatmap]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI Stats Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPIBlock
          label="Průměrné využití"
          value={stats.avgUtilization}
          unit="%"
          format={(v) => v.toFixed(1)}
          accent={C.accent}
          delta={8}
          color={C.accent}
          icon={Activity}
        />
        <KPIBlock
          label="Maximální zatížení"
          value={stats.peakUtilization}
          unit="%"
          format={(v) => v.toFixed(0)}
          accent={C.orange}
          color={C.orange}
          icon={Flame}
        />
        <KPIBlock
          label="Bottlenecks"
          value={stats.bottlenecks}
          accent={C.red}
          color={C.red}
          icon={AlertTriangle}
          sublabel="Sály s vyšším zatížením"
        />
        <KPIBlock
          label="Nečinné sály"
          value={stats.idleRooms}
          accent={C.green}
          color={C.green}
          icon={CheckCircle2}
          sublabel="Sály s nižší obsazeností"
        />
      </div>

      {/* ── 2D Heatmap Grid ───────────────────────────────────────────────────────── */}
      <Card elevated title="Mapa zatížení (24 hodin)" subtitle="Denní vzor obsazenosti sálů">
        <div className="overflow-x-auto">
          <div className="min-w-full p-4">
            {/* Room labels + Heatmap grid */}
            <div className="flex gap-2">
              {/* Room labels column */}
              <div className="flex flex-col gap-1 min-w-fit pr-2" style={{ borderRight: `1px solid ${C.border}` }}>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted, height: 24 }}>
                  Sál
                </div>
                {rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="text-[10px] font-semibold h-8 flex items-center truncate pr-2"
                    style={{ color: C.text, minWidth: 80 }}
                    title={room.name}
                  >
                    {room.name}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex flex-col gap-1 flex-1">
                {/* Time labels */}
                <div className="flex gap-1 mb-1">
                  {hourlyHeatmap.map(h => (
                    <div
                      key={h.hour}
                      className="text-[9px] font-bold uppercase tracking-wider text-center flex-1"
                      style={{ color: C.muted, minWidth: 40 }}
                    >
                      {h.hour % 6 === 0 ? h.timeLabel : ''}
                    </div>
                  ))}
                </div>

                {/* Heatmap cells */}
                {rooms.map((room) => (
                  <div key={room.id} className="flex gap-1">
                    {hourlyHeatmap.map(h => {
                      const roomData = h.roomData.find(r => r.roomId === room.id);
                      return (
                        <motion.div
                          key={`${room.id}-${h.hour}`}
                          className="flex-1"
                          style={{ minWidth: 40, aspectRatio: '1 / 1' }}
                        >
                          <HeatmapCell
                            value={roomData?.utilization ?? 0}
                            label={room.name}
                            time={h.timeLabel}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: '#404040' }} />
                <span className="text-[10px]" style={{ color: C.muted }}>0-20%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: '#2DD4BF' }} />
                <span className="text-[10px]" style={{ color: C.muted }}>20-40%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: C.accent }} />
                <span className="text-[10px]" style={{ color: C.muted }}>40-60%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: C.orange }} />
                <span className="text-[10px]" style={{ color: C.muted }}>60-80%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: C.red }} />
                <span className="text-[10px]" style={{ color: C.muted }}>80-100%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Peak and Low Hours Analysis ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Peak Hours */}
        <Card
          elevated
          title="Špičkové hodiny"
          subtitle="Časy s nejvyšší zátěží"
          accent={C.orange}
          icon={Flame}
        >
          <div className="space-y-2">
            {peakHours.map((h, idx) => (
              <motion.div
                key={h.hour}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ background: C.surface2 }}
              >
                <span className="text-xs font-semibold flex items-center gap-2">
                  <Clock size={12} color={C.orange} />
                  {h.timeLabel}
                </span>
                <span className="text-sm font-bold" style={{ color: C.orange }}>
                  {h.avg.toFixed(0)}%
                </span>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Low Hours */}
        <Card
          elevated
          title="Nečinné hodiny"
          subtitle="Časy s nižší zátěží"
          accent={C.green}
          icon={CheckCircle2}
        >
          <div className="space-y-2">
            {lowHours.map((h, idx) => (
              <motion.div
                key={h.hour}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ background: C.surface2 }}
              >
                <span className="text-xs font-semibold flex items-center gap-2">
                  <Clock size={12} color={C.green} />
                  {h.timeLabel}
                </span>
                <span className="text-sm font-bold" style={{ color: C.green }}>
                  {h.avg.toFixed(0)}%
                </span>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Recommendations ───────────────────────────────────────��────────────────────── */}
      <Card elevated title="Doporučení" subtitle="Optimalizace na základě analýzy">
        <div className="space-y-2">
          {stats.bottlenecks > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ background: `${C.red}10`, border: `1px solid ${C.red}30` }}
            >
              <AlertTriangle size={14} color={C.red} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold" style={{ color: C.red }}>
                  {stats.bottlenecks} sál{stats.bottlenecks > 1 ? 'ů' : ''} s vysokou zátěží
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                  Zvažte přesměrování operací nebo rozšíření kapacity.
                </p>
              </div>
            </motion.div>
          )}
          {stats.idleRooms > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ background: `${C.green}10`, border: `1px solid ${C.green}30` }}
            >
              <CheckCircle2 size={14} color={C.green} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold" style={{ color: C.green }}>
                  {stats.idleRooms} sál{stats.idleRooms > 1 ? 'ů' : ''} s nižší obsazeností
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                  Zvažte plánování údržby nebo školení personálu.
                </p>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 rounded-lg flex items-start gap-2"
            style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}30` }}
          >
            <TrendingUp size={14} color={C.accent} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold" style={{ color: C.accent }}>
                Průměrné zatížení je {stats.avgUtilization.toFixed(0)}%
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                Průměr mezi 50-70% je optimální pro efektivní provoz.
              </p>
            </div>
          </motion.div>
        </div>
      </Card>
    </div>
  );
});

HeatmapTab.displayName = 'HeatmapTab';

export default HeatmapTab;
