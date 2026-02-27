/**
 * 🤖 AI TRADING SIGNALS GENERATION ENGINE
 * Advanced AI-powered trading signals for Bitcoin ecosystem
 * Combines neural predictions, sentiment analysis, and technical indicators
 */

import { logger } from '@/lib/logger';
import { neuralPricePrediction, PredictionResult } from './NeuralPricePrediction';
import { sentimentAnalysis, SentimentData } from './SentimentAnalysis';

export interface AITradeSignal {
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100%
  priceTarget: number;
  stopLoss: number;
  reasoning: {
    technicalFactors: string[];
    fundamentalFactors: string[];
    sentimentFactors: string[];
    riskAssessment: RiskLevel;
  };
  timeHorizon: '1H' | '4H' | '1D' | '1W';
  timestamp: string;
  signalId: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedReturn: number; // Percentage
  riskReward: number; // Risk/Reward ratio
}

export interface SignalAlert {
  id: string;
  signal: AITradeSignal;
  type: 'NEW_SIGNAL' | 'SIGNAL_UPDATE' | 'STOP_LOSS_HIT' | 'TARGET_REACHED';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  actionRequired: boolean;
}

export interface TradingSession {
  sessionId: string;
  asset: string;
  signals: AITradeSignal[];
  performance: {
    totalSignals: number;
    successfulSignals: number;
    accuracy: number;
    totalReturn: number;
    sharpeRatio: number;
  };
  startTime: string;
  lastUpdate: string;
}

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export class TradingSignalsEngine {
  private activeSignals: Map<string, AITradeSignal>;
  private signalHistory: AITradeSignal[];
  private activeSessions: Map<string, TradingSession>;
  private alertCallbacks: Array<(alert: SignalAlert) => void>;
  private readonly SIGNAL_TTL = 30 * 60 * 1000; // 30 minutes
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private priceCache: Map<string, { price: number; ts: number }> = new Map();
  private readonly PRICE_CACHE_TTL = 30_000;

  constructor() {
    this.activeSignals = new Map();
    this.signalHistory = [];
    this.activeSessions = new Map();
    this.alertCallbacks = [];
    this.startSignalGeneration();
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Generate comprehensive trading signal for asset
   */
  async generateSignal(asset: string, timeHorizon: '1H' | '4H' | '1D' | '1W' = '4H'): Promise<AITradeSignal> {
    try {
      logger.info(`[SIGNALS] Generating trading signal for ${asset} - ${timeHorizon}`);

      // Pre-fetch current price into cache
      await this.fetchCurrentPrice(asset);

      // Gather AI analysis data
      const [prediction, sentiment] = await Promise.all([
        neuralPricePrediction.predictPrice(asset),
        sentimentAnalysis.analyzeSentiment(asset)
      ]);

      // Generate the signal
      const signal = await this.analyzeAndGenerateSignal(asset, prediction, sentiment, timeHorizon);

      // Store and track the signal
      this.activeSignals.set(signal.signalId, signal);
      this.signalHistory.push(signal);
      // Cap history at 1000 entries
      if (this.signalHistory.length > 1000) {
        this.signalHistory.shift();
      }

      // Send alert for high confidence signals
      if (signal.confidence > 75 || signal.urgency === 'CRITICAL') {
        this.sendSignalAlert({
          id: `alert-${Date.now()}`,
          signal,
          type: 'NEW_SIGNAL',
          message: `High confidence ${signal.action} signal for ${asset}: ${signal.confidence}% confidence`,
          severity: signal.urgency === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          timestamp: new Date().toISOString(),
          actionRequired: signal.confidence > 80
        });
      }

      logger.info(`[SIGNALS] Generated ${signal.action} signal for ${asset}: ${signal.confidence}% confidence`);
      return signal;

    } catch (error) {
      logger.error(`[SIGNALS] Failed to generate signal for ${asset}`, error as Error);
      return this.getFallbackSignal(asset, timeHorizon);
    }
  }

  /**
   * Analyze prediction and sentiment data to generate actionable signal
   */
  private async analyzeAndGenerateSignal(
    asset: string,
    prediction: PredictionResult,
    sentiment: SentimentData,
    timeHorizon: '1H' | '4H' | '1D' | '1W'
  ): Promise<AITradeSignal> {
    const currentPrice = this.getCurrentPrice(asset);
    const timeframePrediction = prediction.predictions[timeHorizon];
    
    // Calculate signal components
    const technicalScore = this.calculateTechnicalScore(prediction.factors.technical);
    const sentimentScore = this.calculateSentimentScore(sentiment);
    const onChainScore = this.calculateOnChainScore(prediction.factors.onChain);
    const macroScore = this.calculateMacroScore(prediction.factors.macro);

    // Weighted composite score
    const compositeScore = (
      technicalScore * 0.35 +
      sentimentScore * 0.25 +
      onChainScore * 0.25 +
      macroScore * 0.15
    );

    // Determine action based on composite score and price prediction
    const priceChange = (timeframePrediction.price - currentPrice) / currentPrice;
    const action = this.determineAction(compositeScore, priceChange, timeframePrediction.confidence);

    // Calculate targets and stop loss
    const { priceTarget, stopLoss } = this.calculateTargets(currentPrice, action, priceChange, prediction.riskAssessment);

    // Calculate confidence
    const confidence = this.calculateSignalConfidence(
      compositeScore,
      timeframePrediction.confidence,
      sentiment.overall.confidence,
      prediction.riskAssessment
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(prediction, sentiment, technicalScore, sentimentScore);

    // Calculate urgency
    const urgency = this.calculateUrgency(confidence, Math.abs(priceChange), sentiment.alerts.length);

    const signalId = `${asset}-${timeHorizon}-${Date.now()}`;

    return {
      asset,
      action,
      confidence: Math.round(confidence),
      priceTarget,
      stopLoss,
      reasoning,
      timeHorizon,
      timestamp: new Date().toISOString(),
      signalId,
      urgency,
      expectedReturn: Math.round(((priceTarget - currentPrice) / currentPrice) * 100 * 100) / 100,
      riskReward: Math.round(((priceTarget - currentPrice) / (currentPrice - stopLoss)) * 100) / 100
    };
  }

  /**
   * Determine trading action based on analysis
   */
  private determineAction(
    compositeScore: number,
    priceChange: number,
    predictionConfidence: number
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Strong bullish signal
    if (compositeScore > 0.3 && priceChange > 0.02 && predictionConfidence > 70) {
      return 'BUY';
    }
    
    // Strong bearish signal
    if (compositeScore < -0.3 && priceChange < -0.02 && predictionConfidence > 70) {
      return 'SELL';
    }
    
    // Moderate bullish
    if (compositeScore > 0.15 && priceChange > 0.01) {
      return 'BUY';
    }
    
    // Moderate bearish
    if (compositeScore < -0.15 && priceChange < -0.01) {
      return 'SELL';
    }
    
    return 'HOLD';
  }

  /**
   * Calculate price targets and stop loss
   */
  private calculateTargets(
    currentPrice: number,
    action: 'BUY' | 'SELL' | 'HOLD',
    priceChange: number,
    riskLevel: RiskLevel
  ): { priceTarget: number; stopLoss: number } {
    const riskMultipliers = {
      'LOW': 0.5,
      'MEDIUM': 0.75,
      'HIGH': 1.0,
      'EXTREME': 1.5
    };

    const baseRisk = riskMultipliers[riskLevel];

    if (action === 'BUY') {
      const targetMultiplier = Math.max(1.5, Math.abs(priceChange) * 100);
      const priceTarget = currentPrice * (1 + Math.abs(priceChange) * targetMultiplier);
      const stopLoss = currentPrice * (1 - (0.02 + baseRisk * 0.01)); // 2-3.5% stop loss
      
      return {
        priceTarget: Math.round(priceTarget * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100
      };
    } else if (action === 'SELL') {
      const targetMultiplier = Math.max(1.5, Math.abs(priceChange) * 100);
      const priceTarget = currentPrice * (1 + priceChange * targetMultiplier);
      const stopLoss = currentPrice * (1 + (0.02 + baseRisk * 0.01)); // 2-3.5% stop loss
      
      return {
        priceTarget: Math.round(priceTarget * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100
      };
    } else {
      return {
        priceTarget: currentPrice,
        stopLoss: currentPrice * 0.95 // Conservative 5% stop
      };
    }
  }

  /**
   * Calculate overall signal confidence
   */
  private calculateSignalConfidence(
    compositeScore: number,
    predictionConfidence: number,
    sentimentConfidence: number,
    riskLevel: RiskLevel
  ): number {
    let baseConfidence = (predictionConfidence + sentimentConfidence) / 2;
    
    // Boost confidence for strong composite scores
    const scoreBoost = Math.abs(compositeScore) * 20;
    baseConfidence += scoreBoost;
    
    // Reduce confidence for high risk
    const riskPenalty = { 'LOW': 0, 'MEDIUM': 5, 'HIGH': 10, 'EXTREME': 20 }[riskLevel];
    baseConfidence -= riskPenalty;
    
    return Math.max(30, Math.min(95, baseConfidence));
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    prediction: PredictionResult,
    sentiment: SentimentData,
    technicalScore: number,
    sentimentScore: number
  ): AITradeSignal['reasoning'] {
    const technicalFactors: string[] = [];
    const fundamentalFactors: string[] = [];
    const sentimentFactors: string[] = [];

    // Technical analysis
    if (prediction.factors.technical.rsi < 30) {
      technicalFactors.push('RSI indicates oversold conditions');
    } else if (prediction.factors.technical.rsi > 70) {
      technicalFactors.push('RSI indicates overbought conditions');
    }

    if (prediction.factors.technical.macd > 0) {
      technicalFactors.push('MACD shows bullish momentum');
    } else {
      technicalFactors.push('MACD shows bearish momentum');
    }

    if (prediction.factors.technical.volume > 3000000) {
      technicalFactors.push('High trading volume supports the move');
    }

    // Fundamental analysis
    if (prediction.factors.onChain.transactionCount > 350000) {
      fundamentalFactors.push('High network activity indicates strong usage');
    }

    if (prediction.factors.onChain.hodlerBehavior > 75) {
      fundamentalFactors.push('Strong hodler behavior suggests accumulation');
    }

    if (prediction.factors.macro.dollarIndex > 105) {
      fundamentalFactors.push('Strong dollar may pressure Bitcoin prices');
    }

    // Sentiment analysis
    if (sentiment.overall.sentiment === 'VERY_POSITIVE') {
      sentimentFactors.push('Extremely bullish social sentiment');
    } else if (sentiment.overall.sentiment === 'VERY_NEGATIVE') {
      sentimentFactors.push('Extremely bearish social sentiment');
    }

    if (sentiment.sources.whaleMovements.score > 0.5) {
      sentimentFactors.push('Whale accumulation detected');
    } else if (sentiment.sources.whaleMovements.score < -0.5) {
      sentimentFactors.push('Whale distribution activity');
    }

    if (sentiment.alerts.length > 0) {
      sentimentFactors.push(`${sentiment.alerts.length} market alerts active`);
    }

    return {
      technicalFactors,
      fundamentalFactors,
      sentimentFactors,
      riskAssessment: prediction.riskAssessment
    };
  }

  /**
   * Calculate urgency level
   */
  private calculateUrgency(
    confidence: number,
    priceChangeAbs: number,
    alertCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (confidence > 85 && priceChangeAbs > 0.05) return 'CRITICAL';
    if (confidence > 75 && (priceChangeAbs > 0.03 || alertCount > 2)) return 'HIGH';
    if (confidence > 65 && priceChangeAbs > 0.02) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Helper scoring methods
   */
  private calculateTechnicalScore(technical: PredictionResult['factors']['technical']): number {
    let score = 0;
    
    // RSI scoring
    if (technical.rsi < 30) score += 0.3;
    else if (technical.rsi > 70) score -= 0.3;
    
    // MACD scoring
    score += Math.tanh(technical.macd / 1000) * 0.2;
    
    // Volume boost
    if (technical.volume > 3000000) score += 0.1;
    
    return Math.max(-1, Math.min(1, score));
  }

  private calculateSentimentScore(sentiment: SentimentData): number {
    return sentiment.overall.score;
  }

  private calculateOnChainScore(onChain: PredictionResult['factors']['onChain']): number {
    let score = 0;
    
    if (onChain.transactionCount > 350000) score += 0.2;
    if (onChain.activeAddresses > 1000000) score += 0.2;
    if (onChain.hodlerBehavior > 75) score += 0.2;
    if (onChain.hashRate > 550) score += 0.1;
    
    return Math.max(-1, Math.min(1, score));
  }

  private calculateMacroScore(macro: PredictionResult['factors']['macro']): number {
    let score = 0;
    
    score -= (macro.dollarIndex - 100) / 100 * 0.3;
    score += Math.min(macro.inflationRate / 10, 0.3);
    score -= macro.interestRates / 20;
    
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Get current price for asset from Binance with 30s cache
   */
  private async fetchCurrentPrice(asset: string): Promise<number> {
    const cached = this.priceCache.get(asset);
    if (cached && Date.now() - cached.ts < this.PRICE_CACHE_TTL) return cached.price;

    const symbolMap: Record<string, string> = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', ORDI: 'ORDIUSDT' };
    const symbol = symbolMap[asset] || `${asset}USDT`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const price = parseFloat(data.price);
      this.priceCache.set(asset, { price, ts: Date.now() });
      return price;
    } catch {
      // Fallback to cached or 0
      return cached?.price ?? 0;
    }
  }

  private getCurrentPrice(asset: string): number {
    // Synchronous accessor for cached price; returns last known or 0
    const cached = this.priceCache.get(asset);
    return cached?.price ?? 0;
  }

  /**
   * Real-time signal monitoring
   */
  private startSignalGeneration(): void {
    // Generate signals for major assets every 5 minutes
    this.intervalId = setInterval(async () => {
      const assets = ['BTC', 'ETH', 'ORDI'];
      const timeframes: Array<'1H' | '4H' | '1D' | '1W'> = ['1H', '4H', '1D'];
      
      try {
        for (const asset of assets) {
          for (const timeframe of timeframes) {
            await this.generateSignal(asset, timeframe);
          }
        }
        
        // Clean up old signals
        this.cleanupOldSignals();
        
        logger.info('[SIGNALS] Real-time signal generation cycle completed');
      } catch (error) {
        logger.error('[SIGNALS] Signal generation cycle error', error as Error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Clean up expired signals
   */
  private cleanupOldSignals(): void {
    const now = Date.now();
    
    for (const [signalId, signal] of this.activeSignals.entries()) {
      const signalAge = now - new Date(signal.timestamp).getTime();
      
      if (signalAge > this.SIGNAL_TTL) {
        this.activeSignals.delete(signalId);
      }
    }
  }

  /**
   * Send signal alert to subscribers
   */
  private sendSignalAlert(alert: SignalAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('[SIGNALS] Alert callback error', error as Error);
      }
    });
  }

  /**
   * Public API methods
   */

  /**
   * Get active signals
   */
  getActiveSignals(): AITradeSignal[] {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Get signals for specific asset
   */
  getSignalsForAsset(asset: string): AITradeSignal[] {
    return Array.from(this.activeSignals.values()).filter(signal => signal.asset === asset);
  }

  /**
   * Get signal history
   */
  getSignalHistory(limit: number = 50): AITradeSignal[] {
    return this.signalHistory.slice(-limit);
  }

  /**
   * Subscribe to signal alerts
   */
  subscribeToAlerts(callback: (alert: SignalAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get trading session performance
   */
  getSessionPerformance(sessionId: string): TradingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Batch generate signals for multiple assets
   */
  async batchGenerateSignals(assets: string[]): Promise<Map<string, AITradeSignal[]>> {
    const results = new Map<string, AITradeSignal[]>();
    const timeframes: Array<'1H' | '4H' | '1D' | '1W'> = ['1H', '4H', '1D', '1W'];
    
    await Promise.allSettled(
      assets.map(async (asset) => {
        const signals = await Promise.allSettled(
          timeframes.map(tf => this.generateSignal(asset, tf))
        );
        
        const validSignals = signals
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<AITradeSignal>).value);
        
        results.set(asset, validSignals);
      })
    );
    
    return results;
  }

  /**
   * Fallback signal for errors
   */
  private getFallbackSignal(asset: string, timeHorizon: '1H' | '4H' | '1D' | '1W'): AITradeSignal {
    const currentPrice = this.getCurrentPrice(asset);
    
    return {
      asset,
      action: 'HOLD',
      confidence: 50,
      priceTarget: currentPrice,
      stopLoss: currentPrice * 0.95,
      reasoning: {
        technicalFactors: ['Insufficient data for technical analysis'],
        fundamentalFactors: ['Unable to assess fundamental factors'],
        sentimentFactors: ['Sentiment data unavailable'],
        riskAssessment: 'MEDIUM'
      },
      timeHorizon,
      timestamp: new Date().toISOString(),
      signalId: `fallback-${asset}-${Date.now()}`,
      urgency: 'LOW',
      expectedReturn: 0,
      riskReward: 1
    };
  }
}

// Singleton instance
export const tradingSignals = new TradingSignalsEngine();