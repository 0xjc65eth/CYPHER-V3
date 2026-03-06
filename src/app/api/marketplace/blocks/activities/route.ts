import { NextRequest, NextResponse } from 'next/server';
import { ordinalsMarketService } from '@/services/ordinalsMarketService';
import type { OrdinalsBlockActivitiesParams } from '@/services/ordinalsMarketService';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionSymbol = searchParams.get('collectionSymbol');
    const limit = searchParams.get('limit');

    // Try OKX first for collection activity queries
    if (collectionSymbol) {
      try {
        const { activities } = await okxOrdinalsAPI.getCollectionActivity(
          collectionSymbol,
          undefined,
          limit ? parseInt(limit, 10) : 100,
        );
        if (activities.length > 0) {
          return NextResponse.json({
            activities,
            _source: 'okx',
          });
        }
      } catch (okxError) {
        // OKX failed, continue to ME fallback
      }
    }

    // Fallback to Gamma.io
    const params: OrdinalsBlockActivitiesParams = {};

    const kind = searchParams.get('kind');
    if (kind) params.kind = kind;

    if (collectionSymbol) params.collectionSymbol = collectionSymbol;

    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const data = await ordinalsMarketService.getBlockActivities(params);
    return NextResponse.json({
      ...data,
      _source: 'gamma',
    });
  } catch (error) {
    console.error('[API] GET /api/marketplace/blocks/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block activities' },
      { status: 500 }
    );
  }
}
