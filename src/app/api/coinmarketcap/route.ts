import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rateLimiter';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';
import { FALLBACK_PRICES, FALLBACK_MARKET_DATA, FALLBACK_WARNING } from '@/config/api-keys';

export const dynamic = 'force-dynamic'; // Essential for Netlify

const CMC_API_KEY = process.env.CMC_API_KEY;
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

// Gera dados fallback dinâmicos a partir da config centralizada
function getFallbackData(symbols: string[] = ['BTC', 'ETH', 'SOL']) {
  const current: Record<string, any> = {};
  for (const sym of symbols) {
    const price = FALLBACK_PRICES[sym] || 0;
    const mktData = FALLBACK_MARKET_DATA[sym] || { marketCap: 0, volume24h: 0 };
    current[sym] = {
      price,
      change24h: 0,
      marketCap: mktData.marketCap,
      volume24h: mktData.volume24h,
      lastUpdated: new Date().toISOString(),
    };
  }
  return {
    current,
    historical: generateRecentHistory(FALLBACK_PRICES['BTC'] || 63500, 0),
  };
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols') || 'BTC,ETH';
  const timeframe = searchParams.get('timeframe') || '24h';

  try {
    // Check rate limit first - return proper HTTP response instead of throwing
    if (!rateLimiter.canMakeRequest('coinmarketcap')) {
      // Return fallback data from centralized config
      const requestedSymbols = symbols.split(',').map((s: string) => s.trim());
      return NextResponse.json({
        success: true,
        data: getFallbackData(requestedSymbols),
        source: 'Rate Limit Protection - Fallback',
        timestamp: new Date().toISOString(),
        warning: FALLBACK_WARNING,
        isFallback: true,
      });
    }
    
    if (!CMC_API_KEY) {
      throw new Error('CoinMarketCap API key not found');
    }

    // Get current quotes
    const quotesResponse = await fetch(
      `${CMC_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbols}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!quotesResponse.ok) {
      // Handle rate limit specifically - return response instead of throwing
      if (quotesResponse.status === 429) {
        const requestedSymbols = symbols.split(',').map((s: string) => s.trim());
        return NextResponse.json({
          success: true,
          data: getFallbackData(requestedSymbols),
          source: 'CMC Rate Limit - Fallback',
          timestamp: new Date().toISOString(),
          warning: FALLBACK_WARNING,
          isFallback: true,
        });
      }
      throw new Error(`CMC API error: ${quotesResponse.status}`);
    }

    const quotesData = await quotesResponse.json();

    // Get historical data for charts
    const btcId = 1; // Bitcoin ID in CMC
    const historicalResponse = await fetch(
      `${CMC_BASE_URL}/cryptocurrency/quotes/historical?id=${btcId}&time_period=${timeframe}&interval=1h&count=24`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    let historicalData = null;
    if (historicalResponse.ok) {
      historicalData = await historicalResponse.json();
    }

    // Process the data
    const processedData = {
      current: {},
      historical: [],
    };

    // Process current quotes
    if (quotesData.status.error_code === 0 && quotesData.data) {
      Object.keys(quotesData.data).forEach(symbol => {
        const coin = quotesData.data[symbol];
        if (coin && coin.quote && coin.quote.USD) {
          processedData.current[symbol] = {
            price: coin.quote.USD.price || 0,
            change24h: coin.quote.USD.percent_change_24h || 0,
            change7d: coin.quote.USD.percent_change_7d || 0,
            marketCap: coin.quote.USD.market_cap || 0,
            volume24h: coin.quote.USD.volume_24h || 0,
            lastUpdated: coin.last_updated || new Date().toISOString(),
          };
        }
      });
    }

    // Process historical data
    if (historicalData && historicalData.status.error_code === 0) {
      processedData.historical = historicalData.data.quotes.map((quote: any, index: number) => ({
        time: new Date(quote.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        }),
        price: Math.round(quote.quote.USD.price),
        volume: Math.round(quote.quote.USD.volume_24h / 1000000), // Volume in millions
        change: ((quote.quote.USD.price - (historicalData.data.quotes[0]?.quote.USD.price || quote.quote.USD.price)) / (historicalData.data.quotes[0]?.quote.USD.price || 1)) * 100,
        marketCap: quote.quote.USD.market_cap,
      }));
    }

    // Return processedData even if it's partial
    return NextResponse.json({
      success: true,
      data: processedData,
      source: 'CoinMarketCap',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('CoinMarketCap API Error:', error);
    
    // Always return graceful fallback - never throw unhandled errors that crash server
    // This prevents server crashes from API failures
    
    // Fallback data structure (minimal, real-time via other source)
    try {
      // Check CoinGecko rate limit - don't throw, just skip to hardcoded
      if (!rateLimiter.canMakeRequest('coingecko')) {
        // Skip to hardcoded fallback instead of throwing
        throw new Error('SKIP_TO_HARDCODED');
      }
      
      // Fallback to a free API with rate limiting
      const fallbackData = await rateLimitedFetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true'
      );
      
      const processedFallback = {
        current: {
          BTC: {
            price: fallbackData.bitcoin.usd,
            change24h: fallbackData.bitcoin.usd_24h_change,
            marketCap: fallbackData.bitcoin.usd_market_cap,
            volume24h: fallbackData.bitcoin.usd_24h_vol,
            lastUpdated: new Date().toISOString(),
          },
          ETH: {
            price: fallbackData.ethereum.usd,
            change24h: fallbackData.ethereum.usd_24h_change,
            marketCap: fallbackData.ethereum.usd_market_cap,
            volume24h: fallbackData.ethereum.usd_24h_vol,
            lastUpdated: new Date().toISOString(),
          }
        },
        historical: generateRecentHistory(fallbackData.bitcoin.usd, fallbackData.bitcoin.usd_24h_change),
      };

      return NextResponse.json({
        success: true,
        data: processedFallback,
        source: 'CoinGecko (Fallback)',
        timestamp: new Date().toISOString(),
        warning: 'Using fallback API due to CoinMarketCap error',
      });

    } catch (fallbackError) {
      console.error('Fallback API Error:', fallbackError);
      
      // Return centralized fallback data as last resort
      return NextResponse.json({
        success: true,
        data: getFallbackData(['BTC', 'ETH', 'SOL', 'ORDI', 'RUNE', 'MATIC']),
        source: 'Emergency Fallback',
        timestamp: new Date().toISOString(),
        warning: FALLBACK_WARNING,
        isFallback: true,
      });
    }
  }
}

function generateRecentHistory(currentPrice: number, change24h: number) {
  const data = [];
  const now = Date.now();
  
  for (let i = 23; i >= 0; i--) {
    const time = now - (i * 60 * 60 * 1000);
    // Create realistic price movement
    const hourlyChange = (change24h / 24) + (Math.random() - 0.5) * 2; // ±1% random
    const price = currentPrice * (1 - (change24h / 100) * (i / 24) + (hourlyChange / 100));
    
    data.push({
      time: new Date(time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }),
      price: Math.round(price),
      volume: Math.round(Math.random() * 1000 + 500),
      change: hourlyChange,
    });
  }
  
  return data;
}