import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { AcuteValidationError, validateAcuteCommand } from '@/lib/acute-requests';
import { acuteErrorResponse, acuteSnapshotResponse, requireAcuteAccess, requireAcuteHospitalScope } from '@/lib/acute-requests-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Generic durations only: no actor, tenant, procedure or query details. */
async function timedSnapshotResponse(data: unknown, canManage: boolean, hospitalId: string, startedAt: number, guardsFinishedAt: number, databaseFinishedAt: number) {
  const response = await acuteSnapshotResponse(data, canManage, hospitalId);
  response.headers.set('Server-Timing', [
    `guard;dur=${(guardsFinishedAt - startedAt).toFixed(1)}`,
    `db;dur=${(databaseFinishedAt - guardsFinishedAt).toFixed(1)}`,
    `response;dur=${(performance.now() - databaseFinishedAt).toFixed(1)}`,
  ].join(', '));
  return response;
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const scope = requireAcuteHospitalScope(request, access);
  if (scope) return scope;
  const authorized = await requireAcuteAccess(access);
  if (authorized instanceof NextResponse) return authorized;
  try {
    const guardsFinishedAt = performance.now();
    const { data, error } = await getSupabaseAdmin().rpc('get_acute_requests_snapshot', { p_hospital_id: access.hospitalId });
    if (error) throw error;
    return await timedSnapshotResponse(data, authorized.canManage, access.hospitalId, startedAt, guardsFinishedAt, performance.now());
  } catch (error) { return acuteErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const scope = requireAcuteHospitalScope(request, access);
  if (scope) return scope;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  try {
    // Hospital membership, tab scope and CSRF are already approved. Current
    // module/account authorization can overlap bounded input + room validation;
    // both must finish successfully before the transactional mutation is called.
    const [authorization, validation] = await Promise.allSettled([
      requireAcuteAccess(access, true),
      (async () => {
        const raw = await request.text();
        if (raw.length > 50_000) return NextResponse.json({ error: 'Požadavek je příliš velký.' }, { status: 413 });
        let body: unknown;
        try { body = JSON.parse(raw); } catch { throw new AcuteValidationError('Neplatný JSON požadavku.'); }
        const command = validateAcuteCommand(body);
        if ('input' in command && command.input.proposedRoomId) {
          const { data: room, error } = await getSupabaseAdmin().from('operating_rooms').select('id').eq('id', command.input.proposedRoomId).eq('hospital_id', access.hospitalId).maybeSingle();
          if (error) throw error;
          if (!room) return NextResponse.json({ error: 'Vybraný sál není v tomto zařízení dostupný.', code: 'ACUTE_INVALID_ROOM' }, { status: 422 });
        }
        return command;
      })(),
    ]);
    // Preserve authorization-error precedence and never reveal room/input
    // validation details to an account that has lost access to this module.
    if (authorization.status === 'rejected') throw authorization.reason;
    const authorized = authorization.value;
    if (authorized instanceof NextResponse) return authorized;
    if (validation.status === 'rejected') throw validation.reason;
    const command = validation.value;
    if (command instanceof NextResponse) return command;
    const guardsFinishedAt = performance.now();
    const { data, error } = await getSupabaseAdmin().rpc('apply_acute_request_command', {
      p_hospital_id: access.hospitalId, p_actor_id: access.user.sub,
      p_expected_revision: command.expectedRevision, p_command: command,
    });
    if (error) throw error;
    return await timedSnapshotResponse(data, authorized.canManage, access.hospitalId, startedAt, guardsFinishedAt, performance.now());
  } catch (error) {
    if (error instanceof AcuteValidationError) return NextResponse.json({ error: error.message, code: 'ACUTE_INVALID' }, { status: 400 });
    return acuteErrorResponse(error);
  }
}
