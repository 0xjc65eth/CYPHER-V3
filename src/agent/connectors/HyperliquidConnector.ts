/**
 * CYPHER AI Trading Agent - Hyperliquid DEX Connector
 * Connects to Hyperliquid via Agent Wallet API
 * Non-custodial: uses agent wallet key (trading only, NO withdrawals)
 */

import { ethers } from 'ethers';
import * as msgpack from 'msgpack-lite';
import { Candle, Order, Position } from '../core/types';
import {
  BaseConnector,
  ConnectorCapabilities,
  OrderParams,
  OrderResult,
  OrderBookData,
  BalanceInfo,
} from './BaseConnector';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';

export interface HyperliquidConfig {
  apiUrl: string;
  agentKey: string;
  agentSecret: string;
}

export class HyperliquidConnector {
  private config: HyperliquidConfig;
  private connected: boolean = false;
  private circuitBreaker: CircuitBreaker;

  constructor(config: HyperliquidConfig) {
    this.config = {
      ...config,
      apiUrl: 'https://api.hyperliquid.xyz',
    };
    this.circuitBreaker = createAPICircuitBreaker('hyperliquid', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 10000,
    });
  }

  async connect(): Promise<boolean> {
    try {
      // Verify agent wallet permissions
      const info = await this.getAccountInfo();
      if (!info) throw new Error('Failed to get account info');

      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Hyperliquid] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  async getAccountInfo(): Promise<any> {
    return this.request('/info', {
      type: 'clearinghouseState',
      user: this.config.agentKey,
    });
  }

  async getMidPrice(pair: string): Promise<number> {
    const meta = await this.request('/info', { type: 'allMids' });
    return parseFloat(meta?.[pair] || '0');
  }

  async getOrderBook(pair: string): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    const book = await this.request('/info', {
      type: 'l2Book',
      coin: pair,
    });
    return {
      bids: book?.levels?.[0]?.map((l: any) => [parseFloat(l.px), parseFloat(l.sz)]) || [],
      asks: book?.levels?.[1]?.map((l: any) => [parseFloat(l.px), parseFloat(l.sz)]) || [],
    };
  }

  async placeOrder(params: {
    pair: string;
    side: 'buy' | 'sell';
    price: number;
    size: number;
    type: 'limit' | 'market';
    reduceOnly?: boolean;
    postOnly?: boolean;
    clientId?: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!this.connected) return { success: false, error: 'Not connected' };

    try {
      // For market orders, use IOC limit with aggressive slippage (0.5%)
      const slippageMultiplier = params.type === 'market'
        ? (params.side === 'buy' ? 1.005 : 0.995)
        : 1;
      const orderPrice = params.price * slippageMultiplier;

      const order = {
        a: this.getAssetIndex(params.pair),
        b: params.side === 'buy',
        p: orderPrice.toFixed(1),
        s: params.size.toFixed(4),
        r: params.reduceOnly || false,
        t: params.type === 'limit'
          ? { limit: { tif: params.postOnly ? 'Alo' : 'Gtc' } }
          : { limit: { tif: 'Ioc' } },
        c: params.clientId || `cypher_${Date.now()}`,
      };

      const result = await this.exchange({
        action: { type: 'order', orders: [order], grouping: 'na' },
      });

      return {
        success: result?.status === 'ok',
        orderId: result?.response?.data?.statuses?.[0]?.resting?.oid,
        error: result?.response?.data?.statuses?.[0]?.error,
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
      const result = await this.exchange({
        action: {
          type: 'cancel',
          cancels: [{ a: this.getAssetIndex(pair), o: parseInt(orderId) }],
        },
      });
      return result?.status === 'ok';
    } catch {
      return false;
    }
  }

  async cancelAllOrders(): Promise<boolean> {
    try {
      const result = await this.exchange({
        action: { type: 'cancelByClid', cancels: [] }, // Cancel all
      });
      return result?.status === 'ok';
    } catch {
      return false;
    }
  }

  async getPositions(): Promise<Position[]> {
    const state = await this.getAccountInfo();
    if (!state?.assetPositions) return [];

    return state.assetPositions
      .filter((ap: any) => parseFloat(ap.position.szi) !== 0)
      .map((ap: any): Position => {
        const pos = ap.position;
        const size = parseFloat(pos.szi);
        const entryPrice = parseFloat(pos.entryPx);
        const markPrice = parseFloat(pos.positionValue) / Math.abs(size);

        return {
          id: `hl_${pos.coin}_${Date.now()}`,
          pair: pos.coin,
          exchange: 'hyperliquid',
          direction: size > 0 ? 'long' : 'short',
          entryPrice,
          currentPrice: markPrice,
          size: Math.abs(size),
          leverage: parseFloat(pos.leverage?.value || '1'),
          marginUsed: parseFloat(pos.marginUsed || '0'),
          unrealizedPnl: parseFloat(pos.unrealizedPnl || '0'),
          realizedPnl: parseFloat(pos.returnOnEquity || '0'),
          stopLoss: 0,
          takeProfit: [],
          strategy: 'scalp',
          openedAt: Date.now(),
          lastUpdated: Date.now(),
        };
      });
  }

  /**
   * Fetch recent OHLCV candles for a pair.
   * Uses Hyperliquid's candleSnapshot endpoint.
   * @param pair e.g. "BTC-PERP" -> coin "BTC"
   * @param interval e.g. "5m", "15m", "1h"
   * @param count number of candles to return
   */
  async getCandles(pair: string, interval: string = '5m', count: number = 100): Promise<Candle[]> {
    try {
      // Hyperliquid uses the coin name without -PERP suffix
      const coin = pair.replace('-PERP', '');
      const endTime = Date.now();
      // Estimate start time based on interval and count
      const intervalMs: Record<string, number> = {
        '1m': 60_000, '5m': 300_000, '15m': 900_000,
        '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
      };
      const ms = intervalMs[interval] || 300_000;
      const startTime = endTime - ms * count;

      const data = await this.request('/info', {
        type: 'candleSnapshot',
        req: { coin, interval, startTime, endTime },
      });

      if (!Array.isArray(data)) return [];

      return data.map((c: any): Candle => ({
        timestamp: c.t,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
      }));
    } catch (error) {
      console.error(`[Hyperliquid] getCandles error for ${pair}:`, error);
      return [];
    }
  }

  /**
   * Close a specific position by placing a market order in the opposite direction.
   */
  async closePosition(pair: string, size: number, direction: 'long' | 'short'): Promise<{ success: boolean; error?: string }> {
    const side = direction === 'long' ? 'sell' : 'buy';
    const midPrice = await this.getMidPrice(pair.replace('-PERP', ''));
    if (midPrice <= 0) return { success: false, error: 'Could not fetch mid price' };

    // Use a market-like limit order with generous slippage
    const slippage = direction === 'long' ? 0.995 : 1.005;
    return this.placeOrder({
      pair,
      side,
      price: midPrice * slippage,
      size,
      type: 'limit',
      reduceOnly: true,
    });
  }

  async setLeverage(pair: string, leverage: number): Promise<boolean> {
    try {
      const result = await this.exchange({
        action: {
          type: 'updateLeverage',
          asset: this.getAssetIndex(pair),
          isCross: true,
          leverage,
        },
      });
      return result?.status === 'ok';
    } catch {
      return false;
    }
  }

  // Private helpers
  private async request(endpoint: string, body: any): Promise<any> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      });
    } catch (error) {
      console.error(`[Hyperliquid] Request error (${endpoint}):`, error);
      return null;
    }
  }

  /**
   * Sign an L1 action using EIP-712 typed data (Hyperliquid phantom agent protocol).
   * @param action The action object (order, cancel, etc.)
   * @param nonce Timestamp nonce
   * @param vaultAddress Optional vault address (null for agent wallet)
   */
  private async signL1Action(
    action: any,
    nonce: number,
    vaultAddress: string | null,
  ): Promise<{ r: string; s: string; v: number }> {
    const wallet = new ethers.Wallet(this.config.agentSecret);

    // Encode action with msgpack
    const actionBytes = msgpack.encode(action);

    // Build connectionId: keccak256(actionBytes || nonce(8 bytes BE) || vaultAddress(20 bytes or zeros))
    const nonceBytes = Buffer.alloc(8);
    nonceBytes.writeBigUInt64BE(BigInt(nonce));

    const vaultBytes = vaultAddress
      ? Buffer.from(vaultAddress.replace('0x', ''), 'hex')
      : Buffer.alloc(20);

    const connectionId = ethers.keccak256(
      Buffer.concat([actionBytes, nonceBytes, vaultBytes])
    );

    // EIP-712 domain and types for Hyperliquid mainnet (Arbitrum chain ID)
    const domain = {
      name: 'Exchange',
      version: '1',
      chainId: 42161,
    };

    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    };

    const values = {
      source: 'a', // 'a' = mainnet
      connectionId,
    };

    const signature = await wallet.signTypedData(domain, types, values);
    const { r, s, v } = ethers.Signature.from(signature);

    return { r, s, v };
  }

  private async exchange(body: any): Promise<any> {
    try {
      const nonce = Date.now();

      const signature = await this.signL1Action(body.action, nonce, null);

      const payload = {
        ...body,
        nonce,
        signature,
        vaultAddress: null,
      };

      return this.request('/exchange', payload);
    } catch (error) {
      console.error('[Hyperliquid] Exchange signing error:', error);
      return null;
    }
  }

  private getAssetIndex(pair: string): number {
    // Common Hyperliquid asset indices
    const indices: Record<string, number> = {
      'BTC-PERP': 0, 'ETH-PERP': 1, 'SOL-PERP': 5,
      'ARB-PERP': 11, 'DOGE-PERP': 4, 'AVAX-PERP': 6,
      'MATIC-PERP': 7, 'LINK-PERP': 8, 'UNI-PERP': 9,
    };
    return indices[pair] ?? 0;
  }

  getCapabilities(): ConnectorCapabilities {
    return { spot: false, perps: true, lp: false, options: false };
  }

  async getBalances(): Promise<BalanceInfo[]> {
    try {
      const state = await this.getAccountInfo();
      if (!state) return [];

      const equity = parseFloat(state.marginSummary?.accountValue || '0');
      const free = parseFloat(state.withdrawable || '0');

      return [{
        asset: 'USDC',
        free,
        locked: equity - free,
        total: equity,
        valueUSD: equity,
      }];
    } catch {
      return [];
    }
  }

  async getFundingRate(pair: string): Promise<number> {
    try {
      const meta = await this.request('/info', { type: 'metaAndAssetCtxs' });
      if (!Array.isArray(meta) || meta.length < 2) return 0;

      const assetIndex = this.getAssetIndex(pair);
      const ctx = meta[1]?.[assetIndex];
      return parseFloat(ctx?.funding || '0');
    } catch {
      return 0;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
  }
}
