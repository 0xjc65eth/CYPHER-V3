/**
 * 📊 BACKTESTING ENGINE v3.0
 * Advanced Walk-Forward Optimization and Strategy Testing
 * 
 * RESEARCH-BASED:
 * - "Walk-Forward Analysis" (Pardo, 2008)
 * - "Advances in Financial Machine Learning" (López de Prado, 2018)
 * - "Evidence-Based Technical Analysis" (Aronson, 2006)
 * - "Quantitative Trading" (Chan, 2009)
 */

import { EventEmitter } from 'events';

// Lazy load TensorFlow to avoid bundle bloat
let _tf: any = null;
async function getTf() {
  if (!_tf) {
    try { _tf = await import('@tensorflow/tfjs-node'); }
    catch { try { _tf = require('@tensorflow/tfjs'); } catch { _tf = null; } }
  }
  return _tf;
}

// Backtesting Types
export interface BacktestConfig {
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  
  // Walk-forward settings
  walkForward: {
    enabled: boolean;
    inSampleRatio: number; // e.g., 0.7 for 70% in-sample
    outSampleRatio: number; // e.g., 0.3 for 30% out-sample
    windowSize: number; // Days for each window
    stepSize: number; // Days to step forward
    anchored: boolean; // Anchored vs rolling window
  };
  
  // Trading constraints
  constraints: {
    maxPositionSize: number; // As percentage of portfolio
    maxLeverage: number;
    minTradeSize: number;
    maxOpenPositions: number;
    stopLoss?: number; // Default stop loss percentage
    takeProfit?: number; // Default take profit percentage
    trailingStop?: number; // Trailing stop percentage
  };
  
  // Cost model
  costs: {
    commission: number; // Per trade percentage
    slippage: number; // Expected slippage percentage
    spread: number; // Bid-ask spread
    borrowingCost: number; // For short positions (annual rate)
    fundingRate?: number; // For perpetual contracts
  };
  
  // Risk management
  riskManagement: {
    maxDrawdown: number; // Maximum allowed drawdown
    varLimit: number; // Value at Risk limit
    kellyFraction: number; // Kelly criterion fraction
    riskPerTrade: number; // Risk per trade as % of capital
    correlationLimit: number; // Max correlation between positions
  };
  
  // Monte Carlo settings
  monteCarlo: {
    enabled: boolean;
    simulations: number;
    confidenceLevel: number;
    randomSeed?: number;
  };
}

export interface Trade {
  id: string;
  timestamp: Date;
  asset: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryTime: Date;
  exitTime?: Date;
  commission: number;
  slippage: number;
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number;
  mae: number; // Maximum Adverse Excursion
  mfe: number; // Maximum Favorable Excursion
  exitReason?: string;
}

export interface BacktestResults {
  // Performance metrics
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    maxDrawdownDuration: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    payoffRatio: number;
    recoveryFactor: number;
    ulcerIndex: number;
    serenityRatio: number;
  };
  
  // Risk metrics
  risk: {
    var95: number; // 95% Value at Risk
    cvar95: number; // Conditional VaR
    downstreamDeviation: number;
    beta: number;
    alpha: number;
    treynorRatio: number;
    informationRatio: number;
    trackingError: number;
    omega: number;
    kappa: number;
  };
  
  // Trade statistics
  tradeStats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgTradesPerDay: number;
    avgHoldingPeriod: number;
    longestWinStreak: number;
    longestLossStreak: number;
    largestWin: number;
    largestLoss: number;
    avgMAE: number;
    avgMFE: number;
    edgeRatio: number;
  };
  
  // Walk-forward analysis
  walkForward?: {
    windows: Array<{
      inSamplePeriod: { start: Date; end: Date };
      outSamplePeriod: { start: Date; end: Date };
      inSamplePerformance: any;
      outSamplePerformance: any;
      efficiency: number; // Out-sample vs in-sample performance
      parameters: any; // Optimized parameters for this window
    }>;
    avgEfficiency: number;
    stability: number;
    robustness: number;
  };
  
  // Monte Carlo results
  monteCarlo?: {
    percentiles: { [key: string]: number };
    confidenceIntervals: {
      returns: { lower: number; upper: number };
      drawdown: { lower: number; upper: number };
      sharpe: { lower: number; upper: number };
    };
    probabilityOfRuin: number;
    expectedMaxDrawdown: number;
  };
  
  // Equity curve
  equityCurve: Array<{
    timestamp: Date;
    equity: number;
    drawdown: number;
    returns: number;
    positions: number;
  }>;
  
  // All trades
  trades: Trade[];
  
  // Period analysis
  periodAnalysis: {
    daily: { [date: string]: number };
    weekly: { [week: string]: number };
    monthly: { [month: string]: number };
    yearly: { [year: string]: number };
  };
}

/**
 * 🔬 Backtesting Engine Implementation
 */
export class BacktestingEngine extends EventEmitter {
  private config: BacktestConfig;
  private marketData: Map<string, any[]> = new Map();
  private trades: Trade[] = [];
  private equity: number[];
  private positions: Map<string, any> = new Map();
  private currentCapital: number;
  private peakEquity: number;
  private drawdownStart?: Date;
  
  constructor(config: BacktestConfig) {
    super();
    this.config = config;
    this.currentCapital = config.initialCapital;
    this.peakEquity = config.initialCapital;
    this.equity = [config.initialCapital];
  }
  
  /**
   * 🚀 Run complete backtest with walk-forward optimization
   */
  async runBacktest(
    strategy: any,
    marketData: Map<string, any[]>,
    signals?: any[]
  ): Promise<BacktestResults> {
    try {
      this.emit('backtest_started', { 
        startDate: this.config.startDate,
        endDate: this.config.endDate,
        walkForward: this.config.walkForward.enabled
      });
      
      this.marketData = marketData;
      
      let results: BacktestResults;
      
      if (this.config.walkForward.enabled) {
        results = await this.runWalkForwardBacktest(strategy, marketData);
      } else {
        results = await this.runSimpleBacktest(strategy, marketData, signals);
      }
      
      // Run Monte Carlo simulation if enabled
      if (this.config.monteCarlo.enabled) {
        results.monteCarlo = await this.runMonteCarloSimulation(results);
      }
      
      // Calculate additional metrics
      this.calculateAdditionalMetrics(results);
      
      this.emit('backtest_completed', { results });
      
      return results;
      
    } catch (error) {
      this.emit('backtest_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  /**
   * 📈 Simple backtest without walk-forward
   */
  private async runSimpleBacktest(
    strategy: any,
    marketData: Map<string, any[]>,
    signals?: any[]
  ): Promise<BacktestResults> {
    // Reset state
    this.resetState();
    
    // Get time series
    const timestamps = this.getTimestamps(marketData);
    const equityCurve: any[] = [];
    
    // Process each timestamp
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const currentData = this.getDataAtTimestamp(marketData, timestamp);
      
      // Update open positions
      this.updatePositions(currentData, timestamp);
      
      // Generate or use provided signals
      let signal;
      if (signals && signals[i]) {
        signal = signals[i];
      } else {
        signal = await strategy.generateSignal(currentData, this.positions, this.currentCapital);
      }
      
      // Execute trades based on signal
      if (signal && this.shouldExecuteTrade(signal)) {
        await this.executeTrade(signal, currentData, timestamp);
      }
      
      // Apply risk management
      this.applyRiskManagement(currentData, timestamp);
      
      // Update equity curve
      const equity = this.calculateEquity(currentData);
      this.equity.push(equity);
      
      equityCurve.push({
        timestamp,
        equity,
        drawdown: this.calculateDrawdown(equity),
        returns: this.calculateReturns(equity, this.equity[this.equity.length - 2]),
        positions: this.positions.size
      });
      
      // Emit progress
      if (i % 100 === 0) {
        this.emit('backtest_progress', {
          progress: (i / timestamps.length) * 100,
          currentEquity: equity,
          trades: this.trades.length
        });
      }
    }
    
    // Close all remaining positions
    await this.closeAllPositions(timestamps[timestamps.length - 1]);
    
    // Calculate results
    return this.calculateResults(equityCurve);
  }
  
  /**
   * 🔄 Walk-forward optimization backtest
   */
  private async runWalkForwardBacktest(
    strategy: any,
    marketData: Map<string, any[]>
  ): Promise<BacktestResults> {
    const windows: any[] = [];
    const timestamps = this.getTimestamps(marketData);
    const totalDays = Math.floor((this.config.endDate.getTime() - this.config.startDate.getTime()) / 86400000);
    
    let currentStart = 0;
    const windowSize = this.config.walkForward.windowSize;
    const stepSize = this.config.walkForward.stepSize;
    const inSampleSize = Math.floor(windowSize * this.config.walkForward.inSampleRatio);
    
    while (currentStart + windowSize <= timestamps.length) {
      // Define in-sample and out-sample periods
      const inSampleStart = this.config.walkForward.anchored ? 0 : currentStart;
      const inSampleEnd = currentStart + inSampleSize;
      const outSampleStart = inSampleEnd;
      const outSampleEnd = Math.min(currentStart + windowSize, timestamps.length);
      
      // Optimize on in-sample data
      const inSampleData = this.sliceMarketData(marketData, timestamps[inSampleStart], timestamps[inSampleEnd - 1]);
      const optimizedParams = await this.optimizeStrategy(strategy, inSampleData);
      
      // Test on out-sample data
      strategy.setParameters(optimizedParams);
      
      // Run backtest on in-sample
      const inSampleResults = await this.runPeriodBacktest(
        strategy,
        inSampleData
      );
      
      // Run backtest on out-sample
      const outSampleData = this.sliceMarketData(marketData, timestamps[outSampleStart], timestamps[outSampleEnd - 1]);
      const outSampleResults = await this.runPeriodBacktest(
        strategy,
        outSampleData
      );
      
      // Calculate efficiency
      const efficiency = this.calculateEfficiency();
      
      windows.push({
        inSamplePeriod: {
          start: timestamps[inSampleStart],
          end: timestamps[inSampleEnd - 1]
        },
        outSamplePeriod: {
          start: timestamps[outSampleStart],
          end: timestamps[outSampleEnd - 1]
        },
        inSamplePerformance: inSampleResults,
        outSamplePerformance: outSampleResults,
        efficiency,
        parameters: optimizedParams
      });
      
      // Move to next window
      currentStart += stepSize;
      
      this.emit('walkforward_window_complete', {
        window: windows.length,
        efficiency,
        progress: (currentStart / timestamps.length) * 100
      });
    }
    
    // Combine all results
    return this.combineWalkForwardResults(windows);
  }
  
  /**
   * 🎲 Monte Carlo simulation
   */
  private async runMonteCarloSimulation(
    originalResults: BacktestResults
  ): Promise<any> {
    const simulations = this.config.monteCarlo.simulations;
    const returns = this.calculateDailyReturns();
    const results = {
      returns: [] as number[],
      maxDrawdowns: [] as number[],
      sharpeRatios: [] as number[]
    };
    
    // Set random seed if provided
    if (this.config.monteCarlo.randomSeed) {
      // Seed random number generator
    }
    
    for (let sim = 0; sim < simulations; sim++) {
      // Randomly resample returns with replacement
      const resampledReturns = this.bootstrapReturns(returns);
      
      // Calculate equity curve from resampled returns
      const equityCurve = this.returnsToEquityCurve(resampledReturns, this.config.initialCapital);
      
      // Calculate metrics
      const totalReturn = (equityCurve[equityCurve.length - 1] - equityCurve[0]) / equityCurve[0];
      const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
      const sharpe = this.calculateSharpeRatio(resampledReturns);
      
      results.returns.push(totalReturn);
      results.maxDrawdowns.push(maxDrawdown);
      results.sharpeRatios.push(sharpe);
      
      if (sim % 100 === 0) {
        this.emit('montecarlo_progress', {
          progress: (sim / simulations) * 100
        });
      }
    }
    
    // Calculate statistics
    const confidenceLevel = this.config.monteCarlo.confidenceLevel;
    const lowerPercentile = (1 - confidenceLevel) / 2;
    const upperPercentile = 1 - lowerPercentile;
    
    return {
      percentiles: {
        '5%': this.percentile(results.returns, 0.05),
        '25%': this.percentile(results.returns, 0.25),
        '50%': this.percentile(results.returns, 0.50),
        '75%': this.percentile(results.returns, 0.75),
        '95%': this.percentile(results.returns, 0.95)
      },
      confidenceIntervals: {
        returns: {
          lower: this.percentile(results.returns, lowerPercentile),
          upper: this.percentile(results.returns, upperPercentile)
        },
        drawdown: {
          lower: this.percentile(results.maxDrawdowns, lowerPercentile),
          upper: this.percentile(results.maxDrawdowns, upperPercentile)
        },
        sharpe: {
          lower: this.percentile(results.sharpeRatios, lowerPercentile),
          upper: this.percentile(results.sharpeRatios, upperPercentile)
        }
      },
      probabilityOfRuin: this.calculateProbabilityOfRuin(),
      expectedMaxDrawdown: this.mean(results.maxDrawdowns)
    };
  }
  
  /**
   * 💼 Execute trade
   */
  private async executeTrade(
    signal: any,
    marketData: any,
    timestamp: Date
  ): Promise<void> {
    // Calculate position size
    const positionSize = this.calculatePositionSize(signal, marketData);
    
    // Calculate costs
    const commission = positionSize * this.config.costs.commission;
    const slippage = positionSize * this.config.costs.slippage * marketData.price;
    
    // Create trade
    const trade: Trade = {
      id: `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      asset: signal.asset,
      side: signal.action === 'BUY' ? 'long' : 'short',
      entryPrice: marketData.price + (signal.action === 'BUY' ? slippage : -slippage),
      quantity: positionSize / marketData.price,
      entryTime: timestamp,
      commission,
      slippage,
      mae: 0,
      mfe: 0
    };
    
    // Update capital
    this.currentCapital -= positionSize + commission;
    
    // Add to positions
    this.positions.set(trade.id, trade);
    
    // Add to trades
    this.trades.push(trade);
    
    this.emit('trade_executed', { trade });
  }
  
  /**
   * 📊 Calculate position size using Kelly Criterion
   */
  private calculatePositionSize(signal: any, marketData: any): number {
    const availableCapital = this.currentCapital * (1 - this.getUsedMargin());
    const maxPosition = availableCapital * this.config.constraints.maxPositionSize;
    
    // Kelly criterion
    if (signal.winProbability && signal.winLossRatio) {
      const kellyFraction = (signal.winProbability * signal.winLossRatio - (1 - signal.winProbability)) / signal.winLossRatio;
      const adjustedKelly = Math.max(0, Math.min(kellyFraction * this.config.riskManagement.kellyFraction, 0.25));
      return Math.min(availableCapital * adjustedKelly, maxPosition);
    }
    
    // Risk-based sizing
    const riskAmount = this.currentCapital * this.config.riskManagement.riskPerTrade;
    const stopDistance = Math.abs(marketData.price - (signal.stopLoss || marketData.price * 0.98));
    const positionSize = riskAmount / stopDistance;
    
    return Math.min(positionSize, maxPosition);
  }
  
  /**
   * 🛡️ Apply risk management rules
   */
  private applyRiskManagement(marketData: any, timestamp: Date): void {
    // Check drawdown limit
    const currentEquity = this.calculateEquity(marketData);
    const drawdown = this.calculateDrawdown(currentEquity);
    
    if (drawdown > this.config.riskManagement.maxDrawdown) {
      this.closeAllPositions(timestamp);
      this.emit('risk_limit_triggered', { type: 'maxDrawdown', value: drawdown });
      return;
    }
    
    // Check position correlations
    if (this.positions.size > 1) {
      const correlation = this.calculatePositionCorrelation();
      if (correlation > this.config.riskManagement.correlationLimit) {
        this.reduceCorrelatedPositions(timestamp);
      }
    }
    
    // Update stop losses (trailing stops)
    for (const [id, position] of this.positions) {
      this.updateStopLoss();
    }
  }
  
  /**
   * 📈 Calculate comprehensive results
   */
  private calculateResults(equityCurve: any[]): BacktestResults {
    const returns = equityCurve.map((e, i) => 
      i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
    );
    
    const performance = {
      totalReturn: (equityCurve[equityCurve.length - 1].equity - this.config.initialCapital) / this.config.initialCapital,
      annualizedReturn: this.calculateAnnualizedReturn(equityCurve),
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(equityCurve),
      maxDrawdown: Math.max(...equityCurve.map(e => e.drawdown)),
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(equityCurve),
      winRate: this.calculateWinRate(),
      avgWin: this.calculateAvgWin(),
      avgLoss: this.calculateAvgLoss(),
      profitFactor: this.calculateProfitFactor(),
      expectancy: this.calculateExpectancy(),
      payoffRatio: this.calculatePayoffRatio(),
      recoveryFactor: this.calculateRecoveryFactor(equityCurve),
      ulcerIndex: this.calculateUlcerIndex(equityCurve),
      serenityRatio: this.calculateSerenityRatio(equityCurve)
    };
    
    const beta = this.calculateBeta(returns);
    const risk = {
      var95: this.calculateVaR(returns, 0.95),
      cvar95: this.calculateCVaR(returns, 0.95),
      downstreamDeviation: this.calculateDownsideDeviation(returns),
      beta: beta,
      alpha: this.calculateAlpha(returns, performance.annualizedReturn),
      treynorRatio: this.calculateTreynorRatio(performance.annualizedReturn, beta),
      informationRatio: this.calculateInformationRatio(returns),
      trackingError: this.calculateTrackingError(returns),
      omega: this.calculateOmegaRatio(returns),
      kappa: this.calculateKappaRatio(returns)
    };
    
    const tradeStats = {
      totalTrades: this.trades.length,
      winningTrades: this.trades.filter(t => (t.pnl || 0) > 0).length,
      losingTrades: this.trades.filter(t => (t.pnl || 0) < 0).length,
      avgTradesPerDay: this.calculateAvgTradesPerDay(),
      avgHoldingPeriod: this.calculateAvgHoldingPeriod(),
      longestWinStreak: this.calculateLongestWinStreak(),
      longestLossStreak: this.calculateLongestLossStreak(),
      largestWin: Math.max(...this.trades.map(t => t.pnl || 0)),
      largestLoss: Math.min(...this.trades.map(t => t.pnl || 0)),
      avgMAE: this.calculateAvgMAE(),
      avgMFE: this.calculateAvgMFE(),
      edgeRatio: this.calculateEdgeRatio()
    };
    
    return {
      performance,
      risk,
      tradeStats,
      equityCurve,
      trades: this.trades,
      periodAnalysis: this.calculatePeriodAnalysis()
    };
  }
  
  
  private calculateEquity(marketData: any): number {
    let equity = this.currentCapital;
    
    for (const [id, position] of this.positions) {
      const currentPrice = marketData[position.asset]?.price || position.entryPrice;
      const positionValue = position.quantity * currentPrice;
      const pnl = position.side === 'long' ? 
        (currentPrice - position.entryPrice) * position.quantity :
        (position.entryPrice - currentPrice) * position.quantity;
      
      equity += positionValue + pnl;
    }
    
    return equity;
  }
  
  private calculateDrawdown(equity: number): number {
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
      this.drawdownStart = undefined;
    }
    
    return (this.peakEquity - equity) / this.peakEquity;
  }
  
  private calculateReturns(currentEquity: number, previousEquity: number): number {
    return previousEquity === 0 ? 0 : (currentEquity - previousEquity) / previousEquity;
  }
  
  // Performance metrics calculations
  private calculateSharpeRatio(returns: number[]): number {
    const mean = this.mean(returns);
    const std = this.std(returns);
    return std === 0 ? 0 : (mean * 252) / (std * Math.sqrt(252)); // Annualized
  }
  
  private calculateSortinoRatio(returns: number[]): number {
    const mean = this.mean(returns);
    const downside = this.calculateDownsideDeviation(returns);
    return downside === 0 ? 0 : (mean * 252) / (downside * Math.sqrt(252));
  }
  
  private mean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  
  private std(data: number[]): number {
    const avg = this.mean(data);
    const variance = data.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / data.length;
    return Math.sqrt(variance);
  }
  
  private percentile(data: number[], p: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
  
  // 🔧 MISSING METHODS IMPLEMENTATION
  
  /**
   * Calculate additional performance metrics
   */
  private calculateAdditionalMetrics(results: any): void {
    results.additionalMetrics = {
      totalTrades: this.trades.length,
      winningTrades: this.trades.filter(t => (t.pnl || 0) > 0).length,
      losingTrades: this.trades.filter(t => (t.pnl || 0) < 0).length,
      winRate: this.calculateWinRate(),
      avgWin: this.calculateAvgWin(),
      avgLoss: this.calculateAvgLoss(),
      profitFactor: this.calculateProfitFactor(),
      expectancy: this.calculateExpectancy(),
      payoffRatio: this.calculatePayoffRatio(),
      recoveryFactor: this.calculateRecoveryFactor(results.equityCurve),
      ulcerIndex: this.calculateUlcerIndex(results.equityCurve),
      serenityRatio: this.calculateSerenityRatio(results.equityCurve),
      calmarRatio: this.calculateCalmarRatio(results.equityCurve),
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(results.equityCurve),
      var95: this.calculateVaR(this.calculateDailyReturns(), 0.95),
      cvar95: this.calculateCVaR(this.calculateDailyReturns(), 0.95),
      annualizedReturn: this.calculateAnnualizedReturn(results.equityCurve),
      volatility: this.calculateVolatility(this.calculateDailyReturns()),
      probabilityOfRuin: this.calculateProbabilityOfRuin()
    };
  }

  /**
   * Update positions with current market data
   */
  private updatePositions(currentData: any, timestamp: Date): void {
    this.positions.forEach(position => {
      const currentPrice = currentData[position.symbol]?.close || position.currentPrice;
      position.currentPrice = currentPrice;
      position.unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity;
      
      if (position.side === 'short') {
        position.unrealizedPnl *= -1;
      }
      
      // Apply costs
      position.unrealizedPnl -= this.calculateTradingCosts(position);
    });
  }

  /**
   * Determine if a trade should be executed
   */
  private shouldExecuteTrade(signal: any): boolean {
    // Check if we have enough capital
    if (signal.quantity * signal.price > this.currentCapital * this.config.constraints.maxPositionSize) {
      return false;
    }
    
    // Check max open positions
    if (this.positions.size >= this.config.constraints.maxOpenPositions) {
      return false;
    }
    
    // Check minimum trade size
    if (signal.quantity * signal.price < this.config.constraints.minTradeSize) {
      return false;
    }
    
    return true;
  }

  /**
   * Close all open positions
   */
  private closeAllPositions(timestamp: Date): void {
    for (const [id, position] of this.positions) {
      const pnl = this.calculatePositionPnl(position, position.currentPrice || position.entryPrice);
      
      // Update the existing trade record
      const tradeIndex = this.trades.findIndex(t => t.id === id);
      if (tradeIndex !== -1) {
        this.trades[tradeIndex].exitPrice = position.currentPrice || position.entryPrice;
        this.trades[tradeIndex].exitTime = timestamp;
        this.trades[tradeIndex].pnl = pnl;
      }
      
      this.currentCapital += pnl;
    }
    
    this.positions.clear();
  }

  /**
   * Slice market data for specific time period
   */
  private sliceMarketData(marketData: Map<string, any[]>, startDate: Date, endDate: Date): Map<string, any[]> {
    const sliced = new Map();
    
    marketData.forEach((data, symbol) => {
      const filtered = data.filter(candle => {
        const candleDate = new Date(candle.timestamp);
        return candleDate >= startDate && candleDate <= endDate;
      });
      sliced.set(symbol, filtered);
    });
    
    return sliced;
  }

  /**
   * Optimize strategy parameters
   */
  private async optimizeStrategy(strategy: any, marketData: Map<string, any[]>): Promise<any> {
    // Basic parameter optimization
    const parameterSets = this.generateParameterSets(strategy.parameters || {});
    let bestResult: any = null;
    let bestSharpe = -Infinity;
    
    for (const params of parameterSets) {
      if (strategy.updateParameters) {
        strategy.updateParameters(params);
      }
      const result = await this.runPeriodBacktest(strategy, marketData);
      
      if (result.sharpeRatio > bestSharpe) {
        bestSharpe = result.sharpeRatio;
        bestResult = { params, result };
      }
    }
    
    return bestResult;
  }

  /**
   * Run backtest for specific period
   */
  private async runPeriodBacktest(strategy: any, marketData: Map<string, any[]>): Promise<any> {
    // Simplified period backtest
    this.resetState();
    const timestamps = this.getTimestamps(marketData);
    
    for (const timestamp of timestamps) {
      const currentData = this.getDataAtTimestamp(marketData, timestamp);
      this.updatePositions(currentData, timestamp);
      
      // Generate signal and execute
      const signal = await strategy.generateSignal(currentData, this.positions, this.currentCapital);
      if (signal && this.shouldExecuteTrade(signal)) {
        await this.executeTrade(signal, currentData, timestamp);
      }
      
      const equity = this.calculateEquity(currentData);
      this.equity.push(equity);
    }
    
    return {
      totalReturn: (this.currentCapital - this.config.initialCapital) / this.config.initialCapital,
      sharpeRatio: this.calculateSharpeRatio(this.calculateDailyReturns()),
      maxDrawdown: this.calculateMaxDrawdown(this.equity),
      volatility: this.calculateVolatility()
    };
  }

  /**
   * Calculate strategy efficiency metrics
   */
  private calculateEfficiency(inSampleResults?: any, outSampleResults?: any): number {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0).length;
    const totalReturn = (this.currentCapital - this.config.initialCapital) / this.config.initialCapital;
    
    return totalTrades === 0 ? 0 : (winningTrades / totalTrades) * totalReturn;
  }

  /**
   * Combine walk-forward results
   */
  private combineWalkForwardResults(results: any[]): any {
    const combined = {
      totalReturn: 1,
      sharpeRatio: 0,
      maxDrawdown: 0,
      trades: [] as any[],
      equity: [] as number[]
    };
    
    results.forEach(result => {
      combined.totalReturn *= (1 + result.totalReturn);
      combined.maxDrawdown = Math.max(combined.maxDrawdown, result.maxDrawdown);
      combined.trades.push(...result.trades);
      combined.equity.push(...result.equity);
    });
    
    combined.totalReturn -= 1;
    combined.sharpeRatio = this.calculateSharpeRatio(this.calculateDailyReturns());
    
    return combined;
  }

  /**
   * Calculate daily returns from equity curve
   */
  private calculateDailyReturns(): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < this.equity.length; i++) {
      const dailyReturn = (this.equity[i] - this.equity[i-1]) / this.equity[i-1];
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  /**
   * Bootstrap returns for Monte Carlo
   */
  private bootstrapReturns(returns: number[]): number[] {
    const bootstrapped: number[] = [];
    const numSamples = returns.length; // Use same length as original
    
    for (let i = 0; i < numSamples; i++) {
      const randomIndex = Math.floor(Math.random() * returns.length);
      bootstrapped.push(returns[randomIndex]);
    }
    
    return bootstrapped;
  }

  /**
   * Convert returns to equity curve
   */
  private returnsToEquityCurve(returns: number[], initialCapital: number): number[] {
    const equity = [initialCapital];
    
    returns.forEach(ret => {
      const newEquity = equity[equity.length - 1] * (1 + ret);
      equity.push(newEquity);
    });
    
    return equity;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(equityCurve?: any[]): number {
    const equity = equityCurve || this.equity;
    let maxDrawdown = 0;
    let peak = equity[0];
    
    this.equity.forEach(value => {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    return maxDrawdown;
  }

  /**
   * Calculate probability of ruin
   */
  private calculateProbabilityOfRuin(): number {
    const dailyReturns = this.calculateDailyReturns();
    if (dailyReturns.length === 0) return 0;
    
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
    
    // Simplified probability of ruin calculation
    if (mean <= 0) return 1;
    if (variance === 0) return 0;
    
    const riskOfRuin = Math.exp(-2 * mean * this.currentCapital / variance);
    return Math.min(riskOfRuin, 1);
  }

  /**
   * Get used margin for leveraged positions
   */
  private getUsedMargin(): number {
    let total = 0;
    for (const [id, position] of this.positions) {
      total += (position.value || 0) / this.config.constraints.maxLeverage;
    }
    return total;
  }

  /**
   * Calculate position correlation
   */
  private calculatePositionCorrelation(): number {
    if (this.positions.size < 2) return 0;
    
    // Simplified correlation calculation
    const returns: number[] = [];
    for (const [id, position] of this.positions) {
      const ret = (position.unrealizedPnl || 0) / (position.value || 1);
      returns.push(ret);
    }
    
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < returns.length - 1; i++) {
      numerator += (returns[i] - mean) * (returns[i + 1] - mean);
      denominator += Math.pow(returns[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Reduce correlated positions
   */
  private reduceCorrelatedPositions(timestamp: Date): void {
    const correlation = this.calculatePositionCorrelation();
    
    if (correlation > 0.7) { // High correlation threshold
      // Find the position with the worst performance
      let worstId: string | null = null;
      let worstPnl = Infinity;
      
      for (const [id, position] of this.positions) {
        const pnl = position.unrealizedPnl || 0;
        if (pnl < worstPnl) {
          worstPnl = pnl;
          worstId = id;
        }
      }
      
      if (worstId) {
        const worstPosition = this.positions.get(worstId);
        if (worstPosition) {
          this.positions.delete(worstId);
          this.currentCapital += (worstPosition.value || 0) + (worstPosition.unrealizedPnl || 0);
        }
      }
    }
  }

  /**
   * Update stop loss levels
   */
  private updateStopLoss(): void {
    this.positions.forEach(position => {
      if (this.config.constraints.trailingStop) {
        const currentPrice = position.currentPrice;
        const trailingStopPrice = position.side === 'long' 
          ? currentPrice * (1 - this.config.constraints.trailingStop)
          : currentPrice * (1 + this.config.constraints.trailingStop);
        
        if (!position.stopLoss || 
            (position.side === 'long' && trailingStopPrice > position.stopLoss) ||
            (position.side === 'short' && trailingStopPrice < position.stopLoss)) {
          position.stopLoss = trailingStopPrice;
        }
      }
    });
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(equityCurve?: any[]): number {
    const totalReturn = (this.currentCapital - this.config.initialCapital) / this.config.initialCapital;
    const daysDiff = (this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    
    return years === 0 ? 0 : Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(returns?: number[]): number {
    const dailyReturns = returns || this.calculateDailyReturns();
    if (dailyReturns.length === 0) return 0;
    
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * Calculate win rate
   */
  private calculateWinRate(): number {
    const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0).length;
    return this.trades.length === 0 ? 0 : winningTrades / this.trades.length;
  }

  /**
   * Calculate average winning trade
   */
  private calculateAvgWin(): number {
    const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0);
    return winningTrades.length === 0 ? 0 : 
      winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length;
  }

  /**
   * Calculate average losing trade
   */
  private calculateAvgLoss(): number {
    const losingTrades = this.trades.filter(t => (t.pnl || 0) < 0);
    return losingTrades.length === 0 ? 0 : 
      losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length;
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(): number {
    const grossProfit = this.trades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(this.trades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    return grossLoss === 0 ? 0 : grossProfit / grossLoss;
  }

  /**
   * Calculate expectancy
   */
  private calculateExpectancy(): number {
    const winRate = this.calculateWinRate();
    const avgWin = this.calculateAvgWin();
    const avgLoss = Math.abs(this.calculateAvgLoss());
    
    return (winRate * avgWin) - ((1 - winRate) * avgLoss);
  }

  /**
   * Calculate payoff ratio
   */
  private calculatePayoffRatio(): number {
    const avgWin = this.calculateAvgWin();
    const avgLoss = Math.abs(this.calculateAvgLoss());
    
    return avgLoss === 0 ? 0 : avgWin / avgLoss;
  }

  /**
   * Calculate recovery factor
   */
  private calculateRecoveryFactor(equityCurve: any[]): number {
    const totalReturn = (this.currentCapital - this.config.initialCapital) / this.config.initialCapital;
    const maxDrawdown = this.calculateMaxDrawdown();
    
    return maxDrawdown === 0 ? 0 : totalReturn / maxDrawdown;
  }

  /**
   * Calculate Ulcer Index
   */
  private calculateUlcerIndex(equityCurve: any[]): number {
    let sumSquaredDrawdowns = 0;
    let peak = this.equity[0];
    
    this.equity.forEach(value => {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      sumSquaredDrawdowns += Math.pow(drawdown, 2);
    });
    
    return this.equity.length === 0 ? 0 : Math.sqrt(sumSquaredDrawdowns / this.equity.length);
  }

  /**
   * Calculate Serenity Ratio
   */
  private calculateSerenityRatio(equityCurve: any[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn();
    const ulcerIndex = this.calculateUlcerIndex(equityCurve);
    
    return ulcerIndex === 0 ? 0 : annualizedReturn / ulcerIndex;
  }

  /**
   * Calculate Calmar ratio
   */
  private calculateCalmarRatio(equityCurve: any[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn();
    const maxDrawdown = this.calculateMaxDrawdown();
    
    return maxDrawdown === 0 ? 0 : annualizedReturn / maxDrawdown;
  }

  /**
   * Calculate maximum drawdown duration
   */
  private calculateMaxDrawdownDuration(equityCurve: any[]): number {
    let maxDuration = 0;
    let currentDuration = 0;
    let peak = this.equity[0];
    
    this.equity.forEach((value, i) => {
      if (value > peak) {
        peak = value;
        currentDuration = 0;
      } else {
        currentDuration++;
        maxDuration = Math.max(maxDuration, currentDuration);
      }
    });
    
    return maxDuration;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    
    return sorted[index] || 0;
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, index);
    
    return tailReturns.length === 0 ? 0 : 
      tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
  }

  /**
   * Helper method to generate parameter sets for optimization
   */
  private generateParameterSets(parameters: any): any[] {
    // Simple parameter grid generation
    const paramKeys = Object.keys(parameters);
    if (paramKeys.length === 0) return [{}];
    
    const sets = [{}];
    paramKeys.forEach(key => {
      const param = parameters[key];
      if (Array.isArray(param)) {
        const newSets: any[] = [];
        sets.forEach(set => {
          param.forEach(value => {
            newSets.push({ ...set, [key]: value });
          });
        });
        sets.splice(0, sets.length, ...newSets);
      }
    });
    
    return sets;
  }

  /**
   * Helper method to calculate position PnL
   */
  private calculatePositionPnl(position: any, currentPrice: number): number {
    let pnl = (currentPrice - position.entryPrice) * position.quantity;
    
    if (position.side === 'short') {
      pnl *= -1;
    }
    
    // Subtract trading costs
    return pnl - this.calculateTradingCosts(position);
  }

  /**
   * Helper method to calculate trading costs
   */
  private calculateTradingCosts(position: any): number {
    const commissionCost = position.value * this.config.costs.commission;
    const slippageCost = position.value * this.config.costs.slippage;
    const spreadCost = position.value * this.config.costs.spread;
    
    return commissionCost + slippageCost + spreadCost;
  }

  /**
   * Helper method to reset backtesting state
   */
  private resetState(): void {
    this.currentCapital = this.config.initialCapital;
    this.positions.clear();
    this.trades = [];
    this.equity = [this.config.initialCapital];
    this.peakEquity = this.config.initialCapital;
    this.drawdownStart = undefined;
  }

  /**
   * Helper method to get timestamps from market data
   */
  private getTimestamps(marketData: Map<string, any[]>): Date[] {
    const firstSymbol = marketData.keys().next().value;
    if (!firstSymbol) return [];
    
    const data = marketData.get(firstSymbol) || [];
    return data.map(candle => new Date(candle.timestamp)).sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Helper method to get data at specific timestamp
   */
  private getDataAtTimestamp(marketData: Map<string, any[]>, timestamp: Date): any {
    const result: any = {};
    
    marketData.forEach((data, symbol) => {
      const candle = data.find(c => new Date(c.timestamp).getTime() === timestamp.getTime());
      if (candle) {
        result[symbol] = candle;
      }
    });
    
    return result;
  }

  /**
   * Calculate downside deviation
   */
  private calculateDownsideDeviation(returns: number[]): number {
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return 0;
    
    const mean = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / negativeReturns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * Calculate beta coefficient
   */
  private calculateBeta(returns: number[]): number {
    // Simplified beta calculation assuming market return is benchmark
    const marketReturns = returns; // In real implementation, use actual market data
    
    if (returns.length !== marketReturns.length || returns.length < 2) return 1;
    
    const meanReturns = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const meanMarket = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < returns.length; i++) {
      covariance += (returns[i] - meanReturns) * (marketReturns[i] - meanMarket);
      marketVariance += Math.pow(marketReturns[i] - meanMarket, 2);
    }
    
    return marketVariance === 0 ? 1 : covariance / marketVariance;
  }

  /**
   * Calculate alpha
   */
  private calculateAlpha(returns: number[], portfolioReturn: number): number {
    const beta = this.calculateBeta(returns);
    const marketReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length * 252; // Annualized
    const riskFreeRate = 0.02; // 2% assumption
    
    return portfolioReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  /**
   * Calculate Treynor ratio
   */
  private calculateTreynorRatio(portfolioReturn: number, beta: number): number {
    const riskFreeRate = 0.02; // 2% assumption
    return beta === 0 ? 0 : (portfolioReturn - riskFreeRate) / beta;
  }

  /**
   * Calculate information ratio
   */
  private calculateInformationRatio(returns: number[]): number {
    const marketReturns = returns; // Simplified benchmark
    const excessReturns = returns.map((r, i) => r - (marketReturns[i] || 0));
    const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = this.std(excessReturns);
    
    return trackingError === 0 ? 0 : meanExcess / trackingError;
  }

  /**
   * Calculate tracking error
   */
  private calculateTrackingError(returns: number[]): number {
    const marketReturns = returns; // Simplified benchmark
    const excessReturns = returns.map((r, i) => r - (marketReturns[i] || 0));
    return this.std(excessReturns) * Math.sqrt(252); // Annualized
  }

  /**
   * Calculate Omega ratio
   */
  private calculateOmegaRatio(returns: number[], threshold: number = 0): number {
    const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
    const losses = returns.filter(r => r <= threshold).reduce((sum, r) => sum + Math.abs(r - threshold), 0);
    
    return losses === 0 ? Infinity : gains / losses;
  }

  /**
   * Calculate Kappa ratio
   */
  private calculateKappaRatio(returns: number[], threshold: number = 0): number {
    const excessReturns = returns.map(r => r - threshold);
    const meanExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const lowerPartialMoment = excessReturns
      .filter(r => r < 0)
      .reduce((sum, r) => sum + Math.pow(Math.abs(r), 2), 0) / excessReturns.length;
    
    return lowerPartialMoment === 0 ? Infinity : meanExcess / Math.sqrt(lowerPartialMoment);
  }

  /**
   * Calculate average trades per day
   */
  private calculateAvgTradesPerDay(): number {
    if (this.trades.length === 0) return 0;
    
    const totalDays = (this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return this.trades.length / totalDays;
  }

  /**
   * Calculate average holding period
   */
  private calculateAvgHoldingPeriod(): number {
    const completedTrades = this.trades.filter(t => t.exitTime);
    if (completedTrades.length === 0) return 0;
    
    const totalHoldingTime = completedTrades.reduce((sum, t) => {
      const holdingTime = (t.exitTime!.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60 * 24);
      return sum + holdingTime;
    }, 0);
    
    return totalHoldingTime / completedTrades.length;
  }

  /**
   * Calculate longest winning streak
   */
  private calculateLongestWinStreak(): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const trade of this.trades) {
      if ((trade.pnl || 0) > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  /**
   * Calculate longest losing streak
   */
  private calculateLongestLossStreak(): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const trade of this.trades) {
      if ((trade.pnl || 0) < 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  /**
   * Calculate average Maximum Adverse Excursion
   */
  private calculateAvgMAE(): number {
    if (this.trades.length === 0) return 0;
    return this.trades.reduce((sum, t) => sum + t.mae, 0) / this.trades.length;
  }

  /**
   * Calculate average Maximum Favorable Excursion
   */
  private calculateAvgMFE(): number {
    if (this.trades.length === 0) return 0;
    return this.trades.reduce((sum, t) => sum + t.mfe, 0) / this.trades.length;
  }

  /**
   * Calculate edge ratio
   */
  private calculateEdgeRatio(): number {
    const winRate = this.calculateWinRate();
    const avgWin = this.calculateAvgWin();
    const avgLoss = Math.abs(this.calculateAvgLoss());
    
    if (avgLoss === 0) return 0;
    
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    return avgLoss === 0 ? 0 : expectancy / avgLoss;
  }

  /**
   * Calculate period analysis
   */
  private calculatePeriodAnalysis(): any {
    const daily: { [date: string]: number } = {};
    const weekly: { [week: string]: number } = {};
    const monthly: { [month: string]: number } = {};
    const yearly: { [year: string]: number } = {};
    
    // Group trades by time periods
    for (const trade of this.trades) {
      if (!trade.pnl) continue;
      
      const date = trade.entryTime;
      const dateStr = date.toISOString().split('T')[0];
      const yearWeek = `${date.getFullYear()}-W${Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const year = date.getFullYear().toString();
      
      daily[dateStr] = (daily[dateStr] || 0) + trade.pnl;
      weekly[yearWeek] = (weekly[yearWeek] || 0) + trade.pnl;
      monthly[yearMonth] = (monthly[yearMonth] || 0) + trade.pnl;
      yearly[year] = (yearly[year] || 0) + trade.pnl;
    }
    
    return { daily, weekly, monthly, yearly };
  }

  // Additional metric calculations would continue...
  
  /**
   * Public API
   */
  setConfig(config: Partial<BacktestConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): BacktestConfig {
    return this.config;
  }
  
  getTrades(): Trade[] {
    return this.trades;
  }
  
  getCurrentEquity(): number {
    return this.currentCapital;
  }
}

export default BacktestingEngine;