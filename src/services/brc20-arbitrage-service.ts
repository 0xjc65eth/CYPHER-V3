/**
 * BRC-20 Arbitrage Service - CYPHER V3
 * Multi-exchange price comparison for BRC-20 tokens
 * Sources: Xverse, UniSat, OKX, Gamma.io
 */

import { xverseAPI } from '@/lib/api/xverse';
import { fetchUnisatBRC20Info } from '@/lib/price-apis';

// Top BRC-20 tokens to monitor
const TRACKED_BRC20 = [
  'ordi',
  'sats',
  'rats',
  'pizza',
  'trac',
  'mubi',
  'vmpx',
  'btcs',
  'oxbt',
  'cats',
];

// Exchanges that support BRC-20 trading with verified fees
const BRC20_EXCHANGES = [
  {
    name: 'Xverse/Aggregated',
    fee: 1.5,
    source: 'xverse' as const,
  },
  {
    name: 'UniSat',
    fee: 2.5,
    source: 'unisat' as const,
  },
  {
    name: 'OKX NFT',
    fee: 2.5,
    source: 'okx' as const,
  },
  {
    name: 'Gamma.io',
    fee: 2.0,
    source: 'gamma' as const,
  },
];

type ExchangeSource = typeof BRC20_EXCHANGES[number]['source'];

interface BRC20ExchangePrice {
  exchange: typeof BRC20_EXCHANGES[number];
  floorPriceSats: number;
  volume24h: number;
}

export interface BRC20ArbitrageInsight {
  id: string;
  timestamp: string;
  confidence: number;
  type: 'arbitrage';
  prediction: {
    sourceExchange: string;
    targetExchange: string;
    asset: string;
    sourceBuyPrice: number;
    targetSellPrice: number;
    profitPercent: string;
    estimatedProfit: number;
  };
  explanation: string;
  dataPoints: number;
}

export class BRC20ArbitrageService {
  private static instance: BRC20ArbitrageService;
  private lastUpdate: Date = new Date(0);
  private cachedInsights: BRC20ArbitrageInsight[] = [];
  private updateInterval = 120000; // 2 minutes
  private updateTimer: NodeJS.Timeout | null = null;
  private isUpdating = false;

  private constructor() {
    this.generateInsights();
    this.startAutoUpdate();
  }

  static getInstance(): BRC20ArbitrageService {
    if (!BRC20ArbitrageService.instance) {
      BRC20ArbitrageService.instance = new BRC20ArbitrageService();
    }
    return BRC20ArbitrageService.instance;
  }

  private startAutoUpdate(): void {
    if (this.updateTimer) clearInterval(this.updateTimer);
    this.updateTimer = setInterval(() => this.generateInsights(), this.updateInterval);
  }

  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private findExchange(source: ExchangeSource) {
    return BRC20_EXCHANGES.find(e => e.source === source)!;
  }

  /** Fetch Xverse price for a BRC-20 ticker */
  private async fetchXversePrice(ticker: string): Promise<BRC20ExchangePrice | null> {
    try {
      const data = await xverseAPI.getBRC20Ticker(ticker);
      if (data && data.floorPrice > 0) {
        return {
          exchange: this.findExchange('xverse'),
          floorPriceSats: data.floorPrice,
          volume24h: data.volume24h || 0,
        };
      }
    } catch {
      // Xverse API failed
    }
    return null;
  }

  /** Fetch UniSat price for a BRC-20 ticker */
  private async fetchUnisatPrice(ticker: string): Promise<BRC20ExchangePrice | null> {
    try {
      const data = await fetchUnisatBRC20Info(ticker);
      if (data && data.price > 0) {
        return {
          exchange: this.findExchange('unisat'),
          floorPriceSats: data.price,
          volume24h: data.volume24h || 0,
        };
      }
    } catch {
      // UniSat API failed
    }
    return null;
  }

  /** Fetch OKX price for a BRC-20 ticker */
  private async fetchOKXPrice(ticker: string): Promise<BRC20ExchangePrice | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://www.okx.com/api/v5/mktplace/nft/ordinals/brc20/detail?tick=${encodeURIComponent(ticker)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const tokenData = data?.data?.[0];
        if (tokenData?.floorPrice && parseFloat(tokenData.floorPrice) > 0) {
          return {
            exchange: this.findExchange('okx'),
            floorPriceSats: parseFloat(tokenData.floorPrice),
            volume24h: parseFloat(tokenData.volume24h || '0'),
          };
        }
      }
    } catch {
      // OKX API failed
    }
    return null;
  }

  /** Main insight generation — fetches prices from all exchanges and finds arb opportunities */
  private async generateInsights(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      const tickers = TRACKED_BRC20;
      const newInsights: BRC20ArbitrageInsight[] = [];

      // Try batch Xverse first for efficiency
      let xverseBatch: Record<string, { floorPrice: number; volume24h: number }> = {};
      try {
        const batch = await xverseAPI.getBRC20BatchTickers(tickers);
        if (batch) xverseBatch = batch;
      } catch {
        // Batch failed, will fall back to individual calls
      }

      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];

        // Fetch prices from all exchanges in parallel
        const xverseFromBatch = xverseBatch[ticker];
        const promises: Promise<BRC20ExchangePrice | null>[] = [];

        // Use batch data if available, otherwise individual call
        if (xverseFromBatch && xverseFromBatch.floorPrice > 0) {
          promises.push(Promise.resolve({
            exchange: this.findExchange('xverse'),
            floorPriceSats: xverseFromBatch.floorPrice,
            volume24h: xverseFromBatch.volume24h || 0,
          }));
        } else {
          promises.push(this.fetchXversePrice(ticker));
        }

        promises.push(this.fetchUnisatPrice(ticker));
        promises.push(this.fetchOKXPrice(ticker));

        const results = await Promise.allSettled(promises);
        const allPrices: BRC20ExchangePrice[] = [];

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            allPrices.push(result.value);
          }
        }

        // Need at least 2 exchanges with valid prices
        if (allPrices.length < 2) continue;

        // Sort by price (cheapest first)
        allPrices.sort((a, b) => a.floorPriceSats - b.floorPriceSats);

        const cheapest = allPrices[0];
        const mostExpensive = allPrices[allPrices.length - 1];

        // Calculate gross spread
        const grossSpreadPct = ((mostExpensive.floorPriceSats - cheapest.floorPriceSats) / cheapest.floorPriceSats) * 100;

        // Ignore spreads below 2% (not viable after fees)
        if (grossSpreadPct < 2) continue;

        // Calculate net profit after real exchange fees
        const sourceFeeRate = cheapest.exchange.fee / 100;
        const targetFeeRate = mostExpensive.exchange.fee / 100;

        const buyWithFee = cheapest.floorPriceSats * (1 + sourceFeeRate);
        const sellWithFee = mostExpensive.floorPriceSats * (1 - targetFeeRate);
        const netProfitPerUnit = sellWithFee - buyWithFee;

        // If net profit is negative after fees, skip
        if (netProfitPerUnit <= 0) continue;

        const netProfitPercent = (netProfitPerUnit / buyWithFee) * 100;
        const totalVolume = cheapest.volume24h + mostExpensive.volume24h;
        const estimatedProfit = netProfitPerUnit * Math.max(1, Math.floor(totalVolume * 0.001));

        // Confidence based on volume and spread
        const volumeFactor = Math.min(totalVolume / 1_000_000, 0.1);
        const spreadFactor = Math.min(netProfitPercent / 20, 0.1);
        const confidence = Math.min(95, Math.round((0.70 + volumeFactor + spreadFactor) * 100));

        newInsights.push({
          id: `brc20-arb-${Date.now()}-${i}`,
          timestamp: new Date().toISOString(),
          confidence,
          type: 'arbitrage',
          prediction: {
            sourceExchange: cheapest.exchange.name,
            targetExchange: mostExpensive.exchange.name,
            asset: `BRC20/${ticker.toUpperCase()}`,
            sourceBuyPrice: cheapest.floorPriceSats,
            targetSellPrice: mostExpensive.floorPriceSats,
            profitPercent: netProfitPercent.toFixed(2),
            estimatedProfit,
          },
          explanation: `BRC-20 ${ticker.toUpperCase()}: ${cheapest.floorPriceSats} sats on ${cheapest.exchange.name} vs ${mostExpensive.floorPriceSats} sats on ${mostExpensive.exchange.name}. Gross spread: ${grossSpreadPct.toFixed(2)}%. Net after fees (${cheapest.exchange.fee}% + ${mostExpensive.exchange.fee}%): ${netProfitPercent.toFixed(2)}%.`,
          dataPoints: totalVolume > 0 ? Math.round(totalVolume / 100) : 0,
        });
      }

      // Sort by net profit descending
      newInsights.sort((a, b) =>
        parseFloat(b.prediction.profitPercent) - parseFloat(a.prediction.profitPercent)
      );

      this.cachedInsights = newInsights;
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('[BRC20Arbitrage] Error generating insights:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  async getInsights(): Promise<BRC20ArbitrageInsight[]> {
    const now = Date.now();
    if (now - this.lastUpdate.getTime() > this.updateInterval) {
      await this.generateInsights();
    }
    return this.cachedInsights;
  }

  forceUpdate(): void {
    this.generateInsights();
  }
}

export const brc20ArbitrageService = BRC20ArbitrageService.getInstance();
