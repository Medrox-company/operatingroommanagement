import type { OperatingRoom } from '../types';
import type { TimelineScheduleRow } from './db';

export type TimelineOperationalWarning =
  | { type: 'overdue'; roomId: string; estimatedEndMs: number; minutesOverdue: number }
  | { type: 'missing_staff'; roomId: string; missingRoles: Array<'doctor' | 'nurse'> }
  | {
      type: 'schedule_collision';
      roomId: string;
      scheduleIds: [string, string];
      overlapStartMs: number;
      overlapEndMs: number;
      overlapMinutes: number;
    };

export type TimelineWorkflowStatus = { id?: string; name?: string; title?: string };

export function describeTimelineOperationalWarning(warning: TimelineOperationalWarning): string {
  if (warning.type === 'overdue') {
    return `Odhad konce překročen o ${warning.minutesOverdue} min`;
  }
  if (warning.type === 'missing_staff') {
    const roles = warning.missingRoles.map(role => role === 'doctor' ? 'ARO lékař' : 'ARO sestra');
    return `Chybí ${roles.join(' a ')}`;
  }
  const start = new Date(warning.overlapStartMs).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(warning.overlapEndMs).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  return `Kolize plánovaných výkonů ${start}–${end}`;
}

type PlannedInterval = { id: string; startMs: number; endMs: number };

const OVERDUE_GRACE_MS = 5 * 60_000;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clinicalName = /anestezi|chirurg|operac|vykon|prijezd na sal/;
const nonClinicalName = /pripraven|uklid|dezinfek|cisteni|pauza|volani|prijezd.*trakt/;
const nonClinicalIds = new Set([
  'sal_pripraven', 'sal_pripraven_po_uklidu', 'uklid_salu',
  'volani_pacienta', 'prijezd_do_traktu', 'pauza',
]);

function isClinicalRoom(room: OperatingRoom, statuses: readonly TimelineWorkflowStatus[], nowMs: number): boolean {
  if (room.isLocked || room.isPaused || !Number.isInteger(room.currentStepIndex) || room.currentStepIndex <= 0) return false;
  const startedMs = room.operationStartedAt ? Date.parse(room.operationStartedAt) : NaN;
  if (!Number.isFinite(startedMs) || startedMs > nowMs) return false;

  // currentStepIndex is an array position in the enabled workflow, not order_index.
  const status = statuses[room.currentStepIndex];
  const id = normalize(status?.id || '');
  const name = normalize(status?.name || status?.title || '');
  if (nonClinicalIds.has(id) || nonClinicalName.test(name)) return false;
  if (clinicalName.test(name)) return true;
  // Legacy or unnamed workflow: the seeded clinical steps are 1–5.
  return room.currentStepIndex >= 1 && room.currentStepIndex <= 5;
}

function plannedInterval(row: TimelineScheduleRow): PlannedInterval | null {
  if (!row.id || row.status?.trim().toUpperCase() !== 'PLANNED'
    || !Number.isFinite(row.duration_minutes) || (row.duration_minutes ?? 0) <= 0) return null;

  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.scheduled_date || '');
  const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(row.scheduled_time || '');
  if (!date || !time) return null;

  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  const second = Number(time[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return null;

  // Schedule date/time are local wall-clock fields; Date.parse would treat a
  // bare date as UTC and shift Czech schedules near midnight.
  const start = new Date(year, month - 1, day, hour, minute, second);
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day
    || start.getHours() !== hour || start.getMinutes() !== minute || start.getSeconds() !== second) return null;
  const startMs = start.getTime();
  const endMs = startMs + row.duration_minutes! * 60_000;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { id: row.id, startMs, endMs };
}

/** Pure snapshot of actionable warnings. No estimated or inferred plan intervals. */
export function deriveTimelineOperationalWarnings(
  rooms: readonly OperatingRoom[],
  schedules: readonly TimelineScheduleRow[] | null | undefined,
  nowMs: number,
  statuses: readonly TimelineWorkflowStatus[],
  operationalWindow?: { startMs: number; endMs: number },
): Map<string, TimelineOperationalWarning[]> {
  const result = new Map<string, TimelineOperationalWarning[]>();
  const roomIds = new Set(rooms.map(room => room.id));
  const add = (warning: TimelineOperationalWarning) => {
    const list = result.get(warning.roomId);
    if (list) list.push(warning);
    else result.set(warning.roomId, [warning]);
  };

  if (Number.isFinite(nowMs)) {
    for (const room of rooms) {
      if (!isClinicalRoom(room, statuses, nowMs)) continue;
      const startedMs = Date.parse(room.operationStartedAt!);
      const estimatedEndMs = room.estimatedEndTime ? Date.parse(room.estimatedEndTime) : NaN;
      if (Number.isFinite(estimatedEndMs) && estimatedEndMs > startedMs
        && nowMs - estimatedEndMs >= OVERDUE_GRACE_MS) {
        add({ type: 'overdue', roomId: room.id, estimatedEndMs,
          minutesOverdue: Math.floor((nowMs - estimatedEndMs) / 60_000) });
      }

      const missingRoles: Array<'doctor' | 'nurse'> = [];
      if (!room.staff?.doctor?.name?.trim()) missingRoles.push('doctor');
      if (!room.staff?.nurse?.name?.trim()) missingRoles.push('nurse');
      if (missingRoles.length) add({ type: 'missing_staff', roomId: room.id, missingRoles });
    }
  }

  const plannedByRoom = new Map<string, PlannedInterval[]>();
  for (const row of schedules || []) {
    const roomId = row.operating_room_id;
    if (!roomId || !roomIds.has(roomId)) continue;
    const interval = plannedInterval(row);
    if (!interval) continue;
    const list = plannedByRoom.get(roomId);
    if (list) list.push(interval);
    else plannedByRoom.set(roomId, [interval]);
  }

  for (const [roomId, intervals] of plannedByRoom) {
    intervals.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length && intervals[j].startMs < intervals[i].endMs; j++) {
        if (intervals[i].id === intervals[j].id) continue;
        const overlapStartMs = intervals[j].startMs;
        const overlapEndMs = Math.min(intervals[i].endMs, intervals[j].endMs);
        if (overlapEndMs <= overlapStartMs) continue;
        if (operationalWindow && (overlapEndMs <= operationalWindow.startMs
          || overlapStartMs >= operationalWindow.endMs)) continue;
        add({ type: 'schedule_collision', roomId,
          scheduleIds: [intervals[i].id, intervals[j].id],
          overlapStartMs, overlapEndMs,
          overlapMinutes: (overlapEndMs - overlapStartMs) / 60_000 });
      }
    }
  }
  return result;
}
