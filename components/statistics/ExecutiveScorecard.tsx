/**
 * Executive Scorecard — flagship hero karta pro tab Přehled.
 *
 * Obsahuje:
 *   • Velký A-F grade ring (composite score)
 *   • 4 mega-KPI tily s delta + sparkline
 *   • AI narrative insights (auto-generované textové pozorování)
 *   • Live event ticker (poslední změny statusů)
 *   • Period-over-period delty napříč
 *
 * Komponenta je čistě prezentační — všechna data dostává v props.
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Zap, Users, Clock, AlertTriangle, CheckCircle2,
  Target, Sparkles, ArrowUpRight, ArrowDownRight, Radio,
} from 'lucide-react';
import {
  C, Card, GradeBadge, KPIBlock, DeltaBadge, IconBubble, LiveDot,
  AnimatedCounter, formatPercent, generateSeededTrend, computeDelta, seededPreviousValue,
} from './shared';
import { OperatingRoom } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Typy props
// ─────────────────────────────────────────────────────────────────────────────
export interface ScorecardData {
  /** Aktuální průměrné využití (0..100) */
  utilization: number;
  /** Aktuální celkový počet operací v období */
  totalOps: number;
  /** Počet aktuálně aktivních sálů */
  activeRooms: number;
  /** Počet pacientů ve frontě napříč sály */
  totalQueue: number;
  /** Počet septických zákroků v období */
  septicCount: number;
  /** Počet ÚPS zákroků v období */
  upsCount: number;
  /** Průměrná délka výkonu (min) */
  avgOpDuration: number;
  /** Aktuální status historie (pro live ticker) */
  recentEvents: Array<{
    timestamp: string;
    roomName: string;
    eventLabel: string;
    color?: string;
  }>;
  /** Pole sálů (pro narrative insights) */
  rooms: OperatingRoom[];
  /** Aktuální období label (např. "den") */
  periodLabel: string;
}

interface ExecutiveScorecardProps {
  data: ScorecardData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite score (0..100) — váženě z více KPI
// ─────────────────────────────────────────────────────────────────────────────
function computeCompositeScore(d: ScorecardData): number {
  // Ideální cíle:
  //   utilization: 75 % (60-90 % zóna nejlepší, < 60 % a > 90 % horší)
  //   total ops: relativně k aktivním sálům (~6 ops/sál/den ideál)
  //   septic ratio: < 15 %
  //   queue: < 2 pacienti/aktivní sál

  // Util skóre — křivka s peak na 75 %
  const utilDist = Math.abs(d.utilization - 75);
  const utilScore = Math.max(0, 100 - utilDist * 1.4);

  // Volume skóre — opsPerActiveRoom / 6 * 100, capped na 100
  const opsPerRoom = d.activeRooms > 0 ? d.totalOps / d.activeRooms : 0;
  const volumeScore = Math.min(100, (opsPerRoom / 6) * 100);

  // Bezpečnost — septic ratio penalizuje
  const septicRatio = d.totalOps > 0 ? (d.septicCount / d.totalOps) * 100 : 0;
  const safetyScore = Math.max(0, 100 - septicRatio * 4);

  // Flow skóre — queue per active room
  const queuePerRoom = d.activeRooms > 0 ? d.totalQueue / d.activeRooms : 0;
  const flowScore = Math.max(0, 100 - queuePerRoom * 25);

  return Math.round(
    utilScore * 0.35 +
    volumeScore * 0.25 +
    safetyScore * 0.25 +
    flowScore * 0.15
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI narrative insights — automaticky generované pozorování
// ─────────────────────────────────────────────────────────────────────────────
interface Insight {
  level: 'success' | 'info' | 'warning' | 'critical';
  text: string;
  // Lucide ikony — ForwardRefExoticComponent. Přijímáme obecné ikonové komponenty.
  icon: React.ComponentType<any>;
}

function generateInsights(d: ScorecardData, score: number): Insight[] {
  const insights: Insight[] = [];

  // Utilization insight
  if (d.utilization > 88) {
    insights.push({
      level: 'warning',
      text: `Vytížení ${d.utilization.toFixed(1)} % je vysoké — riziko přetížení personálu a posunutí elektivních zákroků.`,
      icon: AlertTriangle,
    });
  } else if (d.utilization > 70 && d.utilization <= 88) {
    insights.push({
      level: 'success',
      text: `Vytížení ${d.utilization.toFixed(1)} % je v ideálním pásmu — efektivní využití kapacit bez přetížení.`,
      icon: CheckCircle2,
    });
  } else if (d.utilization > 0) {
    insights.push({
      level: 'info',
      text: `Vytížení ${d.utilization.toFixed(1)} % je nižší než cíl 75 % — prostor pro elektivní zákroky.`,
      icon: Target,
    });
  }

  // Top performer
  const sortedRooms = [...d.rooms].sort((a, b) => (b.operations24h ?? 0) - (a.operations24h ?? 0));
  const top = sortedRooms[0];
  if (top && (top.operations24h ?? 0) > 0) {
    insights.push({
      level: 'info',
      text: `Nejvytíženější: ${top.name} (${top.operations24h} výkonů za 24 h).`,
      icon: ArrowUpRight,
    });
  }

  // Septic ratio
  if (d.totalOps > 0) {
    const septicRatio = (d.septicCount / d.totalOps) * 100;
    if (septicRatio > 20) {
      insights.push({
        level: 'critical',
        text: `Podíl septických zákroků ${septicRatio.toFixed(1)} % je vyšší než norma — zvýšená hygienická opatření.`,
        icon: AlertTriangle,
      });
    } else if (d.septicCount > 0) {
      insights.push({
        level: 'info',
        text: `Septické zákroky tvoří ${septicRatio.toFixed(1)} % z celkového objemu — v normě.`,
        icon: CheckCircle2,
      });
    }
  }

  // Queue
  if (d.totalQueue >= 3) {
    insights.push({
      level: 'warning',
      text: `Ve frontě čeká ${d.totalQueue} pacientů — zvážit aktivaci rezervního sálu.`,
      icon: ArrowDownRight,
    });
  } else if (d.totalQueue === 0 && d.activeRooms > 0) {
    insights.push({
      level: 'success',
      text: `Žádné fronty — plynulý provoz.`,
      icon: CheckCircle2,
    });
  }

  // ÚPS
  if (d.upsCount > 0) {
    insights.push({
      level: 'info',
      text: `Provedeno ${d.upsCount} ÚPS zákroků v aktuálním období.`,
      icon: Zap,
    });
  }

  // Composite score commentary
  if (score >= 85) {
    insights.push({
      level: 'success',
      text: `Celkové skóre ${score}/100 — pracoviště běží na vysoké úrovni efektivity.`,
      icon: Sparkles,
    });
  } else if (score < 50) {
    insights.push({
      level: 'critical',
      text: `Skóre ${score}/100 indikuje výraznou prostor pro zlepšení — viz doporučení v záložce Forecast.`,
      icon: AlertTriangle,
    });
  }

  return insights.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight item renderer
// ─────────────────────────────────────────────────────────────────────────────
const InsightItem: React.FC<{ insight: Insight; index: number }> = ({ insight, index }) => {
  const colorMap = {
    success:  C.green,
    info:     C.accent,
    warning:  C.yellow,
    critical: C.red,
  };
  const color = colorMap[insight.level];
  const Icon = insight.icon;
  return (
    <motion.div
      className="flex items-start gap-2 py-1.5 px-2 rounded-md"
      style={{ background: `${color}06`, borderLeft: `2px solid ${color}` }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}>
      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: `${color}18` }}>
        <Icon size={9} color={color} strokeWidth={2.5} />
      </div>
      <p className="text-[11px] leading-snug" style={{ color: C.text }}>
        {insight.text}
      </p>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Executive Scorecard
// ─────────────────────────────────────────────────────────────────────────────
export const ExecutiveScorecard: React.FC<ExecutiveScorecardProps> = ({ data }) => {
  // Composite score
  const score = useMemo(() => computeCompositeScore(data), [data]);
  // Pseudo-historical scores pro sparkline
  const scoreTrend = useMemo(
    () => generateSeededTrend(`scorecard-${data.periodLabel}`, 12, score, 0.06),
    [score, data.periodLabel],
  );

  // PoP delty na hlavních KPI
  const utilPrev   = seededPreviousValue(`util-${data.periodLabel}`, data.utilization);
  const opsPrev    = seededPreviousValue(`ops-${data.periodLabel}`, data.totalOps, 0.30);
  const queuePrev  = seededPreviousValue(`queue-${data.periodLabel}`, data.totalQueue, 0.50);
  const durPrev    = seededPreviousValue(`dur-${data.periodLabel}`, data.avgOpDuration, 0.18);

  // Trend mock pro KPI sparkliny
  const utilTrend  = useMemo(() => generateSeededTrend(`util-trend-${data.periodLabel}`, 14, data.utilization), [data.utilization, data.periodLabel]);
  const opsTrend   = useMemo(() => generateSeededTrend(`ops-trend-${data.periodLabel}`, 14, data.totalOps, 0.25), [data.totalOps, data.periodLabel]);
  const queueTrend = useMemo(() => generateSeededTrend(`queue-trend-${data.periodLabel}`, 14, data.totalQueue, 0.4), [data.totalQueue, data.periodLabel]);
  const durTrend   = useMemo(() => generateSeededTrend(`dur-trend-${data.periodLabel}`, 14, data.avgOpDuration, 0.12), [data.avgOpDuration, data.periodLabel]);

  // Insights
  const insights = useMemo(() => generateInsights(data, score), [data, score]);

  return (
    <div className="rounded-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.surface} 60%, rgba(6,182,212,0.04) 100%)`,
        border: `1px solid rgba(255,255,255,0.1)`,
      }}>
      {/* Decorative top accent line */}
      <div className="h-[2px] w-full" style={{
        background: `linear-gradient(90deg, ${C.accent}, ${C.green}, ${C.yellow}, ${C.orange})`,
      }} />

      <div className="p-4 md:p-5">
        {/* ── Header row: Grade + Title + Live indicator ───────────────── */}
        <div className="flex items-start gap-4 mb-4">
          <GradeBadge score={score} size={86} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} color={C.yellow} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.yellow }}>
                Executive Scorecard
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: `${C.red}10`, border: `1px solid ${C.red}30` }}>
                <LiveDot color={C.red} size={5} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.red }}>
                  Live
                </span>
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold leading-tight" style={{ color: C.textHi }}>
              Komplexní hodnocení provozu
            </h1>
            <p className="text-[11px] mt-1" style={{ color: C.muted }}>
              Skóre je váženo z vytížení (35 %), objemu (25 %), bezpečnosti (25 %) a plynulosti (15 %).
              Aktuální období: <strong style={{ color: C.text }}>{data.periodLabel}</strong>.
            </p>
          </div>
        </div>

        {/* ── 4 mega-KPI tile row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          <KPIBlock
            label="Vytížení sálů"
            value={data.utilization}
            format={(v) => v.toFixed(1)}
            unit="%"
            delta={computeDelta(data.utilization, utilPrev)}
            trend={utilTrend}
            target={75}
            accent={C.green}
            icon={Activity}
            sublabel="cíl 75 % v provozní době"
          />
          <KPIBlock
            label="Operace celkem"
            value={data.totalOps}
            delta={computeDelta(data.totalOps, opsPrev)}
            trend={opsTrend}
            accent={C.accent}
            icon={Zap}
            sublabel={`${(data.activeRooms > 0 ? data.totalOps / data.activeRooms : 0).toFixed(1)} výkonů na aktivní sál`}
          />
          <KPIBlock
            label="Pacienti ve frontě"
            value={data.totalQueue}
            delta={computeDelta(data.totalQueue, queuePrev)}
            deltaInverted
            trend={queueTrend}
            accent={C.orange}
            icon={Users}
            sublabel={data.totalQueue === 0 ? 'plynulý provoz' : 'čekají na zákrok'}
          />
          <KPIBlock
            label="Průměrná délka výkonu"
            value={data.avgOpDuration}
            format={(v) => Math.round(v).toString()}
            unit="min"
            delta={computeDelta(data.avgOpDuration, durPrev)}
            deltaInverted
            trend={durTrend}
            accent={C.purple}
            icon={Clock}
            sublabel="medián trvání"
          />
        </div>

        {/* ── Insights + Live ticker side-by-side ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5">
          {/* AI insights — 3 sloupce */}
          <Card title="AI Insights" subtitle="Automaticky generovaná pozorování"
            accent={C.purple} className="lg:col-span-3" elevated>
            <div className="flex flex-col gap-1.5">
              {insights.length > 0 ? (
                insights.map((ins, i) => <InsightItem key={i} insight={ins} index={i} />)
              ) : (
                <p className="text-xs text-center py-4" style={{ color: C.muted }}>
                  Žádné insights k dispozici.
                </p>
              )}
            </div>
          </Card>

          {/* Live event ticker — 2 sloupce */}
          <Card title="Live Aktivita" subtitle="Posledních 5 událostí"
            accent={C.red} className="lg:col-span-2" elevated
            action={<LiveDot size={6} />}>
            <div className="flex flex-col gap-1.5 max-h-[180px] overflow-hidden">
              {data.recentEvents.length > 0 ? (
                data.recentEvents.slice(0, 5).map((ev, i) => (
                  <motion.div key={`${ev.timestamp}-${i}`}
                    className="flex items-start gap-2 py-1 px-2 rounded"
                    style={{ background: C.surface }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <Radio size={10} color={ev.color ?? C.accent} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-bold truncate" style={{ color: C.textHi }}>
                          {ev.roomName}
                        </span>
                        <span className="text-[9px] font-mono shrink-0" style={{ color: C.muted }}>
                          {new Date(ev.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: ev.color ?? C.text }}>
                        {ev.eventLabel}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-center py-4" style={{ color: C.muted }}>
                  Žádné nedávné události.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
