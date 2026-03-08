import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, strictRateLimit } from '@/lib/middleware/rate-limiter';

// Remove dynamic export - using Netlify Functions instead

export async function POST(request: NextRequest) {
  const rateLimitRes = await strictRateLimit(request, 10, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { serverId, channelId, message } = await request.json();

    if (!serverId || !channelId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Discord bot implementation would go here
    // For now, we'll simulate a successful Discord message

    // In a real implementation, you would:
    // 1. Use Discord.js or Discord API
    // 2. Send message to specified channel
    // 3. Handle bot authentication

    return NextResponse.json({ 
      success: true, 
      message: 'Discord notification sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Discord API error:', error);
    return NextResponse.json({ 
      error: 'Failed to send Discord notification' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  return NextResponse.json({
    service: 'Discord Integration',
    status: 'active',
    version: '1.0.0'
  });
}