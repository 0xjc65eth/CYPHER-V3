import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';
import type { MagicEdenRareSatListingsParams } from '@/services/magicEdenService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: MagicEdenRareSatListingsParams = {};

    const limit = searchParams.get('limit');
    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const sortBy = searchParams.get('sortBy');
    if (sortBy) params.sortBy = sortBy;

    const sortDirection = searchParams.get('sortDirection');
    if (sortDirection === 'asc' || sortDirection === 'desc') {
      params.sortDirection = sortDirection;
    }

    const data = await magicEdenService.getRareSatListings(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/raresats/listings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rare sat listings' },
      { status: 500 }
    );
  }
}
