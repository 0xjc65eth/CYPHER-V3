/**
 * Comprehensive WebSocket Manager for Real-time Data Feeds
 * Integrates multiple data sources: CoinMarketCap, Binance, Custom aggregation
 * Features: Connection management, data compression, selective subscriptions, offline fallback
 */

'use client';

import { logger } from '@/lib/logger';
import { enhancedRateLimiter } from '@/lib/api/enhanced-rate-limiter';
import { priceCache } from '@/lib/cache/enhanced-api-cache';

// Core interfaces for WebSocket communication
export interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: number;
  source: string;
}

export interface ConnectionConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  compression?: boolean;
}

export interface DataSubscription {
  id: string;
  channel: string;
  symbol?: string;
  callback: (data: any) => void;
  filters?: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
}

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: string;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
  source: string;
}

export interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
  source: string;
}

export interface ConnectionStatus {
  id: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';
  url: string;
  lastHeartbeat?: number;
  reconnectAttempts: number;
  latency?: number;
  dataCount: number;
}

export interface PerformanceMetrics {
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  compressionRatio?: number;
  bandwidthUsage: number;
  errorRate: number;
  activeSubscriptions: number;
}

// Main WebSocket Manager Class
export class ComprehensiveWebSocketManager {
  private connections = new Map<string, WebSocket>();
  private connectionConfigs = new Map<string, ConnectionConfig>();
  private connectionStatus = new Map<string, ConnectionStatus>();
  private subscriptions = new Map<string, DataSubscription>();
  private channelSubscribers = new Map<string, Set<string>>();
  private messageQueue = new Map<string, WebSocketMessage[]>();
  private reconnectTimers = new Map<string, ReturnType<typeof setInterval>>();
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private performanceMetrics: PerformanceMetrics;
  private isInitialized = false;
  private dataAggregator: DataAggregator;
  private compressionEnabled = true;
  private offlineFallback: OfflineFallback;

  constructor() {
    this.performanceMetrics = {
      totalMessages: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      bandwidthUsage: 0,
      errorRate: 0,
      activeSubscriptions: 0
    };
    
    this.dataAggregator = new DataAggregator();
    this.offlineFallback = new OfflineFallback();
    
    // Initialize performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize the WebSocket manager with multiple data sources
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logger.info('Initializing Comprehensive WebSocket Manager');
    
    // Configure data source connections
    await this.setupDataSources();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    this.isInitialized = true;
    logger.info('✅ WebSocket Manager initialized successfully');
  }

  /**
   * Setup multiple data source connections
   */
  private async setupDataSources(): Promise<void> {
    // Binance WebSocket for cryptocurrency data
    this.addConnection('binance', {
      url: 'wss://stream.binance.com:9443/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      compression: true
    });

    // Custom aggregation WebSocket (simulated for demo)
    this.addConnection('cypher-aggregator', {
      url: 'wss://api.cypher-ordi.com/ws', // Demo URL
      reconnectInterval: 3000,
      maxReconnectAttempts: 15,
      heartbeatInterval: 20000,
      compression: true
    });

    // Bitcoin-specific data source
    this.addConnection('bitcoin-data', {
      url: 'wss://ws.blockchain.info/inv',
      reconnectInterval: 4000,
      maxReconnectAttempts: 8,
      heartbeatInterval: 25000,
      compression: false
    });

    logger.info('✅ Data source connections configured');
  }

  /**
   * Add a new WebSocket connection
   */
  addConnection(id: string, config: ConnectionConfig): void {
    this.connectionConfigs.set(id, config);
    this.connectionStatus.set(id, {
      id,
      status: 'disconnected',
      url: config.url,
      reconnectAttempts: 0,
      dataCount: 0
    });
    
    logger.info(`Added connection configuration: ${id}`);
  }

  /**
   * Connect to a specific data source
   */
  async connect(connectionId: string): Promise<void> {
    const config = this.connectionConfigs.get(connectionId);
    const status = this.connectionStatus.get(connectionId);
    
    if (!config || !status) {
      throw new Error(`Connection ${connectionId} not configured`);
    }

    if (status.status === 'connected' || status.status === 'connecting') {
      logger.warn(`Connection ${connectionId} already active`);
      return;
    }

    try {
      status.status = 'connecting';
      logger.info(`🔌 Connecting to ${connectionId}: ${config.url}`);

      // For demo purposes, simulate WebSocket connections
      if (connectionId === 'cypher-aggregator') {
        await this.simulateConnection(connectionId, config);
        return;
      }

      const ws = new WebSocket(config.url, config.protocols);
      this.connections.set(connectionId, ws);

      ws.onopen = () => this.handleConnectionOpen(connectionId);
      ws.onmessage = (event) => this.handleMessage(connectionId, event);
      ws.onclose = (event) => this.handleConnectionClose(connectionId, event);
      ws.onerror = (error) => this.handleConnectionError(connectionId, error);

    } catch (error) {
      logger.error(`Failed to connect to ${connectionId}:`, error);
      status.status = 'error';
      this.scheduleReconnect(connectionId);
    }
  }

  /**
   * Simulate connection for demo purposes
   */
  private async simulateConnection(connectionId: string, config: ConnectionConfig): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const status = this.connectionStatus.get(connectionId)!;
        status.status = 'connected';
        status.reconnectAttempts = 0;
        status.lastHeartbeat = Date.now();
        
        logger.info(`✅ Simulated connection established: ${connectionId}`);
        this.startHeartbeat(connectionId);
        this.startDataSimulation(connectionId);
        resolve();
      }, 1000);
    });
  }

  /**
   * Handle successful WebSocket connection
   */
  private handleConnectionOpen(connectionId: string): void {
    const status = this.connectionStatus.get(connectionId)!;
    status.status = 'connected';
    status.reconnectAttempts = 0;
    status.lastHeartbeat = Date.now();
    
    logger.info(`✅ WebSocket connected: ${connectionId}`);
    
    // Start heartbeat
    this.startHeartbeat(connectionId);
    
    // Send any queued messages
    this.processMessageQueue(connectionId);
    
    // Subscribe to pending channels
    this.resubscribeChannels(connectionId);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: string, event: MessageEvent): void {
    try {
      const status = this.connectionStatus.get(connectionId)!;
      status.dataCount++;
      status.lastHeartbeat = Date.now();
      
      let data;
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        data = event.data;
      }

      const message: WebSocketMessage = {
        type: data.e || data.type || 'data',
        channel: data.s || data.channel || 'general',
        data: data,
        timestamp: Date.now(),
        source: connectionId
      };

      // Update performance metrics
      this.performanceMetrics.totalMessages++;
      
      // Process message through aggregator
      this.dataAggregator.processMessage(message);
      
      // Distribute to subscribers
      this.distributeMessage(message);
      
    } catch (error) {
      logger.error(`Error processing message from ${connectionId}:`, error);
      this.performanceMetrics.errorRate++;
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleConnectionClose(connectionId: string, event: CloseEvent): void {
    const status = this.connectionStatus.get(connectionId)!;
    status.status = 'disconnected';
    
    logger.warn(`🔌 WebSocket disconnected: ${connectionId}, Code: ${event.code}`);
    
    this.stopHeartbeat(connectionId);
    
    if (event.code !== 1000) { // Not a normal closure
      this.scheduleReconnect(connectionId);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleConnectionError(connectionId: string, error: any): void {
    const status = this.connectionStatus.get(connectionId)!;
    status.status = 'error';
    
    logger.error(`❌ WebSocket error on ${connectionId}:`, error);
    this.performanceMetrics.errorRate++;
    
    this.scheduleReconnect(connectionId);
  }

  /**
   * Subscribe to real-time data updates
   */
  subscribe(options: {
    channel: string;
    symbol?: string;
    callback: (data: any) => void;
    filters?: Record<string, any>;
    priority?: 'high' | 'medium' | 'low';
  }): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: DataSubscription = {
      id: subscriptionId,
      channel: options.channel,
      symbol: options.symbol,
      callback: options.callback,
      filters: options.filters,
      priority: options.priority || 'medium'
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    // Add to channel subscribers
    const channelKey = options.symbol ? `${options.channel}.${options.symbol}` : options.channel;
    if (!this.channelSubscribers.has(channelKey)) {
      this.channelSubscribers.set(channelKey, new Set());
    }
    this.channelSubscribers.get(channelKey)!.add(subscriptionId);
    
    // Update metrics
    this.performanceMetrics.activeSubscriptions++;
    
    // Subscribe to appropriate data source
    this.subscribeToDataSource(options.channel, options.symbol);
    
    logger.info(`📺 Subscribed to ${channelKey} with ID: ${subscriptionId}`);
    
    // Return unsubscribe function
    return subscriptionId;
  }

  /**
   * Unsubscribe from data updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;
    
    const channelKey = subscription.symbol ? 
      `${subscription.channel}.${subscription.symbol}` : 
      subscription.channel;
    
    // Remove from channel subscribers
    const subscribers = this.channelSubscribers.get(channelKey);
    if (subscribers) {
      subscribers.delete(subscriptionId);
      if (subscribers.size === 0) {
        this.channelSubscribers.delete(channelKey);
        // Unsubscribe from data source if no more subscribers
        this.unsubscribeFromDataSource(subscription.channel, subscription.symbol);
      }
    }
    
    this.subscriptions.delete(subscriptionId);
    this.performanceMetrics.activeSubscriptions--;
    
    logger.info(`📺 Unsubscribed: ${subscriptionId}`);
  }

  /**
   * Subscribe to specific data source channels
   */
  private subscribeToDataSource(channel: string, symbol?: string): void {
    switch (channel) {
      case 'ticker':
      case 'price':
        if (symbol) {
          this.subscribeToBinanceTicker(symbol);
        }
        break;
      case 'orderbook':
        if (symbol) {
          this.subscribeToBinanceOrderBook(symbol);
        }
        break;
      case 'trades':
        if (symbol) {
          this.subscribeToBinanceTrades(symbol);
        }
        break;
      case 'bitcoin-blocks':
        this.subscribeToBitcoinBlocks();
        break;
      default:
        logger.warn(`Unknown channel type: ${channel}`);
    }
  }

  /**
   * Subscribe to Binance ticker updates
   */
  private subscribeToBinanceTicker(symbol: string): void {
    const ws = this.connections.get('binance');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@ticker`],
        id: Date.now()
      };
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Subscribe to Binance order book updates
   */
  private subscribeToBinanceOrderBook(symbol: string): void {
    const ws = this.connections.get('binance');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth20@1000ms`],
        id: Date.now()
      };
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Subscribe to Binance trade updates
   */
  private subscribeToBinanceTrades(symbol: string): void {
    const ws = this.connections.get('binance');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@trade`],
        id: Date.now()
      };
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Subscribe to Bitcoin block updates
   */
  private subscribeToBitcoinBlocks(): void {
    const ws = this.connections.get('bitcoin-data');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = { op: 'blocks_sub' };
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Distribute message to subscribers
   */
  private distributeMessage(message: WebSocketMessage): void {
    const channelKey = message.channel;
    const subscribers = this.channelSubscribers.get(channelKey);
    
    if (!subscribers || subscribers.size === 0) return;
    
    subscribers.forEach(subscriptionId => {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) return;
      
      try {
        // Apply filters if specified
        if (subscription.filters && !this.applyFilters(message.data, subscription.filters)) {
          return;
        }
        
        // Call subscriber callback
        subscription.callback(message.data);
        
      } catch (error) {
        logger.error(`Error in subscription callback ${subscriptionId}:`, error);
      }
    });
  }

  /**
   * Apply filters to message data
   */
  private applyFilters(data: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      if (typeof value === 'function') {
        return value(data[key]);
      }
      return data[key] === value;
    });
  }

  /**
   * Start heartbeat for connection health monitoring
   */
  private startHeartbeat(connectionId: string): void {
    const config = this.connectionConfigs.get(connectionId);
    if (!config?.heartbeatInterval) return;
    
    const timer = setInterval(() => {
      const ws = this.connections.get(connectionId);
      const status = this.connectionStatus.get(connectionId);
      
      if (!ws || !status || ws.readyState !== WebSocket.OPEN) {
        this.stopHeartbeat(connectionId);
        return;
      }
      
      // Send ping
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      try {
        ws.send(JSON.stringify(pingMessage));
      } catch (error) {
        logger.error(`Failed to send heartbeat to ${connectionId}:`, error);
        this.stopHeartbeat(connectionId);
      }
    }, config.heartbeatInterval);
    
    this.heartbeatTimers.set(connectionId, timer);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(connectionId: string): void {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connectionId: string): void {
    const config = this.connectionConfigs.get(connectionId);
    const status = this.connectionStatus.get(connectionId);
    
    if (!config || !status) return;
    
    if (status.reconnectAttempts >= (config.maxReconnectAttempts || 10)) {
      logger.error(`Max reconnect attempts reached for ${connectionId}`);
      status.status = 'error';
      return;
    }
    
    status.reconnectAttempts++;
    status.status = 'reconnecting';
    
    const delay = Math.min(
      (config.reconnectInterval || 5000) * Math.pow(2, status.reconnectAttempts - 1),
      30000
    );
    
    logger.info(`⏰ Scheduling reconnect for ${connectionId} in ${delay}ms (attempt ${status.reconnectAttempts})`);
    
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(connectionId);
      this.connect(connectionId);
    }, delay);
    
    this.reconnectTimers.set(connectionId, timer);
  }

  /**
   * Start data simulation for demo connections
   */
  private startDataSimulation(connectionId: string): void {
    if (connectionId !== 'cypher-aggregator') return;
    
    // Simulate Bitcoin price updates
    setInterval(() => {
      const message: WebSocketMessage = {
        type: 'ticker',
        channel: 'BTCUSDT',
        data: {
          s: 'BTCUSDT',
          c: '0',
          P: '0',
          v: '0',
          h: '0',
          l: '0'
        },
        timestamp: Date.now(),
        source: connectionId
      };
      
      this.dataAggregator.processMessage(message);
      this.distributeMessage(message);
    }, 3000);
    
    // Simulate Ethereum price updates
    setInterval(() => {
      const message: WebSocketMessage = {
        type: 'ticker',
        channel: 'ETHUSDT',
        data: {
          s: 'ETHUSDT',
          c: '0',
          P: '0',
          v: '0',
          h: '0',
          l: '0'
        },
        timestamp: Date.now(),
        source: connectionId
      };
      
      this.dataAggregator.processMessage(message);
      this.distributeMessage(message);
    }, 4000);
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(connectionId: string): void {
    const queue = this.messageQueue.get(connectionId);
    if (!queue || queue.length === 0) return;
    
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    queue.forEach(message => {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Failed to send queued message to ${connectionId}:`, error);
      }
    });
    
    this.messageQueue.delete(connectionId);
    logger.info(`📦 Processed ${queue.length} queued messages for ${connectionId}`);
  }

  /**
   * Resubscribe to channels after reconnection
   */
  private resubscribeChannels(connectionId: string): void {
    // Re-establish subscriptions based on active subscribers
    this.channelSubscribers.forEach((subscribers, channelKey) => {
      if (subscribers.size > 0) {
        const [channel, symbol] = channelKey.split('.');
        this.subscribeToDataSource(channel, symbol);
      }
    });
  }

  /**
   * Unsubscribe from data source
   */
  private unsubscribeFromDataSource(channel: string, symbol?: string): void {
    // Implementation for unsubscribing from specific data sources
    // This would send unsubscribe messages to the appropriate WebSocket connection
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    let lastCheck = Date.now();
    let lastMessageCount = 0;
    
    setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastCheck) / 1000;
      const messageDiff = this.performanceMetrics.totalMessages - lastMessageCount;
      
      this.performanceMetrics.messagesPerSecond = messageDiff / timeDiff;
      
      lastCheck = now;
      lastMessageCount = this.performanceMetrics.totalMessages;
    }, 5000);
  }

  /**
   * Start health monitoring for all connections
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.connectionStatus.forEach((status, connectionId) => {
        if (status.status === 'connected' && status.lastHeartbeat) {
          const timeSinceHeartbeat = Date.now() - status.lastHeartbeat;
          if (timeSinceHeartbeat > 60000) { // 1 minute timeout
            logger.warn(`⚠️ No heartbeat from ${connectionId} for ${timeSinceHeartbeat}ms`);
            status.status = 'error';
            this.scheduleReconnect(connectionId);
          }
        }
      });
    }, 30000);
  }

  /**
   * Connect to all configured data sources
   */
  async connectAll(): Promise<void> {
    const connectionPromises = Array.from(this.connectionConfigs.keys()).map(id => 
      this.connect(id).catch(error => 
        logger.error(`Failed to connect to ${id}:`, error)
      )
    );
    
    await Promise.allSettled(connectionPromises);
    logger.info('🚀 All WebSocket connections initiated');
  }

  /**
   * Disconnect from specific connection
   */
  disconnect(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    const status = this.connectionStatus.get(connectionId);
    
    if (ws) {
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(connectionId);
    }
    
    if (status) {
      status.status = 'disconnected';
    }
    
    this.stopHeartbeat(connectionId);
    
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
    
    logger.info(`🔌 Disconnected from ${connectionId}`);
  }

  /**
   * Disconnect from all connections
   */
  disconnectAll(): void {
    this.connectionConfigs.forEach((_, connectionId) => {
      this.disconnect(connectionId);
    });
    
    logger.info('🔌 All WebSocket connections disconnected');
  }

  /**
   * Get connection status for all connections
   */
  getConnectionStatus(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatus);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Enable/disable compression
   */
  setCompressionEnabled(enabled: boolean): void {
    this.compressionEnabled = enabled;
    logger.info(`Compression ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get aggregated market data
   */
  getAggregatedData(): any {
    return this.dataAggregator.getAggregatedData();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnectAll();
    this.subscriptions.clear();
    this.channelSubscribers.clear();
    this.messageQueue.clear();
    
    // Clear all timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    
    this.reconnectTimers.clear();
    this.heartbeatTimers.clear();
    
    logger.info('🧹 WebSocket Manager destroyed');
  }
}

/**
 * Data Aggregation Engine
 */
class DataAggregator {
  private aggregatedData = new Map<string, any>();
  private dataHistory = new Map<string, any[]>();
  private maxHistoryLength = 100;

  processMessage(message: WebSocketMessage): void {
    const key = `${message.source}-${message.channel}`;
    
    // Store aggregated data
    this.aggregatedData.set(key, {
      ...message.data,
      lastUpdate: message.timestamp,
      source: message.source
    });
    
    // Store in history
    if (!this.dataHistory.has(key)) {
      this.dataHistory.set(key, []);
    }
    
    const history = this.dataHistory.get(key)!;
    history.push({
      data: message.data,
      timestamp: message.timestamp
    });
    
    // Limit history size
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  getAggregatedData(): Map<string, any> {
    return new Map(this.aggregatedData);
  }

  getDataHistory(key: string): any[] {
    return this.dataHistory.get(key) || [];
  }
}

/**
 * Offline Fallback System
 */
class OfflineFallback {
  private fallbackData = new Map<string, any>();
  private lastFallbackUpdate = 0;
  private fallbackInterval = 60000; // 1 minute

  async updateFallbackData(): Promise<void> {
    if (Date.now() - this.lastFallbackUpdate < this.fallbackInterval) {
      return;
    }

    try {
      // Use cached data from enhanced API cache as fallback
      const cachedBtcPrice = priceCache.get('btc-price-fallback');
      if (cachedBtcPrice) {
        this.fallbackData.set('BTCUSDT', cachedBtcPrice);
      }
      
      this.lastFallbackUpdate = Date.now();
      logger.info('📱 Fallback data updated');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to update fallback data:');
    }
  }

  getFallbackData(symbol: string): any {
    return this.fallbackData.get(symbol);
  }
}

// Export singleton instance
export const comprehensiveWebSocketManager = new ComprehensiveWebSocketManager();
export default comprehensiveWebSocketManager;