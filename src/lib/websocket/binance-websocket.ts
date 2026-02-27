/**
 * Binance WebSocket Manager - Fixed Version
 * Handles real-time market data from Binance WebSocket API
 */

import { logger } from '@/lib/logger';

export interface BinanceConfig {
  baseUrl?: string;
  pingInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type BinanceStreamType = 'ticker' | 'depth' | 'trade' | 'kline';
export type BinanceKlineInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface BinanceSubscription {
  id: string;
  streams: string[];
  callback: (data: any) => void;
  symbols: string[];
  streamTypes: BinanceStreamType[];
}

export interface BinanceTickerData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
  bidPrice: string;
  askPrice: string;
  closeTime: number;
}

export interface BinanceDepthData {
  symbol: string;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BinanceTradeData {
  symbol: string;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface BinanceKlineData {
  kline: {
    symbol: string;
    interval: string;
    startTime: number;
    endTime: number;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    closePrice: string;
    volume: string;
    numberOfTrades: number;
    isFinal: boolean;
  };
}

class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private subscriptions = new Map<string, BinanceSubscription>();
  private activeStreams = new Set<string>();
  private reconnectAttempts = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastPong = 0;
  private messageCount = 0;
  private dataCache = new Map<string, { data: any; timestamp: number }>();

  private config: Required<BinanceConfig> = {
    baseUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
    pingInterval: 30000, // 30 seconds
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10
  };

  constructor(config?: BinanceConfig) {
    if (config) {
      this.config = {
        ...this.config,
        ...config
      };
    }
  }

  /**
   * Initialize the Binance WebSocket connection
   */
  async initialize(): Promise<void> {
    if (this.isConnected || this.ws) {
      logger.warn('Binance WebSocket already initialized');
      return;
    }

    logger.info('🚀 Initializing Binance WebSocket connection');
    await this.connect();
  }

  /**
   * Connect to Binance WebSocket
   */
  private async connect(): Promise<void> {
    if (typeof WebSocket === 'undefined') {
      logger.warn('WebSocket not available in this environment, Binance real-time data disabled');
      return;
    }

    try {
      logger.info(`🔌 Connecting to Binance WebSocket: ${this.config.baseUrl}`);

      this.ws = new WebSocket(this.config.baseUrl);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Failed to create Binance WebSocket connection');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    logger.info('✅ Binance WebSocket connected');
    
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.lastPong = Date.now();
    
    // Start ping timer
    this.startPingTimer();
    
    // Resubscribe to active streams
    this.resubscribeToStreams();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      this.messageCount++;
      const data = JSON.parse(event.data);
      
      // Handle pong messages
      if (data.result === null && !data.stream) {
        this.lastPong = Date.now();
        return;
      }
      
      // Handle stream data
      if (data.stream && data.data) {
        this.processStreamData(data.stream, data.data);
      }
      
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Error processing Binance message');
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    logger.warn(`🔌 Binance WebSocket disconnected: ${event.code} - ${event.reason}`);
    
    this.isConnected = false;
    this.stopPingTimer();
    
    if (event.code !== 1000) { // Not normal closure
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: any): void {
    logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Binance WebSocket error');
    this.scheduleReconnect();
  }

  /**
   * Process stream data and distribute to subscribers
   */
  private processStreamData(stream: string, data: any): void {
    // Cache the data
    this.dataCache.set(stream, {
      data,
      timestamp: Date.now()
    });
    
    // Extract symbol and stream type
    const { symbol, streamType } = this.parseStreamName(stream);
    
    // Process based on stream type
    let processedData;
    switch (streamType) {
      case 'ticker':
        processedData = this.processTickerData(data as BinanceTickerData);
        break;
      case 'depth':
        processedData = this.processDepthData(data as BinanceDepthData);
        break;
      case 'trade':
        processedData = this.processTradeData(data as BinanceTradeData);
        break;
      case 'kline':
        processedData = this.processKlineData(data as BinanceKlineData);
        break;
      default:
        processedData = data;
    }
    
    // Distribute to subscribers
    this.distributeToSubscribers(stream, processedData || data);
  }

  /**
   * Parse stream name to extract symbol and type
   */
  private parseStreamName(stream: string): { symbol: string | null; streamType: string } {
    const parts = stream.split('@');
    if (parts.length !== 2) return { symbol: null, streamType: 'unknown' };
    
    const symbol = parts[0].toUpperCase();
    const streamType = parts[1].split('_')[0]; // Handle intervals like kline_1m
    
    return { symbol, streamType };
  }

  /**
   * Process ticker data
   */
  private processTickerData(data: BinanceTickerData): any {
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      timestamp: data.closeTime,
      source: 'binance'
    };
  }

  /**
   * Process depth/orderbook data
   */
  private processDepthData(data: BinanceDepthData): any {
    return {
      symbol: data.symbol,
      bids: data.bids.map(([price, qty]) => [parseFloat(price), parseFloat(qty)]),
      asks: data.asks.map(([price, qty]) => [parseFloat(price), parseFloat(qty)]),
      timestamp: Date.now(),
      source: 'binance'
    };
  }

  /**
   * Process trade data
   */
  private processTradeData(data: BinanceTradeData): any {
    return {
      symbol: data.symbol,
      price: parseFloat(data.price),
      quantity: parseFloat(data.qty),
      side: data.isBuyerMaker ? 'sell' : 'buy',
      timestamp: data.time,
      source: 'binance'
    };
  }

  /**
   * Process kline/candlestick data
   */
  private processKlineData(data: BinanceKlineData): any {
    const kline = data.kline;
    return {
      symbol: kline.symbol,
      interval: kline.interval,
      openTime: kline.startTime,
      closeTime: kline.endTime,
      open: parseFloat(kline.openPrice),
      high: parseFloat(kline.highPrice),
      low: parseFloat(kline.lowPrice),
      close: parseFloat(kline.closePrice),
      volume: parseFloat(kline.volume),
      trades: kline.numberOfTrades,
      isFinal: kline.isFinal,
      timestamp: kline.endTime,
      source: 'binance'
    };
  }

  /**
   * Distribute data to relevant subscribers
   */
  private distributeToSubscribers(stream: string, data: any): void {
    this.subscriptions.forEach(subscription => {
      if (subscription.streams.includes(stream)) {
        try {
          subscription.callback(data);
        } catch (error) {
          logger.error(`Error in Binance subscription callback ${subscription.id}:`, error);
        }
      }
    });
  }

  /**
   * Subscribe to specific streams
   */
  subscribe(options: {
    symbols: string[];
    streamTypes: BinanceStreamType[];
    callback: (data: any) => void;
    klineInterval?: BinanceKlineInterval;
  }): string {
    const subscriptionId = `binance_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate stream names
    const streams: string[] = [];
    options.symbols.forEach(symbol => {
      const symbolLower = symbol.toLowerCase();
      options.streamTypes.forEach(streamType => {
        switch (streamType) {
          case 'ticker':
            streams.push(`${symbolLower}@ticker`);
            break;
          case 'depth':
            streams.push(`${symbolLower}@depth20@1000ms`);
            break;
          case 'trade':
            streams.push(`${symbolLower}@trade`);
            break;
          case 'kline':
            const interval = options.klineInterval || '1m';
            streams.push(`${symbolLower}@kline_${interval}`);
            break;
        }
      });
    });
    
    const subscription: BinanceSubscription = {
      id: subscriptionId,
      streams,
      callback: options.callback,
      symbols: options.symbols,
      streamTypes: options.streamTypes
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Subscribe to streams
    this.subscribeToStreams(streams);
    
    logger.info(`📈 Subscribed to Binance streams: ${streams.join(', ')} (ID: ${subscriptionId})`);
    
    // Send cached data if available
    this.sendCachedDataToSubscriber(subscription);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from streams
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;
    
    // Check if any other subscriptions use these streams
    const streamsToUnsubscribe = subscription.streams.filter(stream => {
      return !Array.from(this.subscriptions.values())
        .some(sub => sub.id !== subscriptionId && sub.streams.includes(stream));
    });
    
    // Unsubscribe from streams
    if (streamsToUnsubscribe.length > 0) {
      this.unsubscribeFromStreams(streamsToUnsubscribe);
    }
    
    this.subscriptions.delete(subscriptionId);
    logger.info(`📉 Unsubscribed from Binance streams: ${subscriptionId}`);
  }

  /**
   * Subscribe to WebSocket streams
   */
  private subscribeToStreams(streams: string[]): void {
    if (!this.isConnected || !this.ws) {
      // Queue for later when connected
      streams.forEach(stream => this.activeStreams.add(stream));
      return;
    }
    
    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now()
    };
    
    try {
      this.ws.send(JSON.stringify(subscribeMessage));
      streams.forEach(stream => this.activeStreams.add(stream));
      logger.debug(`📡 Subscribed to Binance streams: ${streams.join(', ')}`);
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Failed to subscribe to Binance streams');
    }
  }

  /**
   * Unsubscribe from WebSocket streams
   */
  private unsubscribeFromStreams(streams: string[]): void {
    if (!this.isConnected || !this.ws) return;
    
    const unsubscribeMessage = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Date.now()
    };
    
    try {
      this.ws.send(JSON.stringify(unsubscribeMessage));
      streams.forEach(stream => this.activeStreams.delete(stream));
      logger.debug(`📡 Unsubscribed from Binance streams: ${streams.join(', ')}`);
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Failed to unsubscribe from Binance streams');
    }
  }

  /**
   * Resubscribe to all active streams after reconnection
   */
  private resubscribeToStreams(): void {
    if (this.activeStreams.size === 0) return;
    
    const streams = Array.from(this.activeStreams);
    this.subscribeToStreams(streams);
    logger.info(`🔄 Resubscribed to ${streams.length} Binance streams`);
  }

  /**
   * Send cached data to new subscriber
   */
  private sendCachedDataToSubscriber(subscription: BinanceSubscription): void {
    subscription.streams.forEach(stream => {
      const cached = this.dataCache.get(stream);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        try {
          subscription.callback(cached.data);
        } catch (error) {
          logger.error(`Error sending cached Binance data to ${subscription.id}:`, error);
        }
      }
    });
  }

  /**
   * Start ping timer for connection health
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        try {
          this.ws.send('ping');
          
          // Check if we received pong recently
          const timeSincePong = Date.now() - this.lastPong;
          if (timeSincePong > this.config.pingInterval * 2) {
            logger.warn('⚠️ Binance WebSocket ping timeout, reconnecting');
            this.reconnect();
          }
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), '❌ Failed to send Binance ping');
          this.reconnect();
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop ping timer
   */
  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('🚨 Max Binance reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    logger.info(`⏰ Scheduling Binance reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Reconnect to WebSocket
   */
  private reconnect(): void {
    logger.info('🔄 Reconnecting to Binance WebSocket');
    
    this.cleanup();
    this.connect();
  }

  /**
   * Cleanup WebSocket connection
   */
  private cleanup(): void {
    this.isConnected = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopPingTimer();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): {
    isConnected: boolean;
    activeSubscriptions: number;
    activeStreams: number;
    messageCount: number;
    reconnectAttempts: number;
    cachedDataPoints: number;
  } {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.subscriptions.size,
      activeStreams: this.activeStreams.size,
      messageCount: this.messageCount,
      reconnectAttempts: this.reconnectAttempts,
      cachedDataPoints: this.dataCache.size
    };
  }

  /**
   * Get cached data for a stream
   */
  getCachedData(stream: string): any {
    const cached = this.dataCache.get(stream);
    return cached ? cached.data : null;
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    logger.info('🔄 Forcing Binance WebSocket reconnection');
    this.reconnectAttempts = 0;
    this.reconnect();
  }

  /**
   * Stop and cleanup
   */
  stop(): void {
    logger.info('🛑 Stopping Binance WebSocket');
    
    this.cleanup();
    this.subscriptions.clear();
    this.activeStreams.clear();
    this.dataCache.clear();
    this.messageCount = 0;
    this.reconnectAttempts = 0;
    
    logger.info('✅ Binance WebSocket stopped');
  }
}

// Export singleton instance
export const binanceWebSocket = new BinanceWebSocket();
export default binanceWebSocket;