import { NextRequest, NextResponse } from 'next/server';

interface AnalyticsMetrics {
  price: {
    current: number;
    change24h: number;
    change7d: number;
    ath: number;
    atl: number;
  };
  market: {
    cap: number;
    volume24h: number;
    dominance: number;
    circulatingSupply: number;
    maxSupply: number;
  };
  onChain: {
    hashRate: number;
    difficulty: number;
    blockHeight: number;
    blockTime: number;
    mempoolSize: number;
    medianFee: number;
    activeAddresses: number;
    transactionCount: number;
  };
  technical: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    ma50: number;
    ma200: number;
  };
  sentiment: {
    fearGreedIndex: number;
    socialVolume: number;
    newsVolume: number;
    sentiment: 'bullish' | 'neutral' | 'bearish';
  };
}

// Mock data generator
function generateMetrics(): AnalyticsMetrics {
  const basePrice = 98500;
  
  return {
    price: {
      current: basePrice + (Math.random() - 0.5) * 1000,
      change24h: (Math.random() - 0.5) * 10,
      change7d: (Math.random() - 0.5) * 15,
      ath: 103500,
      atl: 15500
    },
    market: {
      cap: 1920000000000 + (Math.random() - 0.5) * 50000000000,
      volume24h: 45678900000 + (Math.random() - 0.5) * 5000000000,
      dominance: 52.3 + (Math.random() - 0.5) * 2,
      circulatingSupply: 19500000,
      maxSupply: 21000000
    },
    onChain: {
      hashRate: 450.5 + (Math.random() - 0.5) * 20,
      difficulty: 72.01 + (Math.random() - 0.5) * 5,
      blockHeight: 825000 + Math.floor(Math.random() * 10),
      blockTime: 10 + (Math.random() - 0.5) * 2,
      mempoolSize: 125 + (Math.random() - 0.5) * 50,
      medianFee: 30 + (Math.random() - 0.5) * 10,
      activeAddresses: 1000000 + Math.floor(Math.random() * 100000),
      transactionCount: 350000 + Math.floor(Math.random() * 50000)
    },
    technical: {
      rsi: 50 + (Math.random() - 0.5) * 40,
      macd: {
        value: 1250 + (Math.random() - 0.5) * 500,
        signal: 1200 + (Math.random() - 0.5) * 400,
        histogram: 50 + (Math.random() - 0.5) * 100
      },
      bollinger: {
        upper: basePrice + 5000,
        middle: basePrice,
        lower: basePrice - 5000
      },
      ma50: basePrice - 3000,
      ma200: basePrice - 10000
    },
    sentiment: {
      fearGreedIndex: 65 + Math.floor((Math.random() - 0.5) * 20),
      socialVolume: 85000 + Math.floor(Math.random() * 15000),
      newsVolume: 1250 + Math.floor(Math.random() * 250),
      sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish'
    }
  };
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '24h';
    const metrics = searchParams.get('metrics')?.split(',') || ['all'];

    // Generate metrics data
    const fullMetrics = generateMetrics();

    // Filter metrics if specific ones requested
    let filteredMetrics: any = {};
    
    if (metrics.includes('all')) {
      filteredMetrics = fullMetrics;
    } else {
      metrics.forEach(metric => {
        if (metric in fullMetrics) {
          filteredMetrics[metric] = fullMetrics[metric as keyof AnalyticsMetrics];
        }
      });
    }

    // Try to fetch real data from multiple sources
    const promises = [];
    
    // CoinGecko for price data
    if (metrics.includes('all') || metrics.includes('price')) {
      promises.push(
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_7d_change=true')
          .then(res => res.json())
          .catch(() => null)
      );
    }

    // Execute all promises
    const results = await Promise.all(promises);
    
    // Merge real data with mock data
    if (results[0] && results[0].bitcoin) {
      filteredMetrics.price.current = results[0].bitcoin.usd;
      filteredMetrics.price.change24h = results[0].bitcoin.usd_24h_change || filteredMetrics.price.change24h;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeframe,
      data: filteredMetrics
    });

  } catch (error) {
    console.error('Analytics metrics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}