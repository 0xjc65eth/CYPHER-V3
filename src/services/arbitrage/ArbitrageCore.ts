/**
 * ArbitrageCore - Consolidated cross-exchange arbitrage engine
 *
 * Architecture: CEX = Price Oracles, DEX = Execution Venue
 *
 * CEX exchanges (Binance, Kraken, OKX, Bybit, Coinbase, KuCoin, Gate.io, MEXC)
 * serve as price oracles only. All trade execution routes through DEX aggregators
 * (Jupiter, Uniswap V3, 1inch) via TradeExecutor.
 *
 * Responsibilities:
 * 1. Fetch real-time prices via REST from 8 CEX oracles
 * 2. Detect cross-exchange arbitrage for BTC/USDT + ETH/USDT
 * 3. Calculate real fees, slippage, and network costs
 * 4. Provide cached price snapshots for other services
 */

import {
  fetchAllExchangePrices,
  ExchangePrice,
  EXCHANGE_FEES,
} from '@/lib/arbitrage/exchange-fetchers';
import { logger } from '@/lib/logger';

export type { ExchangePrice } from '@/lib/arbitrage/exchange-fetchers';
export { EXCHANGE_FEES } from '@/lib/arbitrage/exchange-fetchers';

export const SUPPORTED_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'] as const;
export type SupportedPair = (typeof SUPPORTED_PAIRS)[number];

export type ExecutionVenue = 'jupiter' | 'uniswap_v3' | '1inch' | 'paper';

export interface CrossExchangeOpportunity {
  id: string;
  pair: string;
  buyExchange: string; // CEX oracle source (price reference)
  sellExchange: string; // CEX oracle source (price reference)
  executionVenue: ExecutionVenue; // DEX where trade executes
  buyPrice: number; // ask on buy exchange (oracle)
  sellPrice: number; // bid on sell exchange (oracle)
  grossSpreadPercent: number;
  buyFee: number; // as decimal (e.g. 0.001)
  sellFee: number;
  networkFeePercent: number;
  slippagePercent: number;
  netProfitPercent: number;
  estimatedProfitPer1Unit: number;
  confidence: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
  ttl: number; // milliseconds
}

export interface PriceSnapshot {
  pair: string;
  exchanges: ExchangePrice[];
  bestBid: { exchange: string; price: number };
  bestAsk: { exchange: string; price: number };
  maxSpread: number;
  maxSpreadPercent: number;
  timestamp: number;
}

// Network fee estimates (conservative)
const NETWORK_FEES: Record<string, number> = {
  'BTC/USDT': 0.0001, // ~0.01% at $100k BTC
  'ETH/USDT': 0.0002, // ~0.02% gas cost relative to trade
  'SOL/USDT': 0.00005, // ~0.005% Solana tx fees are very low
  'XRP/USDT': 0.00002, // ~0.002% XRP tx fees are negligible
  'DOGE/USDT': 0.0003, // ~0.03% DOGE network fee relative to trade
};

const SLIPPAGE_ESTIMATE = 0.0003; // 0.03% estimated slippage
const OPPORTUNITY_TTL = 10_000; // 10 seconds
const CACHE_TTL = 5_000; // 5 seconds

class ArbitrageCoreEngine {
  private priceCache: Map<string, PriceSnapshot> = new Map();
  private opportunityCache: CrossExchangeOpportunity[] = [];
  private lastFetchTime = 0;

  /**
   * Get latest prices for a pair from all exchanges.
   * Returns cached data if fresh enough.
   */
  async getPrices(pair: SupportedPair): Promise<PriceSnapshot> {
    const cached = this.priceCache.get(pair);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }

    const exchanges = await fetchAllExchangePrices(pair);

    if (exchanges.length === 0) {
      throw new Error(`No exchange data available for ${pair}`);
    }

    let bestBid = { exchange: '', price: 0 };
    let bestAsk = { exchange: '', price: Infinity };

    for (const ex of exchanges) {
      if (ex.bid > bestBid.price) {
        bestBid = { exchange: ex.exchange, price: ex.bid };
      }
      if (ex.ask > 0 && ex.ask < bestAsk.price) {
        bestAsk = { exchange: ex.exchange, price: ex.ask };
      }
    }

    const maxSpread = bestBid.price - bestAsk.price;
    const maxSpreadPercent =
      bestAsk.price > 0 ? (maxSpread / bestAsk.price) * 100 : 0;

    const snapshot: PriceSnapshot = {
      pair,
      exchanges,
      bestBid,
      bestAsk,
      maxSpread,
      maxSpreadPercent,
      timestamp: Date.now(),
    };

    this.priceCache.set(pair, snapshot);
    return snapshot;
  }

  /**
   * Get prices for ALL supported pairs in parallel.
   */
  async getAllPrices(): Promise<PriceSnapshot[]> {
    const results = await Promise.allSettled(
      SUPPORTED_PAIRS.map((pair) => this.getPrices(pair))
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<PriceSnapshot> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);
  }

  /**
   * Detect cross-exchange arbitrage opportunities for all supported pairs.
   */
  async detectOpportunities(): Promise<CrossExchangeOpportunity[]> {
    // Return cache if fresh
    if (Date.now() - this.lastFetchTime < CACHE_TTL) {
      return this.opportunityCache;
    }

    const snapshots = await this.getAllPrices();
    const opportunities: CrossExchangeOpportunity[] = [];

    for (const snapshot of snapshots) {
      const { pair, exchanges } = snapshot;
      const networkFee = NETWORK_FEES[pair] || 0.0002;

      for (const buyer of exchanges) {
        for (const seller of exchanges) {
          if (buyer.exchange === seller.exchange) continue;
          if (buyer.ask <= 0 || seller.bid <= 0) continue;

          const grossSpread =
            ((seller.bid - buyer.ask) / buyer.ask) * 100;

          if (grossSpread <= 0) continue;

          const buyFee = EXCHANGE_FEES[buyer.exchange] || 0.002;
          const sellFee = EXCHANGE_FEES[seller.exchange] || 0.002;
          const networkFeePercent = networkFee * 100;
          const slippagePercent = SLIPPAGE_ESTIMATE * 100;

          const netProfit =
            grossSpread -
            buyFee * 100 -
            sellFee * 100 -
            networkFeePercent -
            slippagePercent;

          const profitPer1Unit =
            seller.bid * (1 - sellFee) -
            buyer.ask * (1 + buyFee) -
            buyer.ask * networkFee -
            buyer.ask * SLIPPAGE_ESTIMATE;

          const confidence = this.calculateConfidence(
            grossSpread,
            buyer,
            seller
          );

          const riskLevel = this.assessRisk(grossSpread, netProfit, buyer, seller);

          // Select DEX execution venue based on pair
          // SOL, DOGE, XRP → Jupiter (Solana DEX), ETH → Uniswap V3, BTC → Jupiter (wBTC)
          const venue: ExecutionVenue = pair.startsWith('ETH')
            ? 'uniswap_v3'
            : 'jupiter';

          opportunities.push({
            id: `${pair}-${buyer.exchange}-${seller.exchange}-${Date.now()}`,
            pair,
            buyExchange: buyer.exchange,
            sellExchange: seller.exchange,
            executionVenue: venue,
            buyPrice: buyer.ask,
            sellPrice: seller.bid,
            grossSpreadPercent: parseFloat(grossSpread.toFixed(4)),
            buyFee,
            sellFee,
            networkFeePercent: parseFloat(networkFeePercent.toFixed(4)),
            slippagePercent: parseFloat(slippagePercent.toFixed(4)),
            netProfitPercent: parseFloat(netProfit.toFixed(4)),
            estimatedProfitPer1Unit: parseFloat(profitPer1Unit.toFixed(2)),
            confidence,
            riskLevel,
            timestamp: Date.now(),
            ttl: OPPORTUNITY_TTL,
          });
        }
      }
    }

    // Sort by net profit descending
    opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    this.opportunityCache = opportunities.slice(0, 40);
    this.lastFetchTime = Date.now();
    return this.opportunityCache;
  }

  /**
   * Get cached price snapshot for a pair (used by TriangularArbitrage).
   * Returns null if no cached data.
   */
  getCachedPrices(pair: string): PriceSnapshot | null {
    return this.priceCache.get(pair) || null;
  }

  private calculateConfidence(
    spread: number,
    buyer: ExchangePrice,
    seller: ExchangePrice
  ): number {
    let confidence = 70;

    // Higher volume = more confidence
    const avgVolume = (buyer.volume + seller.volume) / 2;
    if (avgVolume > 1000) confidence += 15;
    else if (avgVolume > 100) confidence += 10;
    else if (avgVolume > 0) confidence += 5;

    // Extremely high spread is suspicious
    if (spread > 2) confidence -= 20;
    else if (spread > 1) confidence -= 10;

    // Fresh data = more confidence
    const age = Date.now() - Math.min(buyer.timestamp, seller.timestamp);
    if (age > 10000) confidence -= 15;
    else if (age > 5000) confidence -= 5;

    return Math.max(10, Math.min(95, confidence));
  }

  private assessRisk(
    grossSpread: number,
    netProfit: number,
    buyer: ExchangePrice,
    seller: ExchangePrice
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Suspicious spread
    if (grossSpread > 3) riskScore += 2;
    else if (grossSpread > 1) riskScore += 1;

    // Negative or tiny net profit
    if (netProfit < 0) riskScore += 2;
    else if (netProfit < 0.1) riskScore += 1;

    // Low volume
    const minVolume = Math.min(buyer.volume, seller.volume);
    if (minVolume === 0) riskScore += 1;

    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }
}

// Singleton
export const arbitrageCore = new ArbitrageCoreEngine();
