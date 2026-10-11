import type { AcuteRequest } from '../../lib/acute-requests';
import type { AcuteRequestEvent } from '../../hooks/useAcuteRequests';
import type { OperatingRoom } from '../../types';

export function acuteRoomOptions(rooms: OperatingRoom[]) {
  // Same hospital-scoped rooms prop and saved ordering as OperatingRoomsManager.
  // Room names are configured identities, not guessed specialty abbreviations.
  return [...rooms]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(room => ({ room, label: room.name }));
}

export const URGENCY_LABELS = { emergent: 'Emergentní', urgent: 'Urgentní', expedited: 'Časný' } as const;
export const URGENCY_DESCRIPTIONS = {
  emergent: 'Neodkladný výkon při bezprostředním ohrožení života, končetiny nebo orgánu.',
  urgent: 'Naléhavý výkon vyžadující rychlé zařazení dle klinického rozhodnutí.',
  expedited: 'Časný výkon odložitelný v mezích stanovených lékařem.',
} as const;
export const STATUS_LABELS = { pending: 'Nepřevzato', acknowledged: 'Převzato koordinátorem', completed: 'Požadavek uzavřen', cancelled: 'Požadavek zrušen' } as const;

export function waitingRequestsLabel(count: number): string {
  return `${count} ${count === 1 ? 'čekající požadavek' : count >= 2 && count <= 4 ? 'čekající požadavky' : 'čekajících požadavků'}`;
}

export function urgencyCountLabel(count: number, urgency: AcuteRequest['urgency']): string {
  const label = urgency === 'expedited' ? (count === 1 ? 'časný' : count >= 2 && count <= 4 ? 'časné' : 'časných') : urgency === 'emergent' ? (count < 5 && count > 0 ? 'emergentní' : 'emergentních') : (count < 5 && count > 0 ? 'urgentní' : 'urgentních');
  return `${count} ${label}`;
}

export function activeRequests(requests: AcuteRequest[]): AcuteRequest[] {
  return requests.filter(request => request.status === 'pending' || request.status === 'acknowledged')
    .sort((a, b) => (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER) || a.receivedAt.localeCompare(b.receivedAt));
}

export function wholeWaitingMinutes(receivedAt: string, now: number): number | null {
  const received = Date.parse(receivedAt);
  return Number.isFinite(received) && Number.isFinite(now) ? Math.max(0, Math.round((now - received) / 60_000)) : null;
}

export function latestReorder(requestId: string, events: AcuteRequestEvent[]): AcuteRequestEvent | undefined {
  return events.filter(event => event.requestId === requestId && event.action === 'reorder' && event.previousPosition !== event.newPosition)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
}

export function formatTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Nenastaveno';
  return new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Nenastaveno';
  return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function toLocalInput(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function inputToIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error('Zadejte platné datum a čas.');
  return parsed.toISOString();
}

export function eventLabel(action: string): string {
  return ({ create: 'Požadavek přijat', update: 'Požadavek upraven', acknowledge: 'Převzato koordinátorem', reorder: 'Pořadí změněno', cancel: 'Požadavek zrušen', complete: 'Požadavek uzavřen' } as Record<string, string>)[action] ?? 'Zaznamenaná změna';
}
