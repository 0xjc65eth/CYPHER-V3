import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionSymbol = searchParams.get('collectionSymbol');

    if (!collectionSymbol) {
      return NextResponse.json(
        { error: 'Missing required query parameter: collectionSymbol' },
        { status: 400 }
      );
    }

    const data = await magicEdenService.getCollectionStats(collectionSymbol);
    if (!data) {
      return NextResponse.json(
        { error: 'Collection stats not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/collections/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection stats' },
      { status: 500 }
    );
  }
}
