'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowRightLeft, Clock3, Inbox } from 'lucide-react';
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
import type { AcuteDepartmentOption } from './AcuteRequestForm';

interface AcuteQueueProps {
  requests: AcuteRequest[];
  departments: AcuteDepartmentOption[];
  windows: UrgencyWindows;
  nowMs: number;
  onMove: (id: string, toPosition: number, reason: MoveReasonId) => void;
}

const WINDOW_TEXT = {
  'v-okne': { label: 'v okně', color: 'rgba(255,255,255,0.6)' },
  'krati-se': { label: 'okno se krátí', color: '#FBBF24' },
  'vyprselo': { label: 'okno vypršelo', color: '#FB7185' },
} as const;

/**
 * Provozní fronta požadavků.
 *
 * Posun pořadí je povolený — provoz má své důvody, které klinický stupeň
 * nezná. Ale nesmí být nenápadný: posunutá položka si nese značku odkud kam,
 * s jakým důvodem a kdy. A položka, která stojí jinde, než by podle stupně
 * stála, to má napsané u sebe, i když ji posunul někdo jiný a dávno.
 *
 * Posun se dělá tlačítky nahoru/dolů, ne přetahováním: na dotykové obrazovce
 * je přetahování v seznamu nespolehlivé a omylem přesunuté pořadí akutních
 * výkonů je horší než o dva dotyky pomalejší ovládání.
 */
export default function AcuteQueue({ requests, departments, windows, nowMs, onMove }: AcuteQueueProps) {
  const [pendingMove, setPendingMove] = useState<{ id: string; toPosition: number } | null>(null);
  const queue = operationalOrder(requests);

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
        <Inbox className="h-7 w-7 text-white/25" strokeWidth={1.5} aria-hidden />
        <p className="text-[13.5px] text-white/60">Žádné akutní požadavky.</p>
        <p className="max-w-xs text-[11.5px] leading-relaxed text-white/40">
          Zadané požadavky se objeví tady a zároveň jako obrys v časové ose.
        </p>
      </div>
    );
  }

  const departmentName = (id: string) => departments.find(item => item.id === id)?.name ?? 'Neuvedeno';
  const departmentColor = (id: string) => departments.find(item => item.id === id)?.accent_color || '#64748B';

  return (
    <ol className="flex flex-col gap-2" aria-label="Provozní fronta akutních požadavků">
      {queue.map((request, index) => {
        const level = urgencyLevel(request.urgency);
        const state = windowState(request, windows, nowMs);
        const windowText = WINDOW_TEXT[state.status];
        const drift = clinicalDrift(requests, request.id);
        const isMoveOpen = pendingMove?.id === request.id;

        return (
          <li
            key={request.id}
            className="rounded-xl border bg-white/[0.022] p-3.5"
            style={{ borderColor: state.status === 'vyprselo' ? 'rgba(251,113,133,0.35)' : 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start gap-3">
              {/* pozice ve frontě */}
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums"
                style={{ background: `${level.color}1f`, color: level.color }}
                aria-label={`Pozice ${request.order}`}
              >
                {request.order}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[14px] font-semibold text-white/95">{request.procedure}</span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ background: `${level.color}22`, color: level.color }}
                  >
                    {level.label}
                  </span>
                </div>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-white/55">
                  <span style={{ color: departmentColor(request.departmentId) }}>{departmentName(request.departmentId)}</span>
                  <span aria-hidden className="text-white/20">·</span>
                  <span>{request.patientSurname}{request.patientWard ? `, ${request.patientWard}` : ''}</span>
                  <span aria-hidden className="text-white/20">·</span>
                  <span className="tabular-nums">{formatDuration(request.estimatedMinutes)}</span>
                </p>

                {request.note ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-amber-200/75">{request.note}</p>
                ) : null}

                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="flex items-center gap-1.5" style={{ color: windowText.color }}>
                    <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {windowText.label}
                    <span className="tabular-nums">
                      {state.remainingMinutes >= 0
                        ? `· zbývá ${formatDuration(state.remainingMinutes)}`
                        : `· přesah ${formatDuration(state.remainingMinutes)}`}
                    </span>
                  </span>
                  <span className="text-white/40 tabular-nums">čeká {formatDuration(waitingMinutes(request, nowMs))}</span>
                </p>

                {/* Stopa po posunu — bez ní by nebylo poznat, že pořadí někdo změnil. */}
                {request.move && request.move.fromPosition !== request.move.toPosition ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] leading-snug text-white/65">
                    <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" strokeWidth={2} aria-hidden />
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
                  <p className="mt-2 text-[11px] text-white/45">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.08] disabled:opacity-25"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={index === queue.length - 1}
                  onClick={() => setPendingMove({ id: request.id, toPosition: request.order + 1 })}
                  aria-label={`Posunout ${request.procedure} o jednu pozici dozadu`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.08] disabled:opacity-25"
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>

            {/* Důvod posunu je povinný — jedno kliknutí, ne esej. */}
            {isMoveOpen ? (
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.06] p-3">
                <p className="mb-2 text-[11.5px] font-semibold text-cyan-50">
                  Důvod posunu na {pendingMove.toPosition}. pozici
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MOVE_REASONS.filter(reason => reason.id !== 'zmena-stupne').map(reason => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => {
                        onMove(request.id, pendingMove.toPosition, reason.id);
                        setPendingMove(null);
                      }}
                      className="min-h-[36px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[12px] text-white/85 transition-colors hover:bg-white/[0.1]"
                    >
                      {reason.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPendingMove(null)}
                    className="min-h-[36px] rounded-lg px-3 text-[12px] text-white/50 transition-colors hover:text-white/80"
                  >
                    Zpět
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
