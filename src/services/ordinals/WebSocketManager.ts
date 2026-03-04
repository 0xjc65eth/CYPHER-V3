/**
 * Real-time WebSocket Manager for Ordinals Market Data
 * Manages connections to multiple marketplace WebSocket feeds
 */

import { EventEmitter } from 'events';
import { OrdinalsMarketplace } from './integrations';
import { 
  WebSocketMessage, 
  PriceUpdate, 
  OrderBookUpdate, 
  MarketActivity,
  MarketEvent
} from '@/types/ordinals-advanced';

export interface WebSocketConfig {
  enabledMarketplaces: OrdinalsMarketplace[];
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: {
    priceUpdates: boolean;
    orderBookUpdates: boolean;
    marketActivity: boolean;
    largeTransactions: boolean;
  };
  filters: {
    minTransactionValue?: number;
    collections?: string[];
    priceChangeThreshold?: number;
  };
}

export interface ConnectionStatus {
  marketplace: OrdinalsMarketplace;
  connected: boolean;
  lastMessage: number;
  reconnectAttempts: number;
  latency: number;
  error?: string;
}

export class OrdinalsWebSocketManager extends EventEmitter {
  private connections: Map<OrdinalsMarketplace, WebSocket> = new Map();
  private config: WebSocketConfig;
  private connectionStatus: Map<OrdinalsMarketplace, ConnectionStatus> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isRunning: boolean = false;
  private messageQueue: Map<OrdinalsMarketplace, WebSocketMessage[]> = new Map();

  // WebSocket endpoints for each marketplace
  private readonly WEBSOCKET_ENDPOINTS = {
    [OrdinalsMarketplace.MAGIC_EDEN]: 'wss://api-mainnet.magiceden.dev/v2/ws',
    [OrdinalsMarketplace.OKX]: 'wss://ws.okx.com:8443/ws/v5/public',
    [OrdinalsMarketplace.UNISAT]: 'wss://api.unisat.io/ws',
    [OrdinalsMarketplace.HIRO]: 'wss://api.hiro.so/ordinals/v1/ws'
  };

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    
    this.config = {
      enabledMarketplaces: config.enabledMarketplaces || [OrdinalsMarketplace.MAGIC_EDEN],
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      subscriptions: {
        priceUpdates: true,
        orderBookUpdates: true,
        marketActivity: true,
        largeTransactions: true,
        ...config.subscriptions
      },
      filters: config.filters || {}
    };

    // Initialize connection status for each marketplace
    this.config.enabledMarketplaces.forEach(marketplace => {
      this.connectionStatus.set(marketplace, {
        marketplace,
        connected: false,
        lastMessage: 0,
        reconnectAttempts: 0,
        latency: 0
      });
      this.messageQueue.set(marketplace, []);
    });
  }

  /**
   * Start WebSocket connections to all enabled marketplaces
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Connect to each enabled marketplace
    const connectionPromises = this.config.enabledMarketplaces.map(marketplace => 
      this.connectToMarketplace(marketplace)
    );

    await Promise.allSettled(connectionPromises);

    this.emit('started', {
      enabledMarketplaces: this.config.enabledMarketplaces,
      activeConnections: Array.from(this.connections.keys())
    });

  }

  /**
   * Stop all WebSocket connections
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Close all connections
    this.connections.forEach((ws, marketplace) => {
      this.disconnectFromMarketplace(marketplace);
    });

    // Clear all intervals and timeouts
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));

    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();

    this.emit('stopped');
  }

  /**
   * Get connection status for all marketplaces
   */
  getConnectionStatus(): Record<OrdinalsMarketplace, ConnectionStatus> {
    const status: Record<OrdinalsMarketplace, ConnectionStatus> = {} as any;
    
    this.connectionStatus.forEach((connStatus, marketplace) => {
      status[marketplace] = { ...connStatus };
    });

    return status;
  }

  /**
   * Subscribe to specific collections for real-time updates
   */
  subscribeToCollections(collections: string[]): void {
    this.connections.forEach((ws, marketplace) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(marketplace, ws, 'subscribe_collections', collections);
      }
    });
  }

  /**
   * Unsubscribe from collections
   */
  unsubscribeFromCollections(collections: string[]): void {
    this.connections.forEach((ws, marketplace) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(marketplace, ws, 'unsubscribe_collections', collections);
      }
    });
  }

  /**
   * Subscribe to specific inscriptions
   */
  subscribeToInscriptions(inscriptionIds: string[]): void {
    this.connections.forEach((ws, marketplace) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(marketplace, ws, 'subscribe_inscriptions', inscriptionIds);
      }
    });
  }

  /**
   * Get recent messages from queue
   */
  getRecentMessages(marketplace?: OrdinalsMarketplace, limit: number = 100): WebSocketMessage[] {
    if (marketplace) {
      return this.messageQueue.get(marketplace)?.slice(-limit) || [];
    }

    // Return messages from all marketplaces
    const allMessages: WebSocketMessage[] = [];
    this.messageQueue.forEach(messages => {
      allMessages.push(...messages);
    });

    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Private methods
   */

  private async connectToMarketplace(marketplace: OrdinalsMarketplace): Promise<void> {
    const endpoint = (this.WEBSOCKET_ENDPOINTS as Record<string, string>)[marketplace];
    if (!endpoint) {
      return;
    }

    try {
      const ws = new WebSocket(endpoint);
      
      ws.onopen = () => this.handleConnection(marketplace, ws);
      ws.onmessage = (event) => this.handleMessage(marketplace, event);
      ws.onclose = (event) => this.handleDisconnection(marketplace, event);
      ws.onerror = (error) => this.handleError(marketplace, error);

      this.connections.set(marketplace, ws);

      // Set connection timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          this.handleConnectionTimeout(marketplace);
        }
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error(`Failed to connect to ${marketplace}:`, error);
      this.updateConnectionStatus(marketplace, { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
    }
  }

  private handleConnection(marketplace: OrdinalsMarketplace, ws: WebSocket): void {
    
    this.updateConnectionStatus(marketplace, {
      connected: true,
      reconnectAttempts: 0,
      error: undefined
    });

    // Send initial subscriptions
    this.sendInitialSubscriptions(marketplace, ws);

    // Start heartbeat
    this.startHeartbeat(marketplace, ws);

    this.emit('connected', { marketplace });
  }

  private handleMessage(marketplace: OrdinalsMarketplace, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const message = this.normalizeMessage(marketplace, data);

      if (message) {
        // Update last message timestamp
        this.updateConnectionStatus(marketplace, { lastMessage: Date.now() });

        // Add to message queue
        const queue = this.messageQueue.get(marketplace) || [];
        queue.push(message);
        
        // Keep only last 1000 messages
        if (queue.length > 1000) {
          queue.splice(0, queue.length - 1000);
        }
        
        this.messageQueue.set(marketplace, queue);

        // Process and emit message
        this.processMessage(marketplace, message);
      }
    } catch (error) {
      console.error(`Error parsing message from ${marketplace}:`, error);
    }
  }

  private handleDisconnection(marketplace: OrdinalsMarketplace, event: CloseEvent): void {
    
    this.updateConnectionStatus(marketplace, {
      connected: false,
      error: `Disconnected: ${event.reason || 'Unknown reason'}`
    });

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(marketplace);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(marketplace);
    }

    // Attempt reconnection if enabled
    if (this.config.autoReconnect && this.isRunning) {
      this.scheduleReconnection(marketplace);
    }

    this.emit('disconnected', { marketplace, event });
  }

  private handleError(marketplace: OrdinalsMarketplace, error: Event): void {
    console.error(`WebSocket error for ${marketplace}:`, error);
    
    this.updateConnectionStatus(marketplace, {
      connected: false,
      error: 'WebSocket error occurred'
    });

    this.emit('error', { marketplace, error });
  }

  private handleConnectionTimeout(marketplace: OrdinalsMarketplace): void {
    
    this.updateConnectionStatus(marketplace, {
      connected: false,
      error: 'Connection timeout'
    });

    if (this.config.autoReconnect && this.isRunning) {
      this.scheduleReconnection(marketplace);
    }
  }

  private scheduleReconnection(marketplace: OrdinalsMarketplace): void {
    const status = this.connectionStatus.get(marketplace);
    if (!status || status.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${marketplace}`);
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, status.reconnectAttempts); // Exponential backoff
    

    const timeout = setTimeout(() => {
      this.updateConnectionStatus(marketplace, {
        reconnectAttempts: status.reconnectAttempts + 1
      });
      
      this.connectToMarketplace(marketplace);
      this.reconnectTimeouts.delete(marketplace);
    }, delay);

    this.reconnectTimeouts.set(marketplace, timeout);
  }

  private disconnectFromMarketplace(marketplace: OrdinalsMarketplace): void {
    const ws = this.connections.get(marketplace);
    if (ws) {
      ws.close();
      this.connections.delete(marketplace);
    }

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(marketplace);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(marketplace);
    }

    // Clear reconnection timeout
    const timeout = this.reconnectTimeouts.get(marketplace);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(marketplace);
    }

    this.updateConnectionStatus(marketplace, { connected: false });
  }

  private updateConnectionStatus(marketplace: OrdinalsMarketplace, updates: Partial<ConnectionStatus>): void {
    const currentStatus = this.connectionStatus.get(marketplace);
    if (currentStatus) {
      this.connectionStatus.set(marketplace, { ...currentStatus, ...updates });
    }
  }

  private startHeartbeat(marketplace: OrdinalsMarketplace, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        (ws as any).ping();
        
        // Measure latency (simplified)
        setTimeout(() => {
          const latency = Date.now() - pingTime;
          this.updateConnectionStatus(marketplace, { latency });
        }, 100);
      } else {
        clearInterval(interval);
        this.heartbeatIntervals.delete(marketplace);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(marketplace, interval);
  }

  private sendInitialSubscriptions(marketplace: OrdinalsMarketplace, ws: WebSocket): void {
    // Send marketplace-specific subscription messages
    switch (marketplace) {
      case OrdinalsMarketplace.MAGIC_EDEN:
        this.sendMagicEdenSubscriptions(ws);
        break;
      case OrdinalsMarketplace.OKX:
        this.sendOKXSubscriptions(ws);
        break;
      case OrdinalsMarketplace.UNISAT:
        this.sendUniSatSubscriptions(ws);
        break;
      case OrdinalsMarketplace.HIRO:
        this.sendHiroSubscriptions(ws);
        break;
    }
  }

  private sendSubscriptionMessage(
    marketplace: OrdinalsMarketplace, 
    ws: WebSocket, 
    action: string, 
    data: any
  ): void {
    try {
      const message = this.formatSubscriptionMessage(marketplace, action, data);
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending subscription message to ${marketplace}:`, error);
    }
  }

  private formatSubscriptionMessage(marketplace: OrdinalsMarketplace, action: string, data: any): any {
    // Format message according to each marketplace's protocol
    switch (marketplace) {
      case OrdinalsMarketplace.MAGIC_EDEN:
        return { op: action, arg: data };
      case OrdinalsMarketplace.OKX:
        return { op: action, args: data };
      case OrdinalsMarketplace.UNISAT:
        return { type: action, data };
      case OrdinalsMarketplace.HIRO:
        return { action, params: data };
      default:
        return { action, data };
    }
  }

  private normalizeMessage(marketplace: OrdinalsMarketplace, data: any): WebSocketMessage | null {
    try {
      // Normalize message format from different marketplaces
      let normalizedMessage: WebSocketMessage;

      switch (marketplace) {
        case OrdinalsMarketplace.MAGIC_EDEN:
          normalizedMessage = this.normalizeMagicEdenMessage(data);
          break;
        case OrdinalsMarketplace.OKX:
          normalizedMessage = this.normalizeOKXMessage(data);
          break;
        case OrdinalsMarketplace.UNISAT:
          normalizedMessage = this.normalizeUniSatMessage(data);
          break;
        case OrdinalsMarketplace.HIRO:
          normalizedMessage = this.normalizeHiroMessage(data);
          break;
        default:
          return null;
      }

      normalizedMessage.marketplace = marketplace;
      return normalizedMessage;

    } catch (error) {
      console.error(`Error normalizing message from ${marketplace}:`, error);
      return null;
    }
  }

  private processMessage(marketplace: OrdinalsMarketplace, message: WebSocketMessage): void {
    // Apply filters
    if (!this.passesFilters(message)) {
      return;
    }

    // Emit specific event types
    switch (message.type) {
      case 'price_update':
        this.emit('price_update', message.data as PriceUpdate);
        break;
      case 'new_listing':
        this.emit('new_listing', message.data);
        break;
      case 'sale':
        this.emit('sale', message.data as MarketActivity);
        break;
      case 'orderbook_update':
        this.emit('orderbook_update', message.data as OrderBookUpdate);
        break;
      default:
        this.emit('message', message);
    }

    // Check for significant events
    this.checkForSignificantEvents(message);
  }

  private passesFilters(message: WebSocketMessage): boolean {
    const filters = this.config.filters;

    // Filter by transaction value
    if (filters.minTransactionValue && message.type === 'sale') {
      const sale = message.data as MarketActivity;
      if (!sale.price || sale.price < filters.minTransactionValue) {
        return false;
      }
    }

    // Filter by collections
    if (filters.collections && filters.collections.length > 0) {
      const collectionId = message.data.collectionId;
      if (collectionId && !filters.collections.includes(collectionId)) {
        return false;
      }
    }

    return true;
  }

  private checkForSignificantEvents(message: WebSocketMessage): void {
    // Detect whale transactions
    if (message.type === 'sale' && message.data.price > 1.0) { // > 1 BTC
      const event: MarketEvent = {
        id: `whale_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        type: 'whale_activity',
        collectionId: message.data.collectionId,
        inscriptionId: message.data.inscriptionId,
        description: `Large sale: ${message.data.price} BTC`,
        impact: message.data.price > 5 ? 'critical' : message.data.price > 2 ? 'high' : 'medium',
        data: message.data,
        timestamp: message.timestamp,
        marketplace: message.marketplace
      };

      this.emit('significant_event', event);
    }

    // Detect price spikes
    if (message.type === 'price_update') {
      const priceUpdate = message.data as PriceUpdate;
      if (priceUpdate.oldPrice && priceUpdate.newPrice) {
        const changePercentage = ((priceUpdate.newPrice - priceUpdate.oldPrice) / priceUpdate.oldPrice) * 100;
        
        if (Math.abs(changePercentage) > (this.config.filters.priceChangeThreshold || 20)) {
          const event: MarketEvent = {
            id: `spike_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
            type: 'price_spike',
            collectionId: priceUpdate.collectionId,
            inscriptionId: priceUpdate.inscriptionId,
            description: `Price ${changePercentage > 0 ? 'spike' : 'drop'}: ${changePercentage.toFixed(1)}%`,
            impact: Math.abs(changePercentage) > 50 ? 'high' : 'medium',
            data: priceUpdate,
            timestamp: message.timestamp,
            marketplace: message.marketplace
          };

          this.emit('significant_event', event);
        }
      }
    }
  }

  // Marketplace-specific message handlers
  private sendMagicEdenSubscriptions(ws: WebSocket): void {
    if (this.config.subscriptions.priceUpdates) {
      ws.send(JSON.stringify({ op: 'subscribe', arg: 'ordinals.price_updates' }));
    }
    if (this.config.subscriptions.marketActivity) {
      ws.send(JSON.stringify({ op: 'subscribe', arg: 'ordinals.sales' }));
    }
  }

  private sendOKXSubscriptions(ws: WebSocket): void {
    if (this.config.subscriptions.priceUpdates) {
      ws.send(JSON.stringify({ op: 'subscribe', args: ['nft-price-updates'] }));
    }
    if (this.config.subscriptions.marketActivity) {
      ws.send(JSON.stringify({ op: 'subscribe', args: ['nft-trades'] }));
    }
  }

  private sendUniSatSubscriptions(ws: WebSocket): void {
    if (this.config.subscriptions.priceUpdates) {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'price_updates' }));
    }
    if (this.config.subscriptions.marketActivity) {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'market_activity' }));
    }
  }

  private sendHiroSubscriptions(ws: WebSocket): void {
    if (this.config.subscriptions.priceUpdates) {
      ws.send(JSON.stringify({ action: 'subscribe', params: { channel: 'price_updates' } }));
    }
    if (this.config.subscriptions.marketActivity) {
      ws.send(JSON.stringify({ action: 'subscribe', params: { channel: 'inscriptions' } }));
    }
  }

  private normalizeMagicEdenMessage(data: any): WebSocketMessage {
    return {
      type: data.event || 'message',
      data: data.data || data,
      timestamp: Date.now()
    };
  }

  private normalizeOKXMessage(data: any): WebSocketMessage {
    return {
      type: data.channel || 'message',
      data: data.data || data,
      timestamp: Date.now()
    };
  }

  private normalizeUniSatMessage(data: any): WebSocketMessage {
    return {
      type: data.type || 'message',
      data: data.data || data,
      timestamp: Date.now()
    };
  }

  private normalizeHiroMessage(data: any): WebSocketMessage {
    return {
      type: data.type || 'message',
      data: data.payload || data,
      timestamp: Date.now()
    };
  }
}

// Singleton instance
export const ordinalsWebSocketManager = new OrdinalsWebSocketManager();