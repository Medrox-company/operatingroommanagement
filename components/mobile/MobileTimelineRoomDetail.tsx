'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clock3 } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import type { MobileTimelineStatus } from '../../lib/mobile-timeline';
import { mobilePhaseBreakdown, phaseDurationLabel } from '../../lib/mobile-phase-breakdown';
import { mobileRoomPhase } from '../../lib/mobile-room-display';
import { useNowMsAtGranularity } from '../../hooks/useSharedClock';
import './mobile-timeline-room-detail.css';

const time = (ms: number) => Number.isFinite(ms)
  ? new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—';
const date = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
const keyOf = (cycle: { startedAt: string; endedAt: string }) => `${cycle.startedAt}/${cycle.endedAt}`;

export default function MobileTimelineRoomDetail({ room, statuses, cycleEndedAt, onClose }: {
  room: OperatingRoom; statuses: MobileTimelineStatus[]; cycleEndedAt?: Date | null; onClose: () => void;
}) {
  const now = useNowMsAtGranularity(10_000);
  const cycles = (room.completedOperations ?? []).filter(cycle => Number.isFinite(Date.parse(cycle.startedAt))
    && Date.parse(cycle.endedAt) >= Date.parse(cycle.startedAt) && Date.parse(cycle.endedAt) <= now)
    .slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const [selection, setSelection] = useState(() => !cycleEndedAt && room.currentStepIndex === 0 && cycles[0] ? keyOf(cycles[0]) : 'live');
  const selectedCycle = !cycleEndedAt && selection !== 'live' ? cycles.find(cycle => keyOf(cycle) === selection) : undefined;
  const completed = Boolean(cycleEndedAt || selectedCycle);
  const startMs = Date.parse(selectedCycle?.startedAt ?? room.operationStartedAt ?? room.phaseStartedAt ?? '');
  const endMs = selectedCycle ? Date.parse(selectedCycle.endedAt) : cycleEndedAt?.getTime() ?? now;
  const pauseMs = !completed && room.isPaused ? Date.parse(room.pausedAt ?? '') : NaN;
  const phaseEndMs = Number.isFinite(pauseMs) ? Math.min(endMs, Math.max(startMs, pauseMs)) : endMs;
  const history = selectedCycle?.statusHistory ?? room.statusHistory;
  // No extrapolation of the previous operation while a room is ready.
  const hasLiveCycle = completed || (room.currentStepIndex > 0 && Boolean(room.operationStartedAt));
  const rows = hasLiveCycle ? mobilePhaseBreakdown(history, statuses, startMs, phaseEndMs, !completed && !room.isPaused) : [];
  const missing = statuses.map((status, index) => ({ status, index })).filter(({ index }) => !rows.some(row => row.stepIndex === index));
  const phase = mobileRoomPhase(room, statuses);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backButton = backRef.current;
    backButton?.focus();
    const back = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      // A drawer above this page owns Back/Escape until it is dismissed.
      if (document.querySelector('[role="dialog"][data-state="open"], [role="dialog"][aria-modal="true"]')) return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    window.addEventListener('keydown', back, true);
    window.addEventListener('nativeBackButton', back, true);
    return () => {
      window.removeEventListener('keydown', back, true);
      window.removeEventListener('nativeBackButton', back, true);
      // Do not steal focus from the global dock when navigating to another module.
      if (document.activeElement === backButton || document.activeElement === document.body) opener?.focus();
    };
  }, [onClose]);

  return createPortal(<section className="mobile-phase-detail" aria-label={`Rozpis fází sálu ${room.name}`} lang="cs">
    <header className="mobile-phase-detail-header">
      <button ref={backRef} type="button" onClick={onClose} aria-label="Zpět na rozpis"><ArrowLeft size={23} aria-hidden /></button>
      <div><p>Rozpis sálu</p><h1>{room.name}</h1><span>{room.department || 'Operační sál'}</span></div>
    </header>
    <div className="mobile-phase-detail-content">
      <div className="mobile-phase-detail-state"><i style={{ background: phase.color }} aria-hidden />{cycleEndedAt ? 'Dokončený cyklus' : `Nyní: ${phase.title}`}</div>
      {!cycleEndedAt && <label className="mobile-phase-cycle-picker">Zobrazený cyklus
        <select value={selectedCycle ? keyOf(selectedCycle) : 'live'} onChange={event => setSelection(event.target.value)}>
          <option value="live">Aktuální cyklus</option>
          {cycles.map(cycle => <option key={keyOf(cycle)} value={keyOf(cycle)}>{date(Date.parse(cycle.startedAt))} · {time(Date.parse(cycle.startedAt))}–{time(Date.parse(cycle.endedAt))}</option>)}
        </select>
      </label>}
      <div className="mobile-phase-summary">
        <div><span>{completed ? 'Dokončený cyklus' : 'Aktuální cyklus'}</span><strong>{hasLiveCycle && Number.isFinite(startMs) && endMs >= startMs ? phaseDurationLabel(endMs - startMs) : '—'}</strong></div>
        <div><span>{hasLiveCycle && Number.isFinite(startMs) ? date(startMs) : 'Začátek – konec'}</span><strong>{hasLiveCycle ? time(startMs) : '—'} <small>–</small> {completed ? time(endMs) : hasLiveCycle ? 'nyní' : '—'}</strong></div>
      </div>
      <div className="mobile-phase-section-heading"><h2>Časy jednotlivých fází</h2><Clock3 size={18} aria-hidden /></div>
      <p className="mobile-phase-caption">Zaznamenané intervaly{!completed && rows.length > 0 ? ' · průběžně aktualizováno' : ''}</p>
      {rows.length > 0 ? <ol className="mobile-phase-list">{rows.map(row => <li key={row.key} style={{ '--phase-color': row.color } as React.CSSProperties}>
        <span className="mobile-phase-marker" aria-hidden />
        <div className="mobile-phase-row-heading"><h3>{row.name}</h3><strong>{phaseDurationLabel(row.endMs - row.startMs)}</strong></div>
        <div className="mobile-phase-row-time"><span><time dateTime={new Date(row.startMs).toISOString()}>{time(row.startMs)}</time> – {row.live ? 'nyní' : <time dateTime={new Date(row.endMs).toISOString()}>{date(row.startMs) !== date(row.endMs) ? `${date(row.endMs)} ` : ''}{time(row.endMs)}</time>}</span>{row.live && <span className="mobile-phase-live">Probíhá</span>}</div>
      </li>)}</ol> : <div className="mobile-phase-empty">{hasLiveCycle ? 'Pro tento cyklus nejsou zaznamenány časy fází.' : 'Sál nyní nemá aktivní cyklus. Dokončený cyklus můžete vybrat výše.'}</div>}
      {Number.isFinite(pauseMs) && <p className="mobile-phase-pause">Pauza od {time(pauseMs)} · {phaseDurationLabel(Math.max(0, now - pauseMs))}. Aktuální pauza se do času fáze nezapočítává.</p>}
      {missing.length > 0 && <details className="mobile-phase-missing"><summary>Fáze bez časového záznamu ({missing.length})</summary><ul>{missing.map(({ status, index }) => <li key={index}>{status.name || status.title || `Fáze ${index + 1}`}<span>Bez záznamu</span></li>)}</ul></details>}
    </div>
  </section>, document.body);
}
