/**
 * CYPHER AI Trading Agent - Correlation Matrix
 * Computes and maintains rolling correlation between asset pairs.
 * Used for portfolio diversification and risk management.
 */

// ============================================================================
// Types
// ============================================================================

export interface CorrelationEntry {
  pairA: string;
  pairB: string;
  correlation: number;  // -1 to 1
  samples: number;
  lastUpdated: number;
}

export interface CorrelationMatrixConfig {
  lookbackPeriods: number;     // periods for correlation calculation (default: 30)
  minSamples: number;          // min samples for valid correlation (default: 15)
  updateIntervalMs: number;    // how often to recompute (default: 300000 = 5min)
  maxPairs: number;            // max pairs to track (default: 50)
}

const DEFAULT_CONFIG: CorrelationMatrixConfig = {
  lookbackPeriods: 30,
  minSamples: 15,
  updateIntervalMs: 300_000,
  maxPairs: 50,
};

// ============================================================================
// CorrelationMatrix
// ============================================================================

export class CorrelationMatrix {
  private config: CorrelationMatrixConfig;

  // pair -> returns series
  private returnsSeries: Map<string, number[]> = new Map();
  // "pairA:pairB" -> correlation
  private correlations: Map<string, CorrelationEntry> = new Map();
  private lastComputed = 0;

  constructor(config?: Partial<CorrelationMatrixConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Data Ingestion
  // ============================================================================

  /** Record a return observation for a pair */
  recordReturn(pair: string, logReturn: number): void {
    if (!this.returnsSeries.has(pair)) {
      this.returnsSeries.set(pair, []);
    }

    const series = this.returnsSeries.get(pair)!;
    series.push(logReturn);

    // Trim to lookback
    if (series.length > this.config.lookbackPeriods * 2) {
      this.returnsSeries.set(pair, series.slice(-this.config.lookbackPeriods * 2));
    }
  }

  /** Record a price observation (will compute returns internally) */
  recordPrice(pair: string, price: number): void {
    const series = this.returnsSeries.get(pair);
    if (!series || series.length === 0) {
      // Store first price as a marker (won't have return yet)
      if (!this.returnsSeries.has(pair)) this.returnsSeries.set(pair, []);
      this.returnsSeries.get(pair)!.push(0); // placeholder for first observation
      (this as any)[`_lastPrice_${pair}`] = price;
      return;
    }

    const lastPrice = (this as any)[`_lastPrice_${pair}`] as number;
    if (lastPrice && lastPrice > 0 && price > 0) {
      const logReturn = Math.log(price / lastPrice);
      this.recordReturn(pair, logReturn);
    }
    (this as any)[`_lastPrice_${pair}`] = price;
  }

  // ============================================================================
  // Computation
  // ============================================================================

  /** Recompute all correlations */
  compute(): void {
    const pairs = Array.from(this.returnsSeries.keys());

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const pairA = pairs[i];
        const pairB = pairs[j];
        const corr = this.computePairCorrelation(pairA, pairB);

        if (corr !== null) {
          const key = this.makeKey(pairA, pairB);
          this.correlations.set(key, corr);
        }
      }
    }

    this.lastComputed = Date.now();
  }

  /** Compute correlation if stale */
  computeIfNeeded(): void {
    if (Date.now() - this.lastComputed >= this.config.updateIntervalMs) {
      this.compute();
    }
  }

  private computePairCorrelation(pairA: string, pairB: string): CorrelationEntry | null {
    const seriesA = this.returnsSeries.get(pairA);
    const seriesB = this.returnsSeries.get(pairB);

    if (!seriesA || !seriesB) return null;

    // Align series to same length (use most recent data)
    const len = Math.min(seriesA.length, seriesB.length, this.config.lookbackPeriods);
    if (len < this.config.minSamples) return null;

    const a = seriesA.slice(-len);
    const b = seriesB.slice(-len);

    const correlation = this.pearsonCorrelation(a, b);

    return {
      pairA,
      pairB,
      correlation,
      samples: len,
      lastUpdated: Date.now(),
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    const denom = Math.sqrt(varX * varY);
    return denom > 0 ? cov / denom : 0;
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /** Get correlation between two pairs */
  getCorrelation(pairA: string, pairB: string): number {
    this.computeIfNeeded();

    if (pairA === pairB) return 1;

    const key = this.makeKey(pairA, pairB);
    const entry = this.correlations.get(key);
    return entry?.correlation || 0;
  }

  /** Get all correlations for a pair */
  getCorrelationsForPair(pair: string): CorrelationEntry[] {
    this.computeIfNeeded();

    const results: CorrelationEntry[] = [];
    for (const entry of this.correlations.values()) {
      if (entry.pairA === pair || entry.pairB === pair) {
        results.push(entry);
      }
    }
    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /** Get highly correlated pairs (above threshold) */
  getHighlyCorrelated(threshold: number = 0.7): CorrelationEntry[] {
    this.computeIfNeeded();

    return Array.from(this.correlations.values())
      .filter(e => Math.abs(e.correlation) >= threshold)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /** Get the full correlation matrix as a 2D structure */
  getMatrix(): { pairs: string[]; matrix: number[][] } {
    this.computeIfNeeded();

    const pairs = Array.from(this.returnsSeries.keys());
    const matrix: number[][] = [];

    for (let i = 0; i < pairs.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < pairs.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          row.push(this.getCorrelation(pairs[i], pairs[j]));
        }
      }
      matrix.push(row);
    }

    return { pairs, matrix };
  }

  /** Check if adding a pair would increase concentration risk */
  wouldIncreaseConcentration(newPair: string, existingPairs: string[], threshold: number = 0.7): boolean {
    for (const existing of existingPairs) {
      const corr = this.getCorrelation(newPair, existing);
      if (Math.abs(corr) > threshold) return true;
    }
    return false;
  }

  /** Get average portfolio correlation */
  getPortfolioCorrelation(pairs: string[]): number {
    if (pairs.length < 2) return 0;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        sum += this.getCorrelation(pairs[i], pairs[j]);
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private makeKey(pairA: string, pairB: string): string {
    return pairA < pairB ? `${pairA}:${pairB}` : `${pairB}:${pairA}`;
  }
}
