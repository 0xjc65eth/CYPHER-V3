/**
 * CYPHER AI Trading Agent - Jupiter/Solana DEX Connector
 * Handles swaps via Jupiter aggregator and LP via Raydium CLMM
 * Non-custodial: uses session keypair for signing
 */

import { Connection, Keypair, VersionedTransaction, Transaction } from '@solana/web3.js';
import { Candle, Position, LPPosition } from '../core/types';
import {
  BaseConnector,
  ConnectorCapabilities,
  ConnectorConfig,
  OrderParams,
  OrderResult,
  OrderBookData,
  BalanceInfo,
  LPCreateParams,
  LPCollectResult,
} from './BaseConnector';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';

export interface JupiterConfig extends ConnectorConfig {
  rpcUrl: string;
  sessionPrivateKey?: string; // Base58 encoded session keypair
  jupiterApiUrl?: string;
}

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: { ammKey: string; label: string; inputMint: string; outputMint: string };
    percent: number;
  }>;
}

// Common Solana token mints
const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
};

export class JupiterConnector extends BaseConnector {
  private jupiterApi: string;
  private rpcUrl: string;
  private connection: Connection;
  private sessionKey: string | null = null;
  private circuitBreaker: CircuitBreaker;

  constructor(config: JupiterConfig) {
    super({ ...config, name: config.name || 'Jupiter', chain: 'solana' });
    this.rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
    this.jupiterApi = config.jupiterApiUrl || 'https://api.jup.ag';
    this.sessionKey = config.sessionPrivateKey || null;
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    this.circuitBreaker = createAPICircuitBreaker('jupiter', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 15000,
    });
  }

  private async fetchWithTimeout(url: string, options?: RequestInit, timeoutMs: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  }

  async connect(): Promise<boolean> {
    try {
      // Verify RPC connection
      const response = await this.fetchWithTimeout(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      }, 5000);
      const data = await response.json();
      if (data.result !== 'ok') throw new Error('RPC unhealthy');

      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Jupiter] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.sessionKey = null;
  }

  getCapabilities(): ConnectorCapabilities {
    return { spot: true, perps: false, lp: true, options: false };
  }

  setSessionKey(privateKey: string): void {
    this.sessionKey = privateKey;
  }

  async getMidPrice(pair: string): Promise<number> {
    try {
      const [base, quote] = this.parsePair(pair);
      const baseMint = TOKEN_MINTS[base];
      const quoteMint = TOKEN_MINTS[quote] || TOKEN_MINTS.USDC;

      if (!baseMint) {
        return 0;
      }

      // Use Jupiter price API
      const response = await this.fetchWithTimeout(
        `${this.jupiterApi}/price/v2?ids=${baseMint}&vsToken=${quoteMint}`
      );
      const data = await response.json();
      return parseFloat(data?.data?.[baseMint]?.price || '0');
    } catch (error) {
      console.error(`[Jupiter] getMidPrice error for ${pair}:`, error);
      return 0;
    }
  }

  async getCandles(pair: string, _interval: string = '5m', _count: number = 100): Promise<Candle[]> {
    // Jupiter doesn't provide candle data directly
    // Use Birdeye or DexScreener API for Solana token charts
    try {
      const [base] = this.parsePair(pair);
      const mint = TOKEN_MINTS[base];
      if (!mint) return [];

      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`
      );
      const data = await response.json();
      const dexPair = data?.pairs?.[0];
      if (!dexPair) return [];

      // DexScreener doesn't return raw candles via free API,
      // return latest price as a single candle
      const price = parseFloat(dexPair.priceUsd || '0');
      return [{
        timestamp: Date.now(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: parseFloat(dexPair.volume?.h24 || '0'),
      }];
    } catch {
      return [];
    }
  }

  async getOrderBook(pair: string): Promise<OrderBookData> {
    // Solana DEXes don't have traditional order books for AMM pools
    // Return spread estimate based on Jupiter quotes
    const midPrice = await this.getMidPrice(pair);
    const spread = midPrice * 0.001; // 0.1% estimated spread

    return {
      bids: [[midPrice - spread, 1000]],
      asks: [[midPrice + spread, 1000]],
      timestamp: Date.now(),
    };
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.connected) return { success: false, error: 'Not connected' };
    if (!this.sessionKey) return { success: false, error: 'No session key configured' };

    try {
      const [baseTkn, quoteTkn] = this.parsePair(params.pair);
      const inputMint = params.side === 'buy'
        ? (TOKEN_MINTS[quoteTkn] || TOKEN_MINTS.USDC)
        : TOKEN_MINTS[baseTkn];
      const outputMint = params.side === 'buy'
        ? TOKEN_MINTS[baseTkn]
        : (TOKEN_MINTS[quoteTkn] || TOKEN_MINTS.USDC);

      if (!inputMint || !outputMint) {
        return { success: false, error: `Unknown token in pair ${params.pair}` };
      }

      // Amount in smallest unit (lamports for SOL, or token decimals)
      const decimals = inputMint === TOKEN_MINTS.SOL ? 9 : 6; // USDC/USDT = 6 decimals
      const amountRaw = Math.floor(params.size * params.price * Math.pow(10, decimals));

      // 1. Get Jupiter quote (via circuit breaker)
      const quoteResponse = await this.circuitBreaker.execute(() =>
        this.fetchWithTimeout(
          `${this.jupiterApi}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountRaw}&slippageBps=50`
        )
      );
      const quote: JupiterQuote = await quoteResponse.json();

      if (!quote || !quote.outAmount) {
        return { success: false, error: 'No route found' };
      }

      // 2. Get swap transaction (via circuit breaker)
      const swapResponse = await this.circuitBreaker.execute(() =>
        this.fetchWithTimeout(`${this.jupiterApi}/swap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: this.getPublicKeyFromSession(),
            dynamicComputeUnitLimit: true,
            dynamicSlippage: { maxBps: 300 },
            prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 1000000, priorityLevel: 'medium' } },
          }),
        })
      );
      const swapData = await swapResponse.json();

      if (swapData.error) {
        return { success: false, error: swapData.error };
      }

      // 3. Sign and send transaction using session key
      // The actual signing requires @solana/web3.js Transaction deserialization
      // and Keypair.fromSecretKey signing
      const txHash = await this.signAndSendTransaction(swapData.swapTransaction);

      return {
        success: !!txHash,
        txHash: txHash || undefined,
        orderId: txHash || undefined,
        error: txHash ? undefined : 'Transaction failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown swap error',
      };
    }
  }

  async cancelOrder(_pair: string, _orderId: string): Promise<boolean> {
    // AMM swaps are atomic - no cancellation needed
    return false;
  }

  async cancelAllOrders(): Promise<boolean> {
    return true; // No pending orders on AMM
  }

  async getPositions(): Promise<Position[]> {
    // Solana spot positions = token balances
    // This connector tracks swap executions as "positions"
    return [];
  }

  async closePosition(pair: string, size: number, direction: 'long' | 'short'): Promise<OrderResult> {
    // Close = swap back to quote currency
    return this.placeOrder({
      pair,
      side: direction === 'long' ? 'sell' : 'buy',
      price: await this.getMidPrice(pair),
      size,
      type: 'market',
    });
  }

  async getBalances(): Promise<BalanceInfo[]> {
    if (!this.sessionKey) return [];

    try {
      const pubkey = this.getPublicKeyFromSession();
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [pubkey],
        }),
      });
      const data = await response.json();
      const solBalance = (data?.result?.value || 0) / 1e9;
      const solPrice = await this.getMidPrice('SOL/USDC');

      return [{
        asset: 'SOL',
        free: solBalance,
        locked: 0,
        total: solBalance,
        valueUSD: solBalance * solPrice,
      }];
    } catch {
      return [];
    }
  }

  // LP Methods (via Raydium CLMM API)
  async createLPPosition(params: LPCreateParams): Promise<LPPosition> {
    if (!this.sessionKey) throw new Error('No session key for LP operations');

    const keypair = this.getKeypair();
    const walletAddress = keypair.publicKey.toBase58();

    // 1. Get pool info from Raydium API
    const mint0 = TOKEN_MINTS[params.token0] || params.token0;
    const mint1 = TOKEN_MINTS[params.token1] || params.token1;

    const poolResponse = await this.fetchWithTimeout(
      `https://api-v3.raydium.io/pools/info/mint?mint1=${mint0}&mint2=${mint1}&poolType=concentrated&poolSortField=liquidity&sortType=desc&pageSize=1`
    );
    const poolData = await poolResponse.json();
    const pool = poolData?.data?.data?.[0];

    if (!pool) {
      throw new Error(`No Raydium CLMM pool found for ${params.token0}/${params.token1}`);
    }

    // 2. Request open-position transaction from Raydium API
    const openPosResponse = await this.fetchWithTimeout(
      'https://api-v3.raydium.io/clmm/openPosition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: pool.id,
          ownerInfo: { wallet: walletAddress },
          priceLower: params.tickLower,
          priceUpper: params.tickUpper,
          liquidity: String(params.amount0 + params.amount1),
          amountMaxA: String(params.amount0),
          amountMaxB: String(params.amount1),
        }),
      }
    );
    const openPosData = await openPosResponse.json();

    if (openPosData.data?.transaction) {
      const txHash = await this.signAndSendTransaction(openPosData.data.transaction);
      if (!txHash) throw new Error('Failed to send LP open-position transaction');
    }

    return {
      id: `sol_lp_${pool.id}_${Date.now()}`,
      pair: `${params.token0}/${params.token1}`,
      protocol: 'raydium',
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      liquidity: params.amount0 + params.amount1,
      token0Amount: params.amount0,
      token1Amount: params.amount1,
      feeTier: params.feeTier,
      unclaimedFees: { token0: 0, token1: 0 },
      valueUSD: 0,
      impermanentLoss: 0,
      inRange: true,
      createdAt: Date.now(),
      lastRebalance: Date.now(),
    };
  }

  async collectLPFees(positionId: string): Promise<LPCollectResult> {
    if (!this.sessionKey) {
      return { token0: 0, token1: 0, token0Symbol: 'SOL', token1Symbol: 'USDC', valueUSD: 0 };
    }

    try {
      const keypair = this.getKeypair();
      const walletAddress = keypair.publicKey.toBase58();

      // Harvest fees via Raydium API (decreaseLiquidity with 0 amount)
      const harvestResponse = await this.fetchWithTimeout(
        'https://api-v3.raydium.io/clmm/harvestAllRewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerInfo: { wallet: walletAddress },
            positionIds: [positionId],
          }),
        }
      );
      const harvestData = await harvestResponse.json();

      if (harvestData.data?.transaction) {
        await this.signAndSendTransaction(harvestData.data.transaction);
      }

      return {
        token0: harvestData.data?.rewards?.token0 || 0,
        token1: harvestData.data?.rewards?.token1 || 0,
        token0Symbol: 'SOL',
        token1Symbol: 'USDC',
        valueUSD: harvestData.data?.rewards?.totalValueUSD || 0,
      };
    } catch (error) {
      console.error('[Jupiter] collectLPFees error:', error);
      return { token0: 0, token1: 0, token0Symbol: 'SOL', token1Symbol: 'USDC', valueUSD: 0 };
    }
  }

  // Private helpers
  private parsePair(pair: string): [string, string] {
    const separator = pair.includes('/') ? '/' : pair.includes('-') ? '-' : '/';
    const parts = pair.split(separator);
    return [parts[0] || 'SOL', parts[1] || 'USDC'];
  }

  private getKeypair(): Keypair {
    if (!this.sessionKey) throw new Error('No session key');
    return Keypair.fromSecretKey(Buffer.from(this.sessionKey, 'hex'));
  }

  private getPublicKeyFromSession(): string {
    if (!this.sessionKey) return '';
    return this.getKeypair().publicKey.toBase58();
  }

  private async signAndSendTransaction(serializedTx: string): Promise<string | null> {
    if (!this.sessionKey) return null;

    try {
      const keypair = this.getKeypair();
      const txBuffer = Buffer.from(serializedTx, 'base64');

      // Try VersionedTransaction first (Jupiter v6 default)
      let rawTx: Uint8Array;
      try {
        const versionedTx = VersionedTransaction.deserialize(txBuffer);
        versionedTx.sign([keypair]);
        rawTx = versionedTx.serialize();
      } catch {
        // Fallback to legacy Transaction
        const legacyTx = Transaction.from(txBuffer);
        legacyTx.sign(keypair);
        rawTx = legacyTx.serialize();
      }

      const signature = await this.connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 2,
      });

      // Confirm transaction
      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      return signature;
    } catch (error) {
      console.error('[Jupiter] signAndSend error:', error);
      return null;
    }
  }
}
