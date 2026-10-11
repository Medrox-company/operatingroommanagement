import type { OperatingRoom } from '../types';

export type DashboardView = 'cards' | 'spatial' | 'carousel';
type DisplayStatus = { name?: string; title?: string; color?: string; accent_color?: string };

export function resolveDashboardView(saved: string | null, canViewSpatial: boolean): DashboardView {
  if (saved === 'carousel') return 'carousel';
  return saved === 'spatial' && canViewSpatial ? 'spatial' : 'cards';
}

function elapsedMinutes(start: string | null | undefined, now: number): number | null {
  const timestamp = start ? Date.parse(start) : NaN;
  return Number.isFinite(timestamp) && timestamp <= now ? Math.floor((now - timestamp) / 60_000) : null;
}

/** Read-only projection of the same enabled workflow and operational day as room cards. */
export function carouselRoomPresentation(
  room: OperatingRoom,
  statuses: readonly DisplayStatus[],
  day: { start: number; end: number },
  now: number,
) {
  const index = Math.max(0, Math.min(room.currentStepIndex, statuses.length - 1));
  const status = statuses[index];
  const name = (status?.name || status?.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ready = name.includes('pripraven');
  const state = room.isEmergency ? 'emergency' : room.isLocked ? 'locked' : room.isPaused ? 'paused' : 'phase';
  const title = state === 'emergency' ? 'Nouzový stav' : state === 'locked' ? 'Sál uzamčen' : state === 'paused' ? 'Pauza' : status?.title || status?.name || 'Stav není k dispozici';
  const color = state === 'emergency' ? '#FF3B30' : state === 'locked' ? '#FBBF24' : state === 'paused' ? '#22D3EE' : status?.accent_color || status?.color || '#7890A8';
  const count = (room.completedOperations ?? []).filter(operation => {
    const ended = Date.parse(operation.endedAt);
    return Number.isFinite(ended) && ended >= day.start && ended <= day.end;
  }).length;
  const latestSegment = room.statusHistory?.[room.statusHistory.length - 1];
  const phaseStart = room.phaseStartedAt || (latestSegment?.stepIndex === room.currentStepIndex ? latestSegment.startedAt : null);
  return {
    title, color, state, count,
    progress: status ? (index + 1) / statuses.length : 0,
    phasePosition: status ? `${index + 1} / ${statuses.length}` : '—',
    phaseMinutes: ready || !status ? null : elapsedMinutes(phaseStart, now),
    cycleMinutes: ready || !status ? null : elapsedMinutes(room.operationStartedAt, now),
  };
}

/** Keep the selected real room when data refreshes/reorders; never retain another facility's ID. */
export function carouselSelection(rooms: readonly Pick<OperatingRoom, 'id'>[], selectedId: string | null) {
  const index = rooms.findIndex(room => room.id === selectedId);
  return Math.max(0, index);
}

/** Logical turns stay unbounded: crossing the seam rotates one step, not an entire lap back. */
export function carouselWrappedIndex(turn: number, count: number) {
  return count > 0 ? ((turn % count) + count) % count : 0;
}

/** A direct room choice takes the shortest route around the ring. */
export function carouselTurnToIndex(turn: number, index: number, count: number) {
  if (count <= 1) return 0;
  const forward = carouselWrappedIndex(index - carouselWrappedIndex(turn, count), count);
  return turn + (forward > count / 2 ? forward - count : forward);
}

/** Same wrapped coverflow placement as SettingsPage; only the selected card is interactive. */
export function carouselCardPlacement(index: number, selectedIndex: number, count: number) {
  let distance = count > 1 ? index - selectedIndex : 0;
  if (distance > count / 2) distance -= count;
  if (distance < -count / 2) distance += count;
  const depth = Math.abs(distance);
  return {
    distance, depth,
    visible: depth <= 4,
    scale: Math.max(.68, 1 - depth * .095),
    opacity: depth <= 4 ? Math.max(.18, 1 - depth * .18) : 0,
    brightness: Math.max(.42, 1 - depth * .13),
    zIndex: 20 - depth,
  };
}

/** Keep the centered Settings composition only while real clinical content fits around the header. */
export function carouselContentFits(height: number, cardHeight: number, headingBottom: number, chooserHeight: number) {
  const centeredRoom = 2 * Math.min(height / 2 - headingBottom - 24, height / 2 - chooserHeight - 48);
  return height >= 700 && cardHeight <= centeredRoom;
}
