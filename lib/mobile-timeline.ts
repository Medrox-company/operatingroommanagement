import type { OperatingRoom } from '../types';
import { mobileRoomPhase, normalizeRoomSearch } from './mobile-room-display';

export type MobileTimelineStatus = {
  order_index?: number;
  name?: string;
  title?: string;
  color?: string;
  accent_color?: string;
};
export type MobileTimelineWindow = { startMs: number; endMs: number };
export type MobileTimelineSegment = MobileTimelineWindow & {
  key: string;
  leftPct: number;
  widthPct: number;
  color: string;
  label: string;
  kind: 'history' | 'current' | 'estimate' | 'pause';
};
type HistoryEntry = NonNullable<OperatingRoom['statusHistory']>[number];
type TimedEntry = HistoryEntry & { time: number };
const HOUR = 3_600_000;
const UNKNOWN_COLOR = '#7890A8';
const timestamp = (value: string | null | undefined) => value ? Date.parse(value) : NaN;

/** Calendar arithmetic keeps the 07:00 boundary intact across DST changes. */
export function getMobileOperationalDay(nowMs: number): MobileTimelineWindow {
  const start = new Date(nowMs);
  start.setHours(7, 0, 0, 0);
  if (start.getTime() > nowMs) start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function getMobileTimelineWindow(nowMs: number, spanHours: 2 | 4 | 'day', offset: number): MobileTimelineWindow {
  const page = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  if (spanHours === 'day') {
    const start = new Date(getMobileOperationalDay(nowMs).startMs);
    start.setDate(start.getDate() + page);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }
  const hour = new Date(nowMs);
  hour.setMinutes(0, 0, 0);
  const startMs = hour.getTime() - spanHours * HOUR / 2 + page * spanHours * HOUR;
  return { startMs, endMs: startMs + spanHours * HOUR };
}

export function mobileTimelinePageSize(height: number): number {
  return Number.isFinite(height) ? Math.max(1, Math.min(8, Math.floor(height / 80))) : 1;
}

function orderedHistory(history: readonly HistoryEntry[] | undefined, nowMs: number): TimedEntry[] {
  const byTime = new Map<number, TimedEntry>();
  for (const entry of history || []) {
    const time = timestamp(entry.startedAt);
    if (Number.isFinite(time) && time <= nowMs && Number.isInteger(entry.stepIndex) && entry.stepIndex >= 0) {
      // At an identical instant only the final transition can have duration.
      byTime.set(time, { ...entry, time });
    }
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function actualStart(room: OperatingRoom, nowMs: number): number {
  for (const candidate of [room.operationStartedAt, room.phaseStartedAt]) {
    const time = timestamp(candidate);
    if (Number.isFinite(time) && time <= nowMs) return time;
  }
  const value = room.currentProcedure?.startTime;
  const clock = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return NaN;
    const start = new Date(nowMs);
    start.setHours(hours, minutes, 0, 0);
    if (start.getTime() > nowMs) start.setDate(start.getDate() - 1);
    return start.getTime();
  }
  const time = timestamp(value);
  return Number.isFinite(time) && time <= nowMs ? time : NaN;
}

/** Empty output means no recorded interval in this window, never proof of a free room. */
export function getMobileRoomSegments(
  room: OperatingRoom,
  statuses: readonly MobileTimelineStatus[],
  nowMs: number,
  window: MobileTimelineWindow,
): MobileTimelineSegment[] {
  const { startMs, endMs } = window;
  if (![startMs, endMs, nowMs].every(Number.isFinite) || endMs <= startMs) return [];
  const phase = mobileRoomPhase(room, statuses);
  // Operational flags do not end the recorded workflow or carry an end time.
  // Keep its measured progress visible underneath the separate state badge.
  const workflowPhase = mobileRoomPhase({ ...room, isEmergency: false, isLocked: false, isPaused: false }, statuses);
  const segments: MobileTimelineSegment[] = [];
  const seen = new Set<string>();
  const appearance = (entry: Pick<HistoryEntry, 'stepIndex' | 'color' | 'stepName'>) => {
    // stepIndex is a position in the enabled workflow, not the database order_index.
    const status = statuses[entry.stepIndex];
    const label = status?.title || status?.name || entry.stepName || 'Nezaznamenaná fáze';
    return {
      label,
      color: status?.accent_color || status?.color || entry.color || UNKNOWN_COLOR,
      ready: status ? normalizeRoomSearch(status.name || label).includes('pripraven') : entry.stepIndex === 0,
    };
  };
  const add = (from: number, to: number, kind: MobileTimelineSegment['kind'], color: string, label: string) => {
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    const clippedStart = Math.max(startMs, from);
    const clippedEnd = Math.min(endMs, to, kind === 'estimate' ? Infinity : nowMs);
    if (clippedEnd <= clippedStart) return;
    const key = `${kind}:${clippedStart}:${clippedEnd}:${color}`;
    if (seen.has(key)) return;
    seen.add(key);
    segments.push({
      key, startMs: clippedStart, endMs: clippedEnd, kind, color, label,
      leftPct: (clippedStart - startMs) / (endMs - startMs) * 100,
      widthPct: (clippedEnd - clippedStart) / (endMs - startMs) * 100,
    });
  };
  const currentStyle = appearance({ stepIndex: room.currentStepIndex });
  // A stale pause flag must not turn a ready phase into a running operation.
  const running = workflowPhase.active && !currentStyle.ready && !!statuses[room.currentStepIndex];

  for (const operation of room.completedOperations || []) {
    const from = timestamp(operation.startedAt);
    const to = timestamp(operation.endedAt);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to > nowMs) continue;
    const history = orderedHistory(operation.statusHistory, nowMs).filter(entry => entry.time < to);
    if (!history.length || history[0].time > from) {
      add(from, history[0]?.time ?? to, 'history', UNKNOWN_COLOR, 'Dokončený výkon · fáze nezaznamenána');
    }
    history.forEach((entry, index) => {
      const style = appearance(entry);
      if (!style.ready) add(Math.max(from, entry.time), history[index + 1]?.time ?? to, 'history', style.color, style.label);
    });
  }

  const history = orderedHistory(room.statusHistory, nowMs);
  const operationStart = timestamp(room.operationStartedAt);
  const phaseStart = timestamp(room.phaseStartedAt);
  const last = history.at(-1);
  if (running && Number.isFinite(phaseStart) && phaseStart <= nowMs
    && last && phaseStart > last.time && last.stepIndex !== room.currentStepIndex) {
    history.push({ stepIndex: room.currentStepIndex, startedAt: room.phaseStartedAt!, time: phaseStart });
  }
  history.forEach((entry, index) => {
    const next = history[index + 1];
    const current = !next && running && entry.stepIndex === room.currentStepIndex;
    const to = next?.time ?? (current ? nowMs : phaseStart);
    const style = appearance(entry);
    if (!style.ready) add(Math.max(entry.time, Number.isFinite(operationStart) ? operationStart : entry.time), to,
      current ? 'current' : 'history', style.color, style.label);
  });

  if (running && !history.length) {
    add(actualStart(room, nowMs), nowMs, 'current', currentStyle.color, currentStyle.label);
  }
  const estimate = timestamp(room.estimatedEndTime);
  if (running && phase.active && estimate > nowMs) {
    add(nowMs, estimate, 'estimate', currentStyle.color, 'Odhad konce');
  }
  if (room.isPaused) {
    add(timestamp(room.pausedAt), nowMs, 'pause', '#20ACD5', 'Pauza');
  }
  // Pause is last so it can be rendered as an overlay over the recorded phase.
  return segments.sort((a, b) => Number(a.kind === 'pause') - Number(b.kind === 'pause') || a.startMs - b.startMs);
}
