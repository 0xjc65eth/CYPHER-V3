import { NextResponse } from 'next/server';
import { xverseAPI } from '@/lib/api/xverse';
import { ordinalsMarketService } from '@/services/ordinalsMarketService';

/**
 * Collection Stats API — Xverse Primary + Hiro + Gamma.io Fallback
 * Returns enriched stats for a single collection (volume24h, sales, etc.)
 */

// Simple in-memory cache
const statsCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || '';
    const collectionId = searchParams.get('collectionId') || '';

    if (!symbol && !collectionId) {
      return NextResponse.json(
        { success: false, error: 'Missing symbol or collectionId parameter' },
        { status: 400 }
      );
    }

    const cacheKey = `stats-${symbol || collectionId}`;
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cached.data, cached: true });
    }

    let stats: Record<string, unknown> | null = null;
    const lookupId = collectionId || symbol;

    // 1. Try Xverse (primary)
    if (xverseAPI.isEnabled()) {
      try {
        const xverseDetail = await xverseAPI.getCollectionDetail(lookupId);
        if (xverseDetail) {
          const floorBTC = xverseDetail.floorPrice / 1e8;
          const vol24hBTC = xverseDetail.volume24h / 1e8;
          const totalVolBTC = xverseDetail.totalVolume / 1e8;
          stats = {
            volume24h: vol24hBTC,
            volume7d: 0,
            volume30d: 0,
            sales24h: 0,
            sales7d: 0,
            sales30d: 0,
            floorPrice: floorBTC,
            avgPrice: 0,
            change24h: 0,
            change7d: 0,
            change30d: 0,
            totalVolume: totalVolBTC,
            ownerCount: xverseDetail.ownerCount || 0,
            listedCount: xverseDetail.listedCount || 0,
            supply: xverseDetail.totalSupply || 0,
            marketCap: xverseDetail.marketCap ? xverseDetail.marketCap / 1e8 : 0,
            source: 'xverse',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] Xverse error:', error);
      }
    }

    // 2. Fallback to Hiro
    if (!stats && (symbol || collectionId)) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroRes = await fetch(
          `https://api.hiro.so/ordinals/v1/collections/${encodeURIComponent(lookupId)}`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );
        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          const floorBTC = hiroData.floor_price ? parseInt(String(hiroData.floor_price)) / 1e8 : 0;
          const totalVolBTC = hiroData.total_volume ? parseInt(String(hiroData.total_volume)) / 1e8 : 0;
          stats = {
            volume24h: 0,
            volume7d: 0,
            volume30d: 0,
            sales24h: 0,
            sales7d: 0,
            sales30d: 0,
            floorPrice: floorBTC,
            avgPrice: 0,
            change24h: 0,
            change7d: 0,
            change30d: 0,
            totalVolume: totalVolBTC,
            ownerCount: hiroData.distinct_owner_count || 0,
            listedCount: hiroData.listed_count || 0,
            supply: hiroData.inscription_count || 0,
            source: 'hiro',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] Hiro error:', error);
      }
    }

    // 3. Fallback to Gamma.io
    if (!stats && symbol) {
      try {
        const meStats = await ordinalsMarketService.getCollectionStats(symbol);
        if (meStats) {
          const floorBTC = (Number(meStats.floorPrice) || 0) / 1e8;
          const totalVolBTC = (Number(meStats.totalVolume) || 0) / 1e8;
          stats = {
            volume24h: 0,
            volume7d: 0,
            volume30d: 0,
            sales24h: 0,
            sales7d: 0,
            sales30d: 0,
            floorPrice: floorBTC,
            avgPrice: 0,
            change24h: 0,
            change7d: 0,
            change30d: 0,
            totalVolume: totalVolBTC,
            ownerCount: Number(meStats.owners) || 0,
            listedCount: Number(meStats.listedCount ?? meStats.totalListed) || 0,
            source: 'gamma',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] Gamma.io error:', error);
      }
    }

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'No stats available from any source' },
        { status: 502 }
      );
    }

    statsCache.set(cacheKey, { data: stats, timestamp: Date.now() });

    return NextResponse.json(
      { success: true, data: stats },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('[Collection Stats] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
