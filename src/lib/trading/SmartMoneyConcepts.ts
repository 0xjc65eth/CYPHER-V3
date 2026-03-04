/**
 * Smart Money Concepts (SMC) Trading System
 * Implementa conceitos avançados de análise de mercado institucional
 * Baseado nos métodos ICT (Inner Circle Trader) e conceitos de liquidez
 */

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiquidityZone {
  id: string;
  level: number;
  type: 'buyLiquidity' | 'sellLiquidity' | 'equalHigh' | 'equalLow';
  strength: number; // 1-100
  timeframe: string;
  created: number;
  status: 'active' | 'mitigated' | 'swept';
  sweepCandles?: PriceData[];
}

export interface OrderBlock {
  id: string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  timeframe: string;
  volume: number;
  created: number;
  status: 'active' | 'tested' | 'broken';
  mitigation?: {
    percentage: number;
    timestamp: number;
  };
}

export interface FairValueGap {
  id: string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  created: number;
  timeframe: string;
  status: 'open' | 'partial' | 'filled';
  fillPercentage: number;
}

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'ranging' | 'transitional';
  higherHigh: boolean;
  higherLow: boolean;
  lowerHigh: boolean;
  lowerLow: boolean;
  lastSignificantHigh: number;
  lastSignificantLow: number;
  structureShift?: {
    type: 'BOS' | 'CHOCH'; // Break of Structure / Change of Character
    level: number;
    timestamp: number;
  };
}

export interface InducementZone {
  level: number;
  type: 'buySide' | 'sellSide';
  probability: number;
  timeframe: string;
  created: number;
}

export interface SMCAnalysis {
  marketStructure: MarketStructure;
  liquidityZones: LiquidityZone[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  inducements: InducementZone[];
  timestamp: number;
  confidence: number;
  tradingBias: 'bullish' | 'bearish' | 'neutral';
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export class SmartMoneyConceptsAnalyzer {
  private priceData: PriceData[] = [];
  private liquidityZones: LiquidityZone[] = [];
  private orderBlocks: OrderBlock[] = [];
  private fairValueGaps: FairValueGap[] = [];
  private inducements: InducementZone[] = [];
  
  constructor(private config = {
    minLiquidityTouches: 2,
    orderBlockThreshold: 0.5, // % movement required
    fvgMinSize: 0.1, // % minimum gap size
    structureLookback: 50 // candles to look back for structure
  }) {}
  
  /**
   * Atualiza dados de preço e executa análise completa
   */
  updatePriceData(newData: PriceData[]): SMCAnalysis {
    this.priceData = [...this.priceData, ...newData].slice(-1000); // Keep last 1000 candles
    
    return this.performFullAnalysis();
  }
  
  /**
   * Executa análise completa SMC
   */
  private performFullAnalysis(): SMCAnalysis {
    this.identifyLiquidityZones();
    this.identifyOrderBlocks();
    this.identifyFairValueGaps();
    this.identifyInducements();
    this.updateStructureStatus();
    
    const marketStructure = this.analyzeMarketStructure();
    const tradingBias = this.determineTradingBias(marketStructure);
    const keyLevels = this.extractKeyLevels();
    const confidence = this.calculateConfidence();
    
    return {
      marketStructure,
      liquidityZones: this.liquidityZones.filter(zone => zone.status === 'active'),
      orderBlocks: this.orderBlocks.filter(block => block.status === 'active'),
      fairValueGaps: this.fairValueGaps.filter(gap => gap.status !== 'filled'),
      inducements: this.inducements,
      timestamp: Date.now(),
      confidence,
      tradingBias,
      keyLevels
    };
  }
  
  /**
   * Identifica zonas de liquidez (Equal Highs/Lows, Buy/Sell Liquidity)
   */
  private identifyLiquidityZones(): void {
    if (this.priceData.length < 20) return;
    
    const recentData = this.priceData.slice(-100);
    const pivots = this.findPivotPoints(recentData);
    
    // Identificar Equal Highs
    const highs = pivots.filter(p => p.type === 'high');
    for (let i = 0; i < highs.length - 1; i++) {
      for (let j = i + 1; j < highs.length; j++) {
        const diff = Math.abs(highs[i].price - highs[j].price);
        const avgPrice = (highs[i].price + highs[j].price) / 2;
        
        if (diff / avgPrice < 0.005) { // Within 0.5%
          const touches = this.countLevelTouches(avgPrice, 0.002);
          
          if (touches >= this.config.minLiquidityTouches) {
            this.liquidityZones.push({
              id: `EH_${Date.now()}_${Math.random()}`,
              level: avgPrice,
              type: 'equalHigh',
              strength: Math.min(touches * 20, 100),
              timeframe: '4H',
              created: Date.now(),
              status: 'active'
            });
          }
        }
      }
    }
    
    // Identificar Equal Lows
    const lows = pivots.filter(p => p.type === 'low');
    for (let i = 0; i < lows.length - 1; i++) {
      for (let j = i + 1; j < lows.length; j++) {
        const diff = Math.abs(lows[i].price - lows[j].price);
        const avgPrice = (lows[i].price + lows[j].price) / 2;
        
        if (diff / avgPrice < 0.005) {
          const touches = this.countLevelTouches(avgPrice, 0.002);
          
          if (touches >= this.config.minLiquidityTouches) {
            this.liquidityZones.push({
              id: `EL_${Date.now()}_${Math.random()}`,
              level: avgPrice,
              type: 'equalLow',
              strength: Math.min(touches * 20, 100),
              timeframe: '4H',
              created: Date.now(),
              status: 'active'
            });
          }
        }
      }
    }
    
    // Limpar zonas antigas (mais de 200 candles)
    this.liquidityZones = this.liquidityZones.filter(
      zone => Date.now() - zone.created < 200 * 240000 // 200 * 4min
    );
  }
  
  /**
   * Identifica Order Blocks (zonas de ordem institucional)
   */
  private identifyOrderBlocks(): void {
    if (this.priceData.length < 10) return;
    
    for (let i = 5; i < this.priceData.length - 5; i++) {
      const candle = this.priceData[i];
      const nextCandles = this.priceData.slice(i + 1, i + 6);
      
      // Bullish Order Block: candle de baixa seguido por movimento forte de alta
      if (candle.close < candle.open) { // Red candle
        const strongMove = nextCandles.some(next => 
          (next.high - candle.low) / candle.low > this.config.orderBlockThreshold / 100
        );
        
        if (strongMove) {
          this.orderBlocks.push({
            id: `BOB_${i}_${Date.now()}`,
            high: candle.high,
            low: candle.low,
            type: 'bullish',
            timeframe: '4H',
            volume: candle.volume,
            created: candle.timestamp,
            status: 'active'
          });
        }
      }
      
      // Bearish Order Block: candle de alta seguido por movimento forte de baixa
      if (candle.close > candle.open) { // Green candle
        const strongMove = nextCandles.some(next => 
          (candle.high - next.low) / candle.high > this.config.orderBlockThreshold / 100
        );
        
        if (strongMove) {
          this.orderBlocks.push({
            id: `SOB_${i}_${Date.now()}`,
            high: candle.high,
            low: candle.low,
            type: 'bearish',
            timeframe: '4H',
            volume: candle.volume,
            created: candle.timestamp,
            status: 'active'
          });
        }
      }
    }
    
    // Limitar número de order blocks ativos
    this.orderBlocks = this.orderBlocks
      .sort((a, b) => b.created - a.created)
      .slice(0, 20);
  }
  
  /**
   * Identifica Fair Value Gaps (gaps de valor justo)
   */
  private identifyFairValueGaps(): void {
    if (this.priceData.length < 3) return;
    
    for (let i = 1; i < this.priceData.length - 1; i++) {
      const prev = this.priceData[i - 1];
      const current = this.priceData[i];
      const next = this.priceData[i + 1];
      
      // Bullish FVG: gap entre prev.high e next.low
      if (prev.high < next.low) {
        const gapSize = (next.low - prev.high) / prev.high;
        
        if (gapSize > this.config.fvgMinSize / 100) {
          this.fairValueGaps.push({
            id: `BFVG_${i}_${Date.now()}`,
            high: next.low,
            low: prev.high,
            type: 'bullish',
            created: current.timestamp,
            timeframe: '4H',
            status: 'open',
            fillPercentage: 0
          });
        }
      }
      
      // Bearish FVG: gap entre prev.low e next.high
      if (prev.low > next.high) {
        const gapSize = (prev.low - next.high) / next.high;
        
        if (gapSize > this.config.fvgMinSize / 100) {
          this.fairValueGaps.push({
            id: `SFVG_${i}_${Date.now()}`,
            high: prev.low,
            low: next.high,
            type: 'bearish',
            created: current.timestamp,
            timeframe: '4H',
            status: 'open',
            fillPercentage: 0
          });
        }
      }
    }
    
    // Atualizar status dos FVGs existentes
    this.updateFVGStatus();
    
    // Limitar número de FVGs
    this.fairValueGaps = this.fairValueGaps
      .filter(fvg => fvg.status !== 'filled')
      .slice(0, 15);
  }
  
  /**
   * Identifica zonas de indução (áreas onde o preço pode induzir liquidez)
   */
  private identifyInducements(): void {
    this.inducements = [];
    
    if (this.priceData.length < 20) return;
    
    const recentHigh = Math.max(...this.priceData.slice(-20).map(d => d.high));
    const recentLow = Math.min(...this.priceData.slice(-20).map(d => d.low));
    
    // Indução de buy-side (acima do high recente)
    this.inducements.push({
      level: recentHigh * 1.002, // 0.2% acima
      type: 'buySide',
      probability: this.calculateInducementProbability(recentHigh, 'high'),
      timeframe: '4H',
      created: Date.now()
    });
    
    // Indução de sell-side (abaixo do low recente)
    this.inducements.push({
      level: recentLow * 0.998, // 0.2% abaixo
      type: 'sellSide',
      probability: this.calculateInducementProbability(recentLow, 'low'),
      timeframe: '4H',
      created: Date.now()
    });
  }
  
  /**
   * Analisa estrutura de mercado
   */
  private analyzeMarketStructure(): MarketStructure {
    if (this.priceData.length < this.config.structureLookback) {
      return {
        trend: 'ranging',
        higherHigh: false,
        higherLow: false,
        lowerHigh: false,
        lowerLow: false,
        lastSignificantHigh: 0,
        lastSignificantLow: 0
      };
    }
    
    const pivots = this.findPivotPoints(this.priceData.slice(-this.config.structureLookback));
    const highs = pivots.filter(p => p.type === 'high').slice(-3);
    const lows = pivots.filter(p => p.type === 'low').slice(-3);
    
    let higherHigh = false;
    let higherLow = false;
    let lowerHigh = false;
    let lowerLow = false;
    
    // Analisar highs
    if (highs.length >= 2) {
      higherHigh = highs[highs.length - 1].price > highs[highs.length - 2].price;
      lowerHigh = highs[highs.length - 1].price < highs[highs.length - 2].price;
    }
    
    // Analisar lows
    if (lows.length >= 2) {
      higherLow = lows[lows.length - 1].price > lows[lows.length - 2].price;
      lowerLow = lows[lows.length - 1].price < lows[lows.length - 2].price;
    }
    
    // Determinar trend
    let trend: MarketStructure['trend'] = 'ranging';
    if (higherHigh && higherLow) trend = 'bullish';
    else if (lowerHigh && lowerLow) trend = 'bearish';
    else if ((higherHigh && lowerLow) || (lowerHigh && higherLow)) trend = 'transitional';
    
    return {
      trend,
      higherHigh,
      higherLow,
      lowerHigh,
      lowerLow,
      lastSignificantHigh: highs.length > 0 ? highs[highs.length - 1].price : 0,
      lastSignificantLow: lows.length > 0 ? lows[lows.length - 1].price : 0
    };
  }
  
  /**
   * Determina bias de trading baseado na análise SMC
   */
  private determineTradingBias(structure: MarketStructure): 'bullish' | 'bearish' | 'neutral' {
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Score baseado na estrutura
    if (structure.trend === 'bullish') bullishScore += 3;
    else if (structure.trend === 'bearish') bearishScore += 3;
    
    // Score baseado em order blocks
    const recentOBs = this.orderBlocks.filter(ob => ob.status === 'active').slice(-5);
    const bullishOBs = recentOBs.filter(ob => ob.type === 'bullish').length;
    const bearishOBs = recentOBs.filter(ob => ob.type === 'bearish').length;
    
    bullishScore += bullishOBs;
    bearishScore += bearishOBs;
    
    // Score baseado em FVGs
    const openFVGs = this.fairValueGaps.filter(fvg => fvg.status === 'open');
    const bullishFVGs = openFVGs.filter(fvg => fvg.type === 'bullish').length;
    const bearishFVGs = openFVGs.filter(fvg => fvg.type === 'bearish').length;
    
    bullishScore += bullishFVGs * 0.5;
    bearishScore += bearishFVGs * 0.5;
    
    // Determinar bias
    if (bullishScore > bearishScore + 1) return 'bullish';
    if (bearishScore > bullishScore + 1) return 'bearish';
    return 'neutral';
  }
  
  /**
   * Extrai níveis-chave de suporte e resistência
   */
  private extractKeyLevels(): { support: number[]; resistance: number[] } {
    const support: number[] = [];
    const resistance: number[] = [];
    
    // Adicionar liquidez zones
    this.liquidityZones.forEach(zone => {
      if (zone.type === 'equalLow' || zone.type === 'buyLiquidity') {
        support.push(zone.level);
      } else {
        resistance.push(zone.level);
      }
    });
    
    // Adicionar order blocks
    this.orderBlocks.forEach(ob => {
      if (ob.type === 'bullish' && ob.status === 'active') {
        support.push(ob.low);
      } else if (ob.type === 'bearish' && ob.status === 'active') {
        resistance.push(ob.high);
      }
    });
    
    // Remover duplicatas e ordenar
    return {
      support: [...new Set(support)].sort((a, b) => b - a).slice(0, 5),
      resistance: [...new Set(resistance)].sort((a, b) => a - b).slice(0, 5)
    };
  }
  
  /**
   * Calcula confiança da análise baseada na qualidade dos dados
   */
  private calculateConfidence(): number {
    let confidence = 50; // Base confidence
    
    // Adicionar confiança baseado na quantidade de dados
    if (this.priceData.length > 100) confidence += 20;
    else if (this.priceData.length > 50) confidence += 10;
    
    // Adicionar confiança baseado na convergência de sinais
    const activeLZ = this.liquidityZones.filter(lz => lz.status === 'active').length;
    const activeOB = this.orderBlocks.filter(ob => ob.status === 'active').length;
    const openFVG = this.fairValueGaps.filter(fvg => fvg.status === 'open').length;
    
    if (activeLZ > 2) confidence += 5;
    if (activeOB > 3) confidence += 5;
    if (openFVG > 2) confidence += 5;
    
    return Math.min(confidence, 95);
  }
  
  /**
   * Métodos auxiliares
   */
  private findPivotPoints(data: PriceData[], lookback = 5): Array<{type: 'high' | 'low', price: number, index: number}> {
    const pivots: Array<{type: 'high' | 'low', price: number, index: number}> = [];

    for (let i = lookback; i < data.length - lookback; i++) {
      const current = data[i];
      const isHigh = data.slice(i - lookback, i + lookback + 1)
        .every((candle, idx) => idx === lookback || candle.high <= current.high);
      const isLow = data.slice(i - lookback, i + lookback + 1)
        .every((candle, idx) => idx === lookback || candle.low >= current.low);

      if (isHigh) pivots.push({ type: 'high' as const, price: current.high, index: i });
      if (isLow) pivots.push({ type: 'low' as const, price: current.low, index: i });
    }
    
    return pivots;
  }
  
  private countLevelTouches(level: number, tolerance: number): number {
    return this.priceData.filter(candle => 
      Math.abs(candle.high - level) / level < tolerance ||
      Math.abs(candle.low - level) / level < tolerance
    ).length;
  }
  
  private calculateInducementProbability(level: number, type: 'high' | 'low'): number {
    const touches = this.countLevelTouches(level, 0.001);
    const recentData = this.priceData.slice(-20);
    
    let probability = 30 + (touches * 10); // Base + touches
    
    // Ajustar baseado no momentum
    const momentum = type === 'high' 
      ? recentData[recentData.length - 1].close > recentData[0].close
      : recentData[recentData.length - 1].close < recentData[0].close;
    
    if (momentum) probability += 20;
    
    return Math.min(probability, 90);
  }
  
  private updateStructureStatus(): void {
    const currentPrice = this.priceData[this.priceData.length - 1]?.close;
    if (!currentPrice) return;
    
    // Atualizar status dos order blocks
    this.orderBlocks.forEach(ob => {
      if (ob.status === 'active') {
        if (ob.type === 'bullish' && currentPrice <= ob.high && currentPrice >= ob.low) {
          ob.status = 'tested';
          ob.mitigation = {
            percentage: ((ob.high - currentPrice) / (ob.high - ob.low)) * 100,
            timestamp: Date.now()
          };
        }
        if (ob.type === 'bearish' && currentPrice <= ob.high && currentPrice >= ob.low) {
          ob.status = 'tested';
          ob.mitigation = {
            percentage: ((currentPrice - ob.low) / (ob.high - ob.low)) * 100,
            timestamp: Date.now()
          };
        }
      }
    });
    
    // Atualizar status das liquidez zones
    this.liquidityZones.forEach(zone => {
      if (zone.status === 'active') {
        const tolerance = zone.level * 0.001; // 0.1% tolerance
        if (Math.abs(currentPrice - zone.level) < tolerance) {
          zone.status = 'mitigated';
        }
      }
    });
  }
  
  private updateFVGStatus(): void {
    const currentPrice = this.priceData[this.priceData.length - 1]?.close;
    if (!currentPrice) return;
    
    this.fairValueGaps.forEach(fvg => {
      if (fvg.status !== 'filled') {
        if (currentPrice >= fvg.low && currentPrice <= fvg.high) {
          const fillPercentage = fvg.type === 'bullish'
            ? ((currentPrice - fvg.low) / (fvg.high - fvg.low)) * 100
            : ((fvg.high - currentPrice) / (fvg.high - fvg.low)) * 100;
          
          fvg.fillPercentage = fillPercentage;
          
          if (fillPercentage > 50) {
            fvg.status = 'partial';
          }
          if (fillPercentage > 95) {
            fvg.status = 'filled';
          }
        }
      }
    });
  }
  
  /**
   * Métodos públicos para acessar dados
   */
  public getActiveLiquidityZones(): LiquidityZone[] {
    return this.liquidityZones.filter(zone => zone.status === 'active');
  }
  
  public getActiveOrderBlocks(): OrderBlock[] {
    return this.orderBlocks.filter(block => block.status === 'active');
  }
  
  public getOpenFairValueGaps(): FairValueGap[] {
    return this.fairValueGaps.filter(gap => gap.status !== 'filled');
  }
  
  public getCurrentInducements(): InducementZone[] {
    return this.inducements;
  }
  
  /**
   * Gera sinais de trading baseados na análise SMC
   */
  public generateTradingSignals(): Array<{
    type: 'buy' | 'sell' | 'wait';
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    reason: string;
    timeframe: string;
  }> {
    const signals: Array<{
      type: 'buy' | 'sell' | 'wait';
      confidence: number;
      entry: number;
      stopLoss: number;
      takeProfit: number;
      reason: string;
      timeframe: string;
    }> = [];
    const analysis = this.performFullAnalysis();
    const currentPrice = this.priceData[this.priceData.length - 1]?.close;

    if (!currentPrice) return signals;
    
    // Sinal baseado em order block + estrutura
    const nearOB = this.orderBlocks.find(ob => 
      ob.status === 'active' && 
      currentPrice >= ob.low * 0.998 && 
      currentPrice <= ob.high * 1.002
    );
    
    if (nearOB && analysis.tradingBias !== 'neutral') {
      const isBullishSignal = nearOB.type === 'bullish' && analysis.tradingBias === 'bullish';
      const isBearishSignal = nearOB.type === 'bearish' && analysis.tradingBias === 'bearish';
      
      if (isBullishSignal) {
        signals.push({
          type: 'buy',
          confidence: Math.min(analysis.confidence + 10, 95),
          entry: currentPrice,
          stopLoss: nearOB.low * 0.995,
          takeProfit: currentPrice * 1.02,
          reason: `Bullish Order Block confluence with ${analysis.tradingBias} bias`,
          timeframe: '4H'
        });
      }
      
      if (isBearishSignal) {
        signals.push({
          type: 'sell',
          confidence: Math.min(analysis.confidence + 10, 95),
          entry: currentPrice,
          stopLoss: nearOB.high * 1.005,
          takeProfit: currentPrice * 0.98,
          reason: `Bearish Order Block confluence with ${analysis.tradingBias} bias`,
          timeframe: '4H'
        });
      }
    }
    
    return signals;
  }
}

// Factory function para facilitar uso
export function createSMCAnalyzer(config?: any): SmartMoneyConceptsAnalyzer {
  return new SmartMoneyConceptsAnalyzer(config);
}

// Utilitários para conversão de dados
export function convertCandlesToPriceData(candles: any[]): PriceData[] {
  return candles.map(candle => ({
    timestamp: candle.timestamp || candle.time || Date.now(),
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
    volume: parseFloat(candle.volume || 0)
  }));
}

export default SmartMoneyConceptsAnalyzer;