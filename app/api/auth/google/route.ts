import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { signSession, getSessionCookieOptions } from '@/lib/auth/session';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';
import { isAllowedSuperadminGoogleEmail, isGoogleLoginConfigured } from '@/lib/auth/google-allowlist';

export const runtime = 'nodejs';

/**
 * Dokončení přihlášení přes Google.
 *
 * Prohlížeč se přihlásí u Googlu přes Supabase Auth a pošle sem výsledný
 * access token. Server ho ověří a teprve pak vystaví vlastní or_session cookie,
 * kterou používá zbytek aplikace. Klient si roli nikdy neurčuje sám.
 *
 * Aby přihlášení prošlo, musí platit současně:
 *   1. token je platný (ověřeno u Supabase Auth, ne jen dekódováním)
 *   2. e-mail je v SUPERADMIN_GOOGLE_EMAILS  (konfigurace nasazení)
 *   3. e-mail sedí na řádek v app_users s rolí superadmin  (databáze)
 *   4. relace má dokončené dvoufázové ověření (aal2)
 *
 * Body 2 a 3 jsou schválně dvě nezávislá místa — kompromitace jednoho
 * z nich sama o sobě přístup neotevře.
 */

interface GoogleLoginBody {
  accessToken?: unknown;
  hospitalId?: unknown;
}

/** Přečte claim `aal` z už ověřeného tokenu. Podpis kontroluje Supabase výš. */
function readAssuranceLevel(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padLen = (4 - (payload.length % 4)) % 4;
    const json = Buffer.from(
      (payload + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const parsed = JSON.parse(json) as { aal?: unknown };
    return typeof parsed.aal === 'string' ? parsed.aal : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const clientKey = `google-login:${getClientIdentifier(request.headers)}`;
  const rl = rateLimit(clientKey, { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Příliš mnoho pokusů. Zkuste to znovu později.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  if (!isGoogleLoginConfigured()) {
    return NextResponse.json(
      { error: 'Přihlášení přes Google není nakonfigurováno.' },
      { status: 503 },
    );
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Autentizace není nakonfigurovaná. Kontaktujte administrátora.' },
      { status: 503 },
    );
  }

  let body: GoogleLoginBody;
  try {
    body = (await request.json()) as GoogleLoginBody;
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
  const hospitalId = typeof body.hospitalId === 'string' ? body.hospitalId.trim() : '';

  if (!accessToken || accessToken.length > 8192) {
    return NextResponse.json({ error: 'Chybí přihlašovací token' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(hospitalId)) {
    return NextResponse.json({ error: 'Vyberte zdravotnické zařízení' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 1) Ověření tokenu u Supabase Auth — autoritativní, ne pouhé dekódování.
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const googleUser = authData?.user;
  if (authError || !googleUser?.email) {
    return NextResponse.json({ error: 'Přihlášení přes Google se nezdařilo' }, { status: 401 });
  }
  if (googleUser.app_metadata?.provider !== 'google') {
    return NextResponse.json({ error: 'Nepodporovaný způsob přihlášení' }, { status: 401 });
  }

  const googleEmail = googleUser.email.trim().toLowerCase();

  // 2) Seznam povolených adres z konfigurace nasazení.
  if (!isAllowedSuperadminGoogleEmail(googleEmail)) {
    console.warn('[auth/google] Odmítnutá adresa:', googleEmail);
    return NextResponse.json(
      { error: 'Tento účet nemá přístup do aplikace.' },
      { status: 403 },
    );
  }

  // 3) Odpovídající účet v aplikaci.
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select('id,email,name,role,is_active,google_subject,mfa_enrolled_at')
    .eq('google_email', googleEmail)
    .maybeSingle();

  if (userError) {
    console.error('[auth/google] Chyba načtení účtu:', userError);
    return NextResponse.json({ error: 'Chyba autentizace' }, { status: 500 });
  }
  if (!appUser || !appUser.is_active || appUser.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Tento účet nemá přístup do aplikace.' },
      { status: 403 },
    );
  }

  // Stabilní identifikátor Google účtu. Chrání pro případ, že by e-mailovou
  // adresu později převzal někdo jiný (typicky u firemních domén).
  if (appUser.google_subject && appUser.google_subject !== googleUser.id) {
    console.warn('[auth/google] Neshoda identifikátoru Google účtu pro', googleEmail);
    return NextResponse.json(
      { error: 'Tento účet nemá přístup do aplikace.' },
      { status: 403 },
    );
  }

  // 4) Dvoufázové ověření je pro superadmina povinné.
  const aal = readAssuranceLevel(accessToken);
  if (aal !== 'aal2') {
    return NextResponse.json(
      { error: 'Je vyžadováno dvoufázové ověření.', mfaRequired: true },
      { status: 403 },
    );
  }

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id')
    .eq('id', hospitalId)
    .maybeSingle();
  if (!hospital) {
    return NextResponse.json({ error: 'Vybraná nemocnice neexistuje' }, { status: 400 });
  }

  // Superadmin má přístup ke všem zařízením, členství se nekontroluje.

  const nowIso = new Date().toISOString();
  await supabase
    .from('app_users')
    .update({
      google_subject: googleUser.id,
      last_login_at: nowIso,
      ...(appUser.mfa_enrolled_at ? {} : { mfa_enrolled_at: nowIso }),
    })
    .eq('id', appUser.id);

  const token = signSession({
    sub: appUser.id,
    email: appUser.email,
    role: appUser.role,
    name: appUser.name,
    hospitalId,
  });

  const res = NextResponse.json({
    success: true,
    user: {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
      hospitalId,
      is_active: true,
    },
  });
  res.cookies.set({ ...getSessionCookieOptions(), value: token });
  res.cookies.set('or_hospital', hospitalId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.ALLOW_INSECURE_COOKIE !== '1',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
