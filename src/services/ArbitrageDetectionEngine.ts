/**
 * Advanced Arbitrage Detection Engine
 * Real-time cross-exchange arbitrage opportunity detection with ML-enhanced algorithms
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { exchangeService, ArbitrageOpportunity, ExchangePrice } from './exchanges';

export interface ArbitrageConfig {
  minProfitPercent: number;
  maxRiskLevel: 'low' | 'medium' | 'high';
  minConfidence: number;
  maxExecutionTime: number; // seconds
  minLiquidity: number;
  enabledSymbols: string[];
  enabledExchanges: string[];
  notificationThresholds: {
    highProfit: number; // %
    lowRisk: number; // confidence score
  };
}

export interface OpportunityAlert {
  id: string;
  type: 'high_profit' | 'low_risk' | 'volume_surge' | 'new_opportunity';
  opportunity: ArbitrageOpportunity;
  message: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ArbitragePerformance {
  totalOpportunities: number;
  executedTrades: number;
  successfulTrades: number;
  totalProfit: number;
  averageProfit: number;
  successRate: number;
  averageExecutionTime: number;
  profitByExchange: Record<string, number>;
  profitBySymbol: Record<string, number>;
  riskDistribution: Record<string, number>;
  dailyStats: {
    date: string;
    opportunities: number;
    profit: number;
    trades: number;
  }[];
}

export interface TriangularArbitrageOpportunity {
  id: string;
  path: [string, string, string]; // e.g., ['BTC', 'ETH', 'USDT']
  exchanges: [string, string, string];
  prices: [number, number, number];
  profit: number;
  profitPercent: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  executionTime: number;
  timestamp: number;
}

class ArbitrageDetectionEngine extends EventEmitter {
  private config: ArbitrageConfig;
  private isActive = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private performanceData: ArbitragePerformance;
  private alertHistory: OpportunityAlert[] = [];
  private priceHistory: Map<string, ExchangePrice[]> = new Map();
  private opportunityHistory: ArbitrageOpportunity[] = [];

  constructor() {
    super();
    
    this.config = {
      minProfitPercent: 0.5,
      maxRiskLevel: 'medium',
      minConfidence: 60,
      maxExecutionTime: 300, // 5 minutes
      minLiquidity: 10000, // $10k
      enabledSymbols: ['BTC', 'ETH', 'SOL', 'AVAX'],
      enabledExchanges: ['binance', 'hyperliquid', 'coinbase', 'okx', 'kraken'],
      notificationThresholds: {
        highProfit: 3.0, // 3%
        lowRisk: 85 // 85% confidence
      }
    };

    this.performanceData = {
      totalOpportunities: 0,
      executedTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      averageProfit: 0,
      successRate: 0,
      averageExecutionTime: 0,
      profitByExchange: {},
      profitBySymbol: {},
      riskDistribution: { low: 0, medium: 0, high: 0 },
      dailyStats: []
    };

    this.initializeDetectionEngine();
  }

  private initializeDetectionEngine() {
    // Listen to exchange service events
    exchangeService.on('opportunitiesUpdated', (opportunities: ArbitrageOpportunity[]) => {
      this.processOpportunities(opportunities);
    });

    exchangeService.on('executionCompleted', (result) => {
      this.updatePerformanceMetrics(result);
    });
  }

  /**
   * Start the arbitrage detection engine
   */
  public async start(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    this.emit('engineStarted');

    // Start exchange service scanning
    exchangeService.startScanning(3000); // 3-second intervals for high-frequency detection

    // Start advanced detection algorithms
    this.startAdvancedDetection();

    // Engine started
  }

  /**
   * Stop the arbitrage detection engine
   */
  public stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    exchangeService.stopScanning();

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.emit('engineStopped');
    // Engine stopped
  }

  /**
   * Start advanced detection algorithms
   */
  private startAdvancedDetection(): void {
    this.detectionInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        // Run multiple detection algorithms in parallel
        await Promise.all([
          this.detectCrossExchangeArbitrage(),
          this.detectTriangularArbitrage(),
          this.detectPriceAnomalies(),
          this.analyzeMarketMomentum()
        ]);
      } catch (error) {
        console.error('Advanced detection error:', error);
        this.emit('detectionError', error);
      }
    }, 5000); // Run every 5 seconds
  }

  /**
   * Enhanced cross-exchange arbitrage detection
   */
  private async detectCrossExchangeArbitrage(): Promise<void> {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const symbol of this.config.enabledSymbols) {
      try {
        const symbolOpportunities = await exchangeService.detectArbitrageOpportunities(symbol);
        const filteredOpportunities = this.filterOpportunities(symbolOpportunities);
        opportunities.push(...filteredOpportunities);
      } catch (error) {
        console.error(`Cross-exchange detection error for ${symbol}:`, error);
      }
    }

    if (opportunities.length > 0) {
      this.emit('crossExchangeOpportunities', opportunities);
      this.checkForAlerts(opportunities);
    }
  }

  /**
   * Detect triangular arbitrage opportunities
   */
  private async detectTriangularArbitrage(): Promise<void> {
    const opportunities: TriangularArbitrageOpportunity[] = [];

    // Common triangular paths
    const triangularPaths = [
      ['BTC', 'ETH', 'USDT'],
      ['BTC', 'SOL', 'USDT'],
      ['ETH', 'SOL', 'USDT'],
      ['BTC', 'AVAX', 'USDT']
    ];

    for (const path of triangularPaths) {
      try {
        const opportunity = await this.calculateTriangularArbitrage(path);
        if (opportunity && opportunity.profitPercent > this.config.minProfitPercent) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Triangular arbitrage error for path ${path.join('->')}:`, error);
      }
    }

    if (opportunities.length > 0) {
      this.emit('triangularOpportunities', opportunities);
    }
  }

  /**
   * Calculate triangular arbitrage opportunity
   */
  private async calculateTriangularArbitrage(path: string[]): Promise<TriangularArbitrageOpportunity | null> {
    const [base, quote, settlement] = path;
    
    // Get prices for all three pairs
    const prices = await Promise.all([
      exchangeService.getAllPrices(base),
      exchangeService.getAllPrices(quote),
      exchangeService.getAllPrices(settlement)
    ]);

    if (prices.some(p => p.length === 0)) return null;

    // Find best exchange combination
    let bestProfit = 0;
    let bestOpportunity: TriangularArbitrageOpportunity | null = null;

    for (const basePrice of prices[0]) {
      for (const quotePrice of prices[1]) {
        for (const settlementPrice of prices[2]) {
          const profit = this.calculateTriangularProfit(
            basePrice.price,
            quotePrice.price,
            settlementPrice.price
          );

          if (profit > bestProfit) {
            bestProfit = profit;
            bestOpportunity = {
              id: `tri_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
              path: [base, quote, settlement],
              exchanges: [basePrice.source, quotePrice.source, settlementPrice.source],
              prices: [basePrice.price, quotePrice.price, settlementPrice.price],
              profit,
              profitPercent: (profit / basePrice.price) * 100,
              confidence: this.calculateTriangularConfidence(basePrice, quotePrice, settlementPrice),
              riskLevel: profit > 0.02 ? 'low' : profit > 0.01 ? 'medium' : 'high',
              executionTime: 120, // Estimated 2 minutes for triangular arbitrage
              timestamp: Date.now()
            };
          }
        }
      }
    }

    return bestOpportunity;
  }

  /**
   * Calculate triangular arbitrage profit
   */
  private calculateTriangularProfit(price1: number, price2: number, price3: number): number {
    // Simplified triangular arbitrage calculation
    // In practice, this would involve more complex pair calculations
    const forward = 1 / price1 * price2 / price3;
    const backward = price3 / price2 * price1;
    
    return Math.max(forward - 1, backward - 1);
  }

  /**
   * Calculate confidence for triangular arbitrage
   */
  private calculateTriangularConfidence(
    price1: ExchangePrice,
    price2: ExchangePrice,
    price3: ExchangePrice
  ): number {
    let confidence = 50;
    
    // Volume factor
    const avgVolume = (price1.volume24h + price2.volume24h + price3.volume24h) / 3;
    if (avgVolume > 1000) confidence += 20;
    
    // Price freshness
    const maxAge = Math.max(
      Date.now() - price1.timestamp,
      Date.now() - price2.timestamp,
      Date.now() - price3.timestamp
    );
    if (maxAge < 30000) confidence += 15;
    
    // Exchange reliability
    const reliableExchanges = ['binance', 'coinbase', 'kraken'];
    const reliableCount = [price1.source, price2.source, price3.source]
      .filter(src => reliableExchanges.includes(src)).length;
    confidence += reliableCount * 5;
    
    return Math.min(confidence, 100);
  }

  /**
   * Detect price anomalies that might indicate arbitrage opportunities
   */
  private async detectPriceAnomalies(): Promise<void> {
    const anomalies: Array<{
      symbol: string;
      exchange: string;
      currentPrice: number;
      expectedPrice: number;
      deviation: number;
      timestamp: number;
    }> = [];

    for (const symbol of this.config.enabledSymbols) {
      const prices = await exchangeService.getAllPrices(symbol);
      if (prices.length < 3) continue;

      const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
      
      for (const price of prices) {
        const deviation = Math.abs(price.price - avgPrice) / avgPrice;
        if (deviation > 0.02) { // 2% deviation threshold
          anomalies.push({
            symbol,
            exchange: price.source,
            currentPrice: price.price,
            expectedPrice: avgPrice,
            deviation: deviation * 100,
            timestamp: Date.now()
          });
        }
      }
    }

    if (anomalies.length > 0) {
      this.emit('priceAnomalies', anomalies);
    }
  }

  /**
   * Analyze market momentum for better timing
   */
  private async analyzeMarketMomentum(): Promise<void> {
    // TODO: Implement real technical analysis for optimal entry/exit timing
    // Requires real price history data from exchanges to compute momentum indicators
    // For now, skip emitting momentum signals until real TA is implemented
  }

  /**
   * Filter opportunities based on configuration
   */
  private filterOpportunities(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    return opportunities.filter(opp => {
      // Profit threshold
      if (opp.netProfitPercent < this.config.minProfitPercent) return false;
      
      // Confidence threshold
      if (opp.confidence < this.config.minConfidence) return false;
      
      // Risk level
      const riskLevels = { low: 1, medium: 2, high: 3 };
      if (riskLevels[opp.riskLevel] > riskLevels[this.config.maxRiskLevel]) return false;
      
      // Execution time
      if (opp.executionTime > this.config.maxExecutionTime) return false;
      
      // Liquidity
      const minLiquidity = Math.min(opp.liquidity.buy, opp.liquidity.sell);
      if (minLiquidity < this.config.minLiquidity) return false;
      
      // Exchange filter
      if (!this.config.enabledExchanges.includes(opp.buyExchange) || 
          !this.config.enabledExchanges.includes(opp.sellExchange)) return false;
      
      return true;
    });
  }

  /**
   * Check for alert conditions and emit notifications
   */
  private checkForAlerts(opportunities: ArbitrageOpportunity[]): void {
    for (const opportunity of opportunities) {
      const alerts: OpportunityAlert[] = [];

      // High profit alert
      if (opportunity.netProfitPercent >= this.config.notificationThresholds.highProfit) {
        alerts.push({
          id: `alert_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
          type: 'high_profit',
          opportunity,
          message: `High profit opportunity: ${opportunity.netProfitPercent.toFixed(2)}% profit on ${opportunity.symbol}`,
          timestamp: Date.now(),
          priority: 'urgent'
        });
      }

      // Low risk alert
      if (opportunity.confidence >= this.config.notificationThresholds.lowRisk && 
          opportunity.riskLevel === 'low') {
        alerts.push({
          id: `alert_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
          type: 'low_risk',
          opportunity,
          message: `Low risk opportunity: ${opportunity.confidence}% confidence on ${opportunity.symbol}`,
          timestamp: Date.now(),
          priority: 'high'
        });
      }

      // Emit alerts
      for (const alert of alerts) {
        this.alertHistory.push(alert);
        this.emit('opportunityAlert', alert);
      }
    }

    // Keep alert history limited
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }
  }

  /**
   * Process new opportunities
   */
  private processOpportunities(opportunities: ArbitrageOpportunity[]): void {
    this.performanceData.totalOpportunities += opportunities.length;
    
    // Update opportunity history
    this.opportunityHistory.push(...opportunities);
    if (this.opportunityHistory.length > 10000) {
      this.opportunityHistory = this.opportunityHistory.slice(-5000);
    }

    // Update profit distribution by symbol and exchange
    for (const opp of opportunities) {
      this.performanceData.profitBySymbol[opp.symbol] = 
        (this.performanceData.profitBySymbol[opp.symbol] || 0) + opp.netProfit;
      
      this.performanceData.profitByExchange[opp.buyExchange] = 
        (this.performanceData.profitByExchange[opp.buyExchange] || 0) + opp.netProfit / 2;
      
      this.performanceData.profitByExchange[opp.sellExchange] = 
        (this.performanceData.profitByExchange[opp.sellExchange] || 0) + opp.netProfit / 2;
      
      this.performanceData.riskDistribution[opp.riskLevel]++;
    }

    this.emit('performanceUpdated', this.performanceData);
  }

  /**
   * Update performance metrics after trade execution
   */
  private updatePerformanceMetrics(executionResult: any): void {
    this.performanceData.executedTrades++;
    
    if (executionResult.success) {
      this.performanceData.successfulTrades++;
      this.performanceData.totalProfit += executionResult.actualProfit || 0;
    }
    
    this.performanceData.successRate = 
      this.performanceData.successfulTrades / this.performanceData.executedTrades;
    
    this.performanceData.averageProfit = 
      this.performanceData.totalProfit / this.performanceData.successfulTrades;

    this.emit('performanceUpdated', this.performanceData);
  }

  /**
   * Get current configuration
   */
  public getConfig(): ArbitrageConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ArbitrageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get performance data
   */
  public getPerformance(): ArbitragePerformance {
    return { ...this.performanceData };
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 50): OpportunityAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get opportunity history
   */
  public getOpportunityHistory(limit: number = 100): ArbitrageOpportunity[] {
    return this.opportunityHistory.slice(-limit);
  }

  /**
   * Get engine status
   */
  public getStatus(): {
    isActive: boolean;
    uptime: number;
    totalOpportunities: number;
    activeAlerts: number;
    exchangeHealth: Record<string, boolean>;
  } {
    return {
      isActive: this.isActive,
      uptime: Date.now() - (this.performanceData.dailyStats[0]?.date ? 
        new Date(this.performanceData.dailyStats[0].date).getTime() : Date.now()),
      totalOpportunities: this.performanceData.totalOpportunities,
      activeAlerts: this.alertHistory.filter(alert => 
        Date.now() - alert.timestamp < 300000 // 5 minutes
      ).length,
      exchangeHealth: {} // Would be populated by exchange health checks
    };
  }
}

// Export singleton instance
export const arbitrageDetectionEngine = new ArbitrageDetectionEngine();
export default arbitrageDetectionEngine;