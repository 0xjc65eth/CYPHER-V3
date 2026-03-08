import { NextRequest, NextResponse } from 'next/server';
import { runesMarketService } from '@/services/runesMarketService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const activityParams: {
      address: string;
      rune?: string;
      type?: 'listing' | 'buying' | 'delisting' | 'mint' | 'transfer';
      limit?: number;
      offset?: number;
    } = { address };

    const rune = searchParams.get('rune');
    if (rune) activityParams.rune = rune;

    const type = searchParams.get('type');
    if (type === 'listing' || type === 'buying' || type === 'delisting' || type === 'mint' || type === 'transfer') {
      activityParams.type = type;
    }

    const limit = searchParams.get('limit');
    if (limit) activityParams.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) activityParams.offset = parseInt(offset, 10);

    const data = await runesMarketService.getWalletRuneActivities(activityParams);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/wallet/[address]/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet rune activities' },
      { status: 500 }
    );
  }
}
