import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: {
      window?: '1h' | '6h' | '1d' | '7d' | '30d';
      limit?: number;
      offset?: number;
      sortBy?: 'volume' | 'floorPrice' | 'sales' | 'holders' | 'marketCap';
      sortDirection?: 'asc' | 'desc';
    } = {};

    const window = searchParams.get('window');
    if (window === '1h' || window === '6h' || window === '1d' || window === '7d' || window === '30d') {
      params.window = window;
    }

    const limit = searchParams.get('limit');
    if (limit) params.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) params.offset = parseInt(offset, 10);

    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'volume' || sortBy === 'floorPrice' || sortBy === 'sales' || sortBy === 'holders' || sortBy === 'marketCap') {
      params.sortBy = sortBy;
    }

    const sortDirection = searchParams.get('sortDirection');
    if (sortDirection === 'asc' || sortDirection === 'desc') {
      params.sortDirection = sortDirection;
    }

    const data = await runesMarketService.getRuneCollectionStats(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/collection-stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune collection stats' },
      { status: 500 }
    );
  }
}
