import { ArbitrageOpportunity, ArbitrageConfig } from './ArbitrageEngine';
import { logger } from './utils/logger';

export interface RiskLimits {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxConcurrentTrades: number;
  maxExposurePerExchange: number;
  maxDrawdown: number;
  volatilityThreshold: number;
}

export interface TradeMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  totalLoss: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  currentDrawdown: number;
  maxDrawdown: number;
  winRate: number;
}

export interface ExposureData {
  exchange: string;
  symbol: string;
  position: number;
  value: number;
  timestamp: number;
}

export class RiskManager {
  private riskLimits: RiskLimits;
  private currentExposures: Map<string, ExposureData[]> = new Map();
  private activeTrades: Set<string> = new Set();
  private tradeHistory: any[] = [];
  private metrics: TradeMetrics;
  private volatilityData: Map<string, number[]> = new Map();
  private lastPrices: Map<string, number> = new Map();
  private circuitBreakers: Map<string, boolean> = new Map();

  constructor(private config: ArbitrageConfig) {
    this.riskLimits = this.initializeRiskLimits();
    this.metrics = this.initializeMetrics();
    this.setupCircuitBreakers();
  }

  private initializeRiskLimits(): RiskLimits {
    const baseRisk = this.config.riskLevel;
    
    switch (baseRisk) {
      case 'CONSERVATIVE':
        return {
          maxDailyLoss: 1000, // $1000
          maxPositionSize: 5000, // $5000
          maxConcurrentTrades: 3,
          maxExposurePerExchange: 10000, // $10000
          maxDrawdown: 5, // 5%
          volatilityThreshold: 0.02 // 2%
        };
      case 'MODERATE':
        return {
          maxDailyLoss: 2500,
          maxPositionSize: 10000,
          maxConcurrentTrades: 5,
          maxExposurePerExchange: 25000,
          maxDrawdown: 10,
          volatilityThreshold: 0.03
        };
      case 'AGGRESSIVE':
        return {
          maxDailyLoss: 5000,
          maxPositionSize: 20000,
          maxConcurrentTrades: 10,
          maxExposurePerExchange: 50000,
          maxDrawdown: 15,
          volatilityThreshold: 0.05
        };
      default:
        return this.initializeRiskLimits();
    }
  }

  private initializeMetrics(): TradeMetrics {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      currentDrawdown: 0,
      maxDrawdown: 0,
      winRate: 0
    };
  }

  private setupCircuitBreakers(): void {
    // Initialize circuit breakers for each exchange
    this.config.enabledExchanges.forEach(exchange => {
      this.circuitBreakers.set(exchange, false);
    });
  }

  calculatePositionSize(symbol: string, price: number): number {
    try {
      // Base position size calculation
      let baseSize = Math.min(
        this.config.maxPositionSize,
        this.riskLimits.maxPositionSize
      );

      // Adjust for volatility
      const volatility = this.getSymbolVolatility(symbol);
      if (volatility > this.riskLimits.volatilityThreshold) {
        baseSize *= (1 - Math.min(volatility, 0.5)); // Reduce size for high volatility
      }

      // Adjust for current drawdown
      if (this.metrics.currentDrawdown > 0) {
        const drawdownFactor = 1 - (this.metrics.currentDrawdown / 100) * 0.5;
        baseSize *= Math.max(drawdownFactor, 0.3); // Minimum 30% of base size
      }

      // Convert to number of units
      const positionSize = Math.floor(baseSize / price);

      logger.debug(`Calculated position size for ${symbol}:`, {
        baseSize,
        price,
        positionSize,
        volatility,
        drawdown: this.metrics.currentDrawdown
      });

      return positionSize;

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error calculating position size:');
      return 0;
    }
  }

  assessRisk(symbol: string, spread: number, positionSize: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    try {
      let riskScore = 0;

      // Volatility risk
      const volatility = this.getSymbolVolatility(symbol);
      if (volatility > this.riskLimits.volatilityThreshold) {
        riskScore += 30;
      } else if (volatility > this.riskLimits.volatilityThreshold * 0.7) {
        riskScore += 15;
      }

      // Spread risk (very narrow spreads are riskier)
      const spreadPercentage = (spread / (this.lastPrices.get(symbol) || 1)) * 100;
      if (spreadPercentage < 0.1) {
        riskScore += 25;
      } else if (spreadPercentage < 0.2) {
        riskScore += 10;
      }

      // Position size risk
      const positionValue = positionSize * (this.lastPrices.get(symbol) || 0);
      if (positionValue > this.riskLimits.maxPositionSize * 0.8) {
        riskScore += 20;
      } else if (positionValue > this.riskLimits.maxPositionSize * 0.5) {
        riskScore += 10;
      }

      // Current performance risk
      if (this.metrics.currentDrawdown > this.riskLimits.maxDrawdown * 0.7) {
        riskScore += 25;
      }

      // Market conditions risk
      if (this.isHighVolatilityPeriod()) {
        riskScore += 15;
      }

      // Determine final risk level
      if (riskScore >= 50) return 'HIGH';
      if (riskScore >= 25) return 'MEDIUM';
      return 'LOW';

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error assessing risk:');
      return 'HIGH'; // Default to high risk on error
    }
  }

  canExecuteTrade(opportunity: ArbitrageOpportunity): boolean {
    try {
      // Check circuit breakers
      if (this.circuitBreakers.get(opportunity.buyExchange) || 
          this.circuitBreakers.get(opportunity.sellExchange)) {
        logger.warn('Circuit breaker active for exchange');
        return false;
      }

      // Check daily loss limit
      if (Math.abs(this.metrics.dailyPnL) >= this.riskLimits.maxDailyLoss) {
        logger.warn('Daily loss limit reached');
        return false;
      }

      // Check maximum concurrent trades
      if (this.activeTrades.size >= this.riskLimits.maxConcurrentTrades) {
        logger.warn('Maximum concurrent trades limit reached');
        return false;
      }

      // Check drawdown limit
      if (this.metrics.currentDrawdown >= this.riskLimits.maxDrawdown) {
        logger.warn('Maximum drawdown limit reached');
        return false;
      }

      // Check exchange exposure limits
      const buyExposure = this.getExchangeExposure(opportunity.buyExchange);
      const sellExposure = this.getExchangeExposure(opportunity.sellExchange);
      const tradeValue = opportunity.volume * opportunity.buyPrice;

      if (buyExposure + tradeValue > this.riskLimits.maxExposurePerExchange ||
          sellExposure + tradeValue > this.riskLimits.maxExposurePerExchange) {
        logger.warn('Exchange exposure limit would be exceeded');
        return false;
      }

      // Check symbol volatility
      const volatility = this.getSymbolVolatility(opportunity.pair);
      if (volatility > this.riskLimits.volatilityThreshold && opportunity.risk === 'HIGH') {
        logger.warn('High volatility and high risk combination rejected');
        return false;
      }

      return true;

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error checking trade execution eligibility:');
      return false;
    }
  }

  recordExecution(opportunity: ArbitrageOpportunity): void {
    try {
      // Add to active trades
      this.activeTrades.add(opportunity.id);

      // Update exposures
      this.updateExposure(opportunity.buyExchange, opportunity.pair, 
                         opportunity.volume, opportunity.buyPrice);
      this.updateExposure(opportunity.sellExchange, opportunity.pair, 
                         -opportunity.volume, opportunity.sellPrice);

      // Record trade for metrics
      const trade = {
        id: opportunity.id,
        timestamp: Date.now(),
        pair: opportunity.pair,
        profit: opportunity.estimatedProfit,
        risk: opportunity.risk,
        executed: true
      };

      this.tradeHistory.push(trade);
      this.updateMetrics();

      logger.info(`Recorded trade execution: ${opportunity.id}`);

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error recording execution:');
    }
  }

  recordTradeResult(tradeId: string, actualProfit: number, success: boolean): void {
    try {
      // Remove from active trades
      this.activeTrades.delete(tradeId);

      // Update trade history
      const trade = this.tradeHistory.find(t => t.id === tradeId);
      if (trade) {
        trade.actualProfit = actualProfit;
        trade.success = success;
        trade.completedAt = Date.now();
      }

      // Update metrics
      this.updateMetrics();

      // Check for circuit breaker conditions
      this.checkCircuitBreakers();

      logger.info(`Recorded trade result: ${tradeId}, profit: ${actualProfit}`);

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error recording trade result:');
    }
  }

  private updateExposure(exchange: string, symbol: string, volume: number, price: number): void {
    if (!this.currentExposures.has(exchange)) {
      this.currentExposures.set(exchange, []);
    }

    const exposures = this.currentExposures.get(exchange)!;
    const existingExposure = exposures.find(e => e.symbol === symbol);

    if (existingExposure) {
      existingExposure.position += volume;
      existingExposure.value = existingExposure.position * price;
      existingExposure.timestamp = Date.now();
    } else {
      exposures.push({
        exchange,
        symbol,
        position: volume,
        value: volume * price,
        timestamp: Date.now()
      });
    }
  }

  private getExchangeExposure(exchange: string): number {
    const exposures = this.currentExposures.get(exchange) || [];
    return exposures.reduce((total, exposure) => total + Math.abs(exposure.value), 0);
  }

  private getSymbolVolatility(symbol: string): number {
    const prices = this.volatilityData.get(symbol) || [];
    if (prices.length < 2) return 0;

    // Calculate standard deviation of price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
    
    return Math.sqrt(variance);
  }

  private isHighVolatilityPeriod(): boolean {
    // Check if multiple symbols are showing high volatility
    let highVolatilityCount = 0;
    const totalSymbols = this.volatilityData.size;

    for (const [symbol] of this.volatilityData) {
      if (this.getSymbolVolatility(symbol) > this.riskLimits.volatilityThreshold) {
        highVolatilityCount++;
      }
    }

    return totalSymbols > 0 && (highVolatilityCount / totalSymbols) > 0.5;
  }

  private updateMetrics(): void {
    const recentTrades = this.tradeHistory.filter(t => t.completedAt);
    
    this.metrics.totalTrades = recentTrades.length;
    this.metrics.successfulTrades = recentTrades.filter(t => t.success).length;
    this.metrics.failedTrades = this.metrics.totalTrades - this.metrics.successfulTrades;
    this.metrics.winRate = this.metrics.totalTrades > 0 ? 
      this.metrics.successfulTrades / this.metrics.totalTrades : 0;

    // Calculate PnL
    const profits = recentTrades.map(t => t.actualProfit || 0);
    this.metrics.totalProfit = profits.filter(p => p > 0).reduce((sum, p) => sum + p, 0);
    this.metrics.totalLoss = Math.abs(profits.filter(p => p < 0).reduce((sum, p) => sum + p, 0));

    // Calculate time-based PnL
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    this.metrics.dailyPnL = recentTrades
      .filter(t => now - (t.completedAt || 0) < dayMs)
      .reduce((sum, t) => sum + (t.actualProfit || 0), 0);

    this.metrics.weeklyPnL = recentTrades
      .filter(t => now - (t.completedAt || 0) < weekMs)
      .reduce((sum, t) => sum + (t.actualProfit || 0), 0);

    this.metrics.monthlyPnL = recentTrades
      .filter(t => now - (t.completedAt || 0) < monthMs)
      .reduce((sum, t) => sum + (t.actualProfit || 0), 0);

    // Calculate drawdown
    this.calculateDrawdown();
  }

  private calculateDrawdown(): void {
    const runningPnL: number[] = [];
    let cumulative = 0;

    // Calculate cumulative PnL over time
    this.tradeHistory
      .filter(t => t.completedAt)
      .sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0))
      .forEach(trade => {
        cumulative += trade.actualProfit || 0;
        runningPnL.push(cumulative);
      });

    if (runningPnL.length === 0) {
      this.metrics.currentDrawdown = 0;
      return;
    }

    // Find peak and current drawdown
    let peak = runningPnL[0];
    let maxDrawdown = 0;
    let currentDrawdown = 0;

    runningPnL.forEach(pnl => {
      if (pnl > peak) {
        peak = pnl;
      }
      
      const drawdown = ((peak - pnl) / Math.abs(peak)) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    const currentPnL = runningPnL[runningPnL.length - 1];
    const currentPeak = Math.max(...runningPnL);
    currentDrawdown = currentPeak > 0 ? ((currentPeak - currentPnL) / currentPeak) * 100 : 0;

    this.metrics.currentDrawdown = currentDrawdown;
    this.metrics.maxDrawdown = Math.max(this.metrics.maxDrawdown, maxDrawdown);
  }

  private checkCircuitBreakers(): void {
    // Activate circuit breakers based on performance
    if (this.metrics.currentDrawdown >= this.riskLimits.maxDrawdown * 0.8) {
      // Temporarily halt trading on all exchanges
      this.config.enabledExchanges.forEach(exchange => {
        this.circuitBreakers.set(exchange, true);
      });

      // Auto-disable after cooling period
      setTimeout(() => {
        this.config.enabledExchanges.forEach(exchange => {
          this.circuitBreakers.set(exchange, false);
        });
      }, 5 * 60 * 1000); // 5 minutes

      logger.warn('Circuit breakers activated due to high drawdown');
    }
  }

  updatePriceData(symbol: string, price: number): void {
    this.lastPrices.set(symbol, price);

    // Update volatility data
    if (!this.volatilityData.has(symbol)) {
      this.volatilityData.set(symbol, []);
    }

    const prices = this.volatilityData.get(symbol)!;
    prices.push(price);

    // Keep only last 100 prices for volatility calculation
    if (prices.length > 100) {
      prices.shift();
    }
  }

  updateConfig(config: ArbitrageConfig): void {
    this.config = config;
    this.riskLimits = this.initializeRiskLimits();
  }

  // Getters
  getMetrics(): TradeMetrics {
    return { ...this.metrics };
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  getActiveTradesCount(): number {
    return this.activeTrades.size;
  }

  getExchangeExposures(): Map<string, number> {
    const exposures = new Map<string, number>();
    for (const [exchange] of this.currentExposures) {
      exposures.set(exchange, this.getExchangeExposure(exchange));
    }
    return exposures;
  }

  isCircuitBreakerActive(exchange: string): boolean {
    return this.circuitBreakers.get(exchange) || false;
  }

  getSystemHealth(): any {
    return {
      metrics: this.getMetrics(),
      riskLimits: this.getRiskLimits(),
      activeTradesCount: this.getActiveTradesCount(),
      exchangeExposures: Object.fromEntries(this.getExchangeExposures()),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      volatilityStatus: this.isHighVolatilityPeriod() ? 'HIGH' : 'NORMAL'
    };
  }
}

export default RiskManager;