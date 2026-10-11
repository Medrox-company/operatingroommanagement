import type { AcuteCycleLink } from './acute-cycle-links';
import { sortAcuteRequests, type AcuteRequest } from './acute-requests';

export type AcuteModuleHistoryDays = 30 | 90 | 365;
export interface AcuteModuleCycleWindow { startMs: number; endMs: number }

/** Includes today and the preceding calendar days; local midnight is stable through DST. */
export function acuteModuleCycleWindow(now: number, days: AcuteModuleHistoryDays = 30): AcuteModuleCycleWindow {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  end.setDate(end.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/** Completion requires both immutable lifecycle events, not a manually closed request. */
export function completedAcuteCycle(link: AcuteCycleLink): boolean {
  const start = Date.parse(link.startedAt);
  const end = link.endedAt ? Date.parse(link.endedAt) : NaN;
  return Boolean(link.startEventId?.trim() && link.endEventId?.trim())
    && Number.isFinite(start) && Number.isFinite(end) && end > start;
}

/** Actual whole-cycle minutes, never estimated surgical duration or growing waiting time. */
export function acuteCycleMinutes(link: AcuteCycleLink): number | null {
  return completedAcuteCycle(link) ? Math.round((Date.parse(link.endedAt!) - Date.parse(link.startedAt)) / 60_000) : null;
}

export function acuteCycleOverlapsWindow(link: AcuteCycleLink, window: AcuteModuleCycleWindow): boolean {
  return completedAcuteCycle(link) && Date.parse(link.startedAt) < window.endMs && Date.parse(link.endedAt!) >= window.startMs;
}

export interface AcuteModuleRequestPartition {
  waiting: AcuteRequest[];
  begun: AcuteCycleLink[];
  performed: AcuteCycleLink[];
  /** Completed active records remain visible even outside the selected historical window. */
  supplementalPerformed: AcuteCycleLink[];
}

export function partitionAcuteModuleRequests(
  requests: readonly AcuteRequest[],
  links: readonly AcuteCycleLink[],
  window?: AcuteModuleCycleWindow,
): AcuteModuleRequestPartition {
  const active = sortAcuteRequests(requests.filter(request => request.status === 'pending' || request.status === 'acknowledged'));
  const activeIds = new Set(active.map(request => request.id));
  // All durable bindings suppress a waiting/proposal card, including older completed cycles.
  const boundIds = new Set(links.map(link => link.requestId));
  const begun = links.filter(link => link.endedAt === null && link.endEventId === null
    && Boolean(link.startEventId?.trim()) && Number.isFinite(Date.parse(link.startedAt)))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const completed = links.filter(completedAcuteCycle).sort((a, b) => Date.parse(b.endedAt!) - Date.parse(a.endedAt!));
  const supplementalPerformed = window ? completed.filter(link => activeIds.has(link.requestId) && !acuteCycleOverlapsWindow(link, window)) : [];
  const supplementalIds = new Set(supplementalPerformed.map(link => link.requestId));
  return {
    waiting: active.filter(request => !boundIds.has(request.id)),
    begun,
    performed: window ? completed.filter(link => acuteCycleOverlapsWindow(link, window) || supplementalIds.has(link.requestId)) : completed,
    supplementalPerformed,
  };
}
