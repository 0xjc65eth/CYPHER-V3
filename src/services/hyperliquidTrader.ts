/**
 * Hyperliquid Real Trading Service
 * SDK: https://github.com/nomeida/hyperliquid
 * Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 *
 * IMPORTANTE: Requer private key do usuário para executar trades.
 * Nunca armazene a private key no servidor — receba via wallet connection.
 */

export interface TradeParams {
  coin: string;        // 'BTC-PERP', 'ETH-PERP', 'SOL-PERP'
  isBuy: boolean;
  size: number;        // em unidades do ativo
  price: number;       // limit price
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly?: boolean;
}

export interface HyperliquidConfig {
  privateKey?: string;
  testnet?: boolean;
}

// Direct REST API implementation (avoids SDK dependency issues with Next.js)
const MAINNET_API = 'https://api.hyperliquid.xyz';
const TESTNET_API = 'https://api.hyperliquid-testnet.xyz';

export class HyperliquidTrader {
  private config: HyperliquidConfig;
  private baseUrl: string;
  private isConnected = false;

  constructor(config: HyperliquidConfig = {}) {
    this.config = {
      testnet: config.testnet ?? true,
      privateKey: config.privateKey,
    };
    this.baseUrl = this.config.testnet ? TESTNET_API : MAINNET_API;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  // ===== MARKET DATA (sem private key) =====

  async getMarketPrices(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    return await res.json();
  }

  async getOrderBook(coin: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'l2Book', coin }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    return await res.json();
  }

  async getUserPositions(address: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearinghouseState', user: address }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    return await res.json();
  }

  async getRecentTrades(coin: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recentTrades', coin }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    return await res.json();
  }

  async getMeta(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'meta' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    return await res.json();
  }

  // ===== TRADING (requer private key — via signed requests) =====
  // NOTE: Real trade execution requires ethers.js signing with the user's private key
  // This is handled client-side for security. Server only provides market data.

  async placeOrder(params: TradeParams): Promise<any> {
    if (!this.config.privateKey) {
      throw new Error('Private key required for trading. Connect wallet first.');
    }

    // For real trading, use the Hyperliquid exchange API with signed requests
    // The private key signs the order locally before sending
    throw new Error('Server-side order placement not implemented. Use client-side signing via wallet.');
  }
}
