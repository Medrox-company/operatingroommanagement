import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emailHash, EmailPolicyError, getEmailPolicy, normalizeEmail, recipientHash } from './email-policy';
import { generateEmailTemplate, sendReservedEmail, type EmailTemplateData } from './email';

interface EmailDispatch {
  hospitalId: string;
  userId: string;
  requestId: string;
  intent: unknown;
  contacts: { email: string; name?: string }[];
  subject: string;
  template: EmailTemplateData;
}

/** One policy for tenant-scoped recipients, all instances and all email types. */
export async function dispatchEmails(db: SupabaseClient, dispatch: EmailDispatch) {
  const policy = getEmailPolicy();
  const recipients = [...new Set(dispatch.contacts.map(contact => normalizeEmail(contact.email)))];
  if (recipients.includes(null)) throw new EmailPolicyError('Kontakt obsahuje neplatnou e-mailovou adresu.', 422);
  if (!recipients.length) return { success: false, message: 'Žádný aktivní příjemce není nakonfigurován.', recipientCount: 0, failedCount: 0, unknownCount: 0 };
  if (recipients.length > policy.maxRecipients) throw new EmailPolicyError('Počet příjemců překračuje bezpečný limit.', 422);
  const { data: reserved, error } = await db.rpc('reserve_email_dispatch', {
    p_hospital_id: dispatch.hospitalId, p_user_id: dispatch.userId, p_request_id: dispatch.requestId,
    p_intent_hash: emailHash(dispatch.intent),
    // Timestamp deliberately excluded from the stable identity.
    p_payload_hash: emailHash([dispatch.intent, policy.from, dispatch.subject, recipients.sort()]),
    p_recipient_hashes: recipients.map(email => recipientHash(dispatch.hospitalId, dispatch.requestId, email!)),
    p_user_per_minute: policy.userPerMinute, p_hospital_per_day: policy.hospitalPerDay, p_global_per_day: policy.globalPerDay,
  });
  if (error || !reserved) throw new EmailPolicyError('Ochranu e-mailového odesílání nelze ověřit. Zpráva nebyla odeslána.');
  if (reserved.status === 'conflict') throw new EmailPolicyError('Identifikátor zprávy již patří jinému požadavku.', 409);
  if (reserved.status === 'limited' || reserved.status === 'cooldown') {
    throw new EmailPolicyError('E-mailové odesílání bylo omezeno proti nadměrnému nebo opakovanému rozesílání.', 429, reserved.retryAfterSec);
  }
  if (reserved.status === 'duplicate') {
    const complete = reserved.sentCount === reserved.recipientCount;
    return { success: complete, duplicate: true, recipientCount: reserved.sentCount, failedCount: 0,
      unknownCount: reserved.recipientCount - reserved.sentCount,
      message: complete ? 'Tato zpráva již byla přijata e-mailovou službou. Znovu se neodesílá.'
        : 'Tato zpráva již byla zpracována nebo má neověřený výsledek. Znovu se neodesílá; ověřte stav u správce.' };
  }
  if (reserved.status !== 'reserved') throw new EmailPolicyError('Neplatný stav ochrany e-mailového odesílání.');
  const html = generateEmailTemplate(dispatch.template);
  const outcomes: string[] = [];
  for (const to of recipients) {
    try { outcomes.push(await sendReservedEmail(db, dispatch, { to: to!, subject: dispatch.subject, html })); }
    catch { outcomes.push('unknown'); } // Kill switch/DB failure: no automatic retry.
  }
  const sent = outcomes.filter(outcome => outcome === 'sent').length;
  const failed = outcomes.filter(outcome => outcome === 'failed').length;
  const unknown = outcomes.filter(outcome => outcome === 'unknown').length;
  return { success: sent === recipients.length, recipientCount: sent, failedCount: failed, unknownCount: unknown,
    message: unknown ? `Přijato službou: ${sent}. U ${unknown} zpráv nelze výsledek ověřit; automaticky se neopakují.`
      : failed ? `Přijato službou: ${sent}. Odmítnuto: ${failed}.`
      : `E-mailová služba přijala zprávu pro ${sent} příjemců.` };
}
