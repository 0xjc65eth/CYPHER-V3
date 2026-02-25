import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Try Binance API endpoints (primary + fallback for geo-restricted regions)
    let klineData = [];
    const endpoints = [
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    ];

    for (const binanceUrl of endpoints) {
      if (klineData.length > 0) break;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(binanceUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            klineData = data.map((kline: any[]) => ({
              openTime: kline[0],
              open: parseFloat(kline[1]),
              high: parseFloat(kline[2]),
              low: parseFloat(kline[3]),
              close: parseFloat(kline[4]),
              volume: parseFloat(kline[5]),
              closeTime: kline[6],
              timestamp: new Date(kline[0]).toISOString()
            }));
          }
        }
      } catch (error) {
        // Try next endpoint
      }
    }

    // If the Binance API failed, return empty data instead of fake candles
    if (klineData.length === 0) {
      console.warn('[binance/klines] API failed, returning empty data');
      return NextResponse.json({
        success: false,
        data: [],
        symbol,
        interval,
        count: 0,
        source: 'fallback',
        error: 'Binance API unavailable'
      });
    }

    return NextResponse.json({
      success: true,
      data: klineData,
      symbol,
      interval,
      count: klineData.length,
      source: 'binance'
    });

  } catch (error) {
    console.error('Klines API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch kline data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}