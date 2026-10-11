import React from 'react';
import type { AcuteCycleLink } from '../../lib/acute-cycle-links';
import { ACUTE_URGENCY_LABELS } from '../../lib/acute-requests';
import { C } from './constants';
import './completed-acute-cycle-label.css';

/** A label inside a real measured cycle, not another estimated time block. */
export function completedAcuteCycleDescription(link: AcuteCycleLink): string {
  const originalPosition = link.submissionPosition === null ? 'pořadí při zápisu není dostupné' : `pořadí při zápisu ${link.submissionPosition}`;
  return `Dokončený akutní výkon: ${link.procedureName}, ${ACUTE_URGENCY_LABELS[link.urgency]}, ${originalPosition}`;
}

export function CompletedAcuteCycleLabel({ link, mobile = false }: { link: AcuteCycleLink; mobile?: boolean }) {
  const urgencyColor = link.urgency === 'emergent' ? C.red : link.urgency === 'urgent' ? C.green : C.blue;
  return <span className={`completed-acute-cycle-label${mobile ? ' completed-acute-cycle-label-mobile' : ''}`}
    data-acute-cycle-request={link.requestId} title={completedAcuteCycleDescription(link)}
    aria-label={completedAcuteCycleDescription(link)} style={{ '--acute-cycle-color': urgencyColor } as React.CSSProperties}>
    <i aria-hidden="true" />
    <span className="completed-acute-cycle-number" aria-hidden="true">#{link.submissionPosition ?? '—'}</span>
    <span className="completed-acute-cycle-kind" aria-hidden="true">Akutní</span>
    <span className="completed-acute-cycle-name" aria-hidden="true">{link.procedureName}</span>
  </span>;
}
