import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionPayload } from './auth/session';

export class EmailPolicyError extends Error {
  constructor(message: string, public readonly status = 503, public readonly retryAfterSec?: number) {
    super(message);
  }
}

export const EMAIL_DISABLED_MESSAGE = 'E-mailové odesílání je bezpečně vypnuté. Upozornění v aplikaci zůstávají funkční.';

/** Session claims must not keep email access after account deactivation or demotion. */
export async function requireCurrentEmailAccount(db: SupabaseClient, user: Pick<SessionPayload, 'sub' | 'role'>) {
  const { data: account, error } = await db.from('app_users').select('id,role,is_active')
    .eq('id', user.sub).maybeSingle();
  if (error) throw new EmailPolicyError('Aktuální oprávnění k odesílání nelze ověřit.');
  if (!account || account.is_active !== true || account.role !== user.role) {
    throw new EmailPolicyError('Účet již nemá oprávnění k odesílání. Přihlaste se znovu.', 403);
  }
}

/** Fail closed: never enable delivery just because a key exists. */
export function getEmailPolicy() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true') {
    throw new EmailPolicyError(EMAIL_DISABLED_MESSAGE);
  }
  const from = process.env.EMAIL_FROM?.trim();
  const address = from?.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (!process.env.RESEND_API_KEY?.trim() || !from || from.length > 320 || /[\r\n]/.test(from) || !normalizeEmail(address)) {
    throw new EmailPolicyError('E-mailová služba není bezpečně nakonfigurovaná.');
  }
  return {
    from,
    maxRecipients: limit('EMAIL_MAX_RECIPIENTS', 20, 50),
    userPerMinute: limit('EMAIL_USER_PER_MINUTE', 30, 1000),
    hospitalPerDay: limit('EMAIL_HOSPITAL_PER_DAY', 100, 10000),
    globalPerDay: limit('EMAIL_GLOBAL_PER_DAY', 100, 10000),
  };
}

function limit(name: string, fallback: number, ceiling: number) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > ceiling) {
    throw new EmailPolicyError('Neplatná konfigurace limitů e-mailové služby.');
  }
  return parsed;
}

/** One mailbox only; no display-name lists, header injection or duplicates. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const address = value.trim().toLowerCase();
  return address.length <= 254 && /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(address)
    ? address : null;
}

export function isEmailRequestId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function emailHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function recipientHash(hospitalId: string, requestId: string, address: string) {
  return emailHash([hospitalId, requestId, address]);
}

/** Never accept unbounded HTML or recipient lists from the browser. */
export async function readEmailRequest(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new EmailPolicyError('Požadavek musí obsahovat JSON.', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new EmailPolicyError('Chybí tělo požadavku.', 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        throw new EmailPolicyError('Požadavek je příliš velký.', 413);
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (error) {
    if (error instanceof EmailPolicyError) throw error;
    throw new EmailPolicyError('Neplatný JSON požadavek.', 400);
  } finally {
    reader.releaseLock();
  }
}
