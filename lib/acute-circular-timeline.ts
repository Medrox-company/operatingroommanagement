import { wholeWaitingMinutes } from '../components/acute/display';
import type { AcuteCycleLink } from './acute-cycle-links';
import { acuteCycleMinutes, completedAcuteCycle, type AcuteModuleRequestPartition } from './acute-module-cycles';
import type { AcuteRequest, AcuteUrgency } from './acute-requests';

export type AcuteCircularTimelineState = 'waiting' | 'begun' | 'performed';

/** Recorded chronology and queue position are separate facts, not progress estimates. */
export interface AcuteCircularTimelineNode {
  readonly id: string;
  readonly requestId: string;
  readonly state: AcuteCircularTimelineState;
  readonly procedureName: string;
  readonly urgency: AcuteUrgency;
  readonly submissionPosition: number | null;
  readonly currentQueuePosition: number | null;
  readonly roomId: string | null;
  readonly anchorAt: string;
  readonly anchorMs: number;
  readonly receivedAt: string | null;
  /** Live waiting from receipt, present only for an unbound waiting request. */
  readonly waitingMinutes: number | null;
  /** Persisted planning estimate only; never used to draw a progress percentage. */
  readonly estimatedDurationMinutes: number | null;
  /** Historical receipt-to-start interval; unknown receipt is never inferred. */
  readonly recordedWaitMinutes: number | null;
  /** Actual whole-cycle duration, available only for an evidenced completion. */
  readonly cycleMinutes: number | null;
  /** Detached, read-only copy of the immutable lifecycle evidence. */
  readonly cycleLink: Readonly<AcuteCycleLink> | null;
  readonly supplementalPerformed: boolean;
}

function cycleId(link: AcuteCycleLink): string {
  // Keep the same identity when a begun cycle later receives its real end event.
  return `cycle:${link.requestId}:${link.startEventId}`;
}

/**
 * Projects the existing period-filtered partition in ascending recorded time.
 * Equal timestamps use stable IDs, never operational rank or estimated duration.
 * Invalid anchors cannot be placed; other missing timestamps remain unknown.
 */
export function projectAcuteCircularTimeline(
  partition: AcuteModuleRequestPartition,
  requests: readonly AcuteRequest[],
  now: number,
): AcuteCircularTimelineNode[] {
  const requestsById = new Map(requests.map(request => [request.id, request]));
  const supplementalIds = new Set(partition.supplementalPerformed.map(cycleId));
  const nodes: AcuteCircularTimelineNode[] = [];

  for (const request of partition.waiting) {
    const anchorMs = Date.parse(request.receivedAt);
    if (!Number.isFinite(anchorMs)) continue;
    nodes.push({
      id: `request:${request.id}`, requestId: request.id, state: 'waiting',
      procedureName: request.procedureName, urgency: request.urgency,
      submissionPosition: request.submissionPosition ?? null,
      currentQueuePosition: request.queuePosition ?? null, roomId: request.proposedRoomId,
      anchorAt: request.receivedAt, anchorMs, receivedAt: request.receivedAt,
      waitingMinutes: wholeWaitingMinutes(request.receivedAt, now),
      estimatedDurationMinutes: request.estimatedDurationMinutes,
      recordedWaitMinutes: null, cycleMinutes: null, cycleLink: null,
      supplementalPerformed: false,
    });
  }

  for (const state of ['begun', 'performed'] as const) {
    for (const link of partition[state]) {
      const startedMs = Date.parse(link.startedAt);
      const isBegun = link.endedAt === null && link.endEventId === null
        && Boolean(link.startEventId?.trim()) && Number.isFinite(startedMs);
      if (state === 'begun' ? !isBegun : !completedAcuteCycle(link)) continue;
      const anchorAt = state === 'performed' ? link.endedAt! : link.startedAt;
      const anchorMs = Date.parse(anchorAt);
      if (!Number.isFinite(anchorMs)) continue;

      const candidate = requestsById.get(link.requestId);
      const request = candidate?.hospitalId === link.hospitalId ? candidate : undefined;
      const receiptMs = request ? Date.parse(request.receivedAt) : NaN;
      const receivedAt = Number.isFinite(receiptMs) ? request!.receivedAt : null;
      const recordedWaitMinutes = receivedAt && receiptMs <= startedMs
        ? wholeWaitingMinutes(receivedAt, startedMs) : null;

      nodes.push({
        id: cycleId(link), requestId: link.requestId, state,
        procedureName: link.procedureName, urgency: link.urgency,
        submissionPosition: link.submissionPosition ?? null,
        currentQueuePosition: request?.queuePosition ?? null, roomId: link.roomId,
        anchorAt, anchorMs, receivedAt, waitingMinutes: null, recordedWaitMinutes,
        estimatedDurationMinutes: null,
        cycleMinutes: state === 'performed' ? acuteCycleMinutes(link) : null,
        cycleLink: Object.freeze({ ...link }),
        supplementalPerformed: state === 'performed' && supplementalIds.has(cycleId(link)),
      });
    }
  }

  return nodes.sort((a, b) => a.anchorMs - b.anchorMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
