import { NextRequest, NextResponse } from 'next/server';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort') || 'volume';

    // Fetch trending collections from OKX
    const trending = await okxOrdinalsAPI.getTrendingCollections();

    if (!trending || !Array.isArray(trending)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid OKX response',
      }, { status: 500 });
    }

    // Transform to standardized format
    const collections = trending.map((c: any) => ({
      collectionId: c.collectionId || c.slug,
      name: c.name,
      symbol: c.symbol || c.collectionId,
      logoUrl: c.logoUrl || c.image,
      floorPrice: c.floorPrice || '0',
      volume24h: c.volume24h || '0',
      volume7d: c.volume7d || '0',
      totalSupply: c.totalSupply || c.supply || 0,
      ownerCount: c.ownerCount || c.owners || 0,
      listedCount: c.listedCount || c.listed || 0,
      listedRate: c.listedRate || '0',
      isVerified: c.isVerified || false,
      websiteUrl: c.websiteUrl,
      twitterUrl: c.twitterUrl,
      discordUrl: c.discordUrl,
    }));

    return NextResponse.json({
      success: true,
      data: collections,
      count: collections.length,
      source: 'okx',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[OKX API] Error fetching trending collections:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch OKX trending collections',
    }, { status: 500 });
  }
}
