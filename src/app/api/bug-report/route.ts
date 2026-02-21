import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const REPORT_EMAIL = 'juliocesarurss65@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, steps, severity, email: userEmail, screenshot } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const emailBody = `
CYPHER V3 - Bug Report
═══════════════════════════════════

Type: ${type || 'Bug'}
Severity: ${severity || 'Medium'}
Date: ${timestamp}

Title: ${title}

Description:
${description}

Steps to Reproduce:
${steps || 'Not provided'}

User Contact: ${userEmail || 'Not provided'}
User Agent: ${userAgent}
Screenshot: ${screenshot ? 'Attached (base64)' : 'None'}

═══════════════════════════════════
Sent from CYPHER V3 Bug Reporter
`;

    // Try sending email via SMTP if configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"CYPHER Bug Reporter" <${smtpUser}>`,
        to: REPORT_EMAIL,
        subject: `[CYPHER BUG] [${severity || 'Medium'}] ${title}`,
        text: emailBody,
      });
    }

    // Always log the report server-side as fallback
    console.log('[BUG-REPORT]', JSON.stringify({ type, title, severity, timestamp, userEmail }));

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully. Thank you for helping improve CYPHER.',
      id: `BUG-${Date.now().toString(36).toUpperCase()}`,
    });
  } catch (error) {
    console.error('[BUG-REPORT] Error:', error);
    return NextResponse.json({ error: 'Failed to submit report. Please try again.' }, { status: 500 });
  }
}
