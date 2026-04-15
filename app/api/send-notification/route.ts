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

export async function POST(request: NextRequest) {
  try {
    const { type, roomId, roomName, customReason }: NotificationRequest = await request.json();

    // Map notification type to field name
    const fieldMap: Record<string, string> = {
      'late_surgeon': 'notify_late_surgeon',
      'late_anesthesiologist': 'notify_late_anesthesiologist',
      'patient_not_ready': 'notify_patient_not_ready',
      'late_arrival': 'notify_late_arrival',
      'other_reason': 'notify_other',
    };

    const fieldName = fieldMap[type];
    if (!fieldName) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Get management contacts that want this type of notification
    const { data: contacts, error: contactsError } = await supabase
      .from('management_contacts')
      .select('email, name, position')
      .eq(fieldName, true)
      .eq('is_active', true);

    if (contactsError) {
      console.error('[v0] Error fetching contacts:', contactsError);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ 
        message: 'No contacts configured for this notification type',
        sentTo: [] 
      }, { status: 200 });
    }

    // Prepare notification message
    const notificationTypeMap: Record<string, string> = {
      'late_surgeon': 'Pozdní příchod operatéra',
      'late_anesthesiologist': 'Pozdní příchod anesteziologa',
      'patient_not_ready': 'Nepřipravený pacient',
      'late_arrival': 'Pozdní příjezd',
      'other_reason': customReason || 'Jiný důvod',
    };

    const notificationMessage = notificationTypeMap[type];

    // Send email notifications (using Resend API)
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
          subject: `Notifikace z operačního sálu: ${roomName}`,
          html: `
            <h2>Notifikace z operačního sálu</h2>
            <p><strong>Sál:</strong> ${roomName}</p>
            <p><strong>Typ notifikace:</strong> ${notificationMessage}</p>
            <p><strong>Čas:</strong> ${new Date().toLocaleString('cs-CZ')}</p>
            <p>Zpráva byla odeslána na pozici <strong>${contact.position}</strong>.</p>
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

    // Log notification in database
    await supabase
      .from('notifications_log')
      .insert({
        room_id: roomId,
        room_name: roomName,
        notification_type: type,
        custom_reason: customReason,
        recipient_count: contacts.length,
        created_at: new Date().toISOString(),
      })
      .catch((error) => console.error('[v0] Error logging notification:', error));

    return NextResponse.json({
      message: 'Notifications sent successfully',
      sentTo: results.filter((r) => r.sent).map((r) => `${r.name} (${r.email})`),
      failedCount: results.filter((r) => !r.sent).length,
      results,
    });
  } catch (error) {
    console.error('[v0] Error in send-notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
