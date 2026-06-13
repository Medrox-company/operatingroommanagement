import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Clock, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { OperatingRoom } from '../../types';
import { C, TIMELINE_START_HOUR, TIMELINE_HOURS } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   PROGNÓZA KAPACITY — prediktivní vrstva časové osy operačních sálů.

   Z běžících operací (operationStartedAt → estimatedEndTime) a dnešní
   historie spočítá:
     1) ŽIVOU VLNU VYTÍŽENÍ — kolik sálů je současně obsazeno v průběhu dne
        (plná část = realita do teď, navazující projekce = prognóza budoucnosti).
     2) PŘEDPOVĚĎ UVOLNĚNÍ — kdy se každý aktivní sál uvolní, seřazeno.
     3) ÚZKÁ HRDLA — okamžiky, kdy se v krátkém okně uvolní víc sálů naráz
        (nápor na úklid / ARO), s vizuálním varováním.
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  currentTime: Date;
}

const fmt = (t: number) => new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

const BOTTLENECK_WINDOW_MIN = 20; // uvolnění v rámci 20 min = společné hrdlo

const CapacityForecast: React.FC<Props> = ({ isOpen, onClose, rooms, currentTime }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const now = currentTime.getTime();

  const model = useMemo(() => {
    // Okno: 7:00 (dnešní den) → max(teď, nejpozdější odhad konce) + rezerva
    const dayStart = new Date(currentTime);
    dayStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    if (currentTime.getHours() < TIMELINE_START_HOUR) dayStart.setDate(dayStart.getDate() - 1);
    const startMs = dayStart.getTime();

    // Intervaly obsazenosti (realita: completedOperations; živé: start→odhad konce)
    type Iv = { s: number; e: number; future: boolean };
    const intervals: Iv[] = [];
    const freeing: { roomId: string; roomName: string; at: number }[] = [];

    rooms.forEach((room) => {
      (room.completedOperations || []).forEach((op) => {
        const s = new Date(op.startedAt).getTime();
        const e = new Date(op.endedAt).getTime();
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) intervals.push({ s, e, future: false });
      });
      const active = room.currentStepIndex > 0 && !room.isLocked && room.operationStartedAt;
      if (active) {
        const s = new Date(room.operationStartedAt as string).getTime();
        const estEnd = room.estimatedEndTime ? new Date(room.estimatedEndTime).getTime() : NaN;
        const e = Number.isFinite(estEnd) ? Math.max(estEnd, now) : now + 60 * 60 * 1000;
        if (Number.isFinite(s)) {
          intervals.push({ s, e, future: true });
          // Uvolnění = odhad konce (jen pokud je v budoucnu)
          const freeAt = Number.isFinite(estEnd) ? estEnd : e;
          if (freeAt >= now) freeing.push({ roomId: room.id, roomName: room.name, at: freeAt });
        }
      }
    });

    const endMs = Math.max(
      now + 30 * 60 * 1000,
      ...intervals.map((i) => i.e),
      startMs + TIMELINE_HOURS * 3600_000 * 0.5,
    );
    const rangeMs = Math.max(1, endMs - startMs);

    // Vzorkování vlny po 6 minutách
    const STEP = 6 * 60 * 1000;
    const samples: { t: number; count: number; future: boolean }[] = [];
    for (let t = startMs; t <= endMs; t += STEP) {
      let count = 0;
      intervals.forEach((iv) => { if (t >= iv.s && t < iv.e) count++; });
      samples.push({ t, count, future: t > now });
    }
    const peak = Math.max(1, ...samples.map((s) => s.count));
    const totalRooms = rooms.filter((r) => !r.isLocked).length || 1;

    // Předpověď uvolnění + detekce hrdel
    freeing.sort((a, b) => a.at - b.at);
    const bottlenecks: { at: number; rooms: string[] }[] = [];
    let cluster: typeof freeing = [];
    freeing.forEach((f, i) => {
      if (cluster.length === 0) { cluster = [f]; }
      else if (f.at - cluster[0].at <= BOTTLENECK_WINDOW_MIN * 60_000) { cluster.push(f); }
      else { if (cluster.length >= 2) bottlenecks.push({ at: cluster[0].at, rooms: cluster.map((c) => c.roomName) }); cluster = [f]; }
      if (i === freeing.length - 1 && cluster.length >= 2) {
        bottlenecks.push({ at: cluster[0].at, rooms: cluster.map((c) => c.roomName) });
      }
    });

    const currentLoad = samples.find((s) => s.t > now)?.count ?? samples[samples.length - 1]?.count ?? 0;

    return { startMs, endMs, rangeMs, samples, peak, totalRooms, freeing, bottlenecks, currentLoad };
  }, [rooms, currentTime, now]);

  // SVG vlna
  const VB_W = 1000;
  const VB_H = 200;
  const PAD = 8;
  const xOf = (t: number) => PAD + ((t - model.startMs) / model.rangeMs) * (VB_W - 2 * PAD);
  const yOf = (c: number) => VB_H - PAD - (c / model.peak) * (VB_H - 2 * PAD - 14);

  const { linePath, areaPath, splitX } = useMemo(() => {
    const pts = model.samples.map((s) => ({ x: xOf(s.t), y: yOf(s.count) }));
    if (pts.length === 0) return { linePath: '', areaPath: '', splitX: 0 };
    // Hladká křivka (Catmull-Rom → Bézier)
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    const area = `${d} L ${pts[pts.length - 1].x} ${VB_H - PAD} L ${pts[0].x} ${VB_H - PAD} Z`;
    return { linePath: d, areaPath: area, splitX: xOf(now) };
  }, [model, now]);

  // Hodinové značky
  const hourMarks = useMemo(() => {
    const marks: { x: number; label: string }[] = [];
    const d = new Date(model.startMs);
    d.setMinutes(0, 0, 0);
    for (let t = d.getTime(); t <= model.endMs; t += 2 * 3600_000) {
      if (t >= model.startMs) marks.push({ x: xOf(t), label: `${new Date(t).getHours()}:00` });
    }
    return marks;
  }, [model]);

  const nextFree = model.freeing[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cf-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Prognóza kapacity"
        >
          <motion.div
            key="cf-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 24 }}
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
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full pointer-events-none opacity-25"
              style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }}
            />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <TrendingUp className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Prognóza kapacity</h2>
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>
                    {model.currentLoad}/{model.totalRooms} obsazeno
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">
                  Predikce vytížení a uvolnění sálů
                </p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 96px)' }}>
              {/* ── Vlna vytížení ── */}
              <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">Souběžně obsazené sály</span>
                  <span className="flex items-center gap-4 text-[10px] text-white/40">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: C.accent }} /> realita</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${C.accent}66 0 3px, transparent 3px 6px)` }} /> prognóza</span>
                  </span>
                </div>
                <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" style={{ height: 200 }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={C.accent} stopOpacity="0.02" />
                    </linearGradient>
                    <clipPath id="pastClip"><rect x="0" y="0" width={splitX} height={VB_H} /></clipPath>
                    <clipPath id="futureClip"><rect x={splitX} y="0" width={VB_W - splitX} height={VB_H} /></clipPath>
                  </defs>

                  {/* Horizontální vodítka */}
                  {Array.from({ length: model.peak }, (_, i) => i + 1).map((lvl) => (
                    <line key={lvl} x1={PAD} y1={yOf(lvl)} x2={VB_W - PAD} y2={yOf(lvl)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}
                  {/* Hodinové značky */}
                  {hourMarks.map((m, i) => (
                    <g key={i}>
                      <line x1={m.x} y1={PAD} x2={m.x} y2={VB_H - PAD} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <text x={m.x} y={VB_H - 1} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">{m.label}</text>
                    </g>
                  ))}

                  {/* Plocha — minulost (plná) */}
                  <g clipPath="url(#pastClip)">
                    <motion.path d={areaPath} fill="url(#waveFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
                  </g>
                  {/* Plocha — budoucnost (šrafovaná, tlumená) */}
                  <g clipPath="url(#futureClip)" opacity="0.55">
                    <motion.path d={areaPath} fill="url(#waveFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.35 }} />
                    <rect x={splitX} y={PAD} width={VB_W - splitX} height={VB_H - 2 * PAD}
                      fill={`url(#hatch)`} />
                  </g>
                  <defs>
                    <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke={C.accent} strokeWidth="1.4" opacity="0.18" />
                    </pattern>
                  </defs>

                  {/* Křivka — animované vykreslení */}
                  <motion.path
                    d={linePath} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${C.accent}90)` }}
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeInOut' }}
                  />

                  {/* Linie „teď" */}
                  <line x1={splitX} y1={PAD} x2={splitX} y2={VB_H - PAD} stroke="#FF9800" strokeWidth="2" />
                  <circle cx={splitX} cy={PAD + 4} r="3.5" fill="#FF9800" />
                  <text x={splitX} y={PAD - 0} dx="6" fontSize="10" fontWeight="700" fill="#FF9800" fontFamily="monospace">teď</text>

                  {/* Body uvolnění na ose */}
                  {model.freeing.map((f, i) => (
                    <motion.g key={f.roomId} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.06, type: 'spring', stiffness: 320, damping: 18 }}>
                      <circle cx={xOf(f.at)} cy={yOf(0) - 2} r="4" fill={C.green} style={{ filter: `drop-shadow(0 0 5px ${C.green})` }} />
                    </motion.g>
                  ))}
                </svg>
              </div>

              {/* ── Dvě karty: nejbližší uvolnění + úzká hrdla ── */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Příští volný sál */}
                <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${C.green}12 0%, transparent 60%)`, border: `1px solid ${C.green}30` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" style={{ color: C.green }} />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/55">Příští volný sál</span>
                  </div>
                  {nextFree ? (
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white leading-none">{nextFree.roomName}</p>
                        <p className="text-xs text-white/45 mt-1.5">za {fmtDur(Math.max(0, Math.round((nextFree.at - now) / 60000)))}</p>
                      </div>
                      <p className="text-3xl font-black font-mono tabular-nums" style={{ color: C.green }}>{fmt(nextFree.at)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Žádný aktivní sál — vše volné</p>
                  )}
                </div>

                {/* Úzká hrdla */}
                <div className="rounded-2xl p-5" style={{ background: model.bottlenecks.length ? `linear-gradient(135deg, ${C.red}12 0%, transparent 60%)` : 'rgba(255,255,255,0.02)', border: `1px solid ${model.bottlenecks.length ? `${C.red}30` : C.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" style={{ color: model.bottlenecks.length ? C.red : C.slate }} />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/55">Úzká hrdla úklidu / ARO</span>
                  </div>
                  {model.bottlenecks.length ? (
                    <div className="flex flex-col gap-2">
                      {model.bottlenecks.slice(0, 3).map((b, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tabular-nums flex-shrink-0" style={{ background: `${C.red}1c`, color: C.red, border: `1px solid ${C.red}40` }}>{fmt(b.at)}</span>
                          <span className="text-xs text-white/70">{b.rooms.length} sály naráz: {b.rooms.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Uvolňování sálů je rozložené — bez nárazu.</p>
                  )}
                </div>
              </div>

              {/* ── Seznam uvolnění ── */}
              {model.freeing.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-white/40" />
                    <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">Pořadí uvolnění sálů</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {model.freeing.map((f, i) => {
                      const inMin = Math.max(0, Math.round((f.at - now) / 60000));
                      const pct = Math.max(0, Math.min(100, ((f.at - model.startMs) / model.rangeMs) * 100));
                      return (
                        <motion.div
                          key={f.roomId}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>{i + 1}</span>
                          <span className="text-sm font-semibold text-white/90 w-44 flex-shrink-0 truncate">{f.roomName}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.green})` }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }} />
                          </div>
                          <span className="text-xs font-mono tabular-nums text-white/50 flex-shrink-0 w-14 text-right">{inMin > 0 ? `${inMin}m` : 'teď'}</span>
                          <span className="text-sm font-mono tabular-nums font-bold flex-shrink-0 w-14 text-right" style={{ color: C.green }}>{fmt(f.at)}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {model.freeing.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-9 h-9 mx-auto mb-3" style={{ color: C.slate }} />
                  <p className="text-sm text-white/50">Žádné aktivní operace — kapacita je plně volná.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CapacityForecast;
