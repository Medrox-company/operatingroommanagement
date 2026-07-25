'use client';

import React from 'react';
import { C } from './shared';

/* =============================================================================
   AppCharts — čitelné grafy v jazyce aplikace (bez recharts)
   Recharts grafy s 9–10px fonty, 3% mřížkou a 20% průhledností byly na tmavém
   podkladu prakticky nečitelné. Tyto primitivy staví na stejném vizuálu jako
   zbytek aplikace: plné barvy, tučné hodnoty, jasné popisky, glass podklad.
   ========================================================================== */

/** Hodnota → čitelný krátký zápis (1 200 → 1,2 k) */
const short = (n: number): string =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} k` : String(Math.round(n * 10) / 10);

// ─────────────────────────────────────────────────────────────────────────────
// BarList — horizontální žebříček (nejčitelnější forma pro srovnání položek)
// ─────────────────────────────────────────────────────────────────────────────
export interface BarItem {
  label: string;
  value: number;
  /** Barva pruhu; výchozí = accent */
  color?: string;
  /** Volitelný popisek vpravo místo čísla (např. „82 %") */
  display?: string;
  /** Druhý řádek popisku pod názvem */
  sub?: string;
}

export const BarList: React.FC<{
  items: BarItem[];
  /** Maximum pro škálu; výchozí = nejvyšší hodnota */
  max?: number;
  /** Zobrazit pořadové číslo vlevo */
  ranked?: boolean;
  /** Výška pruhu v px */
  barHeight?: number;
  emptyText?: string;
}> = ({ items, max, ranked = false, barHeight = 8, emptyText = 'Žádná data' }) => {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs py-6 text-center" style={{ color: C.faint }}>
        {emptyText}
      </p>
    );
  }
  const peak = Math.max(max ?? 0, ...items.map(i => i.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => {
        const color = it.color || C.accent;
        const pct = Math.max(0, Math.min(100, (it.value / peak) * 100));
        return (
          <div key={`${it.label}-${i}`}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {ranked && (
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 tabular-nums"
                    style={{ background: `${color}1f`, color }}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="text-[13px] font-semibold truncate" style={{ color: C.text }}>
                  {it.label}
                </span>
                {it.sub && (
                  <span className="text-[11px] truncate shrink-0" style={{ color: C.faint }}>
                    {it.sub}
                  </span>
                )}
              </div>
              <span className="text-[14px] font-bold tabular-nums shrink-0" style={{ color }}>
                {it.display ?? short(it.value)}
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: barHeight, background: 'var(--stats-ghost)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}CC, ${color})`,
                  boxShadow: `0 0 12px ${color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColumnChart — svislé sloupce s hodnotou nad sloupcem a popiskem pod ním
// ─────────────────────────────────────────────────────────────────────────────
export interface ColumnItem {
  label: string;
  value: number;
  color?: string;
  /** Zvýraznit sloupec (např. dnešek) */
  highlight?: boolean;
}

export const ColumnChart: React.FC<{
  items: ColumnItem[];
  height?: number;
  /** Formátovač hodnoty nad sloupcem */
  format?: (v: number) => string;
  emptyText?: string;
}> = ({ items, height = 150, format, emptyText = 'Žádná data' }) => {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs py-6 text-center" style={{ color: C.faint }}>
        {emptyText}
      </p>
    );
  }
  const peak = Math.max(...items.map(i => i.value), 1);

  return (
    <div className="relative" style={{ paddingTop: 18 }}>
      {/* Vodicí linky */}
      <div className="absolute inset-x-0 pointer-events-none" style={{ top: 18, height }}>
        {[0, 0.5, 1].map(f => (
          <div
            key={f}
            className="absolute left-0 right-0"
            style={{ top: `${f * 100}%`, height: 1, background: 'var(--stats-border)' }}
          />
        ))}
      </div>

      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {items.map((it, i) => {
          const color = it.color || C.accent;
          const h = Math.max(3, (it.value / peak) * 100);
          return (
            <div key={`${it.label}-${i}`} className="flex-1 min-w-0 flex flex-col justify-end items-center h-full">
              <span
                className="text-[11px] font-bold tabular-nums mb-1.5 leading-none"
                style={{ color: it.value > 0 ? color : C.faint }}
              >
                {format ? format(it.value) : short(it.value)}
              </span>
              <div
                className="w-full rounded-t-[6px] transition-all duration-500"
                style={{
                  height: `${h}%`,
                  background: it.highlight
                    ? `linear-gradient(180deg, ${color}, ${color}99)`
                    : `linear-gradient(180deg, ${color}B3, ${color}4D)`,
                  boxShadow: it.highlight ? `0 0 16px ${color}55` : undefined,
                  outline: it.highlight ? `1px solid ${color}` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Popisky */}
      <div className="flex gap-1.5 mt-2">
        {items.map((it, i) => (
          <span
            key={`${it.label}-lbl-${i}`}
            className="flex-1 min-w-0 text-center text-[11px] font-semibold truncate"
            style={{ color: it.highlight ? C.text : C.muted }}
          >
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SegmentBar — jeden vodorovný pruh složený z podílů + legenda (náhrada koláče)
// ─────────────────────────────────────────────────────────────────────────────
export const SegmentBar: React.FC<{
  items: { name: string; value: number; color: string }[];
  unit?: string;
}> = ({ items, unit = '' }) => {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div
        className="flex rounded-full overflow-hidden"
        style={{ height: 14, background: 'var(--stats-ghost)' }}
      >
        {items.map(s =>
          s.value > 0 ? (
            <div
              key={s.name}
              title={`${s.name}: ${s.value}${unit}`}
              className="h-full transition-all duration-500"
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.color,
                boxShadow: `0 0 10px ${s.color}55`,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4">
        {items.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] truncate" style={{ color: C.muted }}>
              {s.name}
            </span>
            <span className="text-[13px] font-bold ml-auto tabular-nums" style={{ color: s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ScatterGrid — srovnání dvou metrik jako čitelná bublinová mapa
// ─────────────────────────────────────────────────────────────────────────────
export const ScatterGrid: React.FC<{
  points: { label: string; x: number; y: number; size?: number; color?: string }[];
  xLabel: string;
  yLabel: string;
  height?: number;
}> = ({ points, xLabel, yLabel, height = 170 }) => {
  if (!points || points.length === 0) {
    return (
      <p className="text-xs py-6 text-center" style={{ color: C.faint }}>
        Žádná data
      </p>
    );
  }
  const maxX = Math.max(...points.map(p => p.x), 1);
  const maxY = Math.max(...points.map(p => p.y), 100);

  return (
    <div>
      <div
        className="relative rounded-xl"
        style={{ height, background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}
      >
        {/* Mřížka */}
        {[0.25, 0.5, 0.75].map(f => (
          <React.Fragment key={f}>
            <div className="absolute left-0 right-0" style={{ top: `${f * 100}%`, height: 1, background: 'var(--stats-border)' }} />
            <div className="absolute top-0 bottom-0" style={{ left: `${f * 100}%`, width: 1, background: 'var(--stats-border)' }} />
          </React.Fragment>
        ))}
        {points.map((p, i) => {
          const color = p.color || C.accent;
          const d = 10 + Math.min(18, (p.size || 0) * 4);
          return (
            <div
              key={`${p.label}-${i}`}
              title={`${p.label} — ${xLabel}: ${p.x}, ${yLabel}: ${p.y}`}
              className="absolute rounded-full -translate-x-1/2 translate-y-1/2 flex items-center justify-center"
              style={{
                left: `${6 + (p.x / maxX) * 88}%`,
                bottom: `${6 + (p.y / maxY) * 84}%`,
                width: d,
                height: d,
                background: `${color}59`,
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 12px ${color}55`,
              }}
            />
          );
        })}
        <span className="absolute left-2 top-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.faint }}>
          {yLabel} ↑
        </span>
        <span className="absolute right-2 bottom-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.faint }}>
          {xLabel} →
        </span>
      </div>
      {/* Legenda bodů */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
        {points.slice(0, 8).map((p, i) => (
          <span key={`${p.label}-lg-${i}`} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || C.accent }} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
};
