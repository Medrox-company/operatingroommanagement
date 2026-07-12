'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OperatingRoom } from '../../types';

/* =============================================================================
   MobileFlowView — „Tok pacienta" (mobil)
   Věrná implementace prototypu: světlý podklad, filtr pilulky, karty pacientů
   s kruhovým číslem, 4segmentový progress (Příjem → Příprava → Sál →
   Propuštění), rozbalený detail s časy, status chipy a patičkou
   AKTUÁLNÍ POLOHA / ODHAD PROPUŠTĚNÍ.
   ========================================================================== */

const NAVY = '#1E3560';
const BLUE = '#2952C8';
const GREEN = '#3BA273';
const MUTED = '#7C8AA5';
const FAINT = '#9AA7BF';
const TRACK = '#E7ECF5';

interface Props {
  rooms: OperatingRoom[];
}

type StepState = 'done' | 'current' | 'waiting';

interface FlowStep {
  label: string;
  time: string | null;
  state: StepState;
}

const fmt = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
};

/** Odvodí 4 kroky toku pacienta z dat sálu. */
function buildFlow(room: OperatingRoom): { steps: FlowStep[]; currentIdx: number } {
  const called = !!room.patientCalledAt;
  const arrived = !!room.patientArrivedAt;
  const inOr = room.currentStepIndex > 0 && room.currentStepIndex < 6;
  const discharged = room.currentStepIndex >= 6;

  // Index aktuálního kroku (0-3); -1 = nic nezačalo
  let currentIdx = -1;
  if (called) currentIdx = 0;
  if (arrived) currentIdx = 1;
  if (inOr) currentIdx = 2;
  if (discharged) currentIdx = 3;

  const mk = (i: number, label: string, time: string | null): FlowStep => ({
    label,
    time,
    state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'waiting',
  });

  return {
    steps: [
      mk(0, 'Příjem', fmt(room.patientCalledAt)),
      mk(1, 'Příprava', fmt(room.patientArrivedAt)),
      mk(2, 'Sál', fmt(room.operationStartedAt)),
      mk(3, 'Propuštění', discharged ? fmt(room.estimatedEndTime) : null),
    ],
    currentIdx,
  };
}

const STEP_CHIP: Record<StepState, { label: string; bg: string; color: string }> = {
  done: { label: 'DOKONČENO', bg: '#DFF2E9', color: GREEN },
  current: { label: 'PROBÍHÁ', bg: '#E1E9F8', color: BLUE },
  waiting: { label: 'ČEKÁ', bg: '#EDF1F8', color: FAINT },
};

const MobileFlowView: React.FC<Props> = ({ rooms }) => {
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sály s aktivitou pacienta první, pak ostatní aktivní
  const flowRooms = useMemo(() => {
    const withFlow = rooms.filter(
      r => r.patientCalledAt || r.patientArrivedAt || r.currentStepIndex > 0,
    );
    return withFlow.length > 0 ? withFlow : rooms;
  }, [rooms]);

  const visible = filter === 'all' ? flowRooms : flowRooms.filter(r => r.id === filter);
  const expanded = expandedId ?? visible[0]?.id ?? null;

  return (
    <>
      {/* Světlý podklad */}
      <div aria-hidden className="fixed inset-0 md:hidden pointer-events-none" style={{ zIndex: 0, background: '#EDF1F8' }} />

      <div
        className="md:hidden h-full w-full overflow-y-auto hide-scrollbar relative"
        style={{ zIndex: 1, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="flex flex-col gap-4 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}
        >
          {/* Titulek */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-extrabold uppercase tracking-tight leading-none" style={{ color: NAVY }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: GREEN }} />
            Tok pacienta
          </h1>

          {/* Filtr pilulky — horizontální scroll */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            {[{ id: 'all', label: 'Všechny' }, ...flowRooms.map(r => ({ id: r.id, label: r.name }))].map(p => {
              const active = filter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setFilter(p.id)}
                  className="shrink-0 h-9 px-4 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors"
                  style={active
                    ? { background: NAVY, color: '#FFFFFF' }
                    : { background: '#FFFFFF', color: NAVY, border: '1px solid #DCE4F0' }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Karty pacientů/sálů */}
          <div className="flex flex-col gap-3">
            {visible.map((room, idx) => {
              const { steps, currentIdx } = buildFlow(room);
              const isOpen = expanded === room.id;
              const posLabel = currentIdx >= 0 ? steps[currentIdx].label : 'Čeká';
              const chip = currentIdx >= 0 ? steps[currentIdx].label : '—';
              const eta = fmt(room.estimatedEndTime);

              return (
                <div
                  key={room.id}
                  className="rounded-[18px] overflow-hidden"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
                    border: isOpen ? '1px solid #C9D8F2' : '1px solid transparent',
                  }}
                >
                  {/* Hlavička karty */}
                  <button
                    onClick={() => setExpandedId(isOpen ? '' : room.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
                  >
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[13px] font-extrabold tabular-nums"
                      style={{ background: '#E1E9F8', color: NAVY }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-extrabold leading-tight truncate" style={{ color: NAVY }}>
                        {room.currentProcedure?.name || `Pacient ${String(idx + 1).padStart(2, '0')}`}
                      </span>
                      <span className="block text-[12px] font-medium mt-0.5 truncate" style={{ color: MUTED }}>
                        {room.name}
                      </span>
                      {/* 4segmentový progress */}
                      <span className="mt-2 flex gap-1.5">
                        {steps.map((s, i) => (
                          <span
                            key={i}
                            className="h-[5px] flex-1 rounded-full"
                            style={{
                              background: s.state === 'done' ? GREEN : s.state === 'current' ? NAVY : TRACK,
                            }}
                          />
                        ))}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="px-2.5 h-6 rounded-full inline-flex items-center text-[9.5px] font-bold uppercase tracking-wide"
                        style={{ background: '#E1E9F8', color: NAVY }}
                      >
                        {chip}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums" style={{ color: FAINT }}>
                        krok {Math.max(1, currentIdx + 1)} / 4
                      </span>
                    </span>
                  </button>

                  {/* Rozbalený detail kroků */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          {steps.map((s, i) => {
                            const meta = STEP_CHIP[s.state];
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 py-3"
                                style={{ borderTop: '1px solid #EDF1F8', opacity: s.state === 'waiting' ? 0.65 : 1 }}
                              >
                                <span
                                  className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-[12px] font-bold tabular-nums"
                                  style={{
                                    background: s.state === 'waiting' ? '#EDF1F8' : '#E1E9F8',
                                    color: s.state === 'waiting' ? FAINT : NAVY,
                                  }}
                                >
                                  {i + 1}
                                </span>
                                <span className="flex-1 text-[14px] font-bold" style={{ color: NAVY }}>
                                  {s.label}
                                </span>
                                <span className="text-[13px] font-semibold tabular-nums" style={{ color: s.time ? NAVY : FAINT }}>
                                  {s.time || '--:--'}
                                </span>
                                <span
                                  className="px-2 h-6 rounded-full inline-flex items-center text-[9px] font-bold uppercase tracking-wide shrink-0"
                                  style={{ background: meta.bg, color: meta.color }}
                                >
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })}

                          {/* Patička — poloha + odhad propuštění */}
                          <div className="flex items-end justify-between pt-3" style={{ borderTop: '1px solid #EDF1F8' }}>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: FAINT }}>
                                Aktuální poloha
                              </p>
                              <p className="text-[15px] font-extrabold mt-1 leading-none" style={{ color: NAVY }}>
                                {posLabel}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: FAINT }}>
                                Odhad propuštění
                              </p>
                              <p className="text-[17px] font-extrabold mt-1 leading-none tabular-nums" style={{ color: NAVY }}>
                                {eta || '--:--'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {visible.length === 0 && (
              <div
                className="rounded-[18px] px-4 py-8 text-center"
                style={{ background: '#FFFFFF', boxShadow: '0 8px 20px rgba(23,43,99,0.06)' }}
              >
                <p className="text-sm font-medium" style={{ color: MUTED }}>
                  Žádný aktivní tok pacienta.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileFlowView;
