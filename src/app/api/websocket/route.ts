import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, strictRateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  return NextResponse.json({
    message: 'WebSocket endpoint - use external WebSocket server',
    status: 'available'
  });
}

export async function POST(request: NextRequest) {
  const rateLimitRes = await strictRateLimit(request, 10, 60);
  if (rateLimitRes) return rateLimitRes;

  return NextResponse.json({
    message: 'WebSocket endpoint - use external WebSocket server',
    status: 'available'
  });
}