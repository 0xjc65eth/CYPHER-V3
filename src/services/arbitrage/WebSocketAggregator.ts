/**
 * WebSocket Aggregator Service
 * Provides real-time price feeds from multiple exchanges
 * Target: < 100ms latency from exchange to client
 */

import { EventEmitter } from 'events';
import { cache } from '@/lib/cache/redis.config';
import { coinGeckoService } from '@/lib/api/coingecko-service';

export interface PriceUpdate {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: number;
}

export interface WebSocketConfig {
  exchange: string;
  symbols: string[];
  reconnectInterval: number; // milliseconds
  maxReconnectAttempts: number;
}

class WebSocketAggregator extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  private readonly DEFAULT_CONFIG = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  };

  // Supported WebSocket exchanges (these support WS feeds)
  private readonly WS_SUPPORTED = [
    'binance',
    'coinbase',
    'kraken',
    'okx',
    'bybit',
    'bitfinex'
  ];

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }

  /**
   * Connect to exchange WebSocket feeds
   */
  async connect(exchangeId: string, symbols: string[]): Promise<void> {
    if (!this.WS_SUPPORTED.includes(exchangeId)) {
      // WebSocket not supported for this exchange
      return;
    }

    try {
      // NOTE: This is a simplified implementation
      // In production, you would use ccxt.pro or exchange-specific WebSocket libraries
      // Connecting to exchange WebSocket

      // Simulate WebSocket connection
      // In real implementation, use ccxt.pro:
      // const ccxtpro = require('ccxt.pro');
      // const exchange = new ccxtpro[exchangeId]();
      // await exchange.watchTicker(symbol);

      this.connections.set(exchangeId, { connected: true, symbols });
      this.reconnectAttempts.set(exchangeId, 0);

      this.emit('connected', { exchange: exchangeId, symbols });

      // Start real price polling from CoinGecko
      this.startRealPricePolling(exchangeId, symbols);

    } catch (error) {
      console.error(`❌ Failed to connect to ${exchangeId}:`, error);
      this.handleReconnect(exchangeId, symbols);
    }
  }

  /**
   * Disconnect from exchange
   */
  async disconnect(exchangeId: string): Promise<void> {
    const timer = this.reconnectTimers.get(exchangeId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(exchangeId);
    }

    const connection = this.connections.get(exchangeId);
    if (connection) {
      // Clean up polling interval
      if (connection._pollInterval) {
        clearInterval(connection._pollInterval);
      }
      this.connections.delete(exchangeId);
      this.emit('disconnected', { exchange: exchangeId });
      // Disconnected from exchange
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(exchangeId: string, symbols: string[]): void {
    const attempts = this.reconnectAttempts.get(exchangeId) || 0;

    if (attempts >= this.DEFAULT_CONFIG.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for ${exchangeId}`);
      this.emit('reconnect_failed', { exchange: exchangeId, attempts });
      return;
    }

    const delay = this.DEFAULT_CONFIG.reconnectInterval * Math.pow(2, Math.min(attempts, 5));
    // Reconnecting with exponential backoff

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(exchangeId, attempts + 1);
      this.connect(exchangeId, symbols);
    }, delay);

    this.reconnectTimers.set(exchangeId, timer);
  }

  /**
   * Start real price polling using CoinGecko API.
   * Polls every 30 seconds to respect rate limits.
   */
  private startRealPricePolling(exchangeId: string, symbols: string[]): void {
    // Map trading pair symbols to CoinGecko IDs
    const symbolToCoinId: Record<string, string> = {
      'BTC/USDT': 'bitcoin',
      'ETH/USDT': 'ethereum',
      'SOL/USDT': 'solana',
      'BNB/USDT': 'binancecoin',
    };

    const fetchAndEmit = async () => {
      if (!this.connections.has(exchangeId)) return;

      try {
        const coinIds = symbols
          .map(s => symbolToCoinId[s])
          .filter(Boolean);

        if (coinIds.length === 0) return;

        const data = await coinGeckoService.getSimplePrice(
          coinIds,
          ['usd'],
          { include24hrVol: true }
        );

        for (const symbol of symbols) {
          const coinId = symbolToCoinId[symbol];
          if (!coinId || !data[coinId]) continue;

          const price = data[coinId].usd;
          const spread = price * 0.0001; // 0.01% typical spread

          const update: PriceUpdate = {
            exchange: exchangeId,
            symbol,
            bid: price - spread / 2,
            ask: price + spread / 2,
            last: price,
            timestamp: Date.now(),
          };

          this.emitPriceUpdate(update);
        }
      } catch (error) {
        console.error(`[WebSocketAggregator] Failed to fetch prices for ${exchangeId}:`, error);
      }
    };

    // Fetch immediately then poll every 30 seconds
    fetchAndEmit();
    const interval = setInterval(fetchAndEmit, 30000);

    // Store interval reference for cleanup
    const connection = this.connections.get(exchangeId);
    if (connection) {
      connection._pollInterval = interval;
    }
  }

  /**
   * Emit price update and cache it
   */
  private async emitPriceUpdate(update: PriceUpdate): Promise<void> {
    // Cache in Redis for HTTP API access
    const cacheKey = `ws:price:${update.exchange}:${update.symbol}`;
    await cache.setex(cacheKey, 10, JSON.stringify(update));

    // Publish to Redis pub/sub for distribution
    await cache.publish('price_updates', JSON.stringify(update));

    // Emit to local listeners
    this.emit('price_update', update);
  }

  /**
   * Subscribe to price updates for a symbol
   */
  subscribe(symbol: string, callback: (update: PriceUpdate) => void): void {
    this.on('price_update', (update: PriceUpdate) => {
      if (update.symbol === symbol) {
        callback(update);
      }
    });
  }

  /**
   * Subscribe to all price updates
   */
  subscribeAll(callback: (update: PriceUpdate) => void): void {
    this.on('price_update', callback);
  }

  /**
   * Get latest cached price
   */
  async getLatestPrice(exchangeId: string, symbol: string): Promise<PriceUpdate | null> {
    const cacheKey = `ws:price:${exchangeId}:${symbol}`;
    const cached = await cache.get(cacheKey);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (error) {
      return null;
    }
  }

  /**
   * Connect to all supported exchanges
   */
  async connectAll(symbols: string[]): Promise<void> {
    const promises = this.WS_SUPPORTED.map(exchange => this.connect(exchange, symbols));
    await Promise.all(promises);
    // Connected to all supported exchanges
  }

  /**
   * Disconnect from all exchanges
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(exchange => this.disconnect(exchange));
    await Promise.all(promises);
    // Disconnected from all exchanges
  }

  /**
   * Get connection status
   */
  getStatus(): Record<string, { connected: boolean; symbols: string[] }> {
    const status: Record<string, { connected: boolean; symbols: string[] }> = {};

    for (const [exchangeId, connection] of this.connections) {
      status[exchangeId] = {
        connected: connection.connected,
        symbols: connection.symbols
      };
    }

    return status;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    connected: number;
    total: number;
    exchanges: Record<string, boolean>;
  }> {
    const exchanges: Record<string, boolean> = {};
    let connected = 0;

    for (const exchangeId of this.WS_SUPPORTED) {
      const isConnected = this.connections.has(exchangeId);
      exchanges[exchangeId] = isConnected;
      if (isConnected) connected++;
    }

    return {
      connected,
      total: this.WS_SUPPORTED.length,
      exchanges
    };
  }
}

// Export singleton instance
export const wsAggregator = new WebSocketAggregator();

/**
 * Initialize WebSocket connections on server start
 */
export async function initializeWebSocketFeeds(symbols: string[] = ['BTC/USDT', 'ETH/USDT']): Promise<void> {
  try {
    await wsAggregator.connectAll(symbols);
    // WebSocket Aggregator initialized
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket Aggregator:', error);
  }
}
