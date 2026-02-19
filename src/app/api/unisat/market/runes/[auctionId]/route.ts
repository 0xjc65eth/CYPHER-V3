import { NextRequest, NextResponse } from 'next/server';
import { unisatRunesService } from '@/services/unisatRunesService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ auctionId: string }> }
) {
  try {
    const { auctionId } = await params;
    const data = await unisatRunesService.getRunesAuctionDetail(auctionId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch auction detail';
    return NextResponse.json({ code: 0, msg: 'fallback', data: { list: [], total: 0 } });
  }
}
