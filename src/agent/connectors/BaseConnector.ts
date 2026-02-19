/**
 * CYPHER AI Trading Agent - Base Connector
 * Abstract interface for all exchange/DEX connectors
 */

import { Candle, Order, Position, LPPosition } from '../core/types';

export interface ConnectorCapabilities {
  spot: boolean;
  perps: boolean;
  lp: boolean;
  options: boolean;
}

export interface ConnectorConfig {
  name: string;
  chain: 'evm' | 'solana' | 'hyperliquid' | 'tradfi';
  testnet: boolean;
  rpcUrl?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface OrderParams {
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  type: 'limit' | 'market' | 'stop';
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientId?: string;
  leverage?: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  txHash?: string;
  error?: string;
}

export interface LPCreateParams {
  token0: string;
  token1: string;
  amount0: number;
  amount1: number;
  feeTier: number;
  tickLower: number;
  tickUpper: number;
  slippage?: number;
}

export interface LPCollectResult {
  token0: number;
  token1: number;
  token0Symbol: string;
  token1Symbol: string;
  valueUSD: number;
}

export interface OrderBookData {
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface BalanceInfo {
  asset: string;
  free: number;
  locked: number;
  total: number;
  valueUSD: number;
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected connected: boolean = false;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): void;
  abstract getCapabilities(): ConnectorCapabilities;

  // Market data
  abstract getMidPrice(pair: string): Promise<number>;
  abstract getCandles(pair: string, interval: string, count: number): Promise<Candle[]>;
  abstract getOrderBook(pair: string): Promise<OrderBookData>;

  // Trading
  abstract placeOrder(params: OrderParams): Promise<OrderResult>;
  abstract cancelOrder(pair: string, orderId: string): Promise<boolean>;
  abstract cancelAllOrders(): Promise<boolean>;
  abstract getPositions(): Promise<Position[]>;
  abstract closePosition(pair: string, size: number, direction: 'long' | 'short'): Promise<OrderResult>;

  // Account
  abstract getBalances(): Promise<BalanceInfo[]>;

  // LP (optional - subclasses that support LP override these)
  async createLPPosition(_params: LPCreateParams): Promise<LPPosition> {
    throw new Error(`LP not supported by ${this.config.name}`);
  }

  async closeLPPosition(_positionId: string): Promise<boolean> {
    throw new Error(`LP not supported by ${this.config.name}`);
  }

  async collectLPFees(_positionId: string): Promise<LPCollectResult> {
    throw new Error(`LP not supported by ${this.config.name}`);
  }

  async getLPPositions(): Promise<LPPosition[]> {
    return [];
  }

  async increaseLiquidity(_positionId: string, _amount0: number, _amount1: number): Promise<boolean> {
    throw new Error(`LP not supported by ${this.config.name}`);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getName(): string {
    return this.config.name;
  }

  getChain(): string {
    return this.config.chain;
  }
}
