import { NextRequest, NextResponse } from 'next/server';

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Helper function to generate mock historical data
function generateHistoricalData(
  symbol: string,
  interval: string,
  limit: number
): ChartDataPoint[] {
  const now = Date.now();
  const intervalMs = getIntervalInMs(interval);
  const basePrice = symbol === 'BTCUSDT' ? 98500 : 1000;
  const data: ChartDataPoint[] = [];

  for (let i = limit - 1; i >= 0; i--) {
    const time = now - (i * intervalMs);
    const randomVariation = (Math.random() - 0.5) * 0.02; // 2% variation
    const close = basePrice * (1 + randomVariation);
    const open = close * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.random() * 1000000;

    data.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return data;
}

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
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    // Try to fetch from Binance API first
    try {
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(binanceUrl, { 
        next: { revalidate: 60 } // Cache for 1 minute
      });

      if (response.ok) {
        const binanceData = await response.json();
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
    } catch (error) {
      console.error('Binance API error:', error);
    }

    // Fallback to mock data
    const mockData = generateHistoricalData(symbol, interval, limit);
    
    return NextResponse.json({
      success: true,
      data: mockData,
      source: 'mock'
    });

  } catch (error) {
    console.error('Historical data API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch historical data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}