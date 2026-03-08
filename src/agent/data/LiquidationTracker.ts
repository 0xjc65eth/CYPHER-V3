/**
 * CYPHER AI Trading Agent - Liquidation Tracker
 * Tracks liquidation events to detect cascade risks,
 * liquidation clusters, and potential reversal zones.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { LiquidationEvent } from './MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface LiquidationCluster {
  pair: string;
  side: 'long' | 'short';
  priceRange: { low: number; high: number };
  totalSizeUSD: number;
  eventCount: number;
  startTime: number;
  endTime: number;
  isCascade: boolean;
}

export interface LiquidationHeatmap {
  pair: string;
  levels: Array<{
    price: number;
    longLiquidationsUSD: number;
    shortLiquidationsUSD: number;
  }>;
  timestamp: number;
}

export interface CascadeAlert {
  pair: string;
  side: 'long' | 'short';
  volumeUSD: number;
  eventCount: number;
  duration: number;
  priceMove: number;    // percentage move during cascade
  severity: 'low' | 'medium' | 'high' | 'extreme';
  timestamp: number;
}

export interface LiquidationTrackerConfig {
  cascadeWindowMs: number;       // time window to detect cascades (default: 60000)
  cascadeThresholdUSD: number;   // min volume for cascade alert (default: 500000)
  cascadeMinEvents: number;      // min events for cascade (default: 5)
  historyRetentionMs: number;    // how long to keep history (default: 24h)
  heatmapBuckets: number;        // price buckets for heatmap (default: 50)
}

const DEFAULT_CONFIG: LiquidationTrackerConfig = {
  cascadeWindowMs: 60000,
  cascadeThresholdUSD: 500000,
  cascadeMinEvents: 5,
  historyRetentionMs: 24 * 60 * 60 * 1000,
  heatmapBuckets: 50,
};

// ============================================================================
// LiquidationTracker
// ============================================================================

export class LiquidationTracker {
  private config: LiquidationTrackerConfig;
  private eventBus: AgentEventBus;

  // pair -> events (bounded)
  private events: Map<string, LiquidationEvent[]> = new Map();
  // Active cascade tracking
  private activeCascades: Map<string, LiquidationCluster> = new Map();
  // Historical cascade alerts
  private cascadeAlerts: CascadeAlert[] = [];
  private maxEvents = 5000;
  private maxAlerts = 200;

  constructor(config?: Partial<LiquidationTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Ingestion
  // ============================================================================

  /** Record a liquidation event */
  recordLiquidation(event: LiquidationEvent): void {
    const pair = event.pair;

    if (!this.events.has(pair)) this.events.set(pair, []);
    const pairEvents = this.events.get(pair)!;
    pairEvents.push(event);

    // Bound events per pair
    if (pairEvents.length > this.maxEvents) {
      this.events.set(pair, pairEvents.slice(-this.maxEvents));
    }

    // Check for cascade
    this.detectCascade(pair, event);
  }

  // ============================================================================
  // Cascade Detection
  // ============================================================================

  private detectCascade(pair: string, newEvent: LiquidationEvent): void {
    const windowStart = Date.now() - this.config.cascadeWindowMs;
    const pairEvents = this.events.get(pair) || [];
    const recentEvents = pairEvents.filter(e => e.timestamp >= windowStart);

    // Group by side
    const longEvents = recentEvents.filter(e => e.side === 'long');
    const shortEvents = recentEvents.filter(e => e.side === 'short');

    for (const [side, events] of [['long', longEvents], ['short', shortEvents]] as const) {
      if (events.length < this.config.cascadeMinEvents) continue;

      const totalSize = events.reduce((sum, e) => sum + e.sizeUSD, 0);
      if (totalSize < this.config.cascadeThresholdUSD) continue;

      const prices = events.map(e => e.price);
      const priceRange = { low: Math.min(...prices), high: Math.max(...prices) };
      const priceMove = priceRange.high > 0
        ? Math.abs(priceRange.high - priceRange.low) / priceRange.high
        : 0;

      const cascadeKey = `${pair}_${side}`;
      const cluster: LiquidationCluster = {
        pair,
        side: side as 'long' | 'short',
        priceRange,
        totalSizeUSD: totalSize,
        eventCount: events.length,
        startTime: events[0].timestamp,
        endTime: events[events.length - 1].timestamp,
        isCascade: true,
      };

      const existing = this.activeCascades.get(cascadeKey);
      this.activeCascades.set(cascadeKey, cluster);

      // Only alert if this is a new cascade or significantly larger
      if (!existing || totalSize > existing.totalSizeUSD * 1.5) {
        const severity = this.classifySeverity(totalSize, events.length, priceMove);

        const alert: CascadeAlert = {
          pair,
          side: side as 'long' | 'short',
          volumeUSD: totalSize,
          eventCount: events.length,
          duration: cluster.endTime - cluster.startTime,
          priceMove,
          severity,
          timestamp: Date.now(),
        };

        this.cascadeAlerts.push(alert);
        if (this.cascadeAlerts.length > this.maxAlerts) {
          this.cascadeAlerts = this.cascadeAlerts.slice(-this.maxAlerts);
        }

        this.eventBus.publish({
          type: 'alpha.liquidation_cascade',
          source: 'LiquidationTracker',
          data: alert,
          timestamp: Date.now(),
          priority: severity === 'extreme' ? 'critical' : severity === 'high' ? 'high' : 'medium',
        });
      }
    }
  }

  private classifySeverity(volumeUSD: number, eventCount: number, priceMove: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (volumeUSD > 10_000_000 || priceMove > 0.05) return 'extreme';
    if (volumeUSD > 5_000_000 || priceMove > 0.03) return 'high';
    if (volumeUSD > 1_000_000 || eventCount > 20) return 'medium';
    return 'low';
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /** Get recent liquidation events for a pair */
  getRecentLiquidations(pair: string, windowMs: number = 300000): LiquidationEvent[] {
    const events = this.events.get(pair) || [];
    const cutoff = Date.now() - windowMs;
    return events.filter(e => e.timestamp >= cutoff);
  }

  /** Get aggregated liquidation volume */
  getLiquidationVolume(pair: string, windowMs: number = 300000): {
    longVolume: number;
    shortVolume: number;
    total: number;
    ratio: number; // long/(long+short), 0.5 = balanced
  } {
    const recent = this.getRecentLiquidations(pair, windowMs);
    const longVol = recent.filter(e => e.side === 'long').reduce((s, e) => s + e.sizeUSD, 0);
    const shortVol = recent.filter(e => e.side === 'short').reduce((s, e) => s + e.sizeUSD, 0);
    const total = longVol + shortVol;

    return {
      longVolume: longVol,
      shortVolume: shortVol,
      total,
      ratio: total > 0 ? longVol / total : 0.5,
    };
  }

  /** Get liquidation heatmap for a pair */
  getLiquidationHeatmap(pair: string, windowMs: number = 3600000): LiquidationHeatmap | null {
    const events = this.events.get(pair) || [];
    const cutoff = Date.now() - windowMs;
    const recent = events.filter(e => e.timestamp >= cutoff);

    if (recent.length === 0) return null;

    const prices = recent.map(e => e.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;

    if (range <= 0) return null;

    const bucketSize = range / this.config.heatmapBuckets;
    const levels: Array<{ price: number; longLiquidationsUSD: number; shortLiquidationsUSD: number }> = [];

    for (let i = 0; i < this.config.heatmapBuckets; i++) {
      const bucketPrice = minPrice + bucketSize * (i + 0.5);
      const bucketLow = minPrice + bucketSize * i;
      const bucketHigh = bucketLow + bucketSize;

      const bucketEvents = recent.filter(e => e.price >= bucketLow && e.price < bucketHigh);
      const longVol = bucketEvents.filter(e => e.side === 'long').reduce((s, e) => s + e.sizeUSD, 0);
      const shortVol = bucketEvents.filter(e => e.side === 'short').reduce((s, e) => s + e.sizeUSD, 0);

      levels.push({
        price: bucketPrice,
        longLiquidationsUSD: longVol,
        shortLiquidationsUSD: shortVol,
      });
    }

    return { pair, levels, timestamp: Date.now() };
  }

  /** Get active cascade alerts */
  getActiveCascades(): LiquidationCluster[] {
    // Filter out stale cascades
    const cutoff = Date.now() - this.config.cascadeWindowMs * 2;
    const active: LiquidationCluster[] = [];

    for (const [key, cluster] of this.activeCascades) {
      if (cluster.endTime >= cutoff) {
        active.push(cluster);
      } else {
        this.activeCascades.delete(key);
      }
    }

    return active;
  }

  /** Get historical cascade alerts */
  getCascadeAlerts(limit: number = 20): CascadeAlert[] {
    return this.cascadeAlerts.slice(-limit);
  }

  /** Estimate liquidation price clusters (potential support/resistance) */
  getLiquidationWalls(pair: string, currentPrice: number, rangePct: number = 0.1): {
    longWalls: Array<{ price: number; estimatedSizeUSD: number }>;
    shortWalls: Array<{ price: number; estimatedSizeUSD: number }>;
  } {
    const events = this.events.get(pair) || [];
    const cutoff = Date.now() - 4 * 60 * 60 * 1000; // last 4 hours
    const recent = events.filter(e => e.timestamp >= cutoff);

    const priceLow = currentPrice * (1 - rangePct);
    const priceHigh = currentPrice * (1 + rangePct);

    const nearbyEvents = recent.filter(e => e.price >= priceLow && e.price <= priceHigh);

    // Cluster nearby liquidations
    const longClusters = this.clusterByPrice(nearbyEvents.filter(e => e.side === 'long'));
    const shortClusters = this.clusterByPrice(nearbyEvents.filter(e => e.side === 'short'));

    return {
      longWalls: longClusters.slice(0, 5),
      shortWalls: shortClusters.slice(0, 5),
    };
  }

  private clusterByPrice(events: LiquidationEvent[]): Array<{ price: number; estimatedSizeUSD: number }> {
    if (events.length === 0) return [];

    // Simple clustering: group events within 0.5% of each other
    const clusters: Array<{ prices: number[]; sizes: number[] }> = [];
    const sorted = [...events].sort((a, b) => a.price - b.price);

    let currentCluster = { prices: [sorted[0].price], sizes: [sorted[0].sizeUSD] };

    for (let i = 1; i < sorted.length; i++) {
      const avgPrice = currentCluster.prices.reduce((s, p) => s + p, 0) / currentCluster.prices.length;
      if (Math.abs(sorted[i].price - avgPrice) / avgPrice < 0.005) {
        currentCluster.prices.push(sorted[i].price);
        currentCluster.sizes.push(sorted[i].sizeUSD);
      } else {
        clusters.push(currentCluster);
        currentCluster = { prices: [sorted[i].price], sizes: [sorted[i].sizeUSD] };
      }
    }
    clusters.push(currentCluster);

    return clusters
      .map(c => ({
        price: c.prices.reduce((s, p) => s + p, 0) / c.prices.length,
        estimatedSizeUSD: c.sizes.reduce((s, sz) => s + sz, 0),
      }))
      .sort((a, b) => b.estimatedSizeUSD - a.estimatedSizeUSD);
  }

  /** Clean up old data */
  cleanup(): void {
    const cutoff = Date.now() - this.config.historyRetentionMs;

    for (const [pair, events] of this.events) {
      const trimmed = events.filter(e => e.timestamp >= cutoff);
      if (trimmed.length === 0) {
        this.events.delete(pair);
      } else {
        this.events.set(pair, trimmed);
      }
    }
  }
}

// Singleton
let liquidationTrackerInstance: LiquidationTracker | null = null;

export function getLiquidationTracker(config?: Partial<LiquidationTrackerConfig>): LiquidationTracker {
  if (!liquidationTrackerInstance) {
    liquidationTrackerInstance = new LiquidationTracker(config);
  }
  return liquidationTrackerInstance;
}
