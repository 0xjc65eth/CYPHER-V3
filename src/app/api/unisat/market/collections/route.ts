import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const start = searchParams.get('start');
    const limit = searchParams.get('limit');
    const keyword = searchParams.get('keyword') || undefined;

    const data = await unisatRunesService.getMarketCollectionList({
      type,
      sort,
      start: start ? Number(start) : undefined,
      limit: limit ? Number(limit) : undefined,
      keyword,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch marketplace collections';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
