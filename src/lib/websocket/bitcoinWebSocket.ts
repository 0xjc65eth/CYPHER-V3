/**
 * 🔌 Bitcoin WebSocket Service
 * Real-time price updates via WebSocket
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
}

export class BitcoinWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private config: Required<WebSocketConfig>;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private lastPrice: number = 0;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      pingInterval: config.pingInterval || 30000
    };
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // Only connect in browser environment
    if (typeof window === 'undefined') {
      // WebSocket connection skipped - server environment
      return;
    }

    this.isConnecting = true;
    
    try {
      // Binance WebSocket for BTC/USDT
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlePriceUpdate(data);
        } catch (error) {
          console.error('WebSocket parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPing();
        this.emit('disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      this.isConnecting = false;
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private handlePriceUpdate(data: any): void {
    const priceUpdate: PriceUpdate = {
      symbol: 'BTC/USDT',
      price: parseFloat(data.c || data.lastPrice || 0),
      change24h: parseFloat(data.P || data.priceChangePercent || 0),
      volume24h: parseFloat(data.v || data.volume || 0),
      timestamp: new Date(),
      source: 'binance'
    };

    this.lastPrice = priceUpdate.price;
    this.emit('priceUpdate', priceUpdate);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.emit('reconnecting', this.reconnectAttempts);
      this.connect();
    }, this.config.reconnectInterval);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getLastPrice(): number {
    return this.lastPrice;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let instance: BitcoinWebSocketService | null = null;

export function getBitcoinWebSocket(): BitcoinWebSocketService {
  if (!instance) {
    instance = new BitcoinWebSocketService();
  }
  return instance;
}