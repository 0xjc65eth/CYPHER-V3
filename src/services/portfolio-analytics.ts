/**
 * Advanced Portfolio Analytics Service
 * 
 * Provides comprehensive portfolio analytics including risk metrics, performance attribution,
 * correlation analysis, and advanced portfolio optimization techniques.
 */

import { PortfolioAsset, WalletInfo, WalletPerformance } from './wallet-connector';
import { PnLCalculation, PortfolioPnL, pnlCalculator } from './pnl-calculator';

export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number; // 95% ES
  beta: number; // vs Bitcoin
  alpha: number; // vs Bitcoin
  informationRatio: number;
  trackingError: number;
}

export interface PerformanceAttribution {
  assetAllocation: {
    asset: string;
    allocation: number;
    contribution: number;
    excess: number;
  }[];
  sectorBreakdown: {
    sector: string;
    allocation: number;
    performance: number;
  }[];
  timeAttribution: {
    period: string;
    performance: number;
    benchmark: number;
    excess: number;
  }[];
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  averageCorrelation: number;
  mostCorrelated: [string, string, number];
  leastCorrelated: [string, string, number];
}

export interface OptimizationSuggestion {
  type: 'rebalance' | 'reduce_risk' | 'increase_return' | 'diversify';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: {
    riskReduction?: number;
    returnIncrease?: number;
    diversificationImprovement?: number;
  };
  actions: {
    sell?: { asset: string; amount: number }[];
    buy?: { asset: string; amount: number }[];
  };
}

export interface PortfolioHealthScore {
  overall: number; // 0-100
  diversification: number;
  riskManagement: number;
  performance: number;
  efficiency: number;
  
  strengths: string[];
  weaknesses: string[];
  recommendations: OptimizationSuggestion[];
}

export interface MarketRegimeAnalysis {
  currentRegime: 'bull' | 'bear' | 'sideways' | 'volatile';
  confidence: number;
  duration: number; // days in current regime
  
  regimePerformance: {
    bull: { count: number; avgReturn: number; avgDuration: number };
    bear: { count: number; avgReturn: number; avgDuration: number };
    sideways: { count: number; avgReturn: number; avgDuration: number };
    volatile: { count: number; avgReturn: number; avgDuration: number };
  };
  
  portfolioSuitability: {
    currentRegime: number; // 0-100 how well suited for current regime
    suggestions: string[];
  };
}

export interface StressTestResult {
  scenario: string;
  description: string;
  
  impact: {
    portfolioValue: number;
    percentChange: number;
    worstAsset: { name: string; impact: number };
    bestAsset: { name: string; impact: number };
  };
  
  riskMeasures: {
    newVolatility: number;
    newSharpe: number;
    newMaxDrawdown: number;
  };
  
  timeToRecover: number; // estimated days
  probability: number; // likelihood of this scenario
}

class PortfolioAnalyticsService {
  private priceHistory: Map<string, Array<{price: number, timestamp: number}>> = new Map();
  private benchmarkHistory: Array<{price: number, timestamp: number}> = [];
  private marketData: Map<string, any> = new Map();
  
  /**
   * Calculate comprehensive risk metrics for portfolio
   */
  public calculateRiskMetrics(portfolio: PortfolioPnL): RiskMetrics {
    const assets = Array.from(portfolio.assetPnL.values());
    
    // Portfolio-level volatility
    const portfolioVolatility = this.calculatePortfolioVolatility(assets);
    
    // Sharpe ratio
    const riskFreeRate = 0.05; // 5% annual
    const excessReturn = (portfolio.totalPnLPercent / 100) - riskFreeRate;
    const sharpeRatio = portfolioVolatility > 0 ? excessReturn / portfolioVolatility : 0;
    
    // Sortino ratio (using downside deviation)
    const sortinoRatio = this.calculateSortinoRatio(assets, riskFreeRate);
    
    // Maximum drawdown
    const maxDrawdown = this.calculatePortfolioMaxDrawdown(assets);
    
    // Value at Risk (95%)
    const valueAtRisk = this.calculateVaR(assets, 0.95);
    
    // Expected Shortfall (95%)
    const expectedShortfall = this.calculateExpectedShortfall(assets, 0.95);
    
    // Beta and Alpha vs Bitcoin
    const { beta, alpha } = this.calculateBetaAlpha(assets);
    
    // Information ratio and tracking error
    const { informationRatio, trackingError } = this.calculateInformationRatio(assets);
    
    return {
      volatility: portfolioVolatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall,
      beta,
      alpha,
      informationRatio,
      trackingError
    };
  }
  
  /**
   * Perform performance attribution analysis
   */
  public calculatePerformanceAttribution(portfolio: PortfolioPnL): PerformanceAttribution {
    const assets = Array.from(portfolio.assetPnL.entries());
    const totalValue = portfolio.totalValue || 1;

    // Asset allocation attribution
    const assetAllocation = assets.map(([asset, calc]) => {
      const allocation = totalValue > 0 ? (calc.marketValue / totalValue) * 100 : 0;
      const contribution = totalValue > 0 ? (calc.totalReturn / totalValue) * 100 : 0;
      const benchmarkReturn = this.getBenchmarkReturn(asset);
      const excess = calc.totalReturnPercent - benchmarkReturn;
      
      return {
        asset,
        allocation,
        contribution,
        excess
      };
    });
    
    // Sector breakdown
    const sectorBreakdown = this.calculateSectorBreakdown(assets);
    
    // Time-based attribution
    const timeAttribution = this.calculateTimeAttribution(assets);
    
    return {
      assetAllocation,
      sectorBreakdown,
      timeAttribution
    };
  }
  
  /**
   * Calculate correlation matrix between assets
   */
  public calculateCorrelationMatrix(assets: string[]): CorrelationMatrix {
    const matrix: number[][] = [];
    let totalCorrelation = 0;
    let correlationCount = 0;
    let mostCorrelated: [string, string, number] = ['', '', -1];
    let leastCorrelated: [string, string, number] = ['', '', 1];
    
    for (let i = 0; i < assets.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < assets.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const correlation = this.calculateCorrelation(assets[i], assets[j]);
          matrix[i][j] = correlation;
          
          if (i < j) { // Only count each pair once
            totalCorrelation += Math.abs(correlation);
            correlationCount++;
            
            if (correlation > mostCorrelated[2]) {
              mostCorrelated = [assets[i], assets[j], correlation];
            }
            if (correlation < leastCorrelated[2]) {
              leastCorrelated = [assets[i], assets[j], correlation];
            }
          }
        }
      }
    }
    
    const averageCorrelation = correlationCount > 0 ? totalCorrelation / correlationCount : 0;
    
    return {
      assets,
      matrix,
      averageCorrelation,
      mostCorrelated,
      leastCorrelated
    };
  }
  
  /**
   * Generate portfolio optimization suggestions
   */
  public generateOptimizationSuggestions(
    portfolio: PortfolioPnL,
    riskMetrics: RiskMetrics,
    correlationMatrix: CorrelationMatrix
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // High correlation warning
    if (correlationMatrix.averageCorrelation > 0.7) {
      suggestions.push({
        type: 'diversify',
        priority: 'high',
        description: 'Portfolio shows high correlation between assets. Consider diversifying into uncorrelated assets.',
        impact: {
          riskReduction: 15,
          diversificationImprovement: 25
        },
        actions: {
          buy: [
            { asset: 'ETH', amount: portfolio.totalValue * 0.1 },
            { asset: 'SOL', amount: portfolio.totalValue * 0.05 }
          ]
        }
      });
    }
    
    // High risk warning
    if (riskMetrics.volatility > 0.8) {
      suggestions.push({
        type: 'reduce_risk',
        priority: 'high',
        description: 'Portfolio volatility is high. Consider reducing exposure to volatile assets.',
        impact: {
          riskReduction: 20
        },
        actions: {
          sell: this.getHighVolatilityAssets(portfolio, 0.2)
        }
      });
    }
    
    // Low Sharpe ratio
    if (riskMetrics.sharpeRatio < 0.5) {
      suggestions.push({
        type: 'increase_return',
        priority: 'medium',
        description: 'Risk-adjusted returns are low. Consider optimizing asset allocation.',
        impact: {
          returnIncrease: 10
        },
        actions: {
          sell: this.getPoorPerformingAssets(portfolio, 0.1),
          buy: this.getHighPerformingAssets(portfolio, 0.1)
        }
      });
    }
    
    // Rebalancing suggestion
    const imbalance = this.detectImbalance(portfolio);
    if (imbalance.severity > 0.2) {
      suggestions.push({
        type: 'rebalance',
        priority: 'medium',
        description: 'Portfolio allocation has drifted significantly from optimal weights.',
        impact: {
          riskReduction: 5,
          returnIncrease: 3
        },
        actions: imbalance.actions
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  /**
   * Calculate portfolio health score
   */
  public calculatePortfolioHealthScore(
    portfolio: PortfolioPnL,
    riskMetrics: RiskMetrics,
    correlationMatrix: CorrelationMatrix
  ): PortfolioHealthScore {
    // Diversification score (0-100)
    const diversificationScore = Math.max(0, Math.min(100, 
      100 - (correlationMatrix.averageCorrelation * 100) + 
      (Math.min(portfolio.assetPnL.size, 10) * 5)
    ));
    
    // Risk management score (0-100)
    const riskScore = Math.max(0, Math.min(100,
      100 - (riskMetrics.volatility * 50) - (riskMetrics.maxDrawdown * 2) +
      (riskMetrics.sharpeRatio * 20)
    ));
    
    // Performance score (0-100)
    const performanceScore = Math.max(0, Math.min(100,
      50 + (portfolio.totalPnLPercent * 2) + (riskMetrics.sharpeRatio * 10)
    ));
    
    // Efficiency score (0-100)
    const efficiencyScore = Math.max(0, Math.min(100,
      (riskMetrics.sharpeRatio * 30) + (riskMetrics.informationRatio * 20) + 50
    ));
    
    // Overall score
    const overallScore = Math.round(
      (diversificationScore * 0.25) +
      (riskScore * 0.3) +
      (performanceScore * 0.3) +
      (efficiencyScore * 0.15)
    );
    
    // Determine strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (diversificationScore > 70) strengths.push('Well diversified portfolio');
    else if (diversificationScore < 40) weaknesses.push('Lacks diversification');
    
    if (riskScore > 70) strengths.push('Good risk management');
    else if (riskScore < 40) weaknesses.push('High risk exposure');
    
    if (performanceScore > 70) strengths.push('Strong performance');
    else if (performanceScore < 40) weaknesses.push('Underperforming');
    
    if (efficiencyScore > 70) strengths.push('Efficient risk-return profile');
    else if (efficiencyScore < 40) weaknesses.push('Inefficient allocation');
    
    // Generate recommendations
    const recommendations = this.generateOptimizationSuggestions(portfolio, riskMetrics, correlationMatrix);
    
    return {
      overall: overallScore,
      diversification: Math.round(diversificationScore),
      riskManagement: Math.round(riskScore),
      performance: Math.round(performanceScore),
      efficiency: Math.round(efficiencyScore),
      strengths,
      weaknesses,
      recommendations
    };
  }
  
  /**
   * Analyze market regime and portfolio suitability
   */
  public analyzeMarketRegime(): MarketRegimeAnalysis {
    const btcHistory = this.priceHistory.get('bitcoin') || [];
    if (btcHistory.length < 30) {
      return this.getDefaultRegimeAnalysis();
    }
    
    // Calculate recent volatility and trend
    const recent30Days = btcHistory.slice(-30);
    const volatility = this.calculateVolatilityFromHistory(recent30Days);
    const trend = this.calculateTrend(recent30Days);
    
    // Determine current regime
    let currentRegime: MarketRegimeAnalysis['currentRegime'];
    let confidence = 0;
    
    if (volatility > 0.8) {
      currentRegime = 'volatile';
      confidence = 0.8;
    } else if (trend > 0.05) {
      currentRegime = 'bull';
      confidence = 0.75;
    } else if (trend < -0.05) {
      currentRegime = 'bear';
      confidence = 0.75;
    } else {
      currentRegime = 'sideways';
      confidence = 0.6;
    }
    
    // Mock regime performance data
    const regimePerformance = {
      bull: { count: 12, avgReturn: 0.25, avgDuration: 120 },
      bear: { count: 8, avgReturn: -0.15, avgDuration: 90 },
      sideways: { count: 15, avgReturn: 0.05, avgDuration: 60 },
      volatile: { count: 10, avgReturn: 0.1, avgDuration: 45 }
    };
    
    // Portfolio suitability
    const portfolioSuitability = this.assessRegimeSuitability(currentRegime);
    
    return {
      currentRegime,
      confidence,
      duration: 45, // Mock duration
      regimePerformance,
      portfolioSuitability
    };
  }
  
  /**
   * Perform stress testing on portfolio
   */
  public performStressTests(portfolio: PortfolioPnL): StressTestResult[] {
    const scenarios = [
      {
        name: 'Market Crash',
        description: '40% decline in Bitcoin, 50% in altcoins',
        btcChange: -0.4,
        altcoinChange: -0.5,
        probability: 0.05
      },
      {
        name: 'Crypto Winter',
        description: '70% decline across all crypto assets',
        btcChange: -0.7,
        altcoinChange: -0.7,
        probability: 0.02
      },
      {
        name: 'Flash Crash',
        description: '25% sudden decline with quick recovery',
        btcChange: -0.25,
        altcoinChange: -0.3,
        probability: 0.1
      },
      {
        name: 'Regulatory Shock',
        description: 'Major regulatory action causes 30% decline',
        btcChange: -0.3,
        altcoinChange: -0.4,
        probability: 0.08
      }
    ];
    
    return scenarios.map(scenario => {
      const impact = this.calculateStressImpact(portfolio, scenario);
      const riskMeasures = this.calculateStressRiskMeasures(portfolio, scenario);
      
      return {
        scenario: scenario.name,
        description: scenario.description,
        impact,
        riskMeasures,
        timeToRecover: this.estimateRecoveryTime(impact.percentChange),
        probability: scenario.probability
      };
    });
  }
  
  // Private helper methods
  
  private calculatePortfolioVolatility(assets: PnLCalculation[]): number {
    if (assets.length === 0) return 0;
    
    const weightedVolatility = assets.reduce((sum, asset) => {
      const weight = asset.marketValue / assets.reduce((total, a) => total + a.marketValue, 0);
      return sum + (weight * asset.volatility);
    }, 0);
    
    return weightedVolatility;
  }
  
  private calculateSortinoRatio(assets: PnLCalculation[], riskFreeRate: number): number {
    // Simplified Sortino ratio calculation
    const portfolioReturn = assets.reduce((sum, asset) => sum + asset.totalReturnPercent, 0) / assets.length / 100;
    const downside = this.calculateDownsideDeviation(assets);
    
    return downside > 0 ? (portfolioReturn - riskFreeRate) / downside : 0;
  }
  
  private calculateDownsideDeviation(assets: PnLCalculation[]): number {
    // Simplified downside deviation
    const negativeReturns = assets.filter(asset => asset.totalReturnPercent < 0);
    if (negativeReturns.length === 0) return 0;
    
    const avgNegativeReturn = negativeReturns.reduce((sum, asset) => sum + asset.totalReturnPercent, 0) / negativeReturns.length / 100;
    const variance = negativeReturns.reduce((sum, asset) => {
      const returnDiff = (asset.totalReturnPercent / 100) - avgNegativeReturn;
      return sum + (returnDiff * returnDiff);
    }, 0) / negativeReturns.length;
    
    return Math.sqrt(variance);
  }
  
  private calculatePortfolioMaxDrawdown(assets: PnLCalculation[]): number {
    return Math.max(...assets.map(asset => asset.maxDrawdown));
  }
  
  private calculateVaR(assets: PnLCalculation[], confidence: number): number {
    // Simplified VaR calculation using historical simulation
    const returns = assets.map(asset => asset.totalReturnPercent / 100);
    returns.sort((a, b) => a - b);
    
    const index = Math.floor((1 - confidence) * returns.length);
    return returns[index] || 0;
  }
  
  private calculateExpectedShortfall(assets: PnLCalculation[], confidence: number): number {
    const var95 = this.calculateVaR(assets, confidence);
    const returns = assets.map(asset => asset.totalReturnPercent / 100);
    const tailReturns = returns.filter(ret => ret <= var95);
    
    return tailReturns.length > 0 ? tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length : 0;
  }
  
  private calculateBetaAlpha(assets: PnLCalculation[]): { beta: number; alpha: number } {
    // Simplified beta/alpha calculation vs Bitcoin
    const portfolioReturn = assets.reduce((sum, asset) => sum + asset.totalReturnPercent, 0) / assets.length / 100;
    const benchmarkReturn = 0.5; // Assume 50% Bitcoin return
    
    const beta = 0.8; // Mock beta
    const alpha = portfolioReturn - (beta * benchmarkReturn);
    
    return { beta, alpha };
  }
  
  private calculateInformationRatio(assets: PnLCalculation[]): { informationRatio: number; trackingError: number } {
    const trackingError = 0.15; // Mock tracking error
    const excessReturn = 0.05; // Mock excess return
    const informationRatio = trackingError > 0 ? excessReturn / trackingError : 0;
    
    return { informationRatio, trackingError };
  }
  
  private getBenchmarkReturn(asset: string): number {
    // Mock benchmark returns
    switch (asset.toLowerCase()) {
      case 'bitcoin':
      case 'btc':
        return 50;
      case 'ethereum':
      case 'eth':
        return 80;
      default:
        return 30;
    }
  }
  
  private calculateSectorBreakdown(assets: [string, PnLCalculation][]): PerformanceAttribution['sectorBreakdown'] {
    const sectors = new Map<string, { allocation: number; performance: number; count: number }>();
    
    for (const [asset, calc] of assets) {
      const sector = this.getAssetSector(asset);
      const current = sectors.get(sector) || { allocation: 0, performance: 0, count: 0 };
      
      current.allocation += calc.marketValue;
      current.performance += calc.totalReturnPercent;
      current.count += 1;
      
      sectors.set(sector, current);
    }
    
    const totalValue = assets.reduce((sum, [, calc]) => sum + calc.marketValue, 0) || 1;

    return Array.from(sectors.entries()).map(([sector, data]) => ({
      sector,
      allocation: totalValue > 0 ? (data.allocation / totalValue) * 100 : 0,
      performance: data.performance / data.count
    }));
  }
  
  private getAssetSector(asset: string): string {
    const assetLower = asset.toLowerCase();
    if (assetLower.includes('bitcoin') || assetLower.includes('btc')) return 'Store of Value';
    if (assetLower.includes('ethereum') || assetLower.includes('eth')) return 'Smart Contracts';
    if (assetLower.includes('ordinals') || assetLower.includes('inscription')) return 'NFTs';
    if (assetLower.includes('rune') || assetLower.includes('brc20')) return 'Tokens';
    return 'Other';
  }
  
  private calculateTimeAttribution(assets: [string, PnLCalculation][]): PerformanceAttribution['timeAttribution'] {
    // Mock time attribution data
    return [
      { period: '1D', performance: 2.5, benchmark: 1.8, excess: 0.7 },
      { period: '1W', performance: 8.2, benchmark: 6.5, excess: 1.7 },
      { period: '1M', performance: 15.3, benchmark: 12.1, excess: 3.2 },
      { period: '3M', performance: 45.2, benchmark: 38.7, excess: 6.5 }
    ];
  }
  
  private calculateCorrelation(asset1: string, asset2: string): number {
    // Mock correlation calculation
    if (asset1 === asset2) return 1;
    
    const history1 = this.priceHistory.get(asset1) || [];
    const history2 = this.priceHistory.get(asset2) || [];
    
    if (history1.length < 2 || history2.length < 2) {
      // Return default correlations based on asset types
      if (asset1.includes('bitcoin') && asset2.includes('ethereum')) return 0.7;
      if (asset1.includes('ordinals') && asset2.includes('bitcoin')) return 0.8;
      return 0.5;
    }
    
    // Simplified correlation calculation
    return 0.6 + (Math.random() * 0.4 - 0.2); // Mock correlation between 0.4 and 0.8
  }
  
  private getHighVolatilityAssets(portfolio: PortfolioPnL, percentage: number): { asset: string; amount: number }[] {
    const assets = Array.from(portfolio.assetPnL.entries())
      .sort(([, a], [, b]) => b.volatility - a.volatility)
      .slice(0, Math.ceil(portfolio.assetPnL.size * percentage));
    
    return assets.map(([asset, calc]) => ({
      asset,
      amount: calc.marketValue * 0.5 // Reduce by 50%
    }));
  }
  
  private getPoorPerformingAssets(portfolio: PortfolioPnL, percentage: number): { asset: string; amount: number }[] {
    const assets = Array.from(portfolio.assetPnL.entries())
      .sort(([, a], [, b]) => a.totalReturnPercent - b.totalReturnPercent)
      .slice(0, Math.ceil(portfolio.assetPnL.size * percentage));
    
    return assets.map(([asset, calc]) => ({
      asset,
      amount: calc.marketValue * 0.3 // Reduce by 30%
    }));
  }
  
  private getHighPerformingAssets(portfolio: PortfolioPnL, percentage: number): { asset: string; amount: number }[] {
    const assets = Array.from(portfolio.assetPnL.entries())
      .sort(([, a], [, b]) => b.totalReturnPercent - a.totalReturnPercent)
      .slice(0, Math.ceil(portfolio.assetPnL.size * percentage));
    
    return assets.map(([asset, calc]) => ({
      asset,
      amount: calc.marketValue * 0.2 // Increase by 20%
    }));
  }
  
  private detectImbalance(portfolio: PortfolioPnL): { severity: number; actions: OptimizationSuggestion['actions'] } {
    // Mock imbalance detection
    const severity = Math.random() * 0.5; // Random severity between 0 and 0.5
    
    return {
      severity,
      actions: {
        sell: [{ asset: 'BTC', amount: 5000 }],
        buy: [{ asset: 'ETH', amount: 3000 }, { asset: 'SOL', amount: 2000 }]
      }
    };
  }
  
  private getDefaultRegimeAnalysis(): MarketRegimeAnalysis {
    return {
      currentRegime: 'sideways',
      confidence: 0.5,
      duration: 30,
      regimePerformance: {
        bull: { count: 10, avgReturn: 0.3, avgDuration: 100 },
        bear: { count: 6, avgReturn: -0.2, avgDuration: 80 },
        sideways: { count: 12, avgReturn: 0.05, avgDuration: 50 },
        volatile: { count: 8, avgReturn: 0.1, avgDuration: 40 }
      },
      portfolioSuitability: {
        currentRegime: 75,
        suggestions: ['Consider increasing allocation to stable assets', 'Monitor for regime change signals']
      }
    };
  }
  
  private calculateVolatilityFromHistory(history: Array<{price: number, timestamp: number}>): number {
    if (history.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < history.length; i++) {
      const ret = (history[i].price - history[i-1].price) / history[i-1].price;
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  private calculateTrend(history: Array<{price: number, timestamp: number}>): number {
    if (history.length < 2) return 0;
    
    const firstPrice = history[0].price;
    const lastPrice = history[history.length - 1].price;
    
    return (lastPrice - firstPrice) / firstPrice;
  }
  
  private assessRegimeSuitability(regime: MarketRegimeAnalysis['currentRegime']): { currentRegime: number; suggestions: string[] } {
    const suggestions: string[] = [];
    let score = 50;
    
    switch (regime) {
      case 'bull':
        score = 85;
        suggestions.push('Consider taking profits on strong performers');
        suggestions.push('Look for breakout opportunities');
        break;
      case 'bear':
        score = 40;
        suggestions.push('Focus on capital preservation');
        suggestions.push('Consider DCA strategies');
        break;
      case 'sideways':
        score = 70;
        suggestions.push('Range trading strategies may be effective');
        suggestions.push('Focus on yield-generating assets');
        break;
      case 'volatile':
        score = 60;
        suggestions.push('Reduce position sizes');
        suggestions.push('Increase cash allocation');
        break;
    }
    
    return { currentRegime: score, suggestions };
  }
  
  private calculateStressImpact(portfolio: PortfolioPnL, scenario: any): StressTestResult['impact'] {
    let newValue = 0;
    let worstAsset = { name: '', impact: 0 };
    let bestAsset = { name: '', impact: 0 };
    
    for (const [asset, calc] of portfolio.assetPnL.entries()) {
      const change = asset.toLowerCase().includes('bitcoin') ? scenario.btcChange : scenario.altcoinChange;
      const assetImpact = calc.marketValue * change;
      const newAssetValue = calc.marketValue + assetImpact;
      
      newValue += newAssetValue;
      
      if (assetImpact < worstAsset.impact) {
        worstAsset = { name: asset, impact: assetImpact };
      }
      if (assetImpact > bestAsset.impact) {
        bestAsset = { name: asset, impact: assetImpact };
      }
    }
    
    const percentChange = portfolio.totalValue > 0 ? ((newValue - portfolio.totalValue) / portfolio.totalValue) * 100 : 0;
    
    return {
      portfolioValue: newValue,
      percentChange,
      worstAsset,
      bestAsset
    };
  }
  
  private calculateStressRiskMeasures(portfolio: PortfolioPnL, scenario: any): StressTestResult['riskMeasures'] {
    // Mock stress risk measures
    return {
      newVolatility: 0.9,
      newSharpe: -0.5,
      newMaxDrawdown: 45
    };
  }
  
  private estimateRecoveryTime(percentLoss: number): number {
    // Estimate recovery time based on historical data
    const absLoss = Math.abs(percentLoss);
    
    if (absLoss < 10) return 7; // 1 week
    if (absLoss < 25) return 30; // 1 month
    if (absLoss < 50) return 180; // 6 months
    return 365; // 1 year
  }
  
  /**
   * Update price history for an asset
   */
  public updatePriceHistory(asset: string, price: number, timestamp: number = Date.now()): void {
    const history = this.priceHistory.get(asset) || [];
    history.push({ price, timestamp });
    
    // Keep only last 365 days
    const oneYearAgo = timestamp - (365 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(point => point.timestamp > oneYearAgo);
    
    this.priceHistory.set(asset, filteredHistory);
  }
  
  /**
   * Set benchmark price history (usually Bitcoin)
   */
  public setBenchmarkHistory(history: Array<{price: number, timestamp: number}>): void {
    this.benchmarkHistory = history;
  }
  
  /**
   * Clear all analytics data
   */
  public clearAll(): void {
    this.priceHistory.clear();
    this.benchmarkHistory = [];
    this.marketData.clear();
  }
}

export const portfolioAnalytics = new PortfolioAnalyticsService();
export default portfolioAnalytics;