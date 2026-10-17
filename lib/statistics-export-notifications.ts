import type { NotificationLogRow } from './db';

/** Existing Statistics / Notifications labels; report aliases share one category. */
const NOTIFICATION_DETAILS: Readonly<Record<string, { label: string; color: string; incident: boolean }>> = {
  emergency: { label: 'Stav nouze', color: '#EF4444', incident: true },
  late_surgeon: { label: 'Pozdní příchod operatéra', color: '#F97316', incident: true },
  late_anesthesiologist: { label: 'Pozdní příchod anesteziologa', color: '#FBBF24', incident: true },
  late_arrival: { label: 'Pozdní příjezd na sál', color: '#A78BFA', incident: true },
  patient_not_ready: { label: 'Nepřipravený pacient', color: '#EC4899', incident: true },
  infectious_patient: { label: 'Infekční pacient', color: '#14B8A6', incident: true },
  daily_report: { label: 'Denní provozní report', color: '#06B6D4', incident: false },
  statistics: { label: 'Statistický přehled', color: '#10B981', incident: false },
  other: { label: 'Jiný důvod', color: '#6B7280', incident: true },
};

export interface StatisticsExportNotificationType {
  type: string;
  label: string;
  color: string;
  count: number;
  sharePercent: number;
}

export interface StatisticsExportNotificationRoom {
  roomName: string;
  count: number;
  lateSurgeon: number;
  lateAnesthesiologist: number;
  lateArrival: number;
  patientNotReady: number;
  emergency: number;
  other: number;
}

export interface StatisticsExportNotificationSummary {
  total: number;
  /** Known warning categories only; unknown legacy types are not diagnosed. */
  incidentCount: number;
  types: StatisticsExportNotificationType[];
  rooms: StatisticsExportNotificationRoom[];
}

export function normalizeStatisticsExportNotificationType(type: string): string {
  const normalized = type.trim().toLowerCase()
    .replace(/^notify[\s_-]+/, '')
    .replace(/[\s-]+/g, '_') || 'other';
  if (normalized === 'emergencies') return 'emergency';
  if (normalized === 'daily_reports') return 'daily_report';
  return normalized;
}

export function statisticsExportNotificationLabel(type: string): string {
  const normalized = normalizeStatisticsExportNotificationType(type);
  const known = Object.hasOwn(NOTIFICATION_DETAILS, normalized) ? NOTIFICATION_DETAILS[normalized] : undefined;
  if (known) return known.label;
  const readable = normalized.replace(/_/g, ' ').trim() || 'Jiný důvod';
  return readable.charAt(0).toLocaleUpperCase('cs-CZ') + readable.slice(1);
}

function visibleRoomName(value: string | null, id: string | null): string | null {
  const trimmed = value?.trim();
  // Some legacy resolvers fall back to the database ID. It is not a room name.
  if (!trimmed || trimmed === id || /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Summarise already scoped, unique log rows. A recorded alert is counted even
 * without an e-mail recipient; logs do not prove delivery or delay duration.
 * Neither IDs nor the potentially sensitive custom reason leave this helper.
 */
export function summarizeStatisticsExportNotifications(
  logs: readonly NotificationLogRow[],
  resolveRoomName: (id: string | null, historicalName: string | null) => string,
): StatisticsExportNotificationSummary {
  const types = new Map<string, StatisticsExportNotificationType>();
  const rooms = new Map<string, StatisticsExportNotificationRoom>();
  let incidentCount = 0;

  for (const log of logs) {
    const type = normalizeStatisticsExportNotificationType(log.notification_type);
    const details = Object.hasOwn(NOTIFICATION_DETAILS, type) ? NOTIFICATION_DETAILS[type] : undefined;
    if (details?.incident) incidentCount++;
    const category = types.get(type) ?? {
      type,
      label: statisticsExportNotificationLabel(type),
      color: details?.color ?? '#60A5FA',
      count: 0,
      sharePercent: 0,
    };
    category.count++;
    types.set(type, category);

    const roomName = visibleRoomName(resolveRoomName(log.room_id, log.room_name), log.room_id)
      ?? visibleRoomName(log.room_name, log.room_id)
      ?? (log.room_id ? 'Archivovaný sál — název nedostupný' : 'Bez přiřazení sálu');
    const key = log.room_id ? `id:${log.room_id}` : `name:${roomName}`;
    const room = rooms.get(key) ?? {
      roomName,
      count: 0,
      lateSurgeon: 0,
      lateAnesthesiologist: 0,
      lateArrival: 0,
      patientNotReady: 0,
      emergency: 0,
      other: 0,
    };
    room.count++;
    switch (type) {
      case 'late_surgeon': room.lateSurgeon++; break;
      case 'late_anesthesiologist': room.lateAnesthesiologist++; break;
      case 'late_arrival': room.lateArrival++; break;
      case 'patient_not_ready': room.patientNotReady++; break;
      case 'emergency': room.emergency++; break;
      default: room.other++;
    }
    rooms.set(key, room);
  }

  const compare = (a: { count: number }, b: { count: number }) => b.count - a.count;
  return {
    total: logs.length,
    incidentCount,
    types: [...types.values()]
      .map(item => ({ ...item, sharePercent: item.count / logs.length * 100 }))
      .sort((a, b) => compare(a, b) || a.label.localeCompare(b.label, 'cs-CZ')),
    rooms: [...rooms.values()]
      .sort((a, b) => compare(a, b) || a.roomName.localeCompare(b.roomName, 'cs-CZ')),
  };
}
