import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rune: string }> }
) {
  try {
    const { rune } = await params;

    if (!rune) {
      return NextResponse.json(
        { error: 'Missing required parameter: rune' },
        { status: 400 }
      );
    }

    const data = await runesMarketService.getRuneMarketInfo(rune);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/market/[rune] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune market info' },
      { status: 500 }
    );
  }
}
