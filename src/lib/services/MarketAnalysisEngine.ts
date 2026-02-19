/**
 * Market Analysis Engine - Smart Money Concepts Implementation
 * Advanced market structure analysis with institutional order flow detection
 */

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
  confirmation: boolean;
  timeframe: string;
  lastUpdate: number;
}

export interface LiquidityPool {
  id: string;
  price: number;
  volume: number;
  type: 'buy_side' | 'sell_side' | 'equal_highs' | 'equal_lows';
  strength: number;
  swept: boolean;
  created: number;
  validated: boolean;
}

export interface OrderBlock {
  id: string;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  type: 'bullish' | 'bearish';
  origin: 'displacement' | 'mitigation' | 'break_of_structure';
  strength: number;
  tested: boolean;
  broken: boolean;
  created: number;
  timeframe: string;
}

export interface FairValueGap {
  id: string;
  upper: number;
  lower: number;
  size: number;
  type: 'bullish' | 'bearish';
  created: number;
  filled: boolean;
  partialFill: number;
  strength: number;
  timeframe: string;
  displacement: boolean;
}

export interface BreakOfStructure {
  id: string;
  level: number;
  type: 'bullish' | 'bearish';
  timeframe: string;
  strength: number;
  volume: number;
  created: number;
  confirmed: boolean;
  retested: boolean;
  displacement: boolean;
}

export interface ChangeOfCharacter {
  id: string;
  level: number;
  previousTrend: 'bullish' | 'bearish';
  newTrend: 'bullish' | 'bearish';
  timeframe: string;
  strength: number;
  created: number;
  confirmed: boolean;
  significance: 'major' | 'minor';
}

export interface InstitutionalOrderFlow {
  direction: 'accumulation' | 'distribution' | 'reaccumulation' | 'redistribution';
  strength: number;
  confidence: number;
  phase: 'markup' | 'markdown' | 'accumulation' | 'distribution';
  smartMoneyActivity: number;
  retailActivity: number;
  volumeProfile: VolumeProfile;
  wyckoffPhase: WyckoffPhase;
}

export interface VolumeProfile {
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  neutralVolume: number;
  vwap: number;
  poc: number; // Point of Control
  valueAreaHigh: number;
  valueAreaLow: number;
  volumeNodes: VolumeNode[];
}

export interface VolumeNode {
  price: number;
  volume: number;
  percentage: number;
  significance: 'high' | 'medium' | 'low';
}

export interface WyckoffPhase {
  phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  subPhase: string;
  confidence: number;
  events: WyckoffEvent[];
}

export interface WyckoffEvent {
  type: 'ps' | 'sc' | 'ar' | 'st' | 'sow' | 'ut' | 'lpsy' | 'sos' | 'bc' | 'test';
  name: string;
  price: number;
  volume: number;
  timestamp: number;
  confirmed: boolean;
}

export interface MultiTimeframeAnalysis {
  timeframes: {
    [key: string]: TimeframeAnalysis;
  };
  alignment: 'bullish' | 'bearish' | 'conflicted';
  confidence: number;
  primaryTimeframe: string;
}

export interface TimeframeAnalysis {
  timeframe: string;
  marketStructure: MarketStructure;
  liquidityPools: LiquidityPool[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  breakOfStructure: BreakOfStructure[];
  changeOfCharacter: ChangeOfCharacter[];
  institutionalFlow: InstitutionalOrderFlow;
  keyLevels: KeyLevel[];
}

export interface KeyLevel {
  id: string;
  price: number;
  type: 'support' | 'resistance' | 'pivot' | 'institutional';
  strength: number;
  tested: number;
  broken: boolean;
  timeframe: string;
  created: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
}

export interface DisplacementMove {
  id: string;
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  direction: 'bullish' | 'bearish';
  strength: number;
  volume: number;
  candles: number;
  percentage: number;
}

export class MarketAnalysisEngine {
  private readonly MIN_DISPLACEMENT_PERCENTAGE = 2.0; // 2% minimum displacement
  private readonly MIN_FVG_SIZE = 0.001; // Minimum FVG size as percentage
  private readonly ORDER_BLOCK_LOOKBACK = 50; // Candles to look back for order blocks
  private readonly LIQUIDITY_SENSITIVITY = 1.5; // Volume multiplier for liquidity detection
  
  constructor() {
    this.initializeEngine();
  }

  private initializeEngine(): void {
  }

  async analyzeMarketStructure(
    candles: CandleData[],
    timeframes: string[] = ['1h', '4h', '1d']
  ): Promise<MultiTimeframeAnalysis> {
    const timeframeAnalyses: { [key: string]: TimeframeAnalysis } = {};

    // Analyze each timeframe
    for (const timeframe of timeframes) {
      const filteredCandles = this.filterCandlesByTimeframe(candles, timeframe);
      timeframeAnalyses[timeframe] = await this.analyzeSingleTimeframe(filteredCandles, timeframe);
    }

    // Determine alignment across timeframes
    const alignment = this.determineTimeframeAlignment(timeframeAnalyses);
    const confidence = this.calculateAlignmentConfidence(timeframeAnalyses, alignment);

    return {
      timeframes: timeframeAnalyses,
      alignment,
      confidence,
      primaryTimeframe: this.determinePrimaryTimeframe(timeframes)
    };
  }

  private async analyzeSingleTimeframe(
    candles: CandleData[],
    timeframe: string
  ): Promise<TimeframeAnalysis> {
    // Identify market structure components
    const marketStructure = this.identifyMarketStructure(candles);
    const liquidityPools = this.identifyLiquidityPools(candles);
    const orderBlocks = this.identifyOrderBlocks(candles);
    const fairValueGaps = this.identifyFairValueGaps(candles);
    const breakOfStructure = this.identifyBreakOfStructure(candles);
    const changeOfCharacter = this.identifyChangeOfCharacter(candles);
    const institutionalFlow = this.analyzeInstitutionalOrderFlow(candles);
    const keyLevels = this.identifyKeyLevels(candles);

    return {
      timeframe,
      marketStructure,
      liquidityPools,
      orderBlocks,
      fairValueGaps,
      breakOfStructure,
      changeOfCharacter,
      institutionalFlow,
      keyLevels
    };
  }

  private identifyMarketStructure(candles: CandleData[]): MarketStructure {
    if (candles.length < 20) {
      return {
        trend: 'sideways',
        strength: 0,
        confirmation: false,
        timeframe: '1h',
        lastUpdate: Date.now()
      };
    }

    const recentCandles = candles.slice(-20);
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);

    // Identify higher highs and higher lows for bullish trend
    const higherHighs = this.countHigherHighs(highs);
    const higherLows = this.countHigherLows(lows);
    const lowerHighs = this.countLowerHighs(highs);
    const lowerLows = this.countLowerLows(lows);

    let trend: 'bullish' | 'bearish' | 'sideways';
    let strength: number;

    if (higherHighs >= 2 && higherLows >= 2) {
      trend = 'bullish';
      strength = (higherHighs + higherLows) / 8; // Normalize to 0-1
    } else if (lowerHighs >= 2 && lowerLows >= 2) {
      trend = 'bearish';
      strength = (lowerHighs + lowerLows) / 8;
    } else {
      trend = 'sideways';
      strength = 0.3;
    }

    const confirmation = strength > 0.5;

    return {
      trend,
      strength: Math.min(strength, 1),
      confirmation,
      timeframe: candles[0]?.timeframe || '1h',
      lastUpdate: Date.now()
    };
  }

  private countHigherHighs(highs: number[]): number {
    let count = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] > highs[i - 1]) count++;
    }
    return count;
  }

  private countHigherLows(lows: number[]): number {
    let count = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] > lows[i - 1]) count++;
    }
    return count;
  }

  private countLowerHighs(highs: number[]): number {
    let count = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] < highs[i - 1]) count++;
    }
    return count;
  }

  private countLowerLows(lows: number[]): number {
    let count = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] < lows[i - 1]) count++;
    }
    return count;
  }

  private identifyLiquidityPools(candles: CandleData[]): LiquidityPool[] {
    const pools: LiquidityPool[] = [];
    const lookbackPeriod = 20;

    for (let i = lookbackPeriod; i < candles.length; i++) {
      const window = candles.slice(i - lookbackPeriod, i);
      
      // Find equal highs (sell-side liquidity)
      const equalHighs = this.findEqualLevels(window.map(c => c.high), 0.001);
      equalHighs.forEach(level => {
        const volume = window
          .filter(c => Math.abs(c.high - level.price) / level.price < 0.001)
          .reduce((sum, c) => sum + c.volume, 0);

        if (volume > this.getAverageVolume(window) * this.LIQUIDITY_SENSITIVITY) {
          pools.push({
            id: `ssl_${level.price}_${i}`,
            price: level.price,
            volume,
            type: 'sell_side',
            strength: this.calculateLiquidityStrength(volume, window),
            swept: false,
            created: candles[i].timestamp,
            validated: level.count >= 3
          });
        }
      });

      // Find equal lows (buy-side liquidity)
      const equalLows = this.findEqualLevels(window.map(c => c.low), 0.001);
      equalLows.forEach(level => {
        const volume = window
          .filter(c => Math.abs(c.low - level.price) / level.price < 0.001)
          .reduce((sum, c) => sum + c.volume, 0);

        if (volume > this.getAverageVolume(window) * this.LIQUIDITY_SENSITIVITY) {
          pools.push({
            id: `bsl_${level.price}_${i}`,
            price: level.price,
            volume,
            type: 'buy_side',
            strength: this.calculateLiquidityStrength(volume, window),
            swept: false,
            created: candles[i].timestamp,
            validated: level.count >= 3
          });
        }
      });
    }

    return pools.slice(-20); // Keep last 20 pools
  }

  private findEqualLevels(prices: number[], tolerance: number): Array<{ price: number; count: number }> {
    const levels: { [key: string]: { price: number; count: number } } = {};
    
    prices.forEach(price => {
      const key = Math.round(price / (price * tolerance)) * (price * tolerance);
      const keyStr = key.toString();
      
      if (levels[keyStr]) {
        levels[keyStr].count++;
      } else {
        levels[keyStr] = { price: key, count: 1 };
      }
    });

    return Object.values(levels).filter(level => level.count >= 2);
  }

  private calculateLiquidityStrength(volume: number, window: CandleData[]): number {
    const avgVolume = this.getAverageVolume(window);
    return Math.min(volume / avgVolume / 3, 1);
  }

  private getAverageVolume(candles: CandleData[]): number {
    return candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
  }

  private identifyOrderBlocks(candles: CandleData[]): OrderBlock[] {
    const blocks: OrderBlock[] = [];
    
    for (let i = 5; i < candles.length - 5; i++) {
      const candle = candles[i];
      const prevCandles = candles.slice(i - 5, i);
      const nextCandles = candles.slice(i + 1, i + 6);

      // Check for displacement moves
      const displacement = this.identifyDisplacement(prevCandles, candle, nextCandles);
      
      if (displacement) {
        const orderBlock = this.createOrderBlock(candle, displacement, i);
        if (orderBlock) {
          blocks.push(orderBlock);
        }
      }
    }

    return blocks.slice(-15); // Keep last 15 order blocks
  }

  private identifyDisplacement(
    prevCandles: CandleData[],
    currentCandle: CandleData,
    nextCandles: CandleData[]
  ): DisplacementMove | null {
    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const range = currentCandle.high - currentCandle.low;
    const bodyPercentage = bodySize / range;

    // Check for strong directional move
    if (bodyPercentage < 0.7) return null;

    const avgVolume = this.getAverageVolume([...prevCandles, currentCandle]);
    const volumeRatio = currentCandle.volume / avgVolume;

    // Require high volume for displacement
    if (volumeRatio < 1.5) return null;

    const direction = currentCandle.close > currentCandle.open ? 'bullish' : 'bearish';
    const priceMove = Math.abs(currentCandle.close - currentCandle.open);
    const percentage = (priceMove / currentCandle.open) * 100;

    if (percentage < this.MIN_DISPLACEMENT_PERCENTAGE) return null;

    return {
      id: `disp_${currentCandle.timestamp}`,
      startPrice: currentCandle.open,
      endPrice: currentCandle.close,
      startTime: currentCandle.timestamp,
      endTime: currentCandle.timestamp,
      direction,
      strength: Math.min(bodyPercentage * volumeRatio, 1),
      volume: currentCandle.volume,
      candles: 1,
      percentage
    };
  }

  private createOrderBlock(
    candle: CandleData,
    displacement: DisplacementMove,
    index: number
  ): OrderBlock | null {
    return {
      id: `ob_${candle.timestamp}_${index}`,
      high: candle.high,
      low: candle.low,
      open: candle.open,
      close: candle.close,
      volume: candle.volume,
      type: displacement.direction,
      origin: 'displacement',
      strength: displacement.strength,
      tested: false,
      broken: false,
      created: candle.timestamp,
      timeframe: candle.timeframe
    };
  }

  private identifyFairValueGaps(candles: CandleData[]): FairValueGap[] {
    const gaps: FairValueGap[] = [];

    for (let i = 1; i < candles.length; i++) {
      const prevCandle = candles[i - 1];
      const currentCandle = candles[i];

      // Bullish FVG: Current low > Previous high
      if (currentCandle.low > prevCandle.high) {
        const gapSize = currentCandle.low - prevCandle.high;
        const percentage = (gapSize / prevCandle.high) * 100;

        if (percentage >= this.MIN_FVG_SIZE) {
          gaps.push({
            id: `fvg_bull_${i}`,
            upper: currentCandle.low,
            lower: prevCandle.high,
            size: gapSize,
            type: 'bullish',
            created: currentCandle.timestamp,
            filled: false,
            partialFill: 0,
            strength: this.calculateFVGStrength(gapSize, prevCandle, currentCandle),
            timeframe: currentCandle.timeframe,
            displacement: this.isDisplacementGap(prevCandle, currentCandle)
          });
        }
      }

      // Bearish FVG: Current high < Previous low
      if (currentCandle.high < prevCandle.low) {
        const gapSize = prevCandle.low - currentCandle.high;
        const percentage = (gapSize / prevCandle.low) * 100;

        if (percentage >= this.MIN_FVG_SIZE) {
          gaps.push({
            id: `fvg_bear_${i}`,
            upper: prevCandle.low,
            lower: currentCandle.high,
            size: gapSize,
            type: 'bearish',
            created: currentCandle.timestamp,
            filled: false,
            partialFill: 0,
            strength: this.calculateFVGStrength(gapSize, prevCandle, currentCandle),
            timeframe: currentCandle.timeframe,
            displacement: this.isDisplacementGap(prevCandle, currentCandle)
          });
        }
      }
    }

    return gaps.slice(-10); // Keep last 10 FVGs
  }

  private calculateFVGStrength(
    gapSize: number,
    prevCandle: CandleData,
    currentCandle: CandleData
  ): number {
    const avgRange = (
      (prevCandle.high - prevCandle.low) +
      (currentCandle.high - currentCandle.low)
    ) / 2;

    const sizeRatio = gapSize / avgRange;
    const volumeRatio = currentCandle.volume / Math.max(prevCandle.volume, 1);

    return Math.min((sizeRatio + volumeRatio) / 4, 1);
  }

  private isDisplacementGap(prevCandle: CandleData, currentCandle: CandleData): boolean {
    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const range = currentCandle.high - currentCandle.low;
    const bodyPercentage = bodySize / range;

    return bodyPercentage > 0.7 && currentCandle.volume > prevCandle.volume * 1.5;
  }

  private identifyBreakOfStructure(candles: CandleData[]): BreakOfStructure[] {
    const breaks: BreakOfStructure[] = [];
    const lookbackPeriod = 20;

    for (let i = lookbackPeriod; i < candles.length; i++) {
      const window = candles.slice(i - lookbackPeriod, i);
      const currentCandle = candles[i];

      // Find significant highs and lows in the window
      const significantHigh = Math.max(...window.map(c => c.high));
      const significantLow = Math.min(...window.map(c => c.low));

      // Bullish BOS: Close above significant high
      if (currentCandle.close > significantHigh) {
        const strength = this.calculateBOSStrength(currentCandle, significantHigh, window);
        
        breaks.push({
          id: `bos_bull_${i}`,
          level: significantHigh,
          type: 'bullish',
          timeframe: currentCandle.timeframe,
          strength,
          volume: currentCandle.volume,
          created: currentCandle.timestamp,
          confirmed: false,
          retested: false,
          displacement: this.isBOSDisplacement(currentCandle, window)
        });
      }

      // Bearish BOS: Close below significant low
      if (currentCandle.close < significantLow) {
        const strength = this.calculateBOSStrength(currentCandle, significantLow, window);
        
        breaks.push({
          id: `bos_bear_${i}`,
          level: significantLow,
          type: 'bearish',
          timeframe: currentCandle.timeframe,
          strength,
          volume: currentCandle.volume,
          created: currentCandle.timestamp,
          confirmed: false,
          retested: false,
          displacement: this.isBOSDisplacement(currentCandle, window)
        });
      }
    }

    return breaks.slice(-8); // Keep last 8 BOS
  }

  private calculateBOSStrength(
    candle: CandleData,
    level: number,
    window: CandleData[]
  ): number {
    const breakDistance = Math.abs(candle.close - level);
    const avgRange = this.getAverageRange(window);
    const distanceRatio = breakDistance / avgRange;

    const avgVolume = this.getAverageVolume(window);
    const volumeRatio = candle.volume / avgVolume;

    return Math.min((distanceRatio + volumeRatio) / 4, 1);
  }

  private getAverageRange(candles: CandleData[]): number {
    return candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
  }

  private isBOSDisplacement(candle: CandleData, window: CandleData[]): boolean {
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const bodyPercentage = bodySize / range;

    const avgVolume = this.getAverageVolume(window);
    const volumeRatio = candle.volume / avgVolume;

    return bodyPercentage > 0.6 && volumeRatio > 1.8;
  }

  private identifyChangeOfCharacter(candles: CandleData[]): ChangeOfCharacter[] {
    const changes: ChangeOfCharacter[] = [];
    const lookbackPeriod = 30;

    for (let i = lookbackPeriod * 2; i < candles.length; i++) {
      const longTermWindow = candles.slice(i - lookbackPeriod * 2, i - lookbackPeriod);
      const recentWindow = candles.slice(i - lookbackPeriod, i);
      const currentCandle = candles[i];

      const longTermTrend = this.determineTrendDirection(longTermWindow);
      const recentTrend = this.determineTrendDirection(recentWindow);

      if (longTermTrend !== recentTrend && 
          longTermTrend !== 'sideways' && 
          recentTrend !== 'sideways') {
        
        const strength = this.calculateCHoCHStrength(longTermWindow, recentWindow, currentCandle);
        const significance = strength > 0.7 ? 'major' : 'minor';

        changes.push({
          id: `choch_${i}`,
          level: currentCandle.close,
          previousTrend: longTermTrend as 'bullish' | 'bearish',
          newTrend: recentTrend as 'bullish' | 'bearish',
          timeframe: currentCandle.timeframe,
          strength,
          created: currentCandle.timestamp,
          confirmed: false,
          significance
        });
      }
    }

    return changes.slice(-5); // Keep last 5 CHoCH
  }

  private determineTrendDirection(candles: CandleData[]): 'bullish' | 'bearish' | 'sideways' {
    if (candles.length < 10) return 'sideways';

    const startPrice = candles[0].close;
    const endPrice = candles[candles.length - 1].close;
    const priceChange = ((endPrice - startPrice) / startPrice) * 100;

    if (priceChange > 3) return 'bullish';
    if (priceChange < -3) return 'bearish';
    return 'sideways';
  }

  private calculateCHoCHStrength(
    longTermWindow: CandleData[],
    recentWindow: CandleData[],
    currentCandle: CandleData
  ): number {
    const longTermVolume = this.getAverageVolume(longTermWindow);
    const recentVolume = this.getAverageVolume(recentWindow);
    const volumeChange = recentVolume / longTermVolume;

    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const range = currentCandle.high - currentCandle.low;
    const bodyPercentage = bodySize / range;

    return Math.min((volumeChange + bodyPercentage) / 3, 1);
  }

  private analyzeInstitutionalOrderFlow(candles: CandleData[]): InstitutionalOrderFlow {
    const volumeProfile = this.calculateVolumeProfile(candles);
    const wyckoffPhase = this.identifyWyckoffPhase(candles);
    const smartMoneyActivity = this.calculateSmartMoneyActivity(candles);
    const retailActivity = this.calculateRetailActivity(candles);

    const direction = this.determineInstitutionalDirection(volumeProfile, wyckoffPhase);
    const strength = this.calculateInstitutionalStrength(smartMoneyActivity, volumeProfile);
    const confidence = this.calculateFlowConfidence(wyckoffPhase, volumeProfile);
    const phase = this.determineMarketPhase(wyckoffPhase, direction);

    return {
      direction,
      strength,
      confidence,
      phase,
      smartMoneyActivity,
      retailActivity,
      volumeProfile,
      wyckoffPhase
    };
  }

  private calculateVolumeProfile(candles: CandleData[]): VolumeProfile {
    const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
    
    // Simplified volume profile calculation
    let totalVolumePrice = 0;
    candles.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      totalVolumePrice += typicalPrice * candle.volume;
    });

    const vwap = totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
    
    // Create volume nodes
    const priceRanges = this.createPriceRanges(candles);
    const volumeNodes = this.calculateVolumeNodes(candles, priceRanges);
    
    // Find point of control (highest volume price level)
    const poc = volumeNodes.reduce((max, node) => 
      node.volume > max.volume ? node : max, volumeNodes[0]);

    return {
      totalVolume,
      buyVolume: totalVolume * 0.52, // Simplified
      sellVolume: totalVolume * 0.48, // Simplified
      neutralVolume: 0,
      vwap,
      poc: poc?.price || vwap,
      valueAreaHigh: vwap * 1.02,
      valueAreaLow: vwap * 0.98,
      volumeNodes
    };
  }

  private createPriceRanges(candles: CandleData[]): number[] {
    const allPrices = candles.flatMap(c => [c.high, c.low, c.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const ranges: number[] = [];
    
    const step = (maxPrice - minPrice) / 50; // 50 price levels
    for (let i = 0; i <= 50; i++) {
      ranges.push(minPrice + (step * i));
    }
    
    return ranges;
  }

  private calculateVolumeNodes(candles: CandleData[], priceRanges: number[]): VolumeNode[] {
    const nodes: VolumeNode[] = [];
    const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
    
    priceRanges.forEach((price, index) => {
      const nextPrice = priceRanges[index + 1];
      if (!nextPrice) return;
      
      const volumeInRange = candles
        .filter(c => c.low <= nextPrice && c.high >= price)
        .reduce((sum, c) => sum + c.volume, 0);
      
      const percentage = (volumeInRange / totalVolume) * 100;
      
      nodes.push({
        price,
        volume: volumeInRange,
        percentage,
        significance: percentage > 5 ? 'high' : percentage > 2 ? 'medium' : 'low'
      });
    });
    
    return nodes.sort((a, b) => b.volume - a.volume).slice(0, 20);
  }

  private identifyWyckoffPhase(candles: CandleData[]): WyckoffPhase {
    // Simplified Wyckoff phase identification
    const recentCandles = candles.slice(-50);
    const priceRange = Math.max(...recentCandles.map(c => c.high)) - 
                      Math.min(...recentCandles.map(c => c.low));
    const avgVolume = this.getAverageVolume(recentCandles);
    const volumeVariation = this.calculateVolumeVariation(recentCandles);

    let phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
    let subPhase: string;
    let confidence: number;

    if (volumeVariation > 0.5 && priceRange < avgVolume * 0.01) {
      phase = 'accumulation';
      subPhase = 'Phase A';
      confidence = 0.7;
    } else if (volumeVariation < 0.3 && this.determineTrendDirection(recentCandles) === 'bullish') {
      phase = 'markup';
      subPhase = 'Phase C';
      confidence = 0.8;
    } else if (volumeVariation > 0.4 && priceRange > avgVolume * 0.02) {
      phase = 'distribution';
      subPhase = 'Phase B';
      confidence = 0.6;
    } else {
      phase = 'markdown';
      subPhase = 'Phase D';
      confidence = 0.5;
    }

    return {
      phase,
      subPhase,
      confidence,
      events: [] // Would implement detailed event detection
    };
  }

  private calculateVolumeVariation(candles: CandleData[]): number {
    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const variance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / avgVolume;
  }

  private calculateSmartMoneyActivity(candles: CandleData[]): number {
    let smartMoneyScore = 0;
    const avgVolume = this.getAverageVolume(candles);

    candles.forEach(candle => {
      const bodySize = Math.abs(candle.close - candle.open);
      const range = candle.high - candle.low;
      const bodyPercentage = bodySize / range;

      // High volume + strong directional move = smart money
      if (candle.volume > avgVolume * 2 && bodyPercentage > 0.7) {
        smartMoneyScore += 0.1;
      }

      // Low volume + indecision = retail activity
      if (candle.volume < avgVolume * 0.5 && bodyPercentage < 0.3) {
        smartMoneyScore -= 0.05;
      }
    });

    return Math.max(Math.min(smartMoneyScore, 1), 0);
  }

  private calculateRetailActivity(candles: CandleData[]): number {
    return 1 - this.calculateSmartMoneyActivity(candles);
  }

  private determineInstitutionalDirection(
    volumeProfile: VolumeProfile,
    wyckoffPhase: WyckoffPhase
  ): 'accumulation' | 'distribution' | 'reaccumulation' | 'redistribution' {
    if (wyckoffPhase.phase === 'accumulation') {
      return wyckoffPhase.confidence > 0.7 ? 'accumulation' : 'reaccumulation';
    } else if (wyckoffPhase.phase === 'distribution') {
      return wyckoffPhase.confidence > 0.7 ? 'distribution' : 'redistribution';
    }
    
    // Fall back to volume analysis
    if (volumeProfile.buyVolume > volumeProfile.sellVolume) {
      return 'accumulation';
    } else {
      return 'distribution';
    }
  }

  private calculateInstitutionalStrength(
    smartMoneyActivity: number,
    volumeProfile: VolumeProfile
  ): number {
    const volumeImbalance = Math.abs(volumeProfile.buyVolume - volumeProfile.sellVolume) / 
                           volumeProfile.totalVolume;
    
    return (smartMoneyActivity + volumeImbalance) / 2;
  }

  private calculateFlowConfidence(
    wyckoffPhase: WyckoffPhase,
    volumeProfile: VolumeProfile
  ): number {
    const phaseConfidence = wyckoffPhase.confidence;
    const volumeConfidence = volumeProfile.volumeNodes
      .filter(n => n.significance === 'high').length / volumeProfile.volumeNodes.length;
    
    return (phaseConfidence + volumeConfidence) / 2;
  }

  private determineMarketPhase(
    wyckoffPhase: WyckoffPhase,
    direction: string
  ): 'markup' | 'markdown' | 'accumulation' | 'distribution' {
    return wyckoffPhase.phase;
  }

  private identifyKeyLevels(candles: CandleData[]): KeyLevel[] {
    const levels: KeyLevel[] = [];
    const lookbackPeriod = 50;

    if (candles.length < lookbackPeriod) return levels;

    const window = candles.slice(-lookbackPeriod);
    
    // Find significant highs and lows
    for (let i = 2; i < window.length - 2; i++) {
      const candle = window[i];
      const prev2 = window[i - 2];
      const prev1 = window[i - 1];
      const next1 = window[i + 1];
      const next2 = window[i + 2];

      // Resistance level (swing high)
      if (candle.high > prev2.high && 
          candle.high > prev1.high && 
          candle.high > next1.high && 
          candle.high > next2.high) {
        
        levels.push({
          id: `resistance_${i}`,
          price: candle.high,
          type: 'resistance',
          strength: this.calculateLevelStrength(candle, window),
          tested: 0,
          broken: false,
          timeframe: candle.timeframe,
          created: candle.timestamp
        });
      }

      // Support level (swing low)
      if (candle.low < prev2.low && 
          candle.low < prev1.low && 
          candle.low < next1.low && 
          candle.low < next2.low) {
        
        levels.push({
          id: `support_${i}`,
          price: candle.low,
          type: 'support',
          strength: this.calculateLevelStrength(candle, window),
          tested: 0,
          broken: false,
          timeframe: candle.timeframe,
          created: candle.timestamp
        });
      }
    }

    return levels.slice(-10); // Keep last 10 levels
  }

  private calculateLevelStrength(candle: CandleData, window: CandleData[]): number {
    const avgVolume = this.getAverageVolume(window);
    const volumeRatio = candle.volume / avgVolume;
    
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    const bodyPercentage = bodySize / range;
    
    return Math.min((volumeRatio + bodyPercentage) / 3, 1);
  }

  private filterCandlesByTimeframe(candles: CandleData[], timeframe: string): CandleData[] {
    // In a real implementation, this would filter candles by timeframe
    // For now, return all candles with updated timeframe
    return candles.map(candle => ({ ...candle, timeframe }));
  }

  private determineTimeframeAlignment(
    timeframeAnalyses: { [key: string]: TimeframeAnalysis }
  ): 'bullish' | 'bearish' | 'conflicted' {
    const trends = Object.values(timeframeAnalyses)
      .map(analysis => analysis.marketStructure.trend);
    
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'conflicted';
  }

  private calculateAlignmentConfidence(
    timeframeAnalyses: { [key: string]: TimeframeAnalysis },
    alignment: string
  ): number {
    const confirmingTrends = Object.values(timeframeAnalyses)
      .filter(analysis => 
        analysis.marketStructure.trend === alignment || 
        alignment === 'conflicted'
      ).length;
    
    const totalTimeframes = Object.keys(timeframeAnalyses).length;
    
    return confirmingTrends / totalTimeframes;
  }

  private determinePrimaryTimeframe(timeframes: string[]): string {
    // Return the middle timeframe as primary
    const middleIndex = Math.floor(timeframes.length / 2);
    return timeframes[middleIndex] || '4h';
  }

  // Real-time update methods
  async updateMarketStructure(
    newCandle: CandleData,
    existingAnalysis: MultiTimeframeAnalysis
  ): Promise<MultiTimeframeAnalysis> {
    // Update relevant timeframe analysis with new candle
    const timeframe = newCandle.timeframe;
    
    if (existingAnalysis.timeframes[timeframe]) {
      // Update only the specific timeframe
      const candles = [newCandle]; // In practice, you'd have historical data
      existingAnalysis.timeframes[timeframe] = await this.analyzeSingleTimeframe(candles, timeframe);
      
      // Recalculate alignment
      existingAnalysis.alignment = this.determineTimeframeAlignment(existingAnalysis.timeframes);
      existingAnalysis.confidence = this.calculateAlignmentConfidence(
        existingAnalysis.timeframes,
        existingAnalysis.alignment
      );
    }
    
    return existingAnalysis;
  }

  async getLiveMarketStructure(symbol: string): Promise<MultiTimeframeAnalysis> {
    // This would integrate with your live data feed
    // For now, return a mock analysis
    const mockCandles: CandleData[] = this.generateMockCandles(100);
    return this.analyzeMarketStructure(mockCandles);
  }

  private generateMockCandles(count: number): CandleData[] {
    const candles: CandleData[] = [];
    let price = 50000;
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      const newPrice = price * (1 + change);
      
      const open = price;
      const close = newPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = 1000 + Math.random() * 5000;
      
      candles.push({
        timestamp: Date.now() - (count - i) * 60000, // 1 minute intervals
        open,
        high,
        low,
        close,
        volume,
        timeframe: '1m'
      });
      
      price = newPrice;
    }
    
    return candles;
  }
}

export default MarketAnalysisEngine;