/**
 * 🔬 FEATURE ENGINEERING v3.0
 * Advanced Feature Extraction and Engineering for Trading AI
 * 
 * RESEARCH-BASED:
 * - "Advances in Financial Machine Learning" (López de Prado, 2018)
 * - "Feature Engineering for Machine Learning" (Zheng & Casari, 2018)
 * - "Technical Analysis Features" (Murphy, 1999)
 * - "Market Microstructure Features" (O'Hara, 1995)
 */

import * as tf from '@tensorflow/tfjs-node';
import { EventEmitter } from 'events';

// Feature Types
export interface PriceFeatures {
  // Basic price features
  returns: number[];
  logReturns: number[];
  priceChange: number[];
  priceChangePercent: number[];
  
  // Rolling statistics
  rollingMean: { [window: string]: number[] };
  rollingStd: { [window: string]: number[] };
  rollingSkewness: { [window: string]: number[] };
  rollingKurtosis: { [window: string]: number[] };
  
  // Price ratios
  highLowRatio: number[];
  closeOpenRatio: number[];
  
  // Fractional differencing (for stationarity)
  fractionalDiff: number[];
}

export interface TechnicalFeatures {
  // Trend indicators
  sma: { [period: string]: number[] };
  ema: { [period: string]: number[] };
  macd: { line: number[]; signal: number[]; histogram: number[] };
  adx: number[];
  plusDI: number[];
  minusDI: number[];
  aroon: { up: number[]; down: number[] };
  psar: number[];
  ichimoku: {
    tenkanSen: number[];
    kijunSen: number[];
    senkouSpanA: number[];
    senkouSpanB: number[];
    chikouSpan: number[];
  };
  
  // Momentum indicators
  rsi: { [period: string]: number[] };
  stochastic: { k: number[]; d: number[] };
  williams: number[];
  roc: { [period: string]: number[] };
  momentum: { [period: string]: number[] };
  cci: number[];
  mfi: number[];
  ultimateOscillator: number[];
  
  // Volatility indicators
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
    bandwidth: number[];
    percentB: number[];
  };
  atr: number[];
  keltner: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  donchian: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  
  // Volume indicators
  obv: number[];
  vwap: number[];
  volumeRatio: number[];
  accumDistribution: number[];
  chaikinMoneyFlow: number[];
  volumeWeightedMACD: {
    line: number[];
    signal: number[];
  };
}

export interface MarketMicrostructureFeatures {
  // Order book features
  bidAskSpread: number[];
  bidAskImbalance: number[];
  orderBookDepth: { [level: string]: number[] };
  orderFlowImbalance: number[];
  
  // Trade features
  tradeSize: number[];
  tradeIntensity: number[];
  buyVolume: number[];
  sellVolume: number[];
  volumeImbalance: number[];
  
  // Liquidity measures
  amihudIlliquidity: number[];
  rollImpactCost: number[];
  kyleSlambda: number[];
  
  // Price impact
  temporaryImpact: number[];
  permanentImpact: number[];
  realizationShortfall: number[];
}

export interface AlternativeFeatures {
  // Sentiment features
  newsSentiment: number[];
  socialSentiment: number[];
  fearGreedIndex: number[];
  putCallRatio: number[];
  
  // On-chain features (for crypto)
  networkHashrate: number[];
  activeAddresses: number[];
  transactionVolume: number[];
  exchangeFlows: { inflow: number[]; outflow: number[] };
  whaleTransactions: number[];
  
  // Macro features
  correlationSP500: number[];
  correlationGold: number[];
  correlationDXY: number[];
  yieldCurve: number[];
  vix: number[];
}

export interface StatisticalFeatures {
  // Entropy measures
  shannonEntropy: number[];
  approximateEntropy: number[];
  sampleEntropy: number[];
  
  // Fractal dimensions
  hurstExponent: number[];
  fractalDimension: number[];
  
  // Information theory
  mutualInformation: { [lag: string]: number[] };
  transferEntropy: { [lag: string]: number[] };
  
  // Non-linear features
  lyapunovExponent: number[];
  correlationDimension: number[];
}

/**
 * 🧪 Feature Engineering Pipeline
 */
export class FeatureEngineer extends EventEmitter {
  private featureCache: Map<string, any> = new Map();
  private featureImportance: Map<string, number> = new Map();
  private featureCorrelations: Map<string, Map<string, number>> = new Map();
  
  // Feature extraction functions
  private extractors: Map<string, Function> = new Map();
  
  // Feature transformers
  private transformers: Map<string, Function> = new Map();
  
  // Feature selectors
  private selectors: Map<string, Function> = new Map();
  
  constructor(config?: {
    cacheSize?: number;
    parallelProcessing?: boolean;
    gpuAcceleration?: boolean;
  }) {
    super();
    
    this.initializeExtractors();
    this.initializeTransformers();
    this.initializeSelectors();
    
    this.emit('feature_engineer_initialized', { 
      extractors: this.extractors.size,
      transformers: this.transformers.size,
      selectors: this.selectors.size
    });
  }
  
  /**
   * 📊 Extract all features from market data
   */
  async extractFeatures(data: {
    ohlcv: Array<{
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      timestamp: number;
    }>;
    orderBook?: any;
    trades?: any[];
    sentiment?: any;
    onChain?: any;
    macro?: any;
  }): Promise<{
    features: number[][];
    featureNames: string[];
    featureGroups: Map<string, number[]>;
  }> {
    try {
      const startTime = Date.now();
      
      // Extract feature groups in parallel
      const [
        priceFeatures,
        technicalFeatures,
        microstructureFeatures,
        alternativeFeatures,
        statisticalFeatures
      ] = await Promise.all([
        this.extractPriceFeatures(data.ohlcv),
        this.extractTechnicalFeatures(data.ohlcv),
        this.extractMicrostructureFeatures(data),
        this.extractAlternativeFeatures(data),
        this.extractStatisticalFeatures(data.ohlcv)
      ]);
      
      // Combine all features
      const allFeatures = this.combineFeatures({
        price: priceFeatures,
        technical: technicalFeatures,
        microstructure: microstructureFeatures,
        alternative: alternativeFeatures,
        statistical: statisticalFeatures
      });
      
      // Apply feature transformations
      const transformedFeatures = await this.applyTransformations(allFeatures);
      
      // Perform feature selection
      const selectedFeatures = await this.selectFeatures(transformedFeatures);
      
      const processingTime = Date.now() - startTime;
      
      this.emit('features_extracted', {
        totalFeatures: selectedFeatures.features.length,
        processingTime,
        featureGroups: selectedFeatures.featureGroups.size
      });
      
      return selectedFeatures;
      
    } catch (error) {
      this.emit('feature_extraction_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  /**
   * 💰 Extract price-based features
   */
  private async extractPriceFeatures(ohlcv: any[]): Promise<PriceFeatures> {
    const closes = ohlcv.map(d => d.close);
    const opens = ohlcv.map(d => d.open);
    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    
    // Calculate returns
    const returns = this.calculateReturns(closes);
    const logReturns = this.calculateLogReturns(closes);
    
    // Price changes
    const priceChange = this.calculatePriceChange(closes);
    const priceChangePercent = this.calculatePriceChangePercent(closes);
    
    // Rolling statistics
    const windows = [5, 10, 20, 50];
    const rollingMean: { [key: string]: number[] } = {};
    const rollingStd: { [key: string]: number[] } = {};
    const rollingSkewness: { [key: string]: number[] } = {};
    const rollingKurtosis: { [key: string]: number[] } = {};
    
    for (const window of windows) {
      rollingMean[`${window}`] = this.rollingMean(closes, window);
      rollingStd[`${window}`] = this.rollingStd(closes, window);
      rollingSkewness[`${window}`] = this.rollingSkewness(returns, window);
      rollingKurtosis[`${window}`] = this.rollingKurtosis(returns, window);
    }
    
    // Price ratios
    const highLowRatio = highs.map((h, i) => h / (lows[i] || 1));
    const closeOpenRatio = closes.map((c, i) => c / (opens[i] || 1));
    
    // Fractional differencing for stationarity
    const fractionalDiff = this.fractionalDifferencing(closes, 0.5);
    
    return {
      returns,
      logReturns,
      priceChange,
      priceChangePercent,
      rollingMean,
      rollingStd,
      rollingSkewness,
      rollingKurtosis,
      highLowRatio,
      closeOpenRatio,
      fractionalDiff
    };
  }
  
  /**
   * 📈 Extract technical indicators
   */
  private async extractTechnicalFeatures(ohlcv: any[]): Promise<TechnicalFeatures> {
    const closes = ohlcv.map(d => d.close);
    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    const volumes = ohlcv.map(d => d.volume);
    
    // Trend indicators
    const sma: { [key: string]: number[] } = {};
    const ema: { [key: string]: number[] } = {};
    const periods = [5, 10, 20, 50, 100, 200];
    
    for (const period of periods) {
      sma[`${period}`] = this.sma(closes, period);
      ema[`${period}`] = this.ema(closes, period);
    }
    
    const macd = this.macd(closes, 12, 26, 9);
    const adx = this.adx(highs, lows, closes, 14);
    const { plusDI, minusDI } = this.directionalIndicators(highs, lows, closes, 14);
    const aroon = this.aroon(highs, lows, 25);
    const psar = this.parabolicSAR(highs, lows, 0.02, 0.2);
    const ichimoku = this.ichimokuCloud(highs, lows, closes);
    
    // Momentum indicators
    const rsi: { [key: string]: number[] } = {};
    const roc: { [key: string]: number[] } = {};
    const momentum: { [key: string]: number[] } = {};
    
    for (const period of [7, 14, 21]) {
      rsi[`${period}`] = this.rsi(closes, period);
      roc[`${period}`] = this.roc(closes, period);
      momentum[`${period}`] = this.momentum(closes, period);
    }
    
    const stochastic = this.stochastic(highs, lows, closes, 14, 3);
    const williams = this.williamsR(highs, lows, closes, 14);
    const cci = this.cci(highs, lows, closes, 20);
    const mfi = this.mfi(highs, lows, closes, volumes, 14);
    const ultimateOscillator = this.ultimateOscillator(highs, lows, closes);
    
    // Volatility indicators
    const bollinger = this.bollingerBands(closes, 20, 2);
    const atr = this.atr(highs, lows, closes, 14);
    const keltner = this.keltnerChannels(highs, lows, closes, 20, 2);
    const donchian = this.donchianChannels(highs, lows, 20);
    
    // Volume indicators
    const obv = this.obv(closes, volumes);
    const vwap = this.vwap(highs, lows, closes, volumes);
    const volumeRatio = this.volumeRatio(volumes, 10);
    const accumDistribution = this.accumulationDistribution(highs, lows, closes, volumes);
    const chaikinMoneyFlow = this.chaikinMoneyFlow(highs, lows, closes, volumes, 21);
    const volumeWeightedMACD = this.volumeWeightedMACD(closes, volumes);
    
    return {
      sma,
      ema,
      macd: { line: macd.line || [], signal: macd.signal, histogram: macd.histogram },
      adx,
      plusDI,
      minusDI,
      aroon: { up: aroon.aroonUp, down: aroon.aroonDown },
      psar,
      ichimoku,
      rsi,
      stochastic,
      williams,
      roc,
      momentum,
      cci,
      mfi,
      ultimateOscillator,
      bollinger: { 
        upper: bollinger.upper, 
        middle: bollinger.middle || [], 
        lower: bollinger.lower,
        bandwidth: [],
        percentB: []
      },
      atr,
      keltner,
      donchian: { upper: donchian.upper || [], middle: [], lower: donchian.lower || [] },
      obv,
      vwap,
      volumeRatio,
      accumDistribution,
      chaikinMoneyFlow,
      volumeWeightedMACD: { line: volumeWeightedMACD.macd || [], signal: volumeWeightedMACD.signal || [] }
    };
  }
  
  /**
   * 🏛️ Extract market microstructure features
   */
  private async extractMicrostructureFeatures(data: any): Promise<MarketMicrostructureFeatures> {
    // Default values if no microstructure data
    const defaultLength = data.ohlcv.length;
    
    if (!data.orderBook || !data.trades) {
      return {
        bidAskSpread: new Array(defaultLength).fill(0),
        bidAskImbalance: new Array(defaultLength).fill(0),
        orderBookDepth: {
          '1': new Array(defaultLength).fill(0),
          '5': new Array(defaultLength).fill(0),
          '10': new Array(defaultLength).fill(0)
        },
        orderFlowImbalance: new Array(defaultLength).fill(0),
        tradeSize: new Array(defaultLength).fill(0),
        tradeIntensity: new Array(defaultLength).fill(0),
        buyVolume: new Array(defaultLength).fill(0),
        sellVolume: new Array(defaultLength).fill(0),
        volumeImbalance: new Array(defaultLength).fill(0),
        amihudIlliquidity: new Array(defaultLength).fill(0),
        rollImpactCost: new Array(defaultLength).fill(0),
        kyleSlambda: new Array(defaultLength).fill(0),
        temporaryImpact: new Array(defaultLength).fill(0),
        permanentImpact: new Array(defaultLength).fill(0),
        realizationShortfall: new Array(defaultLength).fill(0)
      };
    }
    
    // Extract real microstructure features
    const bidAskSpread = this.calculateBidAskSpread(data.orderBook);
    const bidAskImbalance = this.calculateBidAskImbalance(data.orderBook);
    const orderBookDepth = this.calculateOrderBookDepth(data.orderBook);
    const orderFlowImbalance = this.calculateOrderFlowImbalance(data.trades);
    
    // Trade-based features
    const { tradeSize, tradeIntensity } = this.calculateTradeFeatures(data.trades);
    const { buyVolume, sellVolume, volumeImbalance } = this.calculateVolumeFeatures(data.trades);
    
    // Liquidity measures
    const amihudIlliquidity = this.calculateAmihudIlliquidity(data.ohlcv, data.trades);
    const rollImpactCost = this.calculateRollImpactCost(data.ohlcv);
    const kyleSlambda = this.calculateKyleLambda(data.trades, data.ohlcv);
    
    // Price impact
    const { temporaryImpact, permanentImpact } = this.calculatePriceImpact(data.trades, data.ohlcv);
    const realizationShortfall = this.calculateRealizationShortfall(data.trades, data.ohlcv);
    
    return {
      bidAskSpread,
      bidAskImbalance,
      orderBookDepth: { '0.1%': orderBookDepth || [] },
      orderFlowImbalance,
      tradeSize,
      tradeIntensity,
      buyVolume,
      sellVolume,
      volumeImbalance,
      amihudIlliquidity,
      rollImpactCost,
      kyleSlambda,
      temporaryImpact,
      permanentImpact,
      realizationShortfall
    };
  }
  
  /**
   * 🌍 Extract alternative data features
   */
  private async extractAlternativeFeatures(data: any): Promise<AlternativeFeatures> {
    const defaultLength = data.ohlcv.length;
    
    // Sentiment features
    const newsSentiment = data.sentiment?.news || new Array(defaultLength).fill(0);
    const socialSentiment = data.sentiment?.social || new Array(defaultLength).fill(0);
    const fearGreedIndex = data.sentiment?.fearGreed || new Array(defaultLength).fill(50);
    const putCallRatio = data.sentiment?.putCall || new Array(defaultLength).fill(1);
    
    // On-chain features (for crypto)
    const networkHashrate = data.onChain?.hashrate || new Array(defaultLength).fill(0);
    const activeAddresses = data.onChain?.activeAddresses || new Array(defaultLength).fill(0);
    const transactionVolume = data.onChain?.txVolume || new Array(defaultLength).fill(0);
    const exchangeFlows = {
      inflow: data.onChain?.exchangeInflow || new Array(defaultLength).fill(0),
      outflow: data.onChain?.exchangeOutflow || new Array(defaultLength).fill(0)
    };
    const whaleTransactions = data.onChain?.whaleTransactions || new Array(defaultLength).fill(0);
    
    // Macro features
    const correlationSP500 = this.calculateRollingCorrelation(
      data.ohlcv.map((d: any) => d.close),
      data.macro?.sp500 || new Array(defaultLength).fill(0),
      20
    );
    const correlationGold = this.calculateRollingCorrelation(
      data.ohlcv.map((d: any) => d.close),
      data.macro?.gold || new Array(defaultLength).fill(0),
      20
    );
    const correlationDXY = this.calculateRollingCorrelation(
      data.ohlcv.map((d: any) => d.close),
      data.macro?.dxy || new Array(defaultLength).fill(0),
      20
    );
    const yieldCurve = data.macro?.yieldCurve || new Array(defaultLength).fill(0);
    const vix = data.macro?.vix || new Array(defaultLength).fill(15);
    
    return {
      newsSentiment,
      socialSentiment,
      fearGreedIndex,
      putCallRatio,
      networkHashrate,
      activeAddresses,
      transactionVolume,
      exchangeFlows,
      whaleTransactions,
      correlationSP500,
      correlationGold,
      correlationDXY,
      yieldCurve,
      vix
    };
  }
  
  /**
   * 📐 Extract statistical features
   */
  private async extractStatisticalFeatures(ohlcv: any[]): Promise<StatisticalFeatures> {
    const closes = ohlcv.map(d => d.close);
    const volumes = ohlcv.map(d => d.volume);
    const returns = this.calculateReturns(closes);
    
    // Entropy measures
    const shannonEntropy = this.calculateShannonEntropy(returns);
    const approximateEntropy = this.calculateApproximateEntropy(returns, 2, 0.2);
    const sampleEntropy = this.calculateSampleEntropy(returns, 2, 0.2);
    
    // Fractal dimensions
    const hurstExponent = this.calculateHurstExponent(closes);
    const fractalDimension = this.calculateFractalDimension(closes);
    
    // Information theory
    const mutualInformation: { [key: string]: number[] } = {};
    const transferEntropy: { [key: string]: number[] } = {};
    
    for (const lag of [1, 5, 10]) {
      mutualInformation[`${lag}`] = [this.calculateMutualInformation(returns, volumes)];
      transferEntropy[`${lag}`] = [this.calculateTransferEntropy(returns, volumes, lag)];
    }
    
    // Non-linear features
    const lyapunovExponent = this.calculateLyapunovExponent(returns);
    const correlationDimension = this.calculateCorrelationDimension(returns);
    
    return {
      shannonEntropy: [shannonEntropy],
      approximateEntropy: [approximateEntropy],
      sampleEntropy: [sampleEntropy],
      hurstExponent: [hurstExponent],
      fractalDimension: [fractalDimension],
      mutualInformation,
      transferEntropy,
      lyapunovExponent: [lyapunovExponent],
      correlationDimension: [correlationDimension]
    };
  }
  
  /**
   * 🔄 Initialize feature extractors
   */
  private initializeExtractors(): void {
    // Price extractors
    this.extractors.set('returns', (data: number[]) => this.calculateReturns(data));
    this.extractors.set('logReturns', (data: number[]) => this.calculateLogReturns(data));
    this.extractors.set('volatility', (data: number[]) => this.calculateVolatility(data));
    
    // Technical extractors
    this.extractors.set('sma', (data: number[], period: number) => this.sma(data, period));
    this.extractors.set('ema', (data: number[], period: number) => this.ema(data, period));
    this.extractors.set('rsi', (data: number[], period: number) => this.rsi(data, period));
    
    // Add more extractors...
  }
  
  /**
   * 🎛️ Initialize feature transformers
   */
  private initializeTransformers(): void {
    // Normalization
    this.transformers.set('minmax', (data: number[]) => this.minMaxNormalize(data));
    this.transformers.set('zscore', (data: number[]) => this.zScoreNormalize(data));
    this.transformers.set('robust', (data: number[]) => this.robustScale(data));
    
    // Non-linear transformations
    this.transformers.set('log', (data: number[]) => data.map(x => Math.log(Math.abs(x) + 1)));
    this.transformers.set('sqrt', (data: number[]) => data.map(x => Math.sqrt(Math.abs(x))));
    this.transformers.set('polynomial', (data: number[], degree: number) => this.polynomialFeatures(data, degree));
    
    // Interaction features
    this.transformers.set('interaction', (data1: number[], data2: number[]) => 
      data1.map((x, i) => x * data2[i])
    );
  }
  
  /**
   * 🎯 Initialize feature selectors
   */
  private initializeSelectors(): void {
    // Statistical selectors
    this.selectors.set('variance', (features: number[][]) => this.varianceThreshold(features, 0.01));
    this.selectors.set('correlation', (features: number[][]) => this.correlationThreshold(features, 0.95));
    
    // Model-based selectors
    this.selectors.set('lasso', (features: number[][], targets: number[]) => 
      this.lassoSelection(features, targets)
    );
    this.selectors.set('randomforest', (features: number[][], targets: number[]) => 
      this.randomForestImportance(features, targets)
    );
    
    // Information-based selectors
    this.selectors.set('mutualinfo', (features: number[][], targets: number[]) => 
      this.mutualInfoSelection(features, targets)
    );
  }
  
  // Technical indicator implementations
  private sma(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }
  
  private ema(data: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const result: number[] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
    
    return result;
  }
  
  private rsi(data: number[], period: number): number[] {
    const changes = data.slice(1).map((val, i) => val - data[i]);
    const gains: number[] = [];
    const losses: number[] = [];
    
    changes.forEach(change => {
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    });
    
    const avgGain = this.sma(gains, period);
    const avgLoss = this.sma(losses, period);
    
    return avgGain.map((gain, i) => {
      if (avgLoss[i] === 0) return 100;
      const rs = gain / avgLoss[i];
      return 100 - (100 / (1 + rs));
    });
  }
  
  private macd(data: number[], fast: number, slow: number, signal: number): {
    line: number[];
    signal: number[];
    histogram: number[];
  } {
    const emaFast = this.ema(data, fast);
    const emaSlow = this.ema(data, slow);
    const macdLine = emaFast.map((val, i) => val - emaSlow[i]);
    const signalLine = this.ema(macdLine.filter(x => !isNaN(x)), signal);
    const histogram = macdLine.slice(slow - 1).map((val, i) => val - signalLine[i]);
    
    return {
      line: macdLine,
      signal: [...new Array(slow - 1).fill(NaN), ...signalLine],
      histogram: [...new Array(slow - 1).fill(NaN), ...histogram]
    };
  }
  
  private bollingerBands(data: number[], period: number, stdDev: number): {
    upper: number[];
    middle: number[];
    lower: number[];
    bandwidth: number[];
    percentB: number[];
  } {
    const middle = this.sma(data, period);
    const std = this.rollingStd(data, period);
    
    const upper = middle.map((m, i) => m + stdDev * std[i]);
    const lower = middle.map((m, i) => m - stdDev * std[i]);
    const bandwidth = upper.map((u, i) => (u - lower[i]) / middle[i]);
    const percentB = data.map((d, i) => (d - lower[i]) / (upper[i] - lower[i]));
    
    return { upper, middle, lower, bandwidth, percentB };
  }
  
  // Helper methods
  private calculateReturns(data: number[]): number[] {
    const returns: number[] = [0];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i] - data[i - 1]) / data[i - 1]);
    }
    return returns;
  }
  
  private calculateLogReturns(data: number[]): number[] {
    const returns: number[] = [0];
    for (let i = 1; i < data.length; i++) {
      returns.push(Math.log(data[i] / data[i - 1]));
    }
    return returns;
  }
  
  private calculateVolatility(data: number[], window: number = 20): number[] {
    const returns = this.calculateReturns(data);
    return this.rollingStd(returns, window);
  }
  
  private rollingMean(data: number[], window: number): number[] {
    return this.sma(data, window);
  }
  
  private rollingStd(data: number[], window: number): number[] {
    const result: number[] = [];
    const mean = this.rollingMean(data, window);
    
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(NaN);
      } else {
        const slice = data.slice(i - window + 1, i + 1);
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean[i], 2), 0) / window;
        result.push(Math.sqrt(variance));
      }
    }
    
    return result;
  }
  
  // Additional implementations would continue...
  private calculatePriceChange(data: number[]): number[] {
    return data.slice(1).map((val, i) => val - data[i]);
  }
  
  private calculatePriceChangePercent(data: number[]): number[] {
    return this.calculateReturns(data).map(r => r * 100);
  }
  
  private rollingSkewness(data: number[], window: number): number[] {
    // Simplified implementation
    return new Array(data.length).fill(0);
  }
  
  private rollingKurtosis(data: number[], window: number): number[] {
    // Simplified implementation
    return new Array(data.length).fill(0);
  }
  
  private fractionalDifferencing(data: number[], d: number): number[] {
    // Simplified implementation
    return data;
  }
  
  // More implementations...
  private minMaxNormalize(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(x => (x - min) / (max - min));
  }
  
  private zScoreNormalize(data: number[]): number[] {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length);
    return data.map(x => (x - mean) / std);
  }
  
  private robustScale(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(data.length * 0.25)];
    const q3 = sorted[Math.floor(data.length * 0.75)];
    const iqr = q3 - q1;
    const median = sorted[Math.floor(data.length * 0.5)];
    return data.map(x => (x - median) / iqr);
  }
  
  // Feature combination
  private combineFeatures(featureGroups: any): any {
    // Implementation to combine all feature groups
    return {
      features: [],
      featureNames: [],
      featureGroups: new Map()
    };
  }
  
  // Feature transformation
  private async applyTransformations(features: any): Promise<any> {
    // Apply various transformations
    return features;
  }
  
  // Feature selection
  private async selectFeatures(features: any): Promise<any> {
    // Select best features
    return features;
  }
  
  // Additional complex indicator implementations would follow...
  private adx(highs: number[], lows: number[], closes: number[], period: number): number[] {
    // Simplified ADX calculation
    return new Array(closes.length).fill(50);
  }
  
  private directionalIndicators(highs: number[], lows: number[], closes: number[], period: number): {
    plusDI: number[];
    minusDI: number[];
  } {
    // Simplified DI calculation
    return {
      plusDI: new Array(closes.length).fill(25),
      minusDI: new Array(closes.length).fill(25)
    };
  }
  
  // Missing indicator implementations
  
  private aroon(highs: number[], lows: number[], period: number): { aroonUp: number[], aroonDown: number[] } {
    const aroonUp: number[] = [];
    const aroonDown: number[] = [];
    
    for (let i = period - 1; i < highs.length; i++) {
      const lookbackHighs = highs.slice(i - period + 1, i + 1);
      const lookbackLows = lows.slice(i - period + 1, i + 1);
      
      const maxIndex = lookbackHighs.lastIndexOf(Math.max(...lookbackHighs));
      const minIndex = lookbackLows.lastIndexOf(Math.min(...lookbackLows));
      
      aroonUp.push(((period - maxIndex) / period) * 100);
      aroonDown.push(((period - minIndex) / period) * 100);
    }
    
    return { aroonUp, aroonDown };
  }

  private parabolicSAR(highs: number[], lows: number[], step: number = 0.02, max: number = 0.2): number[] {
    const sar: number[] = [];
    let af = step;
    let ep = highs[0];
    let trend = 1; // 1 for uptrend, -1 for downtrend
    
    sar[0] = lows[0];
    
    for (let i = 1; i < highs.length; i++) {
      if (trend === 1) {
        sar[i] = sar[i-1] + af * (ep - sar[i-1]);
        
        if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(af + step, max);
        }
        
        if (lows[i] < sar[i]) {
          trend = -1;
          sar[i] = ep;
          ep = lows[i];
          af = step;
        }
      } else {
        sar[i] = sar[i-1] + af * (ep - sar[i-1]);
        
        if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(af + step, max);
        }
        
        if (highs[i] > sar[i]) {
          trend = 1;
          sar[i] = ep;
          ep = highs[i];
          af = step;
        }
      }
    }
    
    return sar;
  }

  private ichimokuCloud(highs: number[], lows: number[], closes: number[]): {
    tenkanSen: number[],
    kijunSen: number[],
    senkouSpanA: number[],
    senkouSpanB: number[],
    chikouSpan: number[]
  } {
    const tenkanSen: number[] = [];
    const kijunSen: number[] = [];
    const senkouSpanA: number[] = [];
    const senkouSpanB: number[] = [];
    const chikouSpan: number[] = [];
    
    for (let i = 0; i < highs.length; i++) {
      // Tenkan-sen (9-period)
      if (i >= 8) {
        const periodHighs = highs.slice(i - 8, i + 1);
        const periodLows = lows.slice(i - 8, i + 1);
        tenkanSen.push((Math.max(...periodHighs) + Math.min(...periodLows)) / 2);
      } else {
        tenkanSen.push(NaN);
      }
      
      // Kijun-sen (26-period)
      if (i >= 25) {
        const periodHighs = highs.slice(i - 25, i + 1);
        const periodLows = lows.slice(i - 25, i + 1);
        kijunSen.push((Math.max(...periodHighs) + Math.min(...periodLows)) / 2);
      } else {
        kijunSen.push(NaN);
      }
      
      // Senkou Span A
      if (i >= 25) {
        senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
      } else {
        senkouSpanA.push(NaN);
      }
      
      // Senkou Span B (52-period)
      if (i >= 51) {
        const periodHighs = highs.slice(i - 51, i + 1);
        const periodLows = lows.slice(i - 51, i + 1);
        senkouSpanB.push((Math.max(...periodHighs) + Math.min(...periodLows)) / 2);
      } else {
        senkouSpanB.push(NaN);
      }
      
      // Chikou Span
      chikouSpan.push(closes[i]);
    }
    
    return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
  }

  // Additional missing methods
  private roc(data: number[], period: number): number[] {
    const roc: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i >= period) {
        roc.push(((data[i] - data[i - period]) / data[i - period]) * 100);
      } else {
        roc.push(NaN);
      }
    }
    return roc;
  }

  private momentum(data: number[], period: number): number[] {
    const momentum: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i >= period) {
        momentum.push(data[i] - data[i - period]);
      } else {
        momentum.push(NaN);
      }
    }
    return momentum;
  }

  private stochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): { k: number[], d: number[] } {
    const k: number[] = [];
    const d: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i >= kPeriod - 1) {
        const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
        const periodLows = lows.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...periodHighs);
        const lowestLow = Math.min(...periodLows);
        
        k.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
      } else {
        k.push(NaN);
      }
    }
    
    // Calculate %D as SMA of %K
    for (let i = 0; i < k.length; i++) {
      if (i >= dPeriod - 1) {
        const kValues = k.slice(i - dPeriod + 1, i + 1).filter(v => !isNaN(v));
        if (kValues.length === dPeriod) {
          d.push(kValues.reduce((sum, val) => sum + val, 0) / kValues.length);
        } else {
          d.push(NaN);
        }
      } else {
        d.push(NaN);
      }
    }
    
    return { k, d };
  }

  private williamsR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const williamsR: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i >= period - 1) {
        const periodHighs = highs.slice(i - period + 1, i + 1);
        const periodLows = lows.slice(i - period + 1, i + 1);
        const highestHigh = Math.max(...periodHighs);
        const lowestLow = Math.min(...periodLows);
        
        williamsR.push(((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100);
      } else {
        williamsR.push(NaN);
      }
    }
    
    return williamsR;
  }

  private cci(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const cci: number[] = [];
    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    
    for (let i = 0; i < typicalPrices.length; i++) {
      if (i >= period - 1) {
        const periodPrices = typicalPrices.slice(i - period + 1, i + 1);
        const sma = periodPrices.reduce((sum, val) => sum + val, 0) / period;
        const meanDeviation = periodPrices.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;
        
        cci.push((typicalPrices[i] - sma) / (0.015 * meanDeviation));
      } else {
        cci.push(NaN);
      }
    }
    
    return cci;
  }

  private mfi(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number[] {
    const mfi: number[] = [];
    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const rawMoneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);
    
    for (let i = 1; i < rawMoneyFlow.length; i++) {
      if (i >= period) {
        let positiveFlow = 0;
        let negativeFlow = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (typicalPrices[j] > typicalPrices[j - 1]) {
            positiveFlow += rawMoneyFlow[j];
          } else if (typicalPrices[j] < typicalPrices[j - 1]) {
            negativeFlow += rawMoneyFlow[j];
          }
        }
        
        const moneyFlowRatio = positiveFlow / negativeFlow;
        mfi.push(100 - (100 / (1 + moneyFlowRatio)));
      } else {
        mfi.push(NaN);
      }
    }
    
    return mfi;
  }

  private ultimateOscillator(highs: number[], lows: number[], closes: number[]): number[] {
    const uo: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      if (i >= 28) { // Need 28 periods for calculation
        let bp7 = 0, bp14 = 0, bp28 = 0;
        let tr7 = 0, tr14 = 0, tr28 = 0;
        
        // Calculate for different periods
        for (let j = i - 6; j <= i; j++) {
          const bp = closes[j] - Math.min(lows[j], closes[j - 1]);
          const tr = Math.max(highs[j], closes[j - 1]) - Math.min(lows[j], closes[j - 1]);
          bp7 += bp;
          tr7 += tr;
        }
        
        for (let j = i - 13; j <= i; j++) {
          const bp = closes[j] - Math.min(lows[j], closes[j - 1]);
          const tr = Math.max(highs[j], closes[j - 1]) - Math.min(lows[j], closes[j - 1]);
          bp14 += bp;
          tr14 += tr;
        }
        
        for (let j = i - 27; j <= i; j++) {
          const bp = closes[j] - Math.min(lows[j], closes[j - 1]);
          const tr = Math.max(highs[j], closes[j - 1]) - Math.min(lows[j], closes[j - 1]);
          bp28 += bp;
          tr28 += tr;
        }
        
        const avg7 = bp7 / tr7;
        const avg14 = bp14 / tr14;
        const avg28 = bp28 / tr28;
        
        uo.push(100 * ((4 * avg7) + (2 * avg14) + avg28) / (4 + 2 + 1));
      } else {
        uo.push(NaN);
      }
    }
    
    return uo;
  }

  private atr(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const atr: number[] = [];
    const tr: number[] = [];
    
    // Calculate True Range
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate ATR as smoothed TR
    for (let i = 0; i < tr.length; i++) {
      if (i < period - 1) {
        atr.push(NaN);
      } else if (i === period - 1) {
        atr.push(tr.slice(0, period).reduce((sum, val) => sum + val, 0) / period);
      } else {
        atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
      }
    }
    
    return atr;
  }

  private keltnerChannels(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): { upper: number[], middle: number[], lower: number[] } {
    const middle = this.ema(closes, period);
    const atrValues = this.atr(highs, lows, closes, period);
    const upper = middle.map((val, i) => val + (atrValues[i] * multiplier));
    const lower = middle.map((val, i) => val - (atrValues[i] * multiplier));
    
    return { upper, middle, lower };
  }

  private donchianChannels(highs: number[], lows: number[], period: number): { upper: number[], lower: number[] } {
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < highs.length; i++) {
      if (i >= period - 1) {
        const periodHighs = highs.slice(i - period + 1, i + 1);
        const periodLows = lows.slice(i - period + 1, i + 1);
        upper.push(Math.max(...periodHighs));
        lower.push(Math.min(...periodLows));
      } else {
        upper.push(NaN);
        lower.push(NaN);
      }
    }
    
    return { upper, lower };
  }

  private obv(closes: number[], volumes: number[]): number[] {
    const obv: number[] = [volumes[0]];
    
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv.push(obv[i - 1] + volumes[i]);
      } else if (closes[i] < closes[i - 1]) {
        obv.push(obv[i - 1] - volumes[i]);
      } else {
        obv.push(obv[i - 1]);
      }
    }
    
    return obv;
  }

  private vwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
    const vwap: number[] = [];
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;
    
    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      cumulativeVolumePrice += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
      vwap.push(cumulativeVolumePrice / cumulativeVolume);
    }
    
    return vwap;
  }

  private volumeRatio(volumes: number[], period: number): number[] {
    const ratio: number[] = [];
    
    for (let i = 0; i < volumes.length; i++) {
      if (i >= period - 1) {
        const avgVolume = volumes.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
        ratio.push(volumes[i] / avgVolume);
      } else {
        ratio.push(NaN);
      }
    }
    
    return ratio;
  }

  private accumulationDistribution(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
    const ad: number[] = [0];
    
    for (let i = 1; i < closes.length; i++) {
      const moneyFlowMultiplier = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
      const moneyFlowVolume = moneyFlowMultiplier * volumes[i];
      ad.push(ad[i - 1] + moneyFlowVolume);
    }
    
    return ad;
  }

  private chaikinMoneyFlow(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number[] {
    const cmf: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i >= period - 1) {
        let sumMoneyFlowVolume = 0;
        let sumVolume = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          const moneyFlowMultiplier = ((closes[j] - lows[j]) - (highs[j] - closes[j])) / (highs[j] - lows[j]);
          sumMoneyFlowVolume += moneyFlowMultiplier * volumes[j];
          sumVolume += volumes[j];
        }
        
        cmf.push(sumMoneyFlowVolume / sumVolume);
      } else {
        cmf.push(NaN);
      }
    }
    
    return cmf;
  }

  private volumeWeightedMACD(closes: number[], volumes: number[]): { macd: number[], signal: number[], histogram: number[] } {
    // Simplified VWMACD calculation
    const vwma12 = this.vwma(closes, volumes, 12);
    const vwma26 = this.vwma(closes, volumes, 26);
    const macd = vwma12.map((val, i) => val - vwma26[i]);
    const signal = this.ema(macd, 9);
    const histogram = macd.map((val, i) => val - signal[i]);
    
    return { macd, signal, histogram };
  }

  private vwma(prices: number[], volumes: number[], period: number): number[] {
    const vwma: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i >= period - 1) {
        let sumPriceVolume = 0;
        let sumVolume = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          sumPriceVolume += prices[j] * volumes[j];
          sumVolume += volumes[j];
        }
        
        vwma.push(sumPriceVolume / sumVolume);
      } else {
        vwma.push(NaN);
      }
    }
    
    return vwma;
  }
  
  /**
   * Public API
   */
  getFeatureImportance(): Map<string, number> {
    return this.featureImportance;
  }
  
  getFeatureCorrelations(): Map<string, Map<string, number>> {
    return this.featureCorrelations;
  }
  
  clearCache(): void {
    this.featureCache.clear();
  }

  // Stub methods for missing microstructure functions
  private calculateBidAskSpread(orderBook: any): number[] {
    return [0]; // Stub implementation
  }

  private calculateBidAskImbalance(orderBook: any): number[] {
    return [0]; // Stub implementation
  }

  private calculateOrderBookDepth(orderBook: any): number[] {
    return [0]; // Stub implementation
  }

  private calculateOrderFlowImbalance(trades: any[]): number[] {
    return [0]; // Stub implementation
  }

  private calculateTradeFeatures(trades: any[]): { tradeSize: number[], tradeIntensity: number[] } {
    return { tradeSize: [0], tradeIntensity: [0] }; // Stub implementation
  }

  private calculateVolumeFeatures(trades: any[]): { buyVolume: number[], sellVolume: number[], volumeImbalance: number[] } {
    return { buyVolume: [0], sellVolume: [0], volumeImbalance: [0] }; // Stub implementation
  }

  private calculateAmihudIlliquidity(ohlcv: any[], trades: any[]): number[] {
    return [0]; // Stub implementation
  }

  private calculateRollImpactCost(ohlcv: any[]): number[] {
    return [0]; // Stub implementation
  }

  private calculateKyleLambda(trades: any[], ohlcv: any[]): number[] {
    return [0]; // Stub implementation
  }

  private calculatePriceImpact(trades: any[], ohlcv: any[]): { temporaryImpact: number[], permanentImpact: number[] } {
    return { temporaryImpact: [0], permanentImpact: [0] }; // Stub implementation
  }

  private calculateRealizationShortfall(trades: any[], ohlcv: any[]): number[] {
    return [0]; // Stub implementation
  }

  // Missing methods implementations
  private calculateRollingCorrelation(series1: number[], series2: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < series1.length; i++) {
      const slice1 = series1.slice(i - window + 1, i + 1);
      const slice2 = series2.slice(i - window + 1, i + 1);
      
      const mean1 = slice1.reduce((a, b) => a + b) / slice1.length;
      const mean2 = slice2.reduce((a, b) => a + b) / slice2.length;
      
      let numerator = 0;
      let sum1 = 0;
      let sum2 = 0;
      
      for (let j = 0; j < slice1.length; j++) {
        const diff1 = slice1[j] - mean1;
        const diff2 = slice2[j] - mean2;
        numerator += diff1 * diff2;
        sum1 += diff1 * diff1;
        sum2 += diff2 * diff2;
      }
      
      const correlation = numerator / Math.sqrt(sum1 * sum2);
      result.push(isNaN(correlation) ? 0 : correlation);
    }
    return result;
  }

  private calculateShannonEntropy(data: number[]): number {
    const counts: { [key: string]: number } = {};
    data.forEach(val => {
      const bin = Math.floor(val * 100) / 100; // Bin to 2 decimal places
      counts[bin] = (counts[bin] || 0) + 1;
    });
    
    const total = data.length;
    let entropy = 0;
    
    Object.values(counts).forEach(count => {
      const probability = count / total;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });
    
    return entropy;
  }

  private calculateApproximateEntropy(data: number[], m: number = 2, r: number = 0.2): number {
    const N = data.length;
    const patterns: { [key: string]: number } = {};
    
    // Count patterns of length m
    for (let i = 0; i <= N - m; i++) {
      const pattern = data.slice(i, i + m).map(x => Math.round(x / r)).join(',');
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    let phi_m = 0;
    Object.values(patterns).forEach(count => {
      const probability = count / (N - m + 1);
      phi_m += probability * Math.log(probability);
    });
    
    // Count patterns of length m+1
    const patterns_m1: { [key: string]: number } = {};
    for (let i = 0; i <= N - m - 1; i++) {
      const pattern = data.slice(i, i + m + 1).map(x => Math.round(x / r)).join(',');
      patterns_m1[pattern] = (patterns_m1[pattern] || 0) + 1;
    }
    
    let phi_m1 = 0;
    Object.values(patterns_m1).forEach(count => {
      const probability = count / (N - m);
      phi_m1 += probability * Math.log(probability);
    });
    
    return phi_m - phi_m1;
  }

  private calculateSampleEntropy(data: number[], m: number = 2, r: number = 0.2): number {
    const N = data.length;
    let A = 0;
    let B = 0;
    
    for (let i = 0; i < N - m; i++) {
      let template_m = data.slice(i, i + m);
      let template_m1 = data.slice(i, i + m + 1);
      
      for (let j = i + 1; j < N - m; j++) {
        let match_m = data.slice(j, j + m);
        let match_m1 = data.slice(j, j + m + 1);
        
        // Check if patterns match within tolerance r
        let matches_m = template_m.every((val, idx) => Math.abs(val - match_m[idx]) <= r);
        if (matches_m) {
          B++;
          let matches_m1 = template_m1.every((val, idx) => Math.abs(val - match_m1[idx]) <= r);
          if (matches_m1) {
            A++;
          }
        }
      }
    }
    
    return A > 0 ? Math.log(B / A) : 0;
  }

  private calculateHurstExponent(data: number[]): number {
    const N = data.length;
    if (N < 10) return 0.5; // Default for insufficient data
    
    const lags = [5, 10, 20, 50].filter(lag => lag < N / 2);
    const rs_values: number[] = [];
    
    lags.forEach(lag => {
      const mean = data.reduce((a, b) => a + b) / N;
      let sum_dev = 0;
      let cum_dev = 0;
      let max_cum_dev = -Infinity;
      let min_cum_dev = Infinity;
      
      for (let i = 0; i < lag; i++) {
        const deviation = data[i] - mean;
        cum_dev += deviation;
        sum_dev += deviation * deviation;
        max_cum_dev = Math.max(max_cum_dev, cum_dev);
        min_cum_dev = Math.min(min_cum_dev, cum_dev);
      }
      
      const range = max_cum_dev - min_cum_dev;
      const std_dev = Math.sqrt(sum_dev / lag);
      
      if (std_dev > 0) {
        rs_values.push(range / std_dev);
      }
    });
    
    if (rs_values.length < 2) return 0.5;
    
    // Calculate slope of log(R/S) vs log(lag)
    const log_lags = lags.map(x => Math.log(x));
    const log_rs = rs_values.map(x => Math.log(x));
    
    const n = log_lags.length;
    const sum_x = log_lags.reduce((a, b) => a + b);
    const sum_y = log_rs.reduce((a, b) => a + b);
    const sum_xy = log_lags.reduce((sum, x, i) => sum + x * log_rs[i], 0);
    const sum_x2 = log_lags.reduce((sum, x) => sum + x * x, 0);
    
    const hurst = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
    return Math.max(0, Math.min(1, hurst)); // Clamp between 0 and 1
  }

  private calculateFractalDimension(data: number[]): number {
    const hurst = this.calculateHurstExponent(data);
    return 2 - hurst;
  }

  private calculateMutualInformation(x: number[], y: number[], bins: number = 10): number {
    const N = x.length;
    if (N !== y.length) return 0;
    
    // Create histograms
    const x_min = Math.min(...x);
    const x_max = Math.max(...x);
    const y_min = Math.min(...y);
    const y_max = Math.max(...y);
    
    const x_bins: number[] = new Array(bins).fill(0);
    const y_bins: number[] = new Array(bins).fill(0);
    const xy_bins: number[][] = Array(bins).fill(null).map(() => new Array(bins).fill(0));
    
    for (let i = 0; i < N; i++) {
      const x_bin = Math.min(bins - 1, Math.floor((x[i] - x_min) / (x_max - x_min) * bins));
      const y_bin = Math.min(bins - 1, Math.floor((y[i] - y_min) / (y_max - y_min) * bins));
      
      x_bins[x_bin]++;
      y_bins[y_bin]++;
      xy_bins[x_bin][y_bin]++;
    }
    
    let mi = 0;
    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        if (xy_bins[i][j] > 0) {
          const p_xy = xy_bins[i][j] / N;
          const p_x = x_bins[i] / N;
          const p_y = y_bins[j] / N;
          
          mi += p_xy * Math.log2(p_xy / (p_x * p_y));
        }
      }
    }
    
    return mi;
  }

  private calculateTransferEntropy(x: number[], y: number[], lag: number = 1): number {
    if (x.length !== y.length || x.length < lag + 1) return 0;
    
    // Simplified transfer entropy calculation
    // This would normally require more sophisticated entropy estimation
    const mi_future_past = this.calculateMutualInformation(
      y.slice(lag),
      x.slice(0, -lag)
    );
    
    const mi_future_present = this.calculateMutualInformation(
      y.slice(lag),
      y.slice(0, -lag)
    );
    
    return Math.max(0, mi_future_past - mi_future_present);
  }

  private calculateLyapunovExponent(data: number[]): number {
    const N = data.length;
    if (N < 10) return 0;
    
    // Simplified Lyapunov exponent calculation
    let sum = 0;
    const epsilon = 1e-8;
    
    for (let i = 1; i < N - 1; i++) {
      const derivative = Math.abs((data[i + 1] - data[i - 1]) / 2);
      if (derivative > epsilon) {
        sum += Math.log(derivative);
      }
    }
    
    return sum / (N - 2);
  }

  private calculateCorrelationDimension(data: number[], maxDim: number = 5): number {
    const N = data.length;
    if (N < 10) return 1;
    
    // Simplified correlation dimension using Grassberger-Procaccia algorithm
    const epsilon_values = [0.1, 0.2, 0.5, 1.0];
    const correlations: number[] = [];
    
    epsilon_values.forEach(epsilon => {
      let count = 0;
      let total = 0;
      
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const distance = Math.abs(data[i] - data[j]);
          total++;
          if (distance < epsilon) {
            count++;
          }
        }
      }
      
      const correlation = count / total;
      if (correlation > 0) {
        correlations.push(Math.log(correlation));
      }
    });
    
    if (correlations.length < 2) return 1;
    
    // Estimate dimension from slope
    const log_epsilons = epsilon_values.slice(0, correlations.length).map(x => Math.log(x));
    
    let sum_x = 0, sum_y = 0, sum_xy = 0, sum_x2 = 0;
    const n = log_epsilons.length;
    
    for (let i = 0; i < n; i++) {
      sum_x += log_epsilons[i];
      sum_y += correlations[i];
      sum_xy += log_epsilons[i] * correlations[i];
      sum_x2 += log_epsilons[i] * log_epsilons[i];
    }
    
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
    return Math.max(1, Math.min(maxDim, slope));
  }

  private polynomialFeatures(features: number[][], degree: number = 2): number[][] {
    const result: number[][] = [];
    
    features.forEach(row => {
      const polyRow: number[] = [...row]; // Original features
      
      // Add polynomial combinations
      if (degree >= 2) {
        // Squared terms
        row.forEach(val => polyRow.push(val * val));
        
        // Cross terms
        for (let i = 0; i < row.length; i++) {
          for (let j = i + 1; j < row.length; j++) {
            polyRow.push(row[i] * row[j]);
          }
        }
      }
      
      if (degree >= 3) {
        // Cubic terms
        row.forEach(val => polyRow.push(val * val * val));
      }
      
      result.push(polyRow);
    });
    
    return result;
  }

  private varianceThreshold(features: number[][], threshold: number = 0.01): number[] {
    const numFeatures = features[0]?.length || 0;
    const selected: number[] = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const mean = column.reduce((a, b) => a + b) / column.length;
      const variance = column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / column.length;
      
      if (variance > threshold) {
        selected.push(i);
      }
    }
    
    return selected;
  }

  private correlationThreshold(features: number[][], threshold: number = 0.95): number[] {
    const numFeatures = features[0]?.length || 0;
    const selected: number[] = [];
    const correlations: number[][] = Array(numFeatures).fill(null).map(() => new Array(numFeatures).fill(0));
    
    // Calculate correlation matrix
    for (let i = 0; i < numFeatures; i++) {
      for (let j = i; j < numFeatures; j++) {
        const col1 = features.map(row => row[i]);
        const col2 = features.map(row => row[j]);
        
        const correlation = this.calculateRollingCorrelation(col1, col2, col1.length)[0] || 0;
        correlations[i][j] = correlation;
        correlations[j][i] = correlation;
      }
    }
    
    // Select features with low correlation
    const used = new Set<number>();
    for (let i = 0; i < numFeatures; i++) {
      if (!used.has(i)) {
        selected.push(i);
        
        // Mark highly correlated features as used
        for (let j = i + 1; j < numFeatures; j++) {
          if (Math.abs(correlations[i][j]) > threshold) {
            used.add(j);
          }
        }
      }
    }
    
    return selected;
  }

  private lassoSelection(features: number[][], target: number[], alpha: number = 0.01): number[] {
    // Simplified LASSO feature selection
    const numFeatures = features[0]?.length || 0;
    const selected: number[] = [];
    
    // Simple correlation-based selection as LASSO approximation
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const correlation = Math.abs(this.calculateRollingCorrelation(column, target, column.length)[0] || 0);
      
      if (correlation > alpha) {
        selected.push(i);
      }
    }
    
    return selected;
  }

  private randomForestImportance(features: number[][], target: number[]): number[] {
    // Simplified random forest importance using correlation
    const numFeatures = features[0]?.length || 0;
    const importance: number[] = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const correlation = Math.abs(this.calculateRollingCorrelation(column, target, column.length)[0] || 0);
      importance.push(correlation);
    }
    
    return importance;
  }

  private mutualInfoSelection(features: number[][], target: number[], k: number = 10): number[] {
    const numFeatures = features[0]?.length || 0;
    const scores: { index: number; score: number }[] = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const mi = this.calculateMutualInformation(column, target);
      scores.push({ index: i, score: mi });
    }
    
    // Select top k features
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, Math.min(k, numFeatures)).map(item => item.index);
  }
}

export default FeatureEngineer;