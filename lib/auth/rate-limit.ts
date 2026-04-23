/**
 * Jednoduchý in-memory rate limiter (sliding window).
 *
 * POZOR: v serverless/edge prostředí má každá instance vlastní paměť,
 * takže limit není globální. Pro produkci použij Upstash Redis (viz
 * https://vercel.com/integrations/upstash) a nahraď implementaci tohoto
 * helperu voláním `@upstash/ratelimit`. API zůstane stejné.
 */

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

// Občas pročisti starší záznamy, aby nám Map nekynul.
function gc(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Maximální počet požadavků v rámci `windowMs`. */
  limit: number;
  /** Délka okna v milisekundách. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  /** Kolik sekund má klient počkat (0 pokud success). */
  retryAfterSec: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const entry: Entry = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, entry);
    return { success: true, remaining: opts.limit - 1, resetAt: entry.resetAt, retryAfterSec: 0 };
  }
  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const success = existing.count <= opts.limit;
  return {
    success,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: success ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Získej (nejlepší možný) identifikátor klienta z hlaviček requestu.
 */
export function getClientIdentifier(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
