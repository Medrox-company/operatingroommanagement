import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, ChevronLeft, ChevronRight, Loader2, CalendarDays, Activity } from 'lucide-react';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { fetchAllCompletedOperationsForDay, CompletedOperation } from '../../lib/db';
import { C, TIMELINE_START_HOUR, TIMELINE_HOURS } from './constants';
import { getTimePercentForTimeline } from './utils';

/* ════════════════════════════════════════════════════════════════════════
   HISTORIE — listování po dnech a zpětné zobrazení časové osy.

   Pro libovolný den načte z `room_status_history` všechny dokončené operace
   a vykreslí je jako barevné fáze na statické časové ose (7:00 → 7:00),
   stejně jako souhrnný režim živé osy, ale pro zvolené datum v minulosti.
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  onSelectRoom?: (id: string) => void;
}

const HOUR_TICKS = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i); // 0..24

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const TimelineHistory: React.FC<Props> = ({ isOpen, onClose, rooms, onSelectRoom }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();

  // Výchozí den = včera (historie = zpětný pohled)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataByRoom, setDataByRoom] = useState<Map<string, CompletedOperation[]>>(new Map());

  const today = useMemo(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }, []);
  const isToday = sameDay(selectedDate, today);
  const isFuture = selectedDate.getTime() > today.getTime();

  // Escape zavře
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') shiftDay(-1);
      else if (e.key === 'ArrowRight') shiftDay(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose, selectedDate]);

  const shiftDay = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      // nelze do budoucnosti
      const t = new Date(); t.setHours(12, 0, 0, 0);
      if (next.getTime() > t.getTime()) return prev;
      return next;
    });
  }, []);

  // Načtení dat pro zvolený den
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllCompletedOperationsForDay(selectedDate)
      .then((map) => {
        if (cancelled) return;
        if (map === null) {
          setError('Historická data nejsou dostupná (databáze není připojena).');
          setDataByRoom(new Map());
        } else {
          setDataByRoom(map);
        }
      })
      .catch(() => { if (!cancelled) { setError('Načtení historie se nezdařilo.'); setDataByRoom(new Map()); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, selectedDate]);

  // Mapa barev fází podle pozice v poli statusů (shodně s živou osou)
  const stepColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    workflowStatuses.forEach((s, idx) => { m[idx] = s.accent_color || s.color || C.slate; });
    return m;
  }, [workflowStatuses]);

  const stepNameMap = useMemo(() => {
    const m: Record<number, string> = {};
    workflowStatuses.forEach((s, idx) => { m[idx] = s.title || s.name || `Fáze ${idx}`; });
    return m;
  }, [workflowStatuses]);

  // Okno dne (7:00 zvoleného dne → 7:00 následujícího dne)
  const windowStart = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    return d;
  }, [selectedDate]);

  // Předpočítané segmenty po sálech
  type Seg = { l: number; w: number; color: string; name: string };
  const lanes = useMemo(() => {
    return rooms.map((room) => {
      const ops = dataByRoom.get(room.id) || [];
      const segs: Seg[] = [];
      let occupiedMs = 0;
      ops.forEach((op) => {
        const opStart = new Date(op.startedAt).getTime();
        const opEnd = new Date(op.endedAt).getTime();
        if (Number.isFinite(opStart) && Number.isFinite(opEnd) && opEnd > opStart) occupiedMs += opEnd - opStart;
        const hist = op.statusHistory || [];
        hist.forEach((entry, idx) => {
          const s = new Date(entry.startedAt).getTime();
          const e = idx + 1 < hist.length ? new Date(hist[idx + 1].startedAt).getTime() : opEnd;
          if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
          const l = getTimePercentForTimeline(new Date(s), windowStart);
          const r = getTimePercentForTimeline(new Date(e), windowStart);
          const w = Math.min(100, r) - Math.max(0, l);
          if (w <= 0) return;
          segs.push({
            l: Math.max(0, l),
            w,
            color: stepColorMap[entry.stepIndex] || entry.color || C.slate,
            name: entry.stepName || stepNameMap[entry.stepIndex] || 'Fáze',
          });
        });
      });
      return { id: room.id, name: room.name, department: room.department, ops: ops.length, occupiedMs, segs };
    });
  }, [rooms, dataByRoom, windowStart, stepColorMap, stepNameMap]);

  const totals = useMemo(() => {
    const operations = lanes.reduce((s, l) => s + l.ops, 0);
    const activeRooms = lanes.filter((l) => l.ops > 0).length;
    const occupiedMin = Math.round(lanes.reduce((s, l) => s + l.occupiedMs, 0) / 60000);
    return { operations, activeRooms, occupiedMin };
  }, [lanes]);

  const fmtH = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="hist-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Historie operací"
        >
          <motion.div
            key="hist-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(97vw,1280px)] relative"
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
                    <History className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Historie</h2>
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>
                    {totals.operations} {totals.operations === 1 ? 'operace' : totals.operations >= 2 && totals.operations <= 4 ? 'operace' : 'operací'}
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Listování po dnech · zpětná časová osa</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Den navigátor */}
            <div className="px-6 pb-4 relative z-10">
              <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                <button
                  onClick={() => shiftDay(-1)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/10 text-white/80"
                  style={{ background: C.glass, border: `1px solid ${C.border}` }}
                >
                  <ChevronLeft className="w-4 h-4" /> Předchozí
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: C.accent }} />
                  <span className="text-base font-bold text-white capitalize truncate">
                    {selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {!isToday && (
                    <button
                      onClick={() => { const d = new Date(); d.setHours(12, 0, 0, 0); setSelectedDate(d); }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ background: `${C.accent}18`, color: C.accent, border: `1px solid ${C.accent}35` }}
                    >
                      Dnes
                    </button>
                  )}
                </div>

                <button
                  onClick={() => shiftDay(1)}
                  disabled={isToday || isFuture}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/10 text-white/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  style={{ background: C.glass, border: `1px solid ${C.border}` }}
                >
                  Další <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Obsah */}
            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 188px)' }}>
              {/* Souhrnné metriky dne */}
              {!loading && !error && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Operací celkem', value: String(totals.operations), color: C.accent },
                    { label: 'Aktivních sálů', value: String(totals.activeRooms), color: C.green },
                    { label: 'Obsazený čas', value: fmtH(totals.occupiedMin), color: C.blue },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40">{k.label}</p>
                      <p className="text-2xl font-black tabular-nums mt-1" style={{ color: k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Časová osa */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                {/* Hodinové značky */}
                <div className="relative h-5 mb-2" style={{ marginLeft: 160 }}>
                  {HOUR_TICKS.map((i) => {
                    const hour = (TIMELINE_START_HOUR + i) % 24;
                    const major = i % 3 === 0;
                    if (!major && i !== HOUR_TICKS.length - 1) return null;
                    return (
                      <span
                        key={i}
                        className="absolute -translate-x-1/2 text-[11px] font-mono tabular-nums text-white/45"
                        style={{ left: `${(i / TIMELINE_HOURS) * 100}%` }}
                      >
                        {String(hour).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: C.accent }} />
                    <p className="text-sm text-white/50">Načítám historii…</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <History className="w-8 h-8 text-white/25" />
                    <p className="text-sm text-white/55 max-w-md">{error}</p>
                  </div>
                ) : totals.operations === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <CalendarDays className="w-8 h-8 text-white/25" />
                    <p className="text-sm text-white/55">V tento den neproběhly žádné operace.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {lanes.map((lane, li) => (
                      <motion.button
                        key={lane.id}
                        type="button"
                        onClick={() => onSelectRoom?.(lane.id)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(li * 0.02, 0.4) }}
                        className="group flex items-center gap-0 rounded-xl text-left transition-colors hover:bg-white/[0.025]"
                        style={{ height: 34 }}
                      >
                        {/* Název sálu */}
                        <div className="flex-shrink-0 flex flex-col justify-center pr-3" style={{ width: 160 }}>
                          <span className="text-xs font-semibold text-white truncate">{lane.name}</span>
                          {lane.ops > 0 && (
                            <span className="text-[9px] text-white/35 tabular-nums">{lane.ops} op · {fmtH(Math.round(lane.occupiedMs / 60000))}</span>
                          )}
                        </div>
                        {/* Dráha */}
                        <div className="relative flex-1 h-full rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}` }}>
                          {/* hodinová mřížka */}
                          {HOUR_TICKS.slice(1, -1).map((i) => (
                            i % 3 === 0 ? (
                              <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i / TIMELINE_HOURS) * 100}%`, background: 'rgba(255,255,255,0.05)' }} />
                            ) : null
                          ))}
                          {lane.segs.length === 0 ? (
                            <div className="absolute inset-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-[10px] text-white/20">—</span>
                            </div>
                          ) : (
                            lane.segs.map((sg, i) => (
                              <div
                                key={i}
                                className="absolute top-[18%] bottom-[18%] rounded-[3px]"
                                title={sg.name}
                                style={{
                                  left: `${sg.l}%`,
                                  width: `${Math.max(0.4, sg.w)}%`,
                                  background: `linear-gradient(180deg, ${sg.color}dd 0%, ${sg.color}88 100%)`,
                                  boxShadow: `0 0 8px ${sg.color}28, inset 0 1px 0 rgba(255,255,255,0.18)`,
                                }}
                              />
                            ))
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-white/30 mt-3 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Tip: šipkami ←/→ listuješ po dnech. Kliknutím na sál otevřeš jeho detail.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimelineHistory;
