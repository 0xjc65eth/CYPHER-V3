/**
 * Order Book Depth API
 * Fetches and analyzes order book depth from multiple exchanges
 * GET /api/arbitrage/depth?symbol=BTC/USDT&exchanges=binance,kraken,coinbase
 */

import { NextRequest, NextResponse } from 'next/server';
import { ccxtIntegration, OrderBook } from '@/services/arbitrage/CCXTIntegration';
import { cache } from '@/lib/cache/redis.config';
import { dbService } from '@/lib/database/db-service';

interface DepthAnalysis {
  exchange: string;
  symbol: string;
  bidDepth: number; // Total volume in bids
  askDepth: number; // Total volume in asks
  spreadBps: number; // Spread in basis points
  slippageFor1BTC: number; // Expected slippage for 1 BTC trade
  slippageFor10BTC: number; // Expected slippage for 10 BTC trade
  topBid: { price: number; volume: number };
  topAsk: { price: number; volume: number };
  imbalance: number; // Bid depth / Ask depth ratio
  timestamp: number;
}

interface AggregatedDepth {
  symbol: string;
  exchanges: DepthAnalysis[];
  bestBidExchange: string;
  bestAskExchange: string;
  bestBid: number;
  bestAsk: number;
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  avgSlippage1BTC: number;
  timestamp: number;
}

// Calculate slippage for a given trade size
function calculateSlippage(
  orders: [number, number][],
  tradeSize: number,
  isBuy: boolean
): number {
  let remainingSize = tradeSize;
  let totalCost = 0;
  let averagePrice = 0;

  for (const [price, volume] of orders) {
    if (remainingSize <= 0) break;

    const fillSize = Math.min(remainingSize, volume);
    totalCost += price * fillSize;
    remainingSize -= fillSize;
  }

  if (tradeSize > 0) {
    averagePrice = totalCost / (tradeSize - remainingSize);
  }

  // Slippage = (averagePrice - bestPrice) / bestPrice * 100
  const bestPrice = orders[0]?.[0] || 0;
  const slippage = bestPrice > 0 ? ((averagePrice - bestPrice) / bestPrice) * 100 : 0;

  return Math.abs(slippage);
}

// Calculate total depth (liquidity)
function calculateDepth(orders: [number, number][]): number {
  return orders.reduce((sum, [_price, volume]) => sum + volume, 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC/USDT';
    const exchangesParam = searchParams.get('exchanges');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Parse exchanges
    let exchangeList: string[] = [];
    if (exchangesParam) {
      exchangeList = exchangesParam.split(',').map(e => e.trim());
    } else {
      // Default to all supported exchanges
      exchangeList = ccxtIntegration.getExchanges().map(e => e.id);
    }

    // Fetch order books from all exchanges in parallel
    const depthPromises = exchangeList.map(async (exchangeId): Promise<DepthAnalysis | null> => {
      try {
        const orderBook = await ccxtIntegration.fetchOrderBook(exchangeId, symbol, limit);
        if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
          return null;
        }

        const topBid = orderBook.bids[0];
        const topAsk = orderBook.asks[0];
        const spread = topAsk[0] - topBid[0];
        const spreadBps = (spread / topBid[0]) * 10000; // basis points

        const bidDepth = calculateDepth(orderBook.bids);
        const askDepth = calculateDepth(orderBook.asks);
        const imbalance = askDepth > 0 ? bidDepth / askDepth : 1;

        const slippage1BTC = calculateSlippage(orderBook.asks, 1, true);
        const slippage10BTC = calculateSlippage(orderBook.asks, 10, true);

        const analysis: DepthAnalysis = {
          exchange: exchangeId,
          symbol,
          bidDepth,
          askDepth,
          spreadBps,
          slippageFor1BTC: slippage1BTC,
          slippageFor10BTC: slippage10BTC,
          topBid: { price: topBid[0], volume: topBid[1] },
          topAsk: { price: topAsk[0], volume: topAsk[1] },
          imbalance,
          timestamp: orderBook.timestamp
        };

        // Store in database for historical analysis
        try {
          await dbService.query(
            `INSERT INTO order_book_snapshots (exchange, symbol, bids, asks, timestamp)
             VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000))`,
            [
              exchangeId,
              symbol,
              JSON.stringify(orderBook.bids.slice(0, 10)), // Store top 10 levels
              JSON.stringify(orderBook.asks.slice(0, 10)),
              orderBook.timestamp
            ]
          );
        } catch (dbError) {
          console.error('DB insert error:', dbError);
          // Continue even if DB fails
        }

        return analysis;
      } catch (error) {
        console.error(`Error fetching depth from ${exchangeId}:`, error);
        return null;
      }
    });

    const depthResults = await Promise.all(depthPromises);
    const validDepths = depthResults.filter((d): d is DepthAnalysis => d !== null);

    if (validDepths.length === 0) {
      return NextResponse.json(
        { error: 'No order book data available' },
        { status: 404 }
      );
    }

    // Find best bid and ask
    const bestBidExchange = validDepths.reduce((best, current) =>
      current.topBid.price > best.topBid.price ? current : best
    );

    const bestAskExchange = validDepths.reduce((best, current) =>
      current.topAsk.price < best.topAsk.price ? current : best
    );

    // Aggregate statistics
    const aggregated: AggregatedDepth = {
      symbol,
      exchanges: validDepths,
      bestBidExchange: bestBidExchange.exchange,
      bestAskExchange: bestAskExchange.exchange,
      bestBid: bestBidExchange.topBid.price,
      bestAsk: bestAskExchange.topAsk.price,
      totalBidLiquidity: validDepths.reduce((sum, d) => sum + d.bidDepth, 0),
      totalAskLiquidity: validDepths.reduce((sum, d) => sum + d.askDepth, 0),
      avgSlippage1BTC: validDepths.reduce((sum, d) => sum + d.slippageFor1BTC, 0) / validDepths.length,
      timestamp: Date.now()
    };

    // Cache the result
    const cacheKey = `depth:${symbol}:${exchangesParam || 'all'}`;
    await cache.setex(cacheKey, 30, JSON.stringify(aggregated));

    return NextResponse.json(aggregated);

  } catch (error) {
    console.error('Depth API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
