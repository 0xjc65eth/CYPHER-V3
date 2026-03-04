/**
 * Trading Opportunity Engine
 * Sistema avançado de identificação de oportunidades de trading
 * Integra múltiplos indicadores e conceitos SMC
 */

import { SMCAnalysis, PriceData } from './SmartMoneyConcepts';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    squeeze: boolean;
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  volume: {
    current: number;
    average: number;
    ratio: number;
  };
}

export interface MarketConditions {
  volatility: 'low' | 'medium' | 'high';
  trend: 'strong_bullish' | 'weak_bullish' | 'ranging' | 'weak_bearish' | 'strong_bearish';
  momentum: 'accelerating' | 'steady' | 'decelerating';
  volume_profile: 'high' | 'normal' | 'low';
  session: 'asian' | 'london' | 'new_york' | 'overlap';
}

export interface TradingOpportunity {
  id: string;
  timestamp: number;
  asset: string;
  type: 'buy' | 'sell';
  strategy: string;
  timeframe: string;
  
  // Entrada e saída
  entry: {
    price: number;
    zone: {
      min: number;
      max: number;
    };
  };
  
  stopLoss: {
    price: number;
    reason: string;
    distance: number; // em %
  };
  
  takeProfit: {
    targets: Array<{
      price: number;
      percentage: number; // % da posição
      reason: string;
    }>;
  };
  
  // Análise de risco
  riskReward: number;
  confidence: number; // 0-100
  probability: number; // 0-100
  
  // Contexto da oportunidade
  setup: {
    name: string;
    description: string;
    confluences: string[];
    invalidation: string;
  };
  
  // Timing
  validity: {
    until: number;
    urgent: boolean;
  };
  
  // Meta informações
  marketConditions: MarketConditions;
  smcContext?: {
    orderBlock?: any;
    fvg?: any;
    liquidityZone?: any;
    inducement?: any;
  };
}

export interface OpportunityFilter {
  minConfidence: number;
  maxRisk: number; // % risk per trade
  strategies: string[];
  timeframes: string[];
  assets: string[];
  onlyHighProbability: boolean;
}

export class TradingOpportunityEngine {
  private opportunities: TradingOpportunity[] = [];
  private priceData: Record<string, PriceData[]> = {};
  private indicators: Record<string, TechnicalIndicators> = {};
  
  constructor(private config = {
    maxOpportunities: 50,
    opportunityTTL: 4 * 60 * 60 * 1000, // 4 horas
    minConfidence: 70,
    strategies: [
      'SMC_OrderBlock',
      'SMC_FVG',
      'SMC_Liquidity',
      'Breakout',
      'Reversal',
      'Momentum',
      'Mean_Reversion'
    ]
  }) {
    this.startCleanupScheduler();
  }
  
  /**
   * Processa nova análise SMC e gera oportunidades
   */
  processSMCAnalysis(asset: string, smcAnalysis: SMCAnalysis, priceData: PriceData[]): TradingOpportunity[] {
    this.priceData[asset] = priceData;
    this.updateTechnicalIndicators(asset, priceData);
    
    const newOpportunities: TradingOpportunity[] = [];
    const currentPrice = priceData[priceData.length - 1].close;
    const marketConditions = this.analyzeMarketConditions(asset, priceData);
    
    // 1. Oportunidades baseadas em Order Blocks
    const obOpportunities = this.identifyOrderBlockOpportunities(
      asset, currentPrice, smcAnalysis, marketConditions
    );
    newOpportunities.push(...obOpportunities);
    
    // 2. Oportunidades baseadas em Fair Value Gaps
    const fvgOpportunities = this.identifyFVGOpportunities(
      asset, currentPrice, smcAnalysis, marketConditions
    );
    newOpportunities.push(...fvgOpportunities);
    
    // 3. Oportunidades baseadas em Liquidity Zones
    const liquidityOpportunities = this.identifyLiquidityOpportunities(
      asset, currentPrice, smcAnalysis, marketConditions
    );
    newOpportunities.push(...liquidityOpportunities);
    
    // 4. Oportunidades técnicas tradicionais
    const technicalOpportunities = this.identifyTechnicalOpportunities(
      asset, currentPrice, marketConditions
    );
    newOpportunities.push(...technicalOpportunities);
    
    // 5. Oportunidades de breakout
    const breakoutOpportunities = this.identifyBreakoutOpportunities(
      asset, currentPrice, smcAnalysis, marketConditions
    );
    newOpportunities.push(...breakoutOpportunities);
    
    // Filtrar e classificar oportunidades
    const validOpportunities = this.filterAndRankOpportunities(newOpportunities);
    
    // Adicionar às oportunidades ativas
    this.opportunities.push(...validOpportunities);
    this.cleanupExpiredOpportunities();
    
    return validOpportunities;
  }
  
  /**
   * Identifica oportunidades baseadas em Order Blocks
   */
  private identifyOrderBlockOpportunities(
    asset: string,
    currentPrice: number,
    smcAnalysis: SMCAnalysis,
    marketConditions: MarketConditions
  ): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    const activeOrderBlocks = smcAnalysis.orderBlocks.filter(ob => ob.status === 'active');
    
    for (const ob of activeOrderBlocks) {
      // Verificar se preço está próximo do order block
      const distanceToOB = Math.abs(currentPrice - ob.low) / currentPrice;
      
      if (distanceToOB < 0.005) { // Dentro de 0.5%
        const confluences = this.calculateOrderBlockConfluences(ob, smcAnalysis, marketConditions);
        
        if (confluences.length >= 2) { // Mínimo 2 confluências
          const opportunity = this.createOrderBlockOpportunity(
            asset, currentPrice, ob, smcAnalysis, marketConditions, confluences
          );
          
          if (opportunity.confidence >= this.config.minConfidence) {
            opportunities.push(opportunity);
          }
        }
      }
    }
    
    return opportunities;
  }
  
  /**
   * Identifica oportunidades baseadas em Fair Value Gaps
   */
  private identifyFVGOpportunities(
    asset: string,
    currentPrice: number,
    smcAnalysis: SMCAnalysis,
    marketConditions: MarketConditions
  ): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    const openFVGs = smcAnalysis.fairValueGaps.filter(fvg => fvg.status === 'open');
    
    for (const fvg of openFVGs) {
      // Verificar se preço está se aproximando do FVG
      const isNearFVG = currentPrice >= fvg.low * 0.998 && currentPrice <= fvg.high * 1.002;
      
      if (isNearFVG) {
        const confluences = this.calculateFVGConfluences(fvg, smcAnalysis, marketConditions);
        
        if (confluences.length >= 1) {
          const opportunity = this.createRSIOpportunity(
            asset, currentPrice, 'buy', { rsi: 30, macd: { macd: 0, signal: 0, histogram: 0 }, bollinger: { upper: 0, middle: 0, lower: 0, squeeze: false }, ema: { ema9: 0, ema21: 0, ema50: 0, ema200: 0 }, stochastic: { k: 20, d: 20 }, atr: 0, volume: { current: 0, average: 0, ratio: 0 } }, marketConditions
          );

          if (opportunity.confidence >= this.config.minConfidence) {
            opportunities.push(opportunity);
          }
        }
      }
    }

    return opportunities;
  }

  /**
   * Identifica oportunidades baseadas em Liquidity Zones
   */
  private identifyLiquidityOpportunities(
    asset: string,
    currentPrice: number,
    smcAnalysis: SMCAnalysis,
    marketConditions: MarketConditions
  ): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    const activeLiquidityZones = smcAnalysis.liquidityZones.filter(lz => lz.status === 'active');

    for (const lz of activeLiquidityZones) {
      const distanceToLZ = Math.abs(currentPrice - lz.level) / currentPrice;

      if (distanceToLZ < 0.003) { // Dentro de 0.3%
        const confluences = this.calculateLiquidityConfluences(lz, smcAnalysis, marketConditions);

        if (confluences.length >= 1) {
          const opportunity = this.createRSIOpportunity(
            asset, currentPrice, 'buy', { rsi: 30, macd: { macd: 0, signal: 0, histogram: 0 }, bollinger: { upper: 0, middle: 0, lower: 0, squeeze: false }, ema: { ema9: 0, ema21: 0, ema50: 0, ema200: 0 }, stochastic: { k: 20, d: 20 }, atr: 0, volume: { current: 0, average: 0, ratio: 0 } }, marketConditions
          );

          if (opportunity.confidence >= this.config.minConfidence) {
            opportunities.push(opportunity);
          }
        }
      }
    }
    
    return opportunities;
  }
  
  /**
   * Identifica oportunidades técnicas tradicionais
   */
  private identifyTechnicalOpportunities(
    asset: string,
    currentPrice: number,
    marketConditions: MarketConditions
  ): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    const indicators = this.indicators[asset];
    
    if (!indicators) return opportunities;
    
    // RSI Oversold/Overbought com divergência
    if (indicators.rsi < 30 && marketConditions.trend !== 'strong_bearish') {
      opportunities.push(this.createRSIOpportunity(asset, currentPrice, 'buy', indicators, marketConditions));
    }
    
    if (indicators.rsi > 70 && marketConditions.trend !== 'strong_bullish') {
      opportunities.push(this.createRSIOpportunity(asset, currentPrice, 'sell', indicators, marketConditions));
    }
    
    // MACD Signal Cross
    if (indicators.macd.histogram > 0 && marketConditions.momentum === 'accelerating') {
      opportunities.push(this.createMACDOpportunity(asset, currentPrice, 'buy', indicators, marketConditions));
    }
    
    // Bollinger Squeeze
    if (indicators.bollinger.squeeze && marketConditions.volatility === 'low') {
      opportunities.push(this.createBollingerSqueezeOpportunity(asset, currentPrice, indicators, marketConditions));
    }
    
    return opportunities.filter(op => op.confidence >= this.config.minConfidence);
  }
  
  /**
   * Identifica oportunidades de breakout
   */
  private identifyBreakoutOpportunities(
    asset: string,
    currentPrice: number,
    smcAnalysis: SMCAnalysis,
    marketConditions: MarketConditions
  ): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    const priceData = this.priceData[asset];
    
    if (!priceData || priceData.length < 20) return opportunities;
    
    // Identificar ranges de consolidação
    const recentHighs = priceData.slice(-20).map(d => d.high);
    const recentLows = priceData.slice(-20).map(d => d.low);
    
    const resistanceLevel = Math.max(...recentHighs);
    const supportLevel = Math.min(...recentLows);
    
    const rangeSize = (resistanceLevel - supportLevel) / supportLevel;
    
    // Breakout de resistência
    if (currentPrice > resistanceLevel * 1.001 && rangeSize > 0.02) {
      const confluences = this.calculateBreakoutConfluences('bullish', smcAnalysis, marketConditions);
      
      if (confluences.length >= 2) {
        opportunities.push(this.createBreakoutOpportunity(
          asset, currentPrice, 'buy', resistanceLevel, supportLevel, confluences, marketConditions
        ));
      }
    }
    
    // Breakdown de suporte
    if (currentPrice < supportLevel * 0.999 && rangeSize > 0.02) {
      const confluences = this.calculateBreakoutConfluences('bearish', smcAnalysis, marketConditions);
      
      if (confluences.length >= 2) {
        opportunities.push(this.createBreakoutOpportunity(
          asset, currentPrice, 'sell', resistanceLevel, supportLevel, confluences, marketConditions
        ));
      }
    }
    
    return opportunities.filter(op => op.confidence >= this.config.minConfidence);
  }
  
  /**
   * Calcula indicadores técnicos
   */
  private updateTechnicalIndicators(asset: string, priceData: PriceData[]): void {
    if (priceData.length < 200) return;
    
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const volumes = priceData.map(d => d.volume);
    
    this.indicators[asset] = {
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes, 20, 2),
      ema: {
        ema9: this.calculateEMA(closes, 9),
        ema21: this.calculateEMA(closes, 21),
        ema50: this.calculateEMA(closes, 50),
        ema200: this.calculateEMA(closes, 200)
      },
      stochastic: this.calculateStochastic(highs, lows, closes, 14),
      atr: this.calculateATR(highs, lows, closes, 14),
      volume: {
        current: volumes[volumes.length - 1],
        average: volumes.slice(-20).reduce((a, b) => a + b) / 20,
        ratio: volumes[volumes.length - 1] / (volumes.slice(-20).reduce((a, b) => a + b) / 20)
      }
    };
  }
  
  /**
   * Analisa condições de mercado
   */
  private analyzeMarketConditions(asset: string, priceData: PriceData[]): MarketConditions {
    const indicators = this.indicators[asset];
    const closes = priceData.map(d => d.close);
    
    // Analisar volatilidade
    const atr = indicators?.atr || 0;
    const currentPrice = closes[closes.length - 1];
    const volatilityRatio = atr / currentPrice;
    
    let volatility: MarketConditions['volatility'] = 'medium';
    if (volatilityRatio < 0.01) volatility = 'low';
    else if (volatilityRatio > 0.03) volatility = 'high';
    
    // Analisar trend
    const ema21 = indicators?.ema.ema21 || currentPrice;
    const ema50 = indicators?.ema.ema50 || currentPrice;
    const ema200 = indicators?.ema.ema200 || currentPrice;
    
    let trend: MarketConditions['trend'] = 'ranging';
    if (currentPrice > ema21 && ema21 > ema50 && ema50 > ema200) {
      trend = 'strong_bullish';
    } else if (currentPrice > ema21 && ema21 > ema50) {
      trend = 'weak_bullish';
    } else if (currentPrice < ema21 && ema21 < ema50 && ema50 < ema200) {
      trend = 'strong_bearish';
    } else if (currentPrice < ema21 && ema21 < ema50) {
      trend = 'weak_bearish';
    }
    
    // Analisar momentum
    const macdHistogram = indicators?.macd.histogram || 0;
    const previousHistogram = 0; // Simplificação
    
    let momentum: MarketConditions['momentum'] = 'steady';
    if (Math.abs(macdHistogram) > Math.abs(previousHistogram)) {
      momentum = 'accelerating';
    } else if (Math.abs(macdHistogram) < Math.abs(previousHistogram)) {
      momentum = 'decelerating';
    }
    
    // Analisar volume
    const volumeRatio = indicators?.volume.ratio || 1;
    let volume_profile: MarketConditions['volume_profile'] = 'normal';
    if (volumeRatio > 1.5) volume_profile = 'high';
    else if (volumeRatio < 0.7) volume_profile = 'low';
    
    // Determinar sessão (simplificado)
    const hour = new Date().getUTCHours();
    let session: MarketConditions['session'] = 'asian';
    if (hour >= 8 && hour < 16) session = 'london';
    else if (hour >= 13 && hour < 21) session = 'new_york';
    else if ((hour >= 8 && hour < 13) || (hour >= 16 && hour < 21)) session = 'overlap';
    
    return {
      volatility,
      trend,
      momentum,
      volume_profile,
      session
    };
  }
  
  /**
   * Métodos de criação de oportunidades específicas
   */
  private createOrderBlockOpportunity(
    asset: string,
    currentPrice: number,
    orderBlock: any,
    smcAnalysis: SMCAnalysis,
    marketConditions: MarketConditions,
    confluences: string[]
  ): TradingOpportunity {
    const type = orderBlock.type === 'bullish' ? 'buy' : 'sell';
    const atr = this.indicators[asset]?.atr || currentPrice * 0.01;
    
    const entry = {
      price: type === 'buy' ? orderBlock.low : orderBlock.high,
      zone: {
        min: orderBlock.low,
        max: orderBlock.high
      }
    };
    
    const stopLoss = {
      price: type === 'buy' 
        ? orderBlock.low - atr 
        : orderBlock.high + atr,
      reason: 'Order Block invalidation',
      distance: Math.abs(entry.price - (type === 'buy' ? orderBlock.low - atr : orderBlock.high + atr)) / entry.price * 100
    };
    
    const riskReward = type === 'buy'
      ? (currentPrice * 1.02 - entry.price) / (entry.price - stopLoss.price)
      : (entry.price - currentPrice * 0.98) / (stopLoss.price - entry.price);
    
    return {
      id: `OB_${asset}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      asset,
      type,
      strategy: 'SMC_OrderBlock',
      timeframe: '4H',
      entry,
      stopLoss,
      takeProfit: {
        targets: [
          {
            price: type === 'buy' ? entry.price * 1.015 : entry.price * 0.985,
            percentage: 50,
            reason: '1.5% target'
          },
          {
            price: type === 'buy' ? entry.price * 1.03 : entry.price * 0.97,
            percentage: 50,
            reason: '3% target'
          }
        ]
      },
      riskReward: Math.max(riskReward, 0.5),
      confidence: this.calculateConfidence(confluences, marketConditions),
      probability: this.calculateProbability(confluences, 'orderblock'),
      setup: {
        name: `${orderBlock.type} Order Block`,
        description: `Price approaching ${orderBlock.type} order block with ${confluences.length} confluences`,
        confluences,
        invalidation: `Price closes ${type === 'buy' ? 'below' : 'above'} order block`
      },
      validity: {
        until: Date.now() + (4 * 60 * 60 * 1000), // 4 horas
        urgent: Math.abs(currentPrice - entry.price) / currentPrice < 0.001
      },
      marketConditions,
      smcContext: { orderBlock }
    };
  }
  
  // Métodos auxiliares para cálculos de indicadores
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = macd; // Simplificação
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  private calculateBollingerBands(prices: number[], period: number, stdDev: number): {
    upper: number;
    middle: number;
    lower: number;
    squeeze: boolean;
  } {
    if (prices.length < period) {
      const price = prices[prices.length - 1];
      return { upper: price * 1.02, middle: price, lower: price * 0.98, squeeze: false };
    }
    
    const recentPrices = prices.slice(-period);
    const middle = recentPrices.reduce((a, b) => a + b) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upper = middle + (standardDeviation * stdDev);
    const lower = middle - (standardDeviation * stdDev);
    const squeeze = (upper - lower) / middle < 0.1; // Squeeze se range < 10%
    
    return { upper, middle, lower, squeeze };
  }
  
  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
    if (highs.length < period) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // Simplificação
    
    return { k, d };
  }
  
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period + 1) return 0;
    
    const trueRanges = [];
    
    for (let i = 1; i < Math.min(highs.length, period + 1); i++) {
      const high = highs[highs.length - i];
      const low = lows[lows.length - i];
      const prevClose = closes[closes.length - i - 1];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    return trueRanges.reduce((a, b) => a + b) / trueRanges.length;
  }
  
  /**
   * Métodos auxiliares
   */
  private calculateOrderBlockConfluences(orderBlock: any, smcAnalysis: SMCAnalysis, marketConditions: MarketConditions): string[] {
    const confluences = [];
    
    if (smcAnalysis.tradingBias === orderBlock.type) confluences.push('SMC Bias Alignment');
    if (marketConditions.trend.includes(orderBlock.type)) confluences.push('Trend Alignment');
    if (marketConditions.volume_profile === 'high') confluences.push('High Volume');
    if (marketConditions.session === 'london' || marketConditions.session === 'new_york') confluences.push('Active Session');
    
    return confluences;
  }
  
  private calculateFVGConfluences(fvg: any, smcAnalysis: SMCAnalysis, marketConditions: MarketConditions): string[] {
    const confluences = [];
    
    if (smcAnalysis.tradingBias === fvg.type) confluences.push('SMC Bias Alignment');
    if (marketConditions.momentum === 'accelerating') confluences.push('Strong Momentum');
    
    return confluences;
  }
  
  private calculateLiquidityConfluences(lz: any, smcAnalysis: SMCAnalysis, marketConditions: MarketConditions): string[] {
    const confluences = [];
    
    if (lz.strength > 70) confluences.push('Strong Liquidity Zone');
    if (marketConditions.volatility === 'high') confluences.push('High Volatility Environment');
    
    return confluences;
  }
  
  private calculateBreakoutConfluences(direction: string, smcAnalysis: SMCAnalysis, marketConditions: MarketConditions): string[] {
    const confluences = [];
    
    if (marketConditions.volume_profile === 'high') confluences.push('Volume Confirmation');
    if (marketConditions.momentum === 'accelerating') confluences.push('Momentum Acceleration');
    if (marketConditions.volatility === 'medium' || marketConditions.volatility === 'high') confluences.push('Adequate Volatility');
    
    return confluences;
  }
  
  private calculateConfidence(confluences: string[], marketConditions: MarketConditions): number {
    let confidence = 60; // Base confidence
    
    confidence += confluences.length * 10; // +10 por confluência
    
    if (marketConditions.session === 'london' || marketConditions.session === 'new_york') confidence += 5;
    if (marketConditions.volume_profile === 'high') confidence += 5;
    if (marketConditions.momentum === 'accelerating') confidence += 5;
    
    return Math.min(confidence, 95);
  }
  
  private calculateProbability(confluences: string[], strategyType: string): number {
    const baseProb = strategyType === 'orderblock' ? 65 : 60;
    return Math.min(baseProb + (confluences.length * 5), 90);
  }
  
  private createRSIOpportunity(asset: string, currentPrice: number, type: 'buy' | 'sell', indicators: TechnicalIndicators, marketConditions: MarketConditions): TradingOpportunity {
    // Implementação simplificada
    return {
      id: `RSI_${asset}_${Date.now()}`,
      timestamp: Date.now(),
      asset,
      type,
      strategy: 'Mean_Reversion',
      timeframe: '4H',
      entry: { price: currentPrice, zone: { min: currentPrice * 0.999, max: currentPrice * 1.001 } },
      stopLoss: { price: type === 'buy' ? currentPrice * 0.97 : currentPrice * 1.03, reason: 'RSI reversal failure', distance: 3 },
      takeProfit: { targets: [{ price: type === 'buy' ? currentPrice * 1.02 : currentPrice * 0.98, percentage: 100, reason: 'RSI normalization' }] },
      riskReward: 0.67,
      confidence: 70,
      probability: 65,
      setup: { name: 'RSI Reversal', description: 'RSI oversold/overbought reversal', confluences: ['RSI Extreme'], invalidation: 'RSI continues extreme' },
      validity: { until: Date.now() + (2 * 60 * 60 * 1000), urgent: false },
      marketConditions
    };
  }
  
  private createMACDOpportunity(asset: string, currentPrice: number, type: 'buy' | 'sell', indicators: TechnicalIndicators, marketConditions: MarketConditions): TradingOpportunity {
    // Implementação simplificada
    return {
      id: `MACD_${asset}_${Date.now()}`,
      timestamp: Date.now(),
      asset,
      type,
      strategy: 'Momentum',
      timeframe: '4H',
      entry: { price: currentPrice, zone: { min: currentPrice * 0.999, max: currentPrice * 1.001 } },
      stopLoss: { price: type === 'buy' ? currentPrice * 0.98 : currentPrice * 1.02, reason: 'MACD reversal', distance: 2 },
      takeProfit: { targets: [{ price: type === 'buy' ? currentPrice * 1.025 : currentPrice * 0.975, percentage: 100, reason: 'Momentum continuation' }] },
      riskReward: 1.25,
      confidence: 75,
      probability: 70,
      setup: { name: 'MACD Momentum', description: 'MACD signal cross with momentum', confluences: ['MACD Cross', 'Momentum'], invalidation: 'MACD reversal' },
      validity: { until: Date.now() + (6 * 60 * 60 * 1000), urgent: false },
      marketConditions
    };
  }
  
  private createBollingerSqueezeOpportunity(asset: string, currentPrice: number, indicators: TechnicalIndicators, marketConditions: MarketConditions): TradingOpportunity {
    // Implementação simplificada - tipo baseado na direção EMA
    const type = currentPrice > indicators.ema.ema21 ? 'buy' : 'sell';
    
    return {
      id: `BB_${asset}_${Date.now()}`,
      timestamp: Date.now(),
      asset,
      type,
      strategy: 'Breakout',
      timeframe: '4H',
      entry: { price: currentPrice, zone: { min: currentPrice * 0.998, max: currentPrice * 1.002 } },
      stopLoss: { price: type === 'buy' ? indicators.bollinger.lower : indicators.bollinger.upper, reason: 'Bollinger band violation', distance: 2 },
      takeProfit: { targets: [{ price: type === 'buy' ? indicators.bollinger.upper : indicators.bollinger.lower, percentage: 100, reason: 'Bollinger expansion' }] },
      riskReward: 1.5,
      confidence: 80,
      probability: 75,
      setup: { name: 'Bollinger Squeeze', description: 'Low volatility compression breakout', confluences: ['Volatility Squeeze', 'Range Break'], invalidation: 'Return to range' },
      validity: { until: Date.now() + (8 * 60 * 60 * 1000), urgent: false },
      marketConditions
    };
  }
  
  private createBreakoutOpportunity(
    asset: string,
    currentPrice: number,
    type: 'buy' | 'sell',
    resistanceLevel: number,
    supportLevel: number,
    confluences: string[],
    marketConditions: MarketConditions
  ): TradingOpportunity {
    const entryLevel = type === 'buy' ? resistanceLevel : supportLevel;
    const stopLevel = type === 'buy' ? supportLevel : resistanceLevel;
    const targetLevel = type === 'buy' 
      ? resistanceLevel + (resistanceLevel - supportLevel)
      : supportLevel - (resistanceLevel - supportLevel);
    
    return {
      id: `BO_${asset}_${Date.now()}`,
      timestamp: Date.now(),
      asset,
      type,
      strategy: 'Breakout',
      timeframe: '4H',
      entry: { price: entryLevel, zone: { min: entryLevel * 0.999, max: entryLevel * 1.001 } },
      stopLoss: { price: stopLevel, reason: 'Range reclaim', distance: Math.abs(entryLevel - stopLevel) / entryLevel * 100 },
      takeProfit: { targets: [{ price: targetLevel, percentage: 100, reason: 'Range projection' }] },
      riskReward: Math.abs(targetLevel - entryLevel) / Math.abs(entryLevel - stopLevel),
      confidence: this.calculateConfidence(confluences, marketConditions),
      probability: this.calculateProbability(confluences, 'breakout'),
      setup: { 
        name: 'Range Breakout', 
        description: `${type === 'buy' ? 'Resistance' : 'Support'} breakout with confluence`, 
        confluences, 
        invalidation: `Return ${type === 'buy' ? 'below' : 'above'} ${type === 'buy' ? 'resistance' : 'support'}` 
      },
      validity: { until: Date.now() + (4 * 60 * 60 * 1000), urgent: true },
      marketConditions
    };
  }
  
  private filterAndRankOpportunities(opportunities: TradingOpportunity[]): TradingOpportunity[] {
    return opportunities
      .filter(op => op.confidence >= this.config.minConfidence)
      .sort((a, b) => {
        // Ordenar por confiança e risk/reward
        const scoreA = a.confidence + (a.riskReward * 10);
        const scoreB = b.confidence + (b.riskReward * 10);
        return scoreB - scoreA;
      })
      .slice(0, 20); // Limitar a 20 oportunidades
  }
  
  private cleanupExpiredOpportunities(): void {
    const now = Date.now();
    this.opportunities = this.opportunities.filter(
      op => op.validity.until > now
    );
  }
  
  private startCleanupScheduler(): void {
    setInterval(() => {
      this.cleanupExpiredOpportunities();
    }, 60000); // Cleanup a cada minuto
  }
  
  /**
   * Métodos públicos
   */
  public getActiveOpportunities(filter?: Partial<OpportunityFilter>): TradingOpportunity[] {
    let opportunities = [...this.opportunities];
    
    if (filter) {
      if (filter.minConfidence) {
        opportunities = opportunities.filter(op => op.confidence >= filter.minConfidence!);
      }
      
      if (filter.strategies && filter.strategies.length > 0) {
        opportunities = opportunities.filter(op => filter.strategies!.includes(op.strategy));
      }
      
      if (filter.assets && filter.assets.length > 0) {
        opportunities = opportunities.filter(op => filter.assets!.includes(op.asset));
      }
      
      if (filter.onlyHighProbability) {
        opportunities = opportunities.filter(op => op.probability >= 70);
      }
    }
    
    return opportunities.sort((a, b) => b.confidence - a.confidence);
  }
  
  public getOpportunityById(id: string): TradingOpportunity | null {
    return this.opportunities.find(op => op.id === id) || null;
  }
  
  public getOpportunitiesByAsset(asset: string): TradingOpportunity[] {
    return this.opportunities.filter(op => op.asset === asset);
  }
  
  public removeOpportunity(id: string): boolean {
    const index = this.opportunities.findIndex(op => op.id === id);
    if (index !== -1) {
      this.opportunities.splice(index, 1);
      return true;
    }
    return false;
  }
  
  public getStatistics(): {
    total: number;
    byStrategy: Record<string, number>;
    byAsset: Record<string, number>;
    averageConfidence: number;
    averageRiskReward: number;
  } {
    const stats = {
      total: this.opportunities.length,
      byStrategy: {} as Record<string, number>,
      byAsset: {} as Record<string, number>,
      averageConfidence: 0,
      averageRiskReward: 0
    };
    
    if (this.opportunities.length === 0) return stats;
    
    let totalConfidence = 0;
    let totalRiskReward = 0;
    
    for (const op of this.opportunities) {
      // Count by strategy
      stats.byStrategy[op.strategy] = (stats.byStrategy[op.strategy] || 0) + 1;
      
      // Count by asset
      stats.byAsset[op.asset] = (stats.byAsset[op.asset] || 0) + 1;
      
      // Sum for averages
      totalConfidence += op.confidence;
      totalRiskReward += op.riskReward;
    }
    
    stats.averageConfidence = totalConfidence / this.opportunities.length;
    stats.averageRiskReward = totalRiskReward / this.opportunities.length;
    
    return stats;
  }
}

export default TradingOpportunityEngine;