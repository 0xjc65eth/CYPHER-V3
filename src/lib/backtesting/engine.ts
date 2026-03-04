/**
 * 🚀 Backtesting Engine Implementation
 * Motor principal para testar estratégias
 */

import { BacktestConfig, BacktestResult, TradeResult, EquityPoint } from './types';

export class BacktestingEngine {
  private config: BacktestConfig;
  private historicalData: any[] = [];
  private trades: TradeResult[] = [];
  private equity: number;
  private positions: Map<string, any> = new Map();

  constructor(config: BacktestConfig) {
    this.config = config;
    this.equity = config.initialCapital;
  }

  async loadHistoricalData(symbol: string): Promise<void> {
    // Em produção, carregar dados reais de uma API
    
    // Mock data para demonstração
    const days = Math.floor((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    this.historicalData = Array.from({ length: days }, (_, i) => {
      const date = new Date(this.config.startDate);
      date.setDate(date.getDate() + i);

      // Deterministic defaults - no real data available
      return {
        date,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0
      };
    });
  }

  async runBacktest(): Promise<BacktestResult> {
    
    const equityCurve: EquityPoint[] = [];
    const initialEquity = this.equity;
    
    // Process each candle
    for (let i = 0; i < this.historicalData.length; i++) {
      const candle = this.historicalData[i];
      const indicators = this.calculateIndicators(i);
      
      // Check entry rules
      if (this.shouldEnter(indicators, candle)) {
        this.openPosition(candle);
      }
      
      // Check exit rules
      this.checkExitConditions(candle);
      
      // Update equity curve
      const currentEquity = this.calculateEquity();
      equityCurve.push({
        date: candle.date,
        value: currentEquity,
        drawdown: ((initialEquity - currentEquity) / initialEquity) * 100
      });
    }
    
    // Calculate final metrics
    const metrics = this.calculateMetrics();
    
    return {
      metrics,
      trades: this.trades,
      equityCurve,
      drawdownCurve: this.calculateDrawdownCurve(equityCurve),
      statistics: this.calculateStatistics()
    };
  }

  private calculateIndicators(index: number): any {
    // Simplified indicator calculation
    const data = this.historicalData.slice(Math.max(0, index - 50), index + 1);
    
    return {
      sma20: this.calculateSMA(data, 20),
      sma50: this.calculateSMA(data, 50),
      rsi: this.calculateRSI(data, 14),
      volume: data[data.length - 1]?.volume || 0
    };
  }

  private calculateSMA(data: any[], period: number): number {
    if (data.length < period) return 0;
    
    const sum = data.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }

  private calculateRSI(data: any[], period: number): number {
    // Simplified RSI calculation
    return 50; // Neutral RSI - no real data available
  }

  private shouldEnter(indicators: any, candle: any): boolean {
    // Check strategy entry rules
    for (const rule of this.config.strategy.entryRules) {
      const indicatorValue = indicators[rule.indicator];
      
      switch (rule.condition) {
        case 'above':
          if (indicatorValue <= rule.value) return false;
          break;
        case 'below':
          if (indicatorValue >= rule.value) return false;
          break;
        // Add more conditions as needed
      }
    }
    
    return true;
  }

  private openPosition(candle: any): void {
    const positionSize = this.calculatePositionSize(candle);
    
    const position = {
      id: `POS-${Date.now()}`,
      entryPrice: candle.close,
      size: positionSize,
      entryDate: candle.date,
      stopLoss: candle.close * 0.97, // 3% stop loss
      takeProfit: candle.close * 1.06 // 6% take profit
    };
    
    this.positions.set(position.id, position);
    this.equity -= positionSize * candle.close * (1 + this.config.commission / 100);
  }

  private calculatePositionSize(candle: any): number {
    const method = this.config.strategy.positionSizing;
    
    switch (method.type) {
      case 'fixed':
        return method.amount;
      case 'percentage':
        return (this.equity * method.value / 100) / candle.close;
      default:
        return 0.01; // Default to 0.01 BTC
    }
  }

  private checkExitConditions(candle: any): void {
    for (const [id, position] of this.positions) {
      let shouldExit = false;
      let exitPrice = candle.close;
      
      // Check stop loss
      if (candle.low <= position.stopLoss) {
        shouldExit = true;
        exitPrice = position.stopLoss;
      }
      
      // Check take profit
      if (candle.high >= position.takeProfit) {
        shouldExit = true;
        exitPrice = position.takeProfit;
      }
      
      if (shouldExit) {
        this.closePosition(id, exitPrice, candle.date);
      }
    }
  }

  private closePosition(positionId: string, exitPrice: number, exitDate: Date): void {
    const position = this.positions.get(positionId);
    if (!position) return;
    
    const pnl = (exitPrice - position.entryPrice) * position.size;
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    
    const trade: TradeResult = {
      id: `TRADE-${Date.now()}`,
      entryDate: position.entryDate,
      exitDate,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      pnl,
      pnlPercent,
      duration: exitDate.getTime() - position.entryDate.getTime()
    };
    
    this.trades.push(trade);
    this.equity += position.size * exitPrice * (1 - this.config.commission / 100);
    this.positions.delete(positionId);
  }

  private calculateEquity(): number {
    let equity = this.equity;
    
    // Add unrealized P&L
    for (const position of this.positions.values()) {
      const currentPrice = this.historicalData[this.historicalData.length - 1]?.close || position.entryPrice;
      equity += (currentPrice - position.entryPrice) * position.size;
    }
    
    return equity;
  }

  private calculateMetrics(): any {
    const returns = this.trades.map(t => t.pnlPercent);
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl < 0);
    
    return {
      totalReturn: ((this.equity - this.config.initialCapital) / this.config.initialCapital) * 100,
      annualizedReturn: 0, // Calculate based on period
      sharpeRatio: this.calculateSharpeRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(),
      winRate: (winningTrades.length / this.trades.length) * 100,
      profitFactor: this.calculateProfitFactor(),
      averageWin: winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length || 0,
      averageLoss: losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losingTrades.length || 0,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    };
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.config.initialCapital;
    
    for (const trade of this.trades) {
      const equity = this.config.initialCapital + 
        this.trades.slice(0, this.trades.indexOf(trade) + 1)
          .reduce((sum, t) => sum + t.pnl, 0);
      
      if (equity > peak) {
        peak = equity;
      }
      
      const drawdown = ((peak - equity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private calculateProfitFactor(): number {
    const grossProfit = this.trades
      .filter(t => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    
    const grossLoss = Math.abs(
      this.trades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + t.pnl, 0)
    );
    
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }

  private calculateDrawdownCurve(equityCurve: EquityPoint[]): any[] {
    let peak = equityCurve[0]?.value || 0;
    
    return equityCurve.map(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      
      return {
        date: point.date,
        drawdown: ((peak - point.value) / peak) * 100
      };
    });
  }

  private calculateStatistics(): any {
    return {
      totalDays: this.historicalData.length,
      tradingDays: this.trades.length,
      avgTradesPerDay: this.trades.length / this.historicalData.length,
      avgHoldingPeriod: this.trades.reduce((sum, t) => sum + t.duration, 0) / this.trades.length / (1000 * 60 * 60 * 24),
      bestTrade: Math.max(...this.trades.map(t => t.pnlPercent)),
      worstTrade: Math.min(...this.trades.map(t => t.pnlPercent)),
      consecutiveWins: this.calculateMaxConsecutive(true),
      consecutiveLosses: this.calculateMaxConsecutive(false)
    };
  }

  private calculateMaxConsecutive(wins: boolean): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const trade of this.trades) {
      if ((wins && trade.pnl > 0) || (!wins && trade.pnl < 0)) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }
}

