import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, TrendingDown, CheckCircle2, ArrowDownRight } from 'lucide-react';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   OPTIMALIZACE FÁZÍ — rozpad dnešních fází po sálech + doporučení zrychlení.

   Pro každý sál vykreslí všechny fáze, které dnes proběhly (animovaný
   stacked bar + časy), a porovná je s OBVYKLOU dobou (z nastavení statusu,
   jinak medián traktu). U fází, které trvaly výrazně déle, navrhne, kde
   lze zrychlit — KROMĚ chirurgického výkonu, ten se nezkracuje.
   ════════════════════════════════════════════════════════════════════════ */

interface PhaseSlice { stepIndex: number; name: string; color: string; minutes: number; }
interface Row { id: string; name: string; operations: number; occupiedMinutes: number; phases: PhaseSlice[]; }
interface Props {
  isOpen: boolean;
  onClose: () => void;
  rows: Row[];
  onSelectRoom?: (id: string) => void;
}

const stripDia = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isSurgical = (name: string) => {
  const n = stripDia(name);
  return n.includes('chirurg') || n.includes('vykon') || n.includes('operac');
};
const fmtM = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m` : `${Math.round(m)} min`);
const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b); const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const PhaseOptimizer: React.FC<Props> = ({ isOpen, onClose, rows, onSelectRoom }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const model = useMemo(() => {
    const withData = rows.filter((r) => r.phases.some((p) => p.minutes > 0));

    // obvyklá doba fáze: default_duration z nastavení; jinak medián napříč sály
    const defaultByName = new Map<string, number>();
    workflowStatuses.forEach((st) => {
      const dur = (st as { default_duration?: number }).default_duration;
      if (st.name && typeof dur === 'number' && dur > 0) defaultByName.set(st.name, dur);
    });
    const valuesByName = new Map<string, number[]>();
    withData.forEach((r) => r.phases.forEach((p) => {
      if (p.minutes <= 0) return;
      const arr = valuesByName.get(p.name) || []; arr.push(p.minutes); valuesByName.set(p.name, arr);
    }));
    const baselineOf = (name: string) => defaultByName.get(name) ?? median(valuesByName.get(name) || []);

    const cards = withData.map((r) => {
      const total = r.phases.reduce((s, p) => s + p.minutes, 0) || 1;
      const recs = r.phases
        .filter((p) => p.minutes > 0 && !isSurgical(p.name))
        .map((p) => {
          const base = baselineOf(p.name);
          const over = base > 0 ? p.minutes - base : 0;
          return { name: p.name, color: p.color, minutes: p.minutes, base, over };
        })
        .filter((x) => x.base > 0 && x.over >= 3 && x.minutes > x.base * 1.15)
        .sort((a, b) => b.over - a.over);
      const saving = recs.reduce((s, x) => s + x.over, 0);
      return { id: r.id, name: r.name, operations: r.operations, total, phases: r.phases, recs, saving };
    }).sort((a, b) => b.saving - a.saving);

    const totalSaving = cards.reduce((s, c) => s + c.saving, 0);
    return { cards, totalSaving };
  }, [rows, workflowStatuses]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="po-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Optimalizace fází"
        >
          <motion.div
            key="po-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(96vw,1180px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 60px ${C.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '92vh',
            }}
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full pointer-events-none opacity-20"
              style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <Zap className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Optimalizace fází</h2>
                  {model.totalSaving > 0 && (
                    <span className="px-3.5 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5" style={{ background: `${C.green}1c`, color: C.green, border: `1px solid ${C.green}40` }}>
                      <TrendingDown className="w-3.5 h-3.5" /> potenciál −{fmtM(model.totalSaving)}
                    </span>
                  )}
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Rozpad fází a kde zrychlit (mimo chirurgický výkon)</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 flex flex-col" style={{ maxHeight: 'calc(92vh - 92px)', overflow: 'hidden' }}>
              {model.cards.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: C.slate }} />
                  <p className="text-sm text-white/50">Pro dnešní den nejsou k dispozici žádná fázová data.</p>
                </div>
              ) : (
                <>
                  {/* Legenda */}
                  <div className="flex items-center gap-4 mb-2 text-[10px] text-white/45 flex-shrink-0">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: `${C.slate}aa` }} /> fáze v obvyklém čase</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${C.red}99 0 3px, ${C.red}33 3px 6px)` }} /> přesah (potenciál úspory)</span>
                    <span className="ml-auto text-white/35">Chirurgický výkon se z doporučení vynechává</span>
                  </div>

                  {/* Kompaktní řádky sálů — vejde se bez rolování */}
                  <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                    {model.cards.map((card, ci) => {
                      const visPhases = card.phases.filter((p) => p.minutes > 0);
                      const recByName = new Map(card.recs.map((r) => [r.name, r]));
                      const topRec = card.recs[0] || null;
                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}
                          className="flex items-center gap-3 rounded-xl px-3 h-12 flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${card.saving > 0 ? `${C.yellow}2a` : C.border}` }}
                        >
                          {/* Sál */}
                          <button onClick={() => onSelectRoom?.(card.id)} className="text-left group w-40 flex-shrink-0 min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-white/80 transition-colors leading-tight">{card.name}</p>
                            <p className="text-[10px] text-white/35 leading-tight">{card.operations} op · {fmtM(card.total)}</p>
                          </button>

                          {/* Stacked bar fází s přesahem */}
                          <div className="flex-1 h-7 rounded-lg overflow-hidden flex relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {visPhases.map((p, pi) => {
                              const wPct = (p.minutes / card.total) * 100;
                              const rec = recByName.get(p.name);
                              const overFrac = rec && p.minutes > 0 ? Math.min(1, rec.over / p.minutes) : 0;
                              return (
                                <motion.div
                                  key={`${p.name}-${pi}`}
                                  className="h-full relative flex items-center justify-center"
                                  style={{ background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}bb 100%)`, borderRight: pi < visPhases.length - 1 ? '1px solid rgba(0,0,0,0.25)' : 'none' }}
                                  title={`${p.name}: ${fmtM(p.minutes)}${rec ? ` · přesah +${fmtM(rec.over)}` : ''}`}
                                  initial={{ width: 0 }} animate={{ width: `${wPct}%` }}
                                  transition={{ delay: 0.12 + ci * 0.03 + pi * 0.04, duration: 0.5, ease: 'easeOut' }}
                                >
                                  <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)' }} />
                                  {overFrac > 0 && (
                                    <div className="absolute top-0 bottom-0 right-0" style={{ width: `${overFrac * 100}%`, background: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.34) 0 4px, transparent 4px 8px)' }} />
                                  )}
                                  {wPct > 11 && (
                                    <span className="relative text-[9px] font-bold font-mono tabular-nums leading-none px-1 truncate" style={{ color: '#0a0a0a' }}>{Math.round(p.minutes)}</span>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Top doporučení / stav */}
                          {topRec ? (
                            <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-semibold max-w-[200px]" style={{ background: `${topRec.color}14`, color: topRec.color, border: `1px solid ${topRec.color}33` }} title={`Obvykle ~${fmtM(topRec.base)}, trvalo ${fmtM(topRec.minutes)}`}>
                              <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{topRec.name}</span>
                              {card.recs.length > 1 && <span className="text-white/40">+{card.recs.length - 1}</span>}
                            </span>
                          ) : (
                            <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-semibold" style={{ background: `${C.green}10`, color: C.green, border: `1px solid ${C.green}26` }}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> v normě
                            </span>
                          )}

                          {/* Úspora */}
                          <span className="flex-shrink-0 w-16 text-right text-sm font-black tabular-nums" style={{ color: card.saving > 0 ? C.green : 'rgba(255,255,255,0.25)' }}>
                            {card.saving > 0 ? `−${fmtM(card.saving)}` : '—'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhaseOptimizer;
