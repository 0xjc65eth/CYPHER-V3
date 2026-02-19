/**
 * Alert Engine - Evaluates alerts and triggers notifications
 */

export type AlertType = 'price' | 'volume' | 'whale' | 'milestone' | 'trend';
export type AlertStatus = 'active' | 'inactive' | 'triggered';
export type PriceCondition = 'above' | 'below' | 'crosses_above' | 'crosses_below';
export type TrendCondition = 'breakout' | 'breakdown' | 'bullish_reversal' | 'bearish_reversal';

export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  status: AlertStatus;

  // Asset identification
  asset: string; // BTC, ETH, or Ordinals collection/Rune ticker
  assetType: 'crypto' | 'ordinal' | 'rune' | 'brc20';

  // Alert conditions
  condition: string;
  targetValue?: number;
  percentage?: number; // For volume spikes, price changes

  // Metadata
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  triggeredAt?: number;
  triggerCount: number;

  // Notification settings
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;

  // Expiry
  expiresAt?: number;
  oneTime: boolean; // If true, disable after first trigger
}

export interface PriceAlert extends Alert {
  type: 'price';
  condition: PriceCondition;
  targetPrice: number;
  lastPrice?: number; // Track for crosses detection
}

export interface VolumeAlert extends Alert {
  type: 'volume';
  multiplier: number; // e.g., 2 = 2x average volume
  timeframe: '1h' | '24h' | '7d';
  baselineVolume?: number;
}

export interface WhaleAlert extends Alert {
  type: 'whale';
  threshold: number; // Minimum transaction size in USD
  direction: 'buy' | 'sell' | 'both';
}

export interface MilestoneAlert extends Alert {
  type: 'milestone';
  milestone: 'ath' | 'atl' | 'new_high' | 'new_low';
  timeframe: '24h' | '7d' | '30d' | 'all';
}

export interface TrendAlert extends Alert {
  type: 'trend';
  trendType: TrendCondition;
  sensitivity: 'low' | 'medium' | 'high';
}

export type AlertUnion = PriceAlert | VolumeAlert | WhaleAlert | MilestoneAlert | TrendAlert;

export interface MarketData {
  price: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  ath?: number;
  atl?: number;
  timestamp: number;
}

export interface AlertTrigger {
  alertId: string;
  triggeredAt: number;
  currentValue: number;
  targetValue: number;
  message: string;
  data?: Record<string, any>;
}

/**
 * Alert Engine Class
 */
export class AlertEngine {
  private alerts: Map<string, AlertUnion> = new Map();
  private marketDataCache: Map<string, MarketData> = new Map();
  private triggerCallbacks: Array<(trigger: AlertTrigger) => void> = [];

  /**
   * Register alerts to monitor
   */
  registerAlerts(alerts: AlertUnion[]): void {
    alerts.forEach(alert => {
      if (alert.status === 'active') {
        this.alerts.set(alert.id, alert);
      }
    });
  }

  /**
   * Unregister an alert
   */
  unregisterAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Add callback for alert triggers
   */
  onTrigger(callback: (trigger: AlertTrigger) => void): void {
    this.triggerCallbacks.push(callback);
  }

  /**
   * Update market data and evaluate alerts
   */
  async updateMarketData(asset: string, data: MarketData): Promise<AlertTrigger[]> {
    this.marketDataCache.set(asset, data);

    const triggers: AlertTrigger[] = [];

    // Find all alerts for this asset
    for (const alert of this.alerts.values()) {
      if (alert.asset === asset && alert.status === 'active') {
        const trigger = await this.evaluateAlert(alert, data);
        if (trigger) {
          triggers.push(trigger);
          this.notifyTrigger(trigger);

          // Handle one-time alerts
          if (alert.oneTime) {
            alert.status = 'inactive';
          } else {
            alert.status = 'triggered';
          }

          alert.triggeredAt = Date.now();
          alert.triggerCount++;
        }
      }
    }

    return triggers;
  }

  /**
   * Evaluate a single alert
   */
  private async evaluateAlert(alert: AlertUnion, data: MarketData): Promise<AlertTrigger | null> {
    switch (alert.type) {
      case 'price':
        return this.evaluatePriceAlert(alert as PriceAlert, data);
      case 'volume':
        return this.evaluateVolumeAlert(alert as VolumeAlert, data);
      case 'whale':
        return this.evaluateWhaleAlert(alert as WhaleAlert, data);
      case 'milestone':
        return this.evaluateMilestoneAlert(alert as MilestoneAlert, data);
      case 'trend':
        return this.evaluateTrendAlert(alert as TrendAlert, data);
      default:
        return null;
    }
  }

  /**
   * Evaluate price alerts
   */
  private evaluatePriceAlert(alert: PriceAlert, data: MarketData): AlertTrigger | null {
    const currentPrice = data.price;
    const targetPrice = alert.targetPrice;
    const lastPrice = alert.lastPrice || currentPrice;

    let triggered = false;
    let message = '';

    switch (alert.condition) {
      case 'above':
        triggered = currentPrice > targetPrice;
        message = `${alert.asset} is now above $${targetPrice.toLocaleString()} at $${currentPrice.toLocaleString()}`;
        break;

      case 'below':
        triggered = currentPrice < targetPrice;
        message = `${alert.asset} is now below $${targetPrice.toLocaleString()} at $${currentPrice.toLocaleString()}`;
        break;

      case 'crosses_above':
        triggered = lastPrice <= targetPrice && currentPrice > targetPrice;
        message = `${alert.asset} crossed above $${targetPrice.toLocaleString()} - now at $${currentPrice.toLocaleString()}`;
        break;

      case 'crosses_below':
        triggered = lastPrice >= targetPrice && currentPrice < targetPrice;
        message = `${alert.asset} crossed below $${targetPrice.toLocaleString()} - now at $${currentPrice.toLocaleString()}`;
        break;
    }

    // Update last price for next evaluation
    (alert as PriceAlert).lastPrice = currentPrice;

    if (triggered) {
      return {
        alertId: alert.id,
        triggeredAt: Date.now(),
        currentValue: currentPrice,
        targetValue: targetPrice,
        message,
        data: {
          priceChange24h: data.priceChange24h,
          volume24h: data.volume24h,
        },
      };
    }

    return null;
  }

  /**
   * Evaluate volume spike alerts
   */
  private evaluateVolumeAlert(alert: VolumeAlert, data: MarketData): AlertTrigger | null {
    const currentVolume = data.volume24h;
    const baselineVolume = alert.baselineVolume || 0;

    if (baselineVolume === 0) {
      // First time - set baseline
      (alert as VolumeAlert).baselineVolume = currentVolume;
      return null;
    }

    const volumeMultiplier = currentVolume / baselineVolume;

    if (volumeMultiplier >= alert.multiplier) {
      return {
        alertId: alert.id,
        triggeredAt: Date.now(),
        currentValue: currentVolume,
        targetValue: baselineVolume * alert.multiplier,
        message: `${alert.asset} volume spike detected: ${volumeMultiplier.toFixed(1)}x baseline (${currentVolume.toLocaleString()} vs ${baselineVolume.toLocaleString()})`,
        data: {
          volumeMultiplier,
          baselineVolume,
          currentVolume,
        },
      };
    }

    return null;
  }

  /**
   * Evaluate whale movement alerts
   */
  private evaluateWhaleAlert(alert: WhaleAlert, data: MarketData): AlertTrigger | null {
    // This would require transaction monitoring
    // For now, we'll return null and implement when we have tx data
    // In production, this would monitor mempool or recent transactions
    return null;
  }

  /**
   * Evaluate milestone alerts (ATH/ATL)
   */
  private evaluateMilestoneAlert(alert: MilestoneAlert, data: MarketData): AlertTrigger | null {
    const currentPrice = data.price;

    switch (alert.milestone) {
      case 'ath':
        if (data.ath && currentPrice >= data.ath) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: currentPrice,
            targetValue: data.ath,
            message: `${alert.asset} reached new ALL-TIME HIGH: $${currentPrice.toLocaleString()}`,
            data: {
              previousATH: data.ath,
            },
          };
        }
        break;

      case 'atl':
        if (data.atl && currentPrice <= data.atl) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: currentPrice,
            targetValue: data.atl,
            message: `${alert.asset} reached new ALL-TIME LOW: $${currentPrice.toLocaleString()}`,
            data: {
              previousATL: data.atl,
            },
          };
        }
        break;

      case 'new_high':
        if (currentPrice >= data.high24h) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: currentPrice,
            targetValue: data.high24h,
            message: `${alert.asset} reached new 24h HIGH: $${currentPrice.toLocaleString()}`,
          };
        }
        break;

      case 'new_low':
        if (currentPrice <= data.low24h) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: currentPrice,
            targetValue: data.low24h,
            message: `${alert.asset} reached new 24h LOW: $${currentPrice.toLocaleString()}`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Evaluate trend change alerts
   */
  private evaluateTrendAlert(alert: TrendAlert, data: MarketData): AlertTrigger | null {
    // This would require historical price data and technical analysis
    // For now, simplified implementation based on price change
    const priceChange = data.priceChange24h;

    const thresholds = {
      low: 5,
      medium: 3,
      high: 2,
    };

    const threshold = thresholds[alert.sensitivity];

    switch (alert.trendType) {
      case 'breakout':
        if (priceChange > threshold) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: priceChange,
            targetValue: threshold,
            message: `${alert.asset} BREAKOUT detected: +${priceChange.toFixed(2)}% in 24h`,
            data: {
              priceChange,
              price: data.price,
            },
          };
        }
        break;

      case 'breakdown':
        if (priceChange < -threshold) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: priceChange,
            targetValue: -threshold,
            message: `${alert.asset} BREAKDOWN detected: ${priceChange.toFixed(2)}% in 24h`,
            data: {
              priceChange,
              price: data.price,
            },
          };
        }
        break;

      case 'bullish_reversal':
        // Simplified: detect strong positive change after negative period
        if (priceChange > threshold) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: priceChange,
            targetValue: threshold,
            message: `${alert.asset} BULLISH REVERSAL: +${priceChange.toFixed(2)}% momentum`,
          };
        }
        break;

      case 'bearish_reversal':
        // Simplified: detect strong negative change
        if (priceChange < -threshold) {
          return {
            alertId: alert.id,
            triggeredAt: Date.now(),
            currentValue: priceChange,
            targetValue: -threshold,
            message: `${alert.asset} BEARISH REVERSAL: ${priceChange.toFixed(2)}% decline`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Notify all registered callbacks
   */
  private notifyTrigger(trigger: AlertTrigger): void {
    this.triggerCallbacks.forEach(callback => {
      try {
        callback(trigger);
      } catch (error) {
        console.error('Alert trigger callback error:', error);
      }
    });
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AlertUnion[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Get alerts for a specific asset
   */
  getAlertsForAsset(asset: string): AlertUnion[] {
    return Array.from(this.alerts.values()).filter(alert => alert.asset === asset);
  }
}

// Singleton instance
export const alertEngine = new AlertEngine();
