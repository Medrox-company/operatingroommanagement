import type { OperatingRoom } from '../types';

type DisplayStatus = { name?: string; title?: string; accent_color?: string; color?: string };
export type MobileRoomFilter = 'all' | 'active' | 'ready';

export const normalizeRoomSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs-CZ').trim();

/** The position is in the enabled workflow, not its original database order. */
export function mobileRoomPhase(room: OperatingRoom, statuses: readonly DisplayStatus[]) {
  const status = statuses[room.currentStepIndex];
  const title = status?.title || status?.name || 'Stav není k dispozici';
  const ready = status
    ? normalizeRoomSearch(status.name || title).includes('pripraven')
    : room.currentStepIndex === 0 || room.currentStepIndex === 7;
  if (room.isEmergency) return { title: 'Nouzový stav', color: '#E5484D', ready: false, active: false };
  if (room.isLocked) return { title: 'Sál uzamčen', color: '#B88512', ready: false, active: false };
  if (room.isPaused) return { title: 'Pauza', color: '#20ACD5', ready: false, active: true };
  return { title, color: status?.accent_color || status?.color || '#7890A8', ready, active: !ready && !!status };
}

export function filterMobileRooms(rooms: readonly OperatingRoom[], statuses: readonly DisplayStatus[], filter: MobileRoomFilter, search: string) {
  const query = normalizeRoomSearch(search);
  return rooms.filter(room => {
    const phase = mobileRoomPhase(room, statuses);
    return (filter === 'all' || phase[filter])
      && (!query || normalizeRoomSearch(`${room.name} ${room.department}`).includes(query));
  });
}

export function mobileElapsed(start: string | null | undefined, now: number) {
  const startMs = start ? new Date(start).getTime() : NaN;
  if (!Number.isFinite(startMs)) return '—';
  const minutes = Math.max(0, Math.floor((now - startMs) / 60_000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function mobileEndTime(value: string | undefined) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—';
}
