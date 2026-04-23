import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { signSession, getSessionCookieOptions } from '@/lib/auth/session';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 pokusů / 5 minut / IP
  const clientKey = `login:${getClientIdentifier(request.headers)}`;
  const rl = rateLimit(clientKey, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Příliš mnoho pokusů. Zkuste to znovu později.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  // Input validation
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || email.length > 255 || password.length > 512) {
    return NextResponse.json({ error: 'Neplatné přihlašovací údaje' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Neplatný formát e-mailu' }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Autentizace není nakonfigurovaná. Kontaktujte administrátora.' },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Ověř heslo přes RPC (pgcrypto bcrypt compare server-side)
  const { data: match, error: rpcError } = await supabase.rpc('verify_user_password', {
    p_email: email,
    p_password: password,
  });

  if (rpcError) {
    console.error('[auth/login] RPC error:', rpcError);
    return NextResponse.json({ error: 'Chyba autentizace' }, { status: 500 });
  }

  const user = Array.isArray(match) ? match[0] : match;
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Neplatný e-mail nebo heslo' }, { status: 401 });
  }

  // Úspěch — vystav session cookie
  const token = signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, is_active: true },
  });
  res.cookies.set({ ...getSessionCookieOptions(), value: token });
  return res;
}
