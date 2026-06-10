import { NextRequest, NextResponse } from 'next/server';

/**
 * Jednoduchá CSRF ochrana pro mutující endpointy (POST/PUT/PATCH/DELETE).
 *
 * Session cookie používá SameSite=None (kvůli běhu v iframe náhledu), takže ji
 * prohlížeč posílá i při cross-site požadavcích. Proto u mutací ověřujeme, že
 * Origin (příp. Referer) odpovídá hostu aplikace.
 *
 * Požadavky bez Origin/Referer (např. nativní aplikace, curl) propouštíme —
 * ty nejsou CSRF vektorem, protože útok přes prohlížeč hlavičku Origin vždy pošle.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin') ?? request.headers.get('referer');
  if (!origin) return null;

  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (requestHost && originHost !== requestHost) {
      return NextResponse.json({ error: 'Neplatný původ požadavku' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Neplatný původ požadavku' }, { status: 403 });
  }
  return null;
}
