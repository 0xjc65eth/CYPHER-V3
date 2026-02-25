import { NextRequest, NextResponse } from 'next/server';
import { marketDataSchema } from '@/lib/validation/schemas';
import { cacheInstances } from '@/lib/cache/advancedCache';
import { applyRateLimit, apiRateLimiters } from '@/lib/api/middleware/rateLimiter';
import { coinMarketCapService } from '@/services/CoinMarketCapService';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, apiRateLimiters.market);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all'; // crypto, ordinals, runes, brc20
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sort') || 'market_cap'; // market_cap, volume, price, change
    const timeframe = searchParams.get('timeframe') || '24h'; // 1h, 24h, 7d, 30d

    // Check cache first
    const cacheKey = `market-data:${category}:${limit}:${sortBy}:${timeframe}`;
    let marketData = await cacheInstances.get(cacheKey);

    if (!marketData) {
      marketData = await fetchMarketData({
        category,
        limit,
        sortBy,
        timeframe
      });

      // Cache for 30 seconds
      await cacheInstances.set(cacheKey, marketData, 30);
    }

    // Validate data structure
    const validation = marketDataSchema.safeParse(marketData);
    if (!validation.success) {
      console.error('Market data validation failed:', validation.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid market data structure' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: marketData,
      filters: {
        category,
        limit,
        sortBy,
        timeframe
      },
      metadata: {
        cached: !!marketData,
        nextUpdate: new Date(Date.now() + 30000).toISOString()
      }
    });

  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchMarketData(options: {
  category: string;
  limit: number;
  sortBy: string;
  timeframe: string;
}) {
  try {
    // Fetch data from multiple sources
    const [cryptoData, bitcoinEcosystem, globalMetrics] = await Promise.allSettled([
      fetchCryptoMarketData(options),
      fetchBitcoinEcosystemData(options),
      fetchGlobalMarketMetrics()
    ]);

    // Process results
    const crypto = cryptoData.status === 'fulfilled' ? cryptoData.value : [];
    const ecosystem = bitcoinEcosystem.status === 'fulfilled' ? bitcoinEcosystem.value : [];
    const global = globalMetrics.status === 'fulfilled' ? globalMetrics.value : getDefaultGlobalMetrics();

    // Combine and filter data based on category
    let allTickers = [...crypto, ...ecosystem];
    
    if (options.category !== 'all') {
      allTickers = allTickers.filter(ticker => 
        ticker.category === options.category || 
        (options.category === 'crypto' && ['bitcoin', 'ethereum'].includes(ticker.category))
      );
    }

    // Sort data
    allTickers.sort((a, b) => {
      switch (options.sortBy) {
        case 'market_cap':
          return (b.marketCap || 0) - (a.marketCap || 0);
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'price':
          return b.price - a.price;
        case 'change':
          return b.change24h - a.change24h;
        default:
          return (b.marketCap || 0) - (a.marketCap || 0);
      }
    });

    // Limit results
    const limitedTickers = allTickers.slice(0, options.limit);

    // Get trending assets
    const trending = getTrendingAssets(allTickers, options.timeframe);

    return {
      tickers: limitedTickers,
      overview: global,
      trending
    };

  } catch (error) {
    console.error('Error fetching market data:', error);
    throw new Error('Failed to fetch market data');
  }
}

async function fetchCryptoMarketData(options: any) {
  try {
    // Fetch real data from CoinMarketCap
    const listings = await coinMarketCapService.getCryptocurrencyListings({
      limit: Math.min(options.limit || 100, 200),
      sort: 'market_cap',
      sort_dir: 'desc',
      convert: 'USD'
    });

    // Transform CMC data to our format
    const cryptoAssets = listings.map(crypto => {
      const usdQuote = crypto.quote.USD;
      return {
        symbol: crypto.symbol,
        name: crypto.name,
        category: crypto.symbol === 'BTC' ? 'bitcoin' : crypto.symbol === 'ETH' ? 'ethereum' : 'crypto',
        price: usdQuote.price,
        change24h: usdQuote.percent_change_24h,
        change24hPercent: usdQuote.percent_change_24h,
        volume24h: usdQuote.volume_24h,
        marketCap: usdQuote.market_cap,
        high24h: usdQuote.price * 1.02, // Estimate high/low since CMC doesn't provide 24h high/low in basic plan
        low24h: usdQuote.price * 0.98,
        timestamp: new Date(usdQuote.last_updated),
        id: crypto.id,
        rank: crypto.cmc_rank,
        circulatingSupply: crypto.circulating_supply,
        totalSupply: crypto.total_supply,
        maxSupply: crypto.max_supply
      };
    });

    return cryptoAssets;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to fetch real crypto market data, falling back to mock data');
    // Fallback to basic mock data if API fails
    // Fallback data atualizado em 2026-02-24
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        category: 'bitcoin',
        price: 63500,
        change24h: 0,
        change24hPercent: 0,
        volume24h: 25000000000,
        marketCap: 1250000000000,
        high24h: 64500,
        low24h: 62500,
        timestamp: new Date()
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        category: 'ethereum',
        price: 1850,
        change24h: 0,
        change24hPercent: 0,
        volume24h: 12000000000,
        marketCap: 223000000000,
        high24h: 1900,
        low24h: 1800,
        timestamp: new Date()
      }
    ];
  }
}

async function fetchBitcoinEcosystemData(options: any) {
  try {
    // Fetch BRC-20 tokens (ORDI, SATS) from CoinGecko
    const brc20Response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ordi,1000sats-ordinals&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      { next: { revalidate: 60 } }
    );

    const ecosystemAssets: any[] = [];

    if (brc20Response.ok) {
      const brc20Data = await brc20Response.json();

      if (brc20Data.ordi) {
        ecosystemAssets.push({
          symbol: 'ORDI',
          name: 'Ordinals',
          category: 'brc20',
          price: brc20Data.ordi.usd || 0,
          change24h: brc20Data.ordi.usd_24h_change || 0,
          change24hPercent: brc20Data.ordi.usd_24h_change || 0,
          volume24h: brc20Data.ordi.usd_24h_vol || 0,
          marketCap: brc20Data.ordi.usd_market_cap || 0,
          high24h: 0,
          low24h: 0,
          timestamp: new Date()
        });
      }

      if (brc20Data['1000sats-ordinals']) {
        const satsData = brc20Data['1000sats-ordinals'];
        ecosystemAssets.push({
          symbol: 'SATS',
          name: '1000SATS',
          category: 'brc20',
          price: satsData.usd || 0,
          change24h: satsData.usd_24h_change || 0,
          change24hPercent: satsData.usd_24h_change || 0,
          volume24h: satsData.usd_24h_vol || 0,
          marketCap: satsData.usd_market_cap || 0,
          high24h: 0,
          low24h: 0,
          timestamp: new Date()
        });
      }
    }

    // Note: Runes (SATOSHI•NAKAMOTO, DOG•GO•TO•THE•MOON) and Ordinals collections
    // are not available on CoinGecko. These would need Magic Eden API integration.
    // Rather than returning fake data, we skip them.

    return ecosystemAssets;
  } catch (error) {
    console.error('Error fetching Bitcoin ecosystem data:', error);
    return []; // Return empty array instead of fake data
  }
}

async function fetchGlobalMarketMetrics() {
  try {
    // Fetch real global metrics from CoinMarketCap
    const globalData = await coinMarketCapService.getGlobalMetrics('USD');
    const usdQuote = globalData.quote.USD;
    
    return {
      totalMarketCap: usdQuote.total_market_cap,
      totalVolume24h: usdQuote.total_volume_24h,
      btcDominance: globalData.btc_dominance,
      totalSupply: 21000000, // Bitcoin total supply
      activeCurrencies: globalData.active_cryptocurrencies,
      defiMarketCap: globalData.defi_market_cap,
      defiVolume24h: globalData.defi_volume_24h,
      stablecoinMarketCap: globalData.stablecoin_market_cap,
      stablecoinVolume24h: globalData.stablecoin_volume_24h,
      ethDominance: globalData.eth_dominance,
      lastUpdated: globalData.last_updated
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to fetch real global metrics, falling back to mock data');
    // Fallback to mock data if API fails
    // Fallback métricas globais - atualizado 2026-02-24
    return {
      totalMarketCap: 2100000000000,
      totalVolume24h: 80000000000,
      btcDominance: 60,
      totalSupply: 21000000,
      activeCurrencies: 15000
    };
  }
}

function getDefaultGlobalMetrics() {
  return {
    totalMarketCap: 2100000000000,
    totalVolume24h: 80000000000,
    btcDominance: 60,
    totalSupply: 21000000,
    activeCurrencies: 15000
  };
}

function getTrendingAssets(tickers: any[], timeframe: string) {
  // Sort by change percentage and return top movers
  const topGainers = [...tickers]
    .sort((a, b) => b.change24hPercent - a.change24hPercent)
    .slice(0, 5)
    .map(ticker => ({
      id: ticker.symbol.toLowerCase(),
      name: ticker.name,
      symbol: ticker.symbol,
      price: ticker.price,
      change24h: ticker.change24h,
      volume24h: ticker.volume24h
    }));

  return topGainers;
}