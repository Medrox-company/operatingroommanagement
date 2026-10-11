import type { AcuteUrgency } from './acute-requests';

/** Frozen evidence of a real cycle, never the request's projected duration. */
export interface AcuteCycleLink {
  requestId: string;
  hospitalId: string;
  roomId: string;
  operationStartedAt: string;
  startedAt: string;
  startEventId: string;
  endEventId: string | null;
  endedAt: string | null;
  procedureName: string;
  urgency: AcuteUrgency;
  submissionPosition: number | null;
}

export interface AcuteCycleStart {
  requestId: string;
  roomId: string;
  expectedStateRevision: number;
}

export class AcuteCycleValidationError extends Error {}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateAcuteCycleStart(value: unknown): AcuteCycleStart {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AcuteCycleValidationError('Neplatný požadavek na zahájení výkonu.');
  const input = value as Record<string, unknown>;
  if (typeof input.requestId !== 'string' || !UUID.test(input.requestId)) throw new AcuteCycleValidationError('Neplatný akutní požadavek.');
  if (typeof input.roomId !== 'string' || !input.roomId.trim() || input.roomId.length > 100 || /[\u0000-\u001f\u007f]/.test(input.roomId)) {
    throw new AcuteCycleValidationError('Neplatný operační sál.');
  }
  if (!Number.isSafeInteger(input.expectedStateRevision) || Number(input.expectedStateRevision) < 0) throw new AcuteCycleValidationError('Obnovte aktuální stav sálu před zahájením výkonu.');
  return { requestId: input.requestId, roomId: input.roomId, expectedStateRevision: Number(input.expectedStateRevision) };
}

export function validateAcuteCycleWindow(from: string | null, to: string | null): { from: string; to: string } {
  const timestamp = (value: string | null) => value !== null && /^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  if (!timestamp(from) || !timestamp(to)) throw new AcuteCycleValidationError('Vyberte platné období časové osy.');
  const start = Date.parse(from!);
  const end = Date.parse(to!);
  if (end <= start || end - start > 366 * 24 * 60 * 60 * 1_000) throw new AcuteCycleValidationError('Období časové osy musí být nejvýše jeden rok.');
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

/** Room archive uses phase time; immutable history's lifecycle event is +1 ms. */
export function findAcuteCycleLink(
  links: readonly AcuteCycleLink[], roomId: string, startedAt: string, endedAt?: string | null,
): AcuteCycleLink | undefined {
  const start = Date.parse(startedAt);
  const end = endedAt ? Date.parse(endedAt) : null;
  if (!Number.isFinite(start) || (end !== null && !Number.isFinite(end))) return undefined;
  return links.find(link => {
    if (link.roomId !== roomId || (Date.parse(link.startedAt) !== start && Date.parse(link.operationStartedAt) !== start)) return false;
    if (end === null) return link.endedAt === null;
    if (!link.endedAt) return false;
    const canonicalEnd = Date.parse(link.endedAt);
    return canonicalEnd === end || canonicalEnd - 1 === end;
  });
}
