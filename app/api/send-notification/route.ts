import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    name: 'Pozdní příchod operatéra',
    field: 'notify_late_surgeon',
    subject: 'Upozornění: Pozdní příchod operatéra'
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
  try {
    const { type, roomId, roomName, customReason }: NotificationRequest = await request.json();

    const notificationType = NOTIFICATION_TYPE_MAP[type];
    if (!notificationType) {
      return NextResponse.json({ error: 'Neznámý typ notifikace' }, { status: 400 });
    }

    // Get management contacts that want this type of notification
    const { data: contacts, error: contactsError } = await supabase
      .from('management_contacts')
      .select('email, name, position')
      .eq(notificationType.field, true)
      .eq('is_active', true);

    if (contactsError) {
      console.error('[v0] Error fetching contacts:', contactsError);
      return NextResponse.json({ error: 'Chyba při načítání kontaktů' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      // Log notification even if no recipients
      await supabase
        .from('notifications_log')
        .insert({
          room_id: roomId,
          room_name: roomName,
          notification_type: type,
          custom_reason: customReason || null,
          recipient_count: 0,
        })
        .catch((error) => console.error('[v0] Error logging notification:', error));

      return NextResponse.json({ 
        message: 'Žádný příjemce není nakonfigurován pro tento typ notifikace',
        sentTo: [],
        recipientCount: 0
      }, { status: 200 });
    }

    // Send email notifications using Resend
    const emailPromises = contacts.map((contact) => {
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'notifications@operatingroom.app',
          to: contact.email,
          subject: `${notificationType.subject} - Sál: ${roomName}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; background: #f5f5f5; }
                  .container { max-width: 600px; margin: 20px auto; padding: 0; }
                  .header { background: #0a0a12; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: white; padding: 20px; }
                  .room-name { font-size: 22px; font-weight: bold; color: #00d8c1; margin: 10px 0; }
                  .notification-type { font-size: 16px; font-weight: bold; color: #333; margin: 15px 0; }
                  .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #00d8c1; margin: 15px 0; border-radius: 4px; }
                  .custom-reason { background: #fff3cd; padding: 15px; border-left: 4px solid #ff6b6b; margin: 15px 0; border-radius: 4px; color: #333; }
                  .timestamp { color: #666; font-size: 12px; margin: 10px 0; }
                  .position { color: #666; font-size: 13px; }
                  .footer { background: #f5f5f5; padding: 15px; text-align: center; color: #999; font-size: 11px; border-radius: 0 0 8px 8px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <p style="margin: 0;">🏥 Notifikace z operačního sálu</p>
                  </div>
                  <div class="content">
                    <p>Ahoj <strong>${contact.name}</strong>,</p>
                    <p>Obdrželi jste notifikaci z operačního sálu:</p>
                    
                    <div class="details">
                      <div class="room-name">📍 ${roomName}</div>
                      <div class="notification-type">⚠️ ${notificationType.name}</div>
                      ${customReason ? `<div class="custom-reason"><strong>Podrobnosti:</strong><br>${customReason}</div>` : ''}
                      <div class="timestamp">⏰ ${new Date().toLocaleString('cs-CZ')}</div>
                    </div>

                    <p class="position">Vaše pozice: <strong>${contact.position}</strong></p>
                    <p>Prosím věnujte okamžitě pozornost této situaci.</p>
                  </div>
                  <div class="footer">
                    <p>Tato zpráva byla automaticky generována systémem správy operačních sálů.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      })
        .then((res) => res.json())
        .then((result) => ({
          email: contact.email,
          name: contact.name,
          sent: !result.error,
        }))
        .catch((error) => ({
          email: contact.email,
          name: contact.name,
          sent: false,
          error: error.message,
        }));
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.sent).length;

    // Log notification in database
    await supabase
      .from('notifications_log')
      .insert({
        room_id: roomId,
        room_name: roomName,
        notification_type: type,
        custom_reason: customReason || null,
        recipient_count: successCount,
      })
      .catch((error) => console.error('[v0] Error logging notification:', error));

    return NextResponse.json({
      success: true,
      message: `Notifikace byla odeslána ${successCount} příjemcům`,
      sentTo: results.filter((r) => r.sent).map((r) => `${r.name} (${r.email})`),
      failedCount: results.filter((r) => !r.sent).length,
      recipientCount: successCount,
    });
  } catch (error) {
    console.error('[v0] Error in send-notification:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}
