import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const searchParams = request.nextUrl.searchParams;
    const runeid = searchParams.get('runeid') || undefined;
    const sort = searchParams.get('sort') as 'priceAsc' | 'priceDesc' | 'timeDesc' | 'timeAsc' | undefined;
    const start = parseInt(searchParams.get('start') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;

    const data = await unisatRunesService.getRunesAuctionList({
      runeid,
      sort,
      start,
      limit,
      status,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch runes auctions';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
