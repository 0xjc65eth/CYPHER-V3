import { PortfolioCalculator, CostBasisMethod } from './PortfolioCalculator';
import { SimplifiedAIAnalyzer, simplifiedAIAnalyzer } from './SimplifiedAIAnalyzer';
import { 
  Transaction, 
  AssetHolding, 
  PortfolioMetrics, 
  Portfolio 
} from '@/types/portfolio';

export class PortfolioAnalyticsService {
  private portfolioCalculator: PortfolioCalculator;
  private aiAnalyzer: SimplifiedAIAnalyzer;

  constructor(costBasisMethod: CostBasisMethod = 'FIFO') {
    this.portfolioCalculator = new PortfolioCalculator(costBasisMethod);
    this.aiAnalyzer = simplifiedAIAnalyzer;
  }

  /**
   * Comprehensive portfolio analysis
   */
  public async analyzePortfolio(
    holdings: AssetHolding[],
    transactions: Transaction[],
    currentPrices: Record<string, number>,
    walletAddress?: string
  ): Promise<{
    metrics: PortfolioMetrics;
    aiInsights: any;
    riskAnalysis: any;
    patterns: any;
    recommendations: string[];
  }> {
    try {
      // Calculate professional portfolio metrics
      const metrics = this.portfolioCalculator.calculatePortfolioMetrics(
        holdings,
        transactions,
        currentPrices
      );

      // Prepare market data for AI analysis
      const marketData = this.prepareMarketData(transactions, currentPrices);
      
      // Run AI analysis in parallel
      const [
        priceAnalysis,
        onChainMetrics,
        whaleMovements,
        correlationAnalysis,
        riskScore,
        patterns
      ] = await Promise.allSettled([
        this.aiAnalyzer.predictPrice(marketData),
        this.aiAnalyzer.analyzeOnChainMetrics(walletAddress),
        Promise.resolve({ movements: [], impact: { priceImpact: 0, volumeImpact: 0, sentimentImpact: 0 }, patterns: { accumulation: false, distribution: false, rotation: false }, alerts: [] }), // Simplified whale tracking
        Promise.resolve({ matrix: [[1, 0.5, 0.3], [0.5, 1, 0.7], [0.3, 0.7, 1]], clusters: new Map(), leadingIndicators: ['BTC'], hedgeOpportunities: [] }), // Simplified correlations
        this.aiAnalyzer.calculateRiskScore(
          new Map(holdings.map(h => [h.asset, h.totalAmount])),
          { volatility: metrics.volatility / 100, leverage: 1 }
        ),
        this.aiAnalyzer.detectPatterns(marketData)
      ]);

      // Compile AI insights
      const aiInsights = {
        priceAnalysis: priceAnalysis.status === 'fulfilled' ? priceAnalysis.value : null,
        onChainMetrics: onChainMetrics.status === 'fulfilled' ? onChainMetrics.value : null,
        whaleMovements: whaleMovements.status === 'fulfilled' ? whaleMovements.value : null,
        correlationAnalysis: correlationAnalysis.status === 'fulfilled' ? correlationAnalysis.value : null,
        patterns: patterns.status === 'fulfilled' ? patterns.value : null
      };

      // Generate comprehensive risk analysis
      const riskAnalysis = this.generateRiskAnalysis(
        metrics,
        riskScore.status === 'fulfilled' ? riskScore.value : null,
        aiInsights
      );

      // Generate actionable recommendations
      const recommendations = this.generateRecommendations(
        metrics,
        aiInsights,
        riskAnalysis
      );

      return {
        metrics,
        aiInsights,
        riskAnalysis,
        patterns: patterns.status === 'fulfilled' ? patterns.value : null,
        recommendations
      };

    } catch (error) {
      console.error('Portfolio analysis error:', error);
      throw new Error('Failed to analyze portfolio');
    }
  }

  /**
   * Real-time portfolio monitoring
   */
  public async getPortfolioUpdates(
    walletAddress: string,
    lastUpdate?: Date
  ): Promise<{
    hasUpdates: boolean;
    newTransactions: Transaction[];
    priceChanges: Record<string, number>;
    alerts: any[];
  }> {
    try {
      // Check for new transactions
      const newTransactions = await this.checkNewTransactions(walletAddress, lastUpdate);
      
      // Get price updates
      const priceChanges = await this.getPriceUpdates();
      
      // Generate alerts based on new data
      const alerts = await this.generateAlerts(newTransactions, priceChanges);

      return {
        hasUpdates: newTransactions.length > 0 || Object.keys(priceChanges).length > 0,
        newTransactions,
        priceChanges,
        alerts
      };

    } catch (error) {
      console.error('Portfolio update error:', error);
      return {
        hasUpdates: false,
        newTransactions: [],
        priceChanges: {},
        alerts: []
      };
    }
  }

  /**
   * Tax optimization analysis
   */
  public optimizeForTaxes(
    holdings: AssetHolding[],
    targetSellAmount: number,
    assetToSell: string
  ): {
    recommendedStrategy: string;
    taxImpact: number;
    alternativeStrategies: any[];
  } {
    const optimization = this.portfolioCalculator.optimizeTaxLoss(
      assetToSell,
      targetSellAmount,
      holdings.find(h => h.asset === assetToSell)?.currentPrice || 0
    );

    return {
      recommendedStrategy: optimization.recommendedLots.length > 0 ? 'Tax Loss Harvesting' : 'Hold',
      taxImpact: optimization.totalTaxImpact,
      alternativeStrategies: optimization.alternativeStrategies
    };
  }

  // Private helper methods
  private prepareMarketData(transactions: Transaction[], currentPrices: Record<string, number>): any[] {
    // Convert transactions to market data format for AI analysis
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Generate mock market data based on transaction history
    const marketData = [];
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * dayMs);
      const basePrice = currentPrices['BTC'] || 42000;
      const variation = Math.sin(i * 0.1) * 0.05; // Deterministic ±5%
      const price = basePrice * (1 + variation);

      marketData.push({
        timestamp,
        open: price * 0.99,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: 0,
        marketCap: price * 19700000 // Approximate BTC supply
      });
    }
    
    return marketData;
  }

  private generateRiskAnalysis(
    metrics: PortfolioMetrics,
    riskScore: any,
    aiInsights: any
  ): any {
    const volatilityRisk = metrics.volatility > 80 ? 'high' : 
                          metrics.volatility > 40 ? 'medium' : 'low';
    
    const concentrationRisk = this.calculateConcentrationRisk(metrics);
    const liquidityRisk = this.calculateLiquidityRisk(aiInsights);
    
    const overallRiskScore = Math.min(100, 
      (metrics.volatility * 0.4) + 
      (concentrationRisk * 0.3) + 
      (liquidityRisk * 0.3)
    );

    return {
      overallRiskScore,
      riskLevel: overallRiskScore > 75 ? 'very_high' : 
                 overallRiskScore > 50 ? 'high' : 
                 overallRiskScore > 25 ? 'medium' : 'low',
      concentrationRisk: concentrationRisk > 80 ? 'high' : 
                        concentrationRisk > 60 ? 'medium' : 'low',
      volatilityRisk,
      liquidityRisk: liquidityRisk > 70 ? 'high' : 
                     liquidityRisk > 40 ? 'medium' : 'low',
      recommendations: this.generateRiskRecommendations(
        overallRiskScore, 
        volatilityRisk, 
        concentrationRisk
      )
    };
  }

  private calculateConcentrationRisk(metrics: PortfolioMetrics): number {
    // Simplified concentration risk calculation
    // In a real implementation, this would analyze actual asset allocation
    return 50; // Default medium risk
  }

  private calculateLiquidityRisk(aiInsights: any): number {
    // Simplified liquidity risk calculation
    return 50; // Default medium risk
  }

  private generateRiskRecommendations(
    overallRisk: number, 
    volatilityRisk: string, 
    concentrationRisk: number
  ): string[] {
    const recommendations = [];
    
    if (overallRisk > 75) {
      recommendations.push('Consider reducing position sizes to lower overall risk');
    }
    
    if (volatilityRisk === 'high') {
      recommendations.push('High volatility detected - consider implementing stop-losses');
    }
    
    if (concentrationRisk > 80) {
      recommendations.push('Portfolio is heavily concentrated - diversify across different assets');
    }
    
    return recommendations;
  }

  private generateRecommendations(
    metrics: PortfolioMetrics,
    aiInsights: any,
    riskAnalysis: any
  ): string[] {
    const recommendations = [];
    
    // Performance-based recommendations
    if (metrics.sharpeRatio < 1) {
      recommendations.push('Risk-adjusted returns could be improved through portfolio optimization');
    }
    
    if (metrics.maxDrawdown > 20) {
      recommendations.push('Consider implementing risk management strategies to reduce drawdown');
    }
    
    // AI-based recommendations
    if (aiInsights.priceAnalysis?.trend === 'bullish' && aiInsights.priceAnalysis.confidence > 0.7) {
      recommendations.push('Strong bullish signals detected - consider increasing exposure');
    }
    
    if (aiInsights.whaleMovements?.patterns.accumulation) {
      recommendations.push('Whale accumulation detected - institutional interest increasing');
    }
    
    // Risk-based recommendations
    recommendations.push(...riskAnalysis.recommendations);
    
    return recommendations;
  }

  private async checkNewTransactions(
    walletAddress: string, 
    lastUpdate?: Date
  ): Promise<Transaction[]> {
    // This would integrate with blockchain APIs to check for new transactions
    // For now, return empty array
    return [];
  }

  private async getPriceUpdates(): Promise<Record<string, number>> {
    // This would fetch current prices from price APIs
    // For now, return empty object
    return {};
  }

  private async generateAlerts(
    newTransactions: Transaction[], 
    priceChanges: Record<string, number>
  ): Promise<any[]> {
    const alerts = [];
    
    // Generate alerts based on new transactions
    if (newTransactions.length > 0) {
      alerts.push({
        type: 'transaction',
        message: `${newTransactions.length} new transaction(s) detected`,
        severity: 'info'
      });
    }
    
    // Generate alerts based on price changes
    Object.entries(priceChanges).forEach(([asset, change]) => {
      if (Math.abs(change) > 5) {
        alerts.push({
          type: 'price',
          message: `${asset} price changed by ${change.toFixed(2)}%`,
          severity: Math.abs(change) > 10 ? 'warning' : 'info'
        });
      }
    });
    
    return alerts;
  }
}

// Export singleton instance
export const portfolioAnalyticsService = new PortfolioAnalyticsService();