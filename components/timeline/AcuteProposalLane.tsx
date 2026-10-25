import React from 'react';
import { AlertTriangle, Siren } from 'lucide-react';
import { ACUTE_URGENCY_LABELS, isActiveAcuteRequest, type AcuteRequest, type AcuteUrgency } from '../../lib/acute-requests';
import { C, ROOM_LABEL_WIDTH_CSS } from './constants';
import './acute-proposal-lane.css';

export interface AcuteTimelineProposal {
  request: AcuteRequest;
  startMs: number;
  endMs: number;
  leftPercent: number;
  widthPercent: number;
}

/** Projection only: it never alters recorded room phases, capacity or statistics. */
export function acuteProposalsForWindow(
  requests: readonly AcuteRequest[], roomId: string, windowStartMs: number, windowEndMs: number,
): AcuteTimelineProposal[] {
  const span = windowEndMs - windowStartMs;
  if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs) || span <= 0) return [];
  return requests.flatMap(request => {
    if (!isActiveAcuteRequest(request) || request.proposedRoomId !== roomId) return [];
    // The request's recorded receipt anchors this projection, not a scheduled start.
    const startMs = Date.parse(request.receivedAt);
    const duration = request.estimatedDurationMinutes;
    if (!Number.isFinite(startMs) || !Number.isFinite(duration) || duration <= 0) return [];
    const endMs = startMs + duration * 60_000;
    if (!Number.isFinite(endMs) || endMs <= windowStartMs || startMs >= windowEndMs) return [];
    const leftPercent = (Math.max(startMs, windowStartMs) - windowStartMs) / span * 100;
    const rightPercent = (Math.min(endMs, windowEndMs) - windowStartMs) / span * 100;
    return [{ request, startMs, endMs, leftPercent, widthPercent: rightPercent - leftPercent }];
  }).sort((a, b) => (a.request.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.request.queuePosition ?? Number.MAX_SAFE_INTEGER));
}

const urgencyColor: Record<AcuteUrgency, string> = { emergent: C.red, urgent: C.green, expedited: C.blue };
const time = (milliseconds: number) => new Date(milliseconds).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

interface Props {
  proposal: AcuteTimelineProposal;
  roomName: string;
  roomWarning?: string;
  mobile?: boolean;
  onOpen?: () => void;
}

/** One dedicated sub-lane per request keeps proposals separate even when they overlap. */
export function AcuteProposalLane({ proposal, roomName, roomWarning, mobile = false, onOpen }: Props) {
  const { request, startMs, endMs, leftPercent, widthPercent } = proposal;
  const urgency = ACUTE_URGENCY_LABELS[request.urgency];
  const submissionPosition = Number.isSafeInteger(request.submissionPosition) && Number(request.submissionPosition) > 0 ? request.submissionPosition : null;
  const positionLabel = submissionPosition ? `Pořadí při zápisu: ${submissionPosition}` : 'Pořadí při zápisu není dostupné';
  const label = `Návrh — nepotvrzeno. ${positionLabel}. ${roomName}, ${urgency}, ${request.procedureName}. Požadavek zadán ${time(startMs)}. Odhad zobrazený od zadání ${time(startMs)}–${time(endMs)}, ${request.estimatedDurationMinutes} minut. Nejde o skutečný začátek výkonu, rezervaci ani celkovou obsazenost sálu.${roomWarning ? ` ${roomWarning}.` : ''}`;
  const content = <>
    <span className="acute-proposal-lane-label">
      <span className="acute-proposal-position" title={`${positionLabel}. Nejde o aktuální provozní pořadí.`} aria-hidden="true">{submissionPosition ? `#${submissionPosition}` : '—'}</span>
      <span className="acute-proposal-lane-copy">
        <strong title={`${urgency} · ${request.procedureName}`}>{urgency} · {request.procedureName}</strong>
        <small>Zadáno {time(startMs)} · odhad {request.estimatedDurationMinutes} min{roomWarning ? ` · ${roomWarning}` : ''}</small>
      </span>
    </span>
    <span className="acute-proposal-track" aria-hidden="true">
      <span className="acute-proposal-block" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}>
        <span className="acute-proposal-block-content">
          <span className="acute-proposal-block-title">{submissionPosition ? <span className="acute-proposal-block-position">#{submissionPosition} </span> : null}<span className="acute-proposal-block-name">{request.procedureName} · </span><span className="acute-proposal-block-kind">Odhad</span></span>
          <span className="acute-proposal-block-duration">{request.estimatedDurationMinutes}<span className="acute-proposal-block-unit"> min</span></span>
        </span>
      </span>
    </span>
  </>;
  const style = { '--acute-proposal-color': urgencyColor[request.urgency], '--acute-label-width': mobile ? 'var(--mtl-label-width)' : ROOM_LABEL_WIDTH_CSS } as React.CSSProperties;
  return onOpen
    ? <button type="button" className={`acute-proposal-lane${mobile ? ' acute-proposal-mobile' : ''}`} data-request-id={request.id} style={style} aria-label={label} title={label} onClick={onOpen}>{content}</button>
    : <div className={`acute-proposal-lane${mobile ? ' acute-proposal-mobile' : ''}`} data-request-id={request.id} style={style} aria-label={label} title={label}>{content}</div>;
}

interface SummaryProps {
  count: number;
  unassignedCount: number;
  error?: string | null;
  loading?: boolean;
  mobile?: boolean;
  onOpen?: () => void;
}

/** Compact navigation-only control; shares the desktop ARO tile geometry. */
export function AcuteTimelineStatusTile({ count, unassignedCount, error, loading, onOpen }: Omit<SummaryProps, 'mobile'>) {
  const status = error ? 'Akutní požadavky se nepodařilo načíst' : loading ? 'Načítání akutních požadavků…' : `${count} ${count === 1 || (count >= 2 && count <= 4) ? 'čekající' : 'čekajících'}${unassignedCount ? ` · bez přiřazeného sálu ${unassignedCount}` : ''}`;
  const shortStatus = error ? 'Nelze načíst' : loading ? 'Načítání…' : `${count} ${count >= 1 && count <= 4 ? 'čekající' : 'čekajících'}`;
  const props = {
    className: 'timeline-status-tile timeline-status-calm timeline-acute-control',
    'aria-label': `${onOpen ? 'Otevřít akutní požadavky. ' : 'Akutní požadavky. '}${status}`,
    title: `${status}. Bloky odhadu začínají časem zadání požadavku; nejsou rezervací sálu.`,
    'data-state': error ? 'error' : loading ? 'loading' : 'ready',
  };
  const content = <>
    <span className="timeline-acute-icon" aria-hidden="true">{error ? <AlertTriangle size={16} /> : <Siren size={16} />}</span>
    <span className="timeline-acute-copy"><span className="timeline-acute-caption">Akutní požadavky</span><span className="timeline-acute-count" role="status" aria-label={status}>{shortStatus}</span></span>
  </>;
  return onOpen ? <button type="button" {...props} onClick={onOpen}>{content}</button> : <div {...props}>{content}</div>;
}

export function AcuteTimelineSummary({ count, unassignedCount, error, loading, mobile = false, onOpen }: SummaryProps) {
  const text = error ? 'Akutní požadavky se nepodařilo načíst' : loading ? 'Načítání akutních požadavků…' : `Akutní požadavky: ${count}${unassignedCount ? ` · bez přiřazeného sálu ${unassignedCount}` : ''}`;
  return <div className={`acute-timeline-summary${mobile ? ' acute-summary-mobile' : ''}`}>
    <span role="status">{text}</span>
    {onOpen && <button type="button" onClick={onOpen} aria-label="Otevřít akutní požadavky">Otevřít <span aria-hidden="true">↗</span></button>}
    {!mobile && !error && !loading && <small>Bloky odhadu začínají časem zadání požadavku; nejsou rezervací sálu.</small>}
  </div>;
}
