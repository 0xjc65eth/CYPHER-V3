/**
 * Binance API Service
 * WebSocket para dados em tempo real + REST API
 */

import { apiClient } from './client';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

// Tipos para Binance
export interface BinanceKlineData {
  symbol: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  trades: number;
  interval: string;
}

export interface BinanceTickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  count: number;
}

export interface BinanceDepthData {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BinanceTradeData {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
}

export interface BinanceOrderBook {
  symbol: string;
  bids: Array<{ price: number; quantity: number }>;
  asks: Array<{ price: number; quantity: number }>;
  timestamp: number;
}

// Event handlers para WebSocket
type WebSocketEventHandler = (data: any) => void;

interface WebSocketSubscription {
  symbol: string;
  stream: string;
  handler: WebSocketEventHandler;
}

class BinanceService {
  private baseUrl: string;
  private wsBaseUrl: string;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;

  constructor() {
    this.baseUrl = 'https://api.binance.com/api/v3';
    this.wsBaseUrl = 'wss://stream.binance.com:9443/ws';
  }

  /**
   * Fazer requisição REST à API
   */
  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      return await apiClient.fetch(url.toString());
    } catch (error) {
      devLogger.error('BINANCE_REST', `API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Conectar WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      // Construir URL com streams existentes
      const streams = Array.from(this.subscriptions.values())
        .map(sub => sub.stream)
        .join('/');
      
      const wsUrl = streams 
        ? `${this.wsBaseUrl}/${streams}`
        : `${this.wsBaseUrl}/btcusdt@ticker`;

      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        devLogger.log('BINANCE_WS', 'WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          devLogger.error('BINANCE_WS', 'Failed to parse message', error);
        }
      };

      this.ws.onclose = () => {
        devLogger.log('BINANCE_WS', 'WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        devLogger.error('BINANCE_WS', 'WebSocket error', error);
        this.isConnecting = false;
      };

    } catch (error) {
      devLogger.error('BINANCE_WS', 'Failed to connect', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  /**
   * Processar mensagens do WebSocket
   */
  private handleWebSocketMessage(data: any): void {
    if (data.stream) {
      const subscription = this.subscriptions.get(data.stream);
      if (subscription && subscription.handler) {
        subscription.handler(data.data);
      }
    }
  }

  /**
   * Tentar reconectar
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      devLogger.log('BINANCE_WS', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      devLogger.error('BINANCE_WS', 'Max reconnection attempts reached');
    }
  }

  /**
   * Subscrever ticker em tempo real
   */
  async subscribeTicker(symbol: string, handler: WebSocketEventHandler): Promise<void> {
    const stream = `${symbol.toLowerCase()}@ticker`;
    
    this.subscriptions.set(stream, {
      symbol,
      stream,
      handler
    });

    await this.connectWebSocket();
    devLogger.log('BINANCE_WS', `Subscribed to ticker: ${symbol}`);
  }

  /**
   * Subscrever klines (candlesticks) em tempo real
   */
  async subscribeKlines(
    symbol: string, 
    interval: string, 
    handler: WebSocketEventHandler
  ): Promise<void> {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    
    this.subscriptions.set(stream, {
      symbol,
      stream,
      handler
    });

    await this.connectWebSocket();
    devLogger.log('BINANCE_WS', `Subscribed to klines: ${symbol} ${interval}`);
  }

  /**
   * Subscrever depth (order book) em tempo real
   */
  async subscribeDepth(symbol: string, handler: WebSocketEventHandler): Promise<void> {
    const stream = `${symbol.toLowerCase()}@depth`;
    
    this.subscriptions.set(stream, {
      symbol,
      stream,
      handler
    });

    await this.connectWebSocket();
    devLogger.log('BINANCE_WS', `Subscribed to depth: ${symbol}`);
  }

  /**
   * Subscrever trades em tempo real
   */
  async subscribeTrades(symbol: string, handler: WebSocketEventHandler): Promise<void> {
    const stream = `${symbol.toLowerCase()}@trade`;
    
    this.subscriptions.set(stream, {
      symbol,
      stream,
      handler
    });

    await this.connectWebSocket();
    devLogger.log('BINANCE_WS', `Subscribed to trades: ${symbol}`);
  }

  /**
   * Cancelar subscrição
   */
  unsubscribe(symbol: string, type: 'ticker' | 'kline' | 'depth' | 'trade'): void {
    const stream = `${symbol.toLowerCase()}@${type}`;
    this.subscriptions.delete(stream);
    devLogger.log('BINANCE_WS', `Unsubscribed from: ${stream}`);
  }

  /**
   * Desconectar WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    devLogger.log('BINANCE_WS', 'Disconnected');
  }

  /**
   * Obter dados de ticker via REST
   */
  async getTicker(symbol: string): Promise<BinanceTickerData> {
    return cacheService.getOrCompute(
      cacheKeys.binance(`ticker-${symbol}`),
      async () => {
        devLogger.log('BINANCE_REST', `Fetching ticker: ${symbol}`);
        return await this.request<BinanceTickerData>('/ticker/24hr', { symbol });
      },
      (cacheTTL as any).ticker
    );
  }

  /**
   * Obter dados de klines via REST
   */
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 100
  ): Promise<BinanceKlineData[]> {
    return cacheService.getOrCompute(
      cacheKeys.binance(`klines-${symbol}-${interval}-${limit}`),
      async () => {
        devLogger.log('BINANCE_REST', `Fetching klines: ${symbol} ${interval}`);
        const rawData = await this.request<any[]>('/klines', {
          symbol,
          interval,
          limit
        });

        return rawData.map(([
          openTime, open, high, low, close, volume, closeTime,
          quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume
        ]) => ({
          symbol,
          openTime,
          closeTime,
          open,
          high,
          low,
          close,
          volume,
          trades,
          interval
        }));
      },
      (cacheTTL as any).klines
    );
  }

  /**
   * Obter order book via REST
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<BinanceOrderBook> {
    return cacheService.getOrCompute(
      cacheKeys.binance(`depth-${symbol}-${limit}`),
      async () => {
        devLogger.log('BINANCE_REST', `Fetching order book: ${symbol}`);
        const data = await this.request<BinanceDepthData>('/depth', { symbol, limit });

        return {
          symbol,
          bids: data.bids.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          asks: data.asks.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          timestamp: Date.now()
        };
      },
      (cacheTTL as any).depth
    );
  }

  /**
   * Obter trades recentes via REST
   */
  async getRecentTrades(symbol: string, limit: number = 100): Promise<BinanceTradeData[]> {
    return cacheService.getOrCompute(
      cacheKeys.binance(`trades-${symbol}-${limit}`),
      async () => {
        devLogger.log('BINANCE_REST', `Fetching recent trades: ${symbol}`);
        return await this.request<BinanceTradeData[]>('/trades', { symbol, limit });
      },
      (cacheTTL as any).trades
    );
  }

  /**
   * Obter informações de símbolos
   */
  async getExchangeInfo(): Promise<any> {
    return cacheService.getOrCompute(
      cacheKeys.binance('exchange-info'),
      async () => {
        devLogger.log('BINANCE_REST', 'Fetching exchange info');
        return await this.request<any>('/exchangeInfo');
      },
      (cacheTTL as any).exchangeInfo
    );
  }

  /**
   * Obter estatísticas de preço em 24h
   */
  async get24hrStats(symbol?: string): Promise<BinanceTickerData | BinanceTickerData[]> {
    const cacheKey = symbol ? `24hr-${symbol}` : '24hr-all';
    
    return cacheService.getOrCompute(
      cacheKeys.binance(cacheKey),
      async () => {
        devLogger.log('BINANCE_REST', `Fetching 24hr stats: ${symbol || 'all'}`);
        const params = symbol ? { symbol } : {};
        return await this.request<BinanceTickerData | BinanceTickerData[]>('/ticker/24hr', params);
      },
      (cacheTTL as any).stats24hr
    );
  }

  /**
   * Verificar status da conexão WebSocket
   */
  getConnectionStatus(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  /**
   * Obter subscrições ativas
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Cache keys específicos para Binance
cacheKeys.binance = (key: string) => `binance:${key}`;

// Cache TTLs específicos
Object.assign(cacheTTL, {
  ticker: 5,           // 5 segundos
  klines: 60,          // 1 minuto
  depth: 5,            // 5 segundos
  trades: 30,          // 30 segundos
  exchangeInfo: 3600,  // 1 hora
  stats24hr: 60,       // 1 minuto
});

// Exportar instância singleton
export const binanceService = new BinanceService();

// Cleanup no unload da página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    binanceService.disconnect();
  });
}
