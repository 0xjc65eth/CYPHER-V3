import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import type { MagicEdenBlockActivitiesParams } from '@/services/magicEdenService';
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
        console.warn('[API] OKX activities fetch failed, falling back to ME:', okxError instanceof Error ? okxError.message : okxError);
      }
    }

    // Fallback to Magic Eden
    const params: MagicEdenBlockActivitiesParams = {};

    const kind = searchParams.get('kind');
    if (kind) params.kind = kind;

    if (collectionSymbol) params.collectionSymbol = collectionSymbol;

    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const data = await magicEdenService.getBlockActivities(params);
    return NextResponse.json({
      ...data,
      _source: 'magic_eden',
    });
  } catch (error) {
    console.error('[API] GET /api/magiceden/blocks/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block activities' },
      { status: 500 }
    );
  }
}
