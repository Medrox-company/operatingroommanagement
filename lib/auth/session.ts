import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Minimalistická implementace HMAC-podepsaných session tokenů.
 * Token = base64url(header).base64url(payload).base64url(signature)
 *
 * V produkci lze nahradit Supabase Auth (JWT), ale tento přístup je dost
 * pro zabezpečení administrační vrstvy bez externích závislostí.
 */

export interface SessionPayload {
  sub: string;        // user id
  email: string;
  role: string;
  name: string;
  exp: number;        // expiration timestamp (ms since epoch)
  iat: number;        // issued-at timestamp (ms since epoch)
}

const SESSION_COOKIE_NAME = 'or_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dní

function getSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.POSTGRES_PASSWORD;
  if (!secret) {
    throw new Error('SESSION_SECRET (nebo SUPABASE_JWT_SECRET) není nastavený — není možné podepsat session.');
  }
  return secret;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s + '='.repeat(padLen);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

export function signSession(data: Omit<SessionPayload, 'exp' | 'iat'>, ttlMs: number = SESSION_TTL_MS): string {
  const now = Date.now();
  const payload: SessionPayload = { ...data, iat: now, exp: now + ttlMs };
  const header = { alg: 'HS256', typ: 'SESSION' };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const data2sign = `${h}.${p}`;
  const sig = b64urlEncode(createHmac('sha256', getSecret()).update(data2sign).digest());
  return `${data2sign}.${sig}`;
}

export function verifySession(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  try {
    const expected = createHmac('sha256', getSecret()).update(`${h}.${p}`).digest();
    const actual = b64urlDecode(sig);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(b64urlDecode(p).toString('utf8')) as SessionPayload;
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (!payload.sub || !payload.email || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * HTTP-Only Set-Cookie hodnota. Použij přes NextResponse.cookies.set(...).
 */
export function getSessionCookieOptions(ttlMs: number = SESSION_TTL_MS) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(ttlMs / 1000),
  };
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
