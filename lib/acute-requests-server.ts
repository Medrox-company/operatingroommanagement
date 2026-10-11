import 'server-only';
import { NextResponse } from 'next/server';
import type { HospitalAccess } from './hospital/access';
import { getSupabaseAdmin } from './supabase-server';
import { canManageAcuteRequests, type AcuteSnapshot } from './acute-requests';

export class AcuteServerError extends Error {
  constructor(message: string, public readonly status = 503, public readonly code = 'ACUTE_UNAVAILABLE') { super(message); }
}

/** The expectation binds a tab/draft to its facility; the cookie still authorizes the tenant. */
export function requireAcuteHospitalScope(request: Pick<Request, 'headers'>, access: HospitalAccess): NextResponse | null {
  const expectedHospitalId = request.headers.get('X-Acute-Hospital-Id');
  if (!expectedHospitalId || !/^[a-zA-Z0-9_-]{1,100}$/.test(expectedHospitalId)) {
    return acuteErrorResponse(new AcuteServerError('Chybí platné zařízení požadavku. Obnovte stránku.', 400, 'ACUTE_SCOPE_REQUIRED'));
  }
  if (expectedHospitalId !== access.hospitalId) {
    return acuteErrorResponse(new AcuteServerError('Aktivní zařízení se změnilo v jiné kartě. Obnovte stránku; změna nebyla provedena.', 409, 'ACUTE_SCOPE_CHANGED'));
  }
  return null;
}

/** Module-off is absolute even for a superadministrator. Account claims are rechecked. */
export async function requireAcuteAccess(access: HospitalAccess, mutation = false): Promise<HospitalAccess & { canManage: boolean; actorName: string } | NextResponse> {
  try {
    const db = getSupabaseAdmin();
    // Independent reads share one network phase. Evaluate the account first even
    // if the module read rejects, so revoked-session errors keep their precedence.
    const [accountResult, moduleResult] = await Promise.allSettled([
      db.from('app_users').select('id,name,role,is_active').eq('id', access.user.sub).maybeSingle(),
      db.from('app_modules').select('is_enabled,allowed_roles').eq('id', 'acute-requests').eq('hospital_id', access.hospitalId).maybeSingle(),
    ]);
    if (accountResult.status === 'rejected') throw new AcuteServerError('Aktuální oprávnění nelze ověřit.');
    const { data: account, error: accountError } = accountResult.value;
    if (accountError) throw new AcuteServerError('Aktuální oprávnění nelze ověřit.');
    if (!account || account.is_active !== true || account.role !== access.user.role) {
      throw new AcuteServerError('Účet již nemá přístup. Přihlaste se znovu.', 403, 'ACUTE_FORBIDDEN');
    }
    if (moduleResult.status === 'rejected') throw new AcuteServerError('Oprávnění k modulu akutních výkonů nelze ověřit.');
    const { data: module, error: moduleError } = moduleResult.value;
    if (moduleError) throw new AcuteServerError('Oprávnění k modulu akutních výkonů nelze ověřit.');
    if (!module || module.is_enabled !== true) throw new AcuteServerError('Modul akutních výkonů není v tomto zařízení zapnutý.', 403, 'ACUTE_DISABLED');
    if (access.user.role !== 'superadmin' && (!Array.isArray(module.allowed_roles) || !module.allowed_roles.includes(access.user.role))) {
      throw new AcuteServerError('K modulu akutních výkonů nemáte přidělený přístup.', 403, 'ACUTE_FORBIDDEN');
    }
    const canManage = canManageAcuteRequests(access.user.role);
    if (mutation && !canManage) throw new AcuteServerError('Máte přístup pouze ke čtení akutních požadavků.', 403, 'ACUTE_READ_ONLY');
    return { ...access, canManage, actorName: String(account.name || access.user.name || 'Uživatel').slice(0, 160) };
  } catch (error) { return acuteErrorResponse(error); }
}

export function acuteErrorResponse(error: unknown): NextResponse {
  if (error instanceof AcuteServerError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  const dbError = error && typeof error === 'object' ? error as { message?: string; code?: string } : {};
  const message = dbError.message || '';
  if (message.includes('ACUTE_CONFLICT')) return acuteErrorResponse(new AcuteServerError('Pořadník mezitím změnil jiný uživatel. Obnovte data a změnu opakujte.', 409, 'ACUTE_CONFLICT'));
  if (message.includes('ACUTE_NOT_FOUND')) return acuteErrorResponse(new AcuteServerError('Akutní požadavek neexistuje v tomto zařízení.', 404, 'ACUTE_NOT_FOUND'));
  if (message.includes('ACUTE_FORBIDDEN')) return acuteErrorResponse(new AcuteServerError('Oprávnění bylo změněno. Obnovte stránku.', 403, 'ACUTE_FORBIDDEN'));
  if (message.includes('ACUTE_INVALID')) return acuteErrorResponse(new AcuteServerError('Změna není platná pro aktuální stav požadavků.', 422, 'ACUTE_INVALID'));
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(dbError.code || '')) {
    return acuteErrorResponse(new AcuteServerError('Databázová část modulu akutních výkonů ještě není nainstalovaná.', 503, 'ACUTE_MIGRATION_REQUIRED'));
  }
  return acuteErrorResponse(new AcuteServerError('Akutní požadavky se nepodařilo bezpečně zpracovat. Změna nebyla potvrzena.'));
}

/** Explicit mapping prevents exposing DB-only metadata and actor credentials. */
export async function acuteSnapshotResponse(data: unknown, canManage: boolean, hospitalId: string): Promise<NextResponse> {
  const raw = data as { requests?: Record<string, unknown>[]; events?: Record<string, unknown>[]; revision?: number; historyLimited?: boolean } | null;
  if (!raw || !Array.isArray(raw.requests) || !Array.isArray(raw.events) || !Number.isSafeInteger(raw.revision)) throw new AcuteServerError('Databáze vrátila neplatný pořadník.');
  if (raw.requests.some(row => row.hospital_id !== hospitalId)) throw new AcuteServerError('Pořadník nepatří vybranému zařízení.');
  const positions = new Map<string, number>();
  const readPosition = (row: Record<string, unknown>) => {
    if (row.hospital_id === hospitalId && row.action === 'create' && typeof row.request_id === 'string'
      && Number.isSafeInteger(row.new_position) && Number(row.new_position) > 0) {
      positions.set(row.request_id, Number(row.new_position));
    }
  };
  raw.events.forEach(readPosition);
  // The snapshot's recent audit is bounded. Fetch only missing create positions,
  // including old still-open requests, using the existing request-id index.
  const missingIds = raw.requests.filter(row => !positions.has(String(row.id))).map(row => String(row.id));
  const batchSize = 100;
  const batchConcurrency = 3;
  // This is supplementary historical evidence, not the committed mutation.
  // One shared budget prevents multiple batches multiplying an outage delay.
  const auditController = new AbortController();
  const auditTimer = missingIds.length > 0 ? setTimeout(() => auditController.abort(), 1_500) : null;
  try {
    for (let offset = 0; offset < missingIds.length; offset += batchSize * batchConcurrency) {
      if (auditController.signal.aborted) break;
      const batches = Array.from({ length: batchConcurrency }, (_, batch) =>
        missingIds.slice(offset + batch * batchSize, offset + (batch + 1) * batchSize),
      ).filter(ids => ids.length > 0);
      // Keep the indexed, tenant-scoped lookup and every old audited position,
      // without waiting through one network round-trip per batch.
      const results = await Promise.allSettled(batches.map(async ids =>
        getSupabaseAdmin().from('acute_request_events')
          .select('hospital_id,request_id,action,new_position').eq('hospital_id', hospitalId).eq('action', 'create')
          .abortSignal(auditController.signal)
          .in('request_id', ids),
      ));
      for (const result of results) {
        // Optional enrichment must never disguise a confirmed POST as a failed save.
        // Unknown positions stay null rather than being guessed from current rank.
        if (result.status === 'fulfilled' && !result.value.error && Array.isArray(result.value.data)) {
          result.value.data.forEach(readPosition);
        }
      }
    }
  } finally { if (auditTimer !== null) clearTimeout(auditTimer); }
  const requests = raw.requests.map(row => ({
    id: row.id, hospitalId: row.hospital_id, reference: row.reference, procedureName: row.procedure_name,
    department: row.department, description: row.description, urgency: row.urgency, estimatedDurationMinutes: row.estimated_duration_minutes,
    clinicalDecisionAt: row.clinical_decision_at, latestStartAt: row.latest_start_at, receivedAt: row.received_at,
    proposedRoomId: row.proposed_room_id, proposedStartAt: row.proposed_start_at, status: row.status,
    queuePosition: row.queue_position, acknowledgedAt: row.acknowledged_at, acknowledgedBy: row.acknowledged_by,
    submissionPosition: positions.get(String(row.id)) ?? null,
    createdBy: row.created_by, updatedAt: row.updated_at, revision: row.revision,
  }));
  const events = raw.events.map(row => ({
    id: row.id, requestId: row.request_id, action: row.action, actorId: row.actor_id, actorName: row.actor_name,
    occurredAt: row.occurred_at, reason: row.reason, previousPosition: row.previous_position, newPosition: row.new_position, changes: row.changes,
  }));
  const body = { requests, events, revision: raw.revision, canManage, historyLimited: raw.historyLimited === true } as AcuteSnapshot;
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
