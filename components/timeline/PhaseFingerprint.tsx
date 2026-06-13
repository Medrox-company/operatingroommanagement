import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Fingerprint } from 'lucide-react';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   FÁZOVÝ OTISK SÁLŮ — radarový (pavoukový) graf časového profilu.

   Každá osa = jedna fáze operačního cyklu, hodnota = čas, který sál v dané
   fázi dnes strávil. Polygon sálu se porovnává s MEDIÁNEM traktu (šedá osnova).
   Na první pohled vidíš, kde je sál „nafouklý" (pomalejší) oproti zbytku.
   Polygony se animovaně rozvinou ze středu; sály lze zapínat/vypínat.
   ════════════════════════════════════════════════════════════════════════ */

interface PhaseSlice { name: string; color: string; minutes: number; }
interface Row {
  id: string; name: string;
  operations: number; utilizationPct: number;
  phases: PhaseSlice[];
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  rows: Row[];
}

const SERIES_COLORS = ['#22D3EE', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#FACC15'];

const median = (arr: number[]) => {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const PhaseFingerprint: React.FC<Props> = ({ isOpen, onClose, rows }) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const model = useMemo(() => {
    const withData = rows.filter((r) => r.phases.some((p) => p.minutes > 0));
    // Osy = nejvýznamnější fáze (dle součtu minut), max 8
    const totals = new Map<string, { name: string; color: string; total: number }>();
    withData.forEach((r) => r.phases.forEach((p) => {
      if (p.minutes <= 0) return;
      const cur = totals.get(p.name) || { name: p.name, color: p.color, total: 0 };
      cur.total += p.minutes;
      totals.set(p.name, cur);
    }));
    const axes = [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    const axisNames = axes.map((a) => a.name);

    const roomValues = (r: Row) => axisNames.map((n) => r.phases.find((p) => p.name === n)?.minutes || 0);

    // medián a max na osu
    const perAxis = axisNames.map((n, i) => {
      const vals = withData.map((r) => roomValues(r)[i]).filter((v) => v > 0);
      return { median: median(vals), max: Math.max(1, ...withData.map((r) => roomValues(r)[i])) };
    });

    const ranked = [...withData].sort((a, b) => b.utilizationPct - a.utilizationPct);
    return { axes, axisNames, perAxis, rooms: ranked, roomValues };
  }, [rows]);

  // výchozí výběr: top 3 sály
  useEffect(() => {
    if (isOpen) setSelected(model.rooms.slice(0, 3).map((r) => r.id));
  }, [isOpen, model.rooms]);

  const N = model.axes.length;
  const SIZE = 460, CX = SIZE / 2, CY = SIZE / 2, R = 165;
  const angleOf = (i: number) => (i / Math.max(1, N)) * 2 * Math.PI - Math.PI / 2;
  const pt = (i: number, ratio: number) => ({
    x: CX + R * ratio * Math.cos(angleOf(i)),
    y: CY + R * ratio * Math.sin(angleOf(i)),
  });
  const polygon = (values: number[]) => values.map((v, i) => {
    const ratio = Math.max(0.02, Math.min(1, v / model.perAxis[i].max));
    const p = pt(i, ratio);
    return `${p.x},${p.y}`;
  }).join(' ');

  const colorForRoom = (id: string) => SERIES_COLORS[model.rooms.findIndex((r) => r.id === id) % SERIES_COLORS.length];
  const medianPoly = polygon(model.perAxis.map((a) => a.median));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="fp-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Fázový otisk sálů"
        >
          <motion.div
            key="fp-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(96vw,1080px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 60px ${C.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '92vh',
            }}
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full pointer-events-none opacity-25"
              style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <Fingerprint className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Fázový otisk sálů</h2>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Časový profil fází vs. medián traktu</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 96px)' }}>
              {N === 0 ? (
                <div className="text-center py-12">
                  <Fingerprint className="w-10 h-10 mx-auto mb-3" style={{ color: C.slate }} />
                  <p className="text-sm text-white/50">Zatím nejsou k dispozici žádná fázová data dne.</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  {/* Radar */}
                  <div className="flex-shrink-0">
                    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[460px]" style={{ aspectRatio: '1' }}>
                      {/* mřížkové prstence */}
                      {[0.25, 0.5, 0.75, 1].map((r, gi) => (
                        <polygon
                          key={gi}
                          points={model.axes.map((_, i) => { const p = pt(i, r); return `${p.x},${p.y}`; }).join(' ')}
                          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                        />
                      ))}
                      {/* paprsky + popisky */}
                      {model.axes.map((ax, i) => {
                        const edge = pt(i, 1);
                        const lbl = pt(i, 1.16);
                        const anchor = Math.abs(lbl.x - CX) < 12 ? 'middle' : lbl.x > CX ? 'start' : 'end';
                        return (
                          <g key={i}>
                            <line x1={CX} y1={CY} x2={edge.x} y2={edge.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <text x={lbl.x} y={lbl.y} textAnchor={anchor as 'start' | 'middle' | 'end'} dominantBaseline="middle" fontSize="9.5" fill="rgba(255,255,255,0.6)" fontWeight="600">
                              {ax.name.length > 14 ? `${ax.name.slice(0, 13)}…` : ax.name}
                            </text>
                          </g>
                        );
                      })}

                      {/* medián — šedá přerušovaná osnova */}
                      <polygon points={medianPoly} fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" strokeDasharray="4 4" />

                      {/* polygony vybraných sálů */}
                      {model.rooms.filter((r) => selected.includes(r.id)).map((r) => {
                        const col = colorForRoom(r.id);
                        const poly = polygon(model.roomValues(r));
                        return (
                          <motion.g key={r.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} style={{ transformOrigin: `${CX}px ${CY}px` }}>
                            <polygon points={poly} fill={`${col}1f`} stroke={col} strokeWidth="2" style={{ filter: `drop-shadow(0 0 5px ${col}70)` }} />
                            {model.axisNames.map((_, i) => {
                              const v = model.roomValues(r)[i];
                              const ratio = Math.max(0.02, Math.min(1, v / model.perAxis[i].max));
                              const p = pt(i, ratio);
                              return <circle key={i} cx={p.x} cy={p.y} r="3" fill={col} style={{ filter: `drop-shadow(0 0 3px ${col})` }} />;
                            })}
                          </motion.g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Postranní panel: výběr sálů + legenda */}
                  <div className="flex-1 w-full min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45 mb-2">Sály (klikni pro zobrazení)</p>
                    <div className="flex flex-col gap-1.5 mb-4">
                      {model.rooms.map((r) => {
                        const on = selected.includes(r.id);
                        const col = colorForRoom(r.id);
                        const totalMin = model.roomValues(r).reduce((s, v) => s + v, 0);
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelected((prev) => prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id])}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors"
                            style={{ background: on ? `${col}14` : 'rgba(255,255,255,0.02)', border: `1px solid ${on ? `${col}45` : C.border}` }}
                          >
                            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: on ? col : 'transparent', border: `1.5px solid ${on ? col : 'rgba(255,255,255,0.3)'}`, boxShadow: on ? `0 0 6px ${col}80` : 'none' }} />
                            <span className="text-sm font-semibold flex-1 truncate" style={{ color: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>{r.name}</span>
                            <span className="text-[11px] font-mono tabular-nums text-white/40 flex-shrink-0">{Math.floor(totalMin / 60)}h {String(totalMin % 60).padStart(2, '0')}m</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <span className="w-4 h-0 border-t-2 border-dashed flex-shrink-0" style={{ borderColor: 'rgba(148,163,184,0.55)' }} />
                      Medián traktu (referenční profil)
                    </div>
                    <p className="text-[11px] text-white/35 mt-3 leading-relaxed">
                      Špička polygonu za osnovou mediánu = sál v dané fázi tráví víc času než zbytek traktu — kandidát na optimalizaci.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhaseFingerprint;
