import React, { useEffect, useId, useRef, type CSSProperties } from 'react';
import { ACUTE_URGENCY_LABELS, type AcuteRequest, type AcuteUrgency } from '../../lib/acute-requests';
import type { OperatingRoom } from '../../types';
import type { AcuteCycleLink } from '../../lib/acute-cycle-links';
import type { AcuteRoomContext } from '../../lib/acute-room-context';
import { C } from '../timeline/constants';
import styles from './acute-room-queue-ribbon.module.css';

export interface AcuteRoomQueueRibbonProps {
  selectedRequest: AcuteRequest;
  followingRequests: readonly AcuteRequest[];
  rooms: readonly OperatingRoom[];
  onSelectRequest?: (request: AcuteRequest) => void;
  mobile?: boolean;
  cycleLink?: AcuteCycleLink;
  orderWarning?: AcuteRoomContext['orderWarning'];
}

const urgencyColors: Record<AcuteUrgency, string> = {
  emergent: C.red,
  urgent: C.green,
  expedited: C.blue,
};

function recordedPosition(value: number | null | undefined): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function roomForRequest(request: AcuteRequest, rooms: readonly OperatingRoom[]) {
  return request.proposedRoomId ? rooms.find(room => room.id === request.proposedRoomId) : undefined;
}

function roomLabel(request: AcuteRequest, rooms: readonly OperatingRoom[]) {
  return roomForRequest(request, rooms)?.name ?? (request.proposedRoomId ? 'Sál není dostupný' : 'Sál nepřiřazen');
}

function estimateLabel(request: AcuteRequest) {
  const minutes = request.estimatedDurationMinutes;
  return Number.isFinite(minutes) && minutes > 0 ? `Odhad ${Math.round(minutes)} min` : 'Odhad není dostupný';
}

function urgencyStyle(urgency: AcuteUrgency): CSSProperties {
  return { '--ribbon-urgency': urgencyColors[urgency] } as CSSProperties;
}

/** Queue context only: opening a request never starts a room's clinical workflow. */
export function AcuteRoomQueueRibbon({
  selectedRequest, followingRequests, rooms, onSelectRequest, mobile = false, cycleLink, orderWarning,
}: AcuteRoomQueueRibbonProps) {
  const id = useId();
  const selectedPosition = recordedPosition(selectedRequest.submissionPosition);
  const selectedUrgency = ACUTE_URGENCY_LABELS[selectedRequest.urgency];
  const selectedRoom = roomForRequest(selectedRequest, rooms);
  const awaitingNextCycle = !cycleLink && (selectedRoom?.currentStepIndex ?? 0) > 0;
  const warning = !cycleLink ? orderWarning : undefined;
  const currentPosition = recordedPosition(warning?.selectedPosition);
  const firstPosition = recordedPosition(warning?.firstRequest.queuePosition);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedNodeRef = useRef<HTMLLIElement>(null);
  // Primitive identity avoids moving the queue on clock ticks or same-data revalidation.
  const orderSelectionKey = warning ? `${selectedRequest.id}:${currentPosition ?? '-'}:${warning.firstRequest.id}` : null;
  useEffect(() => {
    if (!orderSelectionKey) return;
    const scroll = scrollRef.current;
    const item = selectedNodeRef.current;
    if (!scroll || !item) return;
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    const visibleLeft = scroll.scrollLeft;
    const visibleRight = visibleLeft + scroll.clientWidth;
    const nextLeft = left < visibleLeft ? Math.max(0, left - 2)
      : right > visibleRight ? Math.max(0, right - scroll.clientWidth + 2) : null;
    if (nextLeft !== null) scroll.scrollTo({ left: nextLeft, behavior: 'instant' });
  }, [orderSelectionKey]);
  return <section
    className={`${styles.ribbon}${mobile ? ` ${styles.mobile}` : ''}`}
    aria-labelledby={`${id}-selected`}
    data-acute-room-ribbon="true"
  >
    <div className={styles.selected} style={urgencyStyle(selectedRequest.urgency)} data-urgency={selectedRequest.urgency} data-request-id={selectedRequest.id}>
      <div className={styles.eyebrow} id={`${id}-selected`}>
        <span className={styles.statusDot} aria-hidden="true" />
        {cycleLink ? cycleLink.endedAt ? 'Dokončený akutní cyklus' : 'Probíhající akutní cyklus'
          : awaitingNextCycle ? 'Vybráno pro další cyklus' : 'Vybraný akutní výkon'}
        {selectedPosition && <span className={styles.submission} aria-label={`Pořadí při zápisu ${selectedPosition}`} title={`Pořadí při zápisu: ${selectedPosition}. Nejde o aktuální pořadí.`}>#{selectedPosition}</span>}
      </div>
      <h2 className={styles.procedure}>{selectedRequest.procedureName}</h2>
      <div className={styles.metadata}><span className={styles.urgency}>{selectedUrgency}</span><span className={styles.separator} aria-hidden="true">·</span><span>{estimateLabel(selectedRequest)}</span></div>
      <p className={styles.selectedRoom} title={awaitingNextCycle ? 'Sál má rozběhnutý cyklus. Požadavek se přiřadí až při zahájení dalšího příjezdu pacienta.' : undefined}>
        {awaitingNextCycle ? 'Přiřazení při dalším příjezdu pacienta' : roomLabel(selectedRequest, rooms)}
      </p>
      {warning && <div className={styles.orderWarning} id={`${id}-order-warning`} role="status">
        <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg>
        <div><strong>Není dodrženo pořadí výkonů</strong><p>{currentPosition ? `Vybrán požadavek na ${currentPosition}. místě.` : 'Aktuální pořadí vybraného požadavku není dostupné.'} První čeká{firstPosition ? ` (pořadí ${firstPosition})` : ''}: {warning.firstRequest.procedureName} · {roomLabel(warning.firstRequest, rooms)}.</p></div>
      </div>}
    </div>
    <div className={styles.queue}>
      <div className={styles.queueHeading}><h3 id={`${id}-following`}>Následující požadavky</h3><span className={styles.count} aria-label={`Počet následujících požadavků ${followingRequests.length}`}>{followingRequests.length}</span><span className={styles.queueNote}>Dle aktuálního pořadí</span></div>
      {followingRequests.length === 0 ? <p className={styles.empty}>Žádný další požadavek v pořadí</p> : <div className={styles.scroll} ref={scrollRef} role="region" aria-labelledby={`${id}-following`} tabIndex={0}>
        <ol className={styles.list}>
          {followingRequests.map(request => {
            const position = recordedPosition(request.queuePosition);
            const label = roomLabel(request, rooms);
            const urgency = ACUTE_URGENCY_LABELS[request.urgency];
            const canSelect = Boolean(onSelectRequest && roomForRequest(request, rooms));
            const selectedOutOfOrder = Boolean(warning && request.id === selectedRequest.id);
            const accessibleLabel = `${position ? `Pořadí ${position}` : 'Pořadí není dostupné'}. ${request.procedureName}. ${urgency}. ${label}. ${estimateLabel(request)}.${selectedOutOfOrder ? ' Vybráno mimo aktuální pořadí.' : ''}${canSelect ? ' Otevřít detail sálu pro tento požadavek.' : ''}`;
            const content = <>
              <span className={styles.nodeHeading}><span className={styles.statusDot} aria-hidden="true" /><span>{position ? `Pořadí ${position}` : 'Pořadí —'}</span><span className={styles.nodeUrgency}>{urgency}</span>{canSelect && <span className={styles.arrow} aria-hidden="true">↗</span>}</span>
              {selectedOutOfOrder && <span className={styles.selectedMarker}>Vybráno · mimo pořadí</span>}
              <strong className={styles.nodeProcedure}>{request.procedureName}</strong>
              <span className={styles.nodeBottom}><span className={styles.nodeRoom}>{label}</span><span className={styles.nodeEstimate}>{estimateLabel(request)}</span></span>
            </>;
            const nodeClass = `${styles.node}${selectedOutOfOrder ? ` ${styles.selectedNode}` : ''}`;
            const selectedDescription = selectedOutOfOrder ? `${id}-order-warning` : undefined;
            return <li className={styles.item} key={request.id} ref={selectedOutOfOrder ? selectedNodeRef : undefined} data-urgency={request.urgency} data-request-id={request.id} data-selected={selectedOutOfOrder ? 'true' : undefined} style={urgencyStyle(request.urgency)}>
              {canSelect ? <button type="button" className={`${nodeClass} ${styles.selectable}`} aria-label={accessibleLabel} aria-current={selectedOutOfOrder ? 'true' : undefined} aria-describedby={selectedDescription} onClick={() => onSelectRequest?.(request)}>{content}</button> : <div className={nodeClass} aria-label={accessibleLabel} aria-current={selectedOutOfOrder ? 'true' : undefined} aria-describedby={selectedDescription}>{content}</div>}
            </li>;
          })}
        </ol>
      </div>}
    </div>
  </section>;
}

export default AcuteRoomQueueRibbon;
