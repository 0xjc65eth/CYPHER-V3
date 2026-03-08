import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { realDataService } from '@/services/realDataService';
import { coinMarketCapService } from '@/services/CoinMarketCapService';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Primary: Try CoinMarketCap for Bitcoin data
    logger.info('Fetching Bitcoin data from CoinMarketCap');
    const bitcoinData = await coinMarketCapService.getBitcoinData('USD');
    const globalMetrics = await coinMarketCapService.getGlobalMetrics('USD');
    
    // Get additional Bitcoin network data
    let networkData = null;
    try {
      networkData = await realDataService.getBitcoinMetrics();
    } catch (networkError) {
      logger.warn('Failed to fetch network data, using defaults');
    }

    const response = {
      symbol: 'BTC/USD',
      price: bitcoinData.quote.USD.price,
      change24h: bitcoinData.quote.USD.percent_change_24h,
      change7d: bitcoinData.quote.USD.percent_change_7d,
      volume24h: bitcoinData.quote.USD.volume_24h,
      marketCap: bitcoinData.quote.USD.market_cap,
      circulatingSupply: bitcoinData.circulating_supply,
      totalSupply: bitcoinData.total_supply,
      maxSupply: bitcoinData.max_supply,
      dominance: globalMetrics.quote.USD ? 
        (bitcoinData.quote.USD.market_cap / globalMetrics.quote.USD.total_market_cap * 100) : 
        globalMetrics.btc_dominance,
      rank: bitcoinData.cmc_rank,
      
      // Network data from real data service or defaults
      fearGreedIndex: networkData?.fearGreedIndex || 65,
      hashRate: networkData?.hashRate || '578.4 EH/s',
      difficulty: networkData?.difficulty || '62.46 T',
      blockHeight: networkData?.blockHeight || 823456,
      nextHalving: networkData?.nextHalving || {
        blocksUntil: 126544,
        estimatedDate: new Date(Date.now() + 126544 * 10 * 60 * 1000).toISOString(),
        progress: 39.7
      },
      
      // Metadata
      timestamp: new Date().toISOString(),
      source: 'coinmarketcap-primary',
      lastUpdated: bitcoinData.last_updated
    };

    logger.info(`Bitcoin price fetched: $${response.price.toFixed(2)}`);
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'CoinMarketCap API error');
    
    // Secondary: Fallback to realDataService
    try {
      logger.info('Falling back to realDataService for Bitcoin data');
      const metrics = await realDataService.getBitcoinMetrics();
      
      return NextResponse.json({
        symbol: 'BTC/USD',
        price: metrics.price,
        change24h: metrics.priceChange24h,
        volume24h: metrics.volume24h,
        marketCap: metrics.marketCap,
        circulatingSupply: metrics.circulatingSupply,
        dominance: metrics.dominance,
        fearGreedIndex: metrics.fearGreedIndex,
        hashRate: metrics.hashRate,
        difficulty: metrics.difficulty,
        blockHeight: metrics.blockHeight,
        nextHalving: metrics.nextHalving,
        timestamp: new Date().toISOString(),
        source: 'real-data-service-fallback'
      });
    } catch (realDataError) {
      logger.error(realDataError instanceof Error ? realDataError : new Error(String(realDataError)), 'Real data service fallback failed');
    }

    // Tertiary: Fallback to Binance API
    try {
      logger.info('Falling back to Binance API for Bitcoin data');
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          symbol: 'BTC/USDT',
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          volume24h: parseFloat(data.volume) * parseFloat(data.lastPrice), // Convert to USD volume
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          marketCap: parseFloat(data.lastPrice) * 19700000, // Approximate circulating supply
          circulatingSupply: 19700000,
          dominance: 52.5, // Approximate
          fearGreedIndex: 65,
          timestamp: new Date().toISOString(),
          source: 'binance-fallback'
        });
      }
    } catch (binanceError) {
      logger.error(binanceError instanceof Error ? binanceError : new Error(String(binanceError)), 'Binance fallback also failed');
    }
    
    // Final fallback to mock data
    return NextResponse.json({
      symbol: 'BTC/USD',
      price: 67432.10,
      change24h: 2.34,
      volume24h: 28543678234,
      marketCap: 1325000000000,
      circulatingSupply: 19654321,
      dominance: 52.4,
      fearGreedIndex: 75,
      hashRate: 450.5,
      difficulty: 62000000000000,
      blockHeight: 823456,
      nextHalving: {
        blocksUntil: 126544,
        estimatedDate: new Date(Date.now() + 126544 * 10 * 60 * 1000).toISOString(),
        progress: 39.7
      },
      timestamp: new Date().toISOString(),
      source: 'mock-data-fallback',
      error: 'All APIs unavailable, using mock data'
    });
  }
}