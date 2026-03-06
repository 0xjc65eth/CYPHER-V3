/**
 * Ordinals Trading Metrics API Route
 * Provides VWAP, volume analysis, trade size distribution, and advanced trading metrics
 *
 * Data source: Xverse (primary) → Hiro (fallback for stats + activity)
 */

import { NextRequest, NextResponse } from 'next/server';
import { xverseAPI } from '@/lib/api/xverse';

const HIRO_API = 'https://api.hiro.so';
const HIRO_KEY = process.env.HIRO_API_KEY;

const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
if (HIRO_KEY) hiroHeaders['x-hiro-api-key'] = HIRO_KEY;

export interface TradingMetrics {
  symbol: string;
  vwap24h: number;
  vwap7d: number;
  currentFloor: number;
  floorVsVwap: number;
  floorVsVwapPercentage: number;
  volume: {
    volume24h: number;
    volume7d: number;
    volume30d: number;
    volumeChange24h: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  trades: {
    trades24h: number;
    trades7d: number;
    trades30d: number;
    uniqueBuyers24h: number;
    uniqueSellers24h: number;
    buyerSellerRatio: number;
  };
  tradeSize: {
    avgTradeSize: number;
    medianTradeSize: number;
    minTradeSize: number;
    maxTradeSize: number;
    largeTradesCount: number;
    smallTradesCount: number;
  };
  priceMetrics: {
    highestSale24h: number;
    lowestSale24h: number;
    priceRange24h: number;
    priceVolatility: number;
  };
  marketActivity: {
    listingsAdded24h: number;
    listingsRemoved24h: number;
    netListingChange24h: number;
    listingVelocity: number;
  };
  timestamp: number;
}

interface HiroInscription {
  id?: string;
  tx_id?: string;
  address?: string;
  genesis_address?: string;
  genesis_fee?: string | number;
  genesis_timestamp?: number;
  number?: number;
  value?: string | number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // --- Get collection stats: Xverse primary, Hiro fallback ---
    let currentFloor = 0;
    let volume24h = 0;
    let volume7d = 0;
    let volume30d = 0;

    // 1. Try Xverse
    if (xverseAPI.isEnabled()) {
      try {
        const xverseDetail = await xverseAPI.getCollectionDetail(symbol);
        if (xverseDetail) {
          currentFloor = xverseDetail.floorPrice ? xverseDetail.floorPrice / 1e8 : 0;
          volume24h = xverseDetail.volume24h ? xverseDetail.volume24h / 1e8 : 0;
          // Xverse doesn't provide 7d/30d volume, estimate from 24h
          volume7d = volume24h * 7;
          volume30d = volume24h * 30;
        }
      } catch {
        // Xverse failed, fall through to Hiro
      }
    }

    // 2. Fallback to Hiro for stats
    if (currentFloor === 0 && volume24h === 0) {
      try {
        const statsRes = await fetch(
          `${HIRO_API}/ordinals/v1/collections/${encodeURIComponent(symbol)}`,
          { headers: hiroHeaders, signal: AbortSignal.timeout(8000) }
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          currentFloor = statsData.floor_price ? parseInt(String(statsData.floor_price)) / 1e8 : 0;
          volume24h = statsData.volume_24h ? parseInt(String(statsData.volume_24h)) / 1e8 : 0;
          volume7d = volume24h * 7;
          volume30d = volume24h * 30;
        }
      } catch {
        // Hiro stats failed, continue with zeros
      }
    }

    // --- Get activity data from Hiro (Xverse doesn't expose individual trades) ---
    let activities: HiroInscription[] = [];

    try {
      const actRes = await fetch(
        `${HIRO_API}/ordinals/v1/inscriptions?limit=200&order=desc&order_by=genesis_block_height`,
        { headers: hiroHeaders, signal: AbortSignal.timeout(10000) }
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        activities = actData.results || [];
      }
    } catch {
      // Activity fetch failed, continue with empty
    }

    // Filter activities by timeframe
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const getTimestamp = (a: HiroInscription): number => {
      if (!a.genesis_timestamp) return 0;
      const ts = a.genesis_timestamp;
      return ts < 1e12 ? ts * 1000 : ts;
    };

    const activities24h = activities.filter((a) => getTimestamp(a) > oneDayAgo);
    const activities7d = activities.filter((a) => getTimestamp(a) > sevenDaysAgo);
    const activities30d = activities.filter((a) => getTimestamp(a) > thirtyDaysAgo);

    // Extract trade values from genesis_fee (Hiro doesn't have sale price, use genesis_fee as proxy)
    const getPrice = (a: HiroInscription): number => {
      if (a.value) return parseInt(String(a.value)) / 1e8;
      if (a.genesis_fee) return parseInt(String(a.genesis_fee)) / 1e8;
      return 0;
    };

    const sales24h = activities24h.filter((a) => getPrice(a) > 0);
    const sales7d = activities7d.filter((a) => getPrice(a) > 0);
    const sales30d = activities30d.filter((a) => getPrice(a) > 0);

    // Calculate VWAP (Volume Weighted Average Price)
    const calculateVWAP = (sales: HiroInscription[]) => {
      if (sales.length === 0) return 0;
      const totalValue = sales.reduce((sum, sale) => sum + getPrice(sale), 0);
      return totalValue / sales.length;
    };

    const vwap24h = calculateVWAP(sales24h);
    const vwap7d = calculateVWAP(sales7d);

    // Floor price comparison
    const floorVsVwap = currentFloor - vwap24h;
    const floorVsVwapPercentage = vwap24h > 0 ? (floorVsVwap / vwap24h) * 100 : 0;

    // Volume metrics
    const volumeChange24h = volume7d > 0 ? ((volume24h * 7 - volume7d) / volume7d) * 100 : 0;
    const volumeTrend: 'increasing' | 'decreasing' | 'stable' =
      volumeChange24h > 10 ? 'increasing' :
      volumeChange24h < -10 ? 'decreasing' : 'stable';

    // Trade metrics
    const trades24h = sales24h.length;
    const trades7d = sales7d.length;
    const trades30d = sales30d.length;

    // Unique buyers and sellers (using address and genesis_address as proxy)
    const uniqueBuyers24h = new Set(sales24h.map((s) => s.address).filter(Boolean)).size;
    const uniqueSellers24h = new Set(sales24h.map((s) => s.genesis_address).filter(Boolean)).size;
    const buyerSellerRatio = uniqueSellers24h > 0 ? uniqueBuyers24h / uniqueSellers24h : 0;

    // Trade size distribution
    const tradeSizes = sales24h
      .map((s) => getPrice(s))
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    const avgTradeSize = tradeSizes.length > 0 ? tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length : 0;
    const medianTradeSize = tradeSizes.length > 0 ? tradeSizes[Math.floor(tradeSizes.length / 2)] : 0;
    const minTradeSize = tradeSizes.length > 0 ? tradeSizes[0] : 0;
    const maxTradeSize = tradeSizes.length > 0 ? tradeSizes[tradeSizes.length - 1] : 0;

    const largeTradesCount = tradeSizes.filter((size) => size > medianTradeSize * 2).length;
    const smallTradesCount = tradeSizes.filter((size) => size < medianTradeSize * 0.5).length;

    // Price metrics
    const highestSale24h = maxTradeSize;
    const lowestSale24h = minTradeSize;
    const priceRange24h = highestSale24h - lowestSale24h;

    // Calculate price volatility (standard deviation)
    const variance = tradeSizes.length > 0
      ? tradeSizes.reduce((sum, price) => sum + Math.pow(price - avgTradeSize, 2), 0) / tradeSizes.length
      : 0;
    const priceVolatility = Math.sqrt(variance);

    // Market activity (estimate from activity data)
    const listingsAdded24h = activities24h.length;
    const listingsRemoved24h = 0; // Hiro doesn't expose delistings
    const netListingChange24h = listingsAdded24h - listingsRemoved24h;
    const listingVelocity = listingsAdded24h / 24;

    const metrics: TradingMetrics = {
      symbol,
      vwap24h,
      vwap7d,
      currentFloor,
      floorVsVwap,
      floorVsVwapPercentage,
      volume: {
        volume24h,
        volume7d,
        volume30d,
        volumeChange24h,
        volumeTrend
      },
      trades: {
        trades24h,
        trades7d,
        trades30d,
        uniqueBuyers24h,
        uniqueSellers24h,
        buyerSellerRatio
      },
      tradeSize: {
        avgTradeSize,
        medianTradeSize,
        minTradeSize,
        maxTradeSize,
        largeTradesCount,
        smallTradesCount
      },
      priceMetrics: {
        highestSale24h,
        lowestSale24h,
        priceRange24h,
        priceVolatility
      },
      marketActivity: {
        listingsAdded24h,
        listingsRemoved24h,
        netListingChange24h,
        listingVelocity
      },
      timestamp: Date.now()
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('Trading metrics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch trading metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
