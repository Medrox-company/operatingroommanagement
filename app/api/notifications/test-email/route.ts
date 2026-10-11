import { NextRequest, NextResponse } from 'next/server';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { dispatchEmails } from '@/lib/email-dispatch';
import { EmailPolicyError, getEmailPolicy, isEmailRequestId, normalizeEmail, readEmailRequest, requireCurrentEmailAccount } from '@/lib/email-policy';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const permission = await requireSubmoduleAccess(access, 'settings.notifications');
  if (permission instanceof NextResponse) return permission;
  try {
    const body = await readEmailRequest(request);
    const email = normalizeEmail(body.email);
    if (!email || !isEmailRequestId(body.requestId)) throw new EmailPolicyError('Neplatný příjemce nebo identifikátor zprávy.', 400);
    getEmailPolicy();
    const db = getSupabaseAdmin();
    await requireCurrentEmailAccount(db, access.user);
    const { data: contacts, error } = await db.from('management_contacts').select('email,name')
      .eq('hospital_id', access.hospitalId).eq('is_active', true).ilike('email', email).limit(51);
    // Exact comparison also rejects wildcard matches from ilike.
    const contact = contacts?.find(row => normalizeEmail(row.email) === email);
    if (error) throw new EmailPolicyError('Příjemce nelze bezpečně ověřit.');
    if (!contact) throw new EmailPolicyError('Test lze poslat pouze na aktivní kontakt managementu tohoto zařízení.', 403);
    const result = await dispatchEmails(db, {
      hospitalId: access.hospitalId, userId: access.user.sub, requestId: body.requestId,
      intent: ['test', email], contacts: [contact],
      subject: 'Test: Operating Room Management System – E-mail notifikace',
      template: { type: 'custom', roomName: 'Test e-mailové služby', message: 'Toto je testovací zpráva z Operating Room Management Systému.',
        details: { 'Typ': 'Bezpečný test e-mailové notifikace', 'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }) } },
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof EmailPolicyError) return NextResponse.json({ success: false, error: error.message }, {
      status: error.status, headers: error.retryAfterSec ? { 'Retry-After': String(error.retryAfterSec) } : {},
    });
    console.warn('[email] test_request_failed');
    return NextResponse.json({ success: false, error: 'Testovací e-mail nelze bezpečně odeslat.' }, { status: 503 });
  }
}
