/**
 * Ordinals Order Book API Route
 * Provides bid/ask depth, market depth analysis, and order book visualization data
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { okxOrdinalsAPI as ordinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

export interface OrderBookLevel {
  price: number;
  quantity: number;
  totalValue: number;
  cumulativeQuantity: number;
  cumulativeValue: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  bestBid: number | null;
  bestAsk: number | null;
  totalBidVolume: number;
  totalAskVolume: number;
  liquidityScore: number;
  depthScore: number;
  timestamp: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;

    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Collection symbol is required' },
        { status: 400 }
      );
    }

    // Fetch listings (asks/sell orders) from OKX
    const inscriptionsResult = await ordinalsAPI.getInscriptions(symbol, undefined, undefined, undefined, 'priceAsc', 100);

    // Fetch recent sales for bid estimation
    const activitiesResult = await ordinalsAPI.getCollectionActivity(symbol, ['BUY'], 50);

    const inscriptions = inscriptionsResult.inscriptions;
    const activities = activitiesResult.activities;

    // Build ask side (sell orders) from listings
    const listedItems = inscriptions
      .filter((i) => i.listingInfo?.price)
      .map((i) => ({
        price: parseFloat(i.listingInfo!.price),
        inscriptionId: i.inscriptionId
      }))
      .sort((a, b) => a.price - b.price);

    // Group asks by price level (group within 0.0001 BTC)
    const priceGrouping = 0.0001;
    const asksMap = new Map<number, number>();

    listedItems.forEach((item) => {
      const priceLevel = Math.round(item.price / priceGrouping) * priceGrouping;
      asksMap.set(priceLevel, (asksMap.get(priceLevel) || 0) + 1);
    });

    // Build asks array with cumulative data
    let cumulativeQty = 0;
    let cumulativeVal = 0;

    const asks: OrderBookLevel[] = Array.from(asksMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 20)
      .map(([price, quantity]) => {
        cumulativeQty += quantity;
        const totalValue = price * quantity;
        cumulativeVal += totalValue;

        return {
          price,
          quantity,
          totalValue,
          cumulativeQuantity: cumulativeQty,
          cumulativeValue: cumulativeVal
        };
      });

    // Estimate bids from recent sales (use prices slightly below recent sales)
    const recentSales = activities
      .filter((a) => a.price)
      .slice(0, 30)
      .map((a) => parseFloat(a.price!));

    const avgRecentPrice = recentSales.length > 0
      ? recentSales.reduce((sum, p) => sum + p, 0) / recentSales.length
      : (asks[0]?.price ?? 0) * 0.95;

    // Generate synthetic bid levels (typically 2-5% below market)
    const bidsMap = new Map<number, number>();
    const bidPriceSteps = [0.98, 0.96, 0.94, 0.92, 0.90, 0.88];

    bidPriceSteps.forEach((pct, index) => {
      const bidPrice = Math.round((avgRecentPrice * pct) / priceGrouping) * priceGrouping;
      const estimatedQty = Math.max(1, Math.floor(5 - index * 0.5));
      bidsMap.set(bidPrice, estimatedQty);
    });

    // Build bids array with cumulative data (descending price order)
    cumulativeQty = 0;
    cumulativeVal = 0;

    const bids: OrderBookLevel[] = Array.from(bidsMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([price, quantity]) => {
        cumulativeQty += quantity;
        const totalValue = price * quantity;
        cumulativeVal += totalValue;

        return {
          price,
          quantity,
          totalValue,
          cumulativeQuantity: cumulativeQty,
          cumulativeValue: cumulativeVal
        };
      });

    // Calculate order book metrics
    const bestBid = bids.length > 0 ? bids[0].price : null;
    const bestAsk = asks.length > 0 ? asks[0].price : null;

    const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestAsk || 0;
    const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    const totalBidVolume = bids.reduce((sum, b) => sum + b.totalValue, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.totalValue, 0);

    // Calculate liquidity score (0-100)
    const totalItems = listedItems.length;
    const liquidityScore = Math.min(100, totalItems / 10 * 10 + totalAskVolume * 10);

    // Calculate depth score (0-100) - based on order book thickness
    const depthScore = Math.min(100,
      (asks.length / 20) * 50 +
      (bids.length / 6) * 50
    );

    const orderBook: OrderBookData = {
      symbol,
      bids,
      asks,
      spread,
      spreadPercentage,
      midPrice,
      bestBid,
      bestAsk,
      totalBidVolume,
      totalAskVolume,
      liquidityScore,
      depthScore,
      timestamp: Date.now()
    };

    return NextResponse.json(orderBook, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30'
      }
    });

  } catch (error) {
    console.error('Order book API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch order book data',
      },
      { status: 500 }
    );
  }
}
