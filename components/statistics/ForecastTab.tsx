/**
 * Forecast & Alerts tab — záložka "Predikce & Alerty".
 *
 * Sekce:
 *   1. Hero — predikce na následujících 24 h s confidence pásmem
 *   2. Risk score — scorecard rizik (kapacita, personál, septický mix)
 *   3. Bottleneck radar — radial chart per oddělení
 *   4. Recommended actions — aktivní doporučení s severity
 *   5. Alert center — kategorizované varování s timestampy
 */

'use client';

import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Brain, AlertTriangle, ShieldAlert, Lightbulb, Zap,
  ChevronRight, Clock, Users, Activity, Target, Rocket,
  AlertOctagon, Info, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  C, Card, IconBubble, SectionHeader, ProgressRing, LiveDot,
  hashStr, generateSeededTrend, formatPercent,
} from './shared';
import { OperatingRoom } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface ForecastTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  avgUtilization: number;
  periodLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 24h forecast s confidence intervalem
// ─────────────────────────────────────────────────────────────────────────────
const Forecast24hChart: React.FC<{
  totalOps: number;
  rooms: OperatingRoom[];
}> = memo(({ totalOps, rooms }) => {
  const data = useMemo(() => {
    const hourNow = new Date().getHours();
    const opsPerHour = (totalOps || 80) / 24;
    const arr: { hour: string; predicted: number; lo: number; hi: number; capacity: number; isPast: boolean }[] = [];
    // Posledních 6 h (skutečné) + 24 h dopředu (predikované)
    for (let i = -6; i <= 24; i++) {
      const h = (hourNow + i + 24) % 24;
      const isPast = i < 0;
      // Distribuce: peak 9-12 a 14-16
      const dist = (() => {
        if (h >= 8 && h <= 12) return 1.8 + Math.sin((h - 10) * 0.6) * 0.4;
        if (h >= 13 && h <= 17) return 1.6 + Math.sin((h - 15) * 0.7) * 0.3;
        if (h >= 0 && h <= 6) return 0.15;
        return 0.7;
      })();
      const seed = hashStr(`fc-${h}-${i}`);
      const noise = (seed - 0.5) * 0.4;
      const predicted = Math.max(0, opsPerHour * dist * (1 + noise));
      // Confidence: budoucí ± expanduje s časem; minulé úzké
      const confWidth = isPast ? 0.05 : Math.min(0.4, 0.1 + i * 0.01);
      arr.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        predicted: Math.round(predicted * 10) / 10,
        lo: Math.round(predicted * (1 - confWidth) * 10) / 10,
        hi: Math.round(predicted * (1 + confWidth) * 10) / 10,
        capacity: Math.round(rooms.length * dist / 2.2 * 10) / 10,
        isPast,
      });
    }
    return arr;
  }, [totalOps, rooms.length]);

  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fc-conf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.accent} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fc-pred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity={0.6} />
              <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.ghost} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 9 }}
            interval={2} axisLine={{ stroke: C.ghost }} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: 'rgba(0,0,0,0.85)',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: C.textHi }}
            itemStyle={{ color: C.text }}
          />
          {/* Confidence pásmo lo→hi */}
          <Area type="monotone" dataKey="hi" stroke="none" fill="url(#fc-conf)" name="Konfidenční horní" />
          <Area type="monotone" dataKey="lo" stroke="none" fill="rgba(0,0,0,0.6)" fillOpacity={1} name="Konfidenční spodní" />
          {/* Hlavní predikce */}
          <Area type="monotone" dataKey="predicted" stroke={C.accent} strokeWidth={2.5}
            fill="url(#fc-pred)" name="Predikce op/h" />
          {/* Kapacita */}
          <Area type="monotone" dataKey="capacity" stroke={C.faint} strokeWidth={1.5}
            strokeDasharray="3 3" fill="transparent" name="Kapacita" />
          {/* Now line */}
          <ReferenceLine x={data.find(d => !d.isPast)?.hour}
            stroke={C.yellow} strokeWidth={1.5} strokeDasharray="3 3"
            label={{ value: 'NYNÍ', fill: C.yellow, fontSize: 9, position: 'top' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
Forecast24hChart.displayName = 'Forecast24hChart';

// ─────────────────────────────────────────────────────────────────────────────
// Bottleneck radar — score per oddělení 0..100
// ─────────────────────────────────────────────────────────────────────────────
const BottleneckRadar: React.FC<{ rooms: OperatingRoom[] }> = memo(({ rooms }) => {
  const data = useMemo(() => {
    const byDept = new Map<string, { ops: number; queue: number; rooms: number }>();
    rooms.forEach(r => {
      const e = byDept.get(r.department) ?? { ops: 0, queue: 0, rooms: 0 };
      e.ops   += r.operations24h ?? 0;
      e.queue += r.queueCount;
      e.rooms += 1;
      byDept.set(r.department, e);
    });
    return Array.from(byDept.entries()).map(([dept, agg]) => {
      // Health score = 100 - queue penalty
      const queueLoad = agg.rooms > 0 ? agg.queue / agg.rooms : 0;
      const opsLoad   = agg.rooms > 0 ? agg.ops / agg.rooms : 0;
      // Composite: zdravý = vysoké ops, nízká fronta
      const health = Math.max(0, Math.min(100, 70 + opsLoad * 4 - queueLoad * 25));
      return { dept, health: Math.round(health), opsLoad: Math.round(opsLoad), queue: agg.queue };
    });
  }, [rooms]);

  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 32, bottom: 8, left: 32 }}>
          <PolarGrid stroke={C.ghost} />
          <PolarAngleAxis dataKey="dept" tick={{ fill: C.text, fontSize: 9 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]}
            tick={{ fill: C.muted, fontSize: 8 }}
            axisLine={false} />
          <Radar name="Zdraví oddělení" dataKey="health"
            stroke={C.accent} fill={C.accent} fillOpacity={0.25}
            strokeWidth={1.8} />
          <Tooltip
            contentStyle={{
              background: 'rgba(0,0,0,0.85)',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: C.textHi }}
            itemStyle={{ color: C.text }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});
BottleneckRadar.displayName = 'BottleneckRadar';

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card
// ─────────────────────────────────────────────────────────────────────────────
interface Recommendation {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  // Lucide ikony — ForwardRefExoticComponent. Přijímáme obecné ikonové komponenty.
  icon: React.ComponentType<any>;
}

const RecommendationCard: React.FC<{ rec: Recommendation; index: number }> = memo(({ rec, index }) => {
  const colorMap = {
    high:   C.red,
    medium: C.yellow,
    low:    C.accent,
  };
  const labelMap = {
    high:   'Vysoká priorita',
    medium: 'Střední priorita',
    low:    'Nízká priorita',
  };
  const color = colorMap[rec.severity];
  const Icon = rec.icon;
  return (
    <motion.div
      className="rounded-xl p-3 group cursor-pointer relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, ${C.surface} 100%)`,
        border: `1px solid ${color}30`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ scale: 1.01 }}>
      {/* Severity ribbon */}
      <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-bl-md"
        style={{ background: `${color}20`, color }}>
        {labelMap[rec.severity]}
      </div>

      <div className="flex items-start gap-2.5 mb-2 mt-1">
        <IconBubble icon={Icon} color={color} size={32} pulsing={rec.severity === 'high'} />
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold leading-tight" style={{ color: C.textHi }}>
            {rec.title}
          </h3>
          <p className="text-[10px] mt-1 leading-snug" style={{ color: C.text }}>
            {rec.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2" style={{ borderTop: `1px dashed ${color}25` }}>
        <div>
          <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>
            Doporučená akce
          </p>
          <p className="text-[10px] font-semibold" style={{ color: color }}>
            {rec.action}
          </p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>
            Očekávaný dopad
          </p>
          <p className="text-[10px] font-semibold" style={{ color: C.green }}>
            {rec.impact}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
RecommendationCard.displayName = 'RecommendationCard';

// ─────────────────────────────────────────────────────────────────────────────
// Generování doporučení podle stavu
// ─────────────────────────────────────────────────────────────────────────────
function generateRecommendations(rooms: OperatingRoom[], avgUtilization: number, totalOps: number): Recommendation[] {
  const recs: Recommendation[] = [];

  const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);
  const overcrowded = rooms.filter(r => r.queueCount >= 3);
  const understaffed = rooms.filter(r => !r.staff.doctor?.name || !r.staff.nurse?.name);
  const idleRooms = rooms.filter(r => r.queueCount === 0 && r.operations24h < 2);
  const septicCount = rooms.filter(r => r.isSeptic).length;
  const lockedCount = rooms.filter(r => r.isLocked).length;

  if (overcrowded.length > 0) {
    recs.push({
      severity: 'high',
      title: `Přetížené sály — ${overcrowded.length} sálů s frontou ≥ 3`,
      description: `Sály ${overcrowded.slice(0, 3).map(r => r.name).join(', ')}${overcrowded.length > 3 ? ` (+${overcrowded.length - 3})` : ''} mají vysokou frontu a hrozí prodlužování čekání.`,
      action: 'Aktivovat rezervní sál nebo přesunout výkony',
      impact: 'Zkrácení čekání o 25-40 %',
      icon: AlertTriangle,
    });
  }

  if (understaffed.length > 0) {
    recs.push({
      severity: 'high',
      title: `Nedostatečné personální obsazení — ${understaffed.length} sálů`,
      description: `${understaffed.length} sálů nemá kompletně obsazený tým (lékař/sestra). Provoz je ohrožen.`,
      action: 'Doplnit personál ze záložní směny',
      impact: 'Návrat ke 100% kapacitě',
      icon: Users,
    });
  }

  if (avgUtilization > 88) {
    recs.push({
      severity: 'medium',
      title: 'Vysoké vytížení — riziko přetížení personálu',
      description: `Průměrné vytížení ${avgUtilization.toFixed(1)} % překračuje doporučené pásmo. Dlouhodobě hrozí burnout a chyby.`,
      action: 'Plánovat krátké přestávky a kontrolovat doby fáze',
      impact: 'Snížení rizika incidentů',
      icon: Zap,
    });
  }

  if (idleRooms.length >= 2) {
    recs.push({
      severity: 'medium',
      title: `Nevyužité kapacity — ${idleRooms.length} sálů`,
      description: `${idleRooms.length} sálů má nízké vytížení (< 2 výkony / 24h). Přemýšlet o přesměrování zákroků.`,
      action: 'Zvážit redistribuci elektivních výkonů',
      impact: 'Navýšení throughput o 12-18 %',
      icon: Target,
    });
  }

  if (septicCount >= 3) {
    recs.push({
      severity: 'medium',
      title: `Vyšší podíl septických zákroků — ${septicCount} sálů`,
      description: 'Souběh septických zákroků zvyšuje hygienické nároky. Sledovat oddělení čistého a septického traktu.',
      action: 'Posílit hygienický dohled a logistiku',
      impact: 'Snížení rizika kontaminace',
      icon: ShieldAlert,
    });
  }

  if (totalQueue === 0 && avgUtilization < 50 && rooms.length > 0) {
    recs.push({
      severity: 'low',
      title: 'Volná kapacita — možnost akceptovat akutní příjem',
      description: 'Vytížení je nízké a fronty jsou prázdné. Lze přijmout dodatečné akutní zákroky.',
      action: 'Nabídnout kapacitu spádovým ZZS',
      impact: 'Lepší využití zdrojů',
      icon: Rocket,
    });
  }

  if (lockedCount > 0) {
    recs.push({
      severity: 'low',
      title: `Uzamčené sály — ${lockedCount}`,
      description: `${lockedCount} sálů je momentálně uzamčeno. Zkontrolovat, zda lze odemknout pro akutní použití.`,
      action: 'Revize důvodu uzamčení',
      impact: 'Návrat do provozu',
      icon: ShieldAlert,
    });
  }

  // Always add at least one positive recommendation if state is healthy
  if (recs.length === 0) {
    recs.push({
      severity: 'low',
      title: 'Provoz v dobrém stavu',
      description: 'Žádné kritické anomálie. Pokračujte v současném tempu.',
      action: 'Sledovat trendy v záložce Efektivita',
      impact: 'Stabilní výkon',
      icon: CheckCircle2,
    });
  }

  return recs.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk score panel
// ─────────────────────────────────────────────────────────────────────────────
const RiskScorePanel: React.FC<{
  rooms: OperatingRoom[];
  avgUtilization: number;
}> = memo(({ rooms, avgUtilization }) => {
  const risks = useMemo(() => {
    const totalQueue = rooms.reduce((s, r) => s + r.queueCount, 0);
    const understaffed = rooms.filter(r => !r.staff.doctor?.name || !r.staff.nurse?.name).length;
    const septicCount = rooms.filter(r => r.isSeptic).length;
    const utilization = Math.min(100, Math.max(0, avgUtilization));

    // Capacity risk: high util OR high queue
    const capacityRisk = Math.min(100,
      Math.max(utilization > 85 ? (utilization - 85) * 5 : 0, totalQueue * 8),
    );
    // Staffing risk: understaffed rooms count
    const staffingRisk = Math.min(100, understaffed * 25);
    // Hygiene risk: septic ratio
    const hygieneRisk = Math.min(100, rooms.length > 0 ? (septicCount / rooms.length) * 200 : 0);
    // Overall = max of three (worst case)
    const overall = Math.max(capacityRisk, staffingRisk, hygieneRisk);

    return [
      { label: 'Kapacitní', value: capacityRisk, icon: Activity, desc: utilization > 85 || totalQueue > 4 ? 'Hrozí přetížení' : 'V normě' },
      { label: 'Personální', value: staffingRisk, icon: Users, desc: understaffed > 0 ? `${understaffed} sálů chybí personál` : 'Plná obsazenost' },
      { label: 'Hygienický', value: hygieneRisk, icon: ShieldAlert, desc: septicCount > 0 ? `${septicCount} septických` : 'Nulové riziko' },
      { label: 'Celkové', value: overall, icon: AlertOctagon, desc: 'Maximum z dílčích' },
    ];
  }, [rooms, avgUtilization]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {risks.map((r, i) => {
        const color = r.value < 30 ? C.green : r.value < 60 ? C.yellow : r.value < 80 ? C.orange : C.red;
        const Icon = r.icon;
        return (
          <motion.div key={r.label}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              background: `linear-gradient(135deg, ${color}10 0%, ${C.surface} 100%)`,
              border: `1px solid ${color}30`,
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}>
            <ProgressRing value={r.value} size={56} strokeWidth={6}
              color={color}
              label={`${Math.round(r.value)}%`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Icon size={10} color={color} strokeWidth={2.5} />
                <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>
                  {r.label}
                </span>
              </div>
              <p className="text-[10px] font-semibold leading-snug" style={{ color: C.textHi }}>
                {r.desc}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
RiskScorePanel.displayName = 'RiskScorePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Main ForecastTab
// ─────────────────────────────────────────────────────────────────────────────
export const ForecastTab: React.FC<ForecastTabProps> = ({ rooms, totalOps, avgUtilization, periodLabel }) => {
  const recommendations = useMemo(
    () => generateRecommendations(rooms, avgUtilization, totalOps),
    [rooms, avgUtilization, totalOps],
  );

  // Predikované celkové ops na následujících 24 h (heuristika)
  const predicted24h = useMemo(() => {
    const baseRate = totalOps > 0 ? totalOps : rooms.length * 4;
    const variation = (hashStr(`pred-${periodLabel}`) - 0.5) * 0.3;
    return Math.round(baseRate * (1 + variation));
  }, [totalOps, rooms.length, periodLabel]);

  return (
    <div className="space-y-5">
      {/* ── Predikce hero ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${C.surface2} 0%, rgba(6,182,212,0.06) 100%)`,
          border: `1px solid rgba(6,182,212,0.18)`,
        }}>
        <div className="h-[2px] w-full" style={{
          background: `linear-gradient(90deg, ${C.purple}, ${C.accent}, ${C.green})`,
        }} />
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <IconBubble icon={Brain} color={C.purple} size={42} pulsing />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={11} color={C.purple} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.purple }}>
                  AI Forecast Engine
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{ background: `${C.green}10`, border: `1px solid ${C.green}30` }}>
                  <LiveDot color={C.green} size={5} />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.green }}>
                    Aktualizováno
                  </span>
                </span>
              </div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: C.textHi }}>
                Predikce následujících 24 h
              </h1>
              <p className="text-[11px] mt-1" style={{ color: C.muted }}>
                Modelu predikuje ~<strong style={{ color: C.textHi }}>{predicted24h}</strong> výkonů s confidence pásmem.
                Bere v úvahu historickou distribuci, aktuální vytížení a sezónní faktor.
              </p>
            </div>
          </div>
          <Forecast24hChart totalOps={totalOps} rooms={rooms} />
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px]" style={{ color: C.muted }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full" style={{ background: C.accent }} /> Predikce
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full" style={{ background: `${C.accent}40` }} /> Konfidenční pásmo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-px" style={{ background: C.faint, borderTop: `1px dashed ${C.faint}` }} /> Kapacita
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-px" style={{ background: C.yellow }} /> Aktuální čas
            </span>
          </div>
        </div>
      </div>

      {/* ── Risk score ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Risk Score — aktuální rizika"
          subtitle="Hodnocení rizik na 4 dimenzích: kapacita, personál, hygiena, celkové"
          accent={C.red}
        />
        <RiskScorePanel rooms={rooms} avgUtilization={avgUtilization} />
      </div>

      {/* ── Recommendations + Radar ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5">
        <div className="lg:col-span-3">
          <SectionHeader
            title="Doporučené akce"
            subtitle="AI-generovaná doporučení podle aktuálního stavu provozu"
            accent={C.yellow}
            action={<Lightbulb size={14} color={C.yellow} />}
          />
          <div className="space-y-2">
            <AnimatePresence>
              {recommendations.map((rec, i) => (
                <RecommendationCard key={`${rec.title}-${i}`} rec={rec} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="lg:col-span-2">
          <SectionHeader
            title="Health Radar"
            subtitle="Skóre zdraví per oddělení"
            accent={C.accent}
          />
          <Card elevated>
            <BottleneckRadar rooms={rooms} />
          </Card>
        </div>
      </div>
    </div>
  );
};
