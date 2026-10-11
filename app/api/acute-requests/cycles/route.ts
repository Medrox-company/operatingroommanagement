import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireAcuteAccess, requireAcuteHospitalScope } from '@/lib/acute-requests-server';
import { AcuteCycleValidationError, validateAcuteCycleStart, validateAcuteCycleWindow } from '@/lib/acute-cycle-links';
import { acuteCycleErrorResponse, getActiveRequestCycleLinks, mapAcuteCycleLink, requireAcuteCycleAccess } from '@/lib/acute-cycle-links-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const scope = requireAcuteHospitalScope(request, access);
  if (scope) return scope;
  const authorized = await requireAcuteAccess(access);
  if (authorized instanceof NextResponse) return authorized;
  try {
    const params = new URL(request.url).searchParams;
    const window = validateAcuteCycleWindow(params.get('from'), params.get('to'));
    const [{ data, error }, activeLinks] = await Promise.all([
      getSupabaseAdmin().rpc('get_acute_cycle_links', {
        p_hospital_id: access.hospitalId, p_from: window.from, p_to: window.to,
      }),
      getActiveRequestCycleLinks(access.hospitalId),
    ]);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid cycle evidence');
    const links = new Map(data.map(row => {
      const link = mapAcuteCycleLink(row, access.hospitalId);
      return [link.requestId, link] as const;
    }));
    // Completion is monotonic: independent reads may straddle the final room
    // transition, so never overwrite proven completion with an older live row.
    for (const link of activeLinks) {
      if (!links.get(link.requestId)?.endedAt || link.endedAt) links.set(link.requestId, link);
    }
    return NextResponse.json({ links: [...links.values()] }, { headers });
  } catch (error) {
    if (error instanceof AcuteCycleValidationError) return NextResponse.json({ error: error.message, code: 'ACUTE_CYCLE_INVALID' }, { status: 400, headers });
    return acuteCycleErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const scope = requireAcuteHospitalScope(request, access);
  if (scope) return scope;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const authorized = await requireAcuteCycleAccess(access);
  if (authorized instanceof NextResponse) return authorized;
  try {
    const raw = await request.text();
    if (raw.length > 4_000) return NextResponse.json({ error: 'Požadavek je příliš velký.' }, { status: 413, headers });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new AcuteCycleValidationError('Neplatný JSON požadavku.'); }
    const input = validateAcuteCycleStart(body);
    const { data, error } = await getSupabaseAdmin().rpc('start_acute_request_cycle', {
      p_hospital_id: access.hospitalId, p_actor_id: access.user.sub, p_request_id: input.requestId,
      p_room_id: input.roomId, p_expected_state_revision: input.expectedStateRevision,
    });
    if (error) throw error;
    const result = data as { link?: unknown; room?: { id?: string; hospital_id?: string } } | null;
    if (!result?.room || result.room.id !== input.roomId || result.room.hospital_id !== access.hospitalId) throw new Error('Invalid authoritative room');
    const link = mapAcuteCycleLink(result.link, access.hospitalId);
    if (link.requestId !== input.requestId || link.roomId !== input.roomId) throw new Error('Invalid authoritative link');
    return NextResponse.json({ link, room: result.room }, { headers });
  } catch (error) {
    if (error instanceof AcuteCycleValidationError) return NextResponse.json({ error: error.message, code: 'ACUTE_CYCLE_INVALID' }, { status: 400, headers });
    return acuteCycleErrorResponse(error);
  }
}
