import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const runeid = searchParams.get('runeid') || undefined;
    const sort = searchParams.get('sort') as 'priceAsc' | 'priceDesc' | 'timeDesc' | 'timeAsc' | undefined;
    const start = searchParams.get('start');
    const limit = searchParams.get('limit');
    const status = searchParams.get('status') || undefined;

    const data = await unisatRunesService.getRunesAuctionList({
      runeid,
      sort: sort || undefined,
      start: start ? Number(start) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch runes market listings';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
