import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { X, BarChart3, Activity, Timer, Clock, Layers, Gauge } from 'lucide-react';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   STATISTIKY DNE — ve vizuální řeči Prognózy kapacity.
   Animované KPI count-up karty, vodorovný žebříček vytížení sálů
   s plynule rostoucími pruhy a rozpad odpracovaného času po fázích.
   ════════════════════════════════════════════════════════════════════════ */

interface PhaseSlice { stepIndex: number; name: string; color: string; minutes: number; ms: number; }
interface Row {
  id: string; name: string; department?: string;
  operations: number; workingMinutes: number; occupiedMinutes: number;
  utilizationPct: number; avgOpMin: number; phases: PhaseSlice[]; phaseTotalMs: number;
  isEmergency: boolean; isPaused: boolean; isRunning: boolean;
}
interface Totals {
  operations: number; occupiedMinutes: number; workingMinutes: number;
  utilizationPct: number; activeRoomsCount: number; allRoomsCount: number;
}
interface Kpis {
  utilizationPct: number; avgTurnoverMin: number | null;
  fcotsPct: number | null; fcotsDetail: string | null;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  rows: Row[];
  totals: Totals;
  kpis: Kpis;
  onSelectRoom?: (id: string) => void;
}

const utilColor = (pct: number): string => {
  if (pct >= 70) return C.green;
  if (pct >= 50) return C.purple;
  if (pct > 0) return C.orange;
  return C.red;
};
const fmtH = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

/** Count-up číslo přes pružinu */
const CountUp: React.FC<{ value: number; suffix?: string; className?: string; style?: React.CSSProperties; delay?: number }> = ({ value, suffix = '', className, style, delay = 0 }) => {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState(0);
  useMotionValueEvent(spring, 'change', (v) => setDisplay(v));
  useEffect(() => {
    const t = setTimeout(() => spring.set(value), delay);
    return () => clearTimeout(t);
  }, [value, delay, spring]);
  return <span className={className} style={style}>{Math.round(display)}{suffix}</span>;
};

const DayStatistics: React.FC<Props> = ({ isOpen, onClose, rows, totals, kpis, onSelectRoom }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Žebříček vytížení (sestupně), jen sály s rozvrhem nebo operacemi
  const ranked = useMemo(
    () => [...rows].filter((r) => r.workingMinutes > 0 || r.operations > 0).sort((a, b) => b.utilizationPct - a.utilizationPct),
    [rows],
  );
  const maxUtil = Math.max(100, ...ranked.map((r) => r.utilizationPct));

  // Agregace času po fázích napříč všemi sály
  const phaseAgg = useMemo(() => {
    const map = new Map<string, { name: string; color: string; minutes: number }>();
    rows.forEach((r) => r.phases.forEach((p) => {
      const key = p.name;
      const cur = map.get(key) || { name: p.name, color: p.color, minutes: 0 };
      cur.minutes += p.minutes;
      map.set(key, cur);
    }));
    const arr = [...map.values()].filter((p) => p.minutes > 0).sort((a, b) => b.minutes - a.minutes);
    const total = arr.reduce((s, p) => s + p.minutes, 0) || 1;
    return { arr, total };
  }, [rows]);

  const totalOps = totals.operations;
  const avgOp = totalOps > 0 ? Math.round(totals.occupiedMinutes / totalOps) : 0;

  // Průměrné využití sálů, které byly daný den v provozu (mají rozvrh nebo
  // proběhlou operaci). Bereme PRŮMĚR z jejich vytíženosti, ne celkový poměr
  // — ten mohl u krátkých provozních dob vyjít i nesmyslně přes 100 %.
  const avgUtil = ranked.length > 0
    ? Math.round(ranked.reduce((s, r) => s + Math.min(100, r.utilizationPct), 0) / ranked.length)
    : 0;

  const kpiCards = [
    { icon: Gauge, label: 'Využití sálů', value: avgUtil, suffix: '%', color: utilColor(avgUtil) },
    { icon: Activity, label: 'Operace dnes', value: totalOps, suffix: '', color: C.accent },
    { icon: Timer, label: 'Ø přestavba', value: kpis.avgTurnoverMin ?? 0, suffix: ' min', color: C.blue, dash: kpis.avgTurnoverMin === null },
    { icon: Clock, label: '1. start včas', value: kpis.fcotsPct ?? 0, suffix: '%', color: kpis.fcotsPct === null ? C.slate : kpis.fcotsPct >= 80 ? C.green : kpis.fcotsPct >= 50 ? C.yellow : C.red, dash: kpis.fcotsPct === null },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ds-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Statistiky dne"
        >
          <motion.div
            key="ds-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(96vw,1240px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 60px ${C.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '90vh',
            }}
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full pointer-events-none opacity-25"
              style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <BarChart3 className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Statistiky dne</h2>
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>
                    {totals.activeRoomsCount}/{totals.allRoomsCount} sálů v provozu
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Vytížení, výkon a rozpad času po fázích</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 96px)' }}>
              {/* KPI count-up karty */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {kpiCards.map((k, i) => (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${k.color}12 0%, transparent 65%)`, border: `1px solid ${k.color}28` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)`, opacity: 0.6 }} />
                    <div className="flex items-center gap-2 mb-2">
                      <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                      <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/45">{k.label}</span>
                    </div>
                    {k.dash
                      ? <p className="text-3xl font-black tabular-nums leading-none text-white/30">—</p>
                      : <CountUp value={k.value} suffix={k.suffix} delay={150 + i * 70} className="text-3xl font-black tabular-nums leading-none" style={{ color: k.color }} />}
                  </motion.div>
                ))}
              </div>

              {/* Žebříček vytížení sálů */}
              <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-white/40" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">Vytížení sálů</span>
                </div>
                {ranked.length === 0 ? (
                  <p className="text-sm text-white/40 py-4 text-center">Pro dnešní den nejsou k dispozici žádná data.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ranked.map((r, i) => {
                      const col = utilColor(r.utilizationPct);
                      const w = Math.max(2, (r.utilizationPct / maxUtil) * 100);
                      return (
                        <motion.button
                          type="button"
                          key={r.id}
                          onClick={() => onSelectRoom?.(r.id)}
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                          className="group flex items-center gap-3 text-left w-full"
                        >
                          <span className="w-44 flex-shrink-0 min-w-0">
                            <span className="text-sm font-semibold text-white/90 truncate block group-hover:text-white transition-colors">{r.name}</span>
                          </span>
                          <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <motion.div
                              className="h-full rounded-lg relative"
                              style={{ background: `linear-gradient(90deg, ${col}aa, ${col})`, boxShadow: `0 0 14px ${col}45` }}
                              initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.25 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent 60%)' }} />
                            </motion.div>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-mono tabular-nums" style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                              {r.utilizationPct}%
                            </span>
                          </div>
                          <span className="w-28 flex-shrink-0 text-right text-[11px] font-mono tabular-nums text-white/50">
                            {r.operations} op · {fmtH(r.occupiedMinutes)}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rozpad času po fázích + souhrn */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Stacked bar fází */}
                <div className="md:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-white/40" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">Rozpad odpracovaného času po fázích</span>
                  </div>
                  {phaseAgg.arr.length === 0 ? (
                    <p className="text-sm text-white/40 py-2">Žádné fáze k zobrazení.</p>
                  ) : (
                    <>
                      <div className="h-6 rounded-lg overflow-hidden flex mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {phaseAgg.arr.map((p, i) => (
                          <motion.div
                            key={p.name || `phase-${i}`}
                            className="h-full relative"
                            style={{ background: `linear-gradient(180deg, ${p.color}, ${p.color}bb)` }}
                            title={`${p.name}: ${fmtH(p.minutes)}`}
                            initial={{ width: 0 }} animate={{ width: `${(p.minutes / phaseAgg.total) * 100}%` }}
                            transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                        {phaseAgg.arr.map((p, i) => (
                          <motion.div
                            key={p.name || `phase-${i}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.06 }}
                            className="flex items-center gap-2 min-w-0"
                          >
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}66` }} />
                            <span className="text-xs text-white/70 truncate flex-1">{p.name}</span>
                            <span className="text-xs font-mono tabular-nums text-white/50 flex-shrink-0">{fmtH(p.minutes)}</span>
                            <span className="text-[10px] font-mono tabular-nums text-white/35 flex-shrink-0 w-9 text-right">{Math.round((p.minutes / phaseAgg.total) * 100)}%</span>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Souhrnné dlaždice */}
                <div className="rounded-2xl p-5 flex flex-col justify-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                  {[
                    { label: 'Celkem operací', value: totalOps, suffix: '', color: C.accent },
                    { label: 'Operační čas', value: Math.round(totals.occupiedMinutes / 60), suffix: ' h', color: C.green },
                    { label: 'Ø délka operace', value: avgOp, suffix: ' min', color: C.blue },
                  ].map((m, i) => (
                    <div key={m.label} className="flex items-end justify-between">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold mb-1">{m.label}</span>
                      <CountUp value={m.value} suffix={m.suffix} delay={300 + i * 90} className="text-2xl font-black tabular-nums leading-none" style={{ color: m.color }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DayStatistics;
