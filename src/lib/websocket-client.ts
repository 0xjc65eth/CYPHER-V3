// lib/websocket-client.ts - Enhanced WebSocket Manager for Real-time Data
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastHeartbeat?: number;
  reconnectAttempts?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export interface OrderBookUpdate {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface TradeUpdate {
  symbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

type WebSocketCallback = (data: any) => void;
type UnsubscribeFunction = () => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private subscribers: Map<string, Set<WebSocketCallback>> = new Map();
  private isConnected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private url: string = '';
  private isDestroyed: boolean = false;
  private mockIntervals: ReturnType<typeof setInterval>[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.url = this.getWebSocketUrl();
    }
  }

  private getWebSocketUrl(): string {
    // For demo purposes, we'll simulate WebSocket connection
    // In production, this would be a real WebSocket server
    return 'mock://websocket';
  }

  connect(): void {
    if (typeof window === 'undefined' || this.isDestroyed) return;
    
    // For demo purposes, simulate a successful WebSocket connection
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.isDestroyed) return;
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifySubscribers('connection', { 
        status: 'connected',
        timestamp: Date.now()
      });
      
      // Start mock data simulation
      this.startMockDataBroadcast();
    }, 1000);
  }

  private handleMessage(message: WebSocketMessage): void {
    // Update last heartbeat if it's a heartbeat message
    if (message.type === 'heartbeat') {
      this.lastHeartbeat = Date.now();
      return;
    }

    // Notify specific channel subscribers
    this.notifySubscribers(message.type, message.payload);
    
    // Also notify 'all' channel subscribers
    this.notifySubscribers('all', message);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      if (this.isConnected && this.ws) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnected && !this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  subscribe(channel: string, callback: WebSocketCallback): UnsubscribeFunction {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    // Auto-connect if not connected
    if (!this.isConnected && !this.ws) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  private notifySubscribers(channel: string, data: any): void {
    if (this.isDestroyed) return;
    
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      // Usar Array.from para evitar problemas se callbacks forem modificados durante iteração
      Array.from(callbacks).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in WebSocket callback:', error);
        }
      });
    }
  }

  send(data: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data));
    } else {
    }
  }

  disconnect(): void {
    this.isDestroyed = true;
    
    this.stopHeartbeat();
    
    // Limpar timeout de reconexão
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Limpar todos os intervals de mock data
    this.mockIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.mockIntervals = [];
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.subscribers.clear();
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Convenience methods for specific data types
  subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): UnsubscribeFunction {
    return this.subscribe(`market.${symbol}`, callback);
  }

  subscribeToOrderBook(symbol: string, callback: (data: OrderBookUpdate) => void): UnsubscribeFunction {
    return this.subscribe(`orderbook.${symbol}`, callback);
  }

  subscribeToTrades(symbol: string, callback: (data: TradeUpdate) => void): UnsubscribeFunction {
    return this.subscribe(`trades.${symbol}`, callback);
  }

  subscribeToAlerts(callback: (data: any) => void): UnsubscribeFunction {
    return this.subscribe('alerts', callback);
  }

  subscribeToNotifications(callback: (data: any) => void): UnsubscribeFunction {
    return this.subscribe('notifications', callback);
  }

  // Mock data broadcasting for demo purposes
  private startMockDataBroadcast(): void {
    if (this.isDestroyed) return;
    
    // Limpar intervals anteriores
    this.mockIntervals.forEach(interval => clearInterval(interval));
    this.mockIntervals = [];
    
    // Mock market data updates every 5 seconds
    const btcInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const marketData: MarketData = {
        symbol: 'BTC',
        price: 67000 + (Math.random() - 0.5) * 2000,
        change24h: (Math.random() - 0.5) * 10,
        volume24h: 25000000000 + Math.random() * 5000000000,
        timestamp: Date.now()
      };

      this.notifySubscribers('market.BTC', marketData);
    }, 5000);
    this.mockIntervals.push(btcInterval);

    // Mock ETH data
    const ethInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const marketData: MarketData = {
        symbol: 'ETH',
        price: 3200 + (Math.random() - 0.5) * 200,
        change24h: (Math.random() - 0.5) * 8,
        volume24h: 15000000000 + Math.random() * 3000000000,
        timestamp: Date.now()
      };

      this.notifySubscribers('market.ETH', marketData);
    }, 6000);
    this.mockIntervals.push(ethInterval);

    // Mock order book updates every 2 seconds
    const orderBookInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const orderBookUpdate: OrderBookUpdate = {
        symbol: 'BTC',
        bids: Array.from({ length: 5 }, (_, i) => [
          67000 - i * 10 + Math.random() * 5,
          Math.random() * 2
        ]),
        asks: Array.from({ length: 5 }, (_, i) => [
          67000 + i * 10 + Math.random() * 5,
          Math.random() * 2
        ]),
        timestamp: Date.now()
      };

      this.notifySubscribers('orderbook.BTC', orderBookUpdate);
    }, 2000);
    this.mockIntervals.push(orderBookInterval);

    // Mock trade updates every 3 seconds
    const tradesInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const tradeUpdate: TradeUpdate = {
        symbol: 'BTC',
        price: 67000 + (Math.random() - 0.5) * 100,
        size: Math.random() * 0.5,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now()
      };

      this.notifySubscribers('trades.BTC', tradeUpdate);
    }, 3000);
    this.mockIntervals.push(tradesInterval);

    // Mock price alerts every 30 seconds
    const alertsInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const alerts = [
        {
          type: 'price_alert',
          title: 'BTC Price Alert',
          message: `Bitcoin ${Math.random() > 0.5 ? 'crossed $67,000!' : 'dropped below $66,000!'}`,
          symbol: 'BTC',
          price: 67000 + (Math.random() - 0.5) * 1000,
          timestamp: Date.now()
        },
        {
          type: 'price_alert',
          title: 'ETH Volume Alert',
          message: 'Ethereum volume spike detected (+15%)',
          symbol: 'ETH',
          volume: 18000000000,
          change: '+15%',
          timestamp: Date.now()
        }
      ];

      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
      this.notifySubscribers('alerts', randomAlert);
    }, 30000);
    this.mockIntervals.push(alertsInterval);

    // Mock notifications every 20 seconds
    const notificationsInterval = setInterval(() => {
      if (this.isDestroyed) return;
      
      const notifications = [
        {
          type: 'system',
          title: 'System Update',
          message: 'New features have been added to the platform',
          timestamp: Date.now()
        },
        {
          type: 'trade_completed',
          title: 'Trade Executed',
          message: 'Your BTC swap has been completed successfully',
          timestamp: Date.now()
        },
        {
          type: 'market_update',
          title: 'Market Movement',
          message: 'High volatility detected in the Bitcoin market',
          timestamp: Date.now()
        },
        {
          type: 'success',
          title: 'Connection Stable',
          message: 'Real-time data stream is working perfectly',
          timestamp: Date.now()
        }
      ];

      const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
      this.notifySubscribers('notifications', {
        ...randomNotification,
        id: Date.now().toString(),
      });
    }, 20000);
    this.mockIntervals.push(notificationsInterval);

  }
}

// Singleton instance com cleanup melhorado
let wsManagerInstance: WebSocketManager | null = null;

export const wsManager = (() => {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
    
    // Cleanup quando a página é fechada
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        wsManagerInstance?.disconnect();
      });
      
      // Cleanup quando a página perde o foco
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Pausar quando a página não está visível
          wsManagerInstance?.disconnect();
        } else if (document.visibilityState === 'visible' && wsManagerInstance) {
          // Reconectar quando a página volta a ficar visível
          setTimeout(() => {
            if (wsManagerInstance && !wsManagerInstance.getConnectionStatus().status.includes('connect')) {
              wsManagerInstance.connect();
            }
          }, 1000);
        }
      });
    }
  }
  return wsManagerInstance;
})();

// Função para cleanup global
export function destroyWebSocketManager() {
  if (wsManagerInstance) {
    wsManagerInstance.disconnect();
    wsManagerInstance = null;
  }
}

// React hook for WebSocket connection
export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  });
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe('connection', (status) => {
      if (isMountedRef.current) {
        setConnectionStatus(status);
      }
    });

    // Get initial status
    if (isMountedRef.current) {
      setConnectionStatus(wsManager.getConnectionStatus());
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { connectionStatus, wsManager };
}

// React hook for real-time data subscription
export function useRealTimeData<T>(channel: string): {
  data: T | null;
  isConnected: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { connectionStatus } = useWebSocket();
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    const unsubscribeData = wsManager.subscribe(channel, (newData: T) => {
      if (isMountedRef.current) {
        setData(newData);
        setError(null);
      }
    });

    const unsubscribeError = wsManager.subscribe('error', (errorData) => {
      if (isMountedRef.current) {
        setError(errorData.error || 'Unknown error');
      }
    });

    return () => {
      isMountedRef.current = false;
      try {
        unsubscribeData();
        unsubscribeError();
      } catch (error) {
      }
    };
  }, [channel]);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    isConnected: connectionStatus.status === 'connected',
    error
  };
}

// React hook for market data
export function useMarketData(symbol: string): {
  marketData: MarketData | null;
  isConnected: boolean;
} {
  const { data, isConnected } = useRealTimeData<MarketData>(`market.${symbol}`);
  
  return {
    marketData: data,
    isConnected
  };
}

// React hook for order book data
export function useOrderBook(symbol: string): {
  orderBook: OrderBookUpdate | null;
  isConnected: boolean;
} {
  const { data, isConnected } = useRealTimeData<OrderBookUpdate>(`orderbook.${symbol}`);
  
  return {
    orderBook: data,
    isConnected
  };
}

// Export default instance
export default wsManager;