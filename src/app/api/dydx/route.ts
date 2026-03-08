import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { dydxService } from '@/services/dydx-service';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');
  const ticker = searchParams.get('ticker') || 'BTC-USD';
  const resolution = searchParams.get('resolution') || '1HOUR';

  try {
    switch (endpoint) {
      case 'markets': {
        const markets = await dydxService.getMarkets();
        return NextResponse.json({
          data: markets,
          count: markets.length,
          timestamp: new Date().toISOString(),
          source: 'dydx-v4',
        });
      }

      case 'orderbook': {
        const orderbook = await dydxService.getOrderbook(ticker);
        return NextResponse.json({
          data: orderbook,
          ticker,
          timestamp: new Date().toISOString(),
          source: 'dydx-v4',
        });
      }

      case 'candles': {
        const candles = await dydxService.getCandles(
          ticker,
          resolution as any
        );
        return NextResponse.json({
          data: candles,
          ticker,
          resolution,
          count: candles.length,
          timestamp: new Date().toISOString(),
          source: 'dydx-v4',
        });
      }

      case 'trades': {
        const trades = await dydxService.getTrades(ticker);
        return NextResponse.json({
          data: trades,
          ticker,
          count: trades.length,
          timestamp: new Date().toISOString(),
          source: 'dydx-v4',
        });
      }

      case 'funding': {
        const rates = await dydxService.getFundingRates(ticker);
        return NextResponse.json({
          data: rates,
          ticker,
          count: rates.length,
          timestamp: new Date().toISOString(),
          source: 'dydx-v4',
        });
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid endpoint',
            validEndpoints: [
              'markets',
              'orderbook',
              'candles',
              'trades',
              'funding',
            ],
            usage:
              '?endpoint=markets | ?endpoint=orderbook&ticker=BTC-USD | ?endpoint=candles&ticker=BTC-USD&resolution=1HOUR',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[dYdX API Route] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dYdX data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
