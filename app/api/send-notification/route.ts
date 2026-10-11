import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { dispatchEmails } from '@/lib/email-dispatch';
import { EmailPolicyError, getEmailPolicy, isEmailRequestId, readEmailRequest, requireCurrentEmailAccount } from '@/lib/email-policy';

export const runtime = 'nodejs';

const NOTIFICATION_TYPES = new Map([
  ['notify_late_surgeon', 'Pozdní příchod chirurga'],
  ['notify_late_anesthesiologist', 'Pozdní příchod anesteziologa'],
  ['notify_patient_not_ready', 'Nepřipravený pacient'],
  ['notify_late_arrival', 'Pozdní příjezd'],
  ['notify_emergencies', 'Stav nouze'],
  ['notify_other', 'Jiný důvod'],
]);

export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { hospitalId, user } = access;
  try {
    const body = await readEmailRequest(request);
    const { type, roomId, customReason, requestId } = body;
    if (typeof type !== 'string' || !NOTIFICATION_TYPES.has(type)) throw new EmailPolicyError('Neznámý typ notifikace.', 400);
    if (typeof roomId !== 'string' || !roomId || roomId.length > 200 || !isEmailRequestId(requestId)) {
      throw new EmailPolicyError('Chybí platný sál nebo identifikátor zprávy. Obnovte aplikaci.', 400);
    }
    if (customReason !== undefined && (typeof customReason !== 'string' || customReason.length > 2000)) {
      throw new EmailPolicyError('Neplatný důvod notifikace.', 400);
    }
    // No client-supplied recipients, HTML, subject or room name are used.
    const db = getSupabaseAdmin();
    await requireCurrentEmailAccount(db, user);
    const { data: room, error: roomError } = await db.from('operating_rooms')
      .select('id,name').eq('id', roomId).eq('hospital_id', hospitalId).maybeSingle();
    if (roomError) throw new EmailPolicyError('Operační sál nelze ověřit.');
    if (!room) throw new EmailPolicyError('Operační sál do vybraného zařízení nepatří.', 404);
    const { data: contacts, error: contactsError } = await db.from('management_contacts')
      .select('email,name').eq('hospital_id', hospitalId).eq(type, true).eq('is_active', true).limit(51);
    if (contactsError) throw new EmailPolicyError('Příjemce nelze bezpečně ověřit.');
    const label = NOTIFICATION_TYPES.get(type)!;
    const reason = typeof customReason === 'string' ? customReason.trim() : '';
    if (!contacts?.length) {
      // No configured recipient is a normal record-only workflow. Confirm the
      // event was persisted before letting the notification overlay close.
      const { error } = await db.from('notifications_log').insert({
        id: requestId, hospital_id: hospitalId, room_id: roomId, room_name: room.name,
        notification_type: type, custom_reason: reason || null, recipient_count: 0,
      });
      if (error?.code === '23505') {
        // A retry must not count the same event twice or reuse another event's ID.
        const { data: existing, error: lookupError } = await db.from('notifications_log')
          .select('room_id,notification_type,custom_reason')
          .eq('id', requestId).eq('hospital_id', hospitalId).maybeSingle();
        if (lookupError) throw new EmailPolicyError('Uložení upozornění nelze ověřit.');
        if (!existing || existing.room_id !== roomId || existing.notification_type !== type
          || existing.custom_reason !== (reason || null)) {
          throw new EmailPolicyError('Identifikátor upozornění již patří jinému požadavku.', 409);
        }
      } else if (error) {
        throw new EmailPolicyError('Upozornění se nepodařilo uložit. Zkuste to znovu.');
      }
      return NextResponse.json({ success: true, emailSkipped: true, reason: 'no_active_recipients',
        recipientCount: 0, failedCount: 0, unknownCount: 0 }, { headers: { 'Cache-Control': 'no-store' } });
    }
    // The kill switch and email limits still apply whenever mail would be sent.
    getEmailPolicy();
    const result = await dispatchEmails(db, {
      hospitalId, userId: user.sub, requestId,
      intent: [type, roomId, reason], contacts: contacts ?? [],
      subject: `${type === 'notify_emergencies' ? 'STAV NOUZE aktivován' : `Upozornění: ${label}`} - Sál: ${room.name}`,
      template: { type: 'emergency_alert', roomName: room.name, message: reason || label,
        details: { 'Typ notifikace': label, 'Sál': room.name, 'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }), ...(reason ? { 'Podrobnosti': reason } : {}) } },
    });
    if (!('duplicate' in result)) {
      // A logging failure must never cause a resend or conceal accepted mail.
      try {
        const { error } = await db.from('notifications_log').insert({ hospital_id: hospitalId,
          room_id: roomId, room_name: room.name, notification_type: type,
          custom_reason: reason || null, recipient_count: result.recipientCount });
        if (error) console.warn('[email] notification_log_unavailable');
      } catch { console.warn('[email] notification_log_unavailable'); }
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof EmailPolicyError) return NextResponse.json({ success: false, error: error.message }, {
      status: error.status, headers: error.retryAfterSec ? { 'Retry-After': String(error.retryAfterSec) } : {},
    });
    console.warn('[email] notification_request_failed');
    return NextResponse.json({ success: false, error: 'E-mailové odesílání nelze bezpečně dokončit.' }, { status: 503 });
  }
}
