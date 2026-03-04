/**
 * @deprecated Use src/agent/ architecture instead (AgentOrchestrator + strategies).
 * This legacy agent is kept only because useMultiAgentSystem.ts imports TradingSignal from it.
 *
 * 🤖 AGENT_024: Trading Intelligence
 * AI-powered market analysis and signal generation
 */

import { EventEmitter } from 'events';

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface TradingSignal {
  id: string;
  timestamp: Date;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  reasons: string[];
  technicalIndicators: {
    rsi: number;
    macd: string;
    bollinger: string;
    volume: string;
  };
}

export class Agent024_TradingIntelligence extends EventEmitter {
  private isActive: boolean = false;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private signalHistory: TradingSignal[] = [];
  
  // AI Configuration
  private readonly config = {
    rsiOversold: 30,
    rsiOverbought: 70,
    confidenceThreshold: 0.75,
    analysisIntervalMs: 5000
  };

  constructor() {
    super();
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.emit('agent:started');
    
    // Start continuous market analysis
    this.analysisInterval = setInterval(() => {
      this.analyzeMarket();
    }, this.config.analysisIntervalMs);
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.emit('agent:stopped');
  }

  private async analyzeMarket() {
    try {
      // Mock market data - in production, fetch from real APIs
      const marketData = this.getMockMarketData();
      
      // Perform technical analysis
      const signal = this.performTechnicalAnalysis(marketData);
      
      if (signal && signal.confidence >= this.config.confidenceThreshold) {
        this.signalHistory.push(signal);
        this.emit('signal:generated', signal);
      }
    } catch (error) {
      console.error('Error in market analysis:', error);
      this.emit('error', error);
    }
  }

  private performTechnicalAnalysis(data: MarketData): TradingSignal | null {
    const reasons: string[] = [];
    let bullishScore = 0;
    let bearishScore = 0;
    
    // RSI Analysis
    if (data.rsi < this.config.rsiOversold) {
      bullishScore += 2;
      reasons.push('RSI oversold');
    } else if (data.rsi > this.config.rsiOverbought) {
      bearishScore += 2;
      reasons.push('RSI overbought');
    }
    
    // MACD Analysis
    if (data.macd.histogram > 0 && data.macd.value > data.macd.signal) {
      bullishScore += 1.5;
      reasons.push('MACD bullish crossover');
    } else if (data.macd.histogram < 0 && data.macd.value < data.macd.signal) {
      bearishScore += 1.5;
      reasons.push('MACD bearish crossover');
    }
    
    // Bollinger Bands Analysis
    if (data.price <= data.bollingerBands.lower) {
      bullishScore += 1.5;
      reasons.push('Price at lower Bollinger Band');
    } else if (data.price >= data.bollingerBands.upper) {
      bearishScore += 1.5;
      reasons.push('Price at upper Bollinger Band');
    }
    
    // Volume Analysis
    if (data.volume24h > 1000000000) { // High volume
      if (data.change24h > 0) {
        bullishScore += 1;
        reasons.push('High volume with positive momentum');
      } else {
        bearishScore += 1;
        reasons.push('High volume with negative momentum');
      }
    }
    
    // Calculate final signal
    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0) return null;
    
    const action = bullishScore > bearishScore ? 'BUY' : 
                  bearishScore > bullishScore ? 'SELL' : 'HOLD';
    
    const confidence = Math.max(bullishScore, bearishScore) / 6; // Normalize to 0-1
    
    return {
      id: `SIG-${Date.now()}`,
      timestamp: new Date(),
      symbol: data.symbol,
      action,
      confidence,
      price: data.price,
      reasons,
      technicalIndicators: {
        rsi: data.rsi,
        macd: data.macd.histogram > 0 ? 'Bullish' : 'Bearish',
        bollinger: data.price < data.bollingerBands.middle ? 'Below MA' : 'Above MA',
        volume: data.volume24h > 1000000000 ? 'High' : 'Normal'
      }
    };
  }

  private getMockMarketData(): MarketData {
    // Mock data with some randomization
    const basePrice = 107000;
    const randomFactor = 0.98 + Math.random() * 0.04; // ±2%
    
    return {
      symbol: 'BTC/USDT',
      price: basePrice * randomFactor,
      volume24h: 15000000000 * (0.8 + Math.random() * 0.4),
      change24h: -1.57,
      rsi: 25 + Math.random() * 50, // 25-75
      macd: {
        value: -50 + Math.random() * 100,
        signal: -50 + Math.random() * 100,
        histogram: -20 + Math.random() * 40
      },
      bollingerBands: {
        upper: basePrice * 1.02,
        middle: basePrice,
        lower: basePrice * 0.98
      }
    };
  }

  getSignalHistory(): TradingSignal[] {
    return this.signalHistory.slice(-50); // Last 50 signals
  }

  getStatus() {
    return {
      isActive: this.isActive,
      totalSignals: this.signalHistory.length,
      recentSignals: this.signalHistory.slice(-5)
    };
  }
}