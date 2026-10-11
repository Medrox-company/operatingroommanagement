import { isActiveAcuteRequest, sortAcuteRequests, type AcuteRequest } from './acute-requests';
import type { AcuteCycleLink } from './acute-cycle-links';

export interface AcuteRoomContext {
  selectedRequest: AcuteRequest;
  followingRequests: AcuteRequest[];
  cycleLink?: AcuteCycleLink;
  /** Current queue selection warning, not a claim about historical clinical order. */
  orderWarning?: {
    selectedPosition: number | null;
    firstRequest: AcuteRequest;
  };
}

/**
 * Read-only context for the ordinary clinical room detail. Selecting a request
 * is not evidence that its operation has begun, and never changes the queue.
 */
export function getAcuteRoomContext(
  requests: readonly AcuteRequest[],
  selectedRequestId: string | null,
  roomId: string,
  hospitalId: string | null,
  cycleLinks: readonly AcuteCycleLink[] = [],
): AcuteRoomContext | null {
  if (!hospitalId || !selectedRequestId || !roomId) return null;

  const queue = sortAcuteRequests(requests.filter(request => (
    request.hospitalId === hospitalId && isActiveAcuteRequest(request)
  )));
  const selectedIndex = queue.findIndex(request => request.id === selectedRequestId);
  if (selectedIndex < 0) return null;

  const selectedRequest = queue[selectedIndex];
  // Reassignment or closure invalidates the old room's selection immediately.
  const cycleLink = cycleLinks.find(link => link.hospitalId === hospitalId && link.requestId === selectedRequestId);
  if (cycleLink ? cycleLink.roomId !== roomId : selectedRequest.proposedRoomId !== roomId) return null;

  const boundIds = new Set(cycleLinks.filter(link => link.hospitalId === hospitalId).map(link => link.requestId));
  const outstanding = queue.filter(request => !boundIds.has(request.id));
  const firstRequest = outstanding[0];
  const outOfOrder = !cycleLink && firstRequest && firstRequest.id !== selectedRequest.id;
  return { selectedRequest: cycleLink ? { ...selectedRequest, procedureName: cycleLink.procedureName,
    urgency: cycleLink.urgency, submissionPosition: cycleLink.submissionPosition, proposedRoomId: cycleLink.roomId } : selectedRequest,
    // An out-of-order selection must not hide either the skipped requests or
    // itself. Keep the real queue intact; selecting never promotes a request.
    followingRequests: outOfOrder ? outstanding : outstanding.filter(request => request.id !== selectedRequest.id),
    ...(outOfOrder ? { orderWarning: { selectedPosition: selectedRequest.queuePosition, firstRequest } } : {}),
    ...(cycleLink ? { cycleLink } : {}),
  };
}
