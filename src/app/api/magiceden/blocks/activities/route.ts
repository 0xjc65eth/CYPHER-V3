import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import type { MagicEdenBlockActivitiesParams } from '@/services/magicEdenService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: MagicEdenBlockActivitiesParams = {};

    const kind = searchParams.get('kind');
    if (kind) params.kind = kind;

    const collectionSymbol = searchParams.get('collectionSymbol');
    if (collectionSymbol) params.collectionSymbol = collectionSymbol;

    const limit = searchParams.get('limit');
    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const data = await magicEdenService.getBlockActivities(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/blocks/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block activities' },
      { status: 500 }
    );
  }
}
