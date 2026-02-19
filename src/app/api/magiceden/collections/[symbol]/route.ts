import { NextRequest, NextResponse } from 'next/server';
import { magicEdenService } from '@/services/magicEdenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
        { status: 400 }
      );
    }

    const data = await magicEdenService.getCollectionDetails(symbol);
    if (!data) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] GET /api/magiceden/collections/[symbol] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection details' },
      { status: 500 }
    );
  }
}
