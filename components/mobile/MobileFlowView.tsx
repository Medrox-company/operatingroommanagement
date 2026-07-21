'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OperatingRoom } from '../../types';
import type { WorkflowStatus } from '../../contexts/WorkflowStatusesContext';
import { Activity, Workflow } from 'lucide-react';
import { MobileHeaderMetrics, MobileModuleHeader } from './MobileShell';

/* =============================================================================
   MobileFlowView — „Tok pacienta" (mobil)
   Věrná implementace prototypu: světlý podklad, filtr pilulky, karty pacientů
   s kruhovým číslem, dynamickým průběhem skutečných nemocničních fází,
   rozbaleným detailem s časy, status chipy a patičkou
   AKTUÁLNÍ POLOHA / ODHAD PROPUŠTĚNÍ.
   ========================================================================== */

const NAVY = 'var(--m-text-strong)';
const BLUE = 'var(--m-accent)';
const GREEN = '#3BA273';
const MUTED = 'var(--m-muted)';
const FAINT = 'var(--m-faint)';
const TRACK = 'var(--m-track)';

interface Props {
  rooms: OperatingRoom[];
  statuses: WorkflowStatus[];
  statusesLoading?: boolean;
}

type StepState = 'done' | 'current' | 'waiting';

interface FlowStep {
  id: string;
  label: string;
  color: string;
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

/** Sestaví tok výhradně ze skutečných workflow fází zvoleného zařízení. */
function buildFlow(room: OperatingRoom, statuses: WorkflowStatus[]): { steps: FlowStep[]; currentIdx: number } {
  if (statuses.length === 0) return { steps: [], currentIdx: -1 };

  const exactCurrentIdx = statuses.findIndex(status => status.order_index === room.currentStepIndex);
  const currentIdx = exactCurrentIdx >= 0
    ? exactCurrentIdx
    : Math.min(Math.max(0, room.currentStepIndex || 0), statuses.length - 1);
  const history = [...(room.statusHistory || [])]
    .filter(entry => Number.isFinite(new Date(entry.startedAt).getTime()))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const steps = statuses.map((status, index): FlowStep => {
    const statusIndex = status.order_index ?? index;
    const matchingEntries = history.filter(entry =>
      entry.stepIndex === statusIndex || (statusIndex !== index && entry.stepIndex === index)
    );
    const historyTime = matchingEntries.at(-1)?.startedAt;
    const startedAt = index === currentIdx
      ? room.phaseStartedAt || historyTime
      : historyTime;

    return {
      id: status.id,
      label: status.name || status.title || `Fáze ${index + 1}`,
      color: status.accent_color || status.color || BLUE,
      time: index <= currentIdx ? fmt(startedAt) : null,
      state: index < currentIdx ? 'done' : index === currentIdx ? 'current' : 'waiting',
    };
  });

  return { steps, currentIdx };
}

const STEP_CHIP: Record<StepState, { label: string; bg: string; color: string }> = {
  done: { label: 'DOKONČENO', bg: 'rgba(59,162,115,0.16)', color: GREEN },
  current: { label: 'PROBÍHÁ', bg: 'var(--m-accent-soft)', color: BLUE },
  waiting: { label: 'ČEKÁ', bg: 'var(--m-bg)', color: FAINT },
};

const MobileFlowView: React.FC<Props> = ({ rooms, statuses, statusesLoading = false }) => {
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const realStatuses = useMemo(
    () => [...statuses]
      .filter(status => status.is_active && !status.is_special)
      .sort((a, b) => a.order_index - b.order_index),
    [statuses],
  );

  // Sály s aktivitou pacienta první, pak ostatní aktivní
  const flowRooms = useMemo(() => {
    const withFlow = rooms.filter(
      r => r.patientCalledAt || r.patientArrivedAt || r.currentStepIndex > 0 || (r.statusHistory?.length ?? 0) > 0,
    );
    return withFlow.length > 0 ? withFlow : rooms;
  }, [rooms]);

  const visible = filter === 'all' ? flowRooms : flowRooms.filter(r => r.id === filter);
  const expanded = expandedId ?? visible[0]?.id ?? null;
  const activeCount = flowRooms.filter(room => {
    const { currentIdx } = buildFlow(room, realStatuses);
    return currentIdx > 0 && currentIdx < realStatuses.length - 1;
  }).length;

  return (
    <>
      <div aria-hidden className="mobile-theme-surface fixed inset-0 md:hidden pointer-events-none" style={{ zIndex: 0 }} />

      <div
        className="md:hidden h-full w-full overflow-y-auto hide-scrollbar relative"
        style={{ zIndex: 1, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="flex flex-col gap-4 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}
        >
          <MobileModuleHeader kicker="Živý operační program" title="Tok pacienta">
            <MobileHeaderMetrics
              items={[
                {
                  label: 'Aktivní',
                  value: activeCount,
                  suffix: 'pacientů',
                  color: GREEN,
                  icon: <Activity className="w-5 h-5" strokeWidth={2.2} />,
                },
                {
                  label: 'Sledováno',
                  value: flowRooms.length,
                  suffix: 'sálů',
                  color: BLUE,
                  icon: <Workflow className="w-5 h-5" strokeWidth={2.2} />,
                },
              ]}
            />
          </MobileModuleHeader>

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
                    ? { background: 'var(--m-accent)', color: '#FFFFFF' }
                    : { background: 'var(--m-card)', color: NAVY, border: '1px solid var(--m-border)' }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Karty pacientů/sálů */}
          <div className="flex flex-col gap-3">
            {!statusesLoading && realStatuses.length === 0 && (
              <div
                className="rounded-[18px] px-5 py-6 text-center"
                style={{ background: 'var(--m-card)', border: '1px solid var(--m-border)', color: MUTED }}
              >
                Pro toto zdravotnické zařízení nejsou nastavené žádné aktivní fáze toku.
              </div>
            )}
            {statusesLoading && realStatuses.length === 0 && (
              <div
                className="rounded-[18px] px-5 py-6 text-center"
                style={{ background: 'var(--m-card)', border: '1px solid var(--m-border)', color: MUTED }}
              >
                Načítám skutečné fáze toku…
              </div>
            )}
            {visible.map((room, idx) => {
              const { steps, currentIdx } = buildFlow(room, realStatuses);
              const isOpen = expanded === room.id;
              const posLabel = currentIdx >= 0 ? steps[currentIdx].label : 'Čeká';
              const chip = currentIdx >= 0 ? steps[currentIdx].label : '—';
              const currentColor = currentIdx >= 0 ? steps[currentIdx].color : BLUE;
              const eta = fmt(room.estimatedEndTime);

              return (
                <div
                  key={room.id}
                  className="rounded-[18px] overflow-hidden"
                  style={{
                    background: 'var(--m-card)',
                    boxShadow: 'var(--m-card-shadow)',
                    border: isOpen ? '1px solid var(--m-accent)' : '1px solid var(--m-border)',
                  }}
                >
                  {/* Hlavička karty */}
                  <button
                    onClick={() => setExpandedId(isOpen ? '' : room.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
                  >
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[13px] font-extrabold tabular-nums"
                      style={{ background: 'var(--m-accent-soft)', color: NAVY }}
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
                      {/* Skutečné workflow fáze zařízení */}
                      <span className="mt-2 flex gap-1.5">
                        {steps.map((s, i) => (
                          <span
                            key={s.id}
                            className="h-[5px] flex-1 rounded-full"
                            style={{
                              background: s.state === 'waiting' ? TRACK : s.color,
                            }}
                          />
                        ))}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="px-2.5 h-6 rounded-full inline-flex items-center text-[9.5px] font-bold uppercase tracking-wide"
                        style={{ background: `${currentColor}20`, color: currentColor }}
                      >
                        {chip}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums" style={{ color: FAINT }}>
                        krok {Math.max(1, currentIdx + 1)} / {Math.max(1, steps.length)}
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
                                key={s.id}
                                className="flex items-center gap-3 py-3"
                                style={{ borderTop: '1px solid var(--m-track)', opacity: s.state === 'waiting' ? 0.65 : 1 }}
                              >
                                <span
                                  className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-[12px] font-bold tabular-nums"
                                  style={{
                                    background: s.state === 'waiting' ? 'var(--m-bg)' : `${s.color}20`,
                                    color: s.state === 'waiting' ? FAINT : s.color,
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
                                  style={s.state === 'current'
                                    ? { background: `${s.color}20`, color: s.color }
                                    : { background: meta.bg, color: meta.color }}
                                >
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })}

                          {/* Patička — poloha + odhad propuštění */}
                          <div className="flex items-end justify-between pt-3" style={{ borderTop: '1px solid var(--m-track)' }}>
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
                style={{ background: 'var(--m-card)', boxShadow: '0 8px 20px rgba(23,43,99,0.06)' }}
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
