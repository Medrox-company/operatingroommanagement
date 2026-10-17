import type { DayWorkingHours, OperatingRoom } from '../types';
import type { StatusHistoryRow } from './db';

/** Historical measurements use the stored weekly plan, never the room's live state. */
export interface StatisticsExportUtilizationRoom {
  roomId: string;
  roomName: string;
  capacitySeconds: number;
  activeSeconds: number;
  utilizationPercent: number | null;
  /** Legacy outside-plan candidate; incomplete plans are not confirmed ÚPS. */
  outsideWorkingSeconds: number;
  /** Actual, unweighted occupied time inside the stored roster. Breaks are not ÚPS. */
  scheduledRecordedSeconds: number;
  /** Actual, merged closed-cycle time inside the measured period. */
  recordedSeconds: number;
  /** Null means the roster does not establish whether this time belongs to ÚPS. */
  upsSeconds: number | null;
  /** Elapsed 07→07 time outside gross roster windows, without deducting breaks. */
  upsAvailableSeconds: number | null;
  upsUtilizationPercent: number | null;
  upsSharePercent: number | null;
  upsBasisComplete: boolean;
  unknownScheduleRecordedSeconds: number;
}
export interface StatisticsExportUtilizationDay {
  date: string;
  capacitySeconds: number;
  activeSeconds: number;
  utilizationPercent: number | null;
  scheduledRecordedSeconds: number;
  recordedSeconds: number;
  /** Aggregated only for rooms whose roster can be established for the period. */
  upsSeconds: number | null;
  upsAvailableSeconds: number | null;
  upsUtilizationPercent: number | null;
  upsSharePercent: number | null;
  upsBasisComplete: boolean;
  unknownScheduleRecordedSeconds: number;
}
export interface StatisticsExportUtilization {
  rooms: StatisticsExportUtilizationRoom[];
  daily: StatisticsExportUtilizationDay[];
  totalCapacitySeconds: number;
  totalActiveSeconds: number;
  totalOutsideWorkingSeconds: number;
  totalScheduledRecordedSeconds: number;
  totalRecordedSeconds: number;
  totalUpsSeconds: number;
  totalUpsAvailableSeconds: number;
  upsUtilizationPercent: number | null;
  upsSharePercent: number | null;
  upsBasisComplete: boolean;
  unknownScheduleRecordedSeconds: number;
  unknownScheduleRoomCount: number;
  utilizationPercent: number | null;
  measuredDays: string[];
  scheduleBasis: 'current-weekly-schedule';
}

type Interval = { start: number; end: number };
const TIMEZONE = 'Europe/Prague';
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const pragueParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const parts = (instant: number) => Object.fromEntries(pragueParts.formatToParts(new Date(instant))
  .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
const localStamp = (instant: number) => {
  const local = parts(instant);
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
};
function validCalendarDate(value: string): boolean {
  const instant = Date.parse(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(instant)
    && new Date(instant).toISOString().slice(0, 10) === value;
}
function addCalendarDay(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function operationalDate(now: number): string {
  const local = parts(now);
  const date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  return local.hour < 7 ? addCalendarDay(date, -1) : date;
}
/**
 * Convert Prague wall-clock time without depending on the browser/server TZ.
 * At DST overlaps choose the first occurrence; a missing time moves forward,
 * matching Date.setHours' compatible interpretation in the existing day plan.
 */
function localTime(date: string, minutes: number): number {
  const desired = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
  const offsets = new Set([-86_400_000, 0, 86_400_000]
    .map(offset => localStamp(desired + offset) - (desired + offset)));
  const candidates = [...offsets].map(offset => {
    const instant = desired - offset;
    return { instant, difference: localStamp(instant) - desired };
  });
  const exact = candidates.filter(candidate => candidate.difference === 0)
    .sort((a, b) => a.instant - b.instant);
  if (exact.length) return exact[0].instant;
  const forward = candidates.filter(candidate => candidate.difference >= 0)
    .sort((a, b) => a.difference - b.difference);
  return forward[0]?.instant ?? candidates.sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference))[0].instant;
}
const synthetic = (row: StatusHistoryRow) => row.metadata?.synthetic === true
  || row.metadata?.synthetic === 'true' || row.metadata?.source === 'app_review_seed';
function mergedIntervals(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals.filter(value => Number.isFinite(value.start) && Number.isFinite(value.end)
    && value.end > value.start).sort((a, b) => a.start - b.start || a.end - b.end)) {
    const previous = result[result.length - 1];
    if (!previous || interval.start > previous.end) result.push({ ...interval });
    else previous.end = Math.max(previous.end, interval.end);
  }
  return result;
}
const overlapMilliseconds = (interval: Interval, window: Interval) =>
  Math.max(0, Math.min(interval.end, window.end) - Math.max(interval.start, window.start));

/** Closed lifecycle evidence only: an unclosed start is never stretched to now. */
function recordedIntervals(history: StatusHistoryRow[], now: number): Map<string, Interval[]> {
  const seenIds = new Set<string>();
  const rows = history.filter(row => {
    if (!row.id) return true;
    if (seenIds.has(row.id)) return false;
    seenIds.add(row.id);
    return true;
  }).filter(row => Number.isFinite(Date.parse(row.timestamp)) && Date.parse(row.timestamp) <= now)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
      || (a.event_type === 'operation_start' ? -1 : b.event_type === 'operation_start' ? 1 : 0));
  const pending = new Map<string, number>();
  const paired = new Map<string, Interval[]>();
  const append = (roomId: string, interval: Interval) => {
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end)
      || interval.end <= interval.start || interval.end > now) return;
    const intervals = paired.get(roomId) ?? [];
    intervals.push(interval);
    paired.set(roomId, intervals);
  };
  for (const row of rows) {
    const roomId = row.operating_room_id;
    if (!roomId) continue;
    if (synthetic(row)) { pending.delete(roomId); continue; }
    const timestamp = Date.parse(row.timestamp);
    if (row.event_type === 'operation_start') { pending.set(roomId, timestamp); continue; }
    if (row.event_type !== 'operation_end' && row.event_type !== 'operation_completed') continue;
    const start = pending.get(roomId);
    if (start === undefined) continue;
    // A later import of an older archive must not close an unrelated new cycle.
    const archivedStart = row.event_type === 'operation_completed' && typeof row.metadata?.startedAt === 'string'
      ? Date.parse(row.metadata.startedAt) : NaN;
    if (Number.isFinite(archivedStart) && Math.abs(archivedStart - start) > 2_000) continue;
    const archivedEnd = row.event_type === 'operation_completed' && typeof row.metadata?.endedAt === 'string'
      ? Date.parse(row.metadata.endedAt) : NaN;
    append(roomId, { start, end: Number.isFinite(archivedEnd) ? archivedEnd : timestamp });
    pending.delete(roomId);
  }
  for (const row of rows) {
    if (row.event_type !== 'operation_completed' || synthetic(row) || !row.operating_room_id) continue;
    const archivedEnd = typeof row.metadata?.endedAt === 'string' ? Date.parse(row.metadata.endedAt) : NaN;
    const end = Number.isFinite(archivedEnd) ? archivedEnd : Date.parse(row.timestamp);
    const archivedStart = typeof row.metadata?.startedAt === 'string' ? Date.parse(row.metadata.startedAt) : NaN;
    const start = Number.isFinite(archivedStart) ? archivedStart
      : typeof row.duration_seconds === 'number' && Number.isFinite(row.duration_seconds) && row.duration_seconds > 0
        ? end - row.duration_seconds * 1000 : NaN;
    const explicit = paired.get(row.operating_room_id) ?? [];
    if (explicit.some(interval => Math.abs(interval.start - start) <= 2_000)) continue;
    append(row.operating_room_id, { start, end });
  }
  return new Map([...paired].map(([roomId, intervals]) => [roomId, mergedIntervals(intervals)]));
}
function workMinutes(hours: DayWorkingHours | undefined): { start: number; end: number; breakMinutes: number } | null {
  if (!hours?.enabled) return null;
  const integerBetween = (value: number, maximum: number) => Number.isInteger(value) && value >= 0 && value <= maximum;
  if (!integerBetween(hours.startHour, 23) || !integerBetween(hours.endHour, 24)
    || !integerBetween(hours.startMinute, 59) || !integerBetween(hours.endMinute, 59)
    || (hours.endHour === 24 && hours.endMinute !== 0)) return null;
  const start = hours.startHour * 60 + hours.startMinute;
  const end = hours.endHour * 60 + hours.endMinute;
  if (end <= start) return null;
  const breakMinutes = typeof hours.breakMinutes === 'number' && Number.isFinite(hours.breakMinutes)
    && hours.breakMinutes > 0 ? hours.breakMinutes : 0;
  return { start, end, breakMinutes };
}
function hasKnownDayPlan(hours: DayWorkingHours | undefined): boolean {
  if (!hours || typeof hours.enabled !== 'boolean') return false;
  // A deliberately closed day is known even if its unused time fields are absent.
  if (!hours.enabled) return true;
  if (hours.breakMinutes !== undefined && (typeof hours.breakMinutes !== 'number'
    || !Number.isFinite(hours.breakMinutes) || hours.breakMinutes < 0)) return false;
  return workMinutes(hours) !== null;
}
const percent = (active: number, capacity: number): number | null =>
  capacity > 0 ? Math.min(100, Math.max(0, active / capacity * 100)) : null;

export function buildStatisticsExportUtilization(input: {
  rooms: OperatingRoom[];
  history: StatusHistoryRow[];
  range: { start: Date; end: Date; days: string[] };
  generatedAt: Date;
}): StatisticsExportUtilization {
  const from = input.range.start.getTime(), to = input.range.end.getTime(), now = input.generatedAt.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(now) || to <= from) {
    throw new RangeError('Neplatné období historického vytížení.');
  }
  const today = operationalDate(now);
  const instantCache = new Map<string, number>();
  const instant = (date: string, minutes: number) => {
    const key = `${date}:${minutes}`;
    let value = instantCache.get(key);
    if (value === undefined) { value = localTime(date, minutes); instantCache.set(key, value); }
    return value;
  };
  const measuredDays = [...new Set(input.range.days)].filter(date => validCalendarDate(date) && date <= today
    && instant(date, 7 * 60) < to && instant(addCalendarDay(date, 1), 7 * 60) > from).sort();
  const dayWindows = measuredDays.map(date => ({ date,
    start: Math.max(from, instant(date, 7 * 60)), end: Math.min(to, instant(addCalendarDay(date, 1), 7 * 60)) }));
  const records = recordedIntervals(input.history, now);
  const knownRooms = new Map(input.rooms.map(room => [room.id, room]));
  const roomIds = new Set(knownRooms.keys());
  for (const [id, intervals] of records) {
    if (dayWindows.some(window => intervals.some(interval => overlapMilliseconds(interval, window) > 0))) roomIds.add(id);
  }
  const daily: StatisticsExportUtilizationDay[] = dayWindows.map(window => ({
    date: window.date, capacitySeconds: 0, activeSeconds: 0, utilizationPercent: null,
    scheduledRecordedSeconds: 0, recordedSeconds: 0, upsSeconds: null, upsAvailableSeconds: null,
    upsUtilizationPercent: null, upsSharePercent: null, upsBasisComplete: true,
    unknownScheduleRecordedSeconds: 0,
  }));
  const rooms: StatisticsExportUtilizationRoom[] = [];
  for (const roomId of roomIds) {
    const room = knownRooms.get(roomId);
    const intervals = records.get(roomId) ?? [];
    let capacitySeconds = 0, activeSeconds = 0, outsideWorkingSeconds = 0;
    let scheduledRecordedSeconds = 0, recordedSeconds = 0, confirmedUpsSeconds = 0, upsAvailableSeconds = 0;
    const relevantDates = (window: { date: string; start: number; end: number }) => {
      const measuredWindow = { start: window.start, end: Math.min(window.end, now) };
      return [window.date, addCalendarDay(window.date, 1)].filter(date =>
        overlapMilliseconds({ start: instant(date, 0), end: instant(addCalendarDay(date, 1), 0) }, measuredWindow) > 0);
    };
    // Do not infer an absent weekday as closed. In particular the next calendar
    // day's 00→07 segment needs its own explicit plan once that time has elapsed.
    const upsBasisComplete = dayWindows.length > 0 && dayWindows.every(window => relevantDates(window).every(date => {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      return hasKnownDayPlan(room?.weeklySchedule?.[DAY_KEYS[weekday]]);
    }));
    dayWindows.forEach((window, index) => {
      let capacity = 0, active = 0, scheduledGross = 0;
      const measuredWindow = { start: window.start, end: Math.min(window.end, now) };
      const totalRecorded = intervals.reduce((sum, interval) => sum + overlapMilliseconds(interval, measuredWindow), 0);
      const grossWorkWindows: Interval[] = [];
      for (const date of [window.date, addCalendarDay(window.date, 1)]) {
        const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
        const hours = workMinutes(room?.weeklySchedule?.[DAY_KEYS[weekday]]);
        if (!hours) continue;
        const workStart = instant(date, hours.start), workEnd = instant(date, hours.end);
        const gross = workEnd - workStart;
        if (gross <= 0) continue;
        const observedGrossWindow = { start: Math.max(measuredWindow.start, workStart), end: Math.min(measuredWindow.end, workEnd) };
        if (observedGrossWindow.end > observedGrossWindow.start) grossWorkWindows.push(observedGrossWindow);
        const net = Math.max(0, gross - Math.min(gross, hours.breakMinutes * 60_000));
        if (net === 0) continue;
        const workWindow = { start: Math.max(window.start, workStart), end: Math.min(window.end, workEnd) };
        if (workWindow.end <= workWindow.start) continue;
        const factor = net / gross;
        capacity += (workWindow.end - workWindow.start) * factor;
        const observedWindow = { start: workWindow.start, end: Math.min(workWindow.end, now) };
        const occupied = intervals.reduce((sum, interval) => sum + overlapMilliseconds(interval, observedWindow), 0);
        scheduledGross += occupied;
        active += occupied * factor;
      }
      capacitySeconds += capacity / 1000;
      activeSeconds += active / 1000;
      outsideWorkingSeconds += Math.max(0, totalRecorded - scheduledGross) / 1000;
      const mergedWorkWindows = mergedIntervals(grossWorkWindows);
      const grossScheduledRecorded = mergedWorkWindows.reduce((sum, workWindow) => sum
        + intervals.reduce((occupied, interval) => occupied + overlapMilliseconds(interval, workWindow), 0), 0);
      const elapsedGrossWork = mergedWorkWindows.reduce((sum, workWindow) => sum + workWindow.end - workWindow.start, 0);
      scheduledRecordedSeconds += grossScheduledRecorded / 1000;
      recordedSeconds += totalRecorded / 1000;
      daily[index].capacitySeconds += capacity / 1000;
      daily[index].activeSeconds += active / 1000;
      daily[index].scheduledRecordedSeconds += grossScheduledRecorded / 1000;
      daily[index].recordedSeconds += totalRecorded / 1000;
      if (upsBasisComplete) {
        const upsRecorded = Math.max(0, totalRecorded - grossScheduledRecorded) / 1000;
        const upsAvailable = Math.max(0, measuredWindow.end - measuredWindow.start - elapsedGrossWork) / 1000;
        confirmedUpsSeconds += upsRecorded;
        upsAvailableSeconds += upsAvailable;
        daily[index].upsSeconds = (daily[index].upsSeconds ?? 0) + upsRecorded;
        daily[index].upsAvailableSeconds = (daily[index].upsAvailableSeconds ?? 0) + upsAvailable;
      } else {
        daily[index].upsBasisComplete = false;
        daily[index].unknownScheduleRecordedSeconds += totalRecorded / 1000;
      }
    });
    rooms.push({ roomId, roomName: room?.name?.trim() || 'Archivovaný sál — název nedostupný',
      capacitySeconds, activeSeconds, outsideWorkingSeconds, utilizationPercent: percent(activeSeconds, capacitySeconds),
      scheduledRecordedSeconds, recordedSeconds, upsBasisComplete,
      upsSeconds: upsBasisComplete ? confirmedUpsSeconds : null,
      upsAvailableSeconds: upsBasisComplete ? upsAvailableSeconds : null,
      upsUtilizationPercent: upsBasisComplete ? percent(confirmedUpsSeconds, upsAvailableSeconds) : null,
      upsSharePercent: upsBasisComplete ? percent(confirmedUpsSeconds, recordedSeconds) : null,
      unknownScheduleRecordedSeconds: upsBasisComplete ? 0 : recordedSeconds,
    });
  }
  daily.forEach(day => {
    day.utilizationPercent = percent(day.activeSeconds, day.capacitySeconds);
    day.upsUtilizationPercent = day.upsSeconds !== null && day.upsAvailableSeconds !== null
      ? percent(day.upsSeconds, day.upsAvailableSeconds) : null;
    day.upsSharePercent = day.unknownScheduleRecordedSeconds === 0 && day.upsSeconds !== null
      ? percent(day.upsSeconds, day.recordedSeconds) : null;
  });
  const totalCapacitySeconds = rooms.reduce((sum, room) => sum + room.capacitySeconds, 0);
  const totalActiveSeconds = rooms.reduce((sum, room) => sum + room.activeSeconds, 0);
  const totalScheduledRecordedSeconds = rooms.reduce((sum, room) => sum + room.scheduledRecordedSeconds, 0);
  const totalRecordedSeconds = rooms.reduce((sum, room) => sum + room.recordedSeconds, 0);
  const totalUpsSeconds = rooms.reduce((sum, room) => sum + (room.upsSeconds ?? 0), 0);
  const totalUpsAvailableSeconds = rooms.reduce((sum, room) => sum + (room.upsAvailableSeconds ?? 0), 0);
  const unknownScheduleRecordedSeconds = rooms.reduce((sum, room) => sum + room.unknownScheduleRecordedSeconds, 0);
  const unknownScheduleRoomCount = rooms.filter(room => !room.upsBasisComplete && dayWindows.length > 0).length;
  return { rooms, daily, totalCapacitySeconds, totalActiveSeconds,
    totalOutsideWorkingSeconds: rooms.reduce((sum, room) => sum + room.outsideWorkingSeconds, 0),
    totalScheduledRecordedSeconds, totalRecordedSeconds, totalUpsSeconds, totalUpsAvailableSeconds,
    upsUtilizationPercent: percent(totalUpsSeconds, totalUpsAvailableSeconds),
    upsSharePercent: unknownScheduleRecordedSeconds === 0 ? percent(totalUpsSeconds, totalRecordedSeconds) : null,
    upsBasisComplete: measuredDays.length > 0 && unknownScheduleRoomCount === 0,
    unknownScheduleRecordedSeconds, unknownScheduleRoomCount,
    utilizationPercent: percent(totalActiveSeconds, totalCapacitySeconds), measuredDays,
    scheduleBasis: 'current-weekly-schedule' };
}
