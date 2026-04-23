import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification, generateEmailTemplate } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth/server';
import { rateLimit, getClientIdentifier } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

interface NotificationRequest {
  type: string;
  roomId: string;
  roomName: string;
  customReason?: string;
}

const NOTIFICATION_TYPE_MAP: Record<string, { name: string; field: string; subject: string }> = {
  'notify_late_surgeon': {
    name: 'Pozdní příchod chirurga',
    field: 'notify_late_surgeon',
    subject: 'Upozornění: Pozdní příchod chirurga'
  },
  'notify_late_anesthesiologist': {
    name: 'Pozdní příchod anesteziologa',
    field: 'notify_late_anesthesiologist',
    subject: 'Upozornění: Pozdní příchod anesteziologa'
  },
  'notify_patient_not_ready': {
    name: 'Nepřipravený pacient',
    field: 'notify_patient_not_ready',
    subject: 'Upozornění: Nepřipravený pacient'
  },
  'notify_late_arrival': {
    name: 'Pozdní příjezd',
    field: 'notify_late_arrival',
    subject: 'Upozornění: Pozdní příjezd'
  },
  'notify_other': {
    name: 'Jiný důvod',
    field: 'notify_other',
    subject: 'Upozornění: Jiný důvod'
  },
};

export async function POST(request: NextRequest) {
  // AuthN — pouze přihlášení uživatelé mohou spouštět odesílání e-mailů
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  // Rate limit — max 20 odeslání / 1 minuta / uživatel (ochrana proti zneužití)
  const rl = rateLimit(`notify:${auth.user.sub}:${getClientIdentifier(request.headers)}`, {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Příliš mnoho notifikací v krátkém čase. Zkuste za chvíli.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const { type, roomId, roomName, customReason }: NotificationRequest = await request.json();

    const notificationType = NOTIFICATION_TYPE_MAP[type];
    if (!notificationType) {
      return NextResponse.json({ error: 'Neznámý typ notifikace' }, { status: 400 });
    }

    // Validuj payload
    if (typeof roomId !== 'string' || !roomId || typeof roomName !== 'string' || !roomName) {
      return NextResponse.json({ error: 'Chybí roomId nebo roomName' }, { status: 400 });
    }
    if (customReason !== undefined && (typeof customReason !== 'string' || customReason.length > 2000)) {
      return NextResponse.json({ error: 'Neplatný customReason' }, { status: 400 });
    }

    // Get management contacts that want this type of notification
    const { data: contacts, error: contactsError } = await supabase
      .from('management_contacts')
      .select('email, name, position')
      .eq(notificationType.field, true)
      .eq('is_active', true);

    if (contactsError) {
      console.error('[send-notification] Error fetching contacts:', contactsError);
      return NextResponse.json({ error: 'Chyba při načítání kontaktů' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      // Log notification even if no recipients
      try {
        const { error: logError } = await supabase
          .from('notifications_log')
          .insert({
            room_id: roomId,
            room_name: roomName,
            notification_type: type,
            custom_reason: customReason || null,
            recipient_count: 0,
          });
        if (logError) {
          console.error('[send-notification] Error logging notification:', logError);
        }
      } catch (logErr) {
        console.error('[send-notification] Error logging notification:', logErr);
      }

      return NextResponse.json({
        message: 'Žádný příjemce není nakonfigurován pro tento typ notifikace',
        sentTo: [],
        recipientCount: 0
      }, { status: 200 });
    }

    // Generate email HTML using the same template as NotificationsManager
    const emailHtml = generateEmailTemplate({
      type: 'emergency_alert',
      roomName: roomName,
      message: customReason || notificationType.name,
      details: {
        'Typ notifikace': notificationType.name,
        'Sál': roomName,
        'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
        ...(customReason ? { 'Podrobnosti': customReason } : {}),
      },
    });

    // Send emails
    const results: { email: string; name: string; sent: boolean; error?: string }[] = [];

    for (const contact of contacts) {
      const result = await sendEmailNotification({
        to: contact.email,
        subject: `${notificationType.subject} - Sál: ${roomName}`,
        html: emailHtml,
        recipientName: contact.name,
      });

      results.push({
        email: contact.email,
        name: contact.name,
        sent: result.success,
        error: result.error,
      });
      
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r.sent).length;

    // Log notification in database
    try {
      const { error: logError } = await supabase
        .from('notifications_log')
        .insert({
          room_id: roomId,
          room_name: roomName,
          notification_type: type,
          custom_reason: customReason || null,
          recipient_count: successCount,
        });
      if (logError) {
        console.error('[send-notification] Error logging notification:', logError);
      }
    } catch (logErr) {
      console.error('[send-notification] Error logging notification:', logErr);
    }

    return NextResponse.json({
      success: successCount > 0,
      message: successCount > 0 
        ? `Notifikace byla odeslána ${successCount} příjemcům` 
        : 'Nepodařilo se odeslat žádnou notifikaci',
      sentTo: results.filter((r) => r.sent).map((r) => `${r.name} (${r.email})`),
      failedCount: results.filter((r) => !r.sent).length,
      recipientCount: successCount,
      errors: results.filter((r) => !r.sent).map((r) => `${r.email}: ${r.error}`),
    });
  } catch (error) {
    console.error('[send-notification] Error:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}
