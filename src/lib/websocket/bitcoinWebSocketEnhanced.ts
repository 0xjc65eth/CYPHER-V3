/**
 * 🔌 Enhanced Bitcoin WebSocket Service v3.1.0
 * Real-time price updates with enterprise features
 */

import { EventEmitter } from 'events';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: Date;
  source: 'binance' | 'coinbase' | 'kraken';
}

export interface WebSocketConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  enableCircuitBreaker?: boolean;
  maxFailures?: number;
  resetTimeout?: number;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class BitcoinWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private config: Required<WebSocketConfig>;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private lastPrice: number = 0;
  
  // Enterprise features
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;
  private messageBuffer: any[] = [];
  private maxBufferSize = 1000;
  
  // Fibonacci sequence for backoff
  private fibonacciSequence = [1000, 1000, 2000, 3000, 5000, 8000, 13000, 21000];

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      pingInterval: config.pingInterval || 30000,
      enableCircuitBreaker: config.enableCircuitBreaker || false,
      maxFailures: config.maxFailures || 5,
      resetTimeout: config.resetTimeout || 60000
    };
    
    // Setup memory cleanup
    this.setupMemoryCleanup();
  }
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.circuitState === 'OPEN') {
      this.emit('error', new Error('Circuit breaker is OPEN - connection refused'));
      return;
    }

    this.isConnecting = true;
    
    try {
      // Binance WebSocket for BTC/USDT
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionFailure(error);
    }
  }

  private handleOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.failureCount = 0;
    
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      this.emit('circuitBreakerReset');
    }
    
    this.startPing();
    this.emit('connected');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Add to buffer with size limit
      this.messageBuffer.push(data);
      if (this.messageBuffer.length > this.maxBufferSize) {
        this.messageBuffer.shift();
      }
      
      if (data.e === '24hrTicker') {
        const priceUpdate: PriceUpdate = {
          symbol: data.s,
          price: parseFloat(data.c),
          change24h: parseFloat(data.P),
          volume24h: parseFloat(data.v),
          timestamp: new Date(data.E),
          source: 'binance'
        };
        
        this.lastPrice = priceUpdate.price;
        this.emit('priceUpdate', priceUpdate);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  private handleClose(event: CloseEvent): void {
    this.isConnecting = false;
    this.stopPing();
    
    const wasClean = event.wasClean;
    this.emit('disconnected', { wasClean, code: event.code });
    
    if (!wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    console.error('❌ WebSocket error:', error);
    this.emit('error', error);
    this.handleConnectionFailure(error);
  }

  private handleConnectionFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Circuit breaker logic
    if (this.config.enableCircuitBreaker && this.failureCount >= this.config.maxFailures) {
      this.openCircuitBreaker();
    }
  }

  private scheduleReconnect(): void {
    const delay = this.fibonacciSequence[Math.min(this.reconnectAttempts, this.fibonacciSequence.length - 1)];
    
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: Date.now() }));
      }
    }, this.config.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Circuit breaker methods
  private openCircuitBreaker(): void {
    this.circuitState = 'OPEN';
    this.emit('circuitBreakerOpen');
    
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitState = 'HALF_OPEN';
      this.emit('circuitBreakerHalfOpen');
    }, this.config.resetTimeout);
  }

  // Memory cleanup
  private setupMemoryCleanup(): void {
    setInterval(() => {
      if (this.messageBuffer.length > this.maxBufferSize / 2) {
        this.messageBuffer = this.messageBuffer.slice(-this.maxBufferSize / 2);
      }
    }, 60000);
  }

  // Public methods
  disconnect(): void {
    this.stopPing();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.messageBuffer = [];
  }

  getLastPrice(): number {
    return this.lastPrice;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStats() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      failureCount: this.failureCount,
      circuitState: this.circuitState,
      bufferSize: this.messageBuffer.length,
      lastPrice: this.lastPrice
    };
  }
}

// Export singleton instance
export const bitcoinWebSocket = new BitcoinWebSocketService({
  enableCircuitBreaker: true,
  maxFailures: 5,
  resetTimeout: 60000
});