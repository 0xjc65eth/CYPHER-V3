import { NextRequest, NextResponse } from 'next/server';
import { unisatService } from '@/services/unisatService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const data = await unisatService.getBRC20TickerInfo(ticker);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BRC-20 ticker info';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
