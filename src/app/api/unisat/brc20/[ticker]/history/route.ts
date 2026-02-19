import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const limit = searchParams.get('limit');

    const data = await unisatService.getBRC20History(ticker, {
      start: start ? Number(start) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BRC-20 history';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
