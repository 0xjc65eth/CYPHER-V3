import { NextRequest, NextResponse } from 'next/server';
import { ordinalsMarketService } from '@/services/ordinalsMarketService';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
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
      // OKX failed, continue to ME fallback
    }

    // Fallback to Gamma.io
    const data = await ordinalsMarketService.getCollectionDetails(symbol);
    if (!data) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...data,
      _source: 'gamma',
    });
  } catch (error) {
    console.error('[API] GET /api/marketplace/collections/[symbol] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection details' },
      { status: 500 }
    );
  }
}
