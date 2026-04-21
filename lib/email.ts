// Email utility - calls Supabase Edge Function to send emails via Resend
// This avoids CORS issues by routing through Supabase Edge Functions

// Supabase project URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export interface EmailNotification {
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

/**
 * Send an email notification via our API endpoint
 */
export async function sendEmailNotification(
  notification: EmailNotification
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!SUPABASE_URL) {
    console.error('[Email] Supabase URL not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Encode the body as UTF-8 to handle Czech characters properly
    const bodyData = JSON.stringify({
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
    });
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: bodyData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] API error:', data);
      return { success: false, error: data.error || 'Failed to send email' };
    }

    console.log('[Email] Email sent successfully:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
            <td style="padding: 14px 20px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${key}</td>
            <td style="padding: 14px 20px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${value}</td>
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
                            ${data.roomName}
                          </h2>

                          <!-- Message -->
                          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                            ${data.message}
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
                      ${data.timestamp || new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}
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

/**
 * Encode subject for email headers (handles Czech and other special characters)
 */
function encodeEmailSubject(subject: string): string {
  // Replace Czech characters with ASCII equivalents for subject line
  const asciiMap: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  
  return subject.replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, char => asciiMap[char] || char);
}

/**
 * Batch send notifications to multiple recipients
 */
export async function sendBatchEmailNotifications(
  recipients: string[],
  data: EmailTemplateData
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const html = generateEmailTemplate(data);
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const rawSubject = `[${data.type.toUpperCase()}] ${data.roomName} - ${data.message.substring(0, 30)}...`;
    const result = await sendEmailNotification({
      to: recipient,
      subject: encodeEmailSubject(rawSubject),
      html,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(`${recipient}: ${result.error}`);
    }

    // Rate limiting - wait 100ms between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed, errors };
}
