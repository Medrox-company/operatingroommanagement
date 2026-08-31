'use client';

import React from 'react';
import { C, DistributionHeader } from './shared';

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
// DayNavigator — listování po dnech + kalendář (styl z modulu Tok pacienta)
// ─────────────────────────────────────────────────────────────────────────────

/** `Date` → `YYYY-MM-DD` v lokálním čase (bez posunu přes UTC). */
export const toDateInput = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const DayNavigator: React.FC<{
  value: Date;
  onChange: (d: Date) => void;
  /** Nejstarší volitelný den (výchozí 30 dní zpět) */
  minDate?: Date;
  /** Zakáže posun do budoucna (výchozí true) */
  noFuture?: boolean;
  /** „Dnes" — u provozního dne 7:00–7:00 nemusí jít o dnešní datum */
  today?: Date;
  className?: string;
}> = ({ value, onChange, minDate, noFuture = true, today: todayProp, className = '' }) => {
  const today = React.useMemo(() => {
    if (todayProp) { const d = new Date(todayProp); d.setHours(0, 0, 0, 0); return d; }
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, [todayProp]);
  const min = React.useMemo(() => {
    if (minDate) return minDate;
    const d = new Date(today); d.setDate(d.getDate() - 29); return d;
  }, [minDate, today]);

  const isToday = value.getTime() === today.getTime();
  const atMin = value.getTime() <= min.getTime();

  const shift = (delta: number) => {
    const next = new Date(value);
    next.setDate(next.getDate() + delta);
    next.setHours(0, 0, 0, 0);
    if (noFuture && next.getTime() > today.getTime()) return;
    if (next.getTime() < min.getTime()) return;
    onChange(next);
  };

  const btn = 'h-10 w-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  const surface: React.CSSProperties = {
    background: 'var(--stats-surface)',
    border: `1px solid ${C.border}`,
    color: C.text,
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={() => shift(-1)} disabled={atMin} aria-label="Předchozí den" className={btn} style={surface}>
        <span className="text-lg leading-none">‹</span>
      </button>

      <label
        className="h-10 px-3.5 rounded-xl flex items-center gap-2 cursor-pointer"
        style={surface}
      >
        <span className="text-[13px]" style={{ color: C.accent }}>🕐</span>
        <input
          type="date"
          value={toDateInput(value)}
          max={noFuture ? toDateInput(today) : undefined}
          min={toDateInput(min)}
          onChange={(e) => {
            if (!e.target.value) return;
            const d = new Date(`${e.target.value}T00:00:00`);
            if (!Number.isNaN(d.getTime())) onChange(d);
          }}
          className="bg-transparent text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 [color-scheme:dark] tabular-nums"
          style={{ color: C.text }}
        />
      </label>

      <button onClick={() => shift(1)} disabled={noFuture && isToday} aria-label="Následující den" className={btn} style={surface}>
        <span className="text-lg leading-none">›</span>
      </button>

      <button
        onClick={() => onChange(today)}
        disabled={isToday}
        className="h-10 px-4 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={surface}
      >
        Dnes
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GlassCalendar — měsíční kalendář ve skleněném panelu (výběr dne)
// ─────────────────────────────────────────────────────────────────────────────
const CZ_DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export const GlassCalendar: React.FC<{
  value: Date;
  onChange: (d: Date) => void;
  /** Nejstarší volitelný den (výchozí 90 dní zpět) */
  minDate?: Date;
  /** Zakáže výběr budoucích dnů (výchozí true) */
  noFuture?: boolean;
  /** Volitelné zvýraznění dnů s daty (klíč `YYYY-MM-DD` → intenzita 0–1) */
  heat?: Record<string, number>;
  /** Akcentní barva zvoleného dne */
  accent?: string;
  /** „Dnes" — u provozního dne 7:00–7:00 nemusí jít o dnešní datum */
  today?: Date;
  className?: string;
}> = ({ value, onChange, minDate, noFuture = true, heat, accent = C.accent, today: todayProp, className = '' }) => {
  const today = React.useMemo(() => {
    if (todayProp) { const d = new Date(todayProp); d.setHours(0, 0, 0, 0); return d; }
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, [todayProp]);
  const min = React.useMemo(() => {
    if (minDate) return minDate;
    const d = new Date(today); d.setDate(d.getDate() - 89); return d;
  }, [minDate, today]);

  // Zobrazený měsíc — drží se vybraného dne, ale lze listovat nezávisle
  const [view, setView] = React.useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  React.useEffect(() => {
    setView(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value]);

  const shiftMonth = (delta: number) => {
    setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  /** Buňky mřížky — od pondělí před 1. dnem měsíce po neděli za posledním. */
  const cells = React.useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // 0 = pondělí
    const start = new Date(first);
    start.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [view]);

  const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
  const key = (d: Date) => toDateInput(d);

  const canGoPrev = new Date(view.getFullYear(), view.getMonth(), 1).getTime() > new Date(min.getFullYear(), min.getMonth(), 1).getTime();
  const canGoNext = !noFuture || new Date(view.getFullYear(), view.getMonth(), 1).getTime() < new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
        border: `1px solid ${C.border}`,
        backdropFilter: 'blur(18px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Hlavička — měsíc a listování */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          aria-label="Předchozí měsíc"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5"
          style={{ color: C.text }}
        >
          ‹
        </button>
        <p className="text-[13px] font-bold capitalize" style={{ color: C.textHi }}>
          {view.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          disabled={!canGoNext}
          aria-label="Následující měsíc"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5"
          style={{ color: C.text }}
        >
          ›
        </button>
      </div>

      {/* Dny v týdnu */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {CZ_DAYS.map((d, i) => (
          <span
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-wider"
            style={{ color: i >= 5 ? C.faint : C.muted }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Mřížka dnů */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map(d => {
          const inMonth = d.getMonth() === view.getMonth();
          const isSelected = sameDay(d, value);
          const isToday = sameDay(d, today);
          const disabled = (noFuture && d.getTime() > today.getTime()) || d.getTime() < min.getTime();
          const intensity = heat?.[key(d)] ?? 0;

          return (
            <button
              key={d.toISOString()}
              onClick={() => !disabled && onChange(d)}
              disabled={disabled}
              aria-current={isSelected ? 'date' : undefined}
              className="relative aspect-square rounded-lg flex items-center justify-center text-[12px] font-semibold tabular-nums transition-all disabled:cursor-not-allowed"
              style={{
                background: isSelected
                  ? accent
                  : intensity > 0
                    ? `${accent}${Math.round(12 + intensity * 26).toString(16).padStart(2, '0')}`
                    : 'transparent',
                color: isSelected
                  ? '#04121A'
                  : disabled
                    ? C.faint
                    : inMonth ? C.text : C.faint,
                opacity: disabled ? 0.35 : inMonth ? 1 : 0.5,
                border: isToday && !isSelected ? `1px solid ${accent}66` : '1px solid transparent',
                boxShadow: isSelected ? `0 6px 18px -6px ${accent}, 0 0 14px ${accent}55` : undefined,
              }}
            >
              {d.getDate()}
              {/* Tečka u dnů s daty (mimo vybraný den) */}
              {intensity > 0 && !isSelected && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Patička — rychlé volby */}
      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={() => onChange(today)}
          disabled={sameDay(value, today)}
          className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.05)', color: C.text, border: `1px solid ${C.border}` }}
        >
          Dnes
        </button>
        <button
          onClick={() => { const d = new Date(today); d.setDate(d.getDate() - 1); onChange(d); }}
          disabled={(() => { const y = new Date(today); y.setDate(y.getDate() - 1); return sameDay(value, y); })()}
          className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.05)', color: C.text, border: `1px solid ${C.border}` }}
        >
          Včera
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatSectionLabel — centrovaný prostrkaný nadpis sekce (jazyk hero panelů)
// ─────────────────────────────────────────────────────────────────────────────
export const StatSectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p
    className={`text-[11px] font-bold uppercase text-center ${className}`}
    style={{ color: C.faint, letterSpacing: '0.32em' }}
  >
    {children}
  </p>
);

// ─────────────────────────────────────────────────────────────────────────────
// useCountUp — plynulé dopočítání hodnoty (stejný pocit jako v Toku pacienta)
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target: number, run: boolean, duration = 1100): number {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const from = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setV(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return v;
}

/** Spustí animaci až po prvním snímku (aby byl vidět náběh z nuly). */
function useMounted(): boolean {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

// ─────────────────────────────────────────────────────────────────────────────
// GaugeRing — velký zářící prstenec (design převzatý z modulu Tok pacienta)
// ─────────────────────────────────────────────────────────────────────────────
export const GaugeRing: React.FC<{
  /** Zobrazená hodnota; obvod se při přesahu vizuálně zastaví na 100 %. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Drobný prostrkaný popisek nad číslem */
  kicker?: string;
  /** Text pod číslem (např. „Obsazeno 6h 7m / 8h 0m") */
  sublabel?: string;
  /** Jednotka za číslem */
  unit?: string;
  /** Rotující tečkované kroužky kolem prstence */
  dotted?: boolean;
}> = ({ value, size = 340, stroke, color = C.accent, kicker, sublabel, unit = '%', dotted = true }) => {
  const on = useMounted();
  const displayValue = Math.max(0, value);
  const visualPercent = Math.min(100, displayValue);
  const shown = useCountUp(displayValue, on, 1100);

  // Poměry odpovídají originálu (viewBox 360, r 130, stroke 36)
  const VB = 360;
  const R = 130;
  const SW = stroke ?? 36;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center">
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Barevná záře za prstencem */}
      <div className="absolute inset-[8%] rounded-full blur-[60px]" style={{ background: color, opacity: 0.22 }} />

      {dotted && (
        <>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ animation: 'spin 32s linear infinite' }}
          >
            <circle cx="180" cy="180" r="166" fill="none" stroke="var(--stats-border)" strokeWidth="1.5" strokeDasharray="2 10" />
          </svg>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ animation: 'spin 60s linear infinite reverse' }}
          >
            <circle cx="180" cy="180" r="150" fill="none" stroke="var(--stats-ghost)" strokeWidth="1" strokeDasharray="1 14" />
          </svg>
        </>
      )}

      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="180" cy="180" r={R} fill="none" stroke="var(--stats-ghost)" strokeWidth={SW} />
        <circle
          cx="180" cy="180" r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={`${((on ? visualPercent : 0) / 100) * CIRC} ${CIRC}`}
          style={{
            transition: 'stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)',
            filter: `drop-shadow(0 0 8px ${color}99)`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[12%]">
        {kicker && (
          <span
            className="uppercase mb-1.5"
            style={{ color: C.faint, fontSize: size * 0.029, letterSpacing: '0.25em' }}
          >
            {kicker}
          </span>
        )}
        <span
          className="font-black tabular-nums leading-none"
          style={{ color: C.textHi, fontSize: size * 0.185, textShadow: `0 0 28px ${color}77` }}
        >
          {Math.round(shown)}
          <span className="align-top" style={{ fontSize: size * 0.07, color: C.text }}>{unit}</span>
        </span>
      </div>
    </div>

    {/* Doplňkový popisek POD prstencem — uvnitř by delší text přesahoval kruh */}
    {sublabel && (
      <p
        className="tabular-nums text-center mt-3 leading-snug"
        style={{ color: C.muted, fontSize: 13, maxWidth: size + 80 }}
      >
        {sublabel}
      </p>
    )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RingRow — řada malých prstenců s popiskem a hodnotou pod nimi
// ─────────────────────────────────────────────────────────────────────────────
export interface RingItem {
  label: string;
  /** Podíl v procentech (0–100) */
  percent: number;
  /** Doplňkový údaj pod popiskem (např. „4h 8m") */
  detail?: string;
  color: string;
}

export const RingRow: React.FC<{ items: RingItem[]; size?: number; emptyText?: string }> = ({
  items,
  size = 120,
  emptyText = 'Žádná data',
}) => {
  const on = useMounted();
  if (!items || items.length === 0) {
    return <p className="text-xs py-6 text-center" style={{ color: C.faint }}>{emptyText}</p>;
  }
  // Poměry dle originálu z Toku pacienta (viewBox 108, r 46, stroke 11)
  const R = 46;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
      {items.map((it, i) => {
        const pct = Math.max(0, Math.min(100, it.percent));
        return (
          <div
            key={`${it.label}-${i}`}
            className="flex flex-col items-center gap-2.5 shrink-0"
            style={{ width: size + 16 }}
          >
            <div className="relative" style={{ width: size, height: size }}>
              <div className="absolute inset-[13%] rounded-full blur-xl" style={{ background: it.color, opacity: 0.18 }} />
              <svg viewBox="0 0 108 108" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="54" cy="54" r={R} fill="none" stroke="var(--stats-ghost)" strokeWidth="11" />
                <circle
                  cx="54" cy="54" r={R}
                  fill="none"
                  stroke={it.color}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${((on ? pct : 0) / 100) * CIRC} ${CIRC}`}
                  style={{
                    transition: `stroke-dasharray 0.9s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.07}s`,
                    filter: `drop-shadow(0 0 6px ${it.color}88)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black tabular-nums" style={{ color: C.textHi }}>
                  {pct.toFixed(0)}
                  <span className="text-xs align-top" style={{ color: C.text }}>%</span>
                </span>
              </div>
            </div>
            <div className="text-center leading-tight">
              {/* Zkrácení musí být na samotném textu — `truncate` na flexovém
                  rodiči se u vnořeného uzlu neprojeví a dlouhý název sálu pak
                  přetekl ven z dlaždice. */}
              <p
                className="text-[13px] font-semibold flex items-center justify-center gap-1.5"
                style={{ color: C.text, maxWidth: size + 20 }}
                title={it.label}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }}
                />
                <span className="min-w-0 truncate">{it.label}</span>
              </p>
              {it.detail && (
                <p className="text-[11px] tabular-nums mt-0.5" style={{ color: C.muted }}>
                  {it.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrbitRings — všechny sály jako prstence obíhající centrální graf
// ─────────────────────────────────────────────────────────────────────────────

/** Šířka elementu (pro plynulé zmenšení orbitu na úzkých displejích). */
function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T | null>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export interface OrbitSegment {
  /** Relativní velikost výseče (typicky trvání fáze v ms/min) */
  value: number;
  color: string;
  label?: string;
}

export interface OrbitItem {
  id: string;
  label: string;
  /** Hodnota 0–100 (vytížení sálu) — použije se, když nejsou `segments` */
  percent: number;
  /** Doplňkový údaj pod názvem (např. „4 výkony") */
  detail?: string;
  color: string;
  /** Ztlumí prstenec (např. sál mimo provoz) */
  dimmed?: boolean;
  /** Vícebarevný prstenec — fáze jednoho operačního cyklu */
  segments?: OrbitSegment[];
  /** Text uprostřed prstence místo procenta (např. délka výkonu) */
  centerLabel?: string;
  /** Časové okno položky (pro navazující výpočty, např. pauzy ve výkonu) */
  startMs?: number;
  endMs?: number;
}

export const OrbitRings: React.FC<{
  /** Obsah centrálního prstence */
  center: { value: number; color?: string; kicker?: string; sublabel?: string };
  items: OrbitItem[];
  onSelect?: (id: string) => void;
  /** Trvale zvýrazněná položka (vybraný výkon) */
  selectedId?: string | null;
  /** Vodorovné zarovnání scény v rodiči */
  align?: 'center' | 'start';
  emptyText?: string;
}> = ({ center, items, onSelect, selectedId = null, align = 'center', emptyText = 'Žádné sály k zobrazení.' }) => {
  const on = useMounted();
  const [wrapRef, wrapW] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = React.useState<string | null>(null);

  if (!items || items.length === 0) {
    return <p className="text-xs py-8 text-center" style={{ color: C.faint }}>{emptyText}</p>;
  }

  const n = items.length;
  // Velikost satelitu podle počtu sálů — u velkých provozů se zmenší
  const sat = n <= 8 ? 104 : n <= 12 ? 92 : n <= 18 ? 82 : 72;
  const centerSize = n <= 8 ? 240 : 220;

  /* Rozestupy: buňka satelitu = prstenec + dvouřádkový popisek pod ním.
     Aby se sousední buňky NIKDY nepřekrývaly, musí být tětiva mezi středy
     dvou sousedů alespoň tak dlouhá jako šířka buňky + mezera:
        2·R·sin(π/n) ≥ cellW + gap   →   R ≥ (cellW + gap) / (2·sin(π/n))
     Jediný orbit — dva soustředné kruhy se u reálných počtů sálů vždycky
     dostanou do konfliktu. */
  const cellW = sat + 44;          // popisek může být širší než prstenec
  const cellH = sat + 44;          // prstenec + název + doplňkový údaj
  const gap = 14;
  const minR = centerSize / 2 + cellH / 2 + 26; // ať satelity nesahají na střed
  const chordR = n > 1 ? (cellW + gap) / (2 * Math.sin(Math.PI / n)) : 0;
  const rOuter = Math.max(minR, chordR);

  const outer = items;

  const boxSize = 2 * (rOuter + cellH / 2) + 16;
  // Na úzkých displejích celou scénu proporčně zmenšíme
  const scale = wrapW > 0 ? Math.min(1, wrapW / boxSize) : 1;

  const place = (idx: number, count: number, radius: number, offset = 0) => {
    // Start nahoře (−90°), po směru hodinových ručiček
    const a = (-90 + offset + (360 / Math.max(count, 1)) * idx) * (Math.PI / 180);
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  };

  const renderSat = (it: OrbitItem, idx: number, count: number, radius: number, offset: number, delayBase: number) => {
    const { x, y } = place(idx, count, radius, offset);
    const displayPercent = Math.max(0, it.percent);
    const visualPercent = Math.min(100, displayPercent);
    const R = 46;
    const CIRC = 2 * Math.PI * R;
    const isHot = hovered === it.id || selectedId === it.id;
    const dim = it.dimmed && !isHot;

    return (
      <button
        key={it.id}
        type="button"
        onClick={() => onSelect?.(it.id)}
        onMouseEnter={() => setHovered(it.id)}
        onMouseLeave={() => setHovered(null)}
        className="absolute flex flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        style={{
          left: '50%',
          top: '50%',
          width: cellW,
          transform: `translate(-50%, -50%) translate(${on ? x : 0}px, ${on ? y : 0}px) scale(${on ? (isHot ? 1.07 : 1) : 0.6})`,
          opacity: on ? (dim ? 0.45 : 1) : 0,
          transition: `transform 0.75s cubic-bezier(.22,1,.36,1) ${delayBase + idx * 0.045}s, opacity 0.5s ease ${delayBase + idx * 0.045}s`,
          cursor: onSelect ? 'pointer' : 'default',
          zIndex: isHot ? 5 : 2,
        }}
      >
        <div className="relative" style={{ width: sat, height: sat }}>
          <div
            className="absolute inset-[14%] rounded-full blur-lg"
            style={{ background: it.color, opacity: isHot ? 0.35 : 0.16, transition: 'opacity .2s' }}
          />
          {selectedId === it.id && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `2px solid ${it.color}`, boxShadow: `0 0 14px ${it.color}88` }}
            />
          )}
          <svg viewBox="0 0 108 108" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="54" cy="54" r={R} fill="none" stroke="var(--stats-ghost)" strokeWidth="10" />

            {it.segments && it.segments.length > 0 ? (
              /* Vícebarevný prstenec — fáze jednoho operačního cyklu */
              (() => {
                const total = it.segments.reduce((a, s) => a + s.value, 0) || 1;
                let acc = 0;
                return it.segments.map((sgm, si) => {
                  const frac = sgm.value / total;
                  const len = frac * CIRC;
                  const offset = acc;
                  acc += len;
                  return (
                    <circle
                      key={si}
                      cx="54" cy="54" r={R}
                      fill="none"
                      stroke={sgm.color}
                      strokeWidth="10"
                      strokeDasharray={`${on ? Math.max(0, len - 1.5) : 0} ${CIRC}`}
                      strokeDashoffset={-offset}
                      style={{
                        transition: `stroke-dasharray 0.8s cubic-bezier(.22,1,.36,1) ${delayBase + 0.15 + idx * 0.045 + si * 0.05}s`,
                        filter: `drop-shadow(0 0 4px ${sgm.color}${isHot ? 'bb' : '77'})`,
                      }}
                    >
                      <title>{sgm.label}</title>
                    </circle>
                  );
                });
              })()
            ) : (
              <circle
                cx="54" cy="54" r={R}
                fill="none"
                stroke={it.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${((on ? visualPercent : 0) / 100) * CIRC} ${CIRC}`}
                style={{
                  transition: `stroke-dasharray 0.9s cubic-bezier(.22,1,.36,1) ${delayBase + 0.2 + idx * 0.045}s`,
                  filter: `drop-shadow(0 0 5px ${it.color}${isHot ? 'cc' : '88'})`,
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-2">
            {it.centerLabel ? (
              <span
                className="font-black tabular-nums leading-none text-center"
                style={{ color: C.textHi, fontSize: Math.max(11, sat * 0.19) }}
              >
                {it.centerLabel}
              </span>
            ) : (
              <span
                className="font-black tabular-nums leading-none"
                style={{ color: C.textHi, fontSize: sat * 0.24 }}
              >
                {Math.round(displayPercent)}
                <span className="align-top" style={{ fontSize: sat * 0.11, color: C.text }}>%</span>
              </span>
            )}
          </div>
        </div>
        {/* Popisek — pevná výška a truncate, aby se sousedé nikdy nepřekryli */}
        <span
          className="mt-1.5 text-center font-semibold leading-tight truncate w-full px-1"
          style={{ color: isHot ? C.textHi : C.text, fontSize: Math.max(11, sat * 0.125) }}
          title={it.label}
        >
          {it.label}
        </span>
        {it.detail && (
          <span
            className="text-center tabular-nums truncate w-full px-1"
            style={{ color: C.muted, fontSize: Math.max(10, sat * 0.11) }}
          >
            {it.detail}
          </span>
        )}
      </button>
    );
  };

  return (
    <div ref={wrapRef} className={`w-full flex ${align === 'start' ? 'justify-start' : 'justify-center'}`}>
      <div
        className="relative"
        style={{
          width: boxSize,
          height: boxSize,
          transform: `scale(${scale})`,
          transformOrigin: align === 'start' ? 'top left' : 'top center',
          marginBottom: boxSize * (scale - 1), // ať layout nedrží prázdné místo
        }}
      >
        {/* Vodicí kružnice orbitů */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${boxSize} ${boxSize}`}>
          <circle
            cx={boxSize / 2} cy={boxSize / 2} r={rOuter}
            fill="none" stroke="var(--stats-border)" strokeWidth="1" strokeDasharray="2 9"
          />
          {/* Paprsky ke satelitům — končí na okraji prstence, ne pod popiskem */}
          {outer.map((it, i) => {
            const { x, y } = place(i, outer.length, rOuter);
            // Buňka je vycentrovaná na orbitu, prstenec je v její horní části
            const ringDx = x;
            const ringDy = y - (cellH - sat) / 2;
            const len = Math.hypot(ringDx, ringDy) || 1;
            const from = centerSize / 2 + 6;
            const to = Math.max(from, len - sat / 2 - 5);
            return (
              <line
                key={`ray-${it.id}`}
                x1={boxSize / 2 + (ringDx / len) * from}
                y1={boxSize / 2 + (ringDy / len) * from}
                x2={boxSize / 2 + (ringDx / len) * to}
                y2={boxSize / 2 + (ringDy / len) * to}
                stroke={hovered === it.id ? `${it.color}66` : 'var(--stats-ghost)'}
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Centrální prstenec */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 3 }}>
          <GaugeRing
            value={center.value}
            size={centerSize}
            color={center.color}
            kicker={center.kicker}
            dotted={false}
          />
        </div>

        {/* Satelity */}
        {outer.map((it, i) => renderSat(it, i, outer.length, rOuter, 0, 0.1))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PhasePanel — rozpad fází vybraného výkonu (% + čas), styl jako InsightPanel
// ─────────────────────────────────────────────────────────────────────────────
export const PhasePanel: React.FC<{
  title?: string;
  subtitle?: string;
  items: { label: string; ms: number; color: string }[];
  /** Text pod nadpisem, když není nic vybráno */
  emptyText?: string;
  className?: string;
}> = ({ title = 'Fáze výkonu', subtitle, items, emptyText = 'Vyber výkon v grafu.', className = '' }) => {
  const total = items.reduce((a, b) => a + b.ms, 0);

  const fmt = (min: number) => {
    const m = Math.max(0, Math.round(min));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
  };

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p
          className="text-[11px] uppercase font-bold flex items-center gap-2"
          style={{ color: C.muted, letterSpacing: '0.18em' }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: items[0]?.color || C.accent }} />
          {title}
        </p>
        {subtitle && (
          <span className="text-[11px] tabular-nums shrink-0" style={{ color: C.faint }}>
            {subtitle}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-center py-4" style={{ color: C.faint }}>{emptyText}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {items.map((it, i) => {
              const pct = total > 0 ? (it.ms / total) * 100 : 0;
              return (
                <div
                  key={`${it.label}-${i}`}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: `${it.color}10`, border: `1px solid ${it.color}33` }}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }}
                      />
                      <span className="text-[12px] font-bold truncate" style={{ color: C.textHi }}>
                        {it.label}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-2 shrink-0">
                      <span className="text-[11px] tabular-nums" style={{ color: C.muted }}>
                        {fmt(it.ms / 60000)}
                      </span>
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: it.color }}>
                        {Math.round(pct)} %
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--stats-ghost)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${it.color}CC, ${it.color})`,
                        boxShadow: `0 0 8px ${it.color}55`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="flex items-baseline justify-between mt-3 pt-3"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <span className="text-[11px] uppercase font-bold" style={{ color: C.muted, letterSpacing: '0.16em' }}>
              Celkem
            </span>
            <span className="text-[14px] font-bold tabular-nums" style={{ color: C.textHi }}>
              {fmt(total / 60000)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// InsightPanel — panel doporučení („Co zlepšit a urychlit")
// ─────────────────────────────────────────────────────────────────────────────
export type InsightTone = 'warn' | 'info' | 'good';

export interface InsightItem {
  title: string;
  text: string;
  tone?: InsightTone;
}

const TONE_COLOR: Record<InsightTone, string> = {
  warn: '#FB7185',
  good: '#34D399',
  info: '#22D3EE',
};

export const InsightPanel: React.FC<{
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  badge?: string;
  /** Barva ikony nadpisu (typicky barva hlavní metriky) */
  accent?: string;
  icon?: React.ReactNode;
  items: InsightItem[];
  className?: string;
}> = ({ title = 'Co zlepšit a urychlit', eyebrow, subtitle, badge, accent = C.accent, icon, items, className = '' }) => {
  const hasSectionHeader = Boolean(eyebrow || subtitle || badge);

  return (
    <div
      className={`relative overflow-hidden ${hasSectionHeader ? 'rounded-xl p-5' : 'rounded-2xl p-4'} ${className}`}
      style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
    >
      {hasSectionHeader ? (
        <>
          <span className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
          <DistributionHeader
            eyebrow={eyebrow ?? 'Přehled'}
            title={title}
            subtitle={subtitle ?? ''}
            badge={badge ?? `${items.length} doporučení`}
            accent={accent}
          />
        </>
      ) : (
        <p
          className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase"
          style={{ color: C.muted, letterSpacing: '0.18em' }}
        >
          {icon ?? <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
          {title}
        </p>
      )}
      <div className={hasSectionHeader ? 'mt-6 grid grid-cols-1 gap-2.5 md:grid-cols-3' : 'flex flex-col gap-2.5'}>
      {items.map((it, i) => {
        const col = TONE_COLOR[it.tone ?? 'info'];
        return (
          <div
            key={`${it.title}-${i}`}
            className="flex h-full items-start gap-2.5 rounded-xl p-2.5"
            style={{ background: `${col}10`, border: `1px solid ${col}33` }}
          >
            <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full" style={{ background: `${col}33`, boxShadow: `0 0 8px ${col}55` }} />
            <div className="min-w-0">
              <p className="text-[12px] font-bold leading-tight" style={{ color: C.textHi }}>{it.title}</p>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: C.muted }}>{it.text}</p>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-[12px] text-center py-3" style={{ color: C.faint }}>
          Žádná doporučení — provoz běží podle plánu.
        </p>
      )}
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
