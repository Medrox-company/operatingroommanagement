/** Clinical urgency is clinician-selected; operational rank never changes it. */
export type AcuteUrgency = 'emergent' | 'urgent' | 'expedited';
export type AcuteStatus = 'pending' | 'acknowledged' | 'completed' | 'cancelled';
export const ACUTE_INPUT_LIMITS = { procedureName: 160, department: 100, reference: 80, description: 2000, reason: 500, durationMin: 1, durationMax: 1440 } as const;
export const ACUTE_URGENCY_LABELS: Record<AcuteUrgency, string> = {
  emergent: 'Emergentní', urgent: 'Urgentní', expedited: 'Časný / odložitelný',
};

export interface AcuteRequestInput {
  reference: string;
  procedureName: string;
  department: string;
  description: string;
  urgency: AcuteUrgency;
  estimatedDurationMinutes: number;
  clinicalDecisionAt: string | null;
  latestStartAt: string | null;
  proposedRoomId: string | null;
  proposedStartAt: string | null;
}

export interface AcuteRequest extends AcuteRequestInput {
  id: string;
  hospitalId: string;
  receivedAt: string;
  status: AcuteStatus;
  queuePosition: number | null;
  /** Original queue position recorded in the immutable create event, not today's rank. */
  submissionPosition?: number | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdBy: string;
  updatedAt: string;
  revision: number;
}

export interface AcuteRequestEvent {
  id: string;
  requestId: string;
  action: 'create' | 'update' | 'acknowledge' | 'reorder' | 'cancel' | 'complete';
  actorId: string;
  actorName: string;
  occurredAt: string;
  reason: string;
  previousPosition: number | null;
  newPosition: number | null;
  changes: Record<string, unknown>;
}

export interface AcuteSnapshot {
  requests: AcuteRequest[];
  events: AcuteRequestEvent[];
  revision: number;
  canManage: boolean;
  historyLimited: boolean;
}

export type AcuteCommand = { expectedRevision: number } & (
  | { action: 'create'; input: AcuteRequestInput }
  | { action: 'update'; requestId: string; input: AcuteRequestInput; reason: string }
  | { action: 'acknowledge'; requestId: string }
  | { action: 'reorder'; orderedIds: string[]; reason: string }
  | { action: 'cancel' | 'complete'; requestId: string; reason: string }
);

export class AcuteValidationError extends Error {}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MUTATING_ROLES = new Set(['superadmin', 'admin', 'aro', 'cos', 'primar']);
export function canManageAcuteRequests(role: string): boolean { return MUTATING_ROLES.has(role); }
export function isActiveAcuteRequest(request: Pick<AcuteRequest, 'status'>): boolean {
  return request.status === 'pending' || request.status === 'acknowledged';
}
export function acuteWaitingMinutes(request: Pick<AcuteRequest, 'receivedAt'>, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(request.receivedAt)) / 60_000));
}
export function sortAcuteRequests(requests: AcuteRequest[]): AcuteRequest[] {
  return [...requests].sort((a, b) => (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER) || a.receivedAt.localeCompare(b.receivedAt));
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AcuteValidationError('Neplatný formát požadavku.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, maximum: number, required = false): string {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new AcuteValidationError(`${label}: očekáván text.`);
  const trimmed = value.trim();
  if (trimmed.length > maximum || (required && !trimmed) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(trimmed)) {
    throw new AcuteValidationError(`${label}: doplňte platnou hodnotu (nejvýše ${maximum} znaků).`);
  }
  return trimmed;
}
function timestamp(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new AcuteValidationError(`${label}: neplatné datum a čas s časovým pásmem.`);
  }
  const parsed = new Date(value);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new AcuteValidationError(`${label}: neplatný kalendářní den.`);
  if (parsed.getUTCFullYear() < 2000 || parsed.getUTCFullYear() > 2100) throw new AcuteValidationError(`${label}: neplatný rok.`);
  return parsed.toISOString();
}
function requestId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new AcuteValidationError('Neplatný identifikátor akutního požadavku.');
  return value;
}
export function validateAcuteRequestInput(value: unknown, now = Date.now()): AcuteRequestInput {
  const input = record(value);
  const urgency = input.urgency;
  if (urgency !== 'emergent' && urgency !== 'urgent' && urgency !== 'expedited') throw new AcuteValidationError('Vyberte naléhavost stanovenou lékařem.');
  const duration = input.estimatedDurationMinutes;
  if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 1 || duration > 1440) throw new AcuteValidationError('Předpokládaný chirurgický výkon musí trvat 1–1440 celých minut.');
  const clinicalDecisionAt = timestamp(input.clinicalDecisionAt, 'Čas klinického rozhodnutí');
  const latestStartAt = timestamp(input.latestStartAt, 'Nejzazší zahájení');
  const proposedStartAt = timestamp(input.proposedStartAt, 'Navržené zahájení');
  const proposedRoomId = input.proposedRoomId === null || input.proposedRoomId === undefined || input.proposedRoomId === '' ? null : text(input.proposedRoomId, 'Operační sál', 100, true);
  if (clinicalDecisionAt && Date.parse(clinicalDecisionAt) > now + 60_000) throw new AcuteValidationError('Klinické rozhodnutí nemůže být v budoucnosti.');
  if (latestStartAt && clinicalDecisionAt && Date.parse(latestStartAt) < Date.parse(clinicalDecisionAt)) throw new AcuteValidationError('Nejzazší zahájení nemůže předcházet klinickému rozhodnutí.');
  if (proposedStartAt && !proposedRoomId) throw new AcuteValidationError('K navrženému času vyberte také sál.');
  return {
    reference: text(input.reference, 'Interní reference', 80), procedureName: text(input.procedureName, 'Název výkonu', 160, true),
    department: text(input.department, 'Obor', 100, true), description: text(input.description, 'Popis', 2000), urgency,
    estimatedDurationMinutes: duration, clinicalDecisionAt, latestStartAt, proposedRoomId, proposedStartAt,
  };
}
export function validateAcuteCommand(value: unknown, now = Date.now()): AcuteCommand {
  const command = record(value);
  if (!Number.isSafeInteger(command.expectedRevision) || Number(command.expectedRevision) < 0) throw new AcuteValidationError('Chybí platná revize pořadníku. Obnovte stránku.');
  const expectedRevision = command.expectedRevision as number;
  const reason = () => text(command.reason, 'Důvod změny', 500, true);
  switch (command.action) {
    case 'create': return { action: 'create', expectedRevision, input: validateAcuteRequestInput(command.input, now) };
    case 'update': return { action: 'update', expectedRevision, requestId: requestId(command.requestId), input: validateAcuteRequestInput(command.input, now), reason: reason() };
    case 'acknowledge': return { action: 'acknowledge', expectedRevision, requestId: requestId(command.requestId) };
    case 'cancel': case 'complete': return { action: command.action, expectedRevision, requestId: requestId(command.requestId), reason: reason() };
    case 'reorder': {
      if (!Array.isArray(command.orderedIds) || command.orderedIds.length < 1 || command.orderedIds.length > 500) throw new AcuteValidationError('Neplatné pořadí akutních požadavků.');
      const orderedIds = command.orderedIds.map(requestId);
      if (new Set(orderedIds).size !== orderedIds.length) throw new AcuteValidationError('Požadavek se v pořadí opakuje.');
      return { action: 'reorder', expectedRevision, orderedIds, reason: reason() };
    }
    default: throw new AcuteValidationError('Neznámá změna akutního požadavku.');
  }
}
