import type { AcuteCycleLink } from './acute-cycle-links';
import type { AcuteModuleCycleWindow, AcuteModuleHistoryDays, AcuteModuleRequestPartition } from './acute-module-cycles';
import type { AcuteRequest } from './acute-requests';

export const ACUTE_DAY_TIME_ZONE = 'Europe/Prague' as const;

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ACUTE_DAY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ACUTE_DAY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const CALENDAR_DAY_MS = 86_400_000;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Calendar keys carry a date, not an instant or a browser time zone. */
export function isAcuteDayKey(value: string): boolean {
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Invalid or zone-less clinical timestamps remain unknown, never assigned to today. */
export function acutePragueDateKey(value: Date | number | string): string | null {
  if (typeof value === 'string' && (!TIMESTAMP.test(value) || !isAcuteDayKey(value.slice(0, 10)))) return null;
  const instant = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(instant)) return null;
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
  const parts = dayFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const key = `${part('year')?.padStart(4, '0')}-${part('month')}-${part('day')}`;
  return isAcuteDayKey(key) ? key : null;
}

/** UTC here is only a calendar cursor; it does not represent a Prague midnight. */
function calendarDayMs(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function pragueMidnight(calendarMs: number): number {
  let instant = calendarMs;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(clockFormatter.formatToParts(instant)
      .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const represented = new Date(0);
    represented.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    represented.setUTCHours(parts.hour, parts.minute, parts.second, 0);
    instant += calendarMs - represented.getTime();
  }
  return instant;
}

/**
 * Exact union of today's Prague history and the selected Prague calendar day.
 * The end is the following midnight, not midnight plus a fixed 24 hours.
 * Selection is bounded to today and 364 preceding dates (365 inclusive), so a
 * DST hour still fits the cycle API's maximum 366 elapsed days. Active bindings
 * outside this query remain supplied by the existing all-active evidence read.
 */
export function acuteDayCycleQueryWindow(
  now: number,
  selectedDayKey: string,
  historyDays: AcuteModuleHistoryDays = 30,
): AcuteModuleCycleWindow {
  const todayKey = acutePragueDateKey(now);
  if (!todayKey || !isAcuteDayKey(selectedDayKey)) throw new RangeError('Neplatný kalendářní den akutních výkonů.');
  if (historyDays !== 30 && historyDays !== 90 && historyDays !== 365) throw new RangeError('Neplatné období historie akutních výkonů.');
  const today = calendarDayMs(todayKey);
  const selected = calendarDayMs(selectedDayKey);
  if (selected < today - 364 * CALENDAR_DAY_MS || selected > today) {
    throw new RangeError('Vyberte dnešek nebo některý z předchozích 364 kalendářních dní.');
  }
  const historyStart = today - (historyDays - 1) * CALENDAR_DAY_MS;
  return {
    startMs: pragueMidnight(Math.min(historyStart, selected)),
    endMs: pragueMidnight(Math.max(today, selected) + CALENDAR_DAY_MS),
  };
}

/** A local-noon Date for calendar widgets; parsing YYYY-MM-DD as UTC shifts its day. */
export function acutePickerDateFromKey(dayKey: string): Date | null {
  if (!isAcuteDayKey(dayKey)) return null;
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return acutePickerDateKey(date) === dayKey ? date : null;
}

/** Read the calendar widget's local date components, not its converted Prague instant. */
export function acutePickerDateKey(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const key = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return isAcuteDayKey(key) ? key : null;
}

/** Keep an open calendar inside the moving 365-day range across Prague midnight. */
export function clampAcuteDaySelection(now: number, candidate?: string | null): string {
  const today = acutePragueDateKey(now)!;
  const earliest = acutePragueDateKey(acuteDayCycleQueryWindow(now, today, 365).startMs)!;
  if (!candidate || !isAcuteDayKey(candidate)) return today;
  return candidate < earliest ? earliest : candidate > today ? today : candidate;
}

export interface AcuteCycleDay {
  dayKey: string | null;
  source: 'receivedAt' | 'startedAt' | 'unknown';
}

/**
 * A known request belongs to its immutable receipt day, even for a later cycle.
 * Limited archives or invalid receipts safely fall back to the immutable start;
 * completion, edits, proposals and the current clock never supply a missing day.
 */
export function acuteCycleDay(link: AcuteCycleLink, request?: AcuteRequest): AcuteCycleDay {
  const receiptDay = request?.id === link.requestId && request.hospitalId === link.hospitalId
    ? acutePragueDateKey(request.receivedAt) : null;
  if (receiptDay) return { dayKey: receiptDay, source: 'receivedAt' };
  const startDay = acutePragueDateKey(link.startedAt);
  return { dayKey: startDay, source: startDay ? 'startedAt' : 'unknown' };
}

export interface AcuteDatedArchivedRequest {
  request: AcuteRequest;
  dayKey: string | null;
}

/** Counts describe only request records supplied by the authenticated snapshot. */
export interface AcuteDayActivity {
  requests: number;
  waiting: number;
  begun: number;
  performed: number;
  archived: number;
}

export interface AcuteDayView {
  selectedDayKey: string | null;
  partition: AcuteModuleRequestPartition;
  /** Preserve the original period and queue partition for History and operational actions. */
  fullPartition: Readonly<AcuteModuleRequestPartition>;
  /** Other days and unknown receipt dates remain reachable in History. */
  otherDayWaiting: AcuteRequest[];
  otherDayBegun: AcuteCycleLink[];
  archived: AcuteDatedArchivedRequest[];
  activityByDay: ReadonlyMap<string, Readonly<AcuteDayActivity>>;
}

function requestIdentity(request: Pick<AcuteRequest, 'id' | 'hospitalId'>): string {
  return JSON.stringify([request.hospitalId, request.id]);
}
function linkIdentity(link: AcuteCycleLink): string {
  return JSON.stringify([link.hospitalId, link.requestId]);
}

/**
 * Pure display projection: filtering preserves the queue's existing relative
 * order and clinical object identities. It cannot reorder or update requests.
 * The original full partition remains available for actions and History.
 */
export function projectAcuteDayView(
  partition: Readonly<AcuteModuleRequestPartition>,
  requests: readonly AcuteRequest[],
  selectedDayKey: string,
): AcuteDayView {
  const selectedKey = isAcuteDayKey(selectedDayKey) ? selectedDayKey : null;
  const requestsByIdentity = new Map<string, AcuteRequest>();
  for (const request of requests) {
    const identity = requestIdentity(request);
    if (!requestsByIdentity.has(identity)) requestsByIdentity.set(identity, request);
  }
  const requestDay = (request: AcuteRequest) => acutePragueDateKey(request.receivedAt);
  const cycleDay = (link: AcuteCycleLink) => acuteCycleDay(link, requestsByIdentity.get(linkIdentity(link))).dayKey;
  const onSelectedDay = (day: string | null) => selectedKey !== null && day === selectedKey;
  const waitingIds = new Set(partition.waiting.map(requestIdentity));
  const begunIds = new Set(partition.begun.map(linkIdentity));
  const performedIds = new Set(partition.performed.map(linkIdentity));
  const activityByDay = new Map<string, AcuteDayActivity>();
  const archived: AcuteDatedArchivedRequest[] = [];

  for (const [identity, request] of requestsByIdentity) {
    const dayKey = requestDay(request);
    const isArchived = request.status === 'completed' || request.status === 'cancelled';
    if (isArchived) archived.push({ request, dayKey });
    if (!dayKey) continue;
    const counts = activityByDay.get(dayKey) ?? { requests: 0, waiting: 0, begun: 0, performed: 0, archived: 0 };
    counts.requests += 1;
    if (waitingIds.has(identity)) counts.waiting += 1;
    if (begunIds.has(identity)) counts.begun += 1;
    if (performedIds.has(identity)) counts.performed += 1;
    if (isArchived) counts.archived += 1;
    activityByDay.set(dayKey, counts);
  }

  return {
    selectedDayKey: selectedKey,
    partition: {
      waiting: partition.waiting.filter(request => onSelectedDay(requestDay(request))),
      begun: partition.begun.filter(link => onSelectedDay(cycleDay(link))),
      performed: partition.performed.filter(link => onSelectedDay(cycleDay(link))),
      supplementalPerformed: partition.supplementalPerformed.filter(link => onSelectedDay(cycleDay(link))),
    },
    fullPartition: partition,
    otherDayWaiting: partition.waiting.filter(request => !onSelectedDay(requestDay(request))),
    otherDayBegun: partition.begun.filter(link => !onSelectedDay(cycleDay(link))),
    archived,
    activityByDay,
  };
}
