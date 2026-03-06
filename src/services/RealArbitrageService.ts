/**
 * Real Arbitrage Detection Service
 * Uses CoinMarketCap, Hiro.so, and Ordiscan APIs for REAL data
 */

import { coinMarketCapService } from './CoinMarketCapService';
import { getHiroApi } from './HiroApiService';
import { logger } from '@/lib/logger';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';

export interface RealArbitrageOpportunity {
  symbol: string;
  name: string;
  type: 'ordinals' | 'runes' | 'tokens' | 'btc';
  buyPrice: number;
  sellPrice: number;
  spread: number;
  potentialProfit: number;
  buySource: string;
  sellSource: string;
  buyLink: string;
  sellLink: string;
  baseCurrency: string;
  volume24h: number;
  liquidity: number;
  confidence: number;
  lastUpdated: number;
  marketCap?: number;
  riskScore: 'low' | 'medium' | 'high';
  trustScore: number;
  estimatedFees: {
    network: number;
    platform: number;
    bridge?: number;
    total: number;
  };
  executionTime: number;
  historicalSuccess?: number;
  priceConsistency?: number;
  discoveryTime: number;
  realData: {
    cmcData?: any;
    hiroData?: any;
    ordiscanData?: any;
  };
}

interface ExchangePrice {
  exchange: string;
  price: number;
  volume: number;
  timestamp: number;
  fees: number;
  available: boolean;
  link: string;
}

interface AssetPriceData {
  symbol: string;
  exchanges: ExchangePrice[];
  lastUpdate: number;
}

export class RealArbitrageService {
  private readonly hiroApi = getHiroApi();
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 30000; // 30 seconds

  /**
   * Detect real arbitrage opportunities
   */
  async detectRealOpportunities(minSpread: number = 5, assetType: string = 'all'): Promise<RealArbitrageOpportunity[]> {
    try {
      logger.info('🔍 Starting REAL arbitrage detection...');
      
      const opportunities: RealArbitrageOpportunity[] = [];
      
      // Get real price data from multiple sources
      const [btcOpportunities, ordinalsOpportunities, runesOpportunities] = await Promise.all([
        this.detectBitcoinArbitrage(),
        this.detectOrdinalsArbitrage(),
        this.detectRunesArbitrage()
      ]);
      
      // Combine all opportunities
      opportunities.push(...btcOpportunities);
      opportunities.push(...ordinalsOpportunities);
      opportunities.push(...runesOpportunities);
      
      // Filter by minimum spread and type
      const filteredOpportunities = opportunities
        .filter(opp => opp.spread >= minSpread)
        .filter(opp => assetType === 'all' || opp.type === assetType)
        .sort((a, b) => b.spread - a.spread);
      
      logger.info(`✅ Found ${filteredOpportunities.length} real arbitrage opportunities`);
      return filteredOpportunities;
      
    } catch (error) {
      logger.error('❌ Error detecting real arbitrage opportunities:', error);
      return [];
    }
  }

  /**
   * Detect Bitcoin arbitrage using CoinMarketCap data (with fallback)
   */
  private async detectBitcoinArbitrage(): Promise<RealArbitrageOpportunity[]> {
    try {
      // Try CMC first, fallback to a simple Binance price if CMC API key is missing
      let baseBtcPrice = 0;
      let btcData: any = null;

      try {
        btcData = await coinMarketCapService.getBitcoinData();
        baseBtcPrice = btcData.quote.USD.price;
      } catch {
        // CMC unavailable - get base price from Binance
        try {
          const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            baseBtcPrice = parseFloat(data.price);
          }
        } catch {
          // Both failed
          return [];
        }
      }

      if (baseBtcPrice <= 0) return [];

      const exchanges = await this.getBitcoinExchangePrices(baseBtcPrice);
      
      const opportunities: RealArbitrageOpportunity[] = [];
      
      // Compare prices between exchanges
      for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
          const buyExchange = exchanges[i].price < exchanges[j].price ? exchanges[i] : exchanges[j];
          const sellExchange = exchanges[i].price > exchanges[j].price ? exchanges[i] : exchanges[j];
          
          const spread = ((sellExchange.price - buyExchange.price) / buyExchange.price) * 100;
          
          if (spread > 0) { // Show all positive spreads
            const opportunity: RealArbitrageOpportunity = {
              symbol: 'BTC',
              name: 'Bitcoin',
              type: 'btc',
              buyPrice: buyExchange.price,
              sellPrice: sellExchange.price,
              spread: spread,
              potentialProfit: sellExchange.price - buyExchange.price,
              buySource: buyExchange.exchange,
              sellSource: sellExchange.exchange,
              buyLink: buyExchange.link,
              sellLink: sellExchange.link,
              baseCurrency: 'USD',
              volume24h: btcData?.quote?.USD?.volume_24h || 0,
              liquidity: 100, // Bitcoin has high liquidity
              confidence: this.calculateConfidence(spread, btcData?.quote?.USD?.volume_24h || 1000000000),
              lastUpdated: Date.now(),
              marketCap: btcData?.quote?.USD?.market_cap || 0,
              riskScore: spread > 5 ? 'high' : spread > 2 ? 'medium' : 'low',
              trustScore: 95, // Bitcoin is highly trusted
              estimatedFees: {
                network: buyExchange.price * 0.0001, // 0.01% network fee
                platform: buyExchange.price * 0.0025, // 0.25% platform fee
                total: buyExchange.price * 0.0035
              },
              executionTime: 600, // 10 minutes for Bitcoin
              historicalSuccess: 85,
              priceConsistency: 90,
              discoveryTime: Date.now(),
              realData: {
                cmcData: btcData
              }
            };
            
            opportunities.push(opportunity);
          }
        }
      }
      
      return opportunities;
      
    } catch (error) {
      logger.error('Error detecting Bitcoin arbitrage:', error);
      return [];
    }
  }

  /**
   * Detect Ordinals arbitrage using Hiro API and Ordiscan
   */
  private async detectOrdinalsArbitrage(): Promise<RealArbitrageOpportunity[]> {
    try {
      // Get Ordinals collections from both Hiro and Ordiscan
      const [hiroCollections, ordiscanData] = await Promise.allSettled([
        this.hiroApi.getOrdinalsCollections(0, 10),
        // Use absolute URL for server-side fetch
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz'}/api/ordiscan?endpoint=collections&limit=10`).then(res => res.json()).catch(() => null)
      ]);
      
      // Use Ordiscan data if available, otherwise fallback to Hiro
      let collections = [];
      
      if (ordiscanData.status === 'fulfilled' && ordiscanData.value.success) {
        collections = ordiscanData.value.data.results || [];
        logger.info('🎯 Using Ordiscan data for Ordinals arbitrage');
      } else if (hiroCollections.status === 'fulfilled') {
        collections = hiroCollections.value.results || [];
        logger.info('🎯 Using Hiro data for Ordinals arbitrage');
      }
      
      const opportunities: RealArbitrageOpportunity[] = [];
      
      for (const collection of collections) {
        // Get real marketplace prices if available from Ordiscan data
        const marketplaces = collection.markets ? 
          this.getOrdinalsRealMarketplacePrices(collection) :
          await this.getOrdinalsMarketplacePrices(collection);
        
        if (marketplaces.length >= 2) {
          const buyPrice = Math.min(...marketplaces.map(m => m.price));
          const sellPrice = Math.max(...marketplaces.map(m => m.price));
          const spread = ((sellPrice - buyPrice) / buyPrice) * 100;
          
          if (spread > 0) { // Show all positive spreads for Ordinals
            const buyMarketplace = marketplaces.find(m => m.price === buyPrice)!;
            const sellMarketplace = marketplaces.find(m => m.price === sellPrice)!;
            
            const opportunity: RealArbitrageOpportunity = {
              symbol: collection.id,
              name: collection.name,
              type: 'ordinals',
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              spread: spread,
              potentialProfit: sellPrice - buyPrice,
              buySource: buyMarketplace.exchange,
              sellSource: sellMarketplace.exchange,
              buyLink: buyMarketplace.link,
              sellLink: sellMarketplace.link,
              baseCurrency: 'BTC',
              volume24h: collection.volume_24h,
              liquidity: this.calculateLiquidity(collection.unique_holders, collection.sales_24h),
              confidence: this.calculateConfidence(spread, collection.volume_24h),
              lastUpdated: Date.now(),
              riskScore: spread > 15 ? 'high' : spread > 8 ? 'medium' : 'low',
              trustScore: collection.verified ? 80 : 60,
              estimatedFees: {
                network: buyPrice * 0.0003, // Bitcoin network fee
                platform: buyPrice * 0.025, // 2.5% marketplace fee
                total: buyPrice * 0.0253
              },
              executionTime: 300, // 5 minutes for Ordinals
              historicalSuccess: collection.verified ? 75 : 60,
              priceConsistency: 70,
              discoveryTime: Date.now(),
              realData: {
                hiroData: hiroCollections.status === 'fulfilled' ? collection : null,
                ordiscanData: ordiscanData.status === 'fulfilled' ? collection : null
              }
            };
            
            opportunities.push(opportunity);
          }
        }
      }
      
      return opportunities;
      
    } catch (error) {
      logger.error('Error detecting Ordinals arbitrage:', error);
      return [];
    }
  }

  /**
   * Detect Runes arbitrage using Hiro API
   */
  private async detectRunesArbitrage(): Promise<RealArbitrageOpportunity[]> {
    try {
      // Get Runes info from Hiro
      const runesInfo = await this.hiroApi.getRunesInfo();
      
      const opportunities: RealArbitrageOpportunity[] = [];
      
      for (const rune of runesInfo.recent_etchings.slice(0, 5)) {
        // Simulate price differences between Runes marketplaces
        const marketplaces = await this.getRunesMarketplacePrices(rune);
        
        if (marketplaces.length >= 2) {
          const buyPrice = Math.min(...marketplaces.map(m => m.price));
          const sellPrice = Math.max(...marketplaces.map(m => m.price));
          const spread = ((sellPrice - buyPrice) / buyPrice) * 100;
          
          if (spread > 0) { // Show all positive spreads for Runes
            const buyMarketplace = marketplaces.find(m => m.price === buyPrice)!;
            const sellMarketplace = marketplaces.find(m => m.price === sellPrice)!;
            
            const opportunity: RealArbitrageOpportunity = {
              symbol: rune.name,
              name: `${rune.name} Rune`,
              type: 'runes',
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              spread: spread,
              potentialProfit: sellPrice - buyPrice,
              buySource: buyMarketplace.exchange,
              sellSource: sellMarketplace.exchange,
              buyLink: buyMarketplace.link,
              sellLink: sellMarketplace.link,
              baseCurrency: 'USD',
              volume24h: parseInt(rune.supply) * 0.1, // Estimate volume
              liquidity: this.calculateRunesLiquidity(rune.holders),
              confidence: this.calculateConfidence(spread, parseInt(rune.supply)),
              lastUpdated: Date.now(),
              riskScore: spread > 20 ? 'high' : spread > 10 ? 'medium' : 'low',
              trustScore: rune.holders > 1000 ? 70 : 50,
              estimatedFees: {
                network: buyPrice * 0.0002, // Bitcoin network fee
                platform: buyPrice * 0.02, // 2% marketplace fee
                total: buyPrice * 0.0202
              },
              executionTime: 180, // 3 minutes for Runes
              historicalSuccess: rune.holders > 1000 ? 65 : 45,
              priceConsistency: 60,
              discoveryTime: Date.now(),
              realData: {
                hiroData: rune
              }
            };
            
            opportunities.push(opportunity);
          }
        }
      }
      
      return opportunities;
      
    } catch (error) {
      logger.error('Error detecting Runes arbitrage:', error);
      return [];
    }
  }

  /**
   * Get Bitcoin prices from different exchanges using real APIs
   */
  private async getBitcoinExchangePrices(basePrice: number): Promise<ExchangePrice[]> {
    const exchangeResults: ExchangePrice[] = [];

    const fetchWithTimeout = async (url: string, ms = 8000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        return res;
      } finally {
        clearTimeout(timeout);
      }
    };

    const [binanceRes, krakenRes, bybitRes, coinbaseRes, okxRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT'),
      fetchWithTimeout('https://api.kraken.com/0/public/Ticker?pair=XBTUSD'),
      fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT'),
      fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/buy'),
      fetchWithTimeout('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT'),
    ]);

    // Binance
    if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
      try {
        const data = await binanceRes.value.json();
        exchangeResults.push({
          exchange: 'Binance', price: parseFloat(data.askPrice),
          volume: 0, timestamp: Date.now(), fees: 0.001, available: true,
          link: 'https://binance.com/trade/BTC_USDT',
        });
      } catch { /* skip */ }
    }

    // Kraken
    if (krakenRes.status === 'fulfilled' && krakenRes.value.ok) {
      try {
        const data = await krakenRes.value.json();
        const ticker = data.result.XXBTZUSD;
        exchangeResults.push({
          exchange: 'Kraken', price: parseFloat(ticker.a[0]),
          volume: parseFloat(ticker.v[1]), timestamp: Date.now(), fees: 0.0026, available: true,
          link: 'https://kraken.com/prices/bitcoin',
        });
      } catch { /* skip */ }
    }

    // Bybit
    if (bybitRes.status === 'fulfilled' && bybitRes.value.ok) {
      try {
        const data = await bybitRes.value.json();
        const ticker = data.result.list[0];
        exchangeResults.push({
          exchange: 'Bybit', price: parseFloat(ticker.ask1Price),
          volume: parseFloat(ticker.volume24h), timestamp: Date.now(), fees: 0.001, available: true,
          link: 'https://bybit.com/trade/spot/BTC/USDT',
        });
      } catch { /* skip */ }
    }

    // Coinbase
    if (coinbaseRes.status === 'fulfilled' && coinbaseRes.value.ok) {
      try {
        const data = await coinbaseRes.value.json();
        exchangeResults.push({
          exchange: 'Coinbase', price: parseFloat(data.data.amount),
          volume: 0, timestamp: Date.now(), fees: 0.005, available: true,
          link: 'https://coinbase.com/price/bitcoin',
        });
      } catch { /* skip */ }
    }

    // OKX
    if (okxRes.status === 'fulfilled' && okxRes.value.ok) {
      try {
        const data = await okxRes.value.json();
        const ticker = data.data[0];
        exchangeResults.push({
          exchange: 'OKX', price: parseFloat(ticker.askPx),
          volume: parseFloat(ticker.vol24h), timestamp: Date.now(), fees: 0.001, available: true,
          link: 'https://okx.com/trade-spot/btc-usdt',
        });
      } catch { /* skip */ }
    }

    // Add CMC base price as another source
    exchangeResults.push({
      exchange: 'CoinMarketCap', price: basePrice,
      volume: 0, timestamp: Date.now(), fees: 0, available: true,
      link: 'https://coinmarketcap.com/currencies/bitcoin/',
    });

    return exchangeResults;
  }

  /**
   * Get real Ordinals marketplace prices from Ordiscan data
   */
  private getOrdinalsRealMarketplacePrices(collection: any): ExchangePrice[] {
    const marketplaces: ExchangePrice[] = [];
    
    if (collection.markets) {
      Object.entries(collection.markets).forEach(([marketplace, data]: [string, any]) => {
        marketplaces.push({
          exchange: marketplace.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          price: data.price,
          volume: data.volume || 0,
          timestamp: Date.now(),
          fees: this.getMarketplaceFee(marketplace),
          available: true,
          link: this.getMarketplaceLink(marketplace, collection.id)
        });
      });
    }
    
    return marketplaces;
  }
  
  /**
   * Get Ordinals marketplace prices from real APIs
   * Fetches from Gamma.io + UniSat for cross-marketplace comparison
   */
  private async getOrdinalsMarketplacePrices(collection: any): Promise<ExchangePrice[]> {
    const results: ExchangePrice[] = [];
    const basePrice = collection.floor_price;

    if (basePrice && basePrice > 0) {
      // Gamma.io is the primary source - use real floor price
      results.push({
        exchange: 'Gamma.io',
        price: basePrice,
        volume: collection.sales_24h || 0,
        timestamp: Date.now(),
        fees: 0.025,
        available: true,
        link: `https://gamma.io/ordinals/collections/${collection.id}`
      });

      // Try fetching UniSat floor price for this collection
      try {
        const unisatRes = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz'}/api/unisat/market/collection?collection=${collection.id}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (unisatRes.ok) {
          const unisatData = await unisatRes.json();
          const unisatFloor = unisatData?.data?.floorPrice;
          if (unisatFloor && unisatFloor > 0) {
            results.push({
              exchange: 'UniSat',
              price: unisatFloor,
              volume: unisatData?.data?.sales24h || 0,
              timestamp: Date.now(),
              fees: 0.02,
              available: true,
              link: `https://unisat.io/market/collection?collectionId=${collection.id}`
            });
          }
        }
      } catch {
        // UniSat API unavailable - use estimated spread
      }

      // If only 1 marketplace, add OKX estimate based on typical price deviation
      if (results.length < 2) {
        try {
          const okxRes = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz'}/api/ordinals/activity/?collection=${collection.id}&limit=5`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (okxRes.ok) {
            const okxData = await okxRes.json();
            const recentSales = okxData?.data?.activities || okxData?.activities || [];
            if (recentSales.length > 0) {
              const avgSalePrice = recentSales.reduce((s: number, a: any) => s + (a.price || 0), 0) / recentSales.length;
              if (avgSalePrice > 0) {
                results.push({
                  exchange: 'OKX NFT',
                  price: avgSalePrice,
                  volume: recentSales.length,
                  timestamp: Date.now(),
                  fees: 0.02,
                  available: true,
                  link: `https://okx.com/web3/marketplace/ordinals/collection/${collection.id}`
                });
              }
            }
          }
        } catch {
          // OKX API unavailable
        }
      }
    }

    return results;
  }

  /**
   * Get Runes marketplace prices from real APIs
   * Fetches from Gamma.io + UniSat for cross-marketplace comparison
   */
  private async getRunesMarketplacePrices(rune: any): Promise<ExchangePrice[]> {
    const results: ExchangePrice[] = [];
    const runeName = rune.name || rune.spaced_name || '';

    // If the rune has a real floor price (from upstream API), use it
    if (rune.floorUnitPrice?.value && rune.floorUnitPrice.value > 0) {
      results.push({
        exchange: 'Gamma.io',
        price: rune.floorUnitPrice.value / 1e8, // sats to BTC
        volume: rune.volume24h || 0,
        timestamp: Date.now(),
        fees: 0.025,
        available: true,
        link: `https://gamma.io/ordinals/collections/runes/${runeName}`
      });
    }

    // Try fetching UniSat rune price
    try {
      const unisatRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz'}/api/unisat/runes/list/?tick=${encodeURIComponent(runeName)}&limit=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (unisatRes.ok) {
        const unisatData = await unisatRes.json();
        const listings = unisatData?.data?.list || unisatData?.list || [];
        if (listings.length > 0 && listings[0].unitPrice > 0) {
          results.push({
            exchange: 'UniSat',
            price: listings[0].unitPrice / 1e8,
            volume: 0,
            timestamp: Date.now(),
            fees: 0.02,
            available: true,
            link: `https://unisat.io/runes/market?tick=${encodeURIComponent(runeName)}`
          });
        }
      }
    } catch {
      // UniSat unavailable
    }

    // Try OKX rune price
    try {
      const okxRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz'}/api/marketplace/runes/collection-stats/?collectionSymbol=${encodeURIComponent(runeName)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (okxRes.ok) {
        const okxData = await okxRes.json();
        if (okxData?.floorUnitPrice?.value && okxData.floorUnitPrice.value > 0) {
          // Only add if different from Gamma.io price
          const okxPrice = okxData.floorUnitPrice.value / 1e8;
          const mePrice = results[0]?.price || 0;
          if (Math.abs(okxPrice - mePrice) / Math.max(mePrice, 0.000001) > 0.001) {
            results.push({
              exchange: 'OKX',
              price: okxPrice,
              volume: okxData.volume24h || 0,
              timestamp: Date.now(),
              fees: 0.005,
              available: true,
              link: `https://okx.com/web3/marketplace/runes`
            });
          }
        }
      }
    } catch {
      // OKX unavailable
    }

    return results;
  }

  /**
   * Calculate confidence score based on spread and volume
   */
  private calculateConfidence(spread: number, volume: number): number {
    // Higher spread and volume = higher confidence
    const spreadScore = Math.min(spread * 10, 50); // Max 50 points for spread
    const volumeScore = Math.min(Math.log10(volume || 1) * 10, 50); // Max 50 points for volume
    return Math.round(spreadScore + volumeScore);
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidity(holders: number, sales24h: number): number {
    const holdersScore = Math.min(holders / 100, 50);
    const salesScore = Math.min(sales24h, 50);
    return Math.round(holdersScore + salesScore);
  }

  /**
   * Calculate Runes liquidity
   */
  private calculateRunesLiquidity(holders: number): number {
    return Math.min(Math.round(holders / 20), 100);
  }

  /**
   * Get cached data
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache data
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get marketplace fee
   */
  private getMarketplaceFee(marketplace: string): number {
    const fees: { [key: string]: number } = {
      'gamma_io': 0.025,
      'unisat': 0.02,
      'okx': 0.02,
      'ordiscan': 0.015,
      'binance': 0.005,
      'opensea': 0.025
    };
    return fees[marketplace] || 0.02;
  }
  
  /**
   * Get marketplace link
   */
  private getMarketplaceLink(marketplace: string, collectionId: string): string {
    const baseUrls: { [key: string]: string } = {
      'gamma_io': 'https://gamma.io/ordinals/collections',
      'unisat': 'https://unisat.io/inscription',
      'okx': 'https://okx.com/web3/marketplace/ordinals',
      'ordiscan': 'https://ordiscan.com/collection',
      'binance': 'https://binance.com/en/nft/collection'
    };
    
    const baseUrl = baseUrls[marketplace] || 'https://gamma.io/ordinals/collections';
    return `${baseUrl}/${collectionId}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const realArbitrageService = new RealArbitrageService();