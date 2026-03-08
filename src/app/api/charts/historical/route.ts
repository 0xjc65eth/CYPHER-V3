import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// REMOVIDO: generateHistoricalData - Não geramos dados históricos falsos
// Apenas dados reais de Binance API ou outras fontes verificadas

function getIntervalInMs(interval: string): number {
  const intervals: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000
  };
  return intervals[interval] || intervals['1h'];
}


export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    // Try Binance API endpoints (primary + fallback for geo-restricted regions)
    const endpoints = [
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    ];

    for (const binanceUrl of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(binanceUrl, {
          signal: controller.signal,
          next: { revalidate: 60 }
        });
        clearTimeout(timeout);

        if (response.ok) {
          const binanceData = await response.json();
          if (Array.isArray(binanceData) && binanceData.length > 0) {
            const formattedData: ChartDataPoint[] = binanceData.map((candle: any[]) => ({
              time: candle[0],
              open: parseFloat(candle[1]),
              high: parseFloat(candle[2]),
              low: parseFloat(candle[3]),
              close: parseFloat(candle[4]),
              volume: parseFloat(candle[5])
            }));

            return NextResponse.json({
              success: true,
              data: formattedData,
              source: 'binance'
            });
          }
        }
      } catch (error) {
        console.error(`Binance API error (${binanceUrl}):`, error);
        // Try next endpoint
      }
    }

    // All endpoints failed - return error, NO MOCK DATA
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch real historical data from Binance API',
        message: 'All Binance endpoints unreachable'
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('Historical data API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch historical data'
      },
      { status: 500 }
    );
  }
}