export type RoomScheduleDayPart = 'AM' | 'PM';
export type RoomScheduleAllocationKind = 'SPECIALTY' | 'CLOSED' | 'SERVICE';

export const ROOM_SCHEDULE_SYSTEM_OPTIONS = {
  CLOSED: { id: 'system-closed', name: 'Sál uzavřen', color: '#64748B' },
  SERVICE: { id: 'system-service', name: 'Servis', color: '#F59E0B' },
} as const;

export interface CurrentRoomSpecialty {
  departmentId: string;
  name: string;
  color: string;
  dayPart: RoomScheduleDayPart | 'FULL_DAY';
}

export const ROOM_SPECIALTY_COLORS = [
  '#06B6D4', '#2563EB', '#7C3AED', '#C026D3', '#DB2777', '#E11D48',
  '#EA580C', '#D97706', '#65A30D', '#059669', '#0D9488', '#0891B2',
  '#4F46E5', '#9333EA', '#BE185D', '#DC2626', '#F59E0B', '#84CC16',
  '#10B981', '#14B8A6', '#0284C7', '#6366F1', '#A855F7', '#F43F5E',
] as const;

export function roomSpecialtyColor(index: number) {
  return ROOM_SPECIALTY_COLORS[index % ROOM_SPECIALTY_COLORS.length];
}

export function currentScheduleDayPart(date = new Date()): RoomScheduleDayPart {
  return date.getHours() < 12 ? 'AM' : 'PM';
}

export function localScheduleDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
