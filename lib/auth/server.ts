import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession, type SessionPayload } from './session';

/**
 * Vrátí ověřeného uživatele ze session cookie nebo `null`.
 * Použití v API routes: `const user = await getSessionUser();`
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    return verifySession(token);
  } catch {
    return null;
  }
}

/**
 * Vyžaduje přihlášeného uživatele. Pokud není, vrátí NextResponse 401.
 * Použití:
 *   const result = await requireSession();
 *   if (result instanceof NextResponse) return result;
 *   const { user } = result;
 */
export async function requireSession(): Promise<{ user: SessionPayload } | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášen' }, { status: 401 });
  }
  return { user };
}

/**
 * Vyžaduje přihlášeného aktivního administrátora.
 */
export async function requireAdmin(): Promise<{ user: SessionPayload } | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášen' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Přístup pouze pro administrátora' }, { status: 403 });
  }
  return { user };
}
