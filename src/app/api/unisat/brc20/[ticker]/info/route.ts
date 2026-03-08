import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { ticker } = await params;
    const data = await unisatService.getBRC20TickerInfo(ticker);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BRC-20 ticker info';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
