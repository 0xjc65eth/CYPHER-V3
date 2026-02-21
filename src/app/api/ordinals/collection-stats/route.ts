import { NextResponse } from 'next/server';
import { bestInSlotAPI } from '@/services/ordinals/integrations/BestInSlotAPI';
import { okxOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';
import { magicEdenService } from '@/services/magicEdenService';

/**
 * Collection Stats API - BestInSlot Primary + OKX + Magic Eden Fallback
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

    // Try BestInSlot first (real-time, up-to-date)
    if (bestInSlotAPI.isConfigured && symbol) {
      try {
        const bisStats = await bestInSlotAPI.getCollectionStats(symbol);
        if (bisStats) {
          stats = {
            volume24h: (bisStats.volume_24h || 0) / 1e8,
            volume7d: (bisStats.volume_7d || 0) / 1e8,
            volume30d: (bisStats.volume_30d || 0) / 1e8,
            sales24h: bisStats.sales_24h || 0,
            sales7d: bisStats.sales_7d || 0,
            sales30d: bisStats.sales_30d || 0,
            floorPrice: (bisStats.floor_price || 0) / 1e8,
            avgPrice: (bisStats.avg_price_24h || 0) / 1e8,
            change24h: bisStats.change_24h || 0,
            change7d: bisStats.change_7d || 0,
            change30d: bisStats.change_30d || 0,
            totalVolume: (bisStats.total_volume || 0) / 1e8,
            ownerCount: bisStats.owners || 0,
            listedCount: bisStats.listed || 0,
            source: 'bestinslot',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] BestInSlot error:', error);
      }
    }

    // Try OKX
    if (!stats && (collectionId || symbol)) {
      try {
        const okxStats = await okxOrdinalsAPI.getCollectionStats(collectionId || symbol, '24h');
        if (okxStats) {
          stats = {
            volume24h: parseFloat(okxStats.volume24h) || 0,
            volume7d: parseFloat(okxStats.volume7d) || 0,
            volume30d: parseFloat(okxStats.volume30d) || 0,
            sales24h: okxStats.sales24h || 0,
            sales7d: okxStats.sales7d || 0,
            sales30d: okxStats.sales30d || 0,
            floorPrice: parseFloat(okxStats.floorPrice) || 0,
            avgPrice: parseFloat(okxStats.avgPrice) || 0,
            change24h: parseFloat(okxStats.change24h) || 0,
            change7d: parseFloat(okxStats.change7d) || 0,
            change30d: parseFloat(okxStats.change30d) || 0,
            totalVolume: parseFloat(okxStats.totalVolume) || 0,
            ownerCount: okxStats.ownerCount || 0,
            listedCount: okxStats.listedCount || 0,
            source: 'okx',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] OKX error:', error);
      }
    }

    // Fallback to Magic Eden
    if (!stats && symbol) {
      try {
        const meStats = await magicEdenService.getCollectionStats(symbol);
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
            source: 'magic_eden',
          };
        }
      } catch (error) {
        console.error('[Collection Stats] Magic Eden error:', error);
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
