import 'server-only';
import { NextResponse } from 'next/server';
import type { HospitalAccess } from './hospital/access';
import { getSupabaseAdmin } from './supabase-server';
import { AcuteServerError, acuteErrorResponse, requireAcuteAccess } from './acute-requests-server';
import type { AcuteCycleLink } from './acute-cycle-links';

/** Clinical start permission is room access, not permission to reorder the queue. */
export async function requireAcuteCycleAccess(access: HospitalAccess): Promise<HospitalAccess | NextResponse> {
  const acute = await requireAcuteAccess(access);
  if (acute instanceof NextResponse) return acute;
  try {
    const { data: module, error } = await getSupabaseAdmin().from('app_modules')
      .select('is_enabled,allowed_roles').eq('hospital_id', access.hospitalId).eq('id', 'dashboard').maybeSingle();
    if (error) throw new AcuteServerError('Oprávnění k ovládání sálu nelze ověřit.');
    if (!module || module.is_enabled !== true || (access.user.role !== 'superadmin'
      && (!Array.isArray(module.allowed_roles) || !module.allowed_roles.includes(access.user.role)))) {
      throw new AcuteServerError('K ovládání operačních sálů nemáte přístup.', 403, 'ACUTE_CYCLE_FORBIDDEN');
    }
    return access;
  } catch (error) { return acuteErrorResponse(error); }
}

export function mapAcuteCycleLink(value: unknown, hospitalId: string): AcuteCycleLink {
  const row = value as Record<string, unknown> | null;
  if (!row || row.hospital_id !== hospitalId || typeof row.request_id !== 'string' || typeof row.operating_room_id !== 'string'
    || typeof row.operation_started_at !== 'string' || typeof row.started_at !== 'string' || typeof row.start_event_id !== 'string'
    || !Number.isFinite(Date.parse(String(row.operation_started_at))) || !Number.isFinite(Date.parse(String(row.started_at)))
    || typeof row.procedure_name !== 'string' || !row.procedure_name.trim() || !['emergent', 'urgent', 'expedited'].includes(String(row.urgency))
    || ((row.ended_at !== null && row.ended_at !== undefined) && (typeof row.ended_at !== 'string' || !Number.isFinite(Date.parse(row.ended_at))
      || typeof row.end_event_id !== 'string' || Date.parse(row.ended_at) <= Date.parse(row.started_at)))
    || ((row.ended_at === null || row.ended_at === undefined) && row.end_event_id !== null && row.end_event_id !== undefined)) {
    throw new AcuteServerError('Databáze vrátila neplatné propojení výkonu.');
  }
  return {
    requestId: row.request_id, hospitalId, roomId: row.operating_room_id,
    operationStartedAt: row.operation_started_at, startedAt: row.started_at, startEventId: row.start_event_id,
    endEventId: typeof row.end_event_id === 'string' ? row.end_event_id : null,
    endedAt: typeof row.ended_at === 'string' ? row.ended_at : null,
    procedureName: row.procedure_name, urgency: row.urgency as AcuteCycleLink['urgency'],
    submissionPosition: Number.isSafeInteger(row.submission_position) && Number(row.submission_position) > 0 ? Number(row.submission_position) : null,
  };
}

/**
 * A finished cycle does not automatically close its manually managed request.
 * Read all bindings of still-active requests, including those outside the
 * Timeline window, so they never become waiting requests again. GET-only,
 * tenant-scoped and paginated; no actor metadata is selected or exposed.
 */
export async function getActiveRequestCycleLinks(hospitalId: string): Promise<AcuteCycleLink[]> {
  const links: AcuteCycleLink[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getSupabaseAdmin().from('acute_request_cycle_links')
      .select('request_id,hospital_id,operating_room_id,operation_started_at,started_at,start_event_id,end_event_id,ended_at,procedure_name,urgency,submission_position,acute_requests!inner(status,hospital_id)')
      .eq('hospital_id', hospitalId).eq('acute_requests.hospital_id', hospitalId)
      .in('acute_requests.status', ['pending', 'acknowledged'])
      .order('request_id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new AcuteServerError('Propojení aktivních požadavků nelze ověřit.');
    links.push(...data.map(row => mapAcuteCycleLink(row, hospitalId)));
    if (data.length < pageSize) return links;
  }
}

export function acuteCycleErrorResponse(error: unknown): NextResponse {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (message.includes('ACUTE_CYCLE_CONFLICT') || ['23505', '40001', '40P01'].includes(code)) return acuteErrorResponse(new AcuteServerError('Stav sálu nebo akutního požadavku se změnil. Obnovte data; výkon nebyl zahájen.', 409, 'ACUTE_CYCLE_CONFLICT'));
  if (message.includes('ACUTE_CYCLE_FORBIDDEN')) return acuteErrorResponse(new AcuteServerError('K zahájení akutního výkonu nemáte přístup.', 403, 'ACUTE_CYCLE_FORBIDDEN'));
  if (message.includes('ACUTE_CYCLE_NOT_FOUND')) return acuteErrorResponse(new AcuteServerError('Akutní požadavek nebo sál není v tomto zařízení dostupný.', 404, 'ACUTE_CYCLE_NOT_FOUND'));
  if (message.includes('ACUTE_CYCLE_HISTORY_REQUIRED')) return acuteErrorResponse(new AcuteServerError('Databáze nepotvrdila skutečný začátek cyklu. Změna nebyla provedena.', 503, 'ACUTE_CYCLE_HISTORY_REQUIRED'));
  return acuteErrorResponse(error);
}
