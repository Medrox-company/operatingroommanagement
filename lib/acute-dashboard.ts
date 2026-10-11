import type { OperatingRoom } from '../types';
import { ACUTE_URGENCY_LABELS, isActiveAcuteRequest, sortAcuteRequests, type AcuteRequest } from './acute-requests';
import type { AcuteCycleLink } from './acute-cycle-links';

export interface AcuteDashboardRoomSummary {
  pendingRequests: readonly AcuteRequest[];
  activeCycle?: AcuteCycleLink;
}

/** A read-only projection of the authorized queue onto actual configured rooms. */
export function getAcuteDashboardByRoom(
  requests: readonly AcuteRequest[],
  cycleLinks: readonly AcuteCycleLink[],
  rooms: readonly OperatingRoom[],
  hospitalId: string | null,
): Map<string, AcuteDashboardRoomSummary> {
  const result = new Map<string, AcuteDashboardRoomSummary>();
  if (!hospitalId) return result;
  const roomsById = new Map(rooms.map(room => [room.id, room]));
  const boundRequests = new Set<string>();

  for (const link of cycleLinks) {
    if (link.hospitalId !== hospitalId) continue;
    // A finished or differently assigned real cycle must not appear as a new proposal.
    boundRequests.add(link.requestId);
    const room = roomsById.get(link.roomId);
    if (!room || link.endedAt !== null || room.currentStepIndex <= 0) continue;
    const currentStart = room.operationStartedAt ? Date.parse(room.operationStartedAt) : NaN;
    if (!Number.isFinite(currentStart) || currentStart !== Date.parse(link.operationStartedAt)) continue;
    result.set(room.id, { pendingRequests: [], activeCycle: link });
  }

  const pending = sortAcuteRequests(requests.filter(request => (
    request.hospitalId === hospitalId && isActiveAcuteRequest(request) && !boundRequests.has(request.id)
  )));
  for (const request of pending) {
    if (!request.proposedRoomId || !roomsById.has(request.proposedRoomId)) continue;
    const summary = result.get(request.proposedRoomId);
    if (summary) result.set(request.proposedRoomId, { ...summary, pendingRequests: [...summary.pendingRequests, request] });
    else result.set(request.proposedRoomId, { pendingRequests: [request] });
  }
  return result;
}

/** Complete text remains accessible when a narrow card compacts its visual label. */
export function acuteDashboardDescription(summary: AcuteDashboardRoomSummary | undefined): string {
  if (!summary) return '';
  const running = summary.activeCycle ? `Probíhající akutní cyklus: ${summary.activeCycle.procedureName}, ${ACUTE_URGENCY_LABELS[summary.activeCycle.urgency]}.` : '';
  const pending = summary.pendingRequests.map(request => (
    `${request.queuePosition === null ? 'Pořadí nenastaveno' : `Pořadí ${request.queuePosition}`}: ${request.procedureName}, ${ACUTE_URGENCY_LABELS[request.urgency]}`
  )).join('; ');
  return [running, pending ? `Čekající akutní požadavky: ${pending}.` : ''].filter(Boolean).join(' ');
}
