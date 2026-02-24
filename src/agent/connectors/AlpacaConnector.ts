/**
 * CYPHER AI Trading Agent - Alpaca Markets Connector
 * Handles Stocks, Forex, and Crypto via Alpaca API
 * Non-custodial: uses API key with trade-only permissions (no withdrawal)
 */

import { Candle, Position } from '../core/types';
import {
  BaseConnector,
  ConnectorCapabilities,
  ConnectorConfig,
  OrderParams,
  OrderResult,
  OrderBookData,
  BalanceInfo,
} from './BaseConnector';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';

export interface AlpacaConfig extends ConnectorConfig {
  apiKey: string;
  apiSecret: string;
  paper: boolean;
}

export class AlpacaConnector extends BaseConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private dataUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor(config: AlpacaConfig) {
    super({ ...config, name: config.name || 'Alpaca', chain: 'tradfi' });
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.paper
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
    this.dataUrl = 'https://data.alpaca.markets';
    this.circuitBreaker = createAPICircuitBreaker('alpaca', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 10000,
    });
  }

  async connect(): Promise<boolean> {
    try {
      const account = await this.request('GET', '/v2/account');
      if (!account || account.status !== 'ACTIVE') {
        throw new Error(`Account status: ${account?.status || 'unknown'}`);
      }

      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Alpaca] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  getCapabilities(): ConnectorCapabilities {
    return { spot: true, perps: false, lp: false, options: false };
  }

  async getMidPrice(pair: string): Promise<number> {
    try {
      const symbol = this.normalizeSymbol(pair);
      const assetClass = this.getAssetClass(symbol);

      let endpoint: string;
      if (assetClass === 'forex') {
        endpoint = `/v1beta1/forex/latest/rates?currency_pairs=${symbol}`;
        const data = await this.dataRequest('GET', endpoint);
        return data?.rates?.[symbol]?.bp || 0;
      }

      // Stocks and crypto
      endpoint = assetClass === 'crypto'
        ? `/v1beta3/crypto/us/latest/trades?symbols=${symbol}`
        : `/v2/stocks/${symbol}/trades/latest`;

      const data = await this.dataRequest('GET', endpoint);

      if (assetClass === 'crypto') {
        return data?.trades?.[symbol]?.p || 0;
      }
      return data?.trade?.p || 0;
    } catch (error) {
      console.error(`[Alpaca] getMidPrice error for ${pair}:`, error);
      return 0;
    }
  }

  async getCandles(pair: string, interval: string = '5Min', count: number = 100): Promise<Candle[]> {
    try {
      const symbol = this.normalizeSymbol(pair);
      const assetClass = this.getAssetClass(symbol);
      const timeframe = this.mapInterval(interval);

      const end = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.intervalToDays(interval, count));
      const start = startDate.toISOString();

      let endpoint: string;
      if (assetClass === 'crypto') {
        endpoint = `/v1beta3/crypto/us/bars?symbols=${symbol}&timeframe=${timeframe}&start=${start}&end=${end}&limit=${count}`;
      } else {
        endpoint = `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&start=${start}&end=${end}&limit=${count}`;
      }

      const data = await this.dataRequest('GET', endpoint);
      const bars = assetClass === 'crypto' ? (data?.bars?.[symbol] || []) : (data?.bars || []);

      return bars.map((bar: any): Candle => ({
        timestamp: new Date(bar.t).getTime(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }));
    } catch (error) {
      console.error(`[Alpaca] getCandles error for ${pair}:`, error);
      return [];
    }
  }

  async getOrderBook(pair: string): Promise<OrderBookData> {
    try {
      const symbol = this.normalizeSymbol(pair);
      const quote = await this.dataRequest('GET', `/v2/stocks/${symbol}/quotes/latest`);

      if (quote?.quote) {
        return {
          bids: [[quote.quote.bp, quote.quote.bs]],
          asks: [[quote.quote.ap, quote.quote.as]],
          timestamp: new Date(quote.quote.t).getTime(),
        };
      }

      const midPrice = await this.getMidPrice(pair);
      return {
        bids: [[midPrice * 0.999, 100]],
        asks: [[midPrice * 1.001, 100]],
        timestamp: Date.now(),
      };
    } catch {
      return { bids: [], asks: [], timestamp: Date.now() };
    }
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.connected) return { success: false, error: 'Not connected' };

    try {
      const symbol = this.normalizeSymbol(params.pair);

      const orderBody: Record<string, any> = {
        symbol,
        qty: params.size.toString(),
        side: params.side,
        type: params.type === 'market' ? 'market' : 'limit',
        time_in_force: params.type === 'market' ? 'day' : 'gtc',
      };

      if (params.type === 'limit') {
        orderBody.limit_price = params.price.toFixed(2);
      }

      if (params.clientId) {
        orderBody.client_order_id = params.clientId;
      }

      const result = await this.request('POST', '/v2/orders', orderBody);

      if (!result || result.code) {
        return { success: false, error: result?.message || 'Order failed' };
      }

      return {
        success: true,
        orderId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown order error',
      };
    }
  }

  async cancelOrder(_pair: string, orderId: string): Promise<boolean> {
    try {
      await this.request('DELETE', `/v2/orders/${orderId}`);
      return true;
    } catch {
      return false;
    }
  }

  async cancelAllOrders(): Promise<boolean> {
    try {
      await this.request('DELETE', '/v2/orders');
      return true;
    } catch {
      return false;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const positions = await this.request('GET', '/v2/positions');
      if (!Array.isArray(positions)) return [];

      return positions.map((pos: any): Position => ({
        id: `alpaca_${pos.asset_id}`,
        pair: pos.symbol,
        exchange: 'alpaca',
        direction: pos.side === 'long' ? 'long' : 'short',
        entryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        size: Math.abs(parseFloat(pos.qty)),
        leverage: 1,
        marginUsed: parseFloat(pos.cost_basis),
        unrealizedPnl: parseFloat(pos.unrealized_pl),
        realizedPnl: 0,
        stopLoss: 0,
        takeProfit: [],
        strategy: 'scalp',
        openedAt: Date.now(),
        lastUpdated: Date.now(),
      }));
    } catch {
      return [];
    }
  }

  async closePosition(pair: string, _size: number, _direction: 'long' | 'short'): Promise<OrderResult> {
    try {
      const symbol = this.normalizeSymbol(pair);
      const result = await this.request('DELETE', `/v2/positions/${symbol}`);

      return {
        success: true,
        orderId: result?.id || `close_${symbol}_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Close failed',
      };
    }
  }

  async getBalances(): Promise<BalanceInfo[]> {
    try {
      const account = await this.request('GET', '/v2/account');
      if (!account) return [];

      return [
        {
          asset: 'USD',
          free: parseFloat(account.buying_power),
          locked: parseFloat(account.equity) - parseFloat(account.buying_power),
          total: parseFloat(account.equity),
          valueUSD: parseFloat(account.equity),
        },
      ];
    } catch {
      return [];
    }
  }

  // Alpaca-specific: check market hours
  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.request('GET', '/v2/clock');
      return clock?.is_open || false;
    } catch {
      return false;
    }
  }

  // Private helpers
  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          signal: controller.signal,
          headers: {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.apiSecret,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `HTTP ${response.status}`);
        }

        if (response.status === 204) return null;
        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        console.error(`[Alpaca] Request error (${method} ${endpoint}):`, error);
        throw error;
      }
    });
  }

  private async dataRequest(method: string, endpoint: string): Promise<any> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${this.dataUrl}${endpoint}`, {
        method,
        signal: controller.signal,
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.apiSecret,
        },
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`[Alpaca] Data request error (${endpoint}):`, error);
      return null;
    }
  }

  private normalizeSymbol(pair: string): string {
    // Convert "AAPL", "EUR/USD", "BTC/USD" to Alpaca format
    return pair.replace('-', '/').replace('-PERP', '');
  }

  private getAssetClass(symbol: string): 'stock' | 'forex' | 'crypto' {
    if (symbol.includes('/') && ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'].some(c => symbol.includes(c)) && symbol.length <= 7) {
      return 'forex';
    }
    if (['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'UNI', 'AAVE', 'MATIC'].some(c => symbol.startsWith(c + '/'))) {
      return 'crypto';
    }
    return 'stock';
  }

  private mapInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1Min', '5m': '5Min', '15m': '15Min', '30m': '30Min',
      '1h': '1Hour', '4h': '4Hour', '1d': '1Day', '1w': '1Week',
    };
    return mapping[interval] || interval;
  }

  private intervalToDays(interval: string, count: number): number {
    const msPerInterval: Record<string, number> = {
      '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
      '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000,
    };
    const ms = msPerInterval[interval] || 300_000;
    return Math.ceil((ms * count) / 86_400_000) + 1;
  }
}
