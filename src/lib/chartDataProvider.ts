/**
 * 📊 CYPHER ORDI FUTURE v3.0.0 - Chart Data Provider
 * Sistema avançado de dados para gráficos com WebSocket em tempo real
 */

import { io, Socket } from 'socket.io-client';

// Types
export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  volume24h: number;
  marketCap?: number;
  timestamp: number;
}

export interface MarketData {
  symbol: string;
  data: ChartDataPoint[];
  realTimePrice: RealTimePrice;
  lastUpdate: number;
}

export interface ChartDataProviderConfig {
  wsUrl?: string;
  apiUrl?: string;
  maxDataPoints?: number;
  enableRealTime?: boolean;
  enableCache?: boolean;
  cacheExpiry?: number;
}

// API Endpoints Configuration
const API_ENDPOINTS = {
  binance: {
    klines: 'https://api.binance.com/api/v3/klines',
    ticker: 'https://api.binance.com/api/v3/ticker/24hr',
    websocket: 'wss://stream.binance.com:9443/ws'
  },
  coinbase: {
    candles: 'https://api.exchange.coinbase.com/products/{symbol}/candles',
    ticker: 'https://api.exchange.coinbase.com/products/{symbol}/ticker',
    websocket: 'wss://ws-feed.exchange.coinbase.com'
  },
  coingecko: {
    history: 'https://api.coingecko.com/api/v3/coins/{id}/market_chart',
    current: 'https://api.coingecko.com/api/v3/simple/price'
  }
};

// Symbol mapping for different exchanges
const SYMBOL_MAPPING = {
  BTCUSD: {
    binance: 'BTCUSDT',
    coinbase: 'BTC-USD',
    coingecko: 'bitcoin'
  },
  ETHUSD: {
    binance: 'ETHUSDT',
    coinbase: 'ETH-USD',
    coingecko: 'ethereum'
  },
  SOLUSD: {
    binance: 'SOLUSDT',
    coinbase: 'SOL-USD',
    coingecko: 'solana'
  }
};

// Cache Management
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; expiry: number }>();
  
  set(key: string, data: any, expiryMs: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: expiryMs
    });
  }
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear() {
    this.cache.clear();
  }
}

// Main Chart Data Provider Class
export class ChartDataProvider {
  private config: Required<ChartDataProviderConfig>;
  private cache = new DataCache();
  private websockets = new Map<string, Socket>();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  constructor(config: ChartDataProviderConfig = {}) {
    this.config = {
      wsUrl: config.wsUrl || '',
      apiUrl: config.apiUrl || '',
      maxDataPoints: config.maxDataPoints || 1000,
      enableRealTime: config.enableRealTime ?? true,
      enableCache: config.enableCache ?? true,
      cacheExpiry: config.cacheExpiry || 60000
    };
  }

  /**
   * Get historical chart data for a symbol
   */
  async getChartData(
    symbol: string, 
    interval: string = '1h', 
    limit: number = 100,
    source: 'binance' | 'coinbase' | 'coingecko' = 'binance'
  ): Promise<ChartDataPoint[]> {
    const cacheKey = `chart_${symbol}_${interval}_${limit}_${source}`;
    
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      let data: ChartDataPoint[] = [];

      switch (source) {
        case 'binance':
          data = await this.fetchBinanceData(symbol, interval, limit);
          break;
        case 'coinbase':
          data = await this.fetchCoinbaseData(symbol, interval, limit);
          break;
        case 'coingecko':
          data = await this.fetchCoingeckoData(symbol, interval, limit);
          break;
      }

      // Cache the result
      if (this.config.enableCache && data.length > 0) {
        this.cache.set(cacheKey, data, this.config.cacheExpiry);
      }

      return data;
    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error);
      
      // Try fallback sources
      if (source === 'binance') {
        return this.getChartData(symbol, interval, limit, 'coinbase');
      } else if (source === 'coinbase') {
        return this.getChartData(symbol, interval, limit, 'coingecko');
      }
      
      throw error;
    }
  }

  /**
   * Fetch data from Binance API
   */
  private async fetchBinanceData(
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<ChartDataPoint[]> {
    const mappedSymbol = SYMBOL_MAPPING[symbol as keyof typeof SYMBOL_MAPPING]?.binance || symbol;
    const binanceInterval = this.convertToBinanceInterval(interval);
    
    const url = `${API_ENDPOINTS.binance.klines}?symbol=${mappedSymbol}&interval=${binanceInterval}&limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map((item: any[]) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    }));
  }

  /**
   * Fetch data from Coinbase API
   */
  private async fetchCoinbaseData(
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<ChartDataPoint[]> {
    const mappedSymbol = SYMBOL_MAPPING[symbol as keyof typeof SYMBOL_MAPPING]?.coinbase || symbol;
    const granularity = this.convertToCoinbaseGranularity(interval);
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (limit * granularity * 1000));
    
    const url = API_ENDPOINTS.coinbase.candles
      .replace('{symbol}', mappedSymbol) +
      `?start=${startTime.toISOString()}&end=${endTime.toISOString()}&granularity=${granularity}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Coinbase API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map((item: number[]) => ({
      timestamp: item[0] * 1000,
      low: item[1],
      high: item[2],
      open: item[3],
      close: item[4],
      volume: item[5]
    })).reverse();
  }

  /**
   * Fetch data from CoinGecko API
   */
  private async fetchCoingeckoData(
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<ChartDataPoint[]> {
    const mappedSymbol = SYMBOL_MAPPING[symbol as keyof typeof SYMBOL_MAPPING]?.coingecko || 'bitcoin';
    const days = this.convertToCoingeckoDays(interval, limit);
    
    const url = `${API_ENDPOINTS.coingecko.history.replace('{id}', mappedSymbol)}?vs_currency=usd&days=${days}&interval=${interval === '1d' ? 'daily' : 'hourly'}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // CoinGecko provides prices and volumes, we need to construct OHLC
    return data.prices.map((price: [number, number], index: number) => {
      const volume = data.total_volumes[index] ? data.total_volumes[index][1] : 0;
      return {
        timestamp: price[0],
        open: price[1],
        high: price[1],
        low: price[1],
        close: price[1],
        volume
      };
    });
  }

  /**
   * Get real-time price data
   */
  async getRealTimePrice(symbol: string): Promise<RealTimePrice> {
    const cacheKey = `price_${symbol}`;
    
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Try Binance first
      const mappedSymbol = SYMBOL_MAPPING[symbol as keyof typeof SYMBOL_MAPPING]?.binance || symbol;
      const url = `${API_ENDPOINTS.binance.ticker}?symbol=${mappedSymbol}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const priceData: RealTimePrice = {
        symbol,
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChange),
        percentChange: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume),
        timestamp: Date.now()
      };

      if (this.config.enableCache) {
        this.cache.set(cacheKey, priceData, 5000); // 5s cache for real-time data
      }

      return priceData;
    } catch (error) {
      console.error(`Error fetching real-time price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates via WebSocket
   */
  subscribeToRealTime(
    symbol: string, 
    callback: (data: RealTimePrice) => void,
    source: 'binance' | 'coinbase' = 'binance'
  ): () => void {
    if (!this.config.enableRealTime) {
      return () => {};
    }

    const subscriptionKey = `${symbol}_${source}`;
    
    // Add callback to subscribers
    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
    }
    this.subscribers.get(subscriptionKey)!.add(callback);

    // Create WebSocket connection if not exists
    if (!this.websockets.has(subscriptionKey)) {
      this.createWebSocketConnection(symbol, source);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.get(subscriptionKey)?.delete(callback);
      
      // Close WebSocket if no more subscribers
      if (this.subscribers.get(subscriptionKey)?.size === 0) {
        this.websockets.get(subscriptionKey)?.disconnect();
        this.websockets.delete(subscriptionKey);
        this.subscribers.delete(subscriptionKey);
      }
    };
  }

  /**
   * Create WebSocket connection for real-time data
   */
  private createWebSocketConnection(symbol: string, source: 'binance' | 'coinbase') {
    const subscriptionKey = `${symbol}_${source}`;
    
    try {
      if (source === 'binance') {
        this.createBinanceWebSocket(symbol, subscriptionKey);
      } else if (source === 'coinbase') {
        this.createCoinbaseWebSocket(symbol, subscriptionKey);
      }
    } catch (error) {
      console.error(`Error creating WebSocket for ${symbol}:`, error);
      this.handleWebSocketError(subscriptionKey, error);
    }
  }

  /**
   * Create Binance WebSocket connection
   */
  private createBinanceWebSocket(symbol: string, subscriptionKey: string) {
    const mappedSymbol = SYMBOL_MAPPING[symbol as keyof typeof SYMBOL_MAPPING]?.binance || symbol;
    const wsUrl = `${API_ENDPOINTS.binance.websocket}/${mappedSymbol.toLowerCase()}@ticker`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      this.retryCount.delete(subscriptionKey);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const priceData: RealTimePrice = {
          symbol,
          price: parseFloat(data.c),
          change: parseFloat(data.P),
          percentChange: parseFloat(data.P),
          volume24h: parseFloat(data.v),
          timestamp: Date.now()
        };

        // Notify all subscribers
        this.subscribers.get(subscriptionKey)?.forEach(callback => {
          callback(priceData);
        });
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`Binance WebSocket error for ${symbol}:`, error);
      this.handleWebSocketError(subscriptionKey, error);
    };
    
    ws.onclose = () => {
      this.handleWebSocketReconnect(symbol, subscriptionKey, source);
    };
  }

  /**
   * Handle WebSocket errors and implement retry logic
   */
  private handleWebSocketError(subscriptionKey: string, error: any) {
    const currentRetries = this.retryCount.get(subscriptionKey) || 0;
    
    if (currentRetries < this.maxRetries) {
      this.retryCount.set(subscriptionKey, currentRetries + 1);
      
      setTimeout(() => {
        const [symbol, source] = subscriptionKey.split('_');
        this.createWebSocketConnection(symbol, source as 'binance' | 'coinbase');
      }, Math.pow(2, currentRetries) * 1000); // Exponential backoff
    } else {
      console.error(`Max retries exceeded for WebSocket ${subscriptionKey}`);
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleWebSocketReconnect(symbol: string, subscriptionKey: string, source: 'binance' | 'coinbase') {
    if (this.subscribers.get(subscriptionKey)?.size > 0) {
      setTimeout(() => {
        this.createWebSocketConnection(symbol, source);
      }, 5000);
    }
  }

  /**
   * Utility: Convert interval to Binance format
   */
  private convertToBinanceInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };
    return mapping[interval] || '1h';
  }

  /**
   * Utility: Convert interval to Coinbase granularity
   */
  private convertToCoinbaseGranularity(interval: string): number {
    const mapping: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400
    };
    return mapping[interval] || 3600;
  }

  /**
   * Utility: Convert interval and limit to CoinGecko days
   */
  private convertToCoingeckoDays(interval: string, limit: number): number {
    const intervalDays: Record<string, number> = {
      '1h': limit / 24,
      '4h': limit / 6,
      '1d': limit,
      '1w': limit * 7
    };
    return Math.ceil(intervalDays[interval] || limit);
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Close all WebSocket connections
    this.websockets.forEach(ws => ws.disconnect());
    this.websockets.clear();
    
    // Clear subscribers
    this.subscribers.clear();
    
    // Clear cache
    this.cache.clear();
    
    // Clear retry counters
    this.retryCount.clear();
  }
}

// Singleton instance
export const chartDataProvider = new ChartDataProvider({
  enableRealTime: true,
  enableCache: true,
  cacheExpiry: 60000,
  maxDataPoints: 1000
});

// Export utility functions
export const formatChartData = (data: ChartDataPoint[]) => {
  return data.map(point => ({
    ...point,
    formattedTime: new Date(point.timestamp).toLocaleString(),
    priceChange: data.length > 1 ? point.close - data[data.indexOf(point) - 1]?.close || 0 : 0
  }));
};

export const calculatePriceChange = (data: ChartDataPoint[]) => {
  if (data.length < 2) return { change: 0, percentChange: 0 };
  
  const current = data[data.length - 1].close;
  const previous = data[data.length - 2].close;
  const change = current - previous;
  const percentChange = (change / previous) * 100;
  
  return { change, percentChange };
};

export default ChartDataProvider;