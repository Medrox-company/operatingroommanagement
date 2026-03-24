import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API key is configured
  if (!RESEND_API_KEY) {
    console.error('[API] RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured on server' });
  }

  try {
    const { to, subject, html } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    // Call Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Operating Room System <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[API] Resend error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }

    console.log('[API] Email sent successfully:', data.id);
    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error('[API] Error sending email:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
