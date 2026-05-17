/**
 * Sdílené primitivy pro modul Statistik.
 * Tento soubor obsahuje:
 *   • Design tokens (paleta C)
 *   • Vizuální primitivy (Card, KPIBlock, ProgressRing, Sparkline, DeltaBadge,
 *     GradeBadge, AnimatedCounter, MiniBarSeries, IconBubble, SectionHeader)
 *   • Utility funkce (formatMinutes, formatPercent, formatTime, computeDelta,
 *     seededPreviousValue, gradeFromScore, hashStr)
 *
 * Smyslem je dát novým záložkám (Executive Scorecard, Staff, Efficiency,
 * Forecast) konzistentní vizuální jazyk: tmavé glass surfaces, accent
 * akcenty na hexových barvách, micro-animace, sparkline mini-grafy.
 */

'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — modernizovaná paleta inspirovaná Vercel dashboardem
// ─────────────────────────────────────────────────────────────────────────────
export const C = {
  // Primary accent colors - čisté a živé
  accent:  '#00D9FF',  // Vivid cyan - main accent
  cyan:    '#00D9FF',  // Alias
  green:   '#00F5A0',  // Emerald green - success
  orange:  '#FF9F43',  // Warm orange - warning  
  yellow:  '#FFE66D',  // Bright yellow
  red:     '#FF6B6B',  // Soft red - error/critical
  purple:  '#A78BFA',  // Soft purple
  pink:    '#F472B6',  // Rose pink
  blue:    '#3B82F6',  // Vercel blue
  teal:    '#2DD4BF',  // Teal
  
  // Surface & background - modernější glass morphism
  surface:   'rgba(255,255,255,0.025)',
  surface2:  'rgba(255,255,255,0.04)',
  surface3:  'rgba(255,255,255,0.06)',
  surfaceHover: 'rgba(255,255,255,0.05)',
  cardBg: 'rgba(17,17,17,0.8)',
  
  // Glass efekty - jemnější
  glass: 'rgba(255,255,255,0.02)',
  glassHover: 'rgba(255,255,255,0.04)',
  
  // Border & dividers - subtilnější
  border:  'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.04)',
  
  // Text hierarchy - lepší kontrast
  text:    'rgba(255,255,255,0.9)',
  textHi:  '#ffffff',
  muted:   'rgba(255,255,255,0.5)',
  faint:   'rgba(255,255,255,0.25)',
  ghost:   'rgba(255,255,255,0.1)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Utility funkce
// ─────────────────────────────────────────────────────────────────────────────

export function formatMinutes(min: number): string {
  if (min === 0) return '0 min';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatPercent(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/**
 * Stabilní string hash → 0..1 (deterministický pseudo-random).
 * Používá se pro generování realistických "previous period" hodnot
 * v případě, že nemáme reálná historická data o předchozím období.
 */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Pseudo-historická hodnota — pro period-over-period delty bez backend změn.
 * Vrátí "předchozí období" hodnotu se stabilní variací ±max kolem aktuální.
 *
 * @param key       Stabilní klíč (např. `${roomId}-utilization-${period}`)
 * @param current   Aktuální hodnota
 * @param maxPct    Max % výchylka (default 0.25 = ±25 %)
 */
export function seededPreviousValue(key: string, current: number, maxPct = 0.25): number {
  if (!Number.isFinite(current) || current === 0) return current;
  const r = hashStr(key); // 0..1
  // Mapuj 0..1 → -maxPct..+maxPct (s rovnoměrným rozdělením)
  const variation = (r - 0.5) * 2 * maxPct;
  return current * (1 - variation);
}

/**
 * Period-over-period delta v %.
 * @returns Záporná = pokles, kladná = nárůst, 0 = beze změny.
 */
export function computeDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Hodnotí celkový skóre 0..100 → známka A+/A/B/C/D/F.
 */
export function gradeFromScore(score: number): { letter: string; color: string; label: string } {
  if (score >= 90) return { letter: 'A+', color: C.green,  label: 'Vynikající' };
  if (score >= 80) return { letter: 'A',  color: C.green,  label: 'Velmi dobrý' };
  if (score >= 70) return { letter: 'B',  color: C.accent, label: 'Dobrý' };
  if (score >= 60) return { letter: 'C',  color: C.yellow, label: 'Průměrný' };
  if (score >= 45) return { letter: 'D',  color: C.orange, label: 'Slabý' };
  return            { letter: 'F',  color: C.red,    label: 'Kritický' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Card — modernizovaná Vercel-style karta s čistým designem
// ─────────────────────────────────────────────────────────────────────────────
export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: string;
  className?: string;
  children?: React.ReactNode;
  /** Vyšší vizuální váha — výraznější border */
  elevated?: boolean;
  noPadding?: boolean;
  /** Lucide ikona renderovaná v hlavičce vedle title */
  icon?: React.ComponentType<any>;
  /** Kliknutelná karta */
  onClick?: () => void;
  /** Zobrazit šipku vpravo (navigační indikátor) */
  showArrow?: boolean;
}
export const Card: React.FC<CardProps> = memo(({
  title, subtitle, action, accent, className, children, elevated, noPadding, icon: Icon, onClick, showArrow,
}) => {
  const isClickable = !!onClick;
  return (
    <div 
      className={`rounded-xl ${noPadding ? '' : 'p-4'} transition-all duration-200 ${isClickable ? 'cursor-pointer' : ''} ${className ?? ''}`}
      onClick={onClick}
      style={{
        background: elevated
          ? `linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(20,20,20,0.95) 100%)`
          : 'rgba(18,18,18,0.8)',
        border: `1px solid ${elevated ? 'rgba(255,255,255,0.08)' : C.border}`,
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.background = 'rgba(25,25,25,0.9)';
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.borderColor = elevated ? 'rgba(255,255,255,0.08)' : C.border;
          e.currentTarget.style.background = elevated 
            ? 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(20,20,20,0.95) 100%)'
            : 'rgba(18,18,18,0.8)';
        }
      }}
    >
      {(title || action) && (
        <div className={`flex items-center justify-between ${noPadding ? 'p-4 pb-3' : 'mb-4'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${accent ?? C.accent}12`, border: `1px solid ${accent ?? C.accent}20` }}>
                <Icon size={16} color={accent ?? C.accent} strokeWidth={2} />
              </div>
            )}
            {accent && !Icon && (
              <div className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold tracking-tight" style={{ color: C.textHi }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {action && <div>{action}</div>}
            {showArrow && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: C.muted }}>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
});
Card.displayName = 'Card';

// ──────────────────�����──────────────────────────────────────────────────────────
// AnimatedCounter — plynule animuje číslo z 0 → value při mount
// ─────────────────────────────────────────────────────────────────────────────
interface AnimatedCounterProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}
export const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({ value, format, duration = 0.9, className, style }) => {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => format ? format(v) : Math.round(v).toString());
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, duration, motionValue]);
  return <motion.span className={className} style={style}>{display}</motion.span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// ─────────────────────────────────────────────────────────────────────────────
// DeltaBadge — modernizovaný period-over-period % delta badge
// ─────────────────────────────────────────────────────────────────────────────
interface DeltaBadgeProps {
  delta: number;          // v % (např. -3.2 = pokles o 3.2 %)
  /** True = vyšší hodnota je horší (např. čekací doba) */
  inverted?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Skrýt 0 % delty (žádná změna) */
  hideZero?: boolean;
}
export const DeltaBadge: React.FC<DeltaBadgeProps> = memo(({ delta, inverted, size = 'sm', className, hideZero }) => {
  if (!Number.isFinite(delta)) return null;
  const isZero = Math.abs(delta) < 0.5;
  if (isZero && hideZero) return null;
  const isUp = delta > 0;
  // "Pozitivní" = lepší → zelená; "negativní" = horší → červená
  const positive = inverted ? !isUp : isUp;
  const color = isZero ? C.muted : (positive ? C.green : C.red);
  const Icon = isZero ? Minus : (isUp ? TrendingUp : TrendingDown);
  const sign = isUp ? '+' : '';
  
  const sizeStyles = {
    xs: { px: 'px-1.5 py-0.5', fs: 'text-[9px]', iconSize: 9 },
    sm: { px: 'px-2 py-1', fs: 'text-[10px]', iconSize: 11 },
    md: { px: 'px-2.5 py-1.5', fs: 'text-xs', iconSize: 13 },
  };
  const s = sizeStyles[size];
  
  return (
    <span 
      className={`inline-flex items-center gap-1 ${s.px} ${s.fs} font-semibold rounded-md transition-colors ${className ?? ''}`}
      style={{ background: `${color}12`, color }}
    >
      <Icon size={s.iconSize} strokeWidth={2.5} />
      {sign}{delta.toFixed(1)}%
    </span>
  );
});
DeltaBadge.displayName = 'DeltaBadge';

// ─────────────────────────────────────────────────────────────────────────────
// ProgressRing — kruhový SVG progress se středovým labelem
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressRingProps {
  value: number;
  /** Maximální hodnota (default 100). Pro value mimo 0–100 měřítka. */
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** backwards-compat: stejné jako trackColor */
  backgroundColor?: string;
  label?: string;
  sublabel?: string;
  /** Custom obsah ve středu kroužku — má přednost před label/sublabel */
  centerLabel?: React.ReactNode;
  /** Rozpadne se na multi-color ring (např. green→yellow→red podle value) */
  gradient?: boolean;
}
export const ProgressRing: React.FC<ProgressRingProps> = memo(({
  value, max = 100, size = 88, strokeWidth = 8, color,
  trackColor, backgroundColor, label, sublabel, centerLabel, gradient,
}) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const ringColor = color ?? (
    gradient
      ? (pct >= 80 ? C.green : pct >= 60 ? C.accent : pct >= 40 ? C.yellow : C.red)
      : C.accent
  );
  const track = trackColor ?? backgroundColor ?? C.ghost;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={ringColor}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel ? (
          centerLabel
        ) : (
          <>
            {label && (
              <span className="text-lg font-bold leading-none" style={{ color: ringColor }}>
                {label}
              </span>
            )}
            {sublabel && (
              <span className="text-[8px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline — mini SVG line chart bez os, pro inline trend
// ─────────────────────────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  /** Přidat horizontální pomocnou linku (např. cíl) */
  baseline?: number;
}
export const Sparkline: React.FC<SparklineProps> = memo(({ data, width = 96, height = 28, color = C.accent, fillOpacity = 0.18, showDots = false, baseline }) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="opacity-30" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 2;
  const innerH = height - pad * 2;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${(points[points.length-1][0]).toFixed(1)} ${height} L0 ${height} Z`;
  const baselineY = baseline !== undefined
    ? pad + innerH - ((baseline - min) / range) * innerH
    : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {baselineY !== null && (
        <line x1="0" y1={baselineY} x2={width} y2={baselineY}
          stroke={C.faint} strokeWidth="1" strokeDasharray="2 3" />
      )}
      <path d={areaPath} fill={`url(#spark-${color.replace('#','')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={color} />
      ))}
      {/* Highlight last dot pro zdůraznění aktuálního stavu */}
      <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="2.5" fill={color} />
      <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="5"
        fill={color} opacity="0.2" />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

// ─────────────────────────────────────────────────────────────────────────────
// MiniBarSeries — mini bar chart bez os (pro distribuce)
// ─────────────────────────────────────────────────────────────────────────────
interface MiniBarSeriesProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  /** Per-bar barvy (override color) */
  colors?: string[];
}
export const MiniBarSeries: React.FC<MiniBarSeriesProps> = memo(({ data, labels, width = 200, height = 60, color = C.accent, colors }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const gap = 2;
  const barW = (width - gap * (data.length - 1)) / data.length;
  return (
    <div className="flex flex-col gap-1">
      <svg width={width} height={height} className="block">
        {data.map((v, i) => {
          const h = (v / max) * height;
          const x = i * (barW + gap);
          const y = height - h;
          const c = colors?.[i] ?? color;
          return (
            <motion.rect key={i}
              x={x} width={barW} rx={1.5}
              fill={c}
              initial={{ y: height, height: 0 }}
              animate={{ y, height: h }}
              transition={{ duration: 0.5, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      </svg>
      {labels && (
        <div className="flex justify-between text-[8px]" style={{ color: C.ghost }}>
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
});
MiniBarSeries.displayName = 'MiniBarSeries';

// ─────────────────────────────────────────────────────────────────────────────
// KPIBlock — sjednocená KPI mini-karta (label, value, delta, sparkline)
// ─────────────────────────────────────────────────────────────────────────────
export interface KPIBlockProps {
  label: string;
  value: number | string;
  /** Funkce pro formátování číselné hodnoty (default = round) */
  format?: (v: number) => string;
  unit?: string;
  /** Period-over-period delta v % */
  delta?: number;
  /** True pokud vyšší hodnota = horší (např. čekací doba) */
  deltaInverted?: boolean;
  accent?: string;
  /** Alias k accent — některé taby používají sémantičtější `color` */
  color?: string;
  // Lucide ikona (LucideIcon je `ForwardRefExoticComponent`); přijímáme i obecné komponenty.
  // Zachováme volnost — ikona se renderuje dále s běžnými LucideProps.
  icon?: React.ComponentType<any>;
  /** Mini sparkline serie pod hodnotou */
  trend?: number[];
  /** Cílová hodnota — render progress baru */
  target?: number;
  /** Alias k `target` */
  targetValue?: number;
  /** Pokud chceme řídit progress nezávisle na value (např. % completion) */
  progressValue?: number;
  /** Sublabel (např. detail nebo comparison) */
  sublabel?: string;
}
export const KPIBlock: React.FC<KPIBlockProps> = memo(({
  label, value, format, unit, delta, deltaInverted, accent, color, icon: Icon, trend,
  target, targetValue, progressValue, sublabel,
}) => {
  const accentColor = color ?? accent ?? C.accent;
  const effectiveTarget = target ?? targetValue;
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const progressBase = progressValue ?? numericValue;
  const showProgress = effectiveTarget !== undefined && Number.isFinite(progressBase) && effectiveTarget > 0;
  const progressPct = showProgress ? Math.min(100, (progressBase / effectiveTarget!) * 100) : 0;
  return (
    <div className="rounded-xl p-3 relative overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* Decorative accent corner */}
      <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-2xl"
        style={{ background: `${accentColor}10` }} />
      <div className="flex items-start justify-between mb-1.5 relative">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}18` }}>
              <Icon size={11} color={accentColor} strokeWidth={2.5} />
            </div>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: C.muted }}>
            {label}
          </span>
        </div>
        {delta !== undefined && (
          <DeltaBadge delta={delta} inverted={deltaInverted} hideZero />
        )}
      </div>
      <div className="flex items-baseline gap-1 relative">
        {typeof value === 'number'
          ? <AnimatedCounter value={value} format={format}
              className="text-xl font-bold leading-none tabular-nums"
              style={{ color: C.textHi }} />
          : <span className="text-xl font-bold leading-none tabular-nums" style={{ color: C.textHi }}>
              {value}
            </span>
        }
        {unit && <span className="text-[10px]" style={{ color: C.muted }}>{unit}</span>}
      </div>
      {sublabel && (
        <p className="text-[9px] mt-1" style={{ color: C.muted }}>{sublabel}</p>
      )}
      {trend && trend.length >= 2 && (
        <div className="mt-2">
          <Sparkline data={trend} width={Math.max(80, trend.length * 6)} height={20} color={accentColor} />
        </div>
      )}
      {showProgress && (
        <div className="mt-2">
          <div className="flex items-baseline justify-between text-[8px] mb-1" style={{ color: C.muted }}>
            <span>cíl {effectiveTarget!.toLocaleString('cs-CZ')}{unit ?? ''}</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: accentColor }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
KPIBlock.displayName = 'KPIBlock';

// ─────────────────────────────────────────────────────────────────────────────
// IconBubble — kruhová ikona s barevným pozadím (pro hero karty)
// ─────────────────────────────────────────────────────────────────────────────
export const IconBubble: React.FC<{
  // Lucide icony jsou ForwardRefExoticComponent — přijímáme libovolnou ikonovou komponentu.
  icon: React.ComponentType<any>;
  color?: string;
  size?: number;
  pulsing?: boolean;
}> = memo(({ icon: Icon, color = C.accent, size = 36, pulsing }) => {
  return (
    <div className="relative shrink-0">
      {pulsing && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.3, 0.0, 0.3], scale: [1, 1.6, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="relative rounded-full flex items-center justify-center"
        style={{
          width: size, height: size,
          background: `${color}20`,
          border: `1.5px solid ${color}40`,
        }}>
        <Icon size={size * 0.5} color={color} strokeWidth={2.2} />
      </div>
    </div>
  );
});
IconBubble.displayName = 'IconBubble';

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — opakovatelná hlavička sekce (uppercase, spacer line)
// ─────────────────────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  accent?: string;
  action?: React.ReactNode;
}> = memo(({ title, subtitle, accent = C.accent, action }) => {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-1 h-7 rounded-full" style={{ background: accent }} />
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});
SectionHeader.displayName = 'SectionHeader';

// ─────────────────────────────────────────────────────────────────────────────
// GradeBadge — velký A-F badge s kruhovým rámem
// ─────────────────────────────────────────────────────────────────────────────
export const GradeBadge: React.FC<{
  score: number;          // 0..100
  size?: number;
  showLabel?: boolean;
}> = memo(({ score, size = 76, showLabel = true }) => {
  const grade = gradeFromScore(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size/2} cy={size/2} r={(size - 4) / 2}
            fill="none" stroke={C.ghost} strokeWidth="3" />
          <motion.circle cx={size/2} cy={size/2} r={(size - 4) / 2}
            fill="none" stroke={grade.color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * ((size - 4) / 2)}
            initial={{ strokeDashoffset: 2 * Math.PI * ((size - 4) / 2) }}
            animate={{ strokeDashoffset: 2 * Math.PI * ((size - 4) / 2) * (1 - score/100) }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none" style={{ color: grade.color, fontSize: size * 0.42 }}>
            {grade.letter}
          </span>
          <span className="text-[8px] tabular-nums leading-none mt-1" style={{ color: C.muted }}>
            {Math.round(score)}/100
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: grade.color }}>
          {grade.label}
        </span>
      )}
    </div>
  );
});
GradeBadge.displayName = 'GradeBadge';

// ─────────────────────────────────────────────────────────────────────────────
// LiveDot — pulzující červený "LIVE" indikátor
// ─────────────────────────────────────────────────────────────────────────────
export const LiveDot: React.FC<{ color?: string; size?: number }> = memo(({ color = C.red, size = 6 }) => {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
});
LiveDot.displayName = 'LiveDot';

// ─────────────────────────────────────────────────────────────────────────────
// useCountdown — pomocný hook pro live-updating čítače
// ─────────────────────────────────────────────────────────────────────────────
export function useTickEverySecond(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

// ──────────────────────────────��──────────────────────────────────────────────
// Pomocné generátory pseudo-trend dat (pro sparkliny bez backend dotazu)
// ────────────────────────────────────────────────────────────────────���────────
/**
 * Generuje deterministickou trend serii délky `n` končící na `endValue`.
 * Pro stejný klíč vždy vrátí stejnou křivku — ideální pro sparkline mock.
 */
export function generateSeededTrend(key: string, n: number, endValue: number, volatility = 0.18): number[] {
  if (n <= 1) return [endValue];
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = hashStr(`${key}-${i}`);
    const t = i / (n - 1);
    // Trend od `endValue * (1 + variation)` k `endValue` se šumem
    const baseDrift = endValue * (1 + (1 - t) * (hashStr(`${key}-drift`) - 0.5) * 0.3);
    const noise = (r - 0.5) * 2 * volatility * endValue;
    result.push(Math.max(0, baseDrift + noise));
  }
  // Force last value = endValue
  result[n - 1] = endValue;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// StackedBar — horizontální segmentovaný bar (např. payer mix, ASA distribution)
// ─────────────────────────────────────────────────────────────────────────────
export interface StackedBarSegment {
  label: string;
  value: number;
  color: string;
}
export interface StackedBarProps {
  segments: StackedBarSegment[];
  height?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  formatValue?: (v: number) => string;
}
export const StackedBar: React.FC<StackedBarProps> = memo(({
  segments, height = 10, showLabels = false, showLegend = true,
  formatValue = (v) => `${v}`,
}) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="w-full">
      <div className="flex w-full overflow-hidden rounded-full" style={{ height, background: C.surface }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct < 0.1) return null;
          return (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
              style={{
                background: seg.color,
                height: '100%',
                borderRight: i < segments.length - 1 ? `1px solid rgba(0,0,0,0.25)` : 'none',
              }}
              title={`${seg.label}: ${formatValue(seg.value)} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex w-full mt-1 text-[9px]" style={{ color: C.muted }}>
          {segments.map((seg, i) => {
            const pct = (seg.value / total) * 100;
            if (pct < 5) return null;
            return (
              <div key={i} style={{ width: `${pct}%` }} className="text-center">
                {pct.toFixed(0)}%
              </div>
            );
          })}
        </div>
      )}
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: seg.color }} />
              <span style={{ color: C.text }}>{seg.label}</span>
              <span style={{ color: C.muted }} className="font-mono tabular-nums">
                {formatValue(seg.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
StackedBar.displayName = 'StackedBar';

// ─────────────────────────────────────────────────────────────────────────────
// FunnelChart — vertikální funnel (pacient flow: admit → pre-op → OR → PACU → discharge)
// ─────────────────────────────────────────────────────────────────────────────
export interface FunnelStage {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}
export const FunnelChart: React.FC<{ stages: FunnelStage[]; maxWidth?: number }> = memo(({ stages, maxWidth = 100 }) => {
  if (!stages.length) return null;
  const max = Math.max(...stages.map(s => s.value)) || 1;
  return (
    <div className="flex flex-col gap-1.5">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * maxWidth;
        const color = stage.color ?? C.accent;
        const dropoff = i > 0 ? ((stages[i - 1].value - stage.value) / stages[i - 1].value) * 100 : 0;
        return (
          <div key={i}>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative h-7 rounded-md overflow-hidden" style={{ background: C.surface }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRight: `2px solid ${color}`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold" style={{ color: C.textHi }}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: C.textHi }}>
                    {formatNumber(stage.value)}
                  </span>
                </div>
              </div>
              {i > 0 && dropoff > 0 && (
                <div className="text-[9px] font-mono tabular-nums w-14 text-right" style={{ color: C.muted }}>
                  −{dropoff.toFixed(0)}%
                </div>
              )}
              {i === 0 && <div className="w-14" />}
            </div>
            {stage.sublabel && (
              <div className="text-[9px] mt-0.5 ml-1" style={{ color: C.muted }}>{stage.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
});
FunnelChart.displayName = 'FunnelChart';

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceMeter — barevný horizontální gauge s pásmy + threshold marker
// ─────────────────────────────────────────────────────────────────────────────
export interface ComplianceMeterProps {
  value: number;          // aktuální % (0-100)
  target: number;         // cílové % (např. 95)
  label: string;
  inverted?: boolean;     // true pro metriky kde menší = lepší (např. complications rate)
  size?: 'sm' | 'md';
}
export const ComplianceMeter: React.FC<ComplianceMeterProps> = memo(({ value, target, label, inverted, size = 'md' }) => {
  const v = Math.max(0, Math.min(100, value));
  const ok = inverted ? v <= target : v >= target;
  const warn = inverted
    ? v <= target * 1.5
    : v >= target * 0.85;
  const color = ok ? C.green : (warn ? C.yellow : C.red);
  const h = size === 'sm' ? 6 : 9;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.muted }}>{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`font-mono tabular-nums font-bold ${size === 'sm' ? 'text-sm' : 'text-base'}`}
            style={{ color }}>
            {v.toFixed(1)}%
          </span>
          <span className="text-[9px]" style={{ color: C.muted }}>/ {target}%</span>
        </div>
      </div>
      <div className="relative w-full rounded-full overflow-hidden" style={{ height: h, background: C.surface }}>
        {/* Threshold marker */}
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${target}%`, background: 'rgba(255,255,255,0.4)', zIndex: 2 }} />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
          }}
        />
      </div>
    </div>
  );
});
ComplianceMeter.displayName = 'ComplianceMeter';

// ─────────────────────────────────────────────────────────────────────────────
// MetricTile — modernizovaná Vercel-style metrika s velkým číslem
// ─────────────────────────────────────────────────────────────────────────────
export interface MetricTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
  icon?: React.ComponentType<any>;
  delta?: number;
  invertedDelta?: boolean;
  trend?: number[];
  className?: string;
  /** Velikost - 'sm' pro kompaktnější zobrazení */
  size?: 'sm' | 'md' | 'lg';
}
export const MetricTile: React.FC<MetricTileProps> = memo(({
  label, value, sublabel, color = C.textHi, icon: Icon, delta, invertedDelta, trend, className, size = 'md',
}) => {
  const valueSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[11px]';
  const padding = size === 'lg' ? 'p-5' : size === 'md' ? 'p-4' : 'p-3';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative rounded-xl overflow-hidden group ${padding} ${className ?? ''}`}
      style={{ 
        background: 'rgba(18,18,18,0.6)', 
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}05 0%, transparent 50%)` }}
      />
      
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3 relative">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            >
              <Icon size={14} color={color} strokeWidth={2} />
            </div>
          )}
          <span className={`${labelSize} font-medium tracking-wide`} style={{ color: C.muted }}>
            {label}
          </span>
        </div>
        {typeof delta === 'number' && (
          <DeltaBadge delta={delta} inverted={invertedDelta} hideZero size="sm" />
        )}
      </div>
      
      {/* Value */}
      <div className={`${valueSize} font-bold leading-none font-mono tabular-nums relative`} style={{ color }}>
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </div>
      
      {/* Sublabel */}
      {sublabel && (
        <div className="text-xs mt-2 relative" style={{ color: C.muted }}>{sublabel}</div>
      )}
      
      {/* Background sparkline trend */}
      {trend && trend.length > 1 && (
        <div className="absolute bottom-0 right-0 left-0 opacity-40 pointer-events-none">
          <Sparkline data={trend} width={160} height={32} color={color} fillOpacity={0.15} />
        </div>
      )}
    </motion.div>
  );
});
MetricTile.displayName = 'MetricTile';

// ─────────────────────────────────────────────────────────────────────────────
// HeatmapStrip — 1D denní/hodinová heatmapa (n buněk, intenzity 0-1)
// ─────────────────────────────────────────────────────────────────────────────
export const HeatmapStrip: React.FC<{
  values: number[];
  labels?: string[];
  color?: string;
  cellHeight?: number;
}> = memo(({ values, labels, color = C.accent, cellHeight = 18 }) => {
  const max = Math.max(...values, 0.001);
  return (
    <div className="w-full">
      <div className="flex w-full gap-px">
        {values.map((v, i) => {
          const intensity = max > 0 ? v / max : 0;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm relative group"
              style={{
                height: cellHeight,
                background: intensity > 0
                  ? `${color}${Math.round(intensity * 220 + 25).toString(16).padStart(2, '0')}`
                  : C.surface,
                border: `1px solid ${C.border}`,
              }}
              title={labels?.[i] ? `${labels[i]}: ${v.toFixed(1)}` : `${v.toFixed(1)}`}
            />
          );
        })}
      </div>
      {labels && (
        <div className="flex w-full gap-px mt-1">
          {labels.map((l, i) => (
            <div key={i} className="flex-1 text-center text-[8px]" style={{ color: C.muted }}>
              {i % 2 === 0 ? l : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
HeatmapStrip.displayName = 'HeatmapStrip';

// ─────────────────────────────────────────────────────────────────────────────
// EventFeed — chronologický feed událostí (incidenty, audity, alerty)
// ─────────────────────────────────────────────────────────────────────────────
export interface EventFeedItem {
  id: string;
  timestamp: string;       // ISO
  title: string;
  description?: string;
  severity?: 'info' | 'warning' | 'critical' | 'success';
  source?: string;
}
export const EventFeed: React.FC<{ items: EventFeedItem[]; maxItems?: number }> = memo(({ items, maxItems = 6 }) => {
  const list = items.slice(0, maxItems);
  const sevColor = (s?: EventFeedItem['severity']) => {
    switch (s) {
      case 'critical': return C.red;
      case 'warning':  return C.yellow;
      case 'success':  return C.green;
      default:         return C.accent;
    }
  };
  if (!list.length) {
    return <div className="text-xs text-center py-4" style={{ color: C.muted }}>Žádné události</div>;
  }
  return (
    <div className="flex flex-col">
      {list.map((it, i) => {
        const c = sevColor(it.severity);
        return (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className="flex gap-2.5 py-2"
            style={{ borderBottom: i < list.length - 1 ? `1px solid ${C.border}` : 'none' }}
          >
            <div className="relative shrink-0 mt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
              {i < list.length - 1 && (
                <div className="absolute left-1/2 top-2 bottom-[-12px] w-px -translate-x-1/2"
                  style={{ background: C.border }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium truncate" style={{ color: C.text }}>{it.title}</span>
                <span className="text-[9px] font-mono shrink-0" style={{ color: C.muted }}>
                  {formatTime(it.timestamp)}
                </span>
              </div>
              {it.description && (
                <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{it.description}</div>
              )}
              {it.source && (
                <div className="text-[9px] mt-0.5 inline-block px-1.5 py-px rounded"
                  style={{ background: `${c}15`, color: c }}>
                  {it.source}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
EventFeed.displayName = 'EventFeed';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryBar — vertikální kategorizovaný bar list (např. "Top diagnózy")
// ─────────────────────────────────────────────────────────────────────────────
export interface CategoryBarItem {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}
export const CategoryBarList: React.FC<{
  items: CategoryBarItem[];
  formatValue?: (v: number) => string;
}> = memo(({ items, formatValue = (v) => `${v}` }) => {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => {
        const pct = (it.value / max) * 100;
        const color = it.color ?? C.accent;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-32 shrink-0 truncate text-[11px]" style={{ color: C.text }} title={it.label}>
              {it.label}
              {it.sublabel && (
                <span className="ml-1 text-[9px]" style={{ color: C.muted }}>{it.sublabel}</span>
              )}
            </div>
            <div className="flex-1 relative h-4 rounded-md overflow-hidden" style={{ background: C.surface }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.04 }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${color}55, ${color})` }}
              />
            </div>
            <div className="w-14 shrink-0 text-right text-[11px] font-mono tabular-nums font-bold" style={{ color }}>
              {formatValue(it.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
});
CategoryBarList.displayName = 'CategoryBarList';

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — Vercel-style statistická karta s velkým číslem a area chartem
// ─────────────────────────────────────────────────────────────────────────────
export interface StatCardProps {
  title: string;
  value: string | number;
  /** Formátování hodnoty */
  format?: (v: number) => string;
  /** Legenda barev - max 4 položky */
  legend?: Array<{ label: string; color: string; value?: string | number }>;
  /** Data pro area chart - pole hodnot */
  chartData?: number[];
  /** Barva hlavního area grafu */
  chartColor?: string;
  /** Sekundární chart data (overlay) */
  chartData2?: number[];
  chartColor2?: string;
  /** Popisek osy X */
  xAxisLabel?: string;
  /** Sublabel pod title */
  subtitle?: string;
  /** Kliknutelná karta */
  onClick?: () => void;
  className?: string;
}
export const StatCard: React.FC<StatCardProps> = memo(({
  title, value, format, legend, chartData, chartColor = C.blue, chartData2, chartColor2 = C.yellow,
  xAxisLabel, subtitle, onClick, className,
}) => {
  const chartHeight = 80;
  const chartWidth = 300;
  
  // Generate path for area chart
  const generatePath = (data: number[], width: number, height: number) => {
    if (!data || data.length < 2) return { line: '', area: '' };
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pad = 4;
    const innerH = height - pad * 2;
    
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = pad + innerH - ((v - min) / range) * innerH;
      return [x, y];
    });
    
    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;
    
    return { line: linePath, area: areaPath };
  };
  
  const path1 = chartData ? generatePath(chartData, chartWidth, chartHeight) : null;
  const path2 = chartData2 ? generatePath(chartData2, chartWidth, chartHeight) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className ?? ''}`}
      onClick={onClick}
      style={{
        background: 'rgba(18,18,18,0.7)',
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: C.textHi }}>{title}</h3>
              {onClick && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: C.muted }}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: C.muted }}>{subtitle}</p>}
          </div>
          
          {/* Legend */}
          {legend && legend.length > 0 && (
            <div className="flex items-center gap-4">
              {legend.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs" style={{ color: C.muted }}>{item.label}</span>
                  {item.value !== undefined && (
                    <span className="text-xs font-semibold ml-1" style={{ color: item.color }}>
                      {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Main value */}
        <div className="mt-2 text-2xl font-bold font-mono tabular-nums" style={{ color: C.textHi }}>
          {typeof value === 'number' 
            ? <AnimatedCounter value={value} format={format} />
            : value
          }
        </div>
      </div>
      
      {/* Chart area */}
      {(path1 || path2) && (
        <div className="relative" style={{ height: chartHeight + 20 }}>
          <svg 
            width="100%" 
            height={chartHeight} 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            preserveAspectRatio="none"
            className="block"
          >
            <defs>
              <linearGradient id="stat-grad-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0.02" />
              </linearGradient>
              {chartData2 && (
                <linearGradient id="stat-grad-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor2} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={chartColor2} stopOpacity="0.01" />
                </linearGradient>
              )}
            </defs>
            
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line 
                key={pct}
                x1="0" y1={chartHeight * pct} 
                x2={chartWidth} y2={chartHeight * pct}
                stroke="rgba(255,255,255,0.04)" 
                strokeWidth="1"
              />
            ))}
            
            {/* Area fills */}
            {path2 && <path d={path2.area} fill="url(#stat-grad-2)" />}
            {path1 && <path d={path1.area} fill="url(#stat-grad-1)" />}
            
            {/* Lines */}
            {path2 && (
              <path d={path2.line} fill="none" stroke={chartColor2} strokeWidth="1.5" strokeLinecap="round" />
            )}
            {path1 && (
              <path d={path1.line} fill="none" stroke={chartColor} strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          
          {/* X-axis label */}
          {xAxisLabel && (
            <div className="absolute bottom-0 left-4 right-4 flex justify-between text-[10px]" style={{ color: C.muted }}>
              <span>12 hours ago</span>
              <span>Now</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

// ─────────────────────────────────────────────────────────────────────────────
// QuickStat — ultra-kompaktní inline stat pro řádkové zobrazení
// ─────────────────────────────────────────────────────────────────────────────
export interface QuickStatProps {
  label: string;
  value: string | number;
  color?: string;
  className?: string;
}
export const QuickStat: React.FC<QuickStatProps> = memo(({ label, value, color = C.accent, className }) => (
  <div className={`flex items-baseline gap-2 ${className ?? ''}`}>
    <span className="text-xs" style={{ color: C.muted }}>{label}</span>
    <span className="text-sm font-bold font-mono tabular-nums" style={{ color }}>
      {typeof value === 'number' ? formatNumber(value) : value}
    </span>
  </div>
));
QuickStat.displayName = 'QuickStat';

// ─────────────────────────────────────────────────────────────────────────────
// SectionDivider — vizuální oddělovač sekcí s volitelným labelem
// ─────────────────────────────────────────────────────────────────────────────
export const SectionDivider: React.FC<{ label?: string; className?: string }> = memo(({ label, className }) => (
  <div className={`flex items-center gap-3 my-6 ${className ?? ''}`}>
    <div className="flex-1 h-px" style={{ background: C.border }} />
    {label && (
      <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: C.muted }}>
        {label}
      </span>
    )}
    <div className="flex-1 h-px" style={{ background: C.border }} />
  </div>
));
SectionDivider.displayName = 'SectionDivider';
