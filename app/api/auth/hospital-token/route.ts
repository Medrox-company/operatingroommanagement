import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin } from '@/lib/auth/csrf';

export const runtime = 'nodejs';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const hospitalId = typeof body.hospitalId === 'string' ? body.hospitalId : '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(hospitalId)) {
    return NextResponse.json({ error: 'Neplatné zařízení' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: hospital } = await admin.from('hospitals').select('id').eq('id', hospitalId).maybeSingle();
  if (!hospital) return NextResponse.json({ error: 'Zařízení neexistuje' }, { status: 404 });

  if (auth.user.role !== 'admin') {
    const { data: membership } = await admin
      .from('hospital_user_memberships')
      .select('user_id')
      .eq('user_id', auth.user.sub)
      .eq('hospital_id', hospitalId)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'K zařízení nemáte přístup' }, { status: 403 });
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'SUPABASE_JWT_SECRET není nastaven' }, { status: 500 });
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: auth.user.sub,
    email: auth.user.email,
    role: 'authenticated',
    app_role: auth.user.role,
    hospital_id: hospitalId,
    iat: now,
    exp: now + 60 * 60,
    aud: 'authenticated',
  });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return NextResponse.json({ token: `${header}.${payload}.${signature}`, expiresIn: 3600 });
}
