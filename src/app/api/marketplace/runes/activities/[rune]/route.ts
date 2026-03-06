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

    const activityParams: {
      rune: string;
      type?: 'listing' | 'buying' | 'delisting' | 'mint' | 'transfer';
      limit?: number;
      offset?: number;
    } = { rune };

    const type = searchParams.get('type');
    if (type === 'listing' || type === 'buying' || type === 'delisting' || type === 'mint' || type === 'transfer') {
      activityParams.type = type;
    }

    const limit = searchParams.get('limit');
    if (limit) activityParams.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) activityParams.offset = parseInt(offset, 10);

    const data = await runesMarketService.getRuneActivities(activityParams);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/marketplace/runes/activities/[rune] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rune activities' },
      { status: 500 }
    );
  }
}
