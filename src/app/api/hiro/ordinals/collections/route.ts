import { NextRequest, NextResponse } from 'next/server';
import { hiroOrdinalsService } from '@/services/ordinals/integrations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch collections from Hiro Ordinals API
    const response = await hiroOrdinalsService.getCollections({ limit, offset });

    if (!response || !response.results) {
      return NextResponse.json({
        code: 0,
        msg: 'fallback',
        data: { list: [], total: 0 }
      });
    }

    // Transform to standardized format
    const collections = response.results.map((c: any) => ({
      id: c.id,
      name: c.name || c.id,
      symbol: c.symbol || c.id,
      imageURI: c.image_uri || c.imageURI,
      description: c.description,
      supply: c.supply || c.total_supply || 0,
      floorPrice: c.floor_price || 0,
      volume24h: c.volume_24h || 0,
      volume7d: c.volume_7d || 0,
      owners: c.holders_count || c.owners || 0,
      listedCount: c.listed_count || 0,
    }));

    return NextResponse.json({
      success: true,
      data: collections,
      count: collections.length,
      total: response.total,
      source: 'hiro',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Hiro API] Error fetching collections:', error);
    return NextResponse.json({
      code: 0,
      msg: 'fallback',
      data: { list: [], total: 0 }
    });
  }
}
