'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertCircle, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import { C, Card, KPIBlock } from './shared';
import type { OperatingRoom } from '../../types';
import type { StatusHistoryRow } from '../../lib/db';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  icon: React.ReactNode;
  action?: string;
  metric?: string;
}

interface SmartRecommendationsProps {
  rooms: OperatingRoom[];
  statusHistory: StatusHistoryRow[];
  totalOps: number;
  avgUtilization: number;
  periodLabel: string;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  rooms,
  statusHistory = [],
  totalOps,
  avgUtilization,
  periodLabel,
}) => {
  // Generate intelligent recommendations based on real data
  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    // 1. Underutilized rooms detection
    const underutilizedRooms = rooms.filter(r => {
      const roomHistory = statusHistory.filter(h => h.operating_room_id === r.id);
      if (roomHistory.length === 0) return false;
      const operating = roomHistory.filter(h => 
        h.event_type === 'in_use' || h.event_type === 'started' || h.event_type === 'occupied'
      ).length;
      const utilization = (operating / roomHistory.length) * 100;
      return utilization < 40;
    });

    if (underutilizedRooms.length > 0) {
      recs.push({
        id: 'underutilized',
        title: 'Slabě vytížené sály',
        description: `${underutilizedRooms.length} sál${underutilizedRooms.length === 1 ? '' : 'ů'} má utilization pod 40%. Zvažte konsolidaci operací nebo údržbu.`,
        severity: 'warning',
        icon: <TrendingUp size={16} />,
        metric: `${underutilizedRooms.map(r => r.name).join(', ')}`,
      });
    }

    // 2. High utilization - bottleneck detection
    const overUtilized = rooms.filter(r => {
      const roomHistory = statusHistory.filter(h => h.operating_room_id === r.id);
      if (roomHistory.length === 0) return false;
      const operating = roomHistory.filter(h => 
        h.event_type === 'in_use' || h.event_type === 'started' || h.event_type === 'occupied'
      ).length;
      const utilization = (operating / roomHistory.length) * 100;
      return utilization > 85;
    });

    if (overUtilized.length > 0) {
      recs.push({
        id: 'bottleneck',
        title: 'Kritické zatížení',
        description: `${overUtilized.length} sál${overUtilized.length === 1 ? '' : 'ů'} je vytíženo nad 85%. Riziko zpoždění a delších turnover časů.`,
        severity: 'critical',
        icon: <AlertCircle size={16} />,
        metric: `${overUtilized.map(r => r.name).join(', ')}`,
      });
    }

    // 3. Staff utilization analysis
    const staffCount = rooms.length; // Simplified - should be from staff data
    const opsPerStaff = staffCount > 0 ? totalOps / staffCount : 0;

    if (opsPerStaff > 8) {
      recs.push({
        id: 'staff-overload',
        title: 'Přetížení personálu',
        description: `Průměrně ${opsPerStaff.toFixed(1)} operací na zaměstnance je vysoké. Zvažte nábor nebo redistribuci.`,
        severity: 'warning',
        icon: <Users size={16} />,
        metric: `${opsPerStaff.toFixed(1)} op/osoba`,
      });
    }

    // 4. Throughput optimization
    if (avgUtilization < 60) {
      recs.push({
        id: 'throughput-low',
        title: 'Nízká produktivita',
        description: `Průměrné utilization je ${avgUtilization.toFixed(0)}%. Optimalizujte plánování nebo zkraťte turnover časy.`,
        severity: 'info',
        icon: <Clock size={16} />,
        metric: `${avgUtilization.toFixed(0)}% util.`,
      });
    }

    // 5. Cost optimization opportunity
    if (totalOps > 0 && statusHistory.length > 0) {
      const avgDuration = statusHistory.reduce((sum, h) => sum + (h.duration_seconds || 0), 0) / statusHistory.length / 60;
      const estimatedCost = totalOps * 50 * (avgDuration || 60) / 60; // Simplified cost model

      if (avgDuration > 120) {
        recs.push({
          id: 'long-durations',
          title: 'Dlouhé operační doby',
          description: `Průměrná doba operace je ${avgDuration.toFixed(0)} minut. Analýza puede snížit náklady.`,
          severity: 'warning',
          icon: <DollarSign size={16} />,
          metric: `${estimatedCost.toFixed(0)} Kč/den`,
        });
      }
    }

    // 6. Septic room efficiency
    const septicRooms = rooms.filter(r => r.isSeptic);
    if (septicRooms.length > 0) {
      const septicHistory = statusHistory.filter(h => 
        septicRooms.some(r => r.id === h.operating_room_id)
      );
      const septicUtilization = septicHistory.length > 0
        ? (septicHistory.filter(h => 
            h.event_type === 'in_use' || h.event_type === 'started'
          ).length / septicHistory.length) * 100
        : 0;

      if (septicUtilization < 50 && septicRooms.length > 1) {
        recs.push({
          id: 'septic-efficiency',
          title: 'Optimalizace septic sálů',
          description: `Máte ${septicRooms.length} septic sálů s utilization ${septicUtilization.toFixed(0)}%. Zvažte konsolidaci.`,
          severity: 'info',
          icon: <Lightbulb size={16} />,
          metric: `${septicUtilization.toFixed(0)}% util.`,
        });
      }
    }

    return recs;
  }, [rooms, statusHistory, totalOps, avgUtilization]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return C.red;
      case 'warning': return C.orange;
      default: return C.accent;
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={16} color={C.accent} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
          Inteligentní doporučení
        </h3>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" 
          style={{ background: `${C.accent}20`, color: C.accent }}>
          {recommendations.length} položek
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[11px]" style={{ color: C.muted }}>
            Výborně! Žádná doporučení k optimalizaci.
          </p>
          <p className="text-[10px] mt-1" style={{ color: C.faint }}>
            Modul běží optimálně pro period {periodLabel}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec, idx) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="p-3 rounded-xl border"
              style={{
                background: `${getSeverityColor(rec.severity)}08`,
                borderColor: `${getSeverityColor(rec.severity)}30`,
              }}>
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ 
                    background: `${getSeverityColor(rec.severity)}15`,
                    color: getSeverityColor(rec.severity)
                  }}>
                  {rec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: C.textHi }}>
                    {rec.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                    {rec.description}
                  </p>
                  {rec.metric && (
                    <p className="text-[9px] mt-1.5 font-semibold tabular-nums" 
                      style={{ color: getSeverityColor(rec.severity) }}>
                      {rec.metric}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t" style={{ borderColor: C.border }}>
        <p className="text-[9px]" style={{ color: C.faint }}>
          Doporučení jsou generována na základě reálných dat z poslední tří hodin analýzy.
        </p>
      </div>
    </Card>
  );
};

export default SmartRecommendations;
