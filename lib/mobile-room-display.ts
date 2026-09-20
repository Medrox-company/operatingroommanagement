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

/**
 * Barva písma pro barevný pruh statusu.
 *
 * Barvy statusů si nastavuje nemocnice sama — od skoro bílé (#00FFEE) po tmavě
 * modrou (#0049F5) — takže písmo nejde zvolit napevno. Navíc je pruh průsvitný,
 * takže se barva mísí s podkladem karty; kdyby se inkoust vybíral ze syté barvy
 * statusu, u středních tónů by výsledek neseděl. Proto se nejdřív spočítá, jak
 * pruh doopravdy vypadá po smíchání, a teprve z toho se vybere písmo.
 *
 * @param alpha krytí pruhu (0–1); 1 = neprůhledný
 * @param surface barva pod pruhem, tedy plocha karty
 */
export function readableInk(color: string | undefined, alpha = 1, surface = '#FFFFFF') {
  const channels = parseColorChannels(color);
  if (!channels) return '#05070F';
  const behind = parseColorChannels(surface) ?? [255, 255, 255];
  const composited = channels.map((value, i) => value * alpha + behind[i] * (1 - alpha)) as [number, number, number];
  const background = relativeLuminance(composited);
  // Pevná mez u poloviny jasu selhává na středních tónech (#ff791a, #06B6D4),
  // kde bílá dává sotva 2,5:1. Vybírá se proto ta z dvojice, která má vyšší
  // kontrast — u oranžové vyhraje tmavá, u vínové bílá.
  const onDark = contrastRatio(background, relativeLuminance([255, 255, 255]));
  const onLight = contrastRatio(background, relativeLuminance([5, 7, 15]));
  return onLight >= onDark ? '#05070F' : '#FFFFFF';
}

function relativeLuminance([r, g, b]: [number, number, number]) {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(a: number, b: number) {
  const [high, low] = a > b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
}

function parseColorChannels(color: string | undefined): [number, number, number] | null {
  if (!color) return null;
  const value = color.trim();
  const hex = value.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16)) as [number, number, number];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  }
  const parts = value.match(/[\d.]+/g);
  if (parts && parts.length >= 3) {
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }
  return null;
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
