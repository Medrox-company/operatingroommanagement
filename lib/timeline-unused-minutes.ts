import { DEFAULT_DAILY_BREAK_MINUTES, type OperatingRoom } from '../types';

const DAY_KEYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;
const MINUTE_MS = 60_000;

type Interval = { start: number; end: number };

function isClockPart(value: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= maximum;
}

function timestamp(value: unknown): number {
  return typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
}

/**
 * Unused net working minutes elapsed in today's local operating-room shift.
 * The configured break reduces every elapsed/occupied interval by the same
 * net/gross factor, matching the timeline's utilization calculation.
 */
export function calculateUnusedOperatingMinutes(room: OperatingRoom, now: Date): number | null {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return null;

  const hours = room.weeklySchedule?.[DAY_KEYS[now.getDay()]];
  if (!hours || hours.enabled !== true
    || !isClockPart(hours.startHour, 23) || !isClockPart(hours.endHour, 23)
    || !isClockPart(hours.startMinute, 59) || !isClockPart(hours.endMinute, 59)) return null;

  const startClockMinutes = hours.startHour * 60 + hours.startMinute;
  const endClockMinutes = hours.endHour * 60 + hours.endMinute;
  if (endClockMinutes <= startClockMinutes) return null;

  // setHours uses the local calendar day and its UTC offset at each boundary.
  // Adding clock minutes to local midnight would be wrong on DST days.
  const shiftStart = new Date(now);
  shiftStart.setHours(hours.startHour, hours.startMinute, 0, 0);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(hours.endHour, hours.endMinute, 0, 0);
  const shiftStartMs = shiftStart.getTime();
  const shiftEndMs = shiftEnd.getTime();
  const grossMinutes = Math.max(0, (shiftEndMs - shiftStartMs) / MINUTE_MS);

  const requestedBreak = hours.breakMinutes ?? DEFAULT_DAILY_BREAK_MINUTES;
  if (!Number.isFinite(requestedBreak)) return null;
  const netMinutes = grossMinutes - Math.min(Math.max(requestedBreak, 0), grossMinutes);
  if (netMinutes <= 0) return null;
  if (nowMs <= shiftStartMs) return 0;

  const elapsedEndMs = Math.min(nowMs, shiftEndMs);
  const intervals: Interval[] = [];
  const addOccupied = (start: number, end: number) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const clippedStart = Math.max(start, shiftStartMs);
    const clippedEnd = Math.min(end, elapsedEndMs);
    if (clippedEnd > clippedStart) intervals.push({ start: clippedStart, end: clippedEnd });
  };

  for (const operation of room.completedOperations ?? []) {
    addOccupied(timestamp(operation.startedAt), timestamp(operation.endedAt));
  }

  const isRunning = room.currentStepIndex > 0 && room.currentStepIndex < 6 && !room.isLocked;
  if (isRunning) {
    const pauseStartMs = room.isPaused ? timestamp(room.pausedAt) : NaN;
    addOccupied(
      timestamp(room.operationStartedAt),
      Number.isFinite(pauseStartMs) ? Math.min(nowMs, pauseStartMs) : nowMs,
    );
  }

  intervals.sort((left, right) => left.start - right.start || left.end - right.end);
  let occupiedMs = 0;
  let mergedEnd = shiftStartMs;
  for (const interval of intervals) {
    occupiedMs += Math.max(0, interval.end - Math.max(interval.start, mergedEnd));
    mergedEnd = Math.max(mergedEnd, interval.end);
  }

  const factor = netMinutes / grossMinutes;
  const elapsedCapacityMs = (elapsedEndMs - shiftStartMs) * factor;
  const occupiedNetMs = occupiedMs * factor;
  return Math.round(Math.max(elapsedCapacityMs - occupiedNetMs, 0) / MINUTE_MS);
}
