'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowRightLeft, ArrowUp, Clock3 } from 'lucide-react';
import {
  MOVE_REASONS,
  clinicalDrift,
  formatDuration,
  moveReasonLabel,
  operationalOrder,
  urgencyLevel,
  waitingMinutes,
  windowState,
  type AcuteRequest,
  type MoveReasonId,
  type UrgencyWindows,
} from '../../lib/acute-requests';
import { C } from '../statistics/statistics-theme';
import { Card, EmptyState } from '../statistics/StatisticsPrimitives';
import type { AcuteDepartmentOption } from './AcuteRequestForm';

interface AcuteQueueProps {
  requests: AcuteRequest[];
  departments: AcuteDepartmentOption[];
  windows: UrgencyWindows;
  nowMs: number;
  onMove: (id: string, toPosition: number, reason: MoveReasonId) => void;
}

/**
 * Provozní fronta požadavků.
 *
 * Plochy, okraje a odstíny textu jdou z tokenů aplikace (objekt C → --stats-*),
 * karta je stejný primitiv jako ve statistikách, ovládací prvky mají geometrii
 * `.dashboard-view-option`. Barvy nesou význam — stupeň a stav okna — nikdy
 * dekoraci.
 *
 * Posun pořadí je povolený; provoz má důvody, které klinický stupeň nezná.
 * Nesmí být ale nenápadný: posunutá položka nese stopu odkud kam, s jakým
 * důvodem a kdy. A položka, která stojí jinde, než by podle stupně stála, to
 * má napsané u sebe, i když ji posunul někdo jiný a dávno.
 *
 * Posun se dělá tlačítky, ne přetahováním: na dotykové obrazovce je přetahování
 * v seznamu nespolehlivé a omylem přehozené pořadí akutních výkonů je horší než
 * ovládání o dva dotyky pomalejší.
 */
export default function AcuteQueue({ requests, departments, windows, nowMs, onMove }: AcuteQueueProps) {
  const [pendingMove, setPendingMove] = useState<{ id: string; toPosition: number } | null>(null);
  const queue = operationalOrder(requests);

  if (queue.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Žádné akutní požadavky"
          desc="Zadané požadavky se objeví tady a zároveň jako obrys v časové ose."
        />
      </Card>
    );
  }

  const departmentName = (id: string) => departments.find(item => item.id === id)?.name ?? 'Neuvedeno';
  const departmentColor = (id: string) => departments.find(item => item.id === id)?.accent_color || C.muted;

  /** Stav okna nese barvu z palety aplikace, ne vlastní odstín. */
  const windowLook = (status: 'v-okne' | 'krati-se' | 'vyprselo') => (
    status === 'vyprselo' ? { label: 'okno vypršelo', color: C.red }
      : status === 'krati-se' ? { label: 'okno se krátí', color: C.yellow }
        : { label: 'v okně', color: C.muted }
  );

  return (
    <ol className="flex flex-col gap-2" aria-label="Provozní fronta akutních požadavků">
      {queue.map((request, index) => {
        const level = urgencyLevel(request.urgency);
        const state = windowState(request, windows, nowMs);
        const look = windowLook(state.status);
        const drift = clinicalDrift(requests, request.id);
        const isMoveOpen = pendingMove?.id === request.id;

        return (
          <li key={request.id}>
            <Card style={state.status === 'vyprselo' ? { border: `1px solid ${C.red}59` } : undefined}>
              <div className="flex items-start gap-3 p-3.5">
                {/* pozice ve frontě */}
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums"
                  style={{ background: `${level.color}1f`, color: level.color }}
                  aria-label={`Pozice ${request.order}`}
                >
                  {request.order}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[13.5px] font-semibold" style={{ color: C.text }}>{request.procedure}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ background: `${level.color}1f`, color: level.color }}
                    >
                      {level.label}
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]" style={{ color: C.muted }}>
                    <span style={{ color: departmentColor(request.departmentId) }}>{departmentName(request.departmentId)}</span>
                    <span aria-hidden style={{ color: C.ghost }}>·</span>
                    <span>{request.patientSurname}{request.patientWard ? `, ${request.patientWard}` : ''}</span>
                    <span aria-hidden style={{ color: C.ghost }}>·</span>
                    <span className="tabular-nums">{formatDuration(request.estimatedMinutes)}</span>
                  </p>

                  {request.note ? (
                    <p className="mt-1.5 text-[11px] leading-snug" style={{ color: C.yellow }}>{request.note}</p>
                  ) : null}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="flex items-center gap-1.5" style={{ color: look.color }}>
                      <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {look.label}
                      <span className="tabular-nums">
                        {state.remainingMinutes >= 0
                          ? `· zbývá ${formatDuration(state.remainingMinutes)}`
                          : `· přesah ${formatDuration(state.remainingMinutes)}`}
                      </span>
                    </span>
                    <span className="tabular-nums" style={{ color: C.faint }}>
                      čeká {formatDuration(waitingMinutes(request, nowMs))}
                    </span>
                  </p>

                  {/* Stopa po posunu — bez ní by nebylo poznat, že pořadí někdo změnil. */}
                  {request.move && request.move.fromPosition !== request.move.toPosition ? (
                    <p
                      className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug"
                      style={{ background: C.surfaceActive, border: `1px solid ${C.border}`, color: C.muted }}
                    >
                      <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: C.faint }} strokeWidth={2} aria-hidden />
                      <span>
                        Pořadí změněno z {request.move.fromPosition}. na {request.move.toPosition}.
                        {' · '}{moveReasonLabel(request.move.reason)}
                        {' · '}{new Date(request.move.at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  ) : null}

                  {/* Odchylka od klinického sledu platí i bez zápisu o posunu —
                      třeba když se fronta přeskládala zařazením akutnějšího výkonu. */}
                  {drift > 0 && !request.move ? (
                    <p className="mt-2 text-[11px]" style={{ color: C.faint }}>
                      Stojí o {drift} {drift === 1 ? 'pozici' : 'pozice'} dál, než odpovídá stupni.
                    </p>
                  ) : null}
                </div>

                {/* posun pořadí */}
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setPendingMove({ id: request.id, toPosition: request.order - 1 })}
                    aria-label={`Posunout ${request.procedure} o jednu pozici dopředu`}
                    className="dashboard-view-option !px-2 disabled:opacity-25"
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={index === queue.length - 1}
                    onClick={() => setPendingMove({ id: request.id, toPosition: request.order + 1 })}
                    aria-label={`Posunout ${request.procedure} o jednu pozici dozadu`}
                    className="dashboard-view-option !px-2 disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Důvod posunu je povinný — jedno kliknutí, ne esej. */}
              {isMoveOpen ? (
                <div className="mx-3.5 mb-3.5 rounded-lg p-3" style={{ background: C.surfaceActive, border: `1px solid ${C.borderHover}` }}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.muted }}>
                    Důvod posunu na {pendingMove.toPosition}. pozici
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOVE_REASONS.filter(reason => reason.id !== 'zmena-stupne').map(reason => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => { onMove(request.id, pendingMove.toPosition, reason.id); setPendingMove(null); }}
                        className="dashboard-view-option"
                      >
                        {reason.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setPendingMove(null)} className="dashboard-view-option">
                      Zpět
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
