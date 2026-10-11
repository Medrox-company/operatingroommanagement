import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmailPolicy, recipientHash } from './email-policy';

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  recipientName?: string;
}

export interface EmailTemplateData {
  type: 'emergency_alert' | 'status_change' | 'queue_update' | 'maintenance' | 'custom';
  roomName: string;
  message: string;
  details?: Record<string, string>;
  timestamp?: string;
}

/** A provider call is impossible without an atomically claimed DB reservation. */
export async function sendReservedEmail(
  db: SupabaseClient,
  reservation: { hospitalId: string; requestId: string },
  notification: EmailNotification,
): Promise<'sent' | 'failed' | 'unknown'> {
  const policy = getEmailPolicy();
  const hash = recipientHash(reservation.hospitalId, reservation.requestId, notification.to);
  const args = { p_hospital_id: reservation.hospitalId, p_request_id: reservation.requestId, p_recipient_hash: hash };
  const { data: claimed, error: claimError } = await db.rpc('claim_email_delivery', args);
  if (claimError || claimed !== true) return 'unknown';

  let outcome: 'sent' | 'failed' | 'unknown' = 'unknown';
  let messageId: string | null = null;
  try {
    // Fixed provider URL, no redirects, bounded wait and no SDK error logging.
    // Abort is an uncertain outcome, not proof that the provider rejected mail.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8_000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `orm/${hash}` },
      body: JSON.stringify({ from: policy.from, to: notification.to,
        subject: notification.subject.replace(/[\r\n]/g, ' ').slice(0, 250), html: notification.html }),
    });
    if (response.ok) {
      const data = await response.json();
      if (typeof data?.id === 'string' && data.id.length > 0 && data.id.length <= 200) {
        outcome = 'sent';
        messageId = data.id;
      }
    } else if (response.status >= 400 && response.status < 500 && response.status !== 409) {
      outcome = 'failed';
    }
    // Do not persist or log provider error bodies (may contain addresses/content).
    if (!response.bodyUsed) await response.body?.cancel();
  } catch {
    // A transport error may happen after acceptance. Never log provider payloads
    // or retry automatically; the durable claim remains consumed.
  }
  const { data: recorded, error: recordError } = await db.rpc('finish_email_delivery', {
    ...args, p_outcome: outcome, p_provider_id: messageId,
  });
  return recordError || recorded !== true ? 'unknown' : outcome;
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

/**
 * Generate HTML email template based on notification type
 * Clean, elegant, light design with "Sprava operacnich salu" branding
 */
export function generateEmailTemplate(data: EmailTemplateData): string {
  const getAccentColor = (type: string) => {
    const colors: Record<string, string> = {
      emergency_alert: '#dc2626',
      status_change: '#2563eb',
      queue_update: '#7c3aed',
      maintenance: '#d97706',
      custom: '#0891b2',
    };
    return colors[type] || '#0891b2';
  };

  const accentColor = getAccentColor(data.type);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      emergency_alert: 'Upozornění',
      status_change: 'Změna stavu',
      queue_update: 'Aktualizace fronty',
      maintenance: 'Údržba',
      custom: 'Oznámení',
    };
    return labels[type] || 'Oznámení';
  };

  let detailsHtml = '';
  if (data.details && Object.keys(data.details).length > 0) {
    detailsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 28px; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        ${Object.entries(data.details).map(([key, value]) => `
          <tr>
            <td style="padding: 14px 20px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${escapeHtml(key)}</td>
            <td style="padding: 14px 20px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Správa operačních sálů - Oznámení</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; min-height: 100vh;">
          <tr>
            <td align="center" style="padding: 48px 24px;">
              
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 0 0 32px 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a; letter-spacing: -0.3px;">
                      Správa operačních sálů
                    </h1>
                    <div style="margin-top: 8px; width: 48px; height: 3px; background: linear-gradient(90deg, ${accentColor}, ${accentColor}99); border-radius: 2px; display: inline-block;"></div>
                  </td>
                </tr>

                <!-- Main content card -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04); overflow: hidden;">
                      
                      <!-- Accent bar -->
                      <tr>
                        <td style="height: 4px; background: ${accentColor};"></td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 36px;">
                          
                          <!-- Type badge -->
                          <div style="margin-bottom: 20px;">
                            <span style="display: inline-block; padding: 6px 14px; background: ${accentColor}12; border-radius: 6px; font-size: 12px; font-weight: 600; color: ${accentColor}; letter-spacing: 0.3px;">
                              ${getTypeLabel(data.type)}
                            </span>
                          </div>

                          <!-- Room name -->
                          <h2 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; line-height: 1.3;">
                            ${escapeHtml(data.roomName)}
                          </h2>

                          <!-- Message -->
                          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                            ${escapeHtml(data.message)}
                          </p>

                          <!-- Details table -->
                          ${detailsHtml}

                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 28px 0 0 0; text-align: center;">
                          <p style="margin: 0 0 6px 0; font-size: 13px; color: #94a3b8;">
                      Automatické oznámení ze systému Správa operačních sálů
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
                      ${escapeHtml(data.timestamp || new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }))}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
