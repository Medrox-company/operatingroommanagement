import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification, generateEmailTemplate } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationRequest {
  type: string;
  roomId: string;
  roomName: string;
  customReason?: string;
}

const NOTIFICATION_TYPE_MAP: Record<string, { name: string; field: string; subject: string }> = {
  'notify_late_surgeon': {
    name: 'Pozdni prichod operatera',
    field: 'notify_late_surgeon',
    subject: 'Upozorneni: Pozdni prichod operatera'
  },
  'notify_late_anesthesiologist': {
    name: 'Pozdni prichod anesteziologa',
    field: 'notify_late_anesthesiologist',
    subject: 'Upozorneni: Pozdni prichod anesteziologa'
  },
  'notify_patient_not_ready': {
    name: 'Nepripraveny pacient',
    field: 'notify_patient_not_ready',
    subject: 'Upozorneni: Nepripraveny pacient'
  },
  'notify_late_arrival': {
    name: 'Pozdni prijezd',
    field: 'notify_late_arrival',
    subject: 'Upozorneni: Pozdni prijezd'
  },
  'notify_other': {
    name: 'Jiny duvod',
    field: 'notify_other',
    subject: 'Upozorneni: Jiny duvod'
  },
};

export async function POST(request: NextRequest) {
  try {
    const { type, roomId, roomName, customReason }: NotificationRequest = await request.json();
    console.log('[v0] send-notification called with:', { type, roomId, roomName, customReason });

    const notificationType = NOTIFICATION_TYPE_MAP[type];
    if (!notificationType) {
      console.log('[v0] Unknown notification type:', type);
      return NextResponse.json({ error: 'Neznamy typ notifikace' }, { status: 400 });
    }

    // Get management contacts that want this type of notification
    console.log('[v0] Fetching contacts with field:', notificationType.field);
    const { data: contacts, error: contactsError } = await supabase
      .from('management_contacts')
      .select('email, name, position')
      .eq(notificationType.field, true)
      .eq('is_active', true);

    console.log('[v0] Contacts query result:', { contacts, contactsError });

    if (contactsError) {
      console.error('[v0] Error fetching contacts:', contactsError);
      return NextResponse.json({ error: 'Chyba pri nacitani kontaktu' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      console.log('[v0] No contacts found for notification type:', type);
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
          console.error('[v0] Error logging notification:', logError);
        }
      } catch (logErr) {
        console.error('[v0] Error logging notification:', logErr);
      }

      return NextResponse.json({ 
        message: 'Zadny prijemce neni nakonfigurovan pro tento typ notifikace',
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
        'Sal': roomName,
        'Cas': new Date().toLocaleString('cs-CZ'),
        ...(customReason ? { 'Podrobnosti': customReason } : {}),
      },
    });

    // Send emails using the same method as NotificationsManager (via Supabase Edge Function)
    console.log('[v0] Sending emails to', contacts.length, 'contacts');
    const results: { email: string; name: string; sent: boolean; error?: string }[] = [];
    
    for (const contact of contacts) {
      console.log('[v0] Sending email to:', contact.email);
      const result = await sendEmailNotification({
        to: contact.email,
        subject: `${notificationType.subject} - Sal: ${roomName}`,
        html: emailHtml,
        recipientName: contact.name,
      });
      
      console.log('[v0] Email result for', contact.email, ':', result);
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
        console.error('[v0] Error logging notification:', logError);
      }
    } catch (logErr) {
      console.error('[v0] Error logging notification:', logErr);
    }

    return NextResponse.json({
      success: successCount > 0,
      message: successCount > 0 
        ? `Notifikace byla odeslana ${successCount} prijemcum` 
        : 'Nepodarilo se odeslat zadnou notifikaci',
      sentTo: results.filter((r) => r.sent).map((r) => `${r.name} (${r.email})`),
      failedCount: results.filter((r) => !r.sent).length,
      recipientCount: successCount,
      errors: results.filter((r) => !r.sent).map((r) => `${r.email}: ${r.error}`),
    });
  } catch (error) {
    console.error('[v0] Error in send-notification:', error);
    return NextResponse.json(
      { error: 'Interni chyba serveru' },
      { status: 500 }
    );
  }
}
