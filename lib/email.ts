import { Resend } from 'resend';

// Initialize Resend client
// Support both VITE_ prefixed (client-side) and non-prefixed (server-side) env vars
const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || import.meta.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
 * Send an email notification using Resend
 */
export async function sendEmailNotification(
  notification: EmailNotification
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!resend) {
    console.error('[Email] Resend API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await resend.emails.send({
      from: 'Operating Room System <onboarding@resend.dev>',
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
    });

    if (response.error) {
      console.error('[Email] Resend API error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('[Email] Email sent successfully:', response.data?.id);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate HTML email template based on notification type
 */
export function generateEmailTemplate(data: EmailTemplateData): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
  `;

  const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  `;

  const headerStyle = `
    text-align: center;
    padding-bottom: 30px;
    border-bottom: 2px solid rgba(100, 116, 139, 0.3);
    margin-bottom: 30px;
  `;

  const contentStyle = `
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(100, 116, 139, 0.2);
  `;

  const getRoomColor = (type: string) => {
    const colors: Record<string, string> = {
      emergency_alert: '#ef4444',
      status_change: '#3b82f6',
      queue_update: '#8b5cf6',
      maintenance: '#f59e0b',
    };
    return colors[type] || '#06b6d4';
  };

  const accentColor = getRoomColor(data.type);

  const titleStyle = `
    color: ${accentColor};
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: bold;
  `;

  const roomNameStyle = `
    font-size: 18px;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 12px 0;
  `;

  const messageStyle = `
    font-size: 16px;
    line-height: 1.6;
    color: #cbd5e1;
    margin: 0 0 20px 0;
  `;

  const detailsStyle = `
    background: rgba(0, 0, 0, 0.2);
    border-left: 4px solid ${accentColor};
    padding: 16px;
    border-radius: 8px;
    margin: 16px 0;
  `;

  const detailRowStyle = `
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
  `;

  const footerStyle = `
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid rgba(100, 116, 139, 0.2);
    font-size: 12px;
    color: #64748b;
  `;

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Operating Room Notification</title>
      </head>
      <body style="${baseStyle}">
        <div style="${containerStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 28px; color: #f1f5f9;">🏥 Operating Room Management</h1>
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">System Notification</p>
          </div>

          <div style="${contentStyle}">
            <h2 style="${titleStyle}">
              ${data.type === 'emergency_alert' ? '🚨 Emergency Alert' : ''}
              ${data.type === 'status_change' ? '📊 Status Update' : ''}
              ${data.type === 'queue_update' ? '📋 Queue Update' : ''}
              ${data.type === 'maintenance' ? '🔧 Maintenance Notice' : ''}
              ${data.type === 'custom' ? '📢 Notification' : ''}
            </h2>

            <p style="${roomNameStyle}">${data.roomName}</p>
            <p style="${messageStyle}">${data.message}</p>
  `;

  if (data.details && Object.keys(data.details).length > 0) {
    html += `<div style="${detailsStyle}">`;
    Object.entries(data.details).forEach(([key, value]) => {
      html += `
        <div style="${detailRowStyle}">
          <span style="color: #94a3b8;">${key}:</span>
          <span style="color: #f1f5f9; font-weight: 500;">${value}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `
          </div>

          <div style="${footerStyle}">
            <p style="margin: 0;">This is an automated notification from the Operating Room Management System</p>
            <p style="margin: 8px 0 0 0;">Generated at ${data.timestamp || new Date().toLocaleString('cs-CZ')}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
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
    const result = await sendEmailNotification({
      to: recipient,
      subject: `[${data.type.toUpperCase()}] ${data.roomName} - ${data.message.substring(0, 30)}...`,
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
