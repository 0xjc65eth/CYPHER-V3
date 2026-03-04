/**
 * CYPHER ORDI-FUTURE-V3 WebSocket Service
 * Real-time data streaming for Bitcoin, Ordinals, Runes, and Trading
 */

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  enableLogging?: boolean;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscribers = new Map<string, Function[]>();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      enableLogging: true,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isDestroyed) return;
    
    this.isConnecting = true;
    this.log('Connecting to WebSocket...', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
      
      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.log('WebSocket connected successfully');
          this.startPing();
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.log('WebSocket connection error:', error);
          reject(error);
        };
      });
    } catch (error) {
      this.isConnecting = false;
      this.log('Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('WebSocket connection opened');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startPing();
      this.notifySubscribers('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.log('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      this.log('WebSocket error:', error);
      this.notifySubscribers('error', { error });
    };

    this.ws.onclose = (event) => {
      this.log('WebSocket connection closed:', event.code, event.reason);
      this.stopPing();
      this.notifySubscribers('connection', { status: 'disconnected' });
      
      if (!this.isDestroyed && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    this.log('Received message:', message);

    // Handle different message types
    if (message.e === '24hrTicker') {
      this.notifySubscribers('price', {
        symbol: message.s,
        price: parseFloat(message.c),
        change: parseFloat(message.P),
        volume: parseFloat(message.v),
        timestamp: Date.now()
      });
    } else if (message.e === 'depthUpdate') {
      this.notifySubscribers('orderbook', {
        symbol: message.s,
        bids: message.b,
        asks: message.a,
        timestamp: Date.now()
      });
    } else if (message.e === 'trade') {
      this.notifySubscribers('trade', {
        symbol: message.s,
        price: parseFloat(message.p),
        quantity: parseFloat(message.q),
        side: message.m ? 'sell' : 'buy',
        timestamp: message.T
      });
    } else if (message.type === 'bitcoin_price') {
      this.notifySubscribers('bitcoin_price', message.data);
    } else if (message.type === 'ordinals_activity') {
      this.notifySubscribers('ordinals_activity', message.data);
    } else if (message.type === 'runes_activity') {
      this.notifySubscribers('runes_activity', message.data);
    } else if (message.type === 'arbitrage_opportunity') {
      this.notifySubscribers('arbitrage_opportunity', message.data);
    } else {
      // Generic message handling
      this.notifySubscribers('message', message);
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(event: string, callback: Function): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    this.subscribers.get(event)!.push(callback);
    this.log(`Subscribed to event: ${event}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
          this.log(`Unsubscribed from event: ${event}`);
        }
      }
    };
  }

  /**
   * Notify all subscribers of an event
   */
  private notifySubscribers(event: string, data: any): void {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.log('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.log('Sent message:', message);
    } else {
      this.log('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Subscribe to specific trading pairs
   */
  subscribeToPrices(symbols: string[]): void {
    symbols.forEach(symbol => {
      this.send({
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@ticker`],
        id: Date.now()
      });
    });
  }

  /**
   * Subscribe to orderbook updates
   */
  subscribeToOrderbook(symbol: string): void {
    this.send({
      method: 'SUBSCRIBE',
      params: [`${symbol.toLowerCase()}@depth`],
      id: Date.now()
    });
  }

  /**
   * Subscribe to trade stream
   */
  subscribeToTrades(symbol: string): void {
    this.send({
      method: 'SUBSCRIBE',
      params: [`${symbol.toLowerCase()}@trade`],
      id: Date.now()
    });
  }

  /**
   * Subscribe to Bitcoin blockchain events
   */
  subscribeToBitcoinEvents(): void {
    this.send({
      type: 'subscribe',
      channel: 'bitcoin_mempool'
    });
    
    this.send({
      type: 'subscribe', 
      channel: 'bitcoin_blocks'
    });
  }

  /**
   * Subscribe to Ordinals activity
   */
  subscribeToOrdinalsActivity(): void {
    this.send({
      type: 'subscribe',
      channel: 'ordinals_inscriptions'
    });
    
    this.send({
      type: 'subscribe',
      channel: 'ordinals_transfers'
    });
  }

  /**
   * Subscribe to Runes activity
   */
  subscribeToRunesActivity(): void {
    this.send({
      type: 'subscribe',
      channel: 'runes_etching'
    });
    
    this.send({
      type: 'subscribe',
      channel: 'runes_transfers'
    });
  }

  /**
   * Start ping/pong to keep connection alive
   */
  private startPing(): void {
    if (this.config.pingInterval && this.config.pingInterval > 0) {
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          (this.ws as any).ping?.();
        }
      }, this.config.pingInterval);
    }
  }

  /**
   * Stop ping timer
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.log('Max reconnection attempts reached');
      return;
    }

    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        this.log('Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.isDestroyed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.subscribers.clear();
    this.log('WebSocket service destroyed');
  }

  /**
   * Log messages (if logging enabled)
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
    }
  }
}

// Singleton WebSocket services for different data sources
export class WebSocketManager {
  private static instance: WebSocketManager;
  private services = new Map<string, WebSocketService>();

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Create or get WebSocket service for a specific source
   */
  getService(name: string, config: WebSocketConfig): WebSocketService {
    if (!this.services.has(name)) {
      const service = new WebSocketService(config);
      this.services.set(name, service);
    }
    return this.services.get(name)!;
  }

  /**
   * Initialize default services
   */
  async initializeServices(): Promise<void> {
    // Bitcoin blockchain WebSocket
    const bitcoinWS = this.getService('bitcoin', {
      url: process.env.NEXT_PUBLIC_BITCOIN_WS_URL || 'wss://ws.blockchain.info/inv'
    });

    // Binance WebSocket for price data
    const binanceWS = this.getService('binance', {
      url: 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
    });

    // OKX WebSocket for ordinals data
    const okxWS = this.getService('okx', {
      url: process.env.NEXT_PUBLIC_OKX_WS_URL || 'wss://ws.okx.com:8443/ws/v5/public'
    });

    try {
      await Promise.all([
        bitcoinWS.connect(),
        binanceWS.connect(),
        okxWS.connect()
      ]);
      
      // Setup default subscriptions
      bitcoinWS.subscribeToBitcoinEvents();
      binanceWS.subscribeToPrices(['BTCUSDT', 'ETHUSDT']);
      okxWS.subscribeToOrdinalsActivity();
      
    } catch (error) {
      console.error('Failed to initialize WebSocket services:', error);
    }
  }

  /**
   * Destroy all services
   */
  destroy(): void {
    this.services.forEach(service => service.disconnect());
    this.services.clear();
  }
}

// Export default instance
export const webSocketManager = WebSocketManager.getInstance();