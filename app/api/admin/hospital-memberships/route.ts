import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { isAdminRole } from '../../../../lib/auth/roles';

export const runtime = 'nodejs';

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const hospitalId = request.nextUrl.searchParams.get('hospitalId');
  if (!validId(hospitalId)) return NextResponse.json({ error: 'Neplatná nemocnice' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const [{ data: users, error: usersError }, { data: memberships, error: membershipsError }] = await Promise.all([
    admin.from('app_users').select('id,email,name,role,is_active').order('name'),
    admin.from('hospital_user_memberships').select('user_id').eq('hospital_id', hospitalId),
  ]);
  if (usersError || membershipsError) {
    return NextResponse.json({ error: usersError?.message || membershipsError?.message }, { status: 500 });
  }
  const memberIds = new Set((memberships || []).map(row => String(row.user_id)));
  return NextResponse.json({
    users: (users || []).map(user => ({
      ...user,
      id: String(user.id),
      has_access: isAdminRole(user.role) || memberIds.has(String(user.id)),
      access_is_global: isAdminRole(user.role),
    })),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const hospitalId = body.hospitalId;
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const enabled = body.enabled;
  if (!validId(hospitalId) || !userId || userId.length > 100 || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Neplatná data' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const [{ data: hospital }, { data: user }] = await Promise.all([
    admin.from('hospitals').select('id').eq('id', hospitalId).maybeSingle(),
    admin.from('app_users').select('id,role').eq('id', userId).maybeSingle(),
  ]);
  if (!hospital || !user) return NextResponse.json({ error: 'Nemocnice nebo uživatel neexistuje' }, { status: 404 });
  if (isAdminRole(user.role)) return NextResponse.json({ success: true, global: true });

  const result = enabled
    ? await admin.from('hospital_user_memberships').upsert(
        { hospital_id: hospitalId, user_id: userId },
        { onConflict: 'hospital_id,user_id' },
      )
    : await admin.from('hospital_user_memberships').delete().eq('hospital_id', hospitalId).eq('user_id', userId);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
