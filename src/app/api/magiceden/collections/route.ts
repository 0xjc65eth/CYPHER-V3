import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required query parameter: symbol' },
        { status: 400 }
      );
    }

    // Try OKX first (primary post-ME deprecation)
    try {
      const okxData = await okxOrdinalsAPI.getCollection(symbol);
      if (okxData) {
        return NextResponse.json({
          ...okxData,
          _source: 'okx',
        });
      }
    } catch (okxError) {
      console.warn('[API] OKX collection fetch failed, falling back to ME:', okxError instanceof Error ? okxError.message : okxError);
    }

    // Fallback to Magic Eden
    const data = await magicEdenService.getCollectionDetails(symbol);
    if (!data) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...data,
      _source: 'magic_eden',
    });
  } catch (error) {
    console.error('[API] GET /api/magiceden/collections error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection details' },
      { status: 500 }
    );
  }
}
