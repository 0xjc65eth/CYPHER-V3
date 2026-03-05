/**
 * Smart Money Concepts (SMC) Analysis Engine
 * Advanced institutional trading analysis for cryptocurrency markets
 */

export interface MarketStructure {
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';
  strength: number; // 0-1
  confirmation: boolean;
  timeframe: string;
  lastUpdate: number;
}

export interface OrderBlock {
  id: string;
  price: number;
  type: 'BULLISH_OB' | 'BEARISH_OB';
  strength: number;
  volume: number;
  timestamp: number;
  timeframe: string;
  tested: boolean;
  breached: boolean;
  reliability: number;
  institutionalFlow: 'BUY' | 'SELL';
}

export interface FairValueGap {
  id: string;
  upper: number;
  lower: number;
  middle: number;
  type: 'BULLISH_FVG' | 'BEARISH_FVG';
  strength: number;
  filled: boolean;
  partialFill: number; // 0-1
  timestamp: number;
  timeframe: string;
  volume: number;
  efficiency: number;
}

export interface LiquidityPool {
  id: string;
  price: number;
  type: 'BUY_SIDE' | 'SELL_SIDE';
  size: number;
  accumulated: number;
  grabbed: boolean;
  efficiency: number;
  timestamp: number;
  confluence: number; // Multiple liquidity points
}

export interface InstitutionalFlow {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
  confidence: number;
  timeframe: string;
  volume: number;
  characteristics: {
    orderBlocks: number;
    fairValueGaps: number;
    liquidityGrabs: number;
    structuralBreaks: number;
  };
  smartMoneyActivities: SmartMoneyActivity[];
}

export interface SmartMoneyActivity {
  type: 'ACCUMULATION' | 'DISTRIBUTION' | 'MANIPULATION' | 'IMPULSE';
  price: number;
  volume: number;
  timestamp: number;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BreakOfStructure {
  type: 'BOS' | 'CHoCH'; // Break of Structure or Change of Character
  direction: 'BULLISH' | 'BEARISH';
  strength: number;
  confirmedLevel: number;
  timestamp: number;
  timeframe: string;
  volume: number;
  followThrough: boolean;
}

export interface TradingOpportunity {
  id: string;
  type: 'ORDER_BLOCK_RETEST' | 'FVG_ENTRY' | 'LIQUIDITY_GRAB' | 'BOS_CONTINUATION';
  symbol: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  probability: number;
  timeframe: string;
  setup: string;
  confluence: ConfluenceFactor[];
  timestamp: number;
}

export interface ConfluenceFactor {
  type: 'ORDER_BLOCK' | 'FVG' | 'LIQUIDITY' | 'STRUCTURE' | 'FIBONACCI' | 'VOLUME_PROFILE';
  strength: number;
  description: string;
}

export class SmartMoneyConceptsEngine {
  private marketStructure: Map<string, MarketStructure> = new Map();
  private orderBlocks: Map<string, OrderBlock[]> = new Map();
  private fairValueGaps: Map<string, FairValueGap[]> = new Map();
  private liquidityPools: Map<string, LiquidityPool[]> = new Map();
  private institutionalFlow: Map<string, InstitutionalFlow> = new Map();
  private opportunities: TradingOpportunity[] = [];

  constructor() {
    // SMC Engine initialized
  }

  async analyzeMarket(symbol: string, priceData: PriceCandle[], volume: number[]): Promise<SMCAnalysis> {
    try {
      // Analyze market structure
      const structure = await this.analyzeMarketStructure(symbol, priceData);
      
      // Identify order blocks
      const orderBlocks = await this.identifyOrderBlocks(symbol, priceData, volume);
      
      // Detect fair value gaps
      const fairValueGaps = await this.detectFairValueGaps(symbol, priceData);
      
      // Find liquidity pools
      const liquidityPools = await this.findLiquidityPools(symbol, priceData, volume);
      
      // Analyze institutional flow
      const institutionalFlow = await this.analyzeInstitutionalFlow(symbol, orderBlocks, fairValueGaps, liquidityPools);
      
      // Detect structure breaks
      const structureBreaks = await this.detectStructureBreaks(symbol, priceData, volume);
      
      // Generate trading opportunities
      const opportunities = await this.generateTradingOpportunities(symbol, {
        structure,
        orderBlocks,
        fairValueGaps,
        liquidityPools,
        institutionalFlow,
        structureBreaks
      });

      const analysis: SMCAnalysis = {
        symbol,
        timestamp: Date.now(),
        marketStructure: structure,
        orderBlocks,
        fairValueGaps,
        liquidityPools,
        institutionalFlow,
        structureBreaks,
        opportunities,
        confidence: this.calculateOverallConfidence(structure, institutionalFlow, opportunities),
        recommendation: this.generateRecommendation(institutionalFlow, opportunities)
      };

      // Store analysis
      this.marketStructure.set(symbol, structure);
      this.orderBlocks.set(symbol, orderBlocks);
      this.fairValueGaps.set(symbol, fairValueGaps);
      this.liquidityPools.set(symbol, liquidityPools);
      this.institutionalFlow.set(symbol, institutionalFlow);
      this.opportunities.push(...opportunities);

      return analysis;
    } catch (error) {
      console.error(`❌ SMC Analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  private async analyzeMarketStructure(symbol: string, priceData: PriceCandle[]): Promise<MarketStructure> {
    const recentCandles = priceData.slice(-50); // Last 50 candles
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);
    
    // Calculate swing highs and lows
    const swingHighs = this.findSwingPoints(highs, 'high');
    const swingLows = this.findSwingPoints(lows, 'low');
    
    // Determine trend
    let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
    let strength = 0;
    
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const recentHigh = swingHighs[swingHighs.length - 1];
      const previousHigh = swingHighs[swingHighs.length - 2];
      const recentLow = swingLows[swingLows.length - 1];
      const previousLow = swingLows[swingLows.length - 2];
      
      // Higher highs and higher lows = uptrend
      if (recentHigh.price > previousHigh.price && recentLow.price > previousLow.price) {
        trend = 'UPTREND';
        strength = 0.8;
      }
      // Lower highs and lower lows = downtrend
      else if (recentHigh.price < previousHigh.price && recentLow.price < previousLow.price) {
        trend = 'DOWNTREND';
        strength = 0.8;
      }
    }
    
    // Determine market phase
    const phase = this.determineMarketPhase(recentCandles, trend);
    
    return {
      trend,
      phase,
      strength,
      confirmation: strength > 0.6,
      timeframe: '4h',
      lastUpdate: Date.now()
    };
  }

  private async identifyOrderBlocks(symbol: string, priceData: PriceCandle[], volume: number[]): Promise<OrderBlock[]> {
    const orderBlocks: OrderBlock[] = [];
    const candles = priceData.slice(-100); // Analyze last 100 candles
    
    for (let i = 3; i < candles.length - 3; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      const next = candles[i + 1];
      
      // Bullish Order Block: Strong buying after a decline
      if (current.close > current.open && // Bullish candle
          current.volume > volume[i - 1] * 1.5 && // High volume
          prev.close < prev.open && // Previous was bearish
          next.close > current.close) { // Continuation
        
        orderBlocks.push({
          id: `OB_${symbol}_${i}_${Date.now()}`,
          price: current.low,
          type: 'BULLISH_OB',
          strength: this.calculateOrderBlockStrength(current, volume[i]),
          volume: volume[i],
          timestamp: current.timestamp,
          timeframe: '4h',
          tested: false,
          breached: false,
          reliability: 0.8,
          institutionalFlow: 'BUY'
        });
      }
      
      // Bearish Order Block: Strong selling after a rally
      else if (current.close < current.open && // Bearish candle
               current.volume > volume[i - 1] * 1.5 && // High volume
               prev.close > prev.open && // Previous was bullish
               next.close < current.close) { // Continuation
        
        orderBlocks.push({
          id: `OB_${symbol}_${i}_${Date.now()}`,
          price: current.high,
          type: 'BEARISH_OB',
          strength: this.calculateOrderBlockStrength(current, volume[i]),
          volume: volume[i],
          timestamp: current.timestamp,
          timeframe: '4h',
          tested: false,
          breached: false,
          reliability: 0.8,
          institutionalFlow: 'SELL'
        });
      }
    }
    
    return orderBlocks.slice(-20); // Keep last 20 order blocks
  }

  private async detectFairValueGaps(symbol: string, priceData: PriceCandle[]): Promise<FairValueGap[]> {
    const fairValueGaps: FairValueGap[] = [];
    const candles = priceData.slice(-100);
    
    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const current = candles[i];
      const next = candles[i + 1];
      
      // Bullish FVG: Gap up with no overlap
      if (prev.high < current.low && current.close > current.open) {
        const gap = current.low - prev.high;
        const strength = gap / prev.close; // Gap size relative to price
        
        if (strength > 0.005) { // Minimum 0.5% gap
          fairValueGaps.push({
            id: `FVG_${symbol}_${i}_${Date.now()}`,
            upper: current.low,
            lower: prev.high,
            middle: (current.low + prev.high) / 2,
            type: 'BULLISH_FVG',
            strength,
            filled: false,
            partialFill: 0,
            timestamp: current.timestamp,
            timeframe: '4h',
            volume: current.volume,
            efficiency: 0.9
          });
        }
      }
      
      // Bearish FVG: Gap down with no overlap
      else if (prev.low > current.high && current.close < current.open) {
        const gap = prev.low - current.high;
        const strength = gap / prev.close;
        
        if (strength > 0.005) {
          fairValueGaps.push({
            id: `FVG_${symbol}_${i}_${Date.now()}`,
            upper: prev.low,
            lower: current.high,
            middle: (prev.low + current.high) / 2,
            type: 'BEARISH_FVG',
            strength,
            filled: false,
            partialFill: 0,
            timestamp: current.timestamp,
            timeframe: '4h',
            volume: current.volume,
            efficiency: 0.9
          });
        }
      }
    }
    
    return fairValueGaps.slice(-15); // Keep last 15 FVGs
  }

  private async findLiquidityPools(symbol: string, priceData: PriceCandle[], volume: number[]): Promise<LiquidityPool[]> {
    const liquidityPools: LiquidityPool[] = [];
    const candles = priceData.slice(-50);
    
    // Find equal highs and lows (liquidity levels)
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Detect equal highs (sell-side liquidity)
    const equalHighs = this.findEqualLevels(highs);
    for (const level of equalHighs) {
      if (level.occurrences >= 2) {
        liquidityPools.push({
          id: `LP_${symbol}_HIGH_${Date.now()}`,
          price: level.price,
          type: 'SELL_SIDE',
          size: level.volume,
          accumulated: level.volume,
          grabbed: false,
          efficiency: 0.85,
          timestamp: Date.now(),
          confluence: level.occurrences
        });
      }
    }
    
    // Detect equal lows (buy-side liquidity)
    const equalLows = this.findEqualLevels(lows);
    for (const level of equalLows) {
      if (level.occurrences >= 2) {
        liquidityPools.push({
          id: `LP_${symbol}_LOW_${Date.now()}`,
          price: level.price,
          type: 'BUY_SIDE',
          size: level.volume,
          accumulated: level.volume,
          grabbed: false,
          efficiency: 0.85,
          timestamp: Date.now(),
          confluence: level.occurrences
        });
      }
    }
    
    return liquidityPools;
  }

  private async analyzeInstitutionalFlow(
    symbol: string,
    orderBlocks: OrderBlock[],
    fairValueGaps: FairValueGap[],
    liquidityPools: LiquidityPool[]
  ): Promise<InstitutionalFlow> {
    const bullishSignals = orderBlocks.filter(ob => ob.type === 'BULLISH_OB').length +
                          fairValueGaps.filter(fvg => fvg.type === 'BULLISH_FVG').length;
    
    const bearishSignals = orderBlocks.filter(ob => ob.type === 'BEARISH_OB').length +
                          fairValueGaps.filter(fvg => fvg.type === 'BEARISH_FVG').length;
    
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;
    
    if (bullishSignals > bearishSignals * 1.5) {
      direction = 'BULLISH';
      strength = Math.min(bullishSignals / 10, 1);
    } else if (bearishSignals > bullishSignals * 1.5) {
      direction = 'BEARISH';
      strength = Math.min(bearishSignals / 10, 1);
    }
    
    const confidence = strength * 0.8 + (orderBlocks.length > 0 ? 0.2 : 0);
    
    return {
      direction,
      strength,
      confidence,
      timeframe: '4h',
      volume: orderBlocks.reduce((sum, ob) => sum + ob.volume, 0),
      characteristics: {
        orderBlocks: orderBlocks.length,
        fairValueGaps: fairValueGaps.length,
        liquidityGrabs: liquidityPools.filter(lp => lp.grabbed).length,
        structuralBreaks: 0 // Will be updated by structure break detection
      },
      smartMoneyActivities: []
    };
  }

  private async detectStructureBreaks(symbol: string, priceData: PriceCandle[], volume: number[]): Promise<BreakOfStructure[]> {
    const breaks: BreakOfStructure[] = [];
    const candles = priceData.slice(-30);
    
    for (let i = 5; i < candles.length - 5; i++) {
      const current = candles[i];
      const recentHigh = Math.max(...candles.slice(i - 5, i).map(c => c.high));
      const recentLow = Math.min(...candles.slice(i - 5, i).map(c => c.low));
      
      // Bullish Break of Structure
      if (current.high > recentHigh && current.volume > volume[i - 1] * 1.3) {
        breaks.push({
          type: 'BOS',
          direction: 'BULLISH',
          strength: (current.high - recentHigh) / recentHigh,
          confirmedLevel: recentHigh,
          timestamp: current.timestamp,
          timeframe: '4h',
          volume: current.volume,
          followThrough: candles[i + 1]?.close > current.close
        });
      }
      
      // Bearish Break of Structure
      else if (current.low < recentLow && current.volume > volume[i - 1] * 1.3) {
        breaks.push({
          type: 'BOS',
          direction: 'BEARISH',
          strength: (recentLow - current.low) / recentLow,
          confirmedLevel: recentLow,
          timestamp: current.timestamp,
          timeframe: '4h',
          volume: current.volume,
          followThrough: candles[i + 1]?.close < current.close
        });
      }
    }
    
    return breaks.slice(-10);
  }

  private async generateTradingOpportunities(symbol: string, analysis: any): Promise<TradingOpportunity[]> {
    const opportunities: TradingOpportunity[] = [];
    const { orderBlocks, fairValueGaps, liquidityPools, institutionalFlow } = analysis;
    
    // Order Block Retest Opportunities
    for (const ob of orderBlocks) {
      if (!ob.tested && !ob.breached) {
        const confluence: ConfluenceFactor[] = [
          { type: 'ORDER_BLOCK', strength: ob.strength, description: `${ob.type} at ${ob.price}` }
        ];
        
        // Check for FVG confluence
        const nearbyFVG = fairValueGaps.find((fvg: any) =>
          Math.abs(fvg.middle - ob.price) / ob.price < 0.01
        );
        if (nearbyFVG) {
          confluence.push({
            type: 'FVG',
            strength: nearbyFVG.strength,
            description: `${nearbyFVG.type} confluence`
          });
        }
        
        opportunities.push({
          id: `OPP_${symbol}_OB_${Date.now()}`,
          type: 'ORDER_BLOCK_RETEST',
          symbol,
          entry: ob.price,
          stopLoss: ob.type === 'BULLISH_OB' ? ob.price * 0.98 : ob.price * 1.02,
          takeProfit: ob.type === 'BULLISH_OB' ? ob.price * 1.05 : ob.price * 0.95,
          riskReward: 2.5,
          probability: ob.reliability * (1 + confluence.length * 0.1),
          timeframe: '4h',
          setup: `${ob.type} Retest with ${confluence.length} confluence factors`,
          confluence,
          timestamp: Date.now()
        });
      }
    }
    
    return opportunities.slice(0, 10); // Limit to 10 best opportunities
  }

  // Helper methods
  private findSwingPoints(prices: number[], type: 'high' | 'low'): Array<{ price: number; index: number }> {
    const swings: Array<{ price: number; index: number }> = [];
    const lookback = 3;
    
    for (let i = lookback; i < prices.length - lookback; i++) {
      const current = prices[i];
      const isSwing = type === 'high' 
        ? prices.slice(i - lookback, i + lookback + 1).every(p => p <= current)
        : prices.slice(i - lookback, i + lookback + 1).every(p => p >= current);
      
      if (isSwing) {
        swings.push({ price: current, index: i });
      }
    }
    
    return swings;
  }

  private determineMarketPhase(candles: PriceCandle[], trend: string): 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' {
    const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const volatility = this.calculateVolatility(candles);
    
    if (trend === 'SIDEWAYS' && recentVolume > avgVolume * 1.2) {
      return volatility > 0.05 ? 'DISTRIBUTION' : 'ACCUMULATION';
    } else if (trend === 'UPTREND') {
      return 'MARKUP';
    } else if (trend === 'DOWNTREND') {
      return 'MARKDOWN';
    }
    
    return 'ACCUMULATION';
  }

  private calculateOrderBlockStrength(candle: PriceCandle, volume: number): number {
    const bodySize = Math.abs(candle.close - candle.open);
    const shadowSize = candle.high - candle.low;
    const bodyRatio = bodySize / shadowSize;
    const volumeMultiplier = Math.min(volume / 1000000, 3); // Cap at 3x
    
    return Math.min(bodyRatio * volumeMultiplier, 1);
  }

  private findEqualLevels(prices: number[]): Array<{ price: number; occurrences: number; volume: number }> {
    const tolerance = 0.001; // 0.1% tolerance
    const levels: Array<{ price: number; occurrences: number; volume: number }> = [];
    
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      let occurrences = 1;
      
      for (let j = i + 1; j < prices.length; j++) {
        if (Math.abs(prices[j] - price) / price <= tolerance) {
          occurrences++;
        }
      }
      
      if (occurrences >= 2) {
        levels.push({ price, occurrences, volume: occurrences * 1000000 });
      }
    }
    
    return levels.filter((level, index, self) => 
      index === self.findIndex(l => Math.abs(l.price - level.price) / level.price <= tolerance)
    );
  }

  private calculateVolatility(candles: PriceCandle[]): number {
    const returns = candles.slice(1).map((candle, i) => 
      Math.log(candle.close / candles[i].close)
    );
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateOverallConfidence(structure: MarketStructure, flow: InstitutionalFlow, opportunities: TradingOpportunity[]): number {
    const structureConfidence = structure.confirmation ? structure.strength : 0;
    const flowConfidence = flow.confidence;
    const opportunityConfidence = opportunities.length > 0 ? 
      opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length : 0;
    
    return (structureConfidence * 0.4 + flowConfidence * 0.4 + opportunityConfidence * 0.2);
  }

  private generateRecommendation(flow: InstitutionalFlow, opportunities: TradingOpportunity[]): string {
    if (flow.confidence > 0.7 && opportunities.length > 0) {
      const direction = flow.direction.toLowerCase();
      return `Strong ${direction} institutional flow detected with ${opportunities.length} high-probability opportunities`;
    } else if (flow.confidence > 0.5) {
      return `Moderate institutional activity - monitor for confirmation`;
    } else {
      return `Low institutional activity - wait for clearer signals`;
    }
  }

  // Public API methods
  getMarketStructure(symbol: string): MarketStructure | null {
    return this.marketStructure.get(symbol) || null;
  }

  getOrderBlocks(symbol: string): OrderBlock[] {
    return this.orderBlocks.get(symbol) || [];
  }

  getFairValueGaps(symbol: string): FairValueGap[] {
    return this.fairValueGaps.get(symbol) || [];
  }

  getLiquidityPools(symbol: string): LiquidityPool[] {
    return this.liquidityPools.get(symbol) || [];
  }

  getInstitutionalFlow(symbol: string): InstitutionalFlow | null {
    return this.institutionalFlow.get(symbol) || null;
  }

  getTradingOpportunities(symbol?: string): TradingOpportunity[] {
    if (symbol) {
      return this.opportunities.filter(opp => opp.symbol === symbol);
    }
    return this.opportunities.slice(-50); // Last 50 opportunities
  }
}

// Supporting interfaces
export interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCAnalysis {
  symbol: string;
  timestamp: number;
  marketStructure: MarketStructure;
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityPools: LiquidityPool[];
  institutionalFlow: InstitutionalFlow;
  structureBreaks: BreakOfStructure[];
  opportunities: TradingOpportunity[];
  confidence: number;
  recommendation: string;
}

export const smartMoneyEngine = new SmartMoneyConceptsEngine();