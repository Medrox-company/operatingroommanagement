import type { OperatingRoom } from '../types';
import type { StatusHistoryRow } from './db';
import type { StatisticsWindow } from './statistics-room-scope';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

// “Příprava sálu” is a real phase, not the idle status “Sál připraven”.
const isReady = (name: string) => /^(sal pripraven|pripraven sal)(?:\s|$)/.test(name)
  || ['ready', 'idle', 'room ready', 'sal volny', 'volny sal'].includes(name);

function workingWindow(room: OperatingRoom, day: Date): StatisticsWindow | null {
  const hours = room.weeklySchedule?.[DAYS[day.getDay()]];
  if (!hours?.enabled) return null;
  const validHour = (value: number) => Number.isInteger(value) && value >= 0 && value <= 23;
  const validMinute = (value: number) => Number.isInteger(value) && value >= 0 && value <= 59;
  if (!validHour(hours.startHour) || !validMinute(hours.startMinute)
    || !(validHour(hours.endHour) || (hours.endHour === 24 && hours.endMinute === 0))
    || !validMinute(hours.endMinute)) return null;
  const start = new Date(day);
  const end = new Date(day);
  start.setHours(hours.startHour, hours.startMinute, 0, 0);
  end.setHours(hours.endHour, hours.endMinute, 0, 0);
  return end > start ? { start, end } : null;
}

function workingSegments(room: OperatingRoom, window: StatisticsWindow) {
  const segments: Array<StatisticsWindow & { known: boolean }> = [];
  const day = new Date(window.start);
  day.setHours(0, 0, 0, 0);
  while (day < window.end) {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const work = workingWindow(room, day);
    segments.push(work ? { ...work, known: true }
      : { start: new Date(day), end: new Date(next), known: false });
    day.setDate(day.getDate() + 1);
  }
  return segments;
}

export interface DayPhaseShare {
  label: string;
  color: string;
  milliseconds: number;
  /** Exact measured share, before display rounding. */
  exactPercent: number;
  /** Whole percentage points allocated so the displayed total is 100. */
  percent: number;
}

/**
 * Distribution of recorded, completed phases, not a capacity/utilization KPI.
 * Durations belong to the previous phase and may end outside the selected day.
 * Keep factual historical activity when its working hours are not determined;
 * today's disabled schedule is not evidence that a historical operation did not occur.
 * Planned breakMinutes cannot locate an actual break, so do not prorate phases.
 */
export function statisticsDayPhaseSummary(
  history: StatusHistoryRow[], rooms: OperatingRoom[],
  steps: Array<{ title: string; color: string; name?: string }>, window: StatisticsWindow,
  options: { now?: Date } = {},
): { phases: DayPhaseShare[]; totalMilliseconds: number; withoutWorkingHours: boolean } {
  const now = (options.now ?? new Date()).getTime();
  const windowStart = window.start.getTime();
  const windowEnd = Math.min(window.end.getTime(), now);
  const empty = { phases: [], totalMilliseconds: 0, withoutWorkingHours: false };
  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd) || windowEnd <= windowStart) return empty;

  // The established 07:00 → 07:00 operational day can intersect two shifts.
  // Walk calendar dates with setDate, not fixed 24-hour increments (DST).
  const roomBounds = new Map(rooms.map(room => [room.id, workingSegments(room, window)]));
  const aliases = new Map<string, { title: string; color: string }>();
  for (const step of steps) {
    aliases.set(normalize(step.title), step);
    if (step.name) aliases.set(normalize(step.name), step);
  }
  const totals = new Map<string, { label: string; color: string; milliseconds: number }>();
  const ids = new Set<string>();
  const signatures = new Set<string>();
  let withoutWorkingHours = false;
  for (const event of history) {
    if (!roomBounds.has(event.operating_room_id) || event.event_type !== 'step_change') continue;
    if (event.metadata?.synthetic === true || event.metadata?.synthetic === 'true'
      || event.metadata?.source === 'app_review_seed') continue;
    const duration = event.duration_seconds;
    const end = Date.parse(event.timestamp);
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0
      || !Number.isFinite(end) || end > now) continue;
    const start = end - duration * 1000;
    if (!Number.isFinite(start)) continue;
    const previous = typeof event.metadata?.previous_step === 'string' && event.metadata.previous_step.trim()
      ? event.metadata.previous_step : event.step_name;
    const historicalName = typeof previous === 'string' && previous.trim() ? previous.trim() : 'Nezaznamenaná fáze';
    const name = normalize(historicalName);
    const step = aliases.get(name);
    if (isReady(name) || (step && isReady(normalize(step.title)))) continue;
    const signature = JSON.stringify([event.operating_room_id, normalize(step?.title ?? historicalName), end, duration]);
    // An authoritative, distinct database ID must not be erased by a heuristic.
    if (event.id ? ids.has(event.id) : signatures.has(signature)) continue;
    if (event.id) ids.add(event.id);
    else signatures.add(signature);

    let overlap = 0;
    for (const work of roomBounds.get(event.operating_room_id) ?? []) {
      const part = Math.max(0, Math.min(end, windowEnd, work.end.getTime())
        - Math.max(start, windowStart, work.start.getTime()));
      overlap += part;
      if (part > 0 && !work.known) withoutWorkingHours = true;
    }
    if (overlap <= 0) continue;
    const label = step?.title ?? historicalName;
    const key = normalize(label);
    const total = totals.get(key) ?? { label, color: step?.color || '#94a3b8', milliseconds: 0 };
    total.milliseconds += overlap;
    totals.set(key, total);
  }

  const totalMilliseconds = [...totals.values()].reduce((sum, phase) => sum + phase.milliseconds, 0);
  if (totalMilliseconds <= 0) return empty;
  const phases = [...totals.values()].sort((a, b) => b.milliseconds - a.milliseconds)
    .map(phase => {
      const exactPercent = phase.milliseconds / totalMilliseconds * 100;
      return { ...phase, exactPercent, percent: Math.floor(exactPercent) };
    });
  // Largest remainders: 1/3 + 1/3 + 1/3 displays as 34 + 33 + 33, not 99.
  const remainders = phases.map((phase, index) => ({ index, value: phase.exactPercent - phase.percent }))
    .sort((a, b) => b.value - a.value || a.index - b.index);
  const remaining = 100 - phases.reduce((sum, phase) => sum + phase.percent, 0);
  for (let index = 0; index < remaining; index++) phases[remainders[index].index].percent++;
  return { phases, totalMilliseconds, withoutWorkingHours };
}
