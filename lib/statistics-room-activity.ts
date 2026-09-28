'use client';

import { OperatingRoom, DayWorkingHours } from '../types';
import { type StatusHistoryRow } from './db';
import '../components/mobile/mobile-statistics.css';

/** Období, za které se metriky počítají. */
export type Period = 'den' | 'týden' | 'měsíc' | 'rok';

export const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// ── Helper: Get working hours for a specific day from room schedule ────────────
export function getRoomWorkingHours(room: OperatingRoom, dayIndex: number): DayWorkingHours {
  const dayKey = DAY_KEYS[dayIndex];
  return room.weeklySchedule?.[dayKey] ?? {
    enabled: false,
    startHour: 0,
    startMinute: 0,
    endHour: 0,
    endMinute: 0,
    breakMinutes: 0,
  };
}

// ── Helper: Get only an explicitly configured break duration ─────────────────
export function getDayBreakMinutes(hours: DayWorkingHours): number {
  const raw = hours.breakMinutes;
  if (typeof raw !== 'number' || isNaN(raw) || raw < 0) return 0;
  return Math.min(raw, Number.MAX_SAFE_INTEGER);
}

// ── Helper: Calculate net working minutes (gross - break) for a room on a day ──
export function getRoomWorkingMinutes(room: OperatingRoom, dayIndex: number): number {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 0;
  const startMins = hours.startHour * 60 + hours.startMinute;
  const endMins = hours.endHour * 60 + hours.endMinute;
  const gross = Math.max(0, endMins - startMins);
  const breakMins = Math.min(getDayBreakMinutes(hours), gross);
  return Math.max(0, gross - breakMins);
}

// ── Helper: Check if a timestamp falls within room's working hours ─────────────
export function isWithinWorkingHours(room: OperatingRoom, timestamp: string): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0 format
  const hours = getRoomWorkingHours(room, dayIndex);
  
  if (!hours.enabled) return false;
  
  const currentMins = date.getHours() * 60 + date.getMinutes();
  const startMins = hours.startHour * 60 + hours.startMinute;
  const endMins = hours.endHour * 60 + hours.endMinute;
  
  return currentMins >= startMins && currentMins <= endMins;
}

// ── Helper: Calculate average step durations from status history ───────────────
export function calculateAvgStepDurations(
  history: StatusHistoryRow[], 
  workflowSteps: { title: string }[]
): number[] {
  if (!history || history.length === 0) {
    // Return default durations if no history
    return workflowSteps.map(() => 0);
  }

  const stepDurations: Record<string, number[]> = {};
  workflowSteps.forEach(step => {
    stepDurations[step.title] = [];
  });

  // Collect durations for each step
  history.filter(e => e.event_type === 'step_change' && e.duration_seconds).forEach(e => {
    if (e.step_name && stepDurations[e.step_name]) {
      stepDurations[e.step_name].push(e.duration_seconds || 0);
    }
  });

  // Calculate averages in minutes
  return workflowSteps.map(step => {
    // „Sál připraven“ je klidový stav mezi výkony, nikoli součást operace.
    // Délku tohoto stavu proto nikdy nepřičítáme k operačnímu cyklu.
    if (isIdleStatusName(step.title)) return 0;
    const durations = stepDurations[step.title];
    if (durations.length === 0) return 0;
    const avgSeconds = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avgSeconds / 60);
  });
}

// ── Helper: Calculate workflow distribution from status history ────────────────
export function calculateWorkflowDistribution(
  history: StatusHistoryRow[],
  workflowSteps: { title: string; color: string }[]
): { title: string; color: string; pct: number; totalMinutes: number }[] {
  if (!history || history.length === 0) {
    return workflowSteps.map(step => ({ title: step.title, color: step.color, pct: 0, totalMinutes: 0 }));
  }

  const stepTotals: Record<string, number> = {};
  workflowSteps.forEach(step => {
    stepTotals[step.title] = 0;
  });

  // Sum up all durations for each step
  history.filter(e => e.event_type === 'step_change' && e.duration_seconds).forEach(e => {
    if (e.step_name && stepTotals[e.step_name] !== undefined) {
      stepTotals[e.step_name] += e.duration_seconds || 0;
    }
  });

  const totalSeconds = workflowSteps.reduce(
    (sum, step) => sum + (isIdleStatusName(step.title) ? 0 : stepTotals[step.title]),
    0,
  );
  
  return workflowSteps.map(step => {
    const includedSeconds = isIdleStatusName(step.title) ? 0 : stepTotals[step.title];
    return {
      title: step.title,
      color: step.color,
      pct: totalSeconds > 0 ? Math.round((includedSeconds / totalSeconds) * 100) : 0,
      totalMinutes: Math.round(includedSeconds / 60),
    };
  });
}

// ── Helper: Calculate per-room workflow distribution from status history ───────
export function calculateRoomWorkflowDistribution(
  history: StatusHistoryRow[],
  rooms: OperatingRoom[],
  workflowSteps: { title: string }[]
): Record<string, Record<string, number>> {
  const roomDistributions: Record<string, Record<string, number>> = {};
  
  rooms.forEach(room => {
    const roomHistory = history.filter(e => e.operating_room_id === room.id && e.event_type === 'step_change');
    const stepTotals: Record<string, number> = {};
    
    workflowSteps.forEach(step => {
      stepTotals[step.title] = 0;
    });
    
    roomHistory.forEach(e => {
      if (e.step_name && stepTotals[e.step_name] !== undefined) {
        stepTotals[e.step_name] += e.duration_seconds || 0;
      }
    });
    
    const totalSeconds = Object.values(stepTotals).reduce((sum, v) => sum + v, 0);
    
    roomDistributions[room.id] = {};
    workflowSteps.forEach(step => {
      roomDistributions[room.id][step.title] = totalSeconds > 0 
        ? Math.round((stepTotals[step.title] / totalSeconds) * 100) 
        : 0;
    });
  });
  
  return roomDistributions;
}

// ── Helper: Calculate total working minutes for a room across a period ─────────
export function getRoomTotalWorkingMinutes(room: OperatingRoom, period: Period): number {
  const now = new Date();
  if (period === 'den') {
    const { start, end } = dayBounds(operationalToday(now));
    return getRoomWorkingMinutesInWindow(room, start, end);
  }
  return getRoomWorkingMinutesInWindow(room, getPeriodStart(period, now), now);
}

// ── Helper: Count operations within working hours for a room from history ──────
export function countOperationsInWorkingHours(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period
): number {
  if (!room) return 0;
  const operationStarts = getRecordedOperationStarts(room, history || []);
  const now = new Date();
  const from = getPeriodStart(period, now).getTime();
  
  // Filter operations that fall within the room's working hours
  return operationStarts.filter(date => {
    if (!Number.isFinite(date.getTime()) || date.getTime() < from || date.getTime() > now.getTime()) return false;
    const dayOfWeek = date.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hours = getRoomWorkingHours(room, dayIndex);
    
    // A room may have been closed since this operation took place. Its
    // current schedule must not erase a recorded historical operation.
    if (getRoomWorkingMinutes(room, dayIndex) === 0) return true;
    
    const eventMins = date.getHours() * 60 + date.getMinutes();
    const startMins = hours.startHour * 60 + hours.startMinute;
    const endMins = hours.endHour * 60 + hours.endMinute;
    
    return eventMins >= startMins && eventMins <= endMins;
  }).length;
}

// ── Helper: Get period start date (matches loadStats fetch window) ─────────────
export function getPeriodStart(period: Period, now: Date = new Date()): Date {
  switch (period) {
    case 'den':    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'týden':  return new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
    case 'měsíc':  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'rok':    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

/** Explicit archived timestamps (or a measured completed-cycle duration), never inferred capacity. */
export function isSameOperationStart(left: number, right: number): boolean {
  // The database lifecycle event is intentionally phase_started_at + 1 ms,
  // whereas the room snapshot keeps phase_started_at itself. Older imports
  // may also round to seconds; those records still describe the same cycle.
  return Math.abs(left - right) <= 2_000;
}

export function getArchivedOperationIntervals(
  room: OperatingRoom,
  history: StatusHistoryRow[],
): { start: Date; end: Date }[] {
  const intervals: { start: Date; end: Date }[] = [];
  const append = (startMs: number, endMs: number) => {
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      && !intervals.some(interval => isSameOperationStart(interval.start.getTime(), startMs)
        && Math.abs(interval.end.getTime() - endMs) <= 2_000)) {
      intervals.push({ start: new Date(startMs), end: new Date(endMs) });
    }
  };
  for (const operation of room.completedOperations || []) {
    append(Date.parse(operation.startedAt), Date.parse(operation.endedAt));
  }
  for (const event of history) {
    if (event.operating_room_id !== room.id || event.event_type !== 'operation_completed') continue;
    const metadata = event.metadata;
    const endMs = typeof metadata?.endedAt === 'string'
      ? Date.parse(metadata.endedAt) : Date.parse(event.timestamp);
    const duration = event.duration_seconds;
    const startMs = typeof metadata?.startedAt === 'string' ? Date.parse(metadata.startedAt)
      : typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? endMs - duration * 1000 : NaN;
    append(startMs, endMs);
  }
  return intervals;
}

/** Add archived starts only when the same cycle is not already represented by a start event. */
export function getRecordedOperationStarts(room: OperatingRoom, history: StatusHistoryRow[]): Date[] {
  const starts = history
    .filter(event => event.operating_room_id === room.id && event.event_type === 'operation_start')
    .map(event => new Date(event.timestamp))
    .filter(date => Number.isFinite(date.getTime()));
  for (const interval of getArchivedOperationIntervals(room, history)) {
    const startMs = interval.start.getTime();
    if (!starts.some(date => isSameOperationStart(date.getTime(), startMs))) {
      starts.push(interval.start);
    }
  }
  return starts;
}

// ── Helper: Build active operation intervals for a room from history ───────────
// Pairs operation_start with next operation_end; if the room is currently in an
// operation (operationStartedAt set) and has no matching end, the interval is
// left open to `now`. This is critical because ongoing operations don't yet
// have `duration_seconds` recorded on step_change events.
export function buildRoomOperationIntervals(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  now: Date = new Date()
): { start: Date; end: Date }[] {
  const events = history
    .filter(e =>
      e.operating_room_id === room.id &&
      (e.event_type === 'operation_start' || e.event_type === 'operation_end' || e.event_type === 'operation_completed')
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const intervals: { start: Date; end: Date }[] = [];
  let currentStart: Date | null = null;

  for (const e of events) {
    const timestamp = new Date(e.timestamp);
    if (!Number.isFinite(timestamp.getTime())) continue;
    if (e.event_type === 'operation_start') {
      // Nový explicitní start nahradí případný neukončený starý záznam.
      currentStart = timestamp;
    } else if (currentStart) {
      if (timestamp.getTime() > currentStart.getTime()) intervals.push({ start: currentStart, end: timestamp });
      currentStart = null;
    }
  }
  for (const archived of getArchivedOperationIntervals(room, history)) {
    // Explicitly paired lifecycle events take precedence for the same cycle.
    if (!intervals.some(interval => isSameOperationStart(interval.start.getTime(), archived.start.getTime()))) intervals.push(archived);
  }

  // Otevřený interval lze natáhnout do „teď" pouze tehdy, když autoritativní
  // stav sálu potvrzuje právě běžící operační cyklus. Samotná chybějící
  // operation_end událost nesmí vytvářet několikahodinový falešný výkon.
  const authoritativeStart = room.operationStartedAt
    ? new Date(room.operationStartedAt)
    : null;
  const hasAuthoritativeRunningOperation =
    room.currentStepIndex > 0 &&
    authoritativeStart !== null &&
    Number.isFinite(authoritativeStart.getTime());

  if (hasAuthoritativeRunningOperation && authoritativeStart) {
    const openStart = currentStart &&
      Math.abs(currentStart.getTime() - authoritativeStart.getTime()) <= 120_000
        ? currentStart
        : authoritativeStart;
    if (!intervals.some(interval => isSameOperationStart(interval.start.getTime(), openStart.getTime()))) {
      intervals.push({ start: openStart, end: now });
    }
  }

  return intervals;
}

/** Sloučí překrývající se intervaly, aby se tatáž minuta nezapočítala vícekrát. */
export function mergeOperationIntervals(
  intervals: Array<{ start: Date; end: Date }>,
  windowStart: Date,
  windowEnd: Date,
): Array<{ start: Date; end: Date }> {
  const startLimit = windowStart.getTime();
  const endLimit = windowEnd.getTime();
  const clipped = intervals
    .map(interval => ({
      start: new Date(Math.max(interval.start.getTime(), startLimit)),
      end: new Date(Math.min(interval.end.getTime(), endLimit)),
    }))
    .filter(interval => interval.end.getTime() > interval.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Array<{ start: Date; end: Date }> = [];
  clipped.forEach(interval => {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start.getTime() > previous.end.getTime()) {
      merged.push(interval);
      return;
    }
    if (interval.end.getTime() > previous.end.getTime()) previous.end = interval.end;
  });
  return merged;
}

/**
 * Část zadaných intervalů, která skutečně leží v nastavené pracovní době.
 * Pauza nemá v rozvrhu konkrétní čas, proto se odečítá poměrem net/gross stejně
 * v kapacitě i v obsazeném čase.
 */
export function workingMinutesFromIntervals(
  room: OperatingRoom,
  intervals: Array<{ start: Date; end: Date }>,
): number {
  let totalMinutes = 0;

  intervals.forEach(interval => {
    const cursor = new Date(interval.start);
    cursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(interval.end);
    lastDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= lastDay.getTime()) {
      const dayIndex = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
      const hours = getRoomWorkingHours(room, dayIndex);
      if (hours.enabled) {
        const workStart = new Date(cursor);
        workStart.setHours(hours.startHour, hours.startMinute, 0, 0);
        const workEnd = new Date(cursor);
        workEnd.setHours(hours.endHour, hours.endMinute, 0, 0);
        const grossMinutes = Math.max(0, (workEnd.getTime() - workStart.getTime()) / 60_000);
        const netMinutes = Math.max(0, grossMinutes - Math.min(getDayBreakMinutes(hours), grossMinutes));
        const overlapStart = Math.max(interval.start.getTime(), workStart.getTime());
        const overlapEnd = Math.min(interval.end.getTime(), workEnd.getTime());
        if (overlapEnd > overlapStart && grossMinutes > 0) {
          totalMinutes += ((overlapEnd - overlapStart) / 60_000) * (netMinutes / grossMinutes);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return totalMinutes;
}

export function getRoomWorkingMinutesInWindow(room: OperatingRoom, start: Date, end: Date): number {
  return workingMinutesFromIntervals(room, [{ start, end }]);
}

export function calculateActiveMinutesInWorkingWindow(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  start: Date,
  end: Date,
  includeUnscheduledActivity = true,
): number {
  // U dnešního provozního dne může konec okna ležet v budoucnu (zítra v 7:00).
  // Probíhající výkon proto nikdy nesmíme dopočítat dál než do skutečného „teď".
  const measuredEnd = new Date(Math.min(Date.now(), end.getTime()));
  const merged = mergeOperationIntervals(buildRoomOperationIntervals(room, history, measuredEnd), start, measuredEnd);
  const capacity = getRoomWorkingMinutesInWindow(room, start, end);
  const scheduledMinutes = Math.min(capacity, workingMinutesFromIntervals(room, merged));
  if (!includeUnscheduledActivity) return scheduledMinutes;

  // Keep measured historical time on days without a current schedule. It
  // is activity, not a reconstruction of historical working capacity.
  let unscheduledMinutes = 0;
  for (const interval of merged) {
    let cursor = new Date(interval.start);
    while (cursor.getTime() < interval.end.getTime()) {
      const nextDay = new Date(cursor);
      nextDay.setHours(0, 0, 0, 0);
      nextDay.setDate(nextDay.getDate() + 1);
      const segmentEnd = Math.min(nextDay.getTime(), interval.end.getTime());
      const dayIndex = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
      if (getRoomWorkingMinutes(room, dayIndex) === 0) {
        unscheduledMinutes += (segmentEnd - cursor.getTime()) / 60_000;
      }
      cursor = new Date(segmentEnd);
    }
  }
  return scheduledMinutes + unscheduledMinutes;
}

// ── Helper: Calculate active time in minutes within working hours ──────────────
// Sums the overlap between each operation interval and the room's working hours
// for every day within the selected period.
export function calculateActiveTimeInWorkingHours(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period = 'den'
): number {
  if (!room) return 0;

  const now = new Date();
  const periodStart = getPeriodStart(period, now);
  return calculateActiveMinutesInWorkingWindow(room, history || [], periodStart, now);
}

// ── Helper: Calculate utilization percentage based on working hours ────────────
export function calculateRoomUtilization(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period
): number {
  // Denní přehled používá všude stejný provozní den 07:00–07:00 a stejný
  // čitatel jako tabulka „Jednotlivé sály". Tím nevzniká rozdíl mezi
  // kruhovým grafem, mobilním přehledem a tabulkou.
  if (period === 'den') {
    return calculateRoomUtilizationForDay(room, history, operationalToday());
  }

  const totalWorkingMinutes = getRoomTotalWorkingMinutes(room, period);
  if (totalWorkingMinutes === 0) return 0;

  const now = new Date();
  const activeMinutes = calculateActiveMinutesInWorkingWindow(room, history, getPeriodStart(period, now), now, false);
  return Math.min(100, Math.max(0, Math.round((activeMinutes / totalWorkingMinutes) * 100)));
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEN — metriky pro KONKRÉTNÍ kalendářní den (listování po dnech)
   Funkce výše počítají klouzavé okno od `now`; tyhle pracují s pevným dnem
   00:00–24:00, takže se dá listovat do minulosti.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * PROVOZNÍ DEN operačních sálů začíná v 7:00 a končí v 6:59 následujícího dne.
 * Noční výkony, které přesáhnou půlnoc, tak patří do dne, kdy začaly.
 */
export const OPERATIONAL_DAY_START_HOUR = 7;

/** Hranice provozního dne (07:00 zvoleného dne → 07:00 dne následujícího). */
export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(OPERATIONAL_DAY_START_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Aktuálně běžící provozní den (před 7:00 ráno je to ještě včerejšek). */
export function operationalToday(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < OPERATIONAL_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Timestamp → datum provozního dne, do kterého spadá (klíč `YYYY-MM-DD`). */
export function operationalDayKey(ts: Date): string {
  const d = new Date(ts);
  if (d.getHours() < OPERATIONAL_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Index dne v týdnu 0=Po … 6=Ne. */
export function weekdayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

/** Provozní minuty sálu pro daný den (dle rozvrhu). */
export function getRoomWorkingMinutesForDate(room: OperatingRoom, date: Date): number {
  return getRoomWorkingMinutes(room, weekdayIndex(date));
}

/**
 * Aktivní (obsazené) minuty sálu v PROVOZNÍM DNI 7:00–7:00.
 *
 * Počítá se celý odoperovaný čas v okně dne — tedy i výkony, které přesáhly
 * plánovanou provozní dobu nebo běžely přes půlnoc. Přesahy se tak neztratí;
 * kapacita zůstává plánovaná, takže poměr aktivní/kapacita přesah odhalí.
 */
export function calculateActiveMinutesForDay(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): number {
  if (!room) return 0;
  const { start: dayStart, end: dayEnd } = dayBounds(date);

  const intervals = buildDayOperationIntervals(room, history || [], date);
  let total = 0;
  for (const iv of intervals) {
    const s = Math.max(iv.startMs, dayStart.getTime());
    const e = Math.min(iv.endMs, dayEnd.getTime());
    if (e > s) total += (e - s) / 60000;
  }
  return total;
}

/**
 * Intervaly výkonů sálu z reálné historie, korektně uzavřené.
 *
 * Interval vzniká z explicitních událostí cyklu nebo doloženého archivu výkonů.
 * Do „teď" zůstane otevřený pouze výkon potvrzený aktuálním autoritativním
 * `operationStartedAt` sálu. Samostatné `step_change` události nejsou důkazem
 * výkonu a do využití se nezapočítávají.
 */
export function buildDayOperationIntervals(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): { startMs: number; endMs: number }[] {
  const { start, end } = dayBounds(date);
  const measuredEnd = new Date(Math.min(Date.now(), end.getTime()));
  // A still-running cycle can overlap a previous operational day. Clip its
  // authoritative interval to that day instead of discarding its past hours.
  return mergeOperationIntervals(buildRoomOperationIntervals(room, history || [], measuredEnd), start, measuredEnd)
    .map(interval => ({ startMs: interval.start.getTime(), endMs: interval.end.getTime() }));
}

/** Počet zahájených výkonů v provozním dni (včetně mimo plánovanou dobu). */
export function countOperationsForDay(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): number {
  if (!room) return 0;
  const { start, end } = dayBounds(date);

  return getRecordedOperationStarts(room, history || []).filter(date => {
    const t = date.getTime();
    return Number.isFinite(t) && t >= start.getTime() && t < end.getTime();
  }).length;
}

/** Vytížení sálu (%) pouze uvnitř nastavené pracovní doby provozního dne. */
export function calculateRoomUtilizationForDay(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): number {
  const { start, end } = dayBounds(date);
  const capacity = getRoomWorkingMinutesInWindow(room, start, end);
  if (capacity === 0) return 0;
  const active = calculateActiveMinutesInWorkingWindow(room, history, start, end, false);
  return Math.min(100, Math.max(0, Math.round((active / capacity) * 100)));
}

/**
 * Skutečně odpauzovaný čas sálu v provozním dni (minuty).
 * Páruje událost `pause` s následujícím `resume`; běžící pauzu uzavře „teď",
 * resp. koncem provozního dne. Vše výhradně z reálné historie v databázi.
 */
export function calculatePausedMinutesForDay(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): number {
  if (!room || !history || history.length === 0) return 0;
  const now = Date.now();
  const { start, end } = dayBounds(date);

  const events = history
    .filter(e => e.operating_room_id === room.id
      && (e.event_type === 'pause' || e.event_type === 'resume')
      && e.timestamp)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let total = 0;
  let openPause: number | null = null;

  for (const e of events) {
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    if (e.event_type === 'pause') {
      if (openPause === null) openPause = t;
    } else if (openPause !== null) {
      const s = Math.max(openPause, start.getTime());
      const x = Math.min(t, end.getTime());
      if (x > s) total += (x - s) / 60000;
      openPause = null;
    }
  }

  if (openPause !== null) {
    const s = Math.max(openPause, start.getTime());
    const x = Math.min(now, end.getTime());
    if (x > s) total += (x - s) / 60000;
  } else if (room.isPaused && room.pausedAt && events.length === 0) {
    // Fallback: pauza běží, ale událost není v načteném okně historie
    const p = new Date(room.pausedAt).getTime();
    if (Number.isFinite(p)) {
      const s = Math.max(p, start.getTime());
      const x = Math.min(now, end.getTime());
      if (x > s) total += (x - s) / 60000;
    }
  }

  return Math.round(total);
}

/** Minuty odoperované nad rámec plánované kapacity dne (přesah). */
export function calculateOvertimeMinutesForDay(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  date: Date,
): number {
  const capacity = getRoomWorkingMinutesForDate(room, date);
  const active = calculateActiveMinutesForDay(room, history, date);
  return Math.max(0, Math.round(active - capacity));
}

/**
 * „Sál připraven" a podobné klidové stavy nejsou fází operačního cyklu —
 * ve statistikách fází se nezobrazují (diakritika i velikost písmen se ignoruje).
 */
export function isIdleStatusName(name: string): boolean {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n.includes('priprav') && n.includes('sal');
}

/** Minuty → „6h 7m" / „48m" pro popisky pod prstenci. */
export function fmtDurationMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** „Dnes" / „Včera" / „po 14. 7." — popisek zvoleného dne. */
export function formatDayLabel(date: Date): string {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Dnes';
  if (diff === 1) return 'Včera';
  return date.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

// ── Helper: Get formatted working hours string for a room ─────────���──────����─────
export function formatRoomWorkingHours(room: OperatingRoom, dayIndex: number): string {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 'Zavřeno';
  
  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  
  return `${formatTime(hours.startHour, hours.startMinute)}–${formatTime(hours.endHour, hours.endMinute)}`;
}

// ── Helper fns ────────────────────────────────────────────────────────────────
// Determine if room is busy based on currentStepIndex (0 or 7 = ready/free, anything else = busy)
export function isRoomBusyByStep(r: OperatingRoom): boolean {
  return r.currentStepIndex !== 0 && r.currentStepIndex !== 7;
}

// Calculate working minutes for today based on room's schedule
export function dayMinutes(r:OperatingRoom){ 
  // Get today's day index (Monday=0)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return getRoomWorkingMinutes(r, todayIndex);
}

export type Seg={color:string;title:string;pct:number;min:number};

export type WorkflowStep={name:string;title:string;color:string;organizer:string;status:string};

// Build a phase distribution exclusively from measured durations.
export function buildTimeline(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
  const durs=workflowSteps.map((_,i)=>Math.max(0, stepDurations?.[i] ?? 0));
  const total=durs.reduce((sum,duration)=>sum+duration,0);
  if (total <= 0) return [];
  return workflowSteps.flatMap((step,index) => {
    const duration = durs[index];
    return duration > 0
      ? [{ color: step.color, title: step.title, pct: (duration / total) * 100, min: duration }]
      : [];
  });
}

// Build distribution using actual step durations from real data
export function buildDist(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
  // Use provided step durations from real data
  const durs=workflowSteps.map((_,i)=> stepDurations?.[i] || 0);
  const tot=durs.reduce((s,d)=>s+d,0) || 1;
  return workflowSteps.map((step,i)=>({color:step.color,title:step.title,pct:tot > 0 ? Math.round((durs[i]/tot)*100) : 0,min:durs[i]}));
}

export function mergeSeg(segs:Seg[]):Seg[]{
  const out:Seg[]=[];
  for(const s of segs){
    const l=out[out.length-1];
    if(l&&l.title===s.title){l.pct+=s.pct;l.min+=s.min;}
    else out.push({...s});
  }
  return out;
}
