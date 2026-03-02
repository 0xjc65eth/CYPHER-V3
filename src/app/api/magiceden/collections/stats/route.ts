import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionSymbol = searchParams.get('collectionSymbol');

    if (!collectionSymbol) {
      return NextResponse.json(
        { error: 'Missing required query parameter: collectionSymbol' },
        { status: 400 }
      );
    }

    // Try OKX first (primary post-ME deprecation)
    try {
      const okxStats = await okxOrdinalsAPI.getCollectionStats(collectionSymbol);
      if (okxStats) {
        return NextResponse.json({
          ...okxStats,
          _source: 'okx',
        });
      }
    } catch (okxError) {
      console.warn('[API] OKX stats fetch failed, falling back to ME:', okxError instanceof Error ? okxError.message : okxError);
    }

    // Fallback to Magic Eden
    const data = await magicEdenService.getCollectionStats(collectionSymbol);
    if (!data) {
      return NextResponse.json(
        { error: 'Collection stats not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...data,
      _source: 'magic_eden',
    });
  } catch (error) {
    console.error('[API] GET /api/magiceden/collections/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection stats' },
      { status: 500 }
    );
  }
}
