import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'
import { xverseAPI, type XverseCollection } from '@/lib/api/xverse'
import { apiService } from '@/lib/api-service'

/**
 * /api/ordinals-stats
 *
 * Primary: Xverse API (rich data: floor prices in sats+USD, volume %, logos)
 * Fallback: Hiro via apiService
 * Never: mock/hardcoded data
 */

interface CacheEntry { data: unknown; timestamp: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60)
  if (rateLimitRes) return rateLimitRes

  try {
    const cacheKey = 'ordinals-stats';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', 'X-Cache': 'HIT' }
      });
    }

    // STRATEGY 0: Xverse API (primary — has prices, volume, logos)
    const xverseCollections = await xverseAPI.getTopCollections({ limit: 20, timePeriod: '24h' });

    if (xverseCollections && xverseCollections.length > 0) {
      const result = formatXverseResponse(xverseCollections);
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', 'X-Cache': 'MISS' }
      });
    }

    // STRATEGY 1: Hiro via apiService (fallback)
    const [collectionsResponse, inscriptionsResponse] = await Promise.allSettled([
      apiService.getCollectionsData({ limit: 20, sort: 'volume', order: 'desc' }),
      apiService.getOrdinalsData({ limit: 1 })
    ]);

    interface HiroCollection {
      name: string; slug?: string; supply?: number;
      floor_price?: number; floorPrice?: number;
      volume_24h?: number; volume_change_24h?: number; price_change_24h?: number;
      unique_holders?: number; holders?: number;
      image?: string; verified?: boolean; category?: string;
    }

    let collectionsData: HiroCollection[] = [];
    let totalInscriptions = 0;

    if (collectionsResponse.status === 'fulfilled' && collectionsResponse.value.success) {
      collectionsData = collectionsResponse.value.data as HiroCollection[];
    } else if (collectionsResponse.status === 'fulfilled') {
      collectionsData = (collectionsResponse.value.data as HiroCollection[]) || [];
    }

    if (inscriptionsResponse.status === 'fulfilled' && inscriptionsResponse.value.success) {
      const d = inscriptionsResponse.value.data as { total?: number };
      if (d?.total) totalInscriptions = d.total;
    }

    const volume24h = collectionsData.reduce((t, c) => t + (c.volume_24h || 0), 0);
    const marketCap = collectionsData.reduce((t, c) => {
      const fp = c.floor_price || c.floorPrice || 0;
      return t + fp * (c.supply || 0);
    }, 0);
    const uniqueHolders = collectionsData.reduce((t, c) => t + (c.unique_holders || c.holders || 0), 0);

    let totalVolumeChange = 0;
    let totalPriceChange = 0;
    let withData = 0;
    collectionsData.forEach(c => {
      if (c.volume_change_24h !== undefined) { totalVolumeChange += c.volume_change_24h; withData++; }
      if (c.price_change_24h !== undefined) totalPriceChange += c.price_change_24h;
    });

    const result = {
      volume_24h: volume24h,
      volume_change_24h: withData > 0 ? totalVolumeChange / withData : 0,
      price_change_24h: withData > 0 ? totalPriceChange / withData : 0,
      market_cap: marketCap,
      unique_holders: uniqueHolders,
      available_supply: totalInscriptions,
      inscription_rate: totalInscriptions > 0 ? Math.round(totalInscriptions / 365) : 0,
      total_collections: collectionsData.length,
      popular_collections: collectionsData.slice(0, 10).map(c => {
        const slug = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
        return {
          name: c.name,
          volume_24h: c.volume_24h || 0,
          floor_price: c.floor_price || c.floorPrice || 0,
          unique_holders: c.unique_holders || c.holders || 0,
          supply: c.supply || 0,
          image: c.image,
          marketplaces: [{ name: 'gamma.io', url: `https://gamma.io/ordinals/collection/${slug}` }],
          links: {
            buy: `https://gamma.io/ordinals/collection/${slug}`,
            info: `https://ordiscan.com/collection/${slug}`,
          },
        };
      }),
      source: collectionsResponse.status === 'fulfilled' ? (collectionsResponse.value.source || 'hiro') : 'none',
      last_updated: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error('[ordinals-stats] Error:', error);
    return NextResponse.json({
      volume_24h: 0, volume_change_24h: 0, price_change_24h: 0,
      market_cap: 0, unique_holders: 0, available_supply: 0,
      inscription_rate: 0, total_collections: 0, popular_collections: [],
      source: 'error', last_updated: new Date().toISOString(),
    }, { status: 200, headers: { 'Cache-Control': 'public, max-age=30' } });
  }
}

function formatXverseResponse(collections: XverseCollection[]) {
  const volume24h = collections.reduce((t, c) => t + (c.volume || 0), 0);
  const volume24hUsd = collections.reduce((t, c) => t + (c.volumeUsd || 0), 0);
  const marketCapUsd = collections.reduce((t, c) => t + (c.marketCapUsd || 0), 0);
  const uniqueHolders = collections.reduce((t, c) => t + (c.ownerCount || 0), 0);

  let totalVolChange = 0;
  let volChangeCount = 0;
  collections.forEach(c => {
    if (c.volumePercentChange !== undefined && c.volumePercentChange !== 0) {
      totalVolChange += c.volumePercentChange;
      volChangeCount++;
    }
  });

  return {
    volume_24h: volume24h,
    volume_24h_usd: volume24hUsd,
    volume_change_24h: volChangeCount > 0 ? totalVolChange / volChangeCount : 0,
    price_change_24h: 0,
    market_cap: marketCapUsd,
    unique_holders: uniqueHolders,
    available_supply: 0,
    inscription_rate: 0,
    total_collections: collections.length,
    popular_collections: collections.slice(0, 10).map(c => {
      const slug = c.collectionId || c.name.toLowerCase().replace(/\s+/g, '-');
      return {
        name: c.name,
        collection_id: c.collectionId,
        volume_24h: c.volume || 0,
        volume_24h_usd: c.volumeUsd || 0,
        volume_change_24h: c.volumePercentChange || 0,
        floor_price: c.floorPrice || 0,
        floor_price_usd: c.floorPriceUsd || 0,
        unique_holders: c.ownerCount || 0,
        supply: c.totalSupply || 0,
        listed: c.listedCount || 0,
        image: c.imageUrl,
        marketplaces: [{ name: 'gamma.io', url: `https://gamma.io/ordinals/collection/${slug}` }],
        links: {
          buy: `https://gamma.io/ordinals/collection/${slug}`,
          info: `https://ordiscan.com/collection/${slug}`,
        },
      };
    }),
    source: 'xverse',
    last_updated: new Date().toISOString(),
  };
}
