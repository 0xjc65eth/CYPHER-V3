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

    const searchParams = request.nextUrl.searchParams;

    const orderParams: {
      rune: string;
      side?: 'sell' | 'buy';
      sortBy?: 'unitPriceAsc' | 'unitPriceDesc' | 'totalPriceAsc' | 'totalPriceDesc';
      limit?: number;
      offset?: number;
      minPrice?: number;
      maxPrice?: number;
    } = { rune };

    const side = searchParams.get('side');
    if (side === 'sell' || side === 'buy') orderParams.side = side;

    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'unitPriceAsc' || sortBy === 'unitPriceDesc' || sortBy === 'totalPriceAsc' || sortBy === 'totalPriceDesc') {
      orderParams.sortBy = sortBy;
    }

    const limit = searchParams.get('limit');
    if (limit) orderParams.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) orderParams.offset = parseInt(offset, 10);

    const minPrice = searchParams.get('minPrice');
    if (minPrice) orderParams.minPrice = parseFloat(minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) orderParams.maxPrice = parseFloat(maxPrice);

    const data = await runesMarketService.getRuneOrders(orderParams);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/orders/[rune] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune orders' },
      { status: 500 }
    );
  }
}
