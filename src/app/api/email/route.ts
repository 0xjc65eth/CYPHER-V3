import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, type } = await request.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Email service implementation would go here
    // For now, we'll simulate successful email sending

    // In a real implementation, you would:
    // 1. Use NodeMailer, SendGrid, or similar service
    // 2. Configure SMTP settings
    // 3. Send actual email

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      recipient: to,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Email Notifications',
    status: 'active',
    version: '1.0.0',
    supportedTypes: ['price_alert', 'portfolio_update', 'weekly_report']
  });
}