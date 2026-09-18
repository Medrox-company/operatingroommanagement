import type { OperatingRoom } from '../types';
import type { StatusHistoryRow } from './db';

export type StatisticsWindow = { start: Date; end: Date };
export const STATISTICS_ROOM_SCOPE_NOTE = 'Pouze sály s plánovaným nebo doloženým provozem ve vybraném období. Bez známé kapacity se zachovává naměřený čas i skutečné výkony; vytížení se neodhaduje. Dřívější provozní dobu nelze odvodit ze současného rozvrhu.';
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function statisticsPeriodWindow(period: string, now = new Date()): StatisticsWindow {
  const days = period === 'týden' || period === 'Posledních 7 dní' ? 7
    : period === 'měsíc' || period === 'Posledních 30 dní' ? 30
      : period === 'rok' || period === 'Posledních 365 dní' ? 365 : 1;
  return { start: new Date(now.getTime() - days * 86400000), end: now };
}

export function statisticsDayWindow(day: Date, startHour = 7): StatisticsWindow {
  const start = new Date(day);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Ready, pause and housekeeping alone do not prove that an operation occurred. */
function isOperationalPhase(name: string | null): boolean {
  const value = (name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (!value) return false;
  return !(/pripraven|voln|ready|idle|mimo provoz|udrzb|maintenance|uklid|cleaning|pauza|pause/.test(value));
}

function overlaps(start: number, end: number, window: StatisticsWindow): boolean {
  return Number.isFinite(start) && Number.isFinite(end)
    && end > start && start < window.end.getTime() && end > window.start.getTime();
}

export function hasStatisticsRoomCapacity(room: OperatingRoom, window: StatisticsWindow): boolean {
  const cursor = new Date(window.start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < window.end) {
    const hours = room.weeklySchedule?.[DAYS[cursor.getDay()]];
    if (hours?.enabled) {
      const fields = [hours.startHour, hours.startMinute, hours.endHour, hours.endMinute];
      if (fields.every(Number.isFinite)) {
        const start = new Date(cursor);
        const end = new Date(cursor);
        start.setHours(hours.startHour, hours.startMinute, 0, 0);
        end.setHours(hours.endHour, hours.endMinute, 0, 0);
        const gross = (end.getTime() - start.getTime()) / 60000;
        const pause = Number.isFinite(hours.breakMinutes) ? Math.max(0, hours.breakMinutes ?? 0) : 0;
        if (gross > pause && overlaps(start.getTime(), end.getTime(), window)) return true;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/**
 * Derive scope from already loaded evidence; never query all-time history or
 * use staff assignments, notifications or a ready status as operational proof.
 * All room candidates must reach this helper BEFORE a local calendar filters them.
 */
export function scopeStatisticsRooms(
  candidates: OperatingRoom[], history: StatusHistoryRow[], window: StatisticsWindow, now = new Date(),
): { rooms: OperatingRoom[]; roomIds: Set<string>; history: StatusHistoryRow[] } {
  const evidence = new Set<string>();
  const operations = new Map<string, { start: number | null }>();
  const ordered = [...history].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  for (const event of ordered) {
    const at = Date.parse(event.timestamp);
    if (!Number.isFinite(at)) continue;
    const inside = at >= window.start.getTime() && at < window.end.getTime();
    if (event.event_type === 'operation_start') {
      operations.set(event.operating_room_id, { start: at });
      if (inside) evidence.add(event.operating_room_id);
    } else if (event.event_type === 'operation_end' || event.event_type === 'operation_completed') {
      const start = operations.get(event.operating_room_id)?.start;
      const metadataEnd = typeof event.metadata?.endedAt === 'string' ? Date.parse(event.metadata.endedAt) : at;
      const duration = event.duration_seconds;
      const archivedStart = typeof event.metadata?.startedAt === 'string' ? Date.parse(event.metadata.startedAt)
        : typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? metadataEnd - duration * 1000 : NaN;
      const hasArchive = event.event_type === 'operation_completed' && Number.isFinite(archivedStart) && Number.isFinite(metadataEnd) && metadataEnd > archivedStart;
      const qualifies = hasArchive ? overlaps(archivedStart, metadataEnd, window)
        : start != null ? overlaps(start, at, window) : inside;
      if (qualifies) evidence.add(event.operating_room_id);
      operations.delete(event.operating_room_id);
    } else if (event.event_type === 'step_change' && isOperationalPhase(event.step_name)) {
      const duration = event.duration_seconds ?? 0;
      if (Number.isFinite(duration) && duration > 0 && overlaps(at - duration * 1000, at, window)) {
        evidence.add(event.operating_room_id);
      }
    }
  }
  const rooms = candidates.filter(room => {
    const start = room.operationStartedAt ? Date.parse(room.operationStartedAt) : NaN;
    const running = room.currentStepIndex > 0
      && overlaps(start, now.getTime(), window);
    const completed = room.completedOperations?.some(operation => overlaps(Date.parse(operation.startedAt), Date.parse(operation.endedAt), window));
    return evidence.has(room.id) || running || completed || hasStatisticsRoomCapacity(room, window);
  });
  const roomIds = new Set(rooms.map(room => room.id));
  // Keep surrounding events for boundary pairing; consumers retain their own
  // existing day/period clipping rules. Exclude evidence for unrelated rooms.
  return { rooms, roomIds, history: history.filter(event => roomIds.has(event.operating_room_id)) };
}
