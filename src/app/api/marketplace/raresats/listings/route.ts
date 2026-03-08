import { NextRequest, NextResponse } from 'next/server';
import { ordinalsMarketService } from '@/services/ordinalsMarketService';
import type { OrdinalsRareSatListingsParams } from '@/services/ordinalsMarketService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const searchParams = request.nextUrl.searchParams;

    const params: OrdinalsRareSatListingsParams = {};

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

    const data = await ordinalsMarketService.getRareSatListings(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/raresats/listings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rare sat listings' },
      { status: 500 }
    );
  }
}
