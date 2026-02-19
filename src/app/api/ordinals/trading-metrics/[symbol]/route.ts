/**
 * Ordinals Trading Metrics API Route
 * Provides VWAP, volume analysis, trade size distribution, and advanced trading metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { magicEdenAPI } from '@/services/ordinals/integrations/MagicEdenAPI';

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
    largeTradesCount: number; // Trades > 2x median
    smallTradesCount: number; // Trades < 0.5x median
  };
  priceMetrics: {
    highestSale24h: number;
    lowestSale24h: number;
    priceRange24h: number;
    priceVolatility: number; // Standard deviation
  };
  marketActivity: {
    listingsAdded24h: number;
    listingsRemoved24h: number;
    netListingChange24h: number;
    listingVelocity: number; // Listings per hour
  };
  timestamp: number;
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

    // Fetch collection stats
    const stats = await magicEdenAPI.getCollectionStats(symbol);

    if (!stats) {
      return NextResponse.json(
        { error: 'Collection stats not found' },
        { status: 404 }
      );
    }

    // Fetch recent activities (sales, listings, etc.)
    const activities = await magicEdenAPI.getCollectionActivity(symbol, undefined, 200, 0);

    // Filter activities by timeframe
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const activities24h = activities.filter(a => a.blockTime * 1000 > oneDayAgo);
    const activities7d = activities.filter(a => a.blockTime * 1000 > sevenDaysAgo);
    const activities30d = activities.filter(a => a.blockTime * 1000 > thirtyDaysAgo);

    // Extract sales
    const sales24h = activities24h.filter(a => a.type === 'sale' && a.price);
    const sales7d = activities7d.filter(a => a.type === 'sale' && a.price);
    const sales30d = activities30d.filter(a => a.type === 'sale' && a.price);

    // Calculate VWAP (Volume Weighted Average Price)
    const calculateVWAP = (sales: typeof sales24h) => {
      if (sales.length === 0) return 0;

      const totalValue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
      const totalVolume = sales.length;

      return totalVolume > 0 ? totalValue / totalVolume : 0;
    };

    const vwap24h = calculateVWAP(sales24h);
    const vwap7d = calculateVWAP(sales7d);

    // Floor price comparison
    const currentFloor = stats.floorPrice;
    const floorVsVwap = currentFloor - vwap24h;
    const floorVsVwapPercentage = vwap24h > 0 ? (floorVsVwap / vwap24h) * 100 : 0;

    // Volume metrics
    const volume24h = stats.volume24h || 0;
    const volume7d = stats.volume7d || 0;
    const volume30d = stats.volume30d || 0;

    const volumeChange24h = volume7d > 0 ? ((volume24h * 7 - volume7d) / volume7d) * 100 : 0;
    const volumeTrend = volumeChange24h > 10 ? 'increasing' :
                        volumeChange24h < -10 ? 'decreasing' : 'stable';

    // Trade metrics
    const trades24h = sales24h.length;
    const trades7d = sales7d.length;
    const trades30d = sales30d.length;

    // Unique buyers and sellers
    const uniqueBuyers24h = new Set(sales24h.map(s => s.toAddress).filter(Boolean)).size;
    const uniqueSellers24h = new Set(sales24h.map(s => s.fromAddress).filter(Boolean)).size;
    const buyerSellerRatio = uniqueSellers24h > 0 ? uniqueBuyers24h / uniqueSellers24h : 0;

    // Trade size distribution
    const tradeSizes = sales24h.map(s => s.price || 0).sort((a, b) => a - b);
    const avgTradeSize = tradeSizes.length > 0 ? tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length : 0;
    const medianTradeSize = tradeSizes.length > 0 ? tradeSizes[Math.floor(tradeSizes.length / 2)] : 0;
    const minTradeSize = tradeSizes.length > 0 ? tradeSizes[0] : 0;
    const maxTradeSize = tradeSizes.length > 0 ? tradeSizes[tradeSizes.length - 1] : 0;

    const largeTradesCount = tradeSizes.filter(size => size > medianTradeSize * 2).length;
    const smallTradesCount = tradeSizes.filter(size => size < medianTradeSize * 0.5).length;

    // Price metrics
    const highestSale24h = maxTradeSize;
    const lowestSale24h = minTradeSize;
    const priceRange24h = highestSale24h - lowestSale24h;

    // Calculate price volatility (standard deviation)
    const variance = tradeSizes.length > 0
      ? tradeSizes.reduce((sum, price) => sum + Math.pow(price - avgTradeSize, 2), 0) / tradeSizes.length
      : 0;
    const priceVolatility = Math.sqrt(variance);

    // Market activity (listings)
    const listings24h = activities24h.filter(a => a.type === 'list');
    const delistings24h = activities24h.filter(a => a.type === 'delist');

    const listingsAdded24h = listings24h.length;
    const listingsRemoved24h = delistings24h.length;
    const netListingChange24h = listingsAdded24h - listingsRemoved24h;
    const listingVelocity = listingsAdded24h / 24; // Per hour

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
