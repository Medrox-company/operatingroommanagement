import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/auth/server';
import { isAdminRole, isSuperAdminRole } from '@/lib/auth/roles';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

/**
 * Změna hesla role v konkrétní nemocnici.
 *
 * Hesla patří ke dvojici role + zařízení (viz scripts/22), takže požadavek
 * vždy nese hospitalId. Změna hesla pro COS v Liberci se nedotkne COS
 * v Hradci.
 *
 * Kdo smí koho:
 *   - superadministrátor  → kdokoli, v jakémkoli zařízení
 *   - administrátor       → všechny role kromě superadministrátora,
 *                           a to jen v zařízeních, kam sám patří
 *   - ostatní role        → nikdo
 *
 * Obě omezení administrátora jsou podstatná: bez prvního by si mohl přepsat
 * heslo superadministrátora a povýšit se, bez druhého by správce jedné
 * nemocnice měnil hesla v cizí.
 *
 * Heslo se sem posílá v otevřené podobě (přes HTTPS) a okamžitě putuje do
 * databázové funkce, která ho zahashuje bcryptem. Nikde se neloguje.
 */

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

/** Hesla, která by první slovníkový pokus prolomil během vteřin. */
const OBVIOUS_PASSWORDS = new Set([
  'heslo12345', 'password12', 'password123', 'password1234',
  '1234567890', '12345678901', '0123456789',
  'qwertzuiop', 'qwertyuiop', 'adminadmin', 'superadmin',
  'nemocnice1', 'nemocnice123', 'operatingroom',
]);

function describePasswordProblem(password: string, email: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Heslo je příliš dlouhé.';
  }
  if (password.trim() !== password) {
    return 'Heslo nesmí začínat ani končit mezerou.';
  }

  const lower = password.toLowerCase();
  if (OBVIOUS_PASSWORDS.has(lower)) {
    return 'Toto heslo je příliš běžné. Zvolte prosím jiné.';
  }

  // Práh 5 znaků schválně: role jako "aro" nebo "cos" jsou tak krátké, že by
  // se trefily do spousty rozumných hesel (třeba "LiberecCOS2026!"). Delší
  // jména jako "admin" nebo "management" v hesle naopak nemají co dělat.
  const localPart = email.split('@')[0]?.toLowerCase() ?? '';
  if (localPart.length >= 5 && lower.includes(localPart)) {
    return 'Heslo nesmí obsahovat e-mailovou adresu uživatele.';
  }

  // Jediný opakovaný znak ("aaaaaaaaaa") délku splní, ale nic nechrání.
  if (new Set(password).size < 4) {
    return 'Heslo musí obsahovat alespoň čtyři různé znaky.';
  }

  return null;
}

export async function PUT(request: NextRequest) {
  const rl = rateLimit(`set-password:${getClientIdentifier(request.headers)}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Příliš mnoho pokusů. Zkuste to znovu později.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Nejste přihlášen' }, { status: 401 });
  }
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: 'Nemáte oprávnění měnit hesla' }, { status: 403 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Server není nakonfigurovaný' }, { status: 503 });
  }

  let body: { userId?: unknown; password?: unknown; hospitalId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown; password?: unknown; hospitalId?: unknown };
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const hospitalId = typeof body.hospitalId === 'string' ? body.hospitalId.trim() : '';

  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
    return NextResponse.json({ error: 'Neplatný uživatel' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(hospitalId)) {
    return NextResponse.json({ error: 'Není vybráno zdravotnické zařízení' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Administrátor smí zasahovat jen do zařízení, kam sám patří.
  if (!isSuperAdminRole(session.role)) {
    const { data: ownMembership } = await supabase
      .from('hospital_user_memberships')
      .select('user_id')
      .eq('user_id', session.sub)
      .eq('hospital_id', hospitalId)
      .maybeSingle();

    if (!ownMembership) {
      return NextResponse.json(
        { error: 'K tomuto zdravotnickému zařízení nemáte přístup.' },
        { status: 403 },
      );
    }
  }

  const { data: target, error: targetError } = await supabase
    .from('app_users')
    .select('id,email,name,role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) {
    console.error('[admin/user-password] Chyba načtení účtu:', targetError);
    return NextResponse.json({ error: 'Účet nelze načíst' }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: 'Uživatel nenalezen' }, { status: 404 });
  }

  // Administrátor na superadministrátora nesmí.
  if (isSuperAdminRole(target.role) && !isSuperAdminRole(session.role)) {
    return NextResponse.json(
      { error: 'Heslo superadministrátora může měnit pouze superadministrátor.' },
      { status: 403 },
    );
  }

  const problem = describePasswordProblem(password, target.email ?? '');
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const { data: changed, error: rpcError } = await supabase.rpc('set_membership_password', {
    p_user_id: userId,
    p_hospital_id: hospitalId,
    p_password: password,
  });

  if (rpcError) {
    console.error('[admin/user-password] RPC error:', rpcError);
    return NextResponse.json({ error: 'Heslo se nepodařilo změnit' }, { status: 500 });
  }
  if (changed !== true) {
    // Nejčastější příčina: role nemá do vybraného zařízení povolený přístup,
    // takže neexistuje členství, ke kterému by heslo patřilo.
    return NextResponse.json(
      { error: 'Tato role nemá ve vybraném zařízení povolený přístup. Nejdřív jí ho povolte.' },
      { status: 409 },
    );
  }

  // Stopa o tom, kdo zásah provedl. Heslo samotné se nikam nezapisuje.
  console.info(
    `[admin/user-password] ${session.email} (${session.role}) změnil heslo účtu ${target.email} (${target.role}) v zařízení ${hospitalId}`,
  );

  return NextResponse.json({ success: true });
}
