/**
 * WebSocket Aggregator Service
 * Provides real-time price feeds from multiple exchanges.
 *
 * - Binance, Bybit, OKX: real WebSocket streams
 * - Kraken, Coinbase, Bitfinex, KuCoin, Gate.io: REST polling every 5s
 *
 * All price updates emit 'price_update' events and are cached in Redis (TTL 10s).
 */

import { EventEmitter } from 'events';
import { cache } from '@/lib/cache/redis.config';
import { fetchAllExchangePrices } from '@/lib/arbitrage/exchange-fetchers';

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
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// Symbols to track
const DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'];

// Map pair to Binance stream name
function toBinanceStream(pair: string): string {
  return pair.replace('/', '').toLowerCase() + '@bookTicker';
}

// Map pair to Bybit instrument
function toBybitSymbol(pair: string): string {
  return pair.replace('/', '');
}

// Map pair to OKX instId
function toOKXInstId(pair: string): string {
  const [base, quote] = pair.split('/');
  return `${base}-${quote}`;
}

class WebSocketAggregator extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeSymbols: string[] = [];

  private readonly DEFAULT_CONFIG = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  };

  // Exchanges with real WebSocket support
  private readonly WS_EXCHANGES = ['binance', 'bybit', 'okx'];
  // Exchanges using REST polling
  private readonly REST_EXCHANGES = ['kraken', 'coinbase', 'bitfinex', 'kucoin', 'gateio'];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Connect to a specific exchange
   */
  async connect(exchangeId: string, symbols: string[]): Promise<void> {
    this.activeSymbols = symbols;

    if (this.WS_EXCHANGES.includes(exchangeId)) {
      await this.connectWebSocket(exchangeId, symbols);
    } else if (this.REST_EXCHANGES.includes(exchangeId)) {
      this.startRESTPolling(exchangeId, symbols);
    }
  }

  /**
   * Connect via real WebSocket
   */
  private async connectWebSocket(exchangeId: string, symbols: string[]): Promise<void> {
    try {
      let ws: WebSocket;

      switch (exchangeId) {
        case 'binance': {
          // Multi-stream URL: wss://stream.binance.com:9443/ws/stream1/stream2/...
          const streams = symbols.map(toBinanceStream).join('/');
          ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data.toString());
              if (data.s && data.b && data.a) {
                // bookTicker format: { s: "BTCUSDT", b: "95000.00", a: "95001.00", ... }
                const pair = this.binanceSymbolToPair(data.s);
                if (pair) {
                  const bid = parseFloat(data.b);
                  const ask = parseFloat(data.a);
                  this.emitPriceUpdate({
                    exchange: 'binance',
                    symbol: pair,
                    bid,
                    ask,
                    last: (bid + ask) / 2,
                    timestamp: Date.now(),
                  });
                }
              }
            } catch { /* skip malformed messages */ }
          };
          break;
        }

        case 'bybit': {
          ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

          ws.onopen = () => {
            const args = symbols.map(s => `tickers.${toBybitSymbol(s)}`);
            ws.send(JSON.stringify({ op: 'subscribe', args }));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data.toString());
              if (data.topic?.startsWith('tickers.') && data.data) {
                const ticker = data.data;
                const pair = this.bybitSymbolToPair(ticker.symbol);
                if (pair) {
                  this.emitPriceUpdate({
                    exchange: 'bybit',
                    symbol: pair,
                    bid: parseFloat(ticker.bid1Price),
                    ask: parseFloat(ticker.ask1Price),
                    last: parseFloat(ticker.lastPrice),
                    timestamp: Date.now(),
                  });
                }
              }
            } catch { /* skip */ }
          };
          break;
        }

        case 'okx': {
          ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

          ws.onopen = () => {
            const args = symbols.map(s => ({ channel: 'tickers', instId: toOKXInstId(s) }));
            ws.send(JSON.stringify({ op: 'subscribe', args }));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data.toString());
              if (data.data && Array.isArray(data.data)) {
                for (const ticker of data.data) {
                  const pair = this.okxInstIdToPair(ticker.instId);
                  if (pair) {
                    this.emitPriceUpdate({
                      exchange: 'okx',
                      symbol: pair,
                      bid: parseFloat(ticker.bidPx),
                      ask: parseFloat(ticker.askPx),
                      last: parseFloat(ticker.last),
                      timestamp: Date.now(),
                    });
                  }
                }
              }
            } catch { /* skip */ }
          };
          break;
        }

        default:
          return;
      }

      ws.onerror = () => {
        console.error(`[WS] ${exchangeId} connection error`);
      };

      ws.onclose = () => {
        this.connections.delete(exchangeId);
        this.emit('disconnected', { exchange: exchangeId });
        this.handleReconnect(exchangeId, symbols);
      };

      this.connections.set(exchangeId, { ws, connected: true, symbols, type: 'websocket' });
      this.reconnectAttempts.set(exchangeId, 0);
      this.emit('connected', { exchange: exchangeId, symbols, type: 'websocket' });
    } catch (error) {
      console.error(`[WS] Failed to connect to ${exchangeId}:`, error);
      this.handleReconnect(exchangeId, symbols);
    }
  }

  /**
   * Start REST polling for exchanges without free WebSocket access
   */
  private startRESTPolling(exchangeId: string, symbols: string[]): void {
    const fetchAndEmit = async () => {
      try {
        for (const symbol of symbols) {
          const prices = await fetchAllExchangePrices(symbol, [exchangeId]);
          for (const price of prices) {
            this.emitPriceUpdate({
              exchange: price.exchange,
              symbol: price.pair,
              bid: price.bid,
              ask: price.ask,
              last: price.last,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        console.error(`[REST Poll] ${exchangeId} error:`, error);
      }
    };

    // Fetch immediately, then poll every 5 seconds
    fetchAndEmit();
    const interval = setInterval(fetchAndEmit, 5000);
    this.pollIntervals.set(exchangeId, interval);
    this.connections.set(exchangeId, { connected: true, symbols, type: 'rest' });
    this.emit('connected', { exchange: exchangeId, symbols, type: 'rest' });
  }

  // Symbol converters
  private binanceSymbolToPair(symbol: string): string | null {
    const pairs: Record<string, string> = {
      BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
      XRPUSDT: 'XRP/USDT', DOGEUSDT: 'DOGE/USDT',
    };
    return pairs[symbol] || null;
  }

  private bybitSymbolToPair(symbol: string): string | null {
    const pairs: Record<string, string> = {
      BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
      XRPUSDT: 'XRP/USDT', DOGEUSDT: 'DOGE/USDT',
    };
    return pairs[symbol] || null;
  }

  private okxInstIdToPair(instId: string): string | null {
    const pairs: Record<string, string> = {
      'BTC-USDT': 'BTC/USDT', 'ETH-USDT': 'ETH/USDT', 'SOL-USDT': 'SOL/USDT',
      'XRP-USDT': 'XRP/USDT', 'DOGE-USDT': 'DOGE/USDT',
    };
    return pairs[instId] || null;
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(exchangeId: string, symbols: string[]): void {
    const attempts = this.reconnectAttempts.get(exchangeId) || 0;

    if (attempts >= this.DEFAULT_CONFIG.maxReconnectAttempts) {
      console.error(`[WS] Max reconnect attempts reached for ${exchangeId}, falling back to REST`);
      this.startRESTPolling(exchangeId, symbols);
      this.emit('reconnect_failed', { exchange: exchangeId, attempts });
      return;
    }

    const delay = this.DEFAULT_CONFIG.reconnectInterval * Math.pow(2, Math.min(attempts, 5));

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(exchangeId, attempts + 1);
      this.connectWebSocket(exchangeId, symbols);
    }, delay);

    this.reconnectTimers.set(exchangeId, timer);
  }

  /**
   * Emit price update and cache it
   */
  private async emitPriceUpdate(update: PriceUpdate): Promise<void> {
    // Cache in Redis with 10s TTL
    const cacheKey = `ws:price:${update.exchange}:${update.symbol}`;
    try {
      await cache.setex(cacheKey, 10, JSON.stringify(update));
      await cache.publish('price_updates', JSON.stringify(update));
    } catch { /* non-fatal */ }

    // Emit to local listeners
    this.emit('price_update', update);
  }

  /**
   * Disconnect from exchange
   */
  async disconnect(exchangeId: string): Promise<void> {
    // Clear reconnect timer
    const timer = this.reconnectTimers.get(exchangeId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(exchangeId);
    }

    // Clear polling interval
    const pollInterval = this.pollIntervals.get(exchangeId);
    if (pollInterval) {
      clearInterval(pollInterval);
      this.pollIntervals.delete(exchangeId);
    }

    // Close WebSocket
    const connection = this.connections.get(exchangeId);
    if (connection) {
      if (connection.ws && typeof connection.ws.close === 'function') {
        try { connection.ws.close(); } catch { /* ignore */ }
      }
      this.connections.delete(exchangeId);
      this.emit('disconnected', { exchange: exchangeId });
    }
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
    try {
      const cached = await cache.get(cacheKey);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  /**
   * Connect to all exchanges
   */
  async connectAll(symbols: string[] = DEFAULT_SYMBOLS): Promise<void> {
    const allExchanges = [...this.WS_EXCHANGES, ...this.REST_EXCHANGES];
    await Promise.all(allExchanges.map(exchange => this.connect(exchange, symbols)));
  }

  /**
   * Disconnect from all exchanges
   */
  async disconnectAll(): Promise<void> {
    const exchanges = Array.from(this.connections.keys());
    await Promise.all(exchanges.map(exchange => this.disconnect(exchange)));
  }

  /**
   * Get connection status
   */
  getStatus(): Record<string, { connected: boolean; symbols: string[]; type: string }> {
    const status: Record<string, { connected: boolean; symbols: string[]; type: string }> = {};

    for (const [exchangeId, connection] of this.connections) {
      status[exchangeId] = {
        connected: connection.connected,
        symbols: connection.symbols,
        type: connection.type || 'unknown',
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
    wsConnections: number;
    restPolling: number;
  }> {
    const allExchanges = [...this.WS_EXCHANGES, ...this.REST_EXCHANGES];
    const exchanges: Record<string, boolean> = {};
    let connected = 0;
    let wsConnections = 0;
    let restPolling = 0;

    for (const exchangeId of allExchanges) {
      const conn = this.connections.get(exchangeId);
      const isConnected = !!conn?.connected;
      exchanges[exchangeId] = isConnected;
      if (isConnected) {
        connected++;
        if (conn.type === 'websocket') wsConnections++;
        else restPolling++;
      }
    }

    return { connected, total: allExchanges.length, exchanges, wsConnections, restPolling };
  }
}

// Export singleton instance
export const wsAggregator = new WebSocketAggregator();

/**
 * Initialize WebSocket connections on server start
 */
export async function initializeWebSocketFeeds(
  symbols: string[] = DEFAULT_SYMBOLS
): Promise<void> {
  try {
    await wsAggregator.connectAll(symbols);
  } catch (error) {
    console.error('[WebSocketAggregator] Failed to initialize:', error);

  }
}
