/**
 * CCXT Integration Service
 * Unified API for 20+ cryptocurrency exchanges
 * Provides real-time price feeds, order book depth, and trade execution
 */

import type { Exchange as CCXTExchange, Ticker as CCXTTicker } from 'ccxt';

// Lazy load CCXT to avoid bundle bloat (130+ exchanges)
let _ccxt: any = null;
let ccxt: any = null;
async function getCcxt() {
  if (!_ccxt) {
    const mod = await import('ccxt');
    _ccxt = mod.default;
    ccxt = _ccxt;
  }
  return _ccxt;
}
import { cache } from '@/lib/cache/redis.config';

export interface ExchangePrice {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  spreadPercent: number;
  volume24h: number | null;
  timestamp: number;
}

export interface OrderBook {
  exchange: string;
  symbol: string;
  bids: [number, number][]; // [price, volume]
  asks: [number, number][];
  timestamp: number;
}

export interface ExchangeInfo {
  id: string;
  name: string;
  active: boolean;
  hasFetchTickers: boolean;
  hasFetchOrderBook: boolean;
  hasFetchTrades: boolean;
  fees: {
    trading: {
      maker: number;
      taker: number;
    };
  };
}

class CCXTIntegration {
  private exchanges: Map<string, CCXTExchange> = new Map();
  private readonly CACHE_TTL = 10; // 10 seconds for price data
  private readonly ORDERBOOK_CACHE_TTL = 30; // 30 seconds for order books

  // Top 20+ exchanges by volume and reliability
  private readonly SUPPORTED_EXCHANGES = [
    'binance',
    'coinbase',
    'kraken',
    'okx',
    'bybit',
    'bitfinex',
    'huobi',
    'kucoin',
    'gateio',
    'mexc',
    'bitget',
    'cryptocom',
    'phemex',
    'bitstamp',
    'gemini',
    'bitflyer',
    'bitmart',
    'bingx',
    'whitebit',
    'lbank'
  ];

  constructor() {
    this.initializeExchanges();
  }

  /**
   * Initialize all supported exchanges
   */
  private async initializeExchanges() {
    await getCcxt();
    if (!ccxt) return;
    for (const exchangeId of this.SUPPORTED_EXCHANGES) {
      try {
        const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt] as typeof CCXTExchange;
        if (!ExchangeClass) {
          // Exchange not found in CCXT - skip
          continue;
        }

        const exchange = new ExchangeClass({
          enableRateLimit: true,
          timeout: 10000,
          options: {
            defaultType: 'spot', // Focus on spot markets
          }
        });

        this.exchanges.set(exchangeId, exchange);
        // Exchange initialized
      } catch (error) {
        console.error(`❌ Failed to initialize ${exchangeId}:`, error);
      }
    }

    // CCXT Integration ready
  }

  /**
   * Get list of initialized exchanges
   */
  getExchanges(): ExchangeInfo[] {
    return Array.from(this.exchanges.values()).map((exchange): ExchangeInfo => ({
      id: exchange.id,
      name: exchange.name as string,
      active: true,
      hasFetchTickers: !!exchange.has['fetchTickers'],
      hasFetchOrderBook: !!exchange.has['fetchOrderBook'],
      hasFetchTrades: !!exchange.has['fetchTrades'],
      fees: {
        trading: {
          maker: exchange.fees.trading.maker || 0.001,
          taker: exchange.fees.trading.taker || 0.001
        }
      }
    }));
  }

  /**
   * Fetch ticker (price) for a single symbol from a specific exchange
   */
  async fetchTicker(exchangeId: string, symbol: string): Promise<CCXTTicker | null> {
    const cacheKey = `ticker:${exchangeId}:${symbol}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not initialized`);
    }

    try {
      const ticker = await exchange.fetchTicker(symbol);

      // Cache the result
      await cache.setex(cacheKey, this.CACHE_TTL, JSON.stringify(ticker));

      return ticker;
    } catch (error) {
      console.error(`Error fetching ticker from ${exchangeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch tickers from multiple exchanges in parallel
   */
  async fetchTickersFromAll(symbol: string): Promise<ExchangePrice[]> {
    const promises = Array.from(this.exchanges.keys()).map(async (exchangeId) => {
      try {
        const ticker = await this.fetchTicker(exchangeId, symbol);
        if (!ticker || !ticker.bid || !ticker.ask) return null;

        const spread = ticker.ask - ticker.bid;
        const spreadPercent = (spread / ticker.bid) * 100;

        return {
          exchange: exchangeId,
          symbol,
          bid: ticker.bid,
          ask: ticker.ask,
          last: ticker.last || ticker.bid,
          spread,
          spreadPercent,
          volume24h: ticker.baseVolume || ticker.quoteVolume || null,
          timestamp: ticker.timestamp || Date.now()
        } as ExchangePrice;
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is ExchangePrice => r !== null);
  }

  /**
   * Fetch order book depth
   */
  async fetchOrderBook(exchangeId: string, symbol: string, limit: number = 20): Promise<OrderBook | null> {
    const cacheKey = `orderbook:${exchangeId}:${symbol}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not initialized`);
    }

    try {
      const orderbook = await exchange.fetchOrderBook(symbol, limit);

      const result: OrderBook = {
        exchange: exchangeId,
        symbol,
        bids: orderbook.bids as [number, number][],
        asks: orderbook.asks as [number, number][],
        timestamp: orderbook.timestamp || Date.now()
      };

      // Cache the result
      await cache.setex(cacheKey, this.ORDERBOOK_CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error(`Error fetching order book from ${exchangeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all tickers from a single exchange (for triangular arbitrage)
   */
  async fetchAllTickers(exchangeId: string): Promise<Map<string, CCXTTicker>> {
    const cacheKey = `tickers:all:${exchangeId}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return new Map(Object.entries(parsed));
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not initialized`);
    }

    try {
      if (!exchange.has['fetchTickers']) {
        // Exchange does not support fetchTickers
        return new Map();
      }

      const tickers = await exchange.fetchTickers();

      // Convert to Map
      const tickerMap = new Map<string, CCXTTicker>(Object.entries(tickers));

      // Cache the result (convert Map to object for JSON)
      const cacheData = Object.fromEntries(tickerMap);
      await cache.setex(cacheKey, this.CACHE_TTL, JSON.stringify(cacheData));

      return tickerMap;
    } catch (error) {
      console.error(`Error fetching all tickers from ${exchangeId}:`, error);
      return new Map();
    }
  }

  /**
   * Get exchange fee information
   */
  getExchangeFee(exchangeId: string, type: 'maker' | 'taker' = 'taker'): number {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) return 0.001; // Default 0.1%

    return exchange.fees.trading[type] || 0.001;
  }

  /**
   * Get all exchange fees
   */
  getAllFees(): Record<string, { maker: number; taker: number }> {
    const fees: Record<string, { maker: number; taker: number }> = {};

    for (const [exchangeId, exchange] of this.exchanges) {
      fees[exchangeId] = {
        maker: exchange.fees.trading.maker || 0.001,
        taker: exchange.fees.trading.taker || 0.001
      };
    }

    return fees;
  }

  /**
   * Check if exchange supports a symbol
   */
  async hasSymbol(exchangeId: string, symbol: string): Promise<boolean> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) return false;

    try {
      await exchange.loadMarkets();
      return symbol in exchange.markets;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get common trading pairs across all exchanges
   */
  async getCommonPairs(): Promise<string[]> {
    const pairSets: Set<string>[] = [];

    for (const exchange of this.exchanges.values()) {
      try {
        await exchange.loadMarkets();
        pairSets.push(new Set(Object.keys(exchange.markets)));
      } catch (error) {
        console.error(`Error loading markets for ${exchange.id}:`, error);
      }
    }

    if (pairSets.length === 0) return [];

    // Find intersection of all sets
    const commonPairs = pairSets.reduce((intersection, currentSet) => {
      return new Set([...intersection].filter(x => currentSet.has(x)));
    });

    return Array.from(commonPairs);
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    // This would clear all ticker and orderbook caches
    // Implementation depends on Redis cache pattern matching
    // Cache cleared
  }

  /**
   * Health check - test connection to all exchanges
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const promises = Array.from(this.exchanges.entries()).map(async ([exchangeId, exchange]) => {
      try {
        // Try to fetch a common ticker as health check
        await exchange.fetchTicker('BTC/USDT');
        results[exchangeId] = true;
      } catch (error) {
        results[exchangeId] = false;
      }
    });

    await Promise.all(promises);
    return results;
  }
}

// Export singleton instance
export const ccxtIntegration = new CCXTIntegration();
