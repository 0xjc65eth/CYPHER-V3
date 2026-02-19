/**
 * CYPHER AI Trading Agent - Market Maker Strategy Engine
 *
 * Provides continuous bid/ask liquidity with dynamic spread
 * adjustment based on volatility and inventory management.
 */

interface MMConfig {
  pair: string;
  exchange: string;
  baseSpread: number; // basis points, e.g. 10 = 0.10%
  maxInventorySkew: number; // max allowed skew before rebalance (0-1)
  orderSize: number; // USD per side
  accountBalance?: number; // USD
}

interface Quote {
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
}

export class MMStrategyEngine {
  private readonly config: MMConfig;
  private longExposure: number = 0;
  private shortExposure: number = 0;

  constructor(config: MMConfig) {
    this.config = config;
  }

  /**
   * Calculate dynamic spread based on current volatility.
   * Higher volatility -> wider spread to compensate for adverse selection.
   * Capped at 200bps (2%).
   */
  calculateDynamicSpread(volatility: number): number {
    const MAX_SPREAD_BPS = 200;

    // Volatility multiplier: scale spread linearly with vol
    // Base assumption: volatility ~0.01 (1%) is "normal"
    const volMultiplier = Math.max(1, volatility / 0.01);
    const dynamicBps = this.config.baseSpread * volMultiplier;

    return Math.min(dynamicBps, MAX_SPREAD_BPS);
  }

  /**
   * Generate bid and ask quotes around a mid price.
   * Adjusts quote sizes based on inventory skew to naturally rebalance.
   */
  generateQuotes(midPrice: number, volatility: number): Quote {
    const spreadBps = this.calculateDynamicSpread(volatility);
    const halfSpread = (spreadBps / 10000) * midPrice;
    const skew = this.getInventorySkew();

    // Skew-adjusted sizing: reduce size on the overweight side
    // skew > 0.5 means long-heavy -> reduce bid, increase ask
    const skewFactor = (skew - 0.5) * 2; // range -1 to 1
    const bidSizeAdj = Math.max(0.2, 1 - skewFactor * 0.5);
    const askSizeAdj = Math.max(0.2, 1 + skewFactor * 0.5);

    return {
      bidPrice: midPrice - halfSpread,
      bidSize: this.config.orderSize * bidSizeAdj,
      askPrice: midPrice + halfSpread,
      askSize: this.config.orderSize * askSizeAdj,
    };
  }

  /**
   * Get current inventory skew ratio.
   * 0 = fully short, 0.5 = balanced, 1 = fully long.
   */
  getInventorySkew(): number {
    const totalExposure = this.longExposure + this.shortExposure;
    if (totalExposure === 0) return 0.5; // balanced when no exposure
    return this.longExposure / totalExposure;
  }

  /**
   * Check if inventory needs rebalancing based on maxInventorySkew.
   */
  shouldRebalance(): boolean {
    const skew = this.getInventorySkew();
    const deviation = Math.abs(skew - 0.5);
    return deviation > this.config.maxInventorySkew;
  }

  /**
   * Record a fill to update inventory tracking.
   */
  recordFill(side: 'buy' | 'sell', sizeUSD: number): void {
    if (side === 'buy') {
      this.longExposure += sizeUSD;
    } else {
      this.shortExposure += sizeUSD;
    }
  }

  /**
   * Reset inventory tracking (e.g. after a full rebalance).
   */
  resetInventory(): void {
    this.longExposure = 0;
    this.shortExposure = 0;
  }

  /**
   * Get current exposure summary.
   */
  getExposure(): { long: number; short: number; net: number; skew: number } {
    return {
      long: this.longExposure,
      short: this.shortExposure,
      net: this.longExposure - this.shortExposure,
      skew: this.getInventorySkew(),
    };
  }
}
