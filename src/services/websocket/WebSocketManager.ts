/**
 * WebSocket Manager for CYPHER ORDi Future V3
 * Real-time data feeds from multiple exchanges and blockchain networks
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import crypto from 'crypto';

// WebSocket Connection Types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff: number;
  };
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number;
    message?: string;
  };
  authentication?: {
    apiKey: string;
    secretKey: string;
    method: 'header' | 'message' | 'query';
  };
  rateLimit?: {
    messagesPerSecond: number;
    burstLimit: number;
  };
}

export interface SubscriptionConfig {
  id: string;
  channel: string;
  symbol?: string;
  parameters?: Record<string, any>;
  onData: (data: any) => void;
  onError?: (error: Error) => void;
  filters?: {
    minVolume?: number;
    priceRange?: { min: number; max: number };
    timeframe?: string;
  };
}

export interface MarketDataFeed {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change24h: number;
  timestamp: number;
  exchange: string;
}

export interface OrderBookData {
  symbol: string;
  bids: Array<[number, number]>; // [price, size]
  asks: Array<[number, number]>; // [price, size]
  timestamp: number;
  exchange: string;
}

export interface TradeData {
  symbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  tradeId: string;
  exchange: string;
}

export interface ConnectionStatus {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  lastConnected?: number;
  reconnectAttempt: number;
  latency?: number;
  subscriptions: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
}

export class WebSocketConnection extends EventEmitter {
  private config: WebSocketConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private status: ConnectionStatus;
  private subscriptions: Map<string, SubscriptionConfig> = new Map();
  private messageQueue: string[] = [];
  private rateLimiter: {
    tokens: number;
    lastRefill: number;
  } | null = null;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    
    this.status = {
      url: config.url,
      status: 'disconnected',
      reconnectAttempt: 0,
      subscriptions: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0
    };

    // Initialize rate limiter if configured
    if (config.rateLimit) {
      this.rateLimiter = {
        tokens: config.rateLimit.burstLimit,
        lastRefill: Date.now()
      };
    }
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      EnhancedLogger.warn('WebSocket already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.status.status = 'connecting';
        EnhancedLogger.info('Connecting to WebSocket', { url: this.config.url });

        this.ws = new WebSocket(this.config.url, this.config.protocols);

        // Apply headers if specified
        if (this.config.headers) {
          Object.entries(this.config.headers).forEach(([key, value]) => {
            // Note: Cannot set headers on browser WebSocket, would need different approach for server
          });
        }

        this.ws.onopen = () => {
          this.status.status = 'connected';
          this.status.lastConnected = Date.now();
          this.reconnectAttempts = 0;
          
          EnhancedLogger.info('WebSocket connected', { url: this.config.url });
          
          // Authenticate if required
          if (this.config.authentication) {
            this.authenticate();
          }

          // Start heartbeat
          if (this.config.heartbeat.enabled) {
            this.startHeartbeat();
          }

          // Re-subscribe to channels
          this.resubscribeAll();

          // Process queued messages
          this.processMessageQueue();

          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.status.status === 'connecting') {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.status.status = 'error';
        this.status.errors++;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.clearHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.status.status = 'disconnected';
  }

  /**
   * Subscribe to a channel
   */
  subscribe(subscription: SubscriptionConfig): void {
    this.subscriptions.set(subscription.id, subscription);
    this.status.subscriptions = this.subscriptions.size;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription(subscription);
    }

    EnhancedLogger.info('Subscription added', {
      id: subscription.id,
      channel: subscription.channel,
      symbol: subscription.symbol
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      this.status.subscriptions = this.subscriptions.size;

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendUnsubscription(subscription);
      }

      EnhancedLogger.info('Subscription removed', { id: subscriptionId });
    }
  }

  /**
   * Send message with rate limiting
   */
  send(message: string | object): boolean {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    // Check rate limit
    if (this.rateLimiter && !this.checkRateLimit()) {
      this.messageQueue.push(messageStr);
      return false;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(messageStr);
      this.status.messagesSent++;
      return true;
    } else {
      this.messageQueue.push(messageStr);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    if (this.ws) {
      this.status.latency = this.lastPingTime > 0 ? Date.now() - this.lastPingTime : undefined;
    }
    return { ...this.status };
  }

  /**
   * Private methods
   */

  private authenticate(): void {
    if (!this.config.authentication) return;

    const { apiKey, secretKey, method } = this.config.authentication;
    const timestamp = Date.now();

    switch (method) {
      case 'message':
        const authMessage = {
          method: 'auth',
          apiKey,
          timestamp,
          signature: crypto.createHmac('sha256', secretKey).update(`GET/ws/auth${timestamp}`).digest('hex')
        };
        this.send(authMessage);
        break;

      case 'header':
        // Headers would be set during connection
        break;

      case 'query':
        // Query params would be added to URL
        break;
    }
  }

  private startHeartbeat(): void {
    if (!this.config.heartbeat.enabled) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage = this.config.heartbeat.message || JSON.stringify({ ping: Date.now() });
        this.lastPingTime = Date.now();
        this.send(pingMessage);

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          EnhancedLogger.warn('Heartbeat timeout, closing connection');
          this.ws?.close();
        }, this.config.heartbeat.timeout);
      }
    }, this.config.heartbeat.interval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      this.status.messagesReceived++;
      const data = JSON.parse(event.data);

      // Handle pong response
      if (data.pong && this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }

      // Route message to appropriate subscription
      this.routeMessage(data);

    } catch (error) {
      EnhancedLogger.error('Error parsing WebSocket message:', error);
      this.status.errors++;
    }
  }

  private routeMessage(data: any): void {
    // Find matching subscription based on message content
    for (const subscription of this.subscriptions.values()) {
      if (this.messageMatchesSubscription(data, subscription)) {
        try {
          // Apply filters if configured
          if (this.passesFilters(data, subscription.filters)) {
            subscription.onData(data);
          }
        } catch (error) {
          EnhancedLogger.error(`Error in subscription handler ${subscription.id}:`, error);
          subscription.onError?.(error as Error);
        }
      }
    }

    this.emit('message', data);
  }

  private messageMatchesSubscription(data: any, subscription: SubscriptionConfig): boolean {
    // Generic matching logic - would be customized per exchange
    if (data.channel && subscription.channel) {
      if (data.channel === subscription.channel) {
        return !subscription.symbol || data.symbol === subscription.symbol;
      }
    }

    // Match by subscription ID
    if (data.id === subscription.id) {
      return true;
    }

    return false;
  }

  private passesFilters(data: any, filters?: SubscriptionConfig['filters']): boolean {
    if (!filters) return true;

    // Volume filter
    if (filters.minVolume && data.volume < filters.minVolume) {
      return false;
    }

    // Price range filter
    if (filters.priceRange) {
      const price = data.price || data.p;
      if (price < filters.priceRange.min || price > filters.priceRange.max) {
        return false;
      }
    }

    return true;
  }

  private handleClose(event: CloseEvent): void {
    this.status.status = 'disconnected';
    this.clearHeartbeat();

    EnhancedLogger.warn('WebSocket disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.emit('disconnected', event);

    // Attempt reconnection if enabled
    if (this.config.reconnect.enabled && this.reconnectAttempts < this.config.reconnect.maxAttempts) {
      this.attemptReconnect();
    }
  }

  private handleError(error: Event): void {
    this.status.status = 'error';
    this.status.errors++;
    EnhancedLogger.error('WebSocket error:', error);
    this.emit('error', error);
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.status.reconnectAttempt = this.reconnectAttempts;
    this.status.status = 'reconnecting';

    const delay = this.config.reconnect.delay * Math.pow(this.config.reconnect.backoff, this.reconnectAttempts - 1);

    EnhancedLogger.info('Attempting reconnection', {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.config.reconnect.maxAttempts
    });

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        EnhancedLogger.error('Reconnection failed:', error);
        
        if (this.reconnectAttempts < this.config.reconnect.maxAttempts) {
          this.attemptReconnect();
        } else {
          EnhancedLogger.error('Max reconnection attempts reached');
          this.emit('reconnectFailed');
        }
      }
    }, delay);
  }

  private resubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscription(subscription);
    }
  }

  private sendSubscription(subscription: SubscriptionConfig): void {
    const subMessage = {
      method: 'subscribe',
      id: subscription.id,
      channel: subscription.channel,
      symbol: subscription.symbol,
      ...subscription.parameters
    };

    this.send(subMessage);
  }

  private sendUnsubscription(subscription: SubscriptionConfig): void {
    const unsubMessage = {
      method: 'unsubscribe',
      id: subscription.id,
      channel: subscription.channel,
      symbol: subscription.symbol
    };

    this.send(unsubMessage);
  }

  private checkRateLimit(): boolean {
    if (!this.rateLimiter || !this.config.rateLimit) return true;

    const now = Date.now();
    const timePassed = now - this.rateLimiter.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.rateLimit.messagesPerSecond;

    this.rateLimiter.tokens = Math.min(
      this.config.rateLimit.burstLimit,
      this.rateLimiter.tokens + tokensToAdd
    );
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens--;
      return true;
    }

    return false;
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.checkRateLimit()) {
      const message = this.messageQueue.shift()!;
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(message);
        this.status.messagesSent++;
      }
    }

    // Schedule next queue processing if there are remaining messages
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 100);
    }
  }
}

export class WebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private aggregatedFeeds: Map<string, MarketDataFeed[]> = new Map();
  private orderBooks: Map<string, OrderBookData> = new Map();
  private trades: Map<string, TradeData[]> = new Map();

  // Exchange configurations
  private readonly EXCHANGE_CONFIGS: Record<string, Partial<WebSocketConfig>> = {
    binance: {
      url: 'wss://stream.binance.com:9443/ws',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        backoff: 2
      },
      heartbeat: {
        enabled: false,
        interval: 30000,
        timeout: 10000
      }
    },
    coinbase: {
      url: 'wss://ws-feed.pro.coinbase.com',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        backoff: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 10000,
        message: JSON.stringify({ type: 'ping' })
      }
    },
    kraken: {
      url: 'wss://ws.kraken.com',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        backoff: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 10000
      }
    },
    hyperliquid: {
      url: 'wss://api.hyperliquid.xyz/ws',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        backoff: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 10000
      },
      authentication: {
        method: 'message'
      } as any
    }
  };

  constructor() {
    super();

    EnhancedLogger.info('WebSocket Manager initialized', {
      component: 'WebSocketManager',
      supportedExchanges: Object.keys(this.EXCHANGE_CONFIGS)
    });
  }

  /**
   * Connect to an exchange
   */
  async connectExchange(
    exchangeId: string,
    customConfig?: Partial<WebSocketConfig>
  ): Promise<void> {
    const baseConfig = this.EXCHANGE_CONFIGS[exchangeId];
    if (!baseConfig) {
      throw new Error(`Unsupported exchange: ${exchangeId}`);
    }

    const config: WebSocketConfig = {
      ...baseConfig,
      ...customConfig,
      reconnect: { ...baseConfig.reconnect, ...customConfig?.reconnect },
      heartbeat: { ...baseConfig.heartbeat, ...customConfig?.heartbeat }
    } as WebSocketConfig;

    const connection = new WebSocketConnection(config);

    // Set up event handlers
    connection.on('connected', () => {
      EnhancedLogger.info(`Connected to ${exchangeId}`);
      this.emit('exchangeConnected', exchangeId);
    });

    connection.on('disconnected', () => {
      EnhancedLogger.warn(`Disconnected from ${exchangeId}`);
      this.emit('exchangeDisconnected', exchangeId);
    });

    connection.on('error', (error) => {
      EnhancedLogger.error(`Error from ${exchangeId}:`, error);
      this.emit('exchangeError', { exchangeId, error });
    });

    connection.on('message', (data) => {
      this.processExchangeMessage(exchangeId, data);
    });

    this.connections.set(exchangeId, connection);
    await connection.connect();
  }

  /**
   * Subscribe to market data
   */
  subscribeToMarketData(
    exchangeId: string,
    symbols: string[],
    dataTypes: Array<'ticker' | 'orderbook' | 'trades'> = ['ticker']
  ): void {
    const connection = this.connections.get(exchangeId);
    if (!connection) {
      throw new Error(`Not connected to ${exchangeId}`);
    }

    symbols.forEach(symbol => {
      dataTypes.forEach(dataType => {
        const subscriptionId = `${exchangeId}_${symbol}_${dataType}`;
        
        connection.subscribe({
          id: subscriptionId,
          channel: this.getChannelName(exchangeId, dataType),
          symbol,
          onData: (data) => this.handleMarketData(exchangeId, symbol, dataType, data),
          onError: (error) => EnhancedLogger.error(`Subscription error ${subscriptionId}:`, error)
        });
      });
    });
  }

  /**
   * Get aggregated market data across exchanges
   */
  getAggregatedMarketData(symbol: string): MarketDataFeed[] {
    return this.aggregatedFeeds.get(symbol) || [];
  }

  /**
   * Get best bid/ask across exchanges
   */
  getBestPrice(symbol: string): { bestBid: number; bestAsk: number; exchanges: string[] } {
    const feeds = this.getAggregatedMarketData(symbol);
    
    if (feeds.length === 0) {
      return { bestBid: 0, bestAsk: 0, exchanges: [] };
    }

    const bestBid = Math.max(...feeds.map(f => f.bid));
    const bestAsk = Math.min(...feeds.filter(f => f.ask > 0).map(f => f.ask));
    const exchanges = feeds.map(f => f.exchange);

    return { bestBid, bestAsk, exchanges };
  }

  /**
   * Get connection status for all exchanges
   */
  getConnectionStatus(): Record<string, ConnectionStatus> {
    const status: Record<string, ConnectionStatus> = {};
    
    for (const [exchangeId, connection] of this.connections) {
      status[exchangeId] = connection.getStatus();
    }

    return status;
  }

  /**
   * Disconnect from an exchange
   */
  disconnectExchange(exchangeId: string): void {
    const connection = this.connections.get(exchangeId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(exchangeId);
      
      // Clean up data
      this.cleanupExchangeData(exchangeId);
      
      EnhancedLogger.info(`Disconnected from ${exchangeId}`);
    }
  }

  /**
   * Disconnect from all exchanges
   */
  disconnectAll(): void {
    for (const [exchangeId] of this.connections) {
      this.disconnectExchange(exchangeId);
    }
  }

  /**
   * Private methods
   */

  private processExchangeMessage(exchangeId: string, data: any): void {
    // Process exchange-specific message format
    switch (exchangeId) {
      case 'binance':
        this.processBinanceMessage(data);
        break;
      case 'coinbase':
        this.processCoinbaseMessage(data);
        break;
      case 'kraken':
        this.processKrakenMessage(data);
        break;
      case 'hyperliquid':
        this.processHyperliquidMessage(data);
        break;
    }
  }

  private processBinanceMessage(data: any): void {
    if (data.e === '24hrTicker') {
      const marketData: MarketDataFeed = {
        symbol: data.s,
        price: parseFloat(data.c),
        bid: parseFloat(data.b),
        ask: parseFloat(data.a),
        volume: parseFloat(data.v),
        change24h: parseFloat(data.P),
        timestamp: data.E,
        exchange: 'binance'
      };
      
      this.updateAggregatedFeed(marketData);
    }
  }

  private processCoinbaseMessage(data: any): void {
    if (data.type === 'ticker') {
      const marketData: MarketDataFeed = {
        symbol: data.product_id,
        price: parseFloat(data.price),
        bid: parseFloat(data.best_bid),
        ask: parseFloat(data.best_ask),
        volume: parseFloat(data.volume_24h),
        change24h: 0, // Not provided directly
        timestamp: new Date(data.time).getTime(),
        exchange: 'coinbase'
      };
      
      this.updateAggregatedFeed(marketData);
    }
  }

  private processKrakenMessage(data: any): void {
    // Kraken has a different message format
    if (Array.isArray(data) && data.length > 1) {
      const channelData = data[1];
      if (channelData.c) { // Ticker data
        const marketData: MarketDataFeed = {
          symbol: data[3], // Symbol is at index 3
          price: parseFloat(channelData.c[0]),
          bid: parseFloat(channelData.b[0]),
          ask: parseFloat(channelData.a[0]),
          volume: parseFloat(channelData.v[1]),
          change24h: parseFloat(channelData.p[1]),
          timestamp: Date.now(),
          exchange: 'kraken'
        };
        
        this.updateAggregatedFeed(marketData);
      }
    }
  }

  private processHyperliquidMessage(data: any): void {
    if (data.channel === 'ticker') {
      const marketData: MarketDataFeed = {
        symbol: data.data.symbol,
        price: data.data.price,
        bid: data.data.bid,
        ask: data.data.ask,
        volume: data.data.volume24h,
        change24h: data.data.change24h,
        timestamp: data.data.timestamp,
        exchange: 'hyperliquid'
      };
      
      this.updateAggregatedFeed(marketData);
    }
  }

  private handleMarketData(
    exchangeId: string,
    symbol: string,
    dataType: string,
    data: any
  ): void {
    switch (dataType) {
      case 'ticker':
        // Already handled in processExchangeMessage
        break;
      case 'orderbook':
        this.handleOrderBookData(exchangeId, symbol, data);
        break;
      case 'trades':
        this.handleTradeData(exchangeId, symbol, data);
        break;
    }
  }

  private handleOrderBookData(exchangeId: string, symbol: string, data: any): void {
    const orderBook: OrderBookData = {
      symbol,
      bids: data.bids || [],
      asks: data.asks || [],
      timestamp: Date.now(),
      exchange: exchangeId
    };

    this.orderBooks.set(`${exchangeId}_${symbol}`, orderBook);
    this.emit('orderBookUpdate', orderBook);
  }

  private handleTradeData(exchangeId: string, symbol: string, data: any): void {
    const trade: TradeData = {
      symbol,
      price: data.price,
      size: data.size,
      side: data.side,
      timestamp: data.timestamp || Date.now(),
      tradeId: data.tradeId || `${Date.now()}_${Math.random()}`,
      exchange: exchangeId
    };

    if (!this.trades.has(symbol)) {
      this.trades.set(symbol, []);
    }

    const trades = this.trades.get(symbol)!;
    trades.push(trade);

    // Keep only last 1000 trades
    if (trades.length > 1000) {
      trades.splice(0, trades.length - 1000);
    }

    this.emit('trade', trade);
  }

  private updateAggregatedFeed(marketData: MarketDataFeed): void {
    if (!this.aggregatedFeeds.has(marketData.symbol)) {
      this.aggregatedFeeds.set(marketData.symbol, []);
    }

    const feeds = this.aggregatedFeeds.get(marketData.symbol)!;
    
    // Update or add feed from this exchange
    const existingIndex = feeds.findIndex(f => f.exchange === marketData.exchange);
    if (existingIndex >= 0) {
      feeds[existingIndex] = marketData;
    } else {
      feeds.push(marketData);
    }

    this.emit('marketDataUpdate', marketData);
  }

  private getChannelName(exchangeId: string, dataType: string): string {
    const channelMaps: Record<string, Record<string, string>> = {
      binance: {
        ticker: '24hrTicker',
        orderbook: 'depth',
        trades: 'trade'
      },
      coinbase: {
        ticker: 'ticker',
        orderbook: 'level2',
        trades: 'matches'
      },
      kraken: {
        ticker: 'ticker',
        orderbook: 'book',
        trades: 'trade'
      },
      hyperliquid: {
        ticker: 'ticker',
        orderbook: 'orderbook',
        trades: 'trades'
      }
    };

    return channelMaps[exchangeId]?.[dataType] || dataType;
  }

  private cleanupExchangeData(exchangeId: string): void {
    // Remove feeds from this exchange
    for (const [symbol, feeds] of this.aggregatedFeeds) {
      const filteredFeeds = feeds.filter(f => f.exchange !== exchangeId);
      if (filteredFeeds.length === 0) {
        this.aggregatedFeeds.delete(symbol);
      } else {
        this.aggregatedFeeds.set(symbol, filteredFeeds);
      }
    }

    // Remove order books from this exchange
    for (const [key] of this.orderBooks) {
      if (key.startsWith(`${exchangeId}_`)) {
        this.orderBooks.delete(key);
      }
    }
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();

// Export utility functions
export const WebSocketUtils = {
  /**
   * Normalize symbol format across exchanges
   */
  normalizeSymbol(symbol: string, fromExchange: string, toExchange: string): string {
    const symbolMaps: Record<string, Record<string, string>> = {
      binance: { 'BTC-USD': 'BTCUSDT', 'ETH-USD': 'ETHUSDT' },
      coinbase: { 'BTCUSDT': 'BTC-USD', 'ETHUSDT': 'ETH-USD' },
      kraken: { 'BTC-USD': 'XBT/USD', 'ETH-USD': 'ETH/USD' },
      hyperliquid: { 'BTCUSDT': 'BTC-USD', 'ETHUSDT': 'ETH-USD' }
    };

    return symbolMaps[toExchange]?.[symbol] || symbol;
  },

  /**
   * Calculate spread across exchanges
   */
  calculateSpread(feeds: MarketDataFeed[]): number {
    if (feeds.length < 2) return 0;
    
    const prices = feeds.map(f => f.price).filter(p => p > 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return ((max - min) / min) * 100;
  },

  /**
   * Detect arbitrage opportunities
   */
  detectArbitrage(
    feeds: MarketDataFeed[],
    minSpread: number = 0.1
  ): Array<{ buyExchange: string; sellExchange: string; spread: number; profit: number }> {
    const opportunities: Array<{ buyExchange: string; sellExchange: string; spread: number; profit: number }> = [];
    
    for (let i = 0; i < feeds.length; i++) {
      for (let j = i + 1; j < feeds.length; j++) {
        const feed1 = feeds[i];
        const feed2 = feeds[j];
        
        // Check both directions
        const spread1to2 = ((feed2.bid - feed1.ask) / feed1.ask) * 100;
        const spread2to1 = ((feed1.bid - feed2.ask) / feed2.ask) * 100;
        
        if (spread1to2 > minSpread) {
          opportunities.push({
            buyExchange: feed1.exchange,
            sellExchange: feed2.exchange,
            spread: spread1to2,
            profit: feed2.bid - feed1.ask
          });
        }
        
        if (spread2to1 > minSpread) {
          opportunities.push({
            buyExchange: feed2.exchange,
            sellExchange: feed1.exchange,
            spread: spread2to1,
            profit: feed1.bid - feed2.ask
          });
        }
      }
    }
    
    return opportunities.sort((a, b) => b.spread - a.spread);
  }
};