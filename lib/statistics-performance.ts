import type { OperatingRoom } from '../types';
import type { StatusHistoryRow } from './db';

/** Operational elapsed time; turnover is clipped to configured weekday shifts. */
export const PERFORMANCE_TIMEZONE = 'Europe/Prague' as const;
export const PERFORMANCE_METRICS = ['aroStart', 'surgery', 'aroEnd', 'cleanup', 'turnover'] as const;
export type PerformanceMetricKind = typeof PERFORMANCE_METRICS[number];
export type PerformanceAvailability = 'available' | 'no_data' | 'not_recorded';
export interface PerformanceOptions {
  anesthesiaStartEnabled: boolean;
  anesthesiaEndEnabled: boolean;
}
export interface PerformanceQuality {
  missingDuration: number;
  nonPositive: number;
  underOneMinute: number;
  /** Invalid times without an assignable month are reported at report level. */
  invalidTimestamp: number;
}
export interface MetricSummary {
  /** Optional review filter: only measured durations >= 60 seconds. */
  averageMinutes: number | null;
  medianMinutes: number | null;
  p90Minutes: number | null;
  count: number;
  observed: number;
  excluded: number;
  coverage: number | null;
  /** All finite positive measured intervals, including sub-minute intervals. */
  rawAverageMinutes: number | null;
  rawMedianMinutes: number | null;
  rawP90Minutes: number | null;
  rawCount: number;
  quality: PerformanceQuality;
  availability: PerformanceAvailability;
}
export type PerformanceSummaries = Record<PerformanceMetricKind, MetricSummary>;
export interface PerformanceMonth extends PerformanceSummaries {
  key: string;
  label: string;
  start: string;
  end: string;
  isPartial: boolean;
}
export interface MonthlyPerformanceReport {
  timezone: typeof PERFORMANCE_TIMEZONE;
  months: PerformanceMonth[];
  byRoom: Record<string, PerformanceMonth[]>;
  /** Pooled individual measurements over the displayed twelve months. */
  totals: PerformanceSummaries;
  totalsByRoom: Record<string, PerformanceSummaries>;
  unassignedInvalidTimestamp: Record<PerformanceMetricKind, number>;
  excludedSynthetic: number;
}

type MonthParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
type Samples = { durations: number[]; observed: number; missingDuration: number; nonPositive: number; underOneMinute: number };
type MonthSamples = Record<PerformanceMetricKind, Samples>;
type PhaseKind = 'arrival' | 'anesthesiaStart' | 'surgery' | 'surgeryEnd' | 'anesthesiaEnd' | 'departure' | 'cleanup' | 'ready' | 'preparation';
type Phase = { kind: PhaseKind | null; at: number; start: number | null; duration: number | null; reset: boolean };
type Cycle = { phases: Phase[]; arrival: number | null; explicitStart: number | null; end: number | null; ready: number | null; ambiguous: boolean };
const TIME_TOLERANCE_MS = 1_001; // Database durations are floored to whole seconds; lifecycle markers add 1 ms.

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PERFORMANCE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const labelFormatter = new Intl.DateTimeFormat('cs-CZ', { timeZone: PERFORMANCE_TIMEZONE, month: 'long', year: 'numeric' });
function pragueParts(instant: number): MonthParts {
  return Object.fromEntries(partsFormatter.formatToParts(new Date(instant))
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])) as MonthParts;
}
function monthKey(instant: number): string {
  const { year, month } = pragueParts(instant);
  return `${year}-${String(month).padStart(2, '0')}`;
}
function pragueLocalInstant(year: number, month: number, day: number, hour = 0, minute = 0): number {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = pragueParts(instant);
    instant += localAsUtc - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  }
  return instant;
}
function pragueMonthStart(year: number, month: number): number {
  return pragueLocalInstant(year, month, 1);
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
function validClockPart(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
}

/**
 * Exact intersection of two recorded endpoints with this room's configured
 * Monday–Friday shifts, in Europe/Prague. Weekends are excluded even if enabled.
 *
 * A known off-day contributes zero; absent/malformed relevant weekday settings
 * return null rather than silently substituting default hours. The editor only
 * supports same-day shifts, so end <= start is invalid, not an overnight shift.
 *
 * Only the CURRENT weekly schedule is stored: this is a recalculation under that
 * schedule, not proof of historical opening hours. breakMinutes has no recorded
 * position in the day; it cannot honestly be subtracted from an exact partial
 * interval or spread proportionally. No break location or duration is invented.
 */
export function calculateTurnoverWorkingSeconds(
  room: Pick<OperatingRoom, 'weeklySchedule'>, departureMs: number, arrivalMs: number,
): number | null {
  if (!Number.isFinite(departureMs) || !Number.isFinite(arrivalMs)) return null;
  if (arrivalMs <= departureMs) return (arrivalMs - departureMs) / 1_000;
  const from = pragueParts(departureMs);
  const to = pragueParts(arrivalMs);
  // UTC here is only a timezone-independent calendar-day cursor, not a shift.
  const firstDay = Date.UTC(from.year, from.month - 1, from.day);
  const lastDay = Date.UTC(to.year, to.month - 1, to.day);
  let workingMs = 0;
  for (let calendar = firstDay; calendar <= lastDay; calendar += 86_400_000) {
    const date = new Date(calendar);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const midnight = pragueLocalInstant(year, month, day);
    const nextDate = new Date(calendar + 86_400_000);
    const nextMidnight = pragueLocalInstant(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate());
    if (Math.min(arrivalMs, nextMidnight) <= Math.max(departureMs, midnight)) continue;
    const hours = room.weeklySchedule?.[WEEKDAYS[weekday]];
    if (!hours || typeof hours.enabled !== 'boolean') return null;
    if (!hours.enabled) continue;
    if (!validClockPart(hours.startHour, 23) || !validClockPart(hours.endHour, 23)
      || !validClockPart(hours.startMinute, 59) || !validClockPart(hours.endMinute, 59)) return null;
    if (hours.endHour * 60 + hours.endMinute <= hours.startHour * 60 + hours.startMinute) return null;
    const start = pragueLocalInstant(year, month, day, hours.startHour, hours.startMinute);
    const end = pragueLocalInstant(year, month, day, hours.endHour, hours.endMinute);
    workingMs += Math.max(0, Math.min(arrivalMs, end) - Math.max(departureMs, start));
  }
  return workingMs / 1_000;
}
function emptySamples(): Samples {
  return { durations: [], observed: 0, missingDuration: 0, nonPositive: 0, underOneMinute: 0 };
}
function emptyMonthSamples(): MonthSamples {
  return Object.fromEntries(PERFORMANCE_METRICS.map(kind => [kind, emptySamples()])) as MonthSamples;
}
function normalize(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function phaseKind(value: string | null | undefined): PhaseKind | null {
  const name = normalize(value);
  if (/^(sal pripraven|ready)(\b|$)/.test(name)) return 'ready';
  if (/^(prijezd (pacienta )?na (operacni )?sal|patient arrival to (the )?(operating )?room|arrival to (the )?or)(\b|$)/.test(name)) return 'arrival';
  if (/^(zacatek|zahajeni) anestezie(\b|$)|^an(a)?esthesia start$/.test(name)) return 'anesthesiaStart';
  if (/^(ukonceni|konec) (chirurgickeho )?vykonu(\b|$)|^surgery end$/.test(name)) return 'surgeryEnd';
  if (/^(chirurgicky vykon|zacatek chirurgickeho vykonu|zahajeni chirurgickeho vykonu|surgery|surgical procedure)(\b|$)/.test(name)) return 'surgery';
  if (/^(ukonceni|konec) anestezie(\b|$)|^an(a)?esthesia end$/.test(name)) return 'anesthesiaEnd';
  if (/^(odjezd|odvoz) (pacienta )?(ze|z) (operacniho )?salu(\b|$)|^patient departure$/.test(name)) return 'departure';
  if (/^(uklid|zahajeni uklidu|cleaning)(\b|$)/.test(name)) return 'cleanup';
  if (/^priprava salu(\b|$)/.test(name)) return 'preparation';
  return null;
}
function previousPhaseName(event: StatusHistoryRow): string | null {
  return typeof event.metadata?.previous_step === 'string' ? event.metadata.previous_step : event.step_name;
}
function metricForPhase(kind: PhaseKind | null): PerformanceMetricKind | null {
  if (kind === 'arrival' || kind === 'anesthesiaStart') return 'aroStart';
  if (kind === 'surgery') return 'surgery';
  if (kind === 'surgeryEnd' || kind === 'anesthesiaEnd') return 'aroEnd';
  if (kind === 'cleanup' || kind === 'preparation' || kind === 'ready') return 'cleanup';
  return kind === 'departure' ? 'turnover' : null;
}
function addDuration(sample: Samples, seconds: number | null): void {
  sample.observed += 1;
  if (seconds === null || !Number.isFinite(seconds)) sample.missingDuration += 1;
  else if (seconds <= 0) sample.nonPositive += 1;
  else {
    sample.durations.push(seconds);
    if (seconds < 60) sample.underOneMinute += 1;
  }
}
function quantile(sorted: number[], probability: number): number | null {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}
function summarize(sample: Samples, kind: PerformanceMetricKind): MetricSummary {
  const raw = [...sample.durations].sort((a, b) => a - b);
  const qualified = raw.filter(seconds => seconds >= 60);
  const minutes = (value: number | null) => value === null ? null : value / 60;
  const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length / 60 : null;
  return {
    averageMinutes: mean(qualified), medianMinutes: minutes(quantile(qualified, .5)), p90Minutes: minutes(quantile(qualified, .9)),
    count: qualified.length, observed: sample.observed, excluded: sample.observed - qualified.length,
    coverage: sample.observed ? qualified.length / sample.observed : null,
    rawAverageMinutes: mean(raw), rawMedianMinutes: minutes(quantile(raw, .5)), rawP90Minutes: minutes(quantile(raw, .9)), rawCount: raw.length,
    quality: { missingDuration: sample.missingDuration, nonPositive: sample.nonPositive, underOneMinute: sample.underOneMinute, invalidTimestamp: 0 },
    availability: raw.length ? 'available' : sample.observed || kind === 'cleanup' ? 'no_data' : 'not_recorded',
  };
}
function summarizeAll(samples: MonthSamples): PerformanceSummaries {
  return Object.fromEntries(PERFORMANCE_METRICS.map(kind => [kind, summarize(samples[kind], kind)])) as PerformanceSummaries;
}
function emptyCycle(): Cycle {
  return { phases: [], arrival: null, explicitStart: null, end: null, ready: null, ambiguous: false };
}

/**
 * Decode historical names, never present-day indices. A step_change names the
 * phase which ENDED. Its start is recoverable from its actual recorded duration.
 * Index zero is used only as the protocol's cycle-reset boundary, not a phase map.
 */
function buildCycles(events: StatusHistoryRow[]): Cycle[] {
  const cycles: Cycle[] = [];
  let current: Cycle | null = null;
  let afterSyntheticBarrier = false;
  const finish = () => {
    if (current && (current.phases.length || current.arrival !== null)) cycles.push(current);
    current = null;
  };
  for (const event of events) {
    const at = Date.parse(event.timestamp);
    if (event.event_type === 'performance_synthetic_barrier') {
      finish();
      // Removing demo rows must not join the real patients on either side.
      cycles.push({ ...emptyCycle(), end: at, ambiguous: true });
      afterSyntheticBarrier = true;
      continue;
    }
    if (event.event_type === 'operation_start') {
      if (current?.explicitStart !== null && current?.explicitStart !== undefined
        && Math.abs(current.explicitStart - at) <= 1) continue;
      finish();
      current = emptyCycle();
      afterSyntheticBarrier = false;
      current.explicitStart = at;
      if (phaseKind(event.step_name) === 'arrival') current.arrival = at;
      continue;
    }
    if (event.event_type === 'operation_end' || event.event_type === 'operation_completed') {
      if (!current) continue;
      current.end = at;
      const last = current.phases.at(-1);
      // Lifecycle end confirms ready only for the closing cleaning/preparation
      // phase, never as a substitute for patient departure or surgical end.
      if (last && (last.kind === 'cleanup' || last.kind === 'preparation')
        && Math.abs(last.at - at) <= TIME_TOLERANCE_MS) current.ready = last.at;
      finish();
      continue;
    }
    if (event.event_type !== 'step_change') continue;
    const kind = phaseKind(previousPhaseName(event));
    const duration = typeof event.duration_seconds === 'number' && Number.isFinite(event.duration_seconds)
      ? event.duration_seconds : null;
    let start = duration !== null && duration >= 0 ? at - duration * 1_000 : null;
    if (kind === 'ready') {
      const last = current?.phases.at(-1);
      if (current && last && start !== null && Math.abs(last.at - start) <= TIME_TOLERANCE_MS) {
        current.ready = start;
        current.end = start;
        finish();
      }
      continue;
    }
    if (!current) current = { ...emptyCycle(), ambiguous: afterSyntheticBarrier };
    if (kind === 'arrival' && current.phases.some(phase => phase.kind === 'arrival')) {
      finish(); // missing cycle boundary: do not join two patients
      current = { ...emptyCycle(), ambiguous: afterSyntheticBarrier };
    }
    const previous = current.phases.at(-1);
    const precedingBoundary = previous?.at ?? current.explicitStart;
    if (start !== null && precedingBoundary !== null && precedingBoundary !== undefined
      && Math.abs(start - precedingBoundary) <= TIME_TOLERANCE_MS) start = precedingBoundary;
    if (start !== null && current.explicitStart !== null && start < current.explicitStart - TIME_TOLERANCE_MS) current.ambiguous = true;
    if (start !== null && previous && start < previous.at - TIME_TOLERANCE_MS) current.ambiguous = true;
    const phase: Phase = { kind, at, start, duration, reset: event.step_index === 0 };
    current.phases.push(phase);
    if (kind === 'arrival' && start !== null) {
      if (current.arrival !== null && Math.abs(current.arrival - start) > TIME_TOLERANCE_MS) current.ambiguous = true;
      current.arrival = start;
    }
    if (phase.reset) {
      current.end = at;
      if (kind === 'cleanup' || kind === 'preparation') current.ready = at;
      finish();
    }
  }
  finish();
  return cycles;
}

function onlyPhase(cycle: Cycle, kind: PhaseKind): Phase | null {
  const matches = cycle.phases.filter(phase => phase.kind === kind);
  return matches.length === 1 ? matches[0] : null;
}
function interval(start: number | null | undefined, end: number | null | undefined, cycle: Cycle): number | null {
  if (cycle.ambiguous || start == null || end == null) return null;
  if (cycle.explicitStart !== null && start < cycle.explicitStart - TIME_TOLERANCE_MS) return null;
  if (cycle.end !== null && end > cycle.end + TIME_TOLERANCE_MS) return null;
  return (end - start) / 1_000;
}

/** Twelve Prague calendar months; every KPI is booked at its measured endpoint. */
export function buildMonthlyPerformance(
  history: StatusHistoryRow[], rooms: OperatingRoom[], now = new Date(),
  options: PerformanceOptions = { anesthesiaStartEnabled: false, anesthesiaEndEnabled: false },
): MonthlyPerformanceReport {
  const nowMs = now.getTime();
  const current = pragueParts(nowMs);
  const definitions = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(current.year, current.month - 12 + index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
  const pooled = new Map(definitions.map(({ year, month }) => [`${year}-${String(month).padStart(2, '0')}`, emptyMonthSamples()]));
  const perRoom = new Map(rooms.map(room => [room.id, new Map([...pooled.keys()].map(key => [key, emptyMonthSamples()]))]));
  const totals = emptyMonthSamples();
  const totalsByRoom = new Map(rooms.map(room => [room.id, emptyMonthSamples()]));
  const roomsById = new Map(rooms.map(room => [room.id, room]));
  const unassignedInvalidTimestamp = Object.fromEntries(PERFORMANCE_METRICS.map(kind => [kind, 0])) as Record<PerformanceMetricKind, number>;
  const byRoom = new Map<string, StatusHistoryRow[]>();
  const seenIds = new Set<string>();
  const seenRows = new Set<string>();
  let excludedSynthetic = 0;
  for (const event of history) {
    if (!perRoom.has(event.operating_room_id)) continue;
    if (event.id && seenIds.has(event.id)) continue;
    if (event.id) seenIds.add(event.id);
    if (event.metadata?.synthetic === true || event.metadata?.synthetic === 'true' || event.metadata?.source === 'app_review_seed') {
      excludedSynthetic += 1;
      const at = Date.parse(event.timestamp);
      if (Number.isFinite(at) && at <= nowMs) {
        const events = byRoom.get(event.operating_room_id) ?? [];
        events.push({ ...event, event_type: 'performance_synthetic_barrier' });
        byRoom.set(event.operating_room_id, events);
      }
      continue;
    }
    // These auxiliary arrival events refer to the tract, not the actual room.
    if (!['step_change', 'operation_start', 'operation_end', 'operation_completed'].includes(event.event_type)) continue;
    const at = Date.parse(event.timestamp);
    if (!Number.isFinite(at)) {
      const metric = metricForPhase(phaseKind(previousPhaseName(event)));
      if (metric) unassignedInvalidTimestamp[metric] += 1;
      continue;
    }
    if (at > nowMs) continue;
    const signature = JSON.stringify([event.operating_room_id, event.event_type, at, previousPhaseName(event), event.step_index ?? null, event.duration_seconds ?? null]);
    if (seenRows.has(signature)) continue;
    seenRows.add(signature);
    const events = byRoom.get(event.operating_room_id) ?? [];
    events.push(event);
    byRoom.set(event.operating_room_id, events);
  }
  const add = (roomId: string, kind: PerformanceMetricKind, at: number, seconds: number | null) => {
    if (!Number.isFinite(at) || at > nowMs) return;
    const key = monthKey(at);
    const shared = pooled.get(key);
    const roomSamples = perRoom.get(roomId)?.get(key);
    if (!shared || !roomSamples) return;
    for (const samples of [shared, roomSamples, totals, totalsByRoom.get(roomId)!]) addDuration(samples[kind], seconds);
  };
  for (const [roomId, events] of byRoom) {
    events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
      || (a.event_type === 'operation_start' ? -1 : b.event_type === 'operation_start' ? 1 : 0));
    const cycles = buildCycles(events);
    for (let index = 0; index < cycles.length; index += 1) {
      const cycle = cycles[index];
      const surgery = onlyPhase(cycle, 'surgery');
      const surgeryEnd = onlyPhase(cycle, 'surgeryEnd');
      const departure = onlyPhase(cycle, 'departure');
      const cleaning = onlyPhase(cycle, 'cleanup');
      if (cycle.phases.some(phase => phase.kind === 'surgery')) {
        const at = surgery?.start ?? surgery?.at ?? cycle.phases.find(phase => phase.kind === 'surgery')!.at;
        const start = options.anesthesiaStartEnabled ? onlyPhase(cycle, 'anesthesiaStart')?.start : cycle.arrival;
        add(roomId, 'aroStart', at, interval(start, surgery?.start, cycle));
        // A closed surgical phase is a measured duration. A direct reset is an
        // aborted cycle, not proof of reaching the requested surgical-end state.
        const conflictingSurgicalEnd = surgery && surgeryEnd?.start !== null && surgeryEnd?.start !== undefined
          && Math.abs(surgery.at - surgeryEnd.start) > TIME_TOLERANCE_MS;
        const surgicalSeconds = surgery?.duration !== null && surgery?.duration !== undefined && surgery.duration < 0
          ? surgery.duration : surgery && !surgery.reset
            && !conflictingSurgicalEnd ? interval(surgery.start, surgery.at, cycle) : null;
        add(roomId, 'surgery', surgeryEnd?.start ?? surgery?.at ?? at, surgicalSeconds);
      }
      if (cycle.phases.some(phase => phase.kind === 'surgeryEnd')) {
        const target = options.anesthesiaEndEnabled ? onlyPhase(cycle, 'anesthesiaEnd') : departure;
        add(roomId, 'aroEnd', target?.start ?? surgeryEnd?.at ?? cycle.end ?? cycle.phases.find(phase => phase.kind === 'surgeryEnd')!.at,
          interval(surgeryEnd?.start, target?.start, cycle));
      }
      if (cycle.phases.some(phase => phase.kind === 'cleanup')) {
        const seconds = cleaning?.duration !== null && cleaning?.duration !== undefined && cleaning.duration < 0
          ? cleaning.duration : interval(cleaning?.start, cycle.ready, cycle);
        add(roomId, 'cleanup', cycle.ready ?? cleaning?.at ?? cycle.end ?? cycle.phases.find(phase => phase.kind === 'cleanup')!.at, seconds);
      }
      if (index > 0 && cycle.arrival !== null) {
        const previous = cycles[index - 1];
        const previousDeparture = onlyPhase(previous, 'departure');
        const previousBoundary = previous.ready ?? previous.end;
        const validPair = !previous.ambiguous && !cycle.ambiguous && previousBoundary !== null
          && previousBoundary <= cycle.arrival + TIME_TOLERANCE_MS;
        add(roomId, 'turnover', cycle.arrival, validPair && previousDeparture?.start !== null && previousDeparture?.start !== undefined
          ? calculateTurnoverWorkingSeconds(roomsById.get(roomId)!, previousDeparture.start, cycle.arrival) : null);
      }
    }
  }
  const toMonths = (samples: Map<string, MonthSamples>): PerformanceMonth[] => definitions.map(({ year, month }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const next = new Date(Date.UTC(year, month, 1));
    const start = pragueMonthStart(year, month);
    const end = pragueMonthStart(next.getUTCFullYear(), next.getUTCMonth() + 1);
    return {
      key, label: labelFormatter.format(new Date(Date.UTC(year, month - 1, 15, 12))),
      start: new Date(start).toISOString(), end: new Date(end).toISOString(), isPartial: nowMs < end,
      ...summarizeAll(samples.get(key)!),
    };
  });
  return {
    timezone: PERFORMANCE_TIMEZONE, months: toMonths(pooled),
    byRoom: Object.fromEntries([...perRoom].map(([roomId, samples]) => [roomId, toMonths(samples)])),
    totals: summarizeAll(totals), totalsByRoom: Object.fromEntries([...totalsByRoom].map(([roomId, samples]) => [roomId, summarizeAll(samples)])),
    unassignedInvalidTimestamp, excludedSynthetic,
  };
}
