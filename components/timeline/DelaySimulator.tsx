import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, AlertTriangle, CheckCircle2, ArrowRight, Clock, Activity } from 'lucide-react';
import { OperatingRoom, DEFAULT_WEEKLY_SCHEDULE } from '../../types';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   SIMULÁTOR ZPOŽDĚNÍ — „Co kdyby?"
   Posuvníkem přidáš zpoždění běžícím operacím a OKAMŽITĚ vidíš kaskádu:
   které sály spadnou do přesahu, o kolik naroste ARO přesah a kdy skončí
   poslední operace. Bary se živě animují, čísla se přepočítávají v reálném
   čase při tažení posuvníku.
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  currentTime: Date;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const fmt = (t: number) => new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

const DelaySimulator: React.FC<Props> = ({ isOpen, onClose, rooms, currentTime }) => {
  const [delay, setDelay] = useState(0);          // přidané minuty
  const [target, setTarget] = useState<string>('all'); // 'all' | roomId

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Reset při otevření
  useEffect(() => { if (isOpen) { setDelay(0); setTarget('all'); } }, [isOpen]);

  const now = currentTime.getTime();

  // Aktivní operace + provozní konec sálu
  const active = useMemo(() => {
    const todayKey = DAY_KEYS[currentTime.getDay()];
    return rooms
      .filter((r) => r.currentStepIndex > 0 && !r.isLocked && r.operationStartedAt && r.estimatedEndTime)
      .map((r) => {
        const startMs = new Date(r.operationStartedAt as string).getTime();
        const estEndMs = new Date(r.estimatedEndTime as string).getTime();
        const sch = (r.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)[todayKey];
        let workingEndMs: number | null = null;
        if (sch?.enabled) {
          const d = new Date(currentTime);
          d.setHours(sch.endHour, sch.endMinute, 0, 0);
          // konec směny před 7:00 = další den
          if (sch.endHour < 7) d.setDate(d.getDate() + 1);
          workingEndMs = d.getTime();
        }
        return { id: r.id, name: r.name, startMs, estEndMs, workingEndMs };
      })
      .filter((r) => Number.isFinite(r.startMs) && Number.isFinite(r.estEndMs))
      .sort((a, b) => a.estEndMs - b.estEndMs);
  }, [rooms, currentTime]);

  // Výpočet scénáře pro daný posun (0 = výchozí stav)
  const compute = (d: number) => {
    let overtimeRooms = 0;
    let overtimeMin = 0;
    let latestEnd = now;
    const perRoom = active.map((r) => {
      const applied = (target === 'all' || target === r.id) ? d : 0;
      const newEnd = r.estEndMs + applied * 60_000;
      const ot = r.workingEndMs !== null ? Math.max(0, (newEnd - r.workingEndMs) / 60_000) : 0;
      if (ot > 0) { overtimeRooms++; overtimeMin += ot; }
      latestEnd = Math.max(latestEnd, newEnd);
      return { ...r, applied, newEnd, overtimeMin: ot };
    });
    return { perRoom, overtimeRooms, overtimeMin: Math.round(overtimeMin), latestEnd };
  };

  const base = useMemo(() => compute(0), [active, target]);
  const sim = useMemo(() => compute(delay), [active, target, delay]);

  // Okno grafu
  const windowStart = useMemo(() => {
    const ws = Math.min(now, ...active.map((r) => r.workingEndMs ?? now), ...active.map((r) => r.estEndMs));
    return ws - 10 * 60_000;
  }, [active, now]);
  const windowEnd = useMemo(() => {
    const we = Math.max(
      sim.latestEnd,
      ...active.map((r) => r.workingEndMs ?? now),
    );
    return we + 15 * 60_000;
  }, [active, sim.latestEnd, now]);
  const span = Math.max(1, windowEnd - windowStart);
  const pos = (t: number) => Math.max(0, Math.min(100, ((t - windowStart) / span) * 100));

  const LABEL_W = 150;
  const presets = [0, 15, 30, 45, 60, 90];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sim-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Simulátor zpoždění"
        >
          <motion.div
            key="sim-panel"
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
                    <SlidersHorizontal className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Simulátor zpoždění</h2>
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>
                    {delay > 0 ? `+${delay} min` : 'co kdyby?'}
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Dopad zpoždění na přesah a konec provozu</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 96px)' }}>
              {active.length === 0 ? (
                <div className="text-center py-10">
                  <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: C.slate }} />
                  <p className="text-sm text-white/50">Žádná aktivní operace k simulaci.</p>
                </div>
              ) : (
                <>
                  {/* Ovládání: cíl + posuvník */}
                  <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    {/* Cíl */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40 mr-1">Zpozdit:</span>
                      <button
                        onClick={() => setTarget('all')}
                        className="px-3 h-7 rounded-lg text-xs font-semibold transition-colors"
                        style={target === 'all' ? { background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}50` } : { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Všechny aktivní
                      </button>
                      {active.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setTarget(r.id)}
                          className="px-3 h-7 rounded-lg text-xs font-semibold transition-colors truncate max-w-[160px]"
                          style={target === r.id ? { background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}50` } : { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>

                    {/* Posuvník */}
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={0} max={120} step={5} value={delay}
                        onChange={(e) => setDelay(Number(e.target.value))}
                        className="flex-1 delay-slider"
                        style={{ background: `linear-gradient(90deg, ${C.accent} 0%, ${C.accent} ${(delay / 120) * 100}%, rgba(255,255,255,0.12) ${(delay / 120) * 100}%, rgba(255,255,255,0.12) 100%)` }}
                        aria-label="Zpoždění v minutách"
                      />
                      <div className="w-20 text-right">
                        <span className="text-2xl font-black tabular-nums" style={{ color: C.accent }}>+{delay}</span>
                        <span className="text-xs text-white/40 ml-1">min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      {presets.map((p) => (
                        <button
                          key={p}
                          onClick={() => setDelay(p)}
                          className="px-2.5 h-7 rounded-lg text-[11px] font-bold tabular-nums transition-colors"
                          style={delay === p ? { background: `${C.accent}1f`, color: C.accent, border: `1px solid ${C.accent}40` } : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}
                        >
                          {p === 0 ? 'reset' : `+${p}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Srovnávací karty baseline → sim */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <CompareCard
                      label="Sály v přesahu"
                      from={base.overtimeRooms} to={sim.overtimeRooms}
                      worse={sim.overtimeRooms > base.overtimeRooms}
                    />
                    <CompareCard
                      label="Celkový přesah"
                      from={base.overtimeMin} to={sim.overtimeMin} unit="min"
                      worse={sim.overtimeMin > base.overtimeMin}
                    />
                    <CompareCard
                      label="Poslední konec"
                      fromText={fmt(base.latestEnd)} toText={fmt(sim.latestEnd)}
                      worse={sim.latestEnd > base.latestEnd}
                    />
                  </div>

                  {/* Bary jednotlivých sálů */}
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/45">Dopad na jednotlivé sály</span>
                      <span className="flex items-center gap-4 text-[10px] text-white/40">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: C.accent }} /> plán</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${C.red}66 0 3px, transparent 3px 6px)` }} /> zpoždění</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-px" style={{ borderTop: `2px dashed ${C.blue}` }} /> konec směny</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {sim.perRoom.map((r, i) => {
                        const startP = pos(r.startMs);
                        const planEndP = pos(r.estEndMs);
                        const simEndP = pos(r.newEnd);
                        const weP = r.workingEndMs !== null ? pos(r.workingEndMs) : null;
                        const over = r.overtimeMin > 0;
                        return (
                          <div key={r.id} className="flex items-center h-10">
                            <div className="flex-shrink-0 pr-3 truncate" style={{ width: LABEL_W }}>
                              <span className="text-xs font-semibold text-white/85 truncate">{r.name}</span>
                            </div>
                            <div className="relative flex-1 h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}` }}>
                              {/* konec směny */}
                              {weP !== null && (
                                <div className="absolute top-0 bottom-0 w-px" style={{ left: `${weP}%`, backgroundImage: `repeating-linear-gradient(to bottom, ${C.blue}90 0 3px, transparent 3px 6px)` }} title={`Konec směny ${fmt(r.workingEndMs as number)}`} />
                              )}
                              {/* plánovaná část */}
                              <div className="absolute top-[20%] bottom-[20%] rounded-sm" style={{ left: `${startP}%`, width: `${Math.max(0.5, planEndP - startP)}%`, background: `linear-gradient(180deg, ${C.accent}cc, ${C.accent}88)` }} />
                              {/* přidané zpoždění — animovaná šrafa */}
                              <motion.div
                                className="absolute top-[20%] bottom-[20%] rounded-r-sm"
                                style={{ left: `${planEndP}%`, background: `repeating-linear-gradient(135deg, ${C.red}88 0 5px, ${C.red}33 5px 10px)`, borderRight: r.applied > 0 ? `2px solid ${C.red}` : 'none' }}
                                animate={{ width: `${Math.max(0, simEndP - planEndP)}%` }}
                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                              />
                              {/* štítek nového konce */}
                              <motion.span
                                className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono tabular-nums px-1 rounded"
                                animate={{ left: `calc(${simEndP}% + 5px)` }}
                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                style={{ color: over ? C.red : 'rgba(255,255,255,0.7)' }}
                              >
                                {fmt(r.newEnd)}{over && ` · +${fmtDur(r.overtimeMin)}`}
                              </motion.span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verdikt */}
                  <motion.div
                    key={`${sim.overtimeRooms}-${sim.overtimeMin}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: sim.overtimeRooms > base.overtimeRooms ? `${C.red}10` : sim.overtimeMin > 0 ? `${C.yellow}0e` : `${C.green}10`,
                      border: `1px solid ${sim.overtimeRooms > base.overtimeRooms ? `${C.red}30` : sim.overtimeMin > 0 ? `${C.yellow}28` : `${C.green}30`}`,
                    }}
                  >
                    {sim.overtimeRooms > base.overtimeRooms
                      ? <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: C.red }} />
                      : <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: sim.overtimeMin > 0 ? C.yellow : C.green }} />}
                    <p className="text-sm text-white/85">
                      {delay === 0
                        ? 'Posuň posuvník a uvidíš dopad zpoždění na provoz.'
                        : sim.overtimeRooms > base.overtimeRooms
                          ? `Zpoždění +${delay} min uvrhne do přesahu ${sim.overtimeRooms - base.overtimeRooms} sál(ů) navíc — celkem ${sim.overtimeRooms} v přesahu, poslední konec v ${fmt(sim.latestEnd)}.`
                          : sim.overtimeMin > base.overtimeMin
                            ? `Žádný nový sál v přesahu, ale celkový přesah naroste o ${fmtDur(sim.overtimeMin - base.overtimeMin)}.`
                            : `Provoz zpoždění +${delay} min vstřebá bez přesahu. Poslední konec v ${fmt(sim.latestEnd)}.`}
                    </p>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* Srovnávací dlaždice baseline → simulovaný */
const CompareCard: React.FC<{
  label: string; from?: number; to?: number; unit?: string;
  fromText?: string; toText?: string; worse: boolean;
}> = ({ label, from, to, unit, fromText, toText, worse }) => {
  const changed = fromText !== undefined ? fromText !== toText : from !== to;
  const col = !changed ? C.slate : worse ? C.red : C.green;
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${changed ? `${col}30` : C.border}` }}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tabular-nums text-white/55">
          {fromText !== undefined ? fromText : from}{unit ? ` ${unit}` : ''}
        </span>
        {changed && (
          <>
            <ArrowRight className="w-3.5 h-3.5" style={{ color: col }} />
            <motion.span
              key={`${to}-${toText}`}
              initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black tabular-nums"
              style={{ color: col }}
            >
              {toText !== undefined ? toText : to}{unit ? ` ${unit}` : ''}
            </motion.span>
          </>
        )}
      </div>
    </div>
  );
};

export default DelaySimulator;
