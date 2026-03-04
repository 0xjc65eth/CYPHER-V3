// Simplified AI Analyzer without external dependencies
export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap?: number;
  dominance?: number;
}

export interface OnChainMetrics {
  nvt: number;
  nvtSignal: number;
  mvrv: number;
  sopr: number;
  puellMultiple: number;
  hashRate: number;
  difficulty: number;
  activeAddresses: number;
  transactionVolume: number;
  exchangeFlows: {
    inflow: number;
    outflow: number;
    netFlow: number;
  };
}

export interface PredictionResult {
  price: number;
  confidence: number;
  timeframe: string;
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: number;
}

export interface RiskMetrics {
  score: number;
  var: number;
  cvar: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  maxDrawdown: number;
  volatility: number;
  liquidationRisk: number;
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: number;
  indicators: {
    technical: number;
    sentiment: number;
    onChain: number;
    volume: number;
  };
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  timeframe: string;
  confidence: number;
}

export class SimplifiedAIAnalyzer {
  // Price prediction using simplified technical analysis
  public async predictPrice(
    historicalData: MarketData[],
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<PredictionResult> {
    if (historicalData.length < 20) {
      throw new Error('Insufficient data for prediction');
    }

    const prices = historicalData.map(d => d.close);
    const currentPrice = prices[prices.length - 1];
    
    // Simple moving averages
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    
    // Determine trend
    const trend = this.analyzeTrend(sma20, sma50, currentPrice);
    
    // Calculate support and resistance
    const { support, resistance } = this.calculateSupportResistance(historicalData);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(prices);
    
    // Predict next price (simplified)
    const priceChange = trend === 'bullish' ? 0.02 : trend === 'bearish' ? -0.02 : 0;
    const predictedPrice = currentPrice * (1 + priceChange);
    
    // Calculate confidence based on trend strength and volatility
    const trendStrength = Math.abs(sma20[sma20.length - 1] - sma50[sma50.length - 1]) / currentPrice;
    const confidence = Math.max(0.5, Math.min(0.95, 0.7 + trendStrength - volatility));

    return {
      price: predictedPrice,
      confidence,
      timeframe,
      supportLevels: support,
      resistanceLevels: resistance,
      trend,
      volatility
    };
  }

  // Simplified sentiment analysis
  public async analyzeSentiment(
    sources: Array<{
      text: string;
      source: 'twitter' | 'reddit' | 'news' | 'telegram';
      timestamp: number;
    }>
  ): Promise<{
    overall: number;
    breakdown: Map<string, number>;
    trends: Array<{ timestamp: number; sentiment: number }>;
    insights: string[];
  }> {
    const breakdown = new Map<string, number>();
    let totalSentiment = 0;
    
    // Simple keyword-based sentiment analysis
    sources.forEach(item => {
      const sentiment = this.calculateSentiment(item.text);
      totalSentiment += sentiment;
      
      const sourceSentiment = breakdown.get(item.source) || 0;
      breakdown.set(item.source, sourceSentiment + sentiment);
    });

    const overall = sources.length > 0 ? totalSentiment / sources.length : 0;
    
    // Generate trends (simplified)
    const trends = this.generateSentimentTrends(sources);
    
    // Generate insights
    const insights = this.generateSentimentInsights(overall, breakdown);

    return {
      overall,
      breakdown,
      trends,
      insights
    };
  }

  // Simplified on-chain analytics
  public async analyzeOnChainMetrics(address?: string): Promise<{
    metrics: OnChainMetrics;
    signals: string[];
    healthScore: number;
    predictions: Map<string, number>;
  }> {
    // Deterministic defaults (no real on-chain data available without API)
    const metrics: OnChainMetrics = {
      nvt: 0,
      nvtSignal: 0,
      mvrv: 0,
      sopr: 0,
      puellMultiple: 0,
      hashRate: 0,
      difficulty: 0,
      activeAddresses: 0,
      transactionVolume: 0,
      exchangeFlows: {
        inflow: 0,
        outflow: 0,
        netFlow: 0
      }
    };

    // Generate signals based on metrics
    const signals = this.generateOnChainSignals(metrics);
    
    // Calculate health score
    const healthScore = this.calculateNetworkHealth(metrics);
    
    // Make predictions
    const predictions = new Map([
      ['price_trend', metrics.mvrv < 1.5 ? 1.2 : metrics.mvrv > 3 ? 0.8 : 1],
      ['volume_trend', metrics.activeAddresses / 1000000],
      ['network_growth', Math.min(1.5, metrics.hashRate / 400000000)]
    ]);

    return {
      metrics,
      signals,
      healthScore,
      predictions
    };
  }

  // Simplified risk calculation
  public async calculateRiskScore(
    portfolio: Map<string, number>,
    marketConditions: any
  ): Promise<RiskMetrics> {
    // Deterministic zero returns (no real portfolio data available)
    const returns = Array.from({ length: 252 }, () => 0);
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    // Calculate risk metrics
    const riskFreeRate = 0.02;
    const sharpeRatio = volatility > 0 ? (avgReturn * 252 - riskFreeRate) / volatility : 0;
    
    // Sortino ratio (simplified)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0 
      ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
      : variance;
    const sortinoRatio = Math.sqrt(downsideVariance) > 0 
      ? (avgReturn * 252 - riskFreeRate) / (Math.sqrt(downsideVariance) * Math.sqrt(252))
      : 0;

    // Max drawdown calculation
    let maxDrawdown = 0;
    let peak = 1;
    let value = 1;
    
    for (const r of returns) {
      value *= (1 + r);
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // VaR calculation (simplified)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95 = Math.abs(sortedReturns[Math.floor(returns.length * 0.05)] || 0);
    const cvar95 = sortedReturns.slice(0, Math.floor(returns.length * 0.05))
      .reduce((sum, r) => sum + Math.abs(r), 0) / Math.floor(returns.length * 0.05) || var95;

    // Beta (no real correlation data available)
    const beta = 0;

    // Liquidation risk
    const leverage = marketConditions.leverage || 1;
    const liquidationRisk = Math.min(1, leverage * volatility * 0.1);

    // Composite risk score
    const score = Math.round(
      (var95 * 0.3 + cvar95 * 0.2 + maxDrawdown * 0.3 + volatility * 0.2) * 100
    );

    return {
      score,
      var: var95 * 100,
      cvar: cvar95 * 100,
      sharpeRatio,
      sortinoRatio,
      beta,
      maxDrawdown: maxDrawdown * 100,
      volatility: volatility * 100,
      liquidationRisk
    };
  }

  // Pattern detection (simplified)
  public async detectPatterns(priceData: MarketData[]): Promise<{
    patterns: Array<{
      name: string;
      type: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      timeframe: string;
      target: number;
      stopLoss: number;
      successRate: number;
    }>;
    signals: TradingSignal[];
  }> {
    const patterns: Array<{
      name: string;
      type: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      timeframe: string;
      target: number;
      stopLoss: number;
      successRate: number;
    }> = [];
    const signals: TradingSignal[] = [];
    const prices = priceData.map(d => d.close);
    
    if (prices.length < 10) {
      return { patterns, signals };
    }

    const currentPrice = prices[prices.length - 1];
    
    // Simple pattern detection
    const recentPrices = prices.slice(-10);
    const isUptrend = recentPrices[recentPrices.length - 1] > recentPrices[0];
    const volatility = this.calculateVolatility(recentPrices);

    if (isUptrend && volatility < 0.3) {
      patterns.push({
        name: 'Bullish Momentum',
        type: 'bullish',
        strength: 0.7,
        timeframe: '1d',
        target: currentPrice * 1.05,
        stopLoss: currentPrice * 0.97,
        successRate: 0.65
      });

      signals.push({
        type: 'buy' as const,
        strength: 70,
        indicators: {
          technical: 0.7,
          sentiment: 0.6,
          onChain: 0.5,
          volume: 0.6
        },
        entry: currentPrice,
        stopLoss: currentPrice * 0.97,
        takeProfit: [currentPrice * 1.02, currentPrice * 1.05, currentPrice * 1.08],
        timeframe: '1d',
        confidence: 0.65
      });
    } else if (!isUptrend && volatility > 0.4) {
      patterns.push({
        name: 'Bearish Pressure',
        type: 'bearish',
        strength: 0.6,
        timeframe: '1d',
        target: currentPrice * 0.95,
        stopLoss: currentPrice * 1.03,
        successRate: 0.58
      });

      signals.push({
        type: 'sell' as const,
        strength: 60,
        indicators: {
          technical: 0.6,
          sentiment: 0.4,
          onChain: 0.5,
          volume: 0.5
        },
        entry: currentPrice,
        stopLoss: currentPrice * 1.03,
        takeProfit: [currentPrice * 0.98, currentPrice * 0.95, currentPrice * 0.92],
        timeframe: '1d',
        confidence: 0.58
      });
    }

    return { patterns, signals };
  }

  // Helper methods
  private calculateSMA(prices: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private analyzeTrend(sma20: number[], sma50: number[], currentPrice: number): 'bullish' | 'bearish' | 'neutral' {
    if (sma20.length === 0 || sma50.length === 0) return 'neutral';
    
    const sma20Current = sma20[sma20.length - 1];
    const sma50Current = sma50[sma50.length - 1];
    
    if (currentPrice > sma20Current && sma20Current > sma50Current) {
      return 'bullish';
    } else if (currentPrice < sma20Current && sma20Current < sma50Current) {
      return 'bearish';
    }
    
    return 'neutral';
  }

  private calculateSupportResistance(data: MarketData[]): {
    support: number[];
    resistance: number[];
  } {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const support = this.findLocalExtrema(lows, 'min').slice(0, 3);
    const resistance = this.findLocalExtrema(highs, 'max').slice(0, 3);
    
    return { support, resistance };
  }

  private findLocalExtrema(data: number[], type: 'min' | 'max'): number[] {
    const extrema = [];
    const window = 3;
    
    for (let i = window; i < data.length - window; i++) {
      const subset = data.slice(i - window, i + window + 1);
      const current = data[i];
      
      if (type === 'min' && current === Math.min(...subset)) {
        extrema.push(current);
      } else if (type === 'max' && current === Math.max(...subset)) {
        extrema.push(current);
      }
    }
    
    return [...new Set(extrema)].sort((a, b) => type === 'min' ? a - b : b - a);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365); // Annualized
  }

  private calculateSentiment(text: string): number {
    const bullishKeywords = ['bullish', 'pump', 'moon', 'buy', 'up', 'gain', 'profit', 'rise'];
    const bearishKeywords = ['bearish', 'dump', 'crash', 'sell', 'down', 'loss', 'fall', 'drop'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    bullishKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score += 1;
    });
    
    bearishKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score -= 1;
    });
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / 10));
  }

  private generateSentimentTrends(sources: any[]): Array<{ timestamp: number; sentiment: number }> {
    const hourlyGroups = new Map<number, number[]>();
    
    sources.forEach(item => {
      const hour = Math.floor(item.timestamp / 3600000) * 3600000;
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, []);
      }
      hourlyGroups.get(hour)!.push(this.calculateSentiment(item.text));
    });
    
    return Array.from(hourlyGroups.entries())
      .map(([timestamp, sentiments]) => ({
        timestamp,
        sentiment: sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private generateSentimentInsights(overall: number, breakdown: Map<string, number>): string[] {
    const insights = [];
    
    if (overall > 0.3) {
      insights.push('Strong positive sentiment detected across social media platforms');
    } else if (overall < -0.3) {
      insights.push('Negative sentiment prevailing - potential selling pressure');
    }
    
    const strongest = Array.from(breakdown.entries()).reduce((max, current) => 
      Math.abs(current[1]) > Math.abs(max[1]) ? current : max
    );
    
    if (Math.abs(strongest[1]) > 0.5) {
      insights.push(`${strongest[0]} showing strongest sentiment signals`);
    }
    
    return insights;
  }

  private generateOnChainSignals(metrics: OnChainMetrics): string[] {
    const signals = [];
    
    if (metrics.nvt < 50) {
      signals.push('NVT suggests potential undervaluation');
    } else if (metrics.nvt > 100) {
      signals.push('NVT indicates possible overvaluation');
    }
    
    if (metrics.mvrv > 3.5) {
      signals.push('MVRV at historically high levels - exercise caution');
    } else if (metrics.mvrv < 1) {
      signals.push('MVRV suggests market bottom territory');
    }
    
    if (metrics.exchangeFlows.netFlow > 0) {
      signals.push('Positive exchange netflow - reduced selling pressure');
    } else if (metrics.exchangeFlows.netFlow < -5000) {
      signals.push('Heavy exchange inflows - potential selling pressure');
    }
    
    return signals;
  }

  private calculateNetworkHealth(metrics: OnChainMetrics): number {
    let score = 50;
    
    // Hash rate health
    if (metrics.hashRate > 400000000) score += 10;
    
    // Active addresses
    if (metrics.activeAddresses > 800000) score += 10;
    
    // MVRV health
    if (metrics.mvrv > 1 && metrics.mvrv < 3) score += 10;
    
    // Exchange flows
    if (metrics.exchangeFlows.netFlow > 0) score += 10;
    
    // NVT health
    if (metrics.nvt > 30 && metrics.nvt < 80) score += 10;
    
    return Math.min(100, score);
  }
}

// Export singleton instance
export const simplifiedAIAnalyzer = new SimplifiedAIAnalyzer();