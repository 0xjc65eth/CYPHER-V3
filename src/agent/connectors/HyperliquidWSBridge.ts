/**
 * CYPHER AI Trading Agent - Hyperliquid WebSocket Bridge
 * Bridges the existing HyperLiquidWebSocket singleton with the agent system.
 * Provides cached real-time price feeds and per-pair subscriptions.
 */

import { HyperLiquidWebSocket } from '@/lib/hyperliquid/HyperLiquidWebSocket';

export class HyperliquidWSBridge {
  private ws: HyperLiquidWebSocket;
  private priceCache: Map<string, number> = new Map();
  private orderbookCache: Map<string, any> = new Map();
  private unsubscribers: Array<() => void> = [];
  private allMidsHandler: ((data: any) => void) | null = null;
  private connected: boolean = false;

  constructor() {
    this.ws = HyperLiquidWebSocket.getInstance();
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.ws.connect();
      this.connected = true;
    } catch (error) {
      console.error('[HyperliquidWSBridge] Connection failed:', error);
      throw error;
    }
  }

  disconnect(): void {
    // Remove all event handlers we registered
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.allMidsHandler) {
      this.ws.off('allMids', this.allMidsHandler);
      this.allMidsHandler = null;
    }

    this.priceCache.clear();
    this.orderbookCache.clear();
    this.connected = false;
    // Don't disconnect the WS singleton — other consumers may be using it
  }

  /**
   * Subscribe to allMids channel — receives mid prices for ALL pairs at once.
   * Returns an unsubscribe function.
   */
  async subscribeAllMids(callback: (prices: Record<string, number>) => void): Promise<() => void> {
    if (!this.ws.isConnected()) {
      await this.connect();
    }

    const handler = (data: any) => {
      if (data && typeof data === 'object' && data.mids) {
        const prices: Record<string, number> = {};
        for (const [coin, price] of Object.entries(data.mids)) {
          const numPrice = parseFloat(price as string);
          if (!isNaN(numPrice)) {
            prices[coin] = numPrice;
            this.priceCache.set(coin, numPrice);
          }
        }
        callback(prices);
      }
    };

    this.allMidsHandler = handler;
    this.ws.on('allMids', handler);

    // Subscribe to allMids channel on Hyperliquid
    await this.ws.subscribeToAllMids();

    const unsub = () => {
      this.ws.off('allMids', handler);
      this.allMidsHandler = null;
    };
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Subscribe to L2 order book updates for a specific coin.
   */
  async subscribeOrderBook(coin: string, callback: (book: any) => void): Promise<() => void> {
    if (!this.ws.isConnected()) {
      await this.connect();
    }

    const handler = (data: any) => {
      if (data?.coin === coin) {
        this.orderbookCache.set(coin, data);
        callback(data);
      }
    };

    this.ws.on('l2Book', handler);
    await this.ws.subscribeToOrderBook(coin);

    const unsub = () => {
      this.ws.off('l2Book', handler);
    };
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Subscribe to trades for a specific coin.
   */
  async subscribeTrades(coin: string, callback: (trades: any[]) => void): Promise<() => void> {
    if (!this.ws.isConnected()) {
      await this.connect();
    }

    const handler = (data: any) => {
      if (Array.isArray(data)) {
        const filtered = data.filter((t: any) => t.coin === coin);
        if (filtered.length > 0) callback(filtered);
      }
    };

    this.ws.on('trades', handler);
    await this.ws.subscribeToTrades(coin);

    const unsub = () => {
      this.ws.off('trades', handler);
    };
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Subscribe to candle updates for a specific coin and interval.
   */
  async subscribeCandles(coin: string, interval: string, callback: (candle: any) => void): Promise<() => void> {
    if (!this.ws.isConnected()) {
      await this.connect();
    }

    const handler = (data: any) => {
      if (data?.s === coin || data?.coin === coin) {
        callback(data);
      }
    };

    this.ws.on('candle', handler);
    await this.ws.subscribeToCandles(coin, interval);

    const unsub = () => {
      this.ws.off('candle', handler);
    };
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Get cached mid price (no network call).
   */
  getMidPrice(coin: string): number | null {
    return this.priceCache.get(coin) ?? null;
  }

  /**
   * Get cached order book (no network call).
   */
  getOrderBook(coin: string): any | null {
    return this.orderbookCache.get(coin) ?? null;
  }

  isConnected(): boolean {
    return this.connected && this.ws.isConnected();
  }
}
