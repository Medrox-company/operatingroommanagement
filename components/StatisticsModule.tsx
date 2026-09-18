import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp, TrendingDown, Activity,
  AlertTriangle, Shield, Clock, Layers, X, BarChart3,
  Printer, FileDown, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import { OperatingRoom, RoomStatus, DayWorkingHours } from '../types';
// Step durations now calculated from real database history
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { useIsMobileDark } from '../hooks/useIsMobileDark';
import {
  buildCompletedOperationsFromEvents,
  fetchStatusHistory,
  type StatusHistoryRow,
} from '../lib/db';
import { aggregateRoomStatistics, useStatisticsData } from '../hooks/useStatisticsData';
import { scopeStatisticsRooms, statisticsDayWindow, statisticsPeriodWindow, STATISTICS_ROOM_SCOPE_NOTE } from '../lib/statistics-room-scope';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  MobileCard,
  MobileHeaderMetrics,
  MobileModuleHeader,
  MobilePillTabs,
  MobileSectionLabel,
} from './mobile/MobileShell';
// Čitelné grafy v jazyce aplikace (náhrada nečitelných recharts vizualizací)
import { BarList, ColumnChart, SegmentBar, ScatterGrid, GaugeRing, RingRow, InsightPanel, StatSectionLabel, DayNavigator, OrbitRings, GlassCalendar, PhasePanel } from './statistics/AppCharts';
import type { InsightItem, OrbitItem } from './statistics/AppCharts';
import ModulePageHeading from './ModulePageHeading';
import { StatisticsNavigation, type StatisticsTab } from './statistics/StatisticsNavigation';
import { StatisticsReportContext } from './statistics/StatisticsReportContext';
import { openStatisticsPrintReport, type StatisticsReport } from '../lib/statistics-print';
import { useHospital } from '../contexts/HospitalContext';
import './mobile/mobile-statistics.css';
const FinanceTab = dynamic(() => import('./statistics/FinanceTab').then((module) => module.FinanceTab), { ssr: false });
const RoomsTab = dynamic(() => import('./statistics/RoomsTab').then((module) => module.RoomsTab), { ssr: false });
const PhasesTab = dynamic(() => import('./statistics/PhasesTab').then((module) => module.PhasesTab), { ssr: false });
const NotificationsTab = dynamic(() => import('./statistics/NotificationsTab').then((module) => module.NotificationsTab), { ssr: false });
const DevicesTab = dynamic(() => import('./statistics/DevicesTab').then((module) => module.DevicesTab), { ssr: false });

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }
const EMPTY_ROOMS: OperatingRoom[] = [];

type Period = 'den' | 'týden' | 'měsíc' | 'rok';
type Tab = StatisticsTab;

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  accent:  '#06B6D4',
  green:   '#10B981',
  orange:  '#F97316',
  yellow:  '#FBBF24',
  red:     '#EF4444',
  border:  'var(--stats-border)',
  borderHover: 'var(--stats-border-hover)',
  surface: 'var(--stats-surface)',
  surfaceActive: 'var(--stats-surface-active)',
  muted:   'var(--stats-muted)',
  faint:   'var(--stats-faint)',
  ghost:   'var(--stats-ghost)',
  text:    'var(--stats-text)',
};


const DEPT_COLORS: Record<string,string> = {
  TRA:'#06B6D4', CHIR:'#F97316', ROBOT:'#A78BFA',
  URO:'#EC4899', ORL:'#3B82F6', CÉVNÍ:'#14B8A6',
  'HPB + PLICNÍ':'#FBBF24', DĚTSKÉ:'#10B981', MAMMO:'#818CF8',
};

const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// ── Helper: Get working hours for a specific day from room schedule ────────────
function getRoomWorkingHours(room: OperatingRoom, dayIndex: number): DayWorkingHours {
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
function getDayBreakMinutes(hours: DayWorkingHours): number {
  const raw = hours.breakMinutes;
  if (typeof raw !== 'number' || isNaN(raw) || raw < 0) return 0;
  return Math.min(raw, Number.MAX_SAFE_INTEGER);
}

// ── Helper: Calculate net working minutes (gross - break) for a room on a day ──
function getRoomWorkingMinutes(room: OperatingRoom, dayIndex: number): number {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 0;
  const startMins = hours.startHour * 60 + hours.startMinute;
  const endMins = hours.endHour * 60 + hours.endMinute;
  const gross = Math.max(0, endMins - startMins);
  const breakMins = Math.min(getDayBreakMinutes(hours), gross);
  return Math.max(0, gross - breakMins);
}

// ── Helper: Check if a timestamp falls within room's working hours ─────────────
function isWithinWorkingHours(room: OperatingRoom, timestamp: string): boolean {
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
function calculateAvgStepDurations(
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
function calculateWorkflowDistribution(
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
function calculateRoomWorkflowDistribution(
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
function getRoomTotalWorkingMinutes(room: OperatingRoom, period: Period): number {
  const now = new Date();
  if (period === 'den') {
    const { start, end } = dayBounds(operationalToday(now));
    return getRoomWorkingMinutesInWindow(room, start, end);
  }
  return getRoomWorkingMinutesInWindow(room, getPeriodStart(period, now), now);
}

// ── Helper: Count operations within working hours for a room from history ──────
function countOperationsInWorkingHours(
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
function getPeriodStart(period: Period, now: Date = new Date()): Date {
  switch (period) {
    case 'den':    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'týden':  return new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
    case 'měsíc':  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'rok':    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

/** Explicit archived timestamps (or a measured completed-cycle duration), never inferred capacity. */
function isSameOperationStart(left: number, right: number): boolean {
  // The database lifecycle event is intentionally phase_started_at + 1 ms,
  // whereas the room snapshot keeps phase_started_at itself. Older imports
  // may also round to seconds; those records still describe the same cycle.
  return Math.abs(left - right) <= 2_000;
}

function getArchivedOperationIntervals(
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
function getRecordedOperationStarts(room: OperatingRoom, history: StatusHistoryRow[]): Date[] {
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
function buildRoomOperationIntervals(
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
function mergeOperationIntervals(
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
function workingMinutesFromIntervals(
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

function getRoomWorkingMinutesInWindow(room: OperatingRoom, start: Date, end: Date): number {
  return workingMinutesFromIntervals(room, [{ start, end }]);
}

function calculateActiveMinutesInWorkingWindow(
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
function calculateActiveTimeInWorkingHours(
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
function calculateRoomUtilization(
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
const OPERATIONAL_DAY_START_HOUR = 7;

/** Hranice provozního dne (07:00 zvoleného dne → 07:00 dne následujícího). */
function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(OPERATIONAL_DAY_START_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Aktuálně běžící provozní den (před 7:00 ráno je to ještě včerejšek). */
function operationalToday(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < OPERATIONAL_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Timestamp → datum provozního dne, do kterého spadá (klíč `YYYY-MM-DD`). */
function operationalDayKey(ts: Date): string {
  const d = new Date(ts);
  if (d.getHours() < OPERATIONAL_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Index dne v týdnu 0=Po … 6=Ne. */
function weekdayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

/** Provozní minuty sálu pro daný den (dle rozvrhu). */
function getRoomWorkingMinutesForDate(room: OperatingRoom, date: Date): number {
  return getRoomWorkingMinutes(room, weekdayIndex(date));
}

/**
 * Aktivní (obsazené) minuty sálu v PROVOZNÍM DNI 7:00–7:00.
 *
 * Počítá se celý odoperovaný čas v okně dne — tedy i výkony, které přesáhly
 * plánovanou provozní dobu nebo běžely přes půlnoc. Přesahy se tak neztratí;
 * kapacita zůstává plánovaná, takže poměr aktivní/kapacita přesah odhalí.
 */
function calculateActiveMinutesForDay(
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
function buildDayOperationIntervals(
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
function countOperationsForDay(
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
function calculateRoomUtilizationForDay(
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
function calculatePausedMinutesForDay(
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
function calculateOvertimeMinutesForDay(
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
function isIdleStatusName(name: string): boolean {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n.includes('priprav') && n.includes('sal');
}

/** Minuty → „6h 7m" / „48m" pro popisky pod prstenci. */
function fmtDurationMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** „Dnes" / „Včera" / „po 14. 7." — popisek zvoleného dne. */
function formatDayLabel(date: Date): string {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Dnes';
  if (diff === 1) return 'Včera';
  return date.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

// ── Helper: Get formatted working hours string for a room ─────────���──────����─────
function formatRoomWorkingHours(room: OperatingRoom, dayIndex: number): string {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 'Zavřeno';
  
  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  
  return `${formatTime(hours.startHour, hours.startMinute)}–${formatTime(hours.endHour, hours.endMinute)}`;
}

// ── Tooltip shared style ─────────�����─��������──────────────────────────────────────────
const TIP = {
  contentStyle:{
    background:'rgba(2,8,23,0.97)',
    border:`1px solid ${C.border}`,
    borderRadius:10,
    fontSize:12,
    fontFamily:'var(--font-sans)',
    boxShadow:'0 16px 36px rgba(0,0,0,0.28)',
  },
  labelStyle:  { color:C.muted },
  itemStyle:   { color:C.accent },
};

// ── Helper fns ────────────────────────────────────────────────────────────────
// Determine if room is busy based on currentStepIndex (0 or 7 = ready/free, anything else = busy)
function isRoomBusyByStep(r: OperatingRoom): boolean {
  return r.currentStepIndex !== 0 && r.currentStepIndex !== 7;
}

// Get status color based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
function roomStatusColor(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return C.accent;
  if (r.status === RoomStatus.MAINTENANCE) return C.faint;
  return isRoomBusyByStep(r) ? C.orange : C.green;
}

// Get status label based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
function roomStatusLabel(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return 'Úklid';
  if (r.status === RoomStatus.MAINTENANCE) return 'Údržba';
  return isRoomBusyByStep(r) ? 'Obsazeno' : 'Volné';
}

// Legacy functions for backwards compatibility (some places still use RoomStatus enum directly)
function statusColor(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return C.orange;
  if(s===RoomStatus.FREE)     return C.green;
  if(s===RoomStatus.CLEANING) return C.accent;
  return C.faint;
}
function statusLabel(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return 'Obsazeno';
  if(s===RoomStatus.FREE)     return 'Volné';
  if(s===RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}
// Calculate working minutes for today based on room's schedule
function dayMinutes(r:OperatingRoom){ 
  // Get today's day index (Monday=0)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return getRoomWorkingMinutes(r, todayIndex);
}

type Seg={color:string;title:string;pct:number;min:number};
type WorkflowStep={name:string;title:string;color:string;organizer:string;status:string};

// Build a phase distribution exclusively from measured durations.
function buildTimeline(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
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
function buildDist(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
  // Use provided step durations from real data
  const durs=workflowSteps.map((_,i)=> stepDurations?.[i] || 0);
  const tot=durs.reduce((s,d)=>s+d,0) || 1;
  return workflowSteps.map((step,i)=>({color:step.color,title:step.title,pct:tot > 0 ? Math.round((durs[i]/tot)*100) : 0,min:durs[i]}));
}
function mergeSeg(segs:Seg[]):Seg[]{
  const out:Seg[]=[];
  for(const s of segs){
    const l=out[out.length-1];
    if(l&&l.title===s.title){l.pct+=s.pct;l.min+=s.min;}
    else out.push({...s});
  }
  return out;
}

// ── Room mini card (extracted so hooks are always called at component level) ──
interface RoomMiniCardProps { 
  r: OperatingRoom; 
  onClick: () => void; 
  workflowSteps: WorkflowStep[]; 
  stepDurations: number[];
  opsCount: number;
  utilization: number;
  /** Pokud true, vyrenderuje rozšířenou kartu s detail daty pro tisk/PDF */
  isPrinting?: boolean;
}
const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ r, onClick, workflowSteps, stepDurations, opsCount, utilization, isPrinting }) => {
  const sc2   = roomStatusColor(r);
  const isBusy = isRoomBusyByStep(r);
  const tl2   = useMemo(() => mergeSeg(buildTimeline(r, workflowSteps, stepDurations)), [r, workflowSteps, stepDurations]);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const workingHoursStr = formatRoomWorkingHours(r, todayIndex);
  const workingMinutes = getRoomWorkingMinutes(r, todayIndex);
  // Aktuální fáze workflow + její barva (pro Detail v tisku)
  const currentPhase = workflowSteps[r.currentStepIndex];
  const phaseLabel = currentPhase?.title ?? '—';
  const phaseColor = currentPhase?.color ?? sc2;
  // Doktor/sestra/anesteziolog jména pro print detail
  const doctorName = r.staff?.doctor?.name ?? '—';
  const nurseName  = r.staff?.nurse?.name  ?? '—';
  const anesthName = r.staff?.anesthesiologist?.name ?? '—';
  // Časy
  const fmtTime = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—';
  
  return (
    <button onClick={onClick}
      className="text-left rounded-lg p-3 w-full group"
      style={{
        background: isBusy ? `${sc2}08` : C.surface,
        border: `1px solid ${isBusy ? `${sc2}30` : C.border}`,
      }}>
      <div className="flex items-center justify-between mb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc2, boxShadow: `0 0 5px ${sc2}` }} />
          {/* Název sálu na JEDNOM řádku — `whitespace-nowrap` + `overflow-hidden`
              + `text-ellipsis`. Používáme adaptivní velikost fontu přes clamp,
              aby se i delší názvy ("Sál č. 1 - Traumatologie") vešly bez wrapu.
              Plný název je vždy dostupný v tooltipu. */}
          <span
            className="font-bold whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
            style={{ color: C.text, fontSize: 'clamp(9px, 0.78vw, 12px)' }}
            title={r.name}
          >
            {r.name}
          </span>
        </div>
      </div>
      <p className="text-[10px] mb-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: C.faint }} title={r.department}>{r.department}</p>
      {/* Working hours indicator */}
      <div className="flex items-center gap-1 mb-2">
        <Clock className="w-2.5 h-2.5" style={{ color: C.muted }} />
        <span className="text-[9px]" style={{ color: C.muted }}>
          {workingHoursStr} ({Math.round(workingMinutes / 60)}h)
        </span>
      </div>
      {/* Micro timeline */}
      <div className="flex h-1.5 w-full rounded overflow-hidden gap-px mb-2">
        {tl2.map((seg, si) => (
          <div key={si} className="h-full shrink-0" style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.85 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Ops (prac.)</p>
            <p className="text-sm font-bold leading-none" style={{ color: C.accent }}>{opsCount}</p>
          </div>
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Využití</p>
            <p className="text-sm font-bold leading-none" style={{ color: C.text }}>{utilization}%</p>
          </div>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: `${sc2}14`, color: sc2 }}>
          {roomStatusLabel(r).slice(0, 3)}
        </span>
      </div>

      {/* ── Print-only rozšířený detail sálu ────���──────────────────────����───
          Při tisku ukážeme všechna důležitá data jako v RoomDetail panelu:
          aktuální fáze, personál, časy pacienta, příznaky (UPS/septický/atd.). */}
      {isPrinting && (
        <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${C.border}` }}>
          {/* Aktuální fáze */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: phaseColor }} />
            <p className="text-[9px] uppercase font-bold tracking-wider" style={{ color: C.muted }}>Fáze:</p>
            <p className="text-[10px] font-bold flex-1" style={{ color: phaseColor }}>{phaseLabel}</p>
          </div>

          {/* Personál — 3 řádky kompaktně */}
          <div className="grid grid-cols-1 gap-0.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Lékař:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{doctorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Sestra:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{nurseName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Anest.:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{anesthName}</span>
            </div>
          </div>

          {/* Časy pacienta */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-1.5">
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Volán:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.patientCalledAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Přijel:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.patientArrivedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Start:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.operationStartedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Konec:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.estimatedEndTime)}</span>
            </div>
          </div>

          {/* Indikátory & příznaky */}
          <div className="flex flex-wrap gap-1">
            {r.queueCount > 0 && (
              <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.accent}15`, color: C.accent }}>
                Fronta: {r.queueCount}
              </span>
            )}
            <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.text}10`, color: C.text }}>
              24h: {r.operations24h}
            </span>
            {r.isSeptic && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.red}20`, color: C.red }}>SEPTICKÝ</span>}
            {r.isEmergency && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.red}20`, color: C.red }}>POHOT.</span>}
            {r.isLocked && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.muted}20`, color: C.muted }}>UZAMČEN</span>}
            {r.isPaused && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.yellow}20`, color: C.yellow }}>PAUZA</span>}
            {r.isEnhancedHygiene && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.accent}20`, color: C.accent }}>HYG+</span>}
          </div>
        </div>
      )}
    </button>
  );
});

// ── Card primitive ────────────────────────────────────────────────────────────
function Card({children,className='',style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}){
  return(
    <div className={`statistics-card rounded-xl ${className}`} style={{background:C.surface,border:`1px solid ${C.border}`,...style}}>
      {children}
    </div>
  );
}
function SectionLabel({children}:{children:React.ReactNode}){
  return <p className="statistics-section-label text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{color:C.muted}}>{children}</p>;
}
function EmptyState({title,desc}:{title:string;desc:string}){
  return (
    <div className="h-40 flex flex-col items-center justify-center text-center px-4">
      <p className="text-sm font-semibold" style={{color:C.text}}>{title}</p>
      <p className="text-xs mt-1" style={{color:C.muted}}>{desc}</p>
    </div>
  );
}
function TrendBadge({v}:{v:number}){
  if(v>0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.green}18`,color:C.green}}>
      <TrendingUp className="w-3 h-3"/>+{v}%
    </span>
  );
  if(v<0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.red}18`,color:C.red}}>
      <TrendingDown className="w-3 h-3"/>{v}%
    </span>
  );
  return <span className="text-[10px]" style={{color:C.ghost}}>—</span>;
}

// ══════������═══════════════════════════════════════�����══════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════�������═���════════════════════
interface RoomPanelProps{ room:OperatingRoom; onClose:()=>void; workflowSteps:WorkflowStep[]; }

const RoomDetailPanel:React.FC<RoomPanelProps> = ({room,onClose,workflowSteps})=>{
  const sc     = roomStatusColor(room);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayWorkingHours = getRoomWorkingHours(room, todayIndex);
  const todayWorkingHoursLabel = formatRoomWorkingHours(room, todayIndex);

  // State must be declared first - before any useMemo that depends on it
  const [roomHistory, setRoomHistory] = useState<StatusHistoryRow[]>([]);
  
  // Load room-specific history
  useEffect(() => {
    const loadRoomHistory = async () => {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const history = await fetchStatusHistory({ 
        roomId: room.id, 
        fromDate, 
        toDate: new Date(),
        limit: 1000 
      });
      if (history) setRoomHistory(history);
    };
    loadRoomHistory();
  }, [room.id]);

  // Calculate room-specific step durations from history
  const roomStepDurationsForCalc = useMemo(() => {
    return calculateAvgStepDurations(roomHistory, workflowSteps);
  }, [roomHistory, workflowSteps]);
  
  const tl     = useMemo(()=>mergeSeg(buildTimeline(room,workflowSteps, roomStepDurationsForCalc)),[room,workflowSteps, roomStepDurationsForCalc]);
  const dist   = useMemo(()=>buildDist(room,workflowSteps, roomStepDurationsForCalc),[room,workflowSteps, roomStepDurationsForCalc]);
  const opsDay = room.operations24h;
  const utilPct= dist.find(d=>d.title==='Chirurgický výkon')?.pct??0;

  // Day utilisation curve from real data using room's weekly schedule
  const dayCurve=useMemo(()=>{
    // Get today's day index (Monday=0)
    if (!todayWorkingHours.enabled) return [];
    const start = todayWorkingHours.startHour;
    const end = todayWorkingHours.endHour + (todayWorkingHours.endMinute > 0 ? 1 : 0);
    
    const hourCounts: Record<number, number> = {};
    for (let h = start; h < end; h++) hourCounts[h] = 0;
    
    roomHistory.filter(e => e.event_type === 'step_change' || e.event_type === 'operation_start')
      .forEach(e => {
        const hour = new Date(e.timestamp).getHours();
        if (hour >= start && hour < end) {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
    
    return Array.from({length:end-start},(_,i)=>({
      t:`${start+i}`,
      v: hourCounts[start+i],
    }));
  },[roomHistory,todayWorkingHours]);

  // Weekly stacked data from real data, respecting room's schedule
  const weeklyStacked=useMemo(()=>DAYS.map((day,di)=>{
    const base:Record<string,number|string>={day};
    const dayHours = getRoomWorkingHours(room, di);
    
    // If room doesn't operate this day, return zeros
    if (!dayHours.enabled) {
      workflowSteps.forEach((step) => {
        base[step.title] = 0;
      });
      return base;
    }
    
    // Count events for this day of week
    const dayEvents = roomHistory.filter(e => {
      const eventDay = new Date(e.timestamp).getDay();
      const adjustedDay = eventDay === 0 ? 6 : eventDay - 1;
      return adjustedDay === di && e.event_type === 'step_change';
    });
    
    workflowSteps.forEach((step) => {
      const stepEvents = dayEvents.filter(e => e.step_name === step.title);
      const totalDuration = stepEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      base[step.title] = Math.round(totalDuration / 60); // Convert to minutes
    });
    return base;
  }),[roomHistory,workflowSteps,room]);

  // Hourly event counts from recorded history
  const hourlyEvents=useMemo(()=>dayCurve.map(d=>({
    t:d.t,
    events:d.v,
  })),[dayCurve]);

  // Phase bar - using room step durations calculated earlier
  const phaseBar=useMemo(()=>workflowSteps.map((step,i)=>({
    name:step.title.split(' ').slice(-1)[0],
    pct:dist.find(d=>d.title===step.title)?.pct??0,
    min:roomStepDurationsForCalc[i] || 0,
    color:step.color,
  })),[dist,roomStepDurationsForCalc,workflowSteps]);

  // Pie from dist
  const pieData=dist.filter(d=>d.min>0);

  // 30-day cumulative from real data
  const cumulData=useMemo(()=>{
    const last30Days: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      last30Days[date.toISOString().split('T')[0]] = 0;
    }
    
    buildCompletedOperationsFromEvents(roomHistory).forEach(operation => {
      const day = operation.startedAt.split('T')[0];
      if (last30Days[day] !== undefined) {
        last30Days[day] = (last30Days[day] || 0) + 1;
      }
    });
    
    let cum = 0;
    return Object.entries(last30Days).map(([_, daily], i) => {
      cum += daily;
      return { d: `${i + 1}`, daily, cum };
    });
  },[roomHistory]);

  // Utilisation per status (time-based %)
  const cleanupDistribution = dist.find((entry) => (
    entry.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('uklid')
  ));
  const statusUtil=[
    {label:'Výkon',      pct:utilPct,                         color:workflowSteps[3]?.color || '#FCA5A5'},
    {label:'Anestezie',  pct:(dist.find(d=>d.title==='Začátek anestezie')?.pct??0)+(dist.find(d=>d.title==='Ukončení anestezie')?.pct??0), color:workflowSteps[2]?.color || '#C4B5FD'},
    {label:'Příprava',   pct:(dist.find(d=>d.title==='Příjezd na sál')?.pct??0)+(dist.find(d=>d.title==='Ukončení výkonu')?.pct??0),       color:workflowSteps[1]?.color || '#5EEAD4'},
    {label:'Úklid',      pct:cleanupDistribution?.pct??0,                                                                                  color:cleanupDistribution?.color || '#F97316'},
    {label:'Volno',      pct:dist.find(d=>d.title==='Sál připraven')?.pct??0,                                                               color:workflowSteps[0]?.color || '#34D399'},
  ];

  return(
    <div className="statistics-module statistics-settings fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.7)'}}>
      <button
        type="button"
        aria-label="Zavřít detail operačního sálu"
        className="absolute inset-0 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/45"
        onClick={onClose}
      />
      <div className="relative z-10 h-full w-full max-w-3xl overflow-y-auto hide-scrollbar"
        style={{background:'var(--stats-modal-bg)',borderLeft:`1px solid ${C.border}`}}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{background:'var(--stats-modal-bg)',borderBottom:`1px solid ${C.border}`}}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:sc}}/>
            <div>
              <p className="text-base font-bold" style={{color:C.text}}>{room.name}</p>
              <p className="text-xs mt-0.5" style={{color:C.muted}}>
                {room.department}
                {room.isSeptic&&<span className="ml-2 font-bold" style={{color:C.red}}>· SEPTICKÝ</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Zavřít detail sálu" className="p-2 rounded-lg transition-colors"
            style={{background:C.ghost,color:C.muted}}>
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-7 space-y-7">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {l:'Výkony / den',v:opsDay,       c:C.accent},
              {l:'Využití výkonem',v:`${utilPct}%`, c:C.text},
              {l:'Provoz',v:todayWorkingHoursLabel, c:C.muted},
              {l:'Fronta',v:room.queueCount,    c:room.queueCount>0?C.yellow:C.muted},
            ].map(k=>(
              <Card key={k.l} className="p-4 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color:C.muted}}>{k.l}</p>
                <p className="text-2xl font-bold leading-none" style={{color:k.c}}>{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Timeline bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Rozložení naměřených fází — {todayWorkingHoursLabel}</SectionLabel>
            </div>
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-px">
              {tl.map((seg,i)=>(
                <div key={i} className="h-full relative"
                  style={{background:seg.color,opacity:0.88,width:`${seg.pct}%`}}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct>=9&&(
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black/60 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3">
              {tl.filter(s=>s.pct>1).map((seg,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{background:seg.color}}/>
                  <div>
                    <p className="text-[10px] leading-tight" style={{color:C.muted}}>{seg.title}</p>
                    <p className="text-xs font-bold leading-tight" style={{color:seg.color}}>
                      {Math.round(seg.pct)}%
                      <span className="font-normal ml-1" style={{color:C.faint}}>{seg.min} min</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Day curve + Status distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Zaznamenané události v průběhu dne</SectionLabel>
              <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
                <AreaChart data={dayCurve} margin={{top:4,right:0,bottom:0,left:-24}}>
                  <defs>
                    <linearGradient id={`rg${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc} stopOpacity={0.28}/>
                      <stop offset="95%" stopColor={sc} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} domain={[0,100]}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v}%`,'Využití']}/>
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg${room.id})`} strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Procentuální využití statusů</SectionLabel>
              <div className="space-y-3">
                {statusUtil.map((s,i)=>(
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-[2px] shrink-0" style={{background:s.color}}/>
                        <span className="text-xs" style={{color:C.muted}}>{s.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{color:s.color}}>{s.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                      <div className="h-full rounded-full" style={{background:s.color,opacity:0.85,width:`${s.pct}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row: Hourly stacked + Weekly stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Počet zaznamenaných událostí za hodinu</SectionLabel>
              <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                <BarChart data={hourlyEvents} margin={{top:4,right:0,bottom:0,left:-24}} barSize={12}>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP}/>
                  <Bar dataKey="events" fill={sc} opacity={0.78} radius={[2,2,0,0]} name="Události"/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Týdenní workflow fáze — min/den</SectionLabel>
              <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                <BarChart data={weeklyStacked} margin={{top:4,right:0,bottom:0,left:-24}} barSize={16}>
                  <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10}  tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP}/>
                  {workflowSteps.map(step=>(
                    <Bar key={step.title} dataKey={step.title} stackId="w" fill={step.color} opacity={0.8}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {workflowSteps.map(s=>(
                  <div key={s.title} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-[2px]" style={{background:s.color}}/>
                    <span className="text-[9px]" style={{color:C.faint}}>{s.title.split(' ').slice(-1)[0]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row: measured phase duration + cycle structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Délka fází ��� minuty</SectionLabel>
              <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                <BarChart data={phaseBar} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}} barSize={8}>
                  <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} width={52}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v} min`,'Trvání']}/>
                  <Bar dataKey="min" radius={[0,2,2,0]}>
                    {phaseBar.map((e,i)=><Cell key={i} fill={e.color} opacity={0.82}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Struktura cyklu (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pieData} dataKey="pct" nameKey="title" cx="50%" cy="50%"
                    innerRadius={34} outerRadius={56} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((_,i)=><Cell key={i} fill={pieData[i].color} opacity={0.85}/>)}
                  </Pie>
                  <Tooltip contentStyle={TIP.contentStyle} formatter={(v:number,name:string)=>[`${v}%`,name]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {pieData.map((d,i)=>(
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{background:d.color}}/>
                    <span className="text-[10px]" style={{color:C.faint}}>{d.title.split(' ').slice(-1)[0]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Cumulative 30-day */}
          <Card className="p-5">
            <SectionLabel>Kumulativní počet výkonů — 30 dní</SectionLabel>
            <ResponsiveContainer width="100%" height={120} minWidth={0} minHeight={0}>
              <ComposedChart data={cumulData} margin={{top:4,right:4,bottom:0,left:-16}}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                <XAxis dataKey="d" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}
                  ticks={['1','5','10','15','20','25','30']}/>
                <YAxis yAxisId="l" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="r" orientation="right" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip {...TIP}/>
                <Bar yAxisId="l" dataKey="daily" fill={sc} opacity={0.35} radius={[1,1,0,0]} name="Denní výkony"/>
                <Line yAxisId="r" type="monotone" dataKey="cum" stroke={C.green} strokeWidth={2} dot={false} name="Kumulativní"/>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-2">
              {[{c:sc,l:'Denní výkony'},{c:C.green,l:'Kumulativní součet'}].map(x=>(
                <div key={x.l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px]" style={{background:x.c}}/>
                  <span className="text-[10px]" style={{color:C.muted}}>{x.l}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Workflow step badges */}
          <div>
            <SectionLabel>Aktuální fáze workflow</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {workflowSteps.map((step,i)=>{
                const cur=i===room.currentStepIndex;
                const done=i<room.currentStepIndex;
                return(
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background:cur?`${step.color}20`:done?'rgba(255,255,255,0.04)':'transparent',
                        color:cur?step.color:done?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.18)',
                        border:`1px solid ${cur?step.color:'rgba(255,255,255,0.07)'}`,
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{background:step.color,opacity:cur?1:0.3}}/>
                      {step.title}
                    </div>
                    {i<workflowSteps.length-1&&(
                      <div className="w-2 h-px" style={{background:'rgba(255,255,255,0.08)'}}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const isMobileDark = useIsMobileDark();
  const { activeHospital } = useHospital();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Map to WORKFLOW_STEPS format
  const WORKFLOW_STEPS = useMemo(() => 
    workflowStatuses.map(s => ({
      name: s.name,
      title: s.title || s.name,
      color: s.accent_color || s.color,
      organizer: s.name,
      status: s.is_active ? 'Active' : 'Inactive',
    })),
    [workflowStatuses]
  );
  
  const allRooms = propRooms ?? EMPTY_ROOMS;
  const [period, setPeriod] = useState<Period>('den');
  const [tab,    setTab]    = useState<Tab>('prehled');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom|null>(null);
  const { statusHistory: allStatusHistory, dayHistory: allDayHistory, notifications, devices, isReportLoading: isStatisticsLoading, reportSourceErrors, dayHistoryCoverageStart } = useStatisticsData(period);
  const periodScope = useMemo(() => scopeStatisticsRooms(allRooms, allStatusHistory, statisticsPeriodWindow(period)), [allRooms, allStatusHistory, period]);
  const rooms = periodScope.rooms;
  const statusHistory = periodScope.history;
  const dbStats = useMemo(() => aggregateRoomStatistics(statusHistory), [statusHistory]);
  // A failure in a module the user is not printing must not block an otherwise
  // complete report (e.g. a missing Devices permission must not block Rates).
  const reportSources: Record<Tab, Array<keyof typeof reportSourceErrors>> = {
    prehled: ['statusHistory', 'dayHistory'],
    finance: ['statusHistory', 'dayHistory', 'notifications'],
    sazby: [],
    saly: ['statusHistory', 'dayHistory'],
    faze: ['statusHistory'],
    notifikace: ['notifications', 'statusHistory'],
    zarizeni: ['devices'],
  };
  const statisticsError = reportSources[tab].map(source => reportSourceErrors[source]).find(Boolean);

  /* ── Provozní metriky sálů po dnech ────────────────────────────────────────
     Sekce „Jednotlivé sály" umí listovat po dnech dozadu, proto potřebuje
     vlastní 30denní historii (hlavní `statusHistory` sleduje jen zvolené
     období, u „den" tedy pouhých 24 h). */
  // Výchozí den = aktuálně běžící PROVOZNÍ den (před 7:00 ještě včerejšek)
  const [metricsDay, setMetricsDay] = useState<Date>(() => operationalToday());
  const dayScope = useMemo(() => scopeStatisticsRooms(allRooms, allDayHistory, statisticsDayWindow(metricsDay)), [allRooms, allDayHistory, metricsDay]);
  const dayRooms = dayScope.rooms;
  const dayHistory = dayScope.history;
  /** Režim hero panelu: primárně orbitální rozpad po sálech, souhrn dne na klik */
  const [heroMode, setHeroMode] = useState<'summary' | 'orbit'>('orbit');
  // Each mounted tab publishes its own already-filtered data. A report is a
  // frozen snapshot, independent of the app's dark, scroll-clipped DOM.
  const reportData = useRef<Partial<Record<Tab, StatisticsReport | null>>>({});
  const [printError, setPrintError] = useState<string | null>(null);
  const registerReport = useCallback((reportTab: Tab, report: StatisticsReport | null) => {
    reportData.current[reportTab] = report;
    return () => {
      if (reportData.current[reportTab] === report) delete reportData.current[reportTab];
    };
  }, []);

  // Lokalizovaný popis aktuálního období pro print-only hlavičku reportu
  const periodLabelMap: Record<Period, string> = {
    'den':   'Posledních 24 hodin',
    'týden': 'Posledních 7 dní',
    'měsíc': 'Posledních 30 dní',
    'rok':   'Posledních 365 dní',
  };
  const tabLabelMap: Record<Tab, string> = {
'prehled':    'Přehled',
'finance':    'Finance',
'sazby':      'Sazby',
'saly':       'Sály',
'faze':       'Fáze',
'notifikace': 'Notifikace',
'zarizeni':   'Zařízení',
  };

  // Per-room utilization calculated from measured operation intervals and configured schedules.
  const utilData = useMemo(() => {
    return rooms.map(room => ({
      t: room.name.replace('Sál č. ', 'S'),
      // Plný název pro čitelné žebříčky (zkratka `t` zůstává pro kompaktní osy)
      full: room.name,
      v: calculateRoomUtilization(room, statusHistory, period),
      hasCapacity: getRoomTotalWorkingMinutes(room, period) > 0,
      cap: 100,
    }));
  }, [statusHistory, period, rooms]);

  // Calculate average step durations from real history data
  const avgStepDurations = useMemo(() => {
    return calculateAvgStepDurations(statusHistory, WORKFLOW_STEPS);
  }, [statusHistory, WORKFLOW_STEPS]);

  // Calculate total operations within working hours across all rooms
  const totalOpsInWorkingHours = useMemo(() => {
    return rooms.reduce((sum, r) => sum + countOperationsInWorkingHours(r, statusHistory, period), 0);
  }, [rooms, statusHistory, period]);
  
  // Calculate average utilization based on working hours
  const avgUtilFromWorkingHours = useMemo(() => {
    const capacityRooms = rooms.filter(room => getRoomTotalWorkingMinutes(room, period) > 0);
    if (capacityRooms.length === 0) return 0;
    const totalUtil = capacityRooms.reduce((sum, r) => sum + calculateRoomUtilization(r, statusHistory, period), 0);
    return Math.round(totalUtil / capacityRooms.length);
  }, [rooms, statusHistory, period]);
  
  const avgUtil   = avgUtilFromWorkingHours;
  const hasPeriodCapacity = rooms.some(room => getRoomTotalWorkingMinutes(room, period) > 0);
  const utilValues = hasPeriodCapacity ? utilData.filter(d => d.hasCapacity).map(d => d.v) : [0];
  const peakUtil  = Math.max(...utilValues);
  const minUtil   = Math.min(...utilValues);
  const totalOps  = totalOpsInWorkingHours;
  // Determine busy/free based on currentStepIndex (0 or 7 = ready/free, anything else = busy)
  // This matches the logic in App.tsx header stats
  const isRoomBusy = (r: OperatingRoom) => r.currentStepIndex !== 0 && r.currentStepIndex !== 7;
  const busyCount = rooms.filter(isRoomBusy).length;
  const freeCount = rooms.filter(r => !isRoomBusy(r)).length;
  const cleanCount= rooms.filter(r=>r.status===RoomStatus.CLEANING).length;
  const maintCount= rooms.filter(r=>r.status===RoomStatus.MAINTENANCE).length;
  const totalQueue= rooms.reduce((s,r)=>s+r.queueCount,0);
  const septicCnt = rooms.filter(r=>r.isSeptic).length;
  const emergCnt  = dbStats?.emergencyCount ?? rooms.filter(r=>r.isEmergency).length;

  /* ── Hero panel pracuje s VYBRANÝM DNEM (listování kalendářem) ────────────
     Používá 30denní `dayHistory`, takže lze procházet i minulé dny. */
  const dayStats = useMemo(() => {
    if (dayRooms.length === 0) {
      return { avgUtil: 0, totalOps: 0, activeRooms: 0, openRooms: 0 };
    }
    let utilSum = 0;
    let openRooms = 0;
    let ops = 0;
    let activeRooms = 0;
    dayRooms.forEach(r => {
      const capacity = getRoomWorkingMinutesForDate(r, metricsDay);
      const roomOps = countOperationsForDay(r, dayHistory, metricsDay);
      const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
      ops += roomOps;
      if (capacity > 0) { openRooms++; utilSum += util; }
      if (roomOps > 0 || util > 0) activeRooms++;
    });
    return {
      avgUtil: openRooms > 0 ? Math.round(utilSum / openRooms) : 0,
      totalOps: ops,
      activeRooms,
      openRooms,
    };
  }, [dayRooms, dayHistory, metricsDay]);

  /** Intenzita provozu po dnech pro kalendář (0–1 dle počtu zahájených výkonů). */
  const dayActivityHeat = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    allDayHistory.forEach(e => {
      if (e.event_type !== 'operation_start' || !e.timestamp) return;
      const d = new Date(e.timestamp);
      if (Number.isNaN(d.getTime())) return;
      // Noční výkony patří do provozního dne, ve kterém začaly (7:00–7:00)
      const k = operationalDayKey(d);
      counts[k] = (counts[k] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    const out: Record<string, number> = {};
    Object.entries(counts).forEach(([k, v]) => { out[k] = v / max; });
    return out;
  }, [allDayHistory]);

  /* ── Drill-down: kliknutím na sál se orbit přepne na jeho výkony ──────────
     Každý satelit = jeden operační výkon, jeho prstenec = fáze cyklu
     (bez klidového stavu „Sál připraven"). */
  const [orbitRoomId, setOrbitRoomId] = useState<string | null>(null);
  /** Vybraný výkon v drill-downu (pro panel s rozpadem fází vpravo) */
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const orbitRoom = useMemo(
    () => (orbitRoomId ? dayRooms.find(r => r.id === orbitRoomId) ?? null : null),
    [orbitRoomId, dayRooms],
  );
  // Při změně dne se vracíme na přehled sálů
  useEffect(() => { setOrbitRoomId(null); setSelectedOpId(null); }, [metricsDay]);
  useEffect(() => { setSelectedOpId(null); }, [orbitRoomId]);

  /**
   * Výkony vybraného sálu v daném dni rozpadlé na fáze cyklu.
   *
   * Zdrojem je `dayHistory` (stejná data, ze kterých se počítá i počet výkonů
   * na prstenci sálu) — `room.completedOperations` obsahuje jen dnešní den
   * a nemusí být naplněné, což vedlo k „žádný výkon" u sálu s výkony.
   *
   * POZOR na sémantiku `step_change`: `step_name` je fáze, která právě
   * SKONČILA, a `duration_seconds` je její trvání (`step_index` je už nová
   * fáze). Barvu proto hledáme podle názvu, ne podle indexu.
   */
  const roomOperationRings = useMemo<OrbitItem[]>(() => {
    if (!orbitRoom) return [];
    const { start, end } = dayBounds(metricsDay);
    const now = Date.now();
    const isCurrentDay = metricsDay.getTime() === operationalToday().getTime();

    const colorByName = (name: string) =>
      WORKFLOW_STEPS.find(s => s.title === name)?.color || C.accent;

    type Seg = { value: number; color: string; label: string };
    type Acc = { startMs: number; endMs: number | null; segs: Seg[] };

    /* Události sálu se NEOŘEZÁVAJÍ na okno dne — výkon zahájený večer může
       skončit až po 7:00 druhého dne a jeho `operation_end` by se ztratil,
       což se dřív projevilo jako falešné „probíhá". Filtr na den se aplikuje
       až na hotové výkony podle času ZAHÁJENÍ. */
    const rawEvents = dayHistory
      .filter(e => e.operating_room_id === orbitRoom.id && e.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastLifecycleEvent = new Map<string, number>();
    const evts = rawEvents.filter((event) => {
      if (
        event.event_type !== 'operation_start'
        && event.event_type !== 'operation_end'
        && event.event_type !== 'step_change'
      ) {
        return true;
      }
      const timestamp = new Date(event.timestamp).getTime();
      const signature = `${event.event_type}:${event.step_index ?? 'none'}`;
      const previous = lastLifecycleEvent.get(signature);
      lastLifecycleEvent.set(signature, timestamp);
      return previous === undefined || timestamp - previous > 2_000;
    });

    const ops: Acc[] = [];
    let cur: Acc | null = null;

    for (const e of evts) {
      const t = new Date(e.timestamp).getTime();
      if (!Number.isFinite(t)) continue;

      if (e.event_type === 'operation_start') {
        if (cur && Math.abs(t - cur.startMs) <= 120_000) continue;
        if (cur) ops.push(cur); // předchozí zůstal bez `operation_end`
        cur = { startMs: t, endMs: null, segs: [] };
        continue;
      }

      if (e.event_type === 'operation_end') {
        if (cur) { cur.endMs = t; ops.push(cur); cur = null; }
        continue;
      }

      if (e.event_type === 'step_change' && e.duration_seconds) {
        const name = e.step_name || '';
        if (!name || isIdleStatusName(name)) continue; // klidový stav vynecháváme
        const ms = e.duration_seconds * 1000;
        const seg: Seg = { value: ms, color: colorByName(name), label: `${name} · ${fmtDurationMin(ms / 60000)}` };

        if (cur) {
          cur.segs.push(seg);
        } else {
          // Fáze dokončená těsně po `operation_end` patří k právě uzavřenému
          // výkonu; jinak zakládáme výkon zpětně (chybí `operation_start`).
          const last = ops[ops.length - 1];
          if (last && last.endMs !== null && t - last.endMs <= 120_000) {
            last.segs.push(seg);
            last.endMs = Math.max(last.endMs, t);
          } else {
            ops.push({ startMs: t - ms, endMs: t, segs: [seg] });
          }
        }
      }
    }
    if (cur) ops.push(cur); // stále otevřený výkon

    const fmtT = (ms: number) => new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    const fmtD = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

    return ops
      // Do dne patří výkony ZAHÁJENÉ v jeho okně (7:00–7:00)
      .filter(op => op.startMs >= start.getTime() && op.startMs < end.getTime())
      .filter(op => op.segs.length > 0 || op.endMs !== null)
      .map((op, i, arr) => {
        const segTotal = op.segs.reduce((a, x) => a + x.value, 0);
        // Skutečně běžící výkon = otevřený, poslední v pořadí, dnešní provozní
        // den a sál je reálně v nějaké fázi cyklu.
        const isRunning = op.endMs === null
          && i === arr.length - 1
          && isCurrentDay
          && orbitRoom.currentStepIndex > 0;
        // Neukončený záznam (chybí `operation_end`) — délku odvodíme z fází
        const isUnterminated = op.endMs === null && !isRunning;
        const endMs = op.endMs ?? (isRunning ? now : op.startMs + Math.max(segTotal, 60_000));
        const crossesDay = endMs >= end.getTime();

        const segs = op.segs.length > 0
          ? op.segs
          : [{ value: Math.max(1, endMs - op.startMs), color: C.accent, label: 'Výkon' }];
        const totalMs = segs.reduce((a, x) => a + x.value, 0);

        const label = isRunning
          ? `${fmtT(op.startMs)} – probíhá`
          : crossesDay
            ? `${fmtT(op.startMs)} → ${fmtD(endMs)} ${fmtT(endMs)}`
            : `${fmtT(op.startMs)}–${fmtT(endMs)}`;

        const detail = isRunning
          ? 'právě běží'
          : isUnterminated
            ? 'neukončeno v datech'
            : crossesDay
              ? 'přesah do dalšího dne'
              : `${segs.length} ${segs.length === 1 ? 'fáze' : segs.length <= 4 ? 'fáze' : 'fází'}`;

        return {
          id: `op-${i}-${op.startMs}`,
          label,
          percent: 100,
          detail,
          color: isUnterminated ? C.faint : crossesDay ? C.orange : (segs[0]?.color || C.accent),
          segments: segs,
          centerLabel: fmtDurationMin(totalMs / 60000),
          dimmed: isUnterminated,
          startMs: op.startMs,
          endMs,
        } satisfies OrbitItem;
      });
  }, [orbitRoom, metricsDay, dayHistory, WORKFLOW_STEPS]);

  /** Vybraný výkon v drill-downu (fallback = nejdelší výkon dne). */
  const selectedOp = useMemo(() => {
    if (roomOperationRings.length === 0) return null;
    if (selectedOpId) {
      const found = roomOperationRings.find(o => o.id === selectedOpId);
      if (found) return found;
    }
    return null;
  }, [roomOperationRings, selectedOpId]);

  /** Fáze vybraného výkonu pro panel vpravo (název, čas, barva) + pauza. */
  const selectedOpPhases = useMemo(() => {
    if (!selectedOp) return [];

    const phases = (selectedOp.segments || []).map(sgm => ({
      label: (sgm.label || '').split(' · ')[0] || 'Fáze',
      ms: sgm.value,
      color: sgm.color,
    }));

    // Pauza není `step_change`, ale samostatné události pause/resume —
    // spočítáme její překryv s časovým oknem vybraného výkonu.
    if (orbitRoom && selectedOp.startMs !== undefined && selectedOp.endMs !== undefined) {
      const winStart = selectedOp.startMs;
      const winEnd = selectedOp.endMs;
      const now = Date.now();

      const evts = dayHistory
        .filter(e => e.operating_room_id === orbitRoom.id
          && (e.event_type === 'pause' || e.event_type === 'resume')
          && e.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let pausedMs = 0;
      let open: number | null = null;
      for (const e of evts) {
        const t = new Date(e.timestamp).getTime();
        if (!Number.isFinite(t)) continue;
        if (e.event_type === 'pause') {
          if (open === null) open = t;
        } else if (open !== null) {
          const s = Math.max(open, winStart);
          const x = Math.min(t, winEnd);
          if (x > s) pausedMs += x - s;
          open = null;
        }
      }
      if (open !== null) {
        const s = Math.max(open, winStart);
        const x = Math.min(now, winEnd);
        if (x > s) pausedMs += x - s;
      }

      if (pausedMs > 0) phases.push({ label: 'Pauza', ms: pausedMs, color: C.yellow });
    }

    return phases;
  }, [selectedOp, orbitRoom, dayHistory]);

  /** Legenda fází pro drill-down (barvy + souhrnný čas napříč výkony). */
  const roomPhaseLegend = useMemo(() => {
    const agg: Record<string, { ms: number; color: string }> = {};
    roomOperationRings.forEach(op => {
      (op.segments || []).forEach(sgm => {
        const name = (sgm.label || '').split(' · ')[0];
        if (!name) return;
        if (!agg[name]) agg[name] = { ms: 0, color: sgm.color };
        agg[name].ms += sgm.value;
      });
    });
    return Object.entries(agg)
      .map(([name, v]) => ({ name, ms: v.ms, color: v.color }))
      .sort((a, b) => b.ms - a.ms);
  }, [roomOperationRings]);

  /** Sály pro orbitální zobrazení — vytížení a počet výkonů ve vybraném dni. */
  const orbitRooms = useMemo<OrbitItem[]>(() => {
    return dayRooms.map(r => {
      const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
      const ops = countOperationsForDay(r, dayHistory, metricsDay);
      const closed = getRoomWorkingMinutesForDate(r, metricsDay) === 0;
      const color = r.isEmergency ? C.red
        : closed ? C.faint
        : util >= 80 ? C.green
        : util >= 50 ? C.yellow
        : util > 0 ? C.orange
        : C.muted;
      return {
        id: r.id,
        label: r.name,
        percent: util,
        centerLabel: closed ? '—' : undefined,
        detail: closed && ops === 0 ? 'bez plánované kapacity' : `${ops} ${ops === 1 ? 'výkon' : ops >= 2 && ops <= 4 ? 'výkony' : 'výkonů'}`,
        color,
        dimmed: closed,
      };
    });
  }, [dayRooms, dayHistory, metricsDay]);

  /** Fáze operačního cyklu pro vybraný den (podíl času jednotlivých statusů). */
  const dayPhaseRings = useMemo(() => {
    const { start, end } = dayBounds(metricsDay);
    const totals: Record<string, { ms: number; color: string }> = {};
    WORKFLOW_STEPS.forEach(s => { totals[s.title] = { ms: 0, color: s.color }; });

    dayHistory
      .filter(e => e.event_type === 'step_change' && e.duration_seconds && e.timestamp)
      .forEach(e => {
        const t = new Date(e.timestamp).getTime();
        if (t < start.getTime() || t >= end.getTime()) return;
        if (e.step_name && totals[e.step_name]) {
          totals[e.step_name].ms += (e.duration_seconds || 0) * 1000;
        }
      });

    const total = Object.values(totals).reduce((a, b) => a + b.ms, 0);
    if (total === 0) return [];
    return Object.entries(totals)
      .filter(([name, v]) => v.ms > 0 && !isIdleStatusName(name))
      .map(([name, v]) => ({
        label: name,
        percent: (v.ms / total) * 100,
        detail: fmtDurationMin(v.ms / 60000),
        color: v.color,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [dayHistory, metricsDay, WORKFLOW_STEPS]);

  /** Doporučení pro hero panel Přehledu — odvozená z reálných čísel. */
  const overviewInsights = useMemo<InsightItem[]>(() => {
    const out: InsightItem[] = [];
    if (dayRooms.length === 0) return [{ tone: 'info', title: 'Žádné sály v provozu', text: 'Ve vybraném dni není plánovaný ani doložený provoz operačních sálů.' }];
    if (dayStats.openRooms === 0) return [{ tone: 'info', title: 'Kapacita není určena', text: 'Skutečný provoz je zachován. Bez nastavené provozní doby nelze určit vytížení ani doporučovat změny kapacity.' }];

    const util = dayStats.avgUtil;
    const dayLabel = formatDayLabel(metricsDay).toLowerCase();

    if (util >= 85) {
      out.push({ tone: 'warn', title: 'Kapacita na hraně',
        text: `Průměrné vytížení ${util} % (${dayLabel}). Hlídej přesčasy a zvaž rozšíření provozní doby.` });
    } else if (util >= 60) {
      out.push({ tone: 'good', title: 'Vysoké vytížení',
        text: `Průměr ${util} % (${dayLabel}). Provoz je dobře využitý — udrž tempo a sleduj mezičasy.` });
    } else if (util >= 40) {
      out.push({ tone: 'info', title: 'Dobré vytížení',
        text: `Průměr ${util} % (${dayLabel}). Stále je prostor zařadit kratší výkon na sály pod průměrem.` });
    } else if (dayStats.openRooms === 0) {
      out.push({ tone: 'info', title: 'Sály mimo provoz',
        text: `Pro ${dayLabel} nemá žádný sál naplánovanou provozní dobu.` });
    } else {
      out.push({ tone: 'warn', title: 'Nízké vytížení',
        text: `Průměr ${util} % (${dayLabel}). Sály zůstávají dlouho volné — prověř plánování programu.` });
    }

    // Nejdelší fáze dne — kandidát na zkrácení
    const longest = dayPhaseRings[0];
    if (longest && longest.percent >= 10) {
      out.push({ tone: 'info', title: `Zkrať: ${longest.label}`,
        text: `Status „${longest.label}" zabral ${longest.detail} (${Math.round(longest.percent)} % dne). Standardizace tohoto kroku přinese nejrychlejší zlepšení.` });
    }

    if (emergCnt > 0) {
      out.push({ tone: 'warn', title: `Nouzový režim: ${emergCnt} ${emergCnt === 1 ? 'sál' : 'sály'}`,
        text: 'Nouzové sály mají přednost — ověř, že navazující program počítá se zpožděním.' });
    } else if (out.length < 2) {
      out.push({ tone: 'good', title: 'Bez mimořádností',
        text: `Žádný sál není v nouzovém režimu. Evidováno ${dayStats.totalOps} výkonů.` });
    }

    return out.slice(0, 3);
  }, [dayRooms.length, dayStats, dayPhaseRings, metricsDay, emergCnt]);


  const deptMap = useMemo(()=>{
    const m:Record<string,number>={};
    rooms.forEach(r=>{
      const operations = countOperationsInWorkingHours(r, statusHistory, period);
      m[r.department]=(m[r.department]??0)+operations;
    });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[rooms,statusHistory,period]);

  // Per-room status utilisation from real status history (must be defined before roomBarData)
  const roomDistributions = useMemo(() => {
    return calculateRoomWorkflowDistribution(statusHistory, rooms, WORKFLOW_STEPS);
  }, [statusHistory, rooms, WORKFLOW_STEPS]);

  // Room bar data using real status history for utilization within working hours
  const roomBarData = useMemo(() => rooms.map(r => {
    // Calculate operations count within working hours
    const opsInWorkingHours = countOperationsInWorkingHours(r, statusHistory, period);
    // Calculate utilization based on working hours
    const utilPct = calculateRoomUtilization(r, statusHistory, period);
    // Get today's working hours for display
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const workingHoursStr = formatRoomWorkingHours(r, todayIndex);
    
    return {
      name: r.name.replace('Sál č. ', 'S'),
      ops: opsInWorkingHours,
      util: utilPct,
      color: roomStatusColor(r),
      workingHours: workingHoursStr,
      totalWorkingMinutes: getRoomTotalWorkingMinutes(r, period),
    };
  }), [rooms, statusHistory, period]);

  // Generate opsTrend from real DB data only
  const opsTrend = useMemo(() => {
    if (dbStats?.operationsByDay && Object.keys(dbStats.operationsByDay).length > 0) {
      const days = Object.entries(dbStats.operationsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7);
      return days.map(([date, count], i) => ({
        t: i === days.length - 1 ? 'Dnes' : `T-${days.length - 1 - i}`,
        v: count,
      }));
    }
    return [];
  }, [dbStats]);

  // Status pie data
  const statusPie=[
    {name:'Obsazeno',value:busyCount, color:C.orange},
    {name:'Volno',   value:freeCount, color:C.green},
    {name:'Úklid',   value:cleanCount,color:C.accent},
    {name:'Údržba',  value:maintCount,color:C.faint},
  ].filter(s=>s.value>0);

  // Aggregate workflow utilisation from real status history data
  const workflowAgg = useMemo(() => {
    return calculateWorkflowDistribution(statusHistory, WORKFLOW_STEPS);
  }, [statusHistory, WORKFLOW_STEPS]);

  // Utilisation per interval for comparison bar - use real data if available
  const intervalCompare = useMemo(() => {
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const dayOrder = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
    
    if (dbStats?.operationsByDay && Object.keys(dbStats.operationsByDay).length > 0) {
      const byDay: Record<string, number[]> = {};
      Object.entries(dbStats.operationsByDay).forEach(([date, count]) => {
        const d = new Date(date);
        const dayName = dayNames[d.getDay()];
        if (!byDay[dayName]) byDay[dayName] = [];
        byDay[dayName].push(count);
      });
      
      return dayOrder.map(t => ({
        t,
        v: byDay[t]?.length > 0 
          ? Math.round(byDay[t].reduce((a, b) => a + b, 0) / byDay[t].length)
          : 0,
      }));
    }
    
    return [];
  }, [dbStats]);

  // Scatter: ops vs utilPct per room using real data within working hours
  const scatterData = useMemo(() => rooms.map(r => {
    const opsInWorkingHours = countOperationsInWorkingHours(r, statusHistory, period);
    const utilPct = calculateRoomUtilization(r, statusHistory, period);
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    
    return {
      ops: opsInWorkingHours,
      util: utilPct,
      queue: r.queueCount,
      name: r.name,
      workingHours: formatRoomWorkingHours(r, todayIndex),
      workingMinutes: getRoomWorkingMinutes(r, todayIndex),
    };
  }), [rooms, statusHistory, period]);

  // Per-room status bar (stacked bar) using roomDistributions defined above
  const roomStatusBar = useMemo(() => rooms.map((r, i) => {
    const dist = roomDistributions[r.id] || {};
    const base: Record<string, number | string> = { name: `S${i + 1}` };
    WORKFLOW_STEPS.forEach(step => {
      base[step.title] = dist[step.title] ?? 0;
    });
    return base;
  }), [rooms, roomDistributions, WORKFLOW_STEPS]);

  const buildOverviewReport = (): StatisticsReport => {
    const dayLabel = metricsDay.toLocaleDateString('cs-CZ', { dateStyle: 'long' });
    return {
      requiredHistoryFrom: dayBounds(metricsDay).start.toISOString(),
      context: `Vybraný provozní den: ${dayLabel}, 07:00 až 06:59 následujícího dne. Souhrn dne a denní metriky respektují kalendář. Samostatná tabulka za období používá filtr ${periodLabelMap[period].toLowerCase()}.${orbitRoom ? ` Detail sálu: ${orbitRoom.name}.` : ''} ${STATISTICS_ROOM_SCOPE_NOTE}`,
      metrics: [
        { label: 'Výkony ve vybraném dni', value: dayStats.totalOps },
        { label: 'Průměrné vytížení dne', value: dayStats.openRooms > 0 ? `${dayStats.avgUtil} %` : '—', detail: 'Z provozně otevřených sálů' },
        { label: 'Sály s provozem', value: `${dayStats.activeRooms} / ${dayRooms.length}` },
        { label: 'Plánovaně otevřeno', value: dayStats.openRooms, detail: dayLabel },
      ],
      sections: [
        {
          title: 'Provozní metriky jednotlivých sálů',
          description: `Provozní den ${dayLabel}. Časy jsou uvedeny v minutách; kapacita vychází z nastavené pracovní doby.`,
          columns: [{ label: 'Operační sál' }, { label: 'Pracovní doba' }, { label: 'Využití', align: 'right' }, { label: 'Výkony', align: 'right' }, { label: 'Aktivní / kapacita (min)', align: 'right' }, { label: 'Pauza (min)', align: 'right' }, { label: 'Přesah (min)', align: 'right' }],
          rows: dayRooms.map(room => [
            room.name,
            formatRoomWorkingHours(room, weekdayIndex(metricsDay)),
            getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? `${calculateRoomUtilizationForDay(room, dayHistory, metricsDay)} %` : '—',
            countOperationsForDay(room, dayHistory, metricsDay),
            `${Math.round(calculateActiveMinutesForDay(room, dayHistory, metricsDay))} / ${getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? Math.round(getRoomWorkingMinutesForDate(room, metricsDay)) : '—'}`,
            Math.round(calculatePausedMinutesForDay(room, dayHistory, metricsDay)),
            getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? Math.round(calculateOvertimeMinutesForDay(room, dayHistory, metricsDay)) : '—',
          ]),
        },
        {
          title: 'Fáze operačního cyklu ve vybraném dni',
          description: 'Stejný rozpad jako v souhrnu dne. Klidové fáze nejsou uvedeny; podíly jsou vůči všem naměřeným fázím, a nemusí proto dát součet 100 %.',
          columns: [{ label: 'Fáze' }, { label: 'Naměřený čas', align: 'right' }, { label: 'Podíl času', align: 'right' }],
          rows: dayPhaseRings.map(phase => [phase.label, phase.detail, `${phase.percent.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} %`]),
        },
        ...(orbitRoom ? [{
          title: `Výkony vybraného sálu: ${orbitRoom.name}`,
          description: `Detail pro provozní den ${dayLabel}. Rozpracované a neukončené výkony jsou výslovně označeny.`,
          columns: [{ label: 'Čas výkonu' }, { label: 'Naměřená délka' }, { label: 'Stav záznamu' }],
          rows: roomOperationRings.map(operation => [operation.label, operation.centerLabel ?? '', operation.detail ?? '']),
        }] : []),
        ...(selectedOp ? [{
          title: `Fáze vybraného výkonu: ${selectedOp.label}`,
          columns: [{ label: 'Fáze' }, { label: 'Doba trvání' }],
          rows: selectedOpPhases.map(phase => [phase.label, fmtDurationMin(phase.ms / 60000)]),
        }] : []),
        {
          title: `Souhrn za období: ${periodLabelMap[period]}`,
          description: `Výkony v pracovní době za zvolené období. ${period === 'den' ? 'Využití v denním režimu se vztahuje k aktuálnímu provoznímu dni od 07:00, nikoli k posuvným 24 hodinám.' : 'Využití odpovídá zvolenému období.'} Stav sálu je aktuální v okamžiku exportu, nikoli historický.`,
          columns: [{ label: 'Operační sál' }, { label: 'Výkony', align: 'right' }, { label: 'Využití', align: 'right' }, { label: 'Aktuální stav' }],
          rows: rooms.map(room => [room.name, countOperationsInWorkingHours(room, statusHistory, period), getRoomTotalWorkingMinutes(room, period) > 0 ? `${calculateRoomUtilization(room, statusHistory, period)} %` : '—', roomStatusLabel(room)]),
        },
        {
          title: 'Výkony podle oddělení',
          description: `Součet výkonů v pracovní době za období ${periodLabelMap[period].toLowerCase()}. Zahrnuta jsou všechna oddělení.`,
          columns: [{ label: 'Oddělení' }, { label: 'Výkony', align: 'right' }],
          rows: deptMap,
        },
        {
          title: 'Dokončené výkony podle dne',
          description: 'Všechna dostupná denní měření v načteném období; stejně jako zdroj trendového grafu.',
          columns: [{ label: 'Datum' }, { label: 'Dokončené výkony', align: 'right' }],
          rows: Object.entries(dbStats.operationsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => [new Date(`${day}T12:00:00`).toLocaleDateString('cs-CZ'), count]),
        },
        {
          title: 'Průměrný počet výkonů podle dne v týdnu',
          description: 'Z dostupných denních měření v načteném období, shodně s grafem v přehledu.',
          columns: [{ label: 'Den v týdnu' }, { label: 'Průměr výkonů', align: 'right' }],
          rows: intervalCompare.map(day => [day.t, day.v]),
        },
        {
          title: 'Provozní doporučení',
          columns: [{ label: 'Zjištění' }, { label: 'Doporučení pro vybraný den' }],
          rows: [
            ...overviewInsights.filter(insight => !insight.title.startsWith('Nouzový režim:') && insight.title !== 'Bez mimořádností').map(insight => [insight.title, insight.text]),
            ['Aktuální nouzový režim', `${rooms.filter(room => room.isEmergency).length} sálů v nouzovém režimu v okamžiku vytvoření reportu; nejde o počet historických událostí.`],
          ],
        },
      ],
    };
  };

  const handlePrint = () => {
    if (isStatisticsLoading || statisticsError) {
      setPrintError(statisticsError ? 'Data se nepodařilo úplně načíst. Report nelze bezpečně vytvořit; zkuste načtení opakovat.' : 'Statistiky se ještě načítají. Počkejte na dokončení načítání a zkuste tisk znovu.');
      return;
    }
    const report = tab === 'prehled' ? buildOverviewReport() : reportData.current[tab];
    if (!report) {
      setPrintError('Data vybrané záložky ještě nejsou připravena pro tisk. Počkejte na jejich načtení, případně zkontrolujte zvolený filtr.');
      return;
    }
    if (report.requiredHistoryFrom && (!dayHistoryCoverageStart || new Date(report.requiredHistoryFrom).getTime() < new Date(dayHistoryCoverageStart).getTime())) {
      setPrintError('Vybraný den leží mimo úplně načtenou historii. Pro tisk vyberte novější den; chybějící data nelze vykázat jako nulové hodnoty.');
      return;
    }
    setPrintError(null);
    const generatedAt = new Date();
    try {
      openStatisticsPrintReport(report, {
        tabLabel: tabLabelMap[tab],
        periodLabel: periodLabelMap[period],
        hospitalName: activeHospital?.hospital_name ?? activeHospital?.hospital_short_name ?? undefined,
        generatedAt,
        filename: `Statistiky_${tab}_${generatedAt.toISOString().slice(0, 10)}`,
      });
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Report se nepodařilo otevřít. Zkuste tisk znovu.');
    }
  };
  const handleExportPdf = handlePrint;

  const printHandlerRef = useRef(handlePrint);
  useEffect(() => { printHandlerRef.current = handlePrint; });
  useEffect(() => {
    const onPrintShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        printHandlerRef.current();
      }
    };
    window.addEventListener('keydown', onPrintShortcut);
    return () => window.removeEventListener('keydown', onPrintShortcut);
  }, []);

  return(
    <StatisticsReportContext.Provider value={registerReport}>
      {printError && <div role="alert" className="fixed bottom-20 right-6 z-50 max-w-md rounded-xl border border-red-300/30 bg-slate-900 p-4 text-sm text-white shadow-xl"><p>{printError}</p><button type="button" onClick={() => setPrintError(null)} className="mt-2 underline">Zavřít upozornění</button></div>}
      {/* Mobile background — unified with RoomDetail / Timeline / Staff */}
      <div
        aria-hidden
        className="mobile-theme-surface fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
        }}
      />

      {/* ========== MOBILE (md:hidden) ========== */}
      {isMobileViewport && (
      <div
        className={`statistics-module statistics-settings mobile-statistics mobile-unified-statistics ${isMobileDark ? 'is-dark' : 'is-light'} md:hidden w-full relative`}
        style={{ zIndex: 1 }}
        data-print-area="statistics"
      >
        <div className="flex flex-col gap-3 print-section">
          <div className="print-hide">
            <MobileModuleHeader kicker="Statistiky" title="Provozní přehled">
              <MobileHeaderMetrics
                items={[
                  {
                    label: 'Využití',
                    value: avgUtil,
                    suffix: '%',
                    color: C.green,
                    icon: <Activity className="w-5 h-5" strokeWidth={2.2} />,
                  },
                  {
                    label: 'Výkony',
                    value: totalOps,
                    suffix: 'celkem',
                    color: C.accent,
                    icon: <BarChart3 className="w-5 h-5" strokeWidth={2.2} />,
                  },
                ]}
              />
            </MobileModuleHeader>
          </div>

          {/* Export buttons (mobile) */}
          <div className="flex items-center gap-2 print-hide">
            <button
              onClick={handlePrint}
              title={`Vytisknout report záložky ${tabLabelMap[tab]} v novém okně`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}>
              <Printer className="w-4 h-4" />
              Tisk
            </button>
            <button
              onClick={handleExportPdf}
              title={`PDF report záložky ${tabLabelMap[tab]} – v dialogu zvolte Uložit jako PDF`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}>
              <FileDown className="w-4 h-4" />
              PDF
            </button>
          </div>

          {/* Period toggle */}
          <div className="print-hide">
            <MobileSectionLabel className="mb-2">Období</MobileSectionLabel>
            <MobilePillTabs<Period>
              tabs={[
                { id: 'den', label: 'Den' },
                { id: 'týden', label: 'Týden' },
                { id: 'měsíc', label: 'Měsíc' },
                { id: 'rok', label: 'Rok' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>

          {/* Tab toggle */}
          <div className="print-hide">
            <StatisticsNavigation value={tab} onChange={setTab} compact />
          </div>

          <div id={`statistics-panel-${tab}`} role="tabpanel" aria-labelledby={`statistics-tab-${tab}`} tabIndex={0} className="stats-tab-panel min-w-0">
          {/* ── Přehled ── (vždy renderováno při tisku, bez page-breaks) */}
          {(tab === 'prehled') && (
            <div className="flex flex-col gap-3 print-section">

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { l: 'Obsazeno', v: `${busyCount}/${rooms.length}`, c: C.orange },
                  { l: 'Volno', v: `${freeCount}/${rooms.length}`, c: C.green },
                  { l: `Výkony (${period})`, v: totalOps, c: C.accent },
                  { l: `Využití (${period})`, v: hasPeriodCapacity ? `${avgUtil}%` : '—', c: C.text },
                ].map(k => (
                  <div
                    key={k.l}
                    className="statistics-kpi-card m-unified-card p-4"
                  >
                    <p className="m-unified-card-title stats-card-title">
                      {k.l}
                    </p>
                    <p className="text-2xl font-semibold mt-2 tabular-nums" style={{ color: k.c }}>
                      {k.v}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini trend chart */}
              <MobileCard className="m-unified-card">
                <div className="m-unified-card-header mb-3">
                  <h2 className="m-unified-card-title stats-card-title">Využití jednotlivých sálů</h2>
                </div>
                <BarList
                  max={100}
                  barHeight={7}
                  items={utilData.map(d => ({
                    label: d.full,
                    value: d.v,
                    display: `${d.v}%`,
                    color: d.v >= 80 ? C.green : d.v >= 50 ? C.yellow : d.v > 0 ? C.orange : C.red,
                  }))}
                  emptyText="Žádné sály k zobrazení."
                />
                <div className="flex items-center justify-between text-[11px] mt-3 px-1" style={{ color: C.muted }}>
                  <span>Nejvyšší: <span className="font-semibold" style={{ color: C.text }}>{hasPeriodCapacity ? `${peakUtil}%` : '—'}</span></span>
                  <span>Nejnižší: <span className="font-semibold" style={{ color: C.text }}>{hasPeriodCapacity ? `${minUtil}%` : '—'}</span></span>
                </div>
              </MobileCard>
            </div>
          )}

          {/* ── Sály ── (propracovaný RoomsTab) */}
          {(tab === 'saly') && (
            <div className="flex flex-col gap-3 print-section">

              <RoomsTab
                rooms={allRooms}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                periodLabel={period}
                onRoomSelect={setSelectedRoom}
                calculateRoomUtilization={calculateRoomUtilization}
                countOperationsInWorkingHours={countOperationsInWorkingHours}
                calculateRoomUtilizationForDay={calculateRoomUtilizationForDay}
                countOperationsForDay={countOperationsForDay}
                workflowSteps={WORKFLOW_STEPS}
              />
            </div>
          )}

          {/* ── Fáze — propracovaný PhasesTab ── */}
          {(tab === 'faze') && (
            <div className="flex flex-col gap-3 print-section">

              <PhasesTab
                rooms={allRooms}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                periodLabel={period}
                workflowSteps={WORKFLOW_STEPS}
                avgStepDurations={avgStepDurations}
                workflowAgg={workflowAgg}
              />
            </div>
          )}

          {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
          {(tab === 'finance') && (
            <div className="flex flex-col gap-3 print-section">

              <FinanceTab
                rooms={allRooms}
                totalOps={totalOps}
                avgUtilization={avgUtil}
                periodLabel={period}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                notifications={notifications}
              />
            </div>
          )}

          {/* ── Hodinové sazby — samostatná správa nákladových sazeb ── */}
          {(tab === 'sazby') && (
            <div className="flex flex-col gap-3 print-section">

              <FinanceTab
                rooms={allRooms}
                totalOps={totalOps}
                avgUtilization={avgUtil}
                periodLabel={period}
                statusHistory={allStatusHistory}
                notifications={notifications}
                view="rates"
              />
            </div>
          )}

          {/* ── Notifikace ── */}
          {(tab === 'notifikace') && (
            <div className="flex flex-col gap-3 print-section">

              <MobileSectionLabel>Přehled notifikací</MobileSectionLabel>
              <NotificationsTab
                notifications={notifications}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                rooms={allRooms}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}


          {/* ── Zařízení ── */}
          {(tab === 'zarizeni') && (
            <div className="flex flex-col gap-3 print-section">

              <MobileSectionLabel>Připojená zařízení</MobileSectionLabel>
              <DevicesTab
                devices={devices}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}
          </div>
        </div>
      </div>
      )}

      {/* ========== DESKTOP (hidden md:block) ========== */}
      {!isMobileViewport && (
      <div className="statistics-module statistics-settings statistics-desktop hidden md:block w-full" data-print-area="statistics">
      {/* ── Module header — stejný vzor jako ostatní desktopové moduly ── */}
      <header className="mb-7 print-hide">
        <ModulePageHeading
          icon={BarChart3}
          kicker="OPERATINGROOM CONTROL"
          title="STATISTIKY"
        />
      </header>

      {/* Sdílená ovládací lišta ve stylu Nastavení; na menší šířce se zalomí. */}
      <div
        className="statistics-tabs stats-commandbar print-hide mb-4"
        style={{ border: `1px solid ${C.border}` }}
      >
        {/* Záložky */}
        <div className="stats-commandbar-nav">
          <StatisticsNavigation value={tab} onChange={setTab} />
        </div>

        {/* Období a export vpravo, oddělené svislou linkou */}
        <div className="stats-commandbar-actions">
          <span aria-hidden className="h-6 w-px" style={{ background: C.border }} />

          <div className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            {(['den','týden','měsíc','rok'] as Period[]).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} aria-pressed={period === p}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap"
                style={{
                  background: period === p ? C.surfaceActive : 'transparent',
                  color: period === p ? C.text : C.muted,
                }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <span aria-hidden className="h-6 w-px" style={{ background: C.border }} />

          <button
            onClick={handlePrint}
            title={`Vytisknout report záložky ${tabLabelMap[tab]} v novém okně`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}>
            <Printer className="w-4 h-4" />
            Tisk
          </button>
          <button
            onClick={handleExportPdf}
            title={`PDF report záložky ${tabLabelMap[tab]} – v dialogu zvolte Uložit jako PDF`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}>
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* ── Tab content ──
          Obrazovka zůstává nezávislá na samostatném tiskovém reportu. */}
      <div id={`statistics-panel-${tab}`} role="tabpanel" aria-labelledby={`statistics-tab-${tab}`} tabIndex={0} className="stats-tab-panel min-w-0">
        {(tab==='prehled') && (
          <div key="prehled" className="space-y-5 print-section">

            {/* ── Hero panel — velký prstenec vytížení, doporučení a stavy sálů.
                   Stejný vizuální jazyk jako režim „Fáze" v Toku pacienta. ── */}
            <Card className="p-4 sm:p-6">
              {/* Listování po dnech / kalendář — stejný styl jako v Toku pacienta */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-7 print-hide">
                <div>
                  <p className="text-lg font-semibold" style={{ color: C.text }}>
                    {formatDayLabel(metricsDay)}
                  </p>
                  <p className="text-[12px] capitalize" style={{ color: C.muted }}>
                    {metricsDay.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                    Provozní den 7:00 – 6:59 (noční výkony patří do dne zahájení)
                  </p>
                </div>
                {/* Přepínač: souhrn dne ↔ rozpad po sálech (orbit).
                    Výběr data řeší glassmorph kalendář pod panelem doporučení. */}
                <button
                  onClick={() => setHeroMode(m => (m === 'orbit' ? 'summary' : 'orbit'))}
                  aria-pressed={heroMode === 'summary'}
                  title={heroMode === 'orbit'
                    ? 'Přepnout na souhrn dne (fáze operačního cyklu)'
                    : 'Přepnout na rozpad po sálech'}
                  className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2"
                  style={heroMode === 'summary'
                    ? { background: C.surfaceActive, color: C.accent, border: `1px solid ${C.border}` }
                    : { background: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                >
                  {heroMode === 'orbit'
                    ? <BarChart3 className="w-4 h-4" />
                    : <Layers className="w-4 h-4" />}
                  {heroMode === 'orbit' ? 'Souhrn dne' : 'Rozpad po sálech'}
                </button>
              </div>

              {/* Mřížka: vlevo prstenec + fáze pod ním (společně vycentrované),
                  vpravo panel doporučení. Malé prstence tak sedí přesně
                  pod středem velkého grafu. */}
              {/* V rozpadu po sálech přibývá prostřední sloupec s fázemi
                  vybraného výkonu — vlevo od doporučení a kalendáře. */}
              <div
                className={`grid grid-cols-1 gap-8 items-start ${
                  heroMode === 'orbit' && orbitRoom
                    ? '2xl:grid-cols-[minmax(0,1fr)_minmax(0,260px)_minmax(0,300px)]'
                    : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]'
                }`}
              >
                <div className="flex flex-col items-center">
                  {heroMode === 'orbit' ? (
                    /* Orbit — sály, po kliknutí rozpad výkonů vybraného sálu */
                    orbitRoom ? (
                      <>
                        {/* Drobečková navigace zpět na přehled sálů */}
                        <div className="w-full flex items-center justify-between gap-3 mb-4">
                          <button
                            onClick={() => setOrbitRoomId(null)}
                            className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
                            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                          >
                            <ChevronLeft className="w-4 h-4" /> Všechny sály
                          </button>
                          <p className="text-[13px] font-bold truncate" style={{ color: C.text }}>
                            {orbitRoom.name}
                            <span className="font-medium" style={{ color: C.muted }}> · výkony dne</span>
                          </p>
                        </div>

                        <OrbitRings
                          center={{
                            value: calculateRoomUtilizationForDay(orbitRoom, dayHistory, metricsDay),
                            color: C.accent,
                            kicker: 'Vytížení sálu',
                          }}
                          items={roomOperationRings}
                          onSelect={(id) => setSelectedOpId(cur => (cur === id ? null : id))}
                          selectedId={selectedOpId}
                          emptyText="V tento den nemá sál žádný zaznamenaný výkon."
                        />

                        {/* Legenda fází cyklu */}
                        {roomPhaseLegend.length > 0 && (
                          <div className="w-full mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <StatSectionLabel className="mb-3">Fáze cyklu</StatSectionLabel>
                            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                              {roomPhaseLegend.map(p => (
                                <span key={p.name} className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                  {p.name}
                                  <span className="font-bold tabular-nums" style={{ color: C.text }}>
                                    {fmtDurationMin(p.ms / 60000)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {roomOperationRings.length > 0 && (
                          <p className="text-[12px] mt-4 text-center" style={{ color: C.muted }}>
                            {roomOperationRings.length}{' '}
                            {roomOperationRings.length === 1
                              ? 'výkon'
                              : roomOperationRings.length <= 4 ? 'výkony' : 'výkonů'} ·
                            <span style={{ color: C.faint }}> každý prstenec je jeden operační cyklus</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <OrbitRings
                          center={{
                            value: dayStats.avgUtil,
                            valueLabel: dayStats.openRooms > 0 ? undefined : '—',
                            color: dayStats.avgUtil >= 80 ? C.green : dayStats.avgUtil >= 50 ? C.accent : dayStats.avgUtil > 0 ? C.orange : C.red,
                            kicker: 'Průměr',
                          }}
                          items={orbitRooms}
                          onSelect={(id) => setOrbitRoomId(id)}
                        />
                        <p className="text-[12px] mt-4 text-center" style={{ color: C.muted }}>
                          Vytížení jednotlivých sálů · {dayStats.totalOps} výkonů celkem ·
                          <span style={{ color: C.faint }}> klikni na sál pro rozpad výkonů</span>
                        </p>
                      </>
                    )
                  ) : (
                    <>
                      <GaugeRing
                        value={dayStats.avgUtil}
                        valueLabel={dayStats.openRooms > 0 ? undefined : '—'}
                        size={340}
                        color={dayStats.avgUtil >= 80 ? C.green : dayStats.avgUtil >= 50 ? C.accent : dayStats.avgUtil > 0 ? C.orange : C.red}
                        kicker="Vytížení sálů"
                        sublabel={`${dayStats.totalOps} výkonů · ${dayStats.activeRooms}/${dayRooms.length} sálů v provozu`}
                      />

                      {/* Fáze operačního cyklu — podíl času jednotlivých statusů */}
                      <div className="w-full mt-8 pt-7" style={{ borderTop: `1px solid ${C.border}` }}>
                        <StatSectionLabel className="mb-6">Fáze operačního cyklu</StatSectionLabel>
                        <RingRow
                          items={dayPhaseRings}
                          emptyText="Pro vybraný den nejsou zaznamenané fáze."
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Prostřední sloupec — fáze vybraného výkonu (jen v rozpadu) */}
                {heroMode === 'orbit' && orbitRoom && (
                  <PhasePanel
                    title="Fáze výkonu"
                    subtitle={selectedOp?.label}
                    items={selectedOpPhases}
                    emptyText="Klikni na výkon v grafu a zobrazí se rozpad jeho fází."
                  />
                )}

                {/* Pravý sloupec — doporučení a kalendář */}
                <div className="flex flex-col gap-4">
                  <InsightPanel
                    accent={dayStats.avgUtil >= 80 ? C.green : C.accent}
                    items={overviewInsights}
                  />

                  <div className="print-hide">
                    <GlassCalendar
                      value={metricsDay}
                      onChange={setMetricsDay}
                      heat={dayActivityHeat}
                      accent={C.accent}
                      today={operationalToday()}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* KPI strip */}
            <div className="stats-overview-metrics"
              style={{border:`1px solid ${C.border}`}}>
              {[
                {l:'Sálů celkem',      v:rooms.length,                          c:C.text},
                {l:'Obsazeno',         v:`${busyCount} / ${rooms.length}`,       c:C.orange},
                {l:'Volno',            v:`${freeCount} / ${rooms.length}`,       c:C.green},
                {l:'Úklid + Údržba',  v:`${cleanCount+maintCount}`,             c:C.accent},
                {l:`Využití (${period})`,v:hasPeriodCapacity ? `${avgUtil}%` : '—', c:C.text},
                {l:'Nejvyšší využití sálu', v:hasPeriodCapacity ? `${peakUtil}%` : '—', c:peakUtil>90?C.red:C.orange},
                {l:'Nejnižší využití sálu', v:hasPeriodCapacity ? `${minUtil}%` : '—', c:C.muted},
                {l:`Výkony (${period})`,v:totalOps,                             c:C.accent},
              ].map((k,i)=>(
                <div key={i} className="flex flex-col justify-between px-4 py-3"
                  style={{background:C.surface,borderRight:i<7?`1px solid ${C.border}`:undefined}}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{color:C.muted}}>{k.l}</p>
                  <p className="text-2xl font-light leading-none" style={{color:k.c}}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Per-room KPI strips — provozní metriky s listováním po dnech */}
            <div className="space-y-3">
              {/* Hlavička sekce + navigace po dnech */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>
                  Jednotlivé sály — provozní metriky ({formatDayLabel(metricsDay)})
                </SectionLabel>
                <div className="print-hide">
                  <DayNavigator value={metricsDay} onChange={setMetricsDay} today={operationalToday()} />
                </div>
              </div>

              <div className="stats-room-metrics" role="region" aria-label="Provozní metriky jednotlivých sálů" tabIndex={0}>
              {dayRooms.map(r => {
                const dayIdx = weekdayIndex(metricsDay);
                const opsInHours = countOperationsForDay(r, dayHistory, metricsDay);
                const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
                const activeMins = Math.round(calculateActiveMinutesForDay(r, dayHistory, metricsDay));
                const totalMins = Math.round(getRoomWorkingMinutesForDate(r, metricsDay));
                const dayHoursLabel = formatRoomWorkingHours(r, dayIdx);
                const dayHours = getRoomWorkingHours(r, dayIdx);
                // Skutečně odpauzovaný čas sálu (události pause/resume), ne
                // plánovaná přestávka z rozvrhu.
                const pausedMins = calculatePausedMinutesForDay(r, dayHistory, metricsDay);
                const closed = !dayHours.enabled;
                // Přesah = odoperováno nad rámec plánované kapacity dne
                const overtimeMins = calculateOvertimeMinutesForDay(r, dayHistory, metricsDay);
                const utilColor = util >= 80 ? C.green
                  : util >= 50 ? C.yellow
                  : util > 0 ? C.orange : C.muted;

                const flags: string[] = [];
                if (r.isEmergency) flags.push('EMERG');
                if (r.isSeptic)    flags.push('SEPT');
                const flagsLabel = flags.length > 0 ? flags.join(' · ') : '—';
                const flagsColor = r.isEmergency ? C.orange : r.isSeptic ? C.red : C.faint;

                const cells = [
                  { l: 'Sál',                  v: r.name,                                   c: C.text },
                  // Stav + příznaky (nouze / septický) v jedné buňce
                  { l: 'Stav',                 v: flags.length > 0 ? `${roomStatusLabel(r)} · ${flagsLabel}` : roomStatusLabel(r), c: flags.length > 0 ? flagsColor : roomStatusColor(r) },
                  // Vytížení — barevné procento + barevná linka pod hodnotou
                  { l: 'Využití kapacity',     v: totalMins > 0 ? `${util}%` : '—',         c: utilColor, bar: totalMins > 0 ? Math.min(100, util) : undefined },
                  { l: 'Výkony',               v: String(opsInHours),                       c: opsInHours > 0 ? C.accent : C.muted },
                  { l: 'Pracovní doba',        v: dayHoursLabel,                            c: closed ? C.faint : C.text },
                  { l: 'Pauza',                v: pausedMins > 0 ? `${pausedMins} m` : '—', c: pausedMins > 0 ? C.yellow : C.faint },
                  { l: 'Aktivní / Kap.',       v: `${activeMins} / ${totalMins > 0 ? totalMins : '—'} m`, c: C.text },
                  { l: 'Přesah',               v: totalMins > 0 && overtimeMins > 0 ? `+${overtimeMins} m` : '—', c: totalMins > 0 && overtimeMins > 0 ? C.red : C.faint },
                ];

                return (
                  <div
                    key={r.id}
                    className="stats-room-metrics-row">
                    {cells.map((k, i) => (
                      <div
                        key={i}
                        className="flex flex-col justify-between px-4 py-3"
                        style={{
                          background: C.surface,
                          borderRight: i < cells.length - 1 ? `1px solid ${C.border}` : undefined,
                        }}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-2" style={{color: C.muted}}>
                          {k.l}
                        </p>
                        {/* Delší názvy a stavy se zalomí bez ztráty informace. */}
                        <p
                          className="text-xs font-medium leading-snug whitespace-normal break-words"
                          style={{ color: k.c }}
                          title={String(k.v)}
                        >
                          {k.v}
                        </p>
                        {/* Barevná linka vytížení pod procentem */}
                        {k.bar !== undefined && (
                          <div
                            className="mt-2 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--stats-ghost)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${k.bar}%`,
                                background: k.c,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {dayRooms.length === 0 && (
                <p className="text-xs py-4 text-center" style={{color: C.faint}}>
                  Žádné sály k zobrazení.
                </p>
              )}
              </div>
            </div>

            {/* Row 1 odstraněna — „Využití jednotlivých sálů" i „Stav sálů — podíl"
                duplikovaly údaje z KPI pásu a provozních metrik sálů výše. */}

            {/* Row 2: Ops per room + Dept + 7-day trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony / sál (24 h)</SectionLabel>
                <BarList
                  ranked
                  items={[...roomBarData]
                    .sort((a, b) => b.ops - a.ops)
                    .slice(0, 8)
                    .map(d => ({ label: d.name, value: d.ops, color: d.color }))}
                  emptyText="Za posledních 24 h bez výkonů."
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Oddělení — výkony / 24 h</SectionLabel>
                <BarList
                  items={deptMap.slice(0, 7).map(([dept, count]) => ({
                    label: dept,
                    value: count,
                    color: DEPT_COLORS[dept] ?? C.accent,
                  }))}
                  emptyText="Za posledních 24 h bez výkonů."
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Trend výkonů — 7 dní</SectionLabel>
                {opsTrend.length > 0 ? (
                  <ColumnChart
                    items={opsTrend.map((d, i) => ({
                      label: d.t,
                      value: d.v,
                      color: C.accent,
                      highlight: i === opsTrend.length - 1,
                    }))}
                    height={140}
                  />
                ) : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
              </Card>
            </div>

            {/* Row 3: Scatter + Interval compare + Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony vs. využití — srovnání sálů</SectionLabel>
                <ScatterGrid
                  xLabel="Výkony / 24 h"
                  yLabel="Využití %"
                  points={scatterData.map(d => ({
                    label: d.name ?? '—',
                    x: d.ops,
                    y: d.util,
                    size: d.queue,
                    color: d.util >= 80 ? C.green : d.util >= 50 ? C.yellow : d.util > 0 ? C.orange : C.red,
                  }))}
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Průměrný počet výkonů dle dne v týdnu</SectionLabel>
                {intervalCompare.length > 0 ? (
                  <ColumnChart
                    items={intervalCompare.map(d => ({
                      label: d.t,
                      value: d.v,
                      color: d.v >= 80 ? C.green : d.v >= 60 ? C.accent : d.v >= 40 ? C.yellow : C.orange,
                    }))}
                    height={140}
                  />
                ) : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
              </Card>
            </div>

            {/* Row 4: Working hours overview per room */}
            <Card className="p-5">
              <SectionLabel>Přehled pracovních dob sálů (dnešní den)</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                {rooms.map(r => {
                  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  const hours = getRoomWorkingHours(r, todayIndex);
                  const workingMins = getRoomWorkingMinutes(r, todayIndex);
                  const opsInHours = countOperationsInWorkingHours(r, statusHistory, period);
                  const util = calculateRoomUtilization(r, statusHistory, period);
                  
                  return (
                    <div key={r.id} className="p-3 rounded-lg" style={{ background: C.ghost, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: roomStatusColor(r) }} />
                          <span className="text-xs font-bold" style={{ color: C.text }}>{r.name}</span>
                        </div>
                      </div>
                      <p className="text-[10px] mb-2" style={{ color: C.faint }}>{r.department}</p>
                      
                      {/* Working hours */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock className="w-3 h-3" style={{ color: hours.enabled ? C.accent : C.faint }} />
                        <span className="text-xs font-bold" style={{ color: hours.enabled ? C.text : C.faint }}>
                          {hours.enabled 
                            ? `${hours.startHour.toString().padStart(2,'0')}:${hours.startMinute.toString().padStart(2,'0')} – ${hours.endHour.toString().padStart(2,'0')}:${hours.endMinute.toString().padStart(2,'0')}`
                            : 'Zavřeno'}
                        </span>
                        {hours.enabled && (
                          <span className="text-[10px] ml-auto" style={{ color: C.muted }}>
                            ({Math.round(workingMins / 60)}h {workingMins % 60}m)
                          </span>
                        )}
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Operace</p>
                          <p className="text-sm font-bold" style={{ color: C.accent }}>{opsInHours}</p>
                        </div>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Využití</p>
                          <p className="text-sm font-bold" style={{ color: util >= 80 ? C.green : util >= 50 ? C.yellow : C.orange }}>{getRoomTotalWorkingMinutes(r, period) > 0 ? `${util}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Fronta</p>
                          <p className="text-sm font-bold" style={{ color: r.queueCount > 0 ? C.yellow : C.green }}>{r.queueCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        )}

        {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
        {(tab==='finance') && (
          <div key="finance" className="space-y-5 print-section">
            <FinanceTab
              rooms={allRooms}
              totalOps={totalOps}
              avgUtilization={avgUtil}
              periodLabel={period}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              notifications={notifications}
            />
          </div>
        )}

        {/* ── Hodinové sazby — samostatná záložka ── */}
        {(tab==='sazby') && (
          <div key="sazby" className="space-y-5 print-section">
            <FinanceTab
              rooms={allRooms}
              totalOps={totalOps}
              avgUtilization={avgUtil}
              periodLabel={period}
              statusHistory={allStatusHistory}
              notifications={notifications}
              view="rates"
            />
          </div>
        )}

        {/* ── Sály — propracovaný RoomsTab ── */}
        {(tab==='saly') && (
          <div key="saly" className="space-y-5 print-section">
            <RoomsTab
              rooms={allRooms}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              periodLabel={period}
              onRoomSelect={setSelectedRoom}
              calculateRoomUtilization={calculateRoomUtilization}
              countOperationsInWorkingHours={countOperationsInWorkingHours}
              calculateRoomUtilizationForDay={calculateRoomUtilizationForDay}
              countOperationsForDay={countOperationsForDay}
              workflowSteps={WORKFLOW_STEPS}
            />
          </div>
        )}

        {/* ── Fáze — propracovaný PhasesTab ── */}
        {(tab==='faze') && (
          <div key="faze" className="space-y-5 print-section">
            <PhasesTab
              rooms={allRooms}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              periodLabel={period}
              workflowSteps={WORKFLOW_STEPS}
              avgStepDurations={avgStepDurations}
              workflowAgg={workflowAgg}
            />
          </div>
        )}

        {/* ── Notifikace ── (nový tab) */}
        {(tab==='notifikace') && (
        <div key="notifikace" className="flex flex-col gap-5 print-section">
          <NotificationsTab
            notifications={notifications}
            statusHistory={allStatusHistory}
            calendarHistory={allDayHistory}
            rooms={allRooms}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        {/* ── Zařízení ── (nový tab) */}
        {(tab==='zarizeni') && (
        <div key="zarizeni" className="flex flex-col gap-5 print-section">
          <DevicesTab
            devices={devices}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        </div>

      </div>
      )}
      {/* ── Room detail panel (shared mobile + desktop) �����─ */}
      {selectedRoom&&(
        <RoomDetailPanel room={selectedRoom} onClose={()=>setSelectedRoom(null)} workflowSteps={WORKFLOW_STEPS}/>
      )}
    </StatisticsReportContext.Provider>
  );
};

export default memo(StatisticsModule);
