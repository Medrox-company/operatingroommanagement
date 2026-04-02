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
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
      }),
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
 * Design matches the Operating Room Management System dark theme
 */
export function generateEmailTemplate(data: EmailTemplateData): string {
  const getRoomColor = (type: string) => {
    const colors: Record<string, string> = {
      emergency_alert: '#ef4444',
      status_change: '#5B65DC',
      queue_update: '#8b5cf6',
      maintenance: '#f59e0b',
      custom: '#00D8C1',
    };
    return colors[type] || '#00D8C1';
  };

  const accentColor = getRoomColor(data.type);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      emergency_alert: 'NOUZOVÉ UPOZORNĚNÍ',
      status_change: 'ZMĚNA STAVU',
      queue_update: 'AKTUALIZACE FRONTY',
      maintenance: 'ÚDRŽBA',
      custom: 'SYSTÉMOVÁ NOTIFIKACE',
    };
    return labels[type] || 'NOTIFIKACE';
  };

  let detailsHtml = '';
  if (data.details && Object.keys(data.details).length > 0) {
    detailsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
        ${Object.entries(data.details).map(([key, value]) => `
          <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${key}</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; font-weight: 500;">${value}</td>
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
        <title>Operating Room Notification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        
        <!-- Outer wrapper with gradient background -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%); min-height: 100vh;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              
              <!-- Main container -->
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                
                <!-- Header with accent glow -->
                <tr>
                  <td style="padding: 0 0 32px 0; text-align: center;">
                    <!-- Logo area with glow effect -->
                    <div style="display: inline-block; padding: 16px 32px; background: rgba(91, 101, 220, 0.1); border-radius: 40px; border: 1px solid rgba(91, 101, 220, 0.2);">
                      <span style="font-size: 10px; font-weight: 800; color: #00D8C1; letter-spacing: 3px; text-transform: uppercase;">OPERATINGROOM CONTROL</span>
                    </div>
                  </td>
                </tr>

                <!-- Main content card -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden;">
                      
                      <!-- Accent bar at top -->
                      <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, ${accentColor}, ${accentColor}88);"></td>
                      </tr>
                      
                      <!-- Content area -->
                      <tr>
                        <td style="padding: 40px;">
                          
                          <!-- Type badge -->
                          <div style="margin-bottom: 24px;">
                            <span style="display: inline-block; padding: 8px 16px; background: ${accentColor}15; border: 1px solid ${accentColor}40; border-radius: 20px; font-size: 11px; font-weight: 700; color: ${accentColor}; letter-spacing: 1.5px; text-transform: uppercase;">
                              ${getTypeLabel(data.type)}
                            </span>
                          </div>

                          <!-- Room name -->
                          <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                            ${data.roomName}
                          </h1>

                          <!-- Message -->
                          <p style="margin: 0; font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.7);">
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
                  <td style="padding: 32px 0 0 0; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.3);">
                      Automatická notifikace z Operating Room Management System
                    </p>
                    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.2);">
                      ${data.timestamp || new Date().toLocaleString('cs-CZ')}
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
