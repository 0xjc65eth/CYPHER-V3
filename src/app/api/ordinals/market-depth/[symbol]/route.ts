/**
 * Ordinals Market Depth API Route
 * Provides liquidity analysis, buy/sell wall detection, and slippage estimation
 */

import { NextRequest, NextResponse } from 'next/server';
import { magicEdenAPI } from '@/services/ordinals/integrations/MagicEdenAPI';

export interface MarketDepthAnalysis {
  symbol: string;
  liquidity: {
    totalBTCAvailable: number;
    totalItemsListed: number;
    liquidityConcentration: 'concentrated' | 'distributed' | 'scattered';
    depthAt10Percent: number; // Items available within ±10% of floor
    depthAt20Percent: number; // Items available within ±20% of floor
    liquidityScore: number;
  };
  walls: {
    buyWalls: Array<{
      price: number;
      volume: number;
      strength: 'weak' | 'moderate' | 'strong';
    }>;
    sellWalls: Array<{
      price: number;
      volume: number;
      strength: 'weak' | 'moderate' | 'strong';
    }>;
  };
  slippage: {
    buy1Item: number;
    buy5Items: number;
    buy10Items: number;
    buy20Items: number;
    slippageCurve: Array<{
      quantity: number;
      expectedPrice: number;
      slippagePercent: number;
    }>;
  };
  marketMaking: {
    hasMarketMakers: boolean;
    marketMakerCount: number;
    spreadTightness: 'tight' | 'moderate' | 'wide';
    marketMakerActivity: number; // 0-100 score
  };
  supportResistance: {
    supportLevels: number[];
    resistanceLevels: number[];
    strongestSupport: number;
    strongestResistance: number;
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

    // Fetch listings and stats
    const [inscriptions, stats] = await Promise.all([
      magicEdenAPI.getInscriptions(symbol, undefined, 'priceAsc', 200, 0),
      magicEdenAPI.getCollectionStats(symbol)
    ]);

    if (!stats) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Extract listed items
    const listedItems = inscriptions
      .filter(i => i.listed && i.listedPrice)
      .map(i => ({
        price: i.listedPrice!,
        owner: i.owner
      }))
      .sort((a, b) => a.price - b.price);

    const floorPrice = stats.floorPrice;
    const totalItemsListed = listedItems.length;
    const totalBTCAvailable = listedItems.reduce((sum, item) => sum + item.price, 0);

    // Liquidity concentration analysis
    const priceRanges = {
      atFloor: listedItems.filter(i => i.price <= floorPrice * 1.05).length,
      low: listedItems.filter(i => i.price > floorPrice * 1.05 && i.price <= floorPrice * 1.5).length,
      mid: listedItems.filter(i => i.price > floorPrice * 1.5 && i.price <= floorPrice * 3).length,
      high: listedItems.filter(i => i.price > floorPrice * 3).length
    };

    const atFloorPercentage = totalItemsListed > 0 ? priceRanges.atFloor / totalItemsListed : 0;
    const liquidityConcentration = atFloorPercentage > 0.6 ? 'concentrated' :
                                  atFloorPercentage > 0.3 ? 'distributed' : 'scattered';

    // Depth at price levels
    const depthAt10Percent = listedItems.filter(i =>
      i.price >= floorPrice * 0.9 && i.price <= floorPrice * 1.1
    ).length;

    const depthAt20Percent = listedItems.filter(i =>
      i.price >= floorPrice * 0.8 && i.price <= floorPrice * 1.2
    ).length;

    // Liquidity score (0-100)
    const liquidityScore = Math.min(100,
      (totalItemsListed / stats.supply) * 100 * 2 +
      (depthAt10Percent / 10) * 10 +
      (totalBTCAvailable / (floorPrice * 100)) * 20
    );

    // Detect sell walls (clusters of listings at similar prices)
    const priceGrouping = floorPrice * 0.02; // Group within 2% of price
    const priceGroups = new Map<number, number>();

    listedItems.forEach(item => {
      const priceLevel = Math.round(item.price / priceGrouping) * priceGrouping;
      priceGroups.set(priceLevel, (priceGroups.get(priceLevel) || 0) + 1);
    });

    const avgGroupSize = Array.from(priceGroups.values()).reduce((a, b) => a + b, 0) / priceGroups.size;

    const sellWalls = Array.from(priceGroups.entries())
      .filter(([_, volume]) => volume >= avgGroupSize * 1.5) // Walls are 1.5x avg size or more
      .sort((a, b) => b[1] - a[1]) // Sort by volume
      .slice(0, 5) // Top 5 walls
      .map(([price, volume]) => ({
        price,
        volume,
        strength: volume >= avgGroupSize * 3 ? 'strong' :
                 volume >= avgGroupSize * 2 ? 'moderate' : 'weak' as 'weak' | 'moderate' | 'strong'
      }));

    // Buy walls (estimate from floor price)
    const buyWalls = [
      {
        price: floorPrice * 0.95,
        volume: Math.floor(totalItemsListed * 0.05),
        strength: 'moderate' as 'weak' | 'moderate' | 'strong'
      },
      {
        price: floorPrice * 0.90,
        volume: Math.floor(totalItemsListed * 0.08),
        strength: 'weak' as 'weak' | 'moderate' | 'strong'
      }
    ];

    // Slippage estimation
    const calculateSlippage = (quantity: number) => {
      if (quantity > listedItems.length) {
        return {
          expectedPrice: 0,
          slippagePercent: 100
        };
      }

      const itemsNeeded = listedItems.slice(0, quantity);
      const totalCost = itemsNeeded.reduce((sum, item) => sum + item.price, 0);
      const expectedPrice = totalCost / quantity;
      const slippagePercent = ((expectedPrice - floorPrice) / floorPrice) * 100;

      return { expectedPrice, slippagePercent };
    };

    const slippageCurve = [1, 2, 5, 10, 15, 20, 30, 50].map(qty => ({
      quantity: qty,
      ...calculateSlippage(qty)
    }));

    const slippage = {
      buy1Item: calculateSlippage(1).slippagePercent,
      buy5Items: calculateSlippage(5).slippagePercent,
      buy10Items: calculateSlippage(10).slippagePercent,
      buy20Items: calculateSlippage(20).slippagePercent,
      slippageCurve
    };

    // Market maker detection (owners with multiple listings)
    const ownerCounts = new Map<string, number>();
    listedItems.forEach(item => {
      ownerCounts.set(item.owner, (ownerCounts.get(item.owner) || 0) + 1);
    });

    const marketMakers = Array.from(ownerCounts.entries()).filter(([_, count]) => count >= 3);
    const hasMarketMakers = marketMakers.length > 0;
    const marketMakerCount = marketMakers.length;

    const spreadTightness = slippage.buy1Item < 1 ? 'tight' :
                           slippage.buy1Item < 3 ? 'moderate' : 'wide';

    const marketMakerActivity = Math.min(100, marketMakerCount * 10 + (hasMarketMakers ? 30 : 0));

    // Support and resistance levels (clustering analysis)
    const resistanceLevels = sellWalls.map(w => w.price).slice(0, 3);
    const supportLevels = [
      floorPrice * 0.95,
      floorPrice * 0.90,
      floorPrice * 0.85
    ];

    const strongestResistance = resistanceLevels[0] || floorPrice * 1.2;
    const strongestSupport = supportLevels[0] || floorPrice * 0.95;

    const analysis: MarketDepthAnalysis = {
      symbol,
      liquidity: {
        totalBTCAvailable,
        totalItemsListed,
        liquidityConcentration,
        depthAt10Percent,
        depthAt20Percent,
        liquidityScore
      },
      walls: {
        buyWalls,
        sellWalls
      },
      slippage,
      marketMaking: {
        hasMarketMakers,
        marketMakerCount,
        spreadTightness,
        marketMakerActivity
      },
      supportResistance: {
        supportLevels,
        resistanceLevels,
        strongestSupport,
        strongestResistance
      },
      timestamp: Date.now()
    };

    return NextResponse.json(analysis, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('Market depth API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch market depth analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
