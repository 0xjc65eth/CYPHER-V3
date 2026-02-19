/**
 * CYPHER AI Trading Agent - CCXT Multi-Exchange Connector
 * Wraps CCXT library for centralized exchange connectivity
 * Used for price feeds, arbitrage, and CEX trading
 * Non-custodial: API keys have trade-only permissions (no withdrawal)
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

export interface CCXTConfig extends ConnectorConfig {
  exchangeId: string; // 'binance', 'coinbase', 'kraken', 'okx', 'bybit'
  apiKey: string;
  apiSecret: string;
  password?: string; // Some exchanges require a passphrase
  sandbox?: boolean;
}

// Exchange-specific API endpoints
const EXCHANGE_URLS: Record<string, { rest: string; testnet?: string }> = {
  binance: { rest: 'https://api.binance.com', testnet: 'https://testnet.binance.vision' },
  coinbase: { rest: 'https://api.exchange.coinbase.com' },
  kraken: { rest: 'https://api.kraken.com' },
  okx: { rest: 'https://www.okx.com', testnet: 'https://www.okx.com' },
  bybit: { rest: 'https://api.bybit.com', testnet: 'https://api-testnet.bybit.com' },
};

export class CCXTConnector extends BaseConnector {
  private exchangeId: string;
  private apiKey: string;
  private apiSecret: string;
  private password: string | null;
  private baseUrl: string;
  private ccxtExchange: any = null;

  constructor(config: CCXTConfig) {
    super({ ...config, name: config.exchangeId, chain: 'evm' });
    this.exchangeId = config.exchangeId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.password = config.password || null;

    const urls = EXCHANGE_URLS[config.exchangeId];
    this.baseUrl = config.sandbox && urls?.testnet ? urls.testnet : (urls?.rest || '');
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamic import of ccxt to avoid bundle issues
      const ccxt = await import('ccxt');
      const ExchangeClass = (ccxt as any)[this.exchangeId];

      if (!ExchangeClass) {
        throw new Error(`Exchange ${this.exchangeId} not found in CCXT`);
      }

      this.ccxtExchange = new ExchangeClass({
        apiKey: this.apiKey,
        secret: this.apiSecret,
        password: this.password || undefined,
        sandbox: this.config.testnet,
        enableRateLimit: true,
        options: {
          defaultType: 'spot',
          adjustForTimeDifference: true,
        },
      });

      // Verify connectivity
      await this.ccxtExchange.loadMarkets();
      const balance = await this.ccxtExchange.fetchBalance();

      this.connected = true;
      return true;
    } catch (error) {
      console.error(`[CCXT:${this.exchangeId}] Connection failed:`, error);
      this.connected = false;
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.ccxtExchange = null;
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      spot: true,
      perps: ['binance', 'bybit', 'okx'].includes(this.exchangeId),
      lp: false,
      options: ['binance', 'bybit', 'okx'].includes(this.exchangeId),
    };
  }

  async getMidPrice(pair: string): Promise<number> {
    try {
      if (!this.ccxtExchange) return 0;
      const symbol = this.normalizeSymbol(pair);
      const ticker = await this.ccxtExchange.fetchTicker(symbol);
      return ticker?.last || 0;
    } catch (error) {
      console.error(`[CCXT:${this.exchangeId}] getMidPrice error for ${pair}:`, error);
      return 0;
    }
  }

  async getCandles(pair: string, interval: string = '5m', count: number = 100): Promise<Candle[]> {
    try {
      if (!this.ccxtExchange) return [];
      const symbol = this.normalizeSymbol(pair);
      const timeframe = this.mapTimeframe(interval);
      const ohlcv = await this.ccxtExchange.fetchOHLCV(symbol, timeframe, undefined, count);

      return (ohlcv || []).map((c: number[]): Candle => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }));
    } catch (error) {
      console.error(`[CCXT:${this.exchangeId}] getCandles error for ${pair}:`, error);
      return [];
    }
  }

  async getOrderBook(pair: string): Promise<OrderBookData> {
    try {
      if (!this.ccxtExchange) return { bids: [], asks: [], timestamp: Date.now() };
      const symbol = this.normalizeSymbol(pair);
      const book = await this.ccxtExchange.fetchOrderBook(symbol, 20);

      return {
        bids: (book.bids || []).slice(0, 20) as [number, number][],
        asks: (book.asks || []).slice(0, 20) as [number, number][],
        timestamp: book.timestamp || Date.now(),
      };
    } catch {
      return { bids: [], asks: [], timestamp: Date.now() };
    }
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.connected || !this.ccxtExchange) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const symbol = this.normalizeSymbol(params.pair);
      const orderType = params.type === 'stop' ? 'stop_loss' : params.type;

      const order = await this.ccxtExchange.createOrder(
        symbol,
        orderType,
        params.side,
        params.size,
        params.type === 'limit' ? params.price : undefined,
        {
          clientOrderId: params.clientId || `cypher_${Date.now()}`,
          reduceOnly: params.reduceOnly,
          postOnly: params.postOnly,
        }
      );

      return {
        success: true,
        orderId: order.id,
        txHash: order.info?.transactTime?.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown order error',
      };
    }
  }

  async cancelOrder(pair: string, orderId: string): Promise<boolean> {
    try {
      if (!this.ccxtExchange) return false;
      const symbol = this.normalizeSymbol(pair);
      await this.ccxtExchange.cancelOrder(orderId, symbol);
      return true;
    } catch {
      return false;
    }
  }

  async cancelAllOrders(): Promise<boolean> {
    try {
      if (!this.ccxtExchange) return false;
      // CCXT doesn't have a universal cancelAll, cancel per symbol
      const openOrders = await this.ccxtExchange.fetchOpenOrders();
      for (const order of openOrders) {
        await this.ccxtExchange.cancelOrder(order.id, order.symbol);
      }
      return true;
    } catch {
      return false;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      if (!this.ccxtExchange || !this.ccxtExchange.has.fetchPositions) return [];
      const positions = await this.ccxtExchange.fetchPositions();

      return positions
        .filter((p: any) => p.contracts > 0)
        .map((pos: any): Position => ({
          id: `${this.exchangeId}_${pos.symbol}_${Date.now()}`,
          pair: pos.symbol,
          exchange: this.exchangeId,
          direction: pos.side === 'long' ? 'long' : 'short',
          entryPrice: pos.entryPrice || 0,
          currentPrice: pos.markPrice || 0,
          size: pos.contracts || 0,
          leverage: pos.leverage || 1,
          marginUsed: pos.initialMargin || 0,
          unrealizedPnl: pos.unrealizedPnl || 0,
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

  async closePosition(pair: string, size: number, direction: 'long' | 'short'): Promise<OrderResult> {
    return this.placeOrder({
      pair,
      side: direction === 'long' ? 'sell' : 'buy',
      price: 0,
      size,
      type: 'market',
      reduceOnly: true,
    });
  }

  async getBalances(): Promise<BalanceInfo[]> {
    try {
      if (!this.ccxtExchange) return [];
      const balance = await this.ccxtExchange.fetchBalance();

      return Object.entries(balance.total || {})
        .filter(([_, amount]) => (amount as number) > 0)
        .map(([asset, total]): BalanceInfo => ({
          asset,
          free: (balance.free?.[asset] as number) || 0,
          locked: (balance.used?.[asset] as number) || 0,
          total: total as number,
          valueUSD: 0, // Would need price lookup
        }));
    } catch {
      return [];
    }
  }

  // Get funding rate for perps
  async getFundingRate(pair: string): Promise<number> {
    try {
      if (!this.ccxtExchange || !this.ccxtExchange.has.fetchFundingRate) return 0;
      const symbol = this.normalizeSymbol(pair);
      const funding = await this.ccxtExchange.fetchFundingRate(symbol);
      return funding?.fundingRate || 0;
    } catch {
      return 0;
    }
  }

  // Private helpers
  private normalizeSymbol(pair: string): string {
    // Convert "BTC-PERP" -> "BTC/USDT:USDT" or "BTC/USDT" depending on exchange
    const cleaned = pair.replace('-PERP', '').replace('-', '/');
    if (!cleaned.includes('/')) {
      return `${cleaned}/USDT`;
    }
    return cleaned;
  }

  private mapTimeframe(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
    };
    return mapping[interval] || interval;
  }
}
