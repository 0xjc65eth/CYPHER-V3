import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { logger } from '../utils/logger';

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  price?: number;
  quantity?: number;
  timestamp: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  lastUpdate: number;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export abstract class ExchangeConnector extends EventEmitter {
  protected name: string;
  protected _isConnected: boolean = false;
  protected webSocket: WebSocket | null = null;
  protected subscriptions: Set<string> = new Set();
  protected reconnectAttempts: number = 0;
  protected maxReconnectAttempts: number = 5;
  protected reconnectDelay: number = 1000;
  protected latencyMeasurements: number[] = [];
  protected lastPing: number = 0;
  protected credentials: any = null;

  constructor(name: string) {
    super();
    this.name = name;
    this.setupEventHandlers();
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract subscribeToPriceUpdates(symbol: string): Promise<void>;
  abstract unsubscribeFromPriceUpdates(symbol: string): Promise<void>;
  abstract placeBuyOrder(symbol: string, quantity: number, price?: number): Promise<OrderResult>;
  abstract placeSellOrder(symbol: string, quantity: number, price?: number): Promise<OrderResult>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract getOrderBook(symbol: string): Promise<OrderBookData>;
  abstract getTicker(symbol: string): Promise<TickerData>;
  abstract getBalance(asset: string): Promise<number>;
  abstract getTradingFee(symbol: string): Promise<number>;

  protected setupEventHandlers(): void {
    this.on('connected', () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;
      logger.info(`${this.name} exchange connected`);
    });

    this.on('disconnected', () => {
      this._isConnected = false;
      logger.info(`${this.name} exchange disconnected`);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    this.on('error', (error) => {
      logger.error(`${this.name} exchange error:`, error);
    });
  }

  protected scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`${this.name}: Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error(`${this.name}: Reconnect attempt ${this.reconnectAttempts} failed:`, error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          logger.error(`${this.name}: Max reconnect attempts reached`);
          this.emit('maxReconnectAttemptsReached');
        }
      }
    }, delay);
  }

  protected createWebSocket(url: string, protocols?: string[]): WebSocket {
    const ws = new WebSocket(url, protocols);
    
    ws.on('open', () => {
      this.emit('connected');
      this.startPingInterval();
    });

    ws.on('close', (code, reason) => {
      this.stopPingInterval();
      this.emit('disconnected', { code, reason: reason.toString() });
    });

    ws.on('error', (error) => {
      this.emit('error', error);
    });

    ws.on('message', (data) => {
      try {
        this.handleWebSocketMessage(data);
      } catch (error) {
        logger.error(`${this.name}: Error handling WebSocket message:`, error);
      }
    });

    ws.on('pong', () => {
      if (this.lastPing > 0) {
        const latency = Date.now() - this.lastPing;
        this.recordLatency(latency);
      }
    });

    return ws;
  }

  protected abstract handleWebSocketMessage(data: any): void;

  protected startPingInterval(): void {
    setInterval(() => {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.lastPing = Date.now();
        this.webSocket.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  protected stopPingInterval(): void {
    // Clear ping interval if needed
  }

  protected recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 100 measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
  }

  protected formatSymbol(symbol: string): string {
    // Default implementation - override in specific exchange implementations
    return symbol.replace('/', '').toUpperCase();
  }

  protected parseSymbol(exchangeSymbol: string): string {
    // Default implementation - override in specific exchange implementations
    return exchangeSymbol;
  }

  protected validateCredentials(): boolean {
    return this.credentials && 
           this.credentials.apiKey && 
           this.credentials.apiSecret;
  }

  protected async makeAuthenticatedRequest(
    method: string,
    endpoint: string,
    params: any = {},
    body?: any
  ): Promise<any> {
    // This method should be implemented by each exchange connector
    // to handle authenticated API requests with proper signatures
    throw new Error('makeAuthenticatedRequest must be implemented by subclass');
  }

  protected async makePublicRequest(
    method: string,
    endpoint: string,
    params: any = {}
  ): Promise<any> {
    // This method should be implemented by each exchange connector
    // to handle public API requests
    throw new Error('makePublicRequest must be implemented by subclass');
  }

  // Utility methods
  protected generateId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected roundToStepSize(quantity: number, stepSize: number): number {
    return Math.floor(quantity / stepSize) * stepSize;
  }

  protected roundToTickSize(price: number, tickSize: number): number {
    return Math.round(price / tickSize) * tickSize;
  }

  // Public methods
  getName(): string {
    return this.name;
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    
    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    return sum / this.latencyMeasurements.length;
  }

  getLatencyStats(): any {
    if (this.latencyMeasurements.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const sorted = [...this.latencyMeasurements].sort((a, b) => a - b);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: this.getAverageLatency(),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: sorted.length
    };
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  setCredentials(credentials: any): void {
    this.credentials = credentials;
  }

  getStatus(): any {
    return {
      name: this.name,
      connected: this._isConnected,
      subscriptions: this.getSubscriptions(),
      latency: this.getLatencyStats(),
      reconnectAttempts: this.reconnectAttempts,
      hasCredentials: this.validateCredentials()
    };
  }

  // Abstract methods that must be implemented by each exchange
  abstract getExchangeInfo(): Promise<any>;
  abstract getSymbols(): Promise<string[]>;
  abstract getMinTradeSize(symbol: string): Promise<number>;
  abstract getMaxTradeSize(symbol: string): Promise<number>;
  abstract getStepSize(symbol: string): Promise<number>;
  abstract getTickSize(symbol: string): Promise<number>;
}

export default ExchangeConnector;