'use client';

import React from 'react';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import type { AcuteCycleLink } from '../../lib/acute-cycle-links';
import type { AcuteCircularTimelineNode } from '../../lib/acute-circular-timeline';
import { formatDateTime, URGENCY_LABELS } from './display';
import './acute-circular-timeline.css';

interface AcuteCircularTimelineProps {
  nodes: readonly AcuteCircularTimelineNode[];
  roomNames: ReadonlyMap<string, string>;
  periodText: string;
  unplacedCount?: number;
  onOpenRequest: (requestId: string, button: HTMLButtonElement) => void;
  onOpenCycle: (cycle: AcuteCycleLink, button: HTMLButtonElement) => void;
}

const STATE_LABELS = { waiting: 'Čeká na výkon', begun: 'Cyklus zahájen', performed: 'Provedeno' } as const;
const ANCHOR_LABELS = { waiting: 'Zadáno', begun: 'Zahájeno', performed: 'Dokončeno' } as const;

/** Static outlines identify urgency and state; they are not a progress percentage. */
function TimelineRings() {
  return <svg className="acute-time-rings" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <circle className="acute-time-ring-outer" cx="100" cy="100" r="94" />
    <circle className="acute-time-ring-main" cx="100" cy="100" r="85" />
    <circle className="acute-time-ring-inner" cx="100" cy="100" r="77" />
  </svg>;
}

export default function AcuteCircularTimeline({ nodes, roomNames, periodText, unplacedCount = 0, onOpenRequest, onOpenCycle }: AcuteCircularTimelineProps) {
  const activeNodes = nodes.filter(node => node.state !== 'performed');
  const performedNodes = nodes.filter(node => node.state === 'performed');
  const waiting = activeNodes.filter(node => node.state === 'waiting').length;
  const begun = activeNodes.length - waiting;
  const renderNode = (node: AcuteCircularTimelineNode) => {
    const room = node.roomId ? roomNames.get(node.roomId) ?? 'Sál není v aktuálním seznamu' : 'Bez přiřazeného sálu';
    const waitingLabel = node.waitingMinutes === null ? 'Čas čekání není dostupný' : `Čekání ${node.waitingMinutes} min`;
    const accessibleLabel = `Otevřít ${node.procedureName} · ${STATE_LABELS[node.state]}${node.state === 'waiting' ? ` · ${waitingLabel}` : ''} · ${room} · ${URGENCY_LABELS[node.urgency]}`;
    return <li key={node.id} className="acute-time-node" data-urgency={node.urgency} data-state={node.state} data-size={node.state === 'performed' ? 'compact' : undefined}>
      <div className="acute-time-entry"><span>Původní zápis #{node.submissionPosition ?? '—'}</span>{node.state === 'waiting' && <span>Pořadí {node.currentQueuePosition ?? '—'}</span>}</div>
      <button type="button" className="acute-time-orb" aria-label={accessibleLabel} onClick={event => {
        if (node.cycleLink) onOpenCycle(node.cycleLink, event.currentTarget);
        else onOpenRequest(node.requestId, event.currentTarget);
      }}>
        <TimelineRings />
        <span className="acute-time-center" data-long-number={String(node.waitingMinutes ?? '').length > 5 || undefined} aria-hidden="true">
          {node.state === 'waiting' ? <><strong>{node.waitingMinutes ?? '—'}</strong><span>min čekání</span></> : node.state === 'performed' ? <><Check size={44} strokeWidth={1.5} /><span>Provedeno</span></> : <><Clock3 size={40} strokeWidth={1.5} /><span>Cyklus zahájen</span></>}
        </span>
      </button>
      <div className="acute-time-copy">
        <span className="acute-time-state">{STATE_LABELS[node.state]}</span>
        <h3>{node.procedureName}</h3>
        <p className="acute-time-room">{room}</p>
        <span className="acute-time-urgency"><i aria-hidden />{URGENCY_LABELS[node.urgency]}</span>
      </div>
      <div className="acute-time-axis"><span className="acute-time-axis-dot" aria-hidden /><span>{ANCHOR_LABELS[node.state]}</span><time dateTime={node.anchorAt}>{formatDateTime(node.anchorAt)}</time></div>
      <div className="acute-time-evidence">
        {node.state === 'waiting' ? <><span>Odhad výkonu <strong>{node.estimatedDurationMinutes ?? '—'} min</strong></span><small>Návrh — nepotvrzeno</small></> : <>
          {node.recordedWaitMinutes !== null && <span>Čekání do zahájení cyklu <strong>{node.recordedWaitMinutes} min</strong></span>}
          {node.state === 'performed' && <span>Celý cyklus <strong>{node.cycleMinutes ?? '—'} min</strong></span>}
          {node.supplementalPerformed && <small>Starší cyklus mimo vybrané období</small>}
        </>}
      </div>
    </li>;
  };
  return <section className="acute-circular-timeline" aria-label="Kruhová časová osa akutních výkonů">
    <div className="acute-time-heading">
      <div><h2>Časová osa akutních výkonů</h2><p>Čekající a zahájené výkony nahoře, provedené v boxech pod sebou.</p></div>
      <ul className="acute-time-legend" aria-label="Stavy výkonů">
        <li><Check size={15} aria-hidden /><span>Provedeno <strong>{performedNodes.length}</strong></span></li>
        <li><Clock3 size={15} aria-hidden /><span>Zahájeno <strong>{begun}</strong></span></li>
        <li><span className="acute-time-legend-ring" aria-hidden /><span>Čeká <strong>{waiting}</strong></span></li>
      </ul>
    </div>
    <p className="acute-context-note acute-time-description">Minuty uvnitř čekajícího kruhu běží od přijetí požadavku do zahájení cyklu. Rozestupy jsou schematické, nikoli měřítkem času.</p>
    {unplacedCount > 0 && <p className="acute-context-note" role="note">Počet požadavků bez platného času zadání: {unplacedCount}. Nelze je bezpečně umístit na osu; zůstávají dostupné v záložce Požadavky.</p>}
    {nodes.length ? <>
      {activeNodes.length ? <ol className="acute-time-track" aria-label="Čekající a zahájené výkony chronologicky podle zobrazeného času">
        {activeNodes.map(renderNode)}
      </ol> : <p className="acute-time-active-empty">Žádné čekající ani zahájené výkony.</p>}
      {performedNodes.length > 0 && <section className="acute-time-completed" aria-label="Provedené akutní výkony">
        <div className="acute-time-completed-heading"><h3>Provedené výkony <span>{performedNodes.length}</span></h3><p>{periodText}</p></div>
        <ol className="acute-time-completed-track" aria-label="Provedené výkony chronologicky podle dokončení">
          {performedNodes.map(renderNode)}
        </ol>
      </section>}
      <p className="acute-time-footnote"><ArrowRight size={14} aria-hidden />Kliknutím na kruh otevřete detail. Pořadí na této ose určuje zobrazený čas, nikoli naléhavost nebo ručně upravené pořadí. Časy jsou zaokrouhlené na celé minuty; 0 min může znamenat cyklus kratší než 30 s.</p>
    </> : <div className="acute-time-empty"><Clock3 size={28} aria-hidden /><h3>Zatím bez výkonů na časové ose</h3><p>{unplacedCount ? 'Požadavky nemají platný čas pro umístění na osu.' : 'Nejsou evidovány čekající požadavky ani zahájené nebo provedené cykly ve vybraném období.'}</p></div>}
  </section>;
}
