/**
 * Trading Signals Service - AI-Powered Signal Generation
 * Advanced signal generation with risk-reward calculation and backtesting
 */

import { MarketAnalysisEngine, MultiTimeframeAnalysis, CandleData } from './MarketAnalysisEngine';
import cypherAI, { MarketAnalysis } from './EnhancedCypherAI';

// Language type for signal message formatting
type Language = 'en' | 'pt' | 'fr' | 'es';

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number;
  riskReward: number;
  timeframe: string;
  timestamp: number;
  reasoning: string[];
  smcBased: boolean;
  aiAnalysis: MarketAnalysis;
  expiresAt: number;
  status: 'active' | 'executed' | 'expired' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SignalValidation {
  multiTimeframeAlignment: boolean;
  volumeConfirmation: boolean;
  smcConfirmation: boolean;
  riskRewardValid: boolean;
  overallValid: boolean;
  score: number;
}

export interface BacktestResult {
  signalId: string;
  entryPrice: number;
  exitPrice: number;
  exitReason: 'stop_loss' | 'take_profit' | 'time_exit';
  pnl: number;
  pnlPercentage: number;
  holdingTime: number;
  maxDrawdown: number;
  maxProfit: number;
}

export interface SignalPerformance {
  totalSignals: number;
  successfulSignals: number;
  winRate: number;
  averagePnL: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageHoldingTime: number;
  bestTrade: BacktestResult;
  worstTrade: BacktestResult;
  recentPerformance: BacktestResult[];
}

export interface SignalFilter {
  symbols?: string[];
  timeframes?: string[];
  minConfidence?: number;
  minRiskReward?: number;
  signalTypes?: ('buy' | 'sell' | 'hold')[];
  smcOnly?: boolean;
  priorities?: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface AlertConfig {
  enabled: boolean;
  minConfidence: number;
  symbols: string[];
  channels: ('push' | 'email' | 'voice' | 'webhook')[];
  language: Language;
  customWebhook?: string;
}

export interface RiskParameters {
  maxRiskPerTrade: number; // Percentage of portfolio
  maxDailyRisk: number; // Percentage of portfolio
  minRiskReward: number; // Minimum R:R ratio
  maxCorrelatedTrades: number; // Max trades in correlated assets
  stopLossPercentage: number; // Default stop loss %
  takeProfitPercentage: number; // Default take profit %
}

export interface SignalGenerationConfig {
  timeframes: string[];
  minConfidence: number;
  useAI: boolean;
  useSMC: boolean;
  riskParameters: RiskParameters;
  alertConfig: AlertConfig;
  backtestPeriod: number; // Days to backtest
}

export class TradingSignalsService {
  private marketAnalyzer: MarketAnalysisEngine;
  private cypherAI: typeof cypherAI;
  private activeSignals: Map<string, TradingSignal> = new Map();
  private signalHistory: TradingSignal[] = [];
  private backtestResults: Map<string, BacktestResult[]> = new Map();
  private performanceMetrics: SignalPerformance | null = null;

  private readonly DEFAULT_CONFIG: SignalGenerationConfig = {
    timeframes: ['1h', '4h', '1d'],
    minConfidence: 0.7,
    useAI: true,
    useSMC: true,
    riskParameters: {
      maxRiskPerTrade: 0.02, // 2%
      maxDailyRisk: 0.06, // 6%
      minRiskReward: 2.0, // 1:2 minimum
      maxCorrelatedTrades: 3,
      stopLossPercentage: 0.02, // 2%
      takeProfitPercentage: 0.06 // 6%
    },
    alertConfig: {
      enabled: true,
      minConfidence: 0.8,
      symbols: ['BTC', 'ETH'],
      channels: ['push', 'voice'],
      language: 'en'
    },
    backtestPeriod: 30
  };

  constructor() {
    this.marketAnalyzer = new MarketAnalysisEngine();
    this.cypherAI = cypherAI;
    this.initializeService();
  }

  private initializeService(): void {
    this.loadSignalHistory();
    this.calculatePerformanceMetrics();
  }

  async generateSignal(
    symbol: string,
    marketData: CandleData[],
    config: Partial<SignalGenerationConfig> = {}
  ): Promise<TradingSignal | null> {
    try {
      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
      
      // Perform multi-timeframe analysis
      const mtfAnalysis = await this.marketAnalyzer.analyzeMarketStructure(
        marketData,
        finalConfig.timeframes
      );

      // Get AI analysis if enabled
      let aiAnalysis: MarketAnalysis | null = null;
      if (finalConfig.useAI) {
        aiAnalysis = await (this.cypherAI as any).analyzeMarket?.(
          symbol,
          finalConfig.timeframes[0],
          finalConfig.alertConfig.language
        ) || null;
      }

      // Generate signal based on analysis
      const signal = await this.createSignalFromAnalysis(
        symbol,
        mtfAnalysis,
        aiAnalysis,
        finalConfig
      );

      if (signal) {
        // Validate signal
        const validation = this.validateSignal(signal, mtfAnalysis);
        
        if (validation.overallValid && signal.confidence >= finalConfig.minConfidence) {
          // Store active signal
          this.activeSignals.set(signal.id, signal);
          this.signalHistory.push(signal);
          
          // Send alerts if configured
          if (finalConfig.alertConfig.enabled) {
            await this.sendSignalAlert(signal, finalConfig.alertConfig);
          }
          
          return signal;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to generate signal:', error);
      throw new Error(`Signal generation failed: ${(error as Error).message}`);
    }
  }

  private async createSignalFromAnalysis(
    symbol: string,
    mtfAnalysis: MultiTimeframeAnalysis,
    aiAnalysis: MarketAnalysis | null,
    config: SignalGenerationConfig
  ): Promise<TradingSignal | null> {
    const primaryTimeframe = mtfAnalysis.primaryTimeframe;
    const primaryAnalysis = mtfAnalysis.timeframes[primaryTimeframe];
    
    if (!primaryAnalysis) return null;

    // Determine signal type based on analysis
    const signalType = this.determineSignalType(mtfAnalysis, aiAnalysis);
    if (signalType === 'hold') return null;

    // Calculate entry price (current market price)
    const entryPrice = this.getCurrentPrice(symbol); // Mock implementation
    
    // Calculate stop loss and take profit levels
    const { stopLoss, takeProfit } = this.calculateLevels(
      entryPrice,
      signalType,
      primaryAnalysis,
      config.riskParameters
    );

    // Calculate risk-reward ratio
    const riskReward = this.calculateRiskReward(entryPrice, stopLoss, takeProfit[0]);
    
    // Filter by minimum risk-reward
    if (riskReward < config.riskParameters.minRiskReward) {
      return null;
    }

    // Calculate confidence score
    const confidence = this.calculateSignalConfidence(mtfAnalysis, aiAnalysis);
    
    // Generate reasoning
    const reasoning = this.generateSignalReasoning(mtfAnalysis, aiAnalysis, signalType);

    // Determine priority
    const priority = this.determineSignalPriority(confidence, riskReward);

    // Create signal
    const signal: TradingSignal = {
      id: `signal_${symbol}_${Date.now()}`,
      symbol,
      type: signalType,
      entry: entryPrice,
      stopLoss,
      takeProfit,
      confidence,
      riskReward,
      timeframe: primaryTimeframe,
      timestamp: Date.now(),
      reasoning,
      smcBased: config.useSMC,
      aiAnalysis: aiAnalysis || {} as MarketAnalysis,
      expiresAt: Date.now() + (4 * 60 * 60 * 1000), // 4 hours
      status: 'active',
      priority
    };

    return signal;
  }

  private determineSignalType(
    mtfAnalysis: MultiTimeframeAnalysis,
    aiAnalysis: MarketAnalysis | null
  ): 'buy' | 'sell' | 'hold' {
    // Weight different factors
    let bullishScore = 0;
    let bearishScore = 0;

    // MTF alignment weight
    if (mtfAnalysis.alignment === 'bullish') {
      bullishScore += mtfAnalysis.confidence * 0.4;
    } else if (mtfAnalysis.alignment === 'bearish') {
      bearishScore += mtfAnalysis.confidence * 0.4;
    }

    // AI analysis weight
    if (aiAnalysis) {
      if (aiAnalysis.sentiment === 'bullish') {
        bullishScore += (aiAnalysis.confidence / 100) * 0.3;
      } else if (aiAnalysis.sentiment === 'bearish') {
        bearishScore += (aiAnalysis.confidence / 100) * 0.3;
      }
    }

    // SMC analysis weight
    Object.values(mtfAnalysis.timeframes).forEach((analysis: any) => {
      const smcScore = this.calculateSMCScore(analysis);
      if (smcScore > 0) {
        bullishScore += smcScore * 0.3;
      } else {
        bearishScore += Math.abs(smcScore) * 0.3;
      }
    });

    // Determine signal type
    if (bullishScore > bearishScore + 0.2) return 'buy';
    if (bearishScore > bullishScore + 0.2) return 'sell';
    return 'hold';
  }

  private calculateSMCScore(analysis: any): number {
    let score = 0;

    // Order blocks score
    const bullishOBs = analysis.orderBlocks?.filter((ob: any) => ob.type === 'bullish').length || 0;
    const bearishOBs = analysis.orderBlocks?.filter((ob: any) => ob.type === 'bearish').length || 0;
    score += (bullishOBs - bearishOBs) * 0.1;

    // Break of structure score
    const bullishBOS = analysis.breakOfStructure?.filter((bos: any) => bos.type === 'bullish').length || 0;
    const bearishBOS = analysis.breakOfStructure?.filter((bos: any) => bos.type === 'bearish').length || 0;
    score += (bullishBOS - bearishBOS) * 0.15;

    // Institutional flow score
    if (analysis.institutionalFlow) {
      if (analysis.institutionalFlow.direction === 'accumulation') {
        score += analysis.institutionalFlow.strength * 0.2;
      } else if (analysis.institutionalFlow.direction === 'distribution') {
        score -= analysis.institutionalFlow.strength * 0.2;
      }
    }

    return Math.max(Math.min(score, 1), -1); // Clamp between -1 and 1
  }

  private getCurrentPrice(symbol: string): number {
    // Mock implementation - in production, fetch from price API
    return 50000; // Default price - in production, fetch from price API
  }

  private calculateLevels(
    entryPrice: number,
    signalType: 'buy' | 'sell',
    analysis: any,
    riskParams: RiskParameters
  ): { stopLoss: number; takeProfit: number[] } {
    let stopLoss: number;
    let takeProfit: number[];

    if (signalType === 'buy') {
      // Use SMC levels if available, otherwise use percentage
      const supportLevels = analysis.keyLevels?.filter((level: any) => level.type === 'support') || [];

      if (supportLevels.length > 0) {
        // Use nearest support as stop loss
        stopLoss = supportLevels.reduce((closest: any, level: any) =>
          Math.abs(level.price - entryPrice) < Math.abs(closest.price - entryPrice)
            ? level : closest
        ).price;
      } else {
        stopLoss = entryPrice * (1 - riskParams.stopLossPercentage);
      }

      // Calculate multiple take profit levels
      const riskAmount = entryPrice - stopLoss;
      takeProfit = [
        entryPrice + (riskAmount * 2), // 1:2 R:R
        entryPrice + (riskAmount * 3), // 1:3 R:R
        entryPrice + (riskAmount * 5)  // 1:5 R:R
      ];

    } else { // sell
      // Use SMC levels for resistance
      const resistanceLevels = analysis.keyLevels?.filter((level: any) => level.type === 'resistance') || [];
      
      if (resistanceLevels.length > 0) {
        stopLoss = resistanceLevels.reduce((closest: any, level: any) =>
          Math.abs(level.price - entryPrice) < Math.abs(closest.price - entryPrice)
            ? level : closest
        ).price;
      } else {
        stopLoss = entryPrice * (1 + riskParams.stopLossPercentage);
      }

      const riskAmount = stopLoss - entryPrice;
      takeProfit = [
        entryPrice - (riskAmount * 2),
        entryPrice - (riskAmount * 3),
        entryPrice - (riskAmount * 5)
      ];
    }

    return { stopLoss, takeProfit };
  }

  private calculateRiskReward(entry: number, stopLoss: number, takeProfit: number): number {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    return risk > 0 ? reward / risk : 0;
  }

  private calculateSignalConfidence(
    mtfAnalysis: MultiTimeframeAnalysis,
    aiAnalysis: MarketAnalysis | null
  ): number {
    let confidence = 0;

    // Base confidence from MTF alignment
    confidence += mtfAnalysis.confidence * 0.4;

    // AI confidence
    if (aiAnalysis) {
      confidence += (aiAnalysis.confidence / 100) * 0.3;
    }

    // SMC confluence
    const smcConfluence = this.calculateSMCConfluence(mtfAnalysis);
    confidence += smcConfluence * 0.3;

    return Math.min(confidence, 1);
  }

  private calculateSMCConfluence(mtfAnalysis: MultiTimeframeAnalysis): number {
    let confluence = 0;
    let factors = 0;

    Object.values(mtfAnalysis.timeframes).forEach((analysis: any) => {
      // Order blocks confluence
      if (analysis.orderBlocks?.length > 0) {
        confluence += 0.2;
        factors++;
      }

      // Liquidity pools confluence
      if (analysis.liquidityPools?.length > 0) {
        confluence += 0.2;
        factors++;
      }

      // Fair value gaps confluence
      const unfilledFVGs = analysis.fairValueGaps?.filter((fvg: any) => !fvg.filled).length || 0;
      if (unfilledFVGs > 0) {
        confluence += 0.15;
        factors++;
      }

      // Institutional flow confluence
      if (analysis.institutionalFlow?.strength > 0.5) {
        confluence += 0.25;
        factors++;
      }
    });

    return factors > 0 ? confluence / factors : 0;
  }

  private generateSignalReasoning(
    mtfAnalysis: MultiTimeframeAnalysis,
    aiAnalysis: MarketAnalysis | null,
    signalType: 'buy' | 'sell'
  ): string[] {
    const reasons: string[] = [];

    // MTF alignment
    if (mtfAnalysis.alignment !== 'conflicted') {
      reasons.push(`Multi-timeframe alignment shows ${mtfAnalysis.alignment} sentiment`);
    }

    // AI reasoning
    if ((aiAnalysis as any)?.reasons) {
      reasons.push(...(aiAnalysis as any).reasons.slice(0, 2));
    }

    // SMC reasoning
    Object.values(mtfAnalysis.timeframes).forEach((analysis: any) => {
      if (analysis.orderBlocks?.length > 0) {
        reasons.push(`${analysis.orderBlocks.length} order blocks identified on ${analysis.timeframe}`);
      }

      if (analysis.breakOfStructure?.length > 0) {
        const latestBOS = analysis.breakOfStructure[analysis.breakOfStructure.length - 1];
        reasons.push(`Recent ${latestBOS.type} break of structure at ${latestBOS.level}`);
      }

      if (analysis.institutionalFlow?.direction && analysis.institutionalFlow.strength > 0.6) {
        reasons.push(`Strong institutional ${analysis.institutionalFlow.direction} detected`);
      }
    });

    return reasons.slice(0, 5); // Limit to 5 reasons
  }

  private determineSignalPriority(confidence: number, riskReward: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = confidence * 0.6 + (Math.min(riskReward, 5) / 5) * 0.4;

    if (score >= 0.9) return 'critical';
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private validateSignal(signal: TradingSignal, mtfAnalysis: MultiTimeframeAnalysis): SignalValidation {
    const validation: SignalValidation = {
      multiTimeframeAlignment: false,
      volumeConfirmation: false,
      smcConfirmation: false,
      riskRewardValid: false,
      overallValid: false,
      score: 0
    };

    // Check MTF alignment
    validation.multiTimeframeAlignment = mtfAnalysis.alignment !== 'conflicted';

    // Check volume confirmation
    validation.volumeConfirmation = this.checkVolumeConfirmation(mtfAnalysis);

    // Check SMC confirmation
    validation.smcConfirmation = signal.type !== 'hold' ? this.checkSMCConfirmation(mtfAnalysis, signal.type) : false;

    // Check risk-reward
    validation.riskRewardValid = signal.riskReward >= 2.0;

    // Calculate overall score
    const scores = [
      validation.multiTimeframeAlignment ? 0.25 : 0,
      validation.volumeConfirmation ? 0.25 : 0,
      validation.smcConfirmation ? 0.3 : 0,
      validation.riskRewardValid ? 0.2 : 0
    ];

    validation.score = scores.reduce((sum: number, score: number) => sum + score, 0);
    validation.overallValid = validation.score >= 0.7;

    return validation;
  }

  private checkVolumeConfirmation(mtfAnalysis: MultiTimeframeAnalysis): boolean {
    // Check if recent volume supports the signal
    return Object.values(mtfAnalysis.timeframes).some((analysis: any) =>
      analysis.institutionalFlow?.strength > 0.5
    );
  }

  private checkSMCConfirmation(mtfAnalysis: MultiTimeframeAnalysis, signalType: 'buy' | 'sell'): boolean {
    // Check if SMC analysis supports the signal
    return Object.values(mtfAnalysis.timeframes).some((analysis: any) => {
      const relevantOBs = analysis.orderBlocks?.filter((ob: any) =>
        signalType === 'buy' ? ob.type === 'bullish' : ob.type === 'bearish'
      ) || [];

      const relevantBOS = analysis.breakOfStructure?.filter((bos: any) =>
        signalType === 'buy' ? bos.type === 'bullish' : bos.type === 'bearish'
      ) || [];

      return relevantOBs.length > 0 || relevantBOS.length > 0;
    });
  }

  async backtestSignal(signal: TradingSignal, historicalData: CandleData[]): Promise<BacktestResult> {
    const entryCandle = historicalData.find(candle => 
      candle.timestamp >= signal.timestamp
    );

    if (!entryCandle) {
      throw new Error('No historical data available for backtesting');
    }

    const entryIndex = historicalData.indexOf(entryCandle);
    const futureCandles = historicalData.slice(entryIndex + 1);

    let exitPrice = signal.entry;
    let exitReason: 'stop_loss' | 'take_profit' | 'time_exit' = 'time_exit';
    let maxDrawdown = 0;
    let maxProfit = 0;
    let holdingTime = 0;

    for (const candle of futureCandles) {
      holdingTime = candle.timestamp - signal.timestamp;

      // Check if signal expired
      if (candle.timestamp > signal.expiresAt) {
        exitPrice = candle.close;
        exitReason = 'time_exit';
        break;
      }

      // Calculate current P&L
      const currentPnL = signal.type === 'buy' 
        ? (candle.close - signal.entry) / signal.entry
        : (signal.entry - candle.close) / signal.entry;

      // Update max profit and drawdown
      if (currentPnL > maxProfit) maxProfit = currentPnL;
      if (currentPnL < maxDrawdown) maxDrawdown = currentPnL;

      // Check stop loss
      if (signal.type === 'buy' && candle.low <= signal.stopLoss) {
        exitPrice = signal.stopLoss;
        exitReason = 'stop_loss';
        break;
      } else if (signal.type === 'sell' && candle.high >= signal.stopLoss) {
        exitPrice = signal.stopLoss;
        exitReason = 'stop_loss';
        break;
      }

      // Check take profit levels
      for (const tp of signal.takeProfit) {
        if (signal.type === 'buy' && candle.high >= tp) {
          exitPrice = tp;
          exitReason = 'take_profit';
          break;
        } else if (signal.type === 'sell' && candle.low <= tp) {
          exitPrice = tp;
          exitReason = 'take_profit';
          break;
        }
      }

      if (exitReason !== 'time_exit') break;
    }

    // Calculate final P&L
    const pnl = signal.type === 'buy' 
      ? exitPrice - signal.entry
      : signal.entry - exitPrice;

    const pnlPercentage = (pnl / signal.entry) * 100;

    const result: BacktestResult = {
      signalId: signal.id,
      entryPrice: signal.entry,
      exitPrice,
      exitReason,
      pnl,
      pnlPercentage,
      holdingTime,
      maxDrawdown,
      maxProfit
    };

    // Store result
    if (!this.backtestResults.has(signal.symbol)) {
      this.backtestResults.set(signal.symbol, []);
    }
    this.backtestResults.get(signal.symbol)!.push(result);

    return result;
  }

  async backtestStrategy(
    symbol: string,
    historicalData: CandleData[],
    config: Partial<SignalGenerationConfig> = {}
  ): Promise<SignalPerformance> {
    const results: BacktestResult[] = [];
    const windowSize = 100; // Candles to analyze at once
    
    for (let i = windowSize; i < historicalData.length - windowSize; i += 20) {
      const analysisData = historicalData.slice(i - windowSize, i);
      
      try {
        // Generate signal for this point in time
        const signal = await this.generateSignal(symbol, analysisData, config);
        
        if (signal) {
          // Backtest the signal
          const futureData = historicalData.slice(i);
          const result = await this.backtestSignal(signal, futureData);
          results.push(result);
        }
      } catch (error) {
      }
    }

    return this.calculatePerformanceFromResults(results);
  }

  private calculatePerformanceFromResults(results: BacktestResult[]): SignalPerformance {
    if (results.length === 0) {
      return {
        totalSignals: 0,
        successfulSignals: 0,
        winRate: 0,
        averagePnL: 0,
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        averageHoldingTime: 0,
        bestTrade: {} as BacktestResult,
        worstTrade: {} as BacktestResult,
        recentPerformance: []
      };
    }

    const successfulTrades = results.filter(r => r.pnl > 0);
    const winRate = successfulTrades.length / results.length;
    const averagePnL = results.reduce((sum: number, r: any) => sum + r.pnlPercentage, 0) / results.length;
    const totalReturn = results.reduce((product: number, r: any) => product * (1 + r.pnlPercentage / 100), 1) - 1;
    
    // Calculate Sharpe ratio (simplified)
    const returns = results.map((r: any) => r.pnlPercentage);
    const avgReturn = returns.reduce((sum: number, r: number) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const maxDrawdown = Math.min(...results.map((r: any) => r.maxDrawdown));
    const averageHoldingTime = results.reduce((sum: number, r: any) => sum + r.holdingTime, 0) / results.length;

    const bestTrade = results.reduce((best: any, current: any) =>
      current.pnl > best.pnl ? current : best
    );

    const worstTrade = results.reduce((worst: any, current: any) =>
      current.pnl < worst.pnl ? current : worst
    );

    return {
      totalSignals: results.length,
      successfulSignals: successfulTrades.length,
      winRate,
      averagePnL,
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      averageHoldingTime,
      bestTrade,
      worstTrade,
      recentPerformance: results.slice(-10)
    };
  }

  getActiveSignals(filter?: SignalFilter): TradingSignal[] {
    let signals = Array.from(this.activeSignals.values())
      .filter(signal => signal.status === 'active');

    if (filter) {
      signals = this.applySignalFilter(signals, filter);
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  getSignalHistory(filter?: SignalFilter): TradingSignal[] {
    let signals = [...this.signalHistory];

    if (filter) {
      signals = this.applySignalFilter(signals, filter);
    }

    return signals.sort((a, b) => b.timestamp - a.timestamp);
  }

  private applySignalFilter(signals: TradingSignal[], filter: SignalFilter): TradingSignal[] {
    return signals.filter(signal => {
      if (filter.symbols && !filter.symbols.includes(signal.symbol)) return false;
      if (filter.timeframes && !filter.timeframes.includes(signal.timeframe)) return false;
      if (filter.minConfidence && signal.confidence < filter.minConfidence) return false;
      if (filter.minRiskReward && signal.riskReward < filter.minRiskReward) return false;
      if (filter.signalTypes && !filter.signalTypes.includes(signal.type)) return false;
      if (filter.smcOnly && !signal.smcBased) return false;
      if (filter.priorities && !filter.priorities.includes(signal.priority)) return false;
      
      return true;
    });
  }

  async sendSignalAlert(signal: TradingSignal, alertConfig: AlertConfig): Promise<void> {
    try {
      const message = this.formatSignalMessage(signal, alertConfig.language);

      // Send through configured channels
      for (const channel of alertConfig.channels) {
        switch (channel) {
          case 'voice':
            // Integration with VoiceCommandService would go here
            break;
          case 'push':
            // Push notification implementation
            break;
          case 'email':
            // Email implementation
            break;
          case 'webhook':
            if (alertConfig.customWebhook) {
              await this.sendWebhookAlert(signal, alertConfig.customWebhook);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Failed to send signal alert:', error);
    }
  }

  private formatSignalMessage(signal: TradingSignal, language: Language): string {
    const messages = {
      en: `🚀 ${signal.priority.toUpperCase()} SIGNAL: ${signal.type.toUpperCase()} ${signal.symbol} at $${signal.entry} | SL: $${signal.stopLoss} | TP: $${signal.takeProfit[0]} | R:R ${signal.riskReward.toFixed(1)} | Confidence: ${(signal.confidence * 100).toFixed(0)}%`,
      pt: `🚀 SINAL ${signal.priority.toUpperCase()}: ${signal.type.toUpperCase()} ${signal.symbol} em $${signal.entry} | SL: $${signal.stopLoss} | TP: $${signal.takeProfit[0]} | R:R ${signal.riskReward.toFixed(1)} | Confiança: ${(signal.confidence * 100).toFixed(0)}%`,
      fr: `🚀 SIGNAL ${signal.priority.toUpperCase()}: ${signal.type.toUpperCase()} ${signal.symbol} à $${signal.entry} | SL: $${signal.stopLoss} | TP: $${signal.takeProfit[0]} | R:R ${signal.riskReward.toFixed(1)} | Confiance: ${(signal.confidence * 100).toFixed(0)}%`,
      es: `🚀 SEÑAL ${signal.priority.toUpperCase()}: ${signal.type.toUpperCase()} ${signal.symbol} en $${signal.entry} | SL: $${signal.stopLoss} | TP: $${signal.takeProfit[0]} | R:R ${signal.riskReward.toFixed(1)} | Confianza: ${(signal.confidence * 100).toFixed(0)}%`
    };

    return messages[language] || messages.en;
  }

  private async sendWebhookAlert(signal: TradingSignal, webhookUrl: string): Promise<void> {
    try {
      const payload = {
        signal: {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          confidence: signal.confidence,
          riskReward: signal.riskReward,
          priority: signal.priority,
          timestamp: signal.timestamp
        },
        timestamp: Date.now()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  updateSignalStatus(signalId: string, status: TradingSignal['status']): boolean {
    const signal = this.activeSignals.get(signalId);
    if (signal) {
      signal.status = status;
      
      if (status !== 'active') {
        this.activeSignals.delete(signalId);
      }
      
      return true;
    }
    return false;
  }

  getSignalById(signalId: string): TradingSignal | null {
    return this.activeSignals.get(signalId) || 
           this.signalHistory.find(s => s.id === signalId) || null;
  }

  getPerformanceMetrics(): SignalPerformance | null {
    return this.performanceMetrics;
  }

  private loadSignalHistory(): void {
    // In production, load from database
    this.signalHistory = [];
  }

  private calculatePerformanceMetrics(): void {
    if (this.signalHistory.length === 0) {
      this.performanceMetrics = null;
      return;
    }

    // Calculate metrics from completed signals
    const completedSignals = this.signalHistory.filter(s => 
      s.status === 'executed' || s.status === 'expired'
    );

    if (completedSignals.length > 0) {
      // This would calculate actual performance from trade results
      // For now, return mock performance
      this.performanceMetrics = {
        totalSignals: completedSignals.length,
        successfulSignals: Math.floor(completedSignals.length * 0.65),
        winRate: 0.65,
        averagePnL: 2.3,
        totalReturn: 0.15,
        sharpeRatio: 1.8,
        maxDrawdown: -0.08,
        averageHoldingTime: 4 * 60 * 60 * 1000, // 4 hours
        bestTrade: {} as BacktestResult,
        worstTrade: {} as BacktestResult,
        recentPerformance: []
      };
    }
  }

  // Real-time signal monitoring
  async monitorActiveSignals(): Promise<void> {
    const activeSignals = Array.from(this.activeSignals.values());
    
    for (const signal of activeSignals) {
      // Check if signal has expired
      if (Date.now() > signal.expiresAt) {
        this.updateSignalStatus(signal.id, 'expired');
        continue;
      }

      // In production, check current price and update signal status
      // based on stop loss or take profit hits
    }
  }

  async optimizeSignalParameters(
    historicalData: CandleData[],
    parameterRanges: any
  ): Promise<SignalGenerationConfig> {
    // Implement parameter optimization using genetic algorithm or grid search
    // This would test different combinations of parameters and return the best performing set
    
    return this.DEFAULT_CONFIG;
  }
}

export default TradingSignalsService;