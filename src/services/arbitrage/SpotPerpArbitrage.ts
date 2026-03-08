/**
 * 📊 SPOT vs PERPETUAL ARBITRAGE SCANNER
 * Detects basis trade opportunities between spot and perpetual markets.
 * Uses Hyperliquid perp data + CEX spot data from exchange-fetchers.
 */

import { logger } from '@/lib/logger';
import { fetchAllExchangePrices, EXCHANGE_FEES, type ExchangePrice } from '@/lib/arbitrage/exchange-fetchers';

export interface SpotPerpOpportunity {
  id: string;
  asset: string;
  spotExchange: string;
  spotPrice: number;
  perpPrice: number;  // Hyperliquid mark price
  basisPercent: number;  // (perp - spot) / spot * 100
  fundingRate: number;   // 8h funding rate
  annualizedFunding: number;
  direction: 'short-perp-long-spot' | 'long-perp-short-spot';
  estimatedProfitPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: number;
}

interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
  }>;
}

interface HyperliquidAssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
}

// Pairs to scan for spot-perp arbitrage
const SPOT_PERP_PAIRS: Record<string, string> = {
  'BTC': 'BTC/USDT',
  'ETH': 'ETH/USDT',
  'SOL': 'SOL/USDT',
  'DOGE': 'DOGE/USDT',
  'XRP': 'XRP/USDT',
};

/**
 * Fetch Hyperliquid perpetual market data (mark price, funding rate, etc.)
 */
async function fetchHyperliquidPerps(): Promise<Map<string, { markPrice: number; fundingRate: number; openInterest: number }>> {
  const result = new Map<string, { markPrice: number; fundingRate: number; openInterest: number }>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Hyperliquid HTTP ${response.status}`);
    }

    const data = await response.json() as [HyperliquidMeta, HyperliquidAssetCtx[]];
    const [meta, assetCtxs] = data;

    if (!meta?.universe || !assetCtxs) return result;

    for (let i = 0; i < meta.universe.length; i++) {
      const asset = meta.universe[i];
      const ctx = assetCtxs[i];
      if (!asset || !ctx) continue;

      const markPrice = parseFloat(ctx.markPx || '0');
      const fundingRate = parseFloat(ctx.funding || '0');
      const openInterest = parseFloat(ctx.openInterest || '0');

      if (markPrice > 0) {
        result.set(asset.name, { markPrice, fundingRate, openInterest });
      }
    }
  } catch (error) {
    logger.error('[SpotPerpArbitrage] Failed to fetch Hyperliquid data', error as Error);
  }

  return result;
}

/**
 * Scan for spot vs perpetual arbitrage opportunities
 */
export async function scanSpotPerpArbitrage(): Promise<SpotPerpOpportunity[]> {
  const opportunities: SpotPerpOpportunity[] = [];

  try {
    // Fetch Hyperliquid perp data
    const perpData = await fetchHyperliquidPerps();
    if (perpData.size === 0) {
      logger.debug('[SpotPerpArbitrage] No Hyperliquid data available');
      return [];
    }

    // For each tracked asset, compare spot vs perp
    const scanPromises = Object.entries(SPOT_PERP_PAIRS).map(async ([asset, spotPair]) => {
      const perp = perpData.get(asset);
      if (!perp) return;

      // Fetch spot prices from CEX exchanges
      try {
        const spotPrices = await fetchAllExchangePrices(spotPair, ['binance', 'coinbase', 'okx', 'bybit']);
        if (spotPrices.length === 0) return;

        // Use best spot price (lowest ask for buying spot, highest bid for selling)
        const bestSpotAsk = spotPrices.reduce((best, ex) =>
          ex.ask > 0 && ex.ask < best.ask ? ex : best,
          { ask: Infinity, exchange: '' } as ExchangePrice
        );

        const bestSpotBid = spotPrices.reduce((best, ex) =>
          ex.bid > best.bid ? ex : best,
          { bid: 0, exchange: '' } as ExchangePrice
        );

        if (bestSpotAsk.ask === Infinity || bestSpotBid.bid === 0) return;

        // Calculate basis using mid spot price
        const spotMid = (bestSpotAsk.ask + bestSpotBid.bid) / 2;
        const basisPercent = ((perp.markPrice - spotMid) / spotMid) * 100;
        const annualizedFunding = perp.fundingRate * 3 * 365 * 100; // 3 funding periods per day * 365 days

        // Determine direction and profitability
        const absBasis = Math.abs(basisPercent);
        if (absBasis < 0.05) return; // Skip tiny basis

        const direction: SpotPerpOpportunity['direction'] = basisPercent > 0
          ? 'short-perp-long-spot'  // Perp is more expensive: short perp, buy spot
          : 'long-perp-short-spot'; // Perp is cheaper: long perp, sell spot

        // Estimate fees: spot trading fee + funding rate cost
        const spotFee = EXCHANGE_FEES[direction === 'short-perp-long-spot' ? bestSpotAsk.exchange : bestSpotBid.exchange] || 0.001;
        const perpFee = 0.00035; // Hyperliquid taker fee
        const totalFees = (spotFee + perpFee) * 100; // as percentage

        const estimatedProfit = absBasis - totalFees;

        // Risk assessment
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (absBasis > 2) riskLevel = 'high'; // Very large basis = something unusual
        else if (absBasis > 0.5) riskLevel = 'medium';

        // Confidence: higher basis + consistent funding = higher confidence
        let confidence = 70;
        if (absBasis > 0.1) confidence += 10;
        if (Math.abs(annualizedFunding) > 10) confidence += 5;
        if (spotPrices.length >= 3) confidence += 5;
        confidence = Math.min(95, confidence);

        opportunities.push({
          id: `sp-${asset}-${Date.now()}`,
          asset,
          spotExchange: direction === 'short-perp-long-spot' ? bestSpotAsk.exchange : bestSpotBid.exchange,
          spotPrice: direction === 'short-perp-long-spot' ? bestSpotAsk.ask : bestSpotBid.bid,
          perpPrice: perp.markPrice,
          basisPercent: parseFloat(basisPercent.toFixed(4)),
          fundingRate: perp.fundingRate,
          annualizedFunding: parseFloat(annualizedFunding.toFixed(2)),
          direction,
          estimatedProfitPercent: parseFloat(estimatedProfit.toFixed(4)),
          riskLevel,
          confidence,
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error(`[SpotPerpArbitrage] Failed to fetch spot data for ${asset}`, error as Error);
      }
    });

    await Promise.allSettled(scanPromises);

    // Sort by absolute basis descending
    opportunities.sort((a, b) => Math.abs(b.basisPercent) - Math.abs(a.basisPercent));

    logger.debug(`[SpotPerpArbitrage] Found ${opportunities.length} spot-perp opportunities`);
  } catch (error) {
    logger.error('[SpotPerpArbitrage] Scan failed', error as Error);
  }

  return opportunities;
}
