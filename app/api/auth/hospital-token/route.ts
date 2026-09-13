import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalIdAccess } from '@/lib/hospital/access';

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

  const hospitalAccess = await requireHospitalIdAccess(auth.user, hospitalId);
  if (hospitalAccess instanceof NextResponse) return hospitalAccess;

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
  return NextResponse.json(
    { token: `${header}.${payload}.${signature}`, expiresIn: 3600 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
