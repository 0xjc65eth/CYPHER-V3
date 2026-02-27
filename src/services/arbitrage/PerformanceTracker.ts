/**
 * Performance Tracker Service
 * Calculates institutional-grade trading metrics:
 * - Sharpe Ratio: Risk-adjusted returns
 * - Sortino Ratio: Downside risk only
 * - Calmar Ratio: Return vs Max Drawdown
 * - Profit Factor: Gross profit / Gross loss
 * - Win Rate, Max Drawdown, Recovery Time
 */

import { dbService } from '@/lib/database/db-service';
import { cache } from '@/lib/cache/redis.config';

export interface TradeRecord {
  id: string;
  timestamp: Date;
  type: 'cex-dex' | 'triangular' | 'statistical';
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  profit: number;
  fees: number;
  netProfit: number;
  executionTime: number; // seconds
  successful: boolean;
}

export interface PerformanceMetrics {
  strategy: string;
  period: '24h' | '7d' | '30d' | 'all';
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  totalProfit: number;
  totalFees: number;
  returnPercent: number;
  volatility: number;
  recoveryTime: number; // days
  snapshotDate: Date;
}

export interface EquityCurve {
  date: Date;
  equity: number;
  drawdown: number;
  profitLoss: number;
}

class PerformanceTracker {
  private readonly RISK_FREE_RATE = 0.02; // 2% annual risk-free rate (Treasury)

  /**
   * Calculate Sharpe Ratio
   * Formula: (Return - RiskFreeRate) / StandardDeviation
   * Target: > 1.0 (good), > 2.0 (excellent)
   */
  calculateSharpeRatio(returns: number[], annualizeFactor: number = 252): number {
    if (returns.length < 2) return 0;

    const avgReturn = this.mean(returns);
    const stdDev = this.standardDeviation(returns);

    if (stdDev === 0) return 0;

    // Annualize the metrics
    const annualizedReturn = avgReturn * annualizeFactor;
    const annualizedStdDev = stdDev * Math.sqrt(annualizeFactor);

    return (annualizedReturn - this.RISK_FREE_RATE) / annualizedStdDev;
  }

  /**
   * Calculate Sortino Ratio
   * Like Sharpe but only considers downside deviation
   * Formula: (Return - RiskFreeRate) / DownsideDeviation
   * Target: > 1.0 (good), > 2.0 (excellent)
   */
  calculateSortinoRatio(returns: number[], annualizeFactor: number = 252): number {
    if (returns.length < 2) return 0;

    const avgReturn = this.mean(returns);
    const downsideReturns = returns.filter(r => r < 0);

    if (downsideReturns.length === 0) return Infinity; // No downside!

    const downsideDeviation = this.standardDeviation(downsideReturns);

    if (downsideDeviation === 0) return 0;

    const annualizedReturn = avgReturn * annualizeFactor;
    const annualizedDownside = downsideDeviation * Math.sqrt(annualizeFactor);

    return (annualizedReturn - this.RISK_FREE_RATE) / annualizedDownside;
  }

  /**
   * Calculate Calmar Ratio
   * Formula: AnnualizedReturn / MaxDrawdown
   * Target: > 0.5 (good), > 1.0 (excellent)
   */
  calculateCalmarRatio(returns: number[], maxDrawdown: number, annualizeFactor: number = 252): number {
    if (maxDrawdown === 0) return 0;

    const avgReturn = this.mean(returns);
    const annualizedReturn = avgReturn * annualizeFactor;

    return annualizedReturn / Math.abs(maxDrawdown);
  }

  /**
   * Calculate Profit Factor
   * Formula: GrossProfit / GrossLoss
   * Target: > 1.0 (profitable), > 2.0 (excellent)
   */
  calculateProfitFactor(trades: TradeRecord[]): number {
    const wins = trades.filter(t => t.netProfit > 0);
    const losses = trades.filter(t => t.netProfit < 0);

    const grossProfit = wins.reduce((sum, t) => sum + t.netProfit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.netProfit, 0));

    if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;

    return grossProfit / grossLoss;
  }

  /**
   * Calculate Win Rate
   * Formula: WinningTrades / TotalTrades * 100
   * Target: > 50% (good), > 60% (excellent)
   */
  calculateWinRate(trades: TradeRecord[]): number {
    if (trades.length === 0) return 0;

    const wins = trades.filter(t => t.netProfit > 0).length;
    return (wins / trades.length) * 100;
  }

  /**
   * Calculate Maximum Drawdown
   * Formula: (Peak - Trough) / Peak * 100
   * Returns: Percentage and recovery time in days
   */
  calculateMaxDrawdown(equityCurve: EquityCurve[]): {
    maxDrawdown: number;
    currentDrawdown: number;
    recoveryTime: number;
  } {
    if (equityCurve.length === 0) {
      return { maxDrawdown: 0, currentDrawdown: 0, recoveryTime: 0 };
    }

    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownStartIdx = 0;
    let maxDrawdownEndIdx = 0;
    let currentDrawdown = 0;

    equityCurve.forEach((point, idx) => {
      if (point.equity > peak) {
        peak = point.equity;
      }

      const drawdown = ((peak - point.equity) / peak) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownStartIdx = idx;
      }

      // Current drawdown (from most recent peak)
      if (idx === equityCurve.length - 1) {
        currentDrawdown = drawdown;
      }
    });

    // Find recovery time (days from trough to recovery)
    let recoveryTime = 0;
    if (maxDrawdown > 0) {
      const troughEquity = equityCurve[maxDrawdownStartIdx].equity;
      for (let i = maxDrawdownStartIdx; i < equityCurve.length; i++) {
        if (equityCurve[i].equity >= peak) {
          const daysDiff = Math.floor(
            (equityCurve[i].date.getTime() - equityCurve[maxDrawdownStartIdx].date.getTime()) /
            (1000 * 60 * 60 * 24)
          );
          recoveryTime = daysDiff;
          break;
        }
      }
    }

    return { maxDrawdown, currentDrawdown, recoveryTime };
  }

  /**
   * Build equity curve from trade records
   */
  buildEquityCurve(trades: TradeRecord[], initialCapital: number = 10000): EquityCurve[] {
    const curve: EquityCurve[] = [];
    let equity = initialCapital;
    let peak = initialCapital;

    trades.forEach(trade => {
      equity += trade.netProfit;
      if (equity > peak) peak = equity;

      const drawdown = ((peak - equity) / peak) * 100;

      curve.push({
        date: trade.timestamp,
        equity,
        drawdown,
        profitLoss: trade.netProfit
      });
    });

    return curve;
  }

  /**
   * Calculate comprehensive performance metrics
   */
  async calculateMetrics(
    strategy: string,
    period: '24h' | '7d' | '30d' | 'all',
    initialCapital: number = 10000
  ): Promise<PerformanceMetrics> {
    // Fetch trade records from database
    const trades = await this.fetchTrades(strategy, period);

    if (trades.length === 0) {
      return this.emptyMetrics(strategy, period);
    }

    // Build equity curve
    const equityCurve = this.buildEquityCurve(trades, initialCapital);

    // Calculate returns (% change in equity)
    const returns = this.calculateReturns(equityCurve);

    // Calculate drawdown metrics
    const { maxDrawdown, currentDrawdown, recoveryTime } = this.calculateMaxDrawdown(equityCurve);

    // Calculate ratios
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const calmarRatio = this.calculateCalmarRatio(returns, maxDrawdown);
    const profitFactor = this.calculateProfitFactor(trades);
    const winRate = this.calculateWinRate(trades);

    // Calculate other metrics
    const wins = trades.filter(t => t.netProfit > 0);
    const losses = trades.filter(t => t.netProfit < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.netProfit, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.netProfit, 0) / losses.length : 0;

    const totalProfit = trades.reduce((sum, t) => sum + t.netProfit, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    const returnPercent = ((equityCurve[equityCurve.length - 1].equity - initialCapital) / initialCapital) * 100;
    const volatility = this.standardDeviation(returns);

    const metrics: PerformanceMetrics = {
      strategy,
      period,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      currentDrawdown,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      totalTrades: trades.length,
      totalProfit,
      totalFees,
      returnPercent,
      volatility,
      recoveryTime,
      snapshotDate: new Date()
    };

    // Save metrics to database
    await this.saveMetrics(metrics);

    return metrics;
  }

  /**
   * Fetch trade records from database
   */
  private async fetchTrades(strategy: string, period: '24h' | '7d' | '30d' | 'all'): Promise<TradeRecord[]> {
    try {
      const client = dbService.getClient();
      let queryBuilder = client
        .from('arbitrage_executions')
        .select('id, completed_at, amount, actual_profit, started_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });

      // Add time filter
      if (period !== 'all') {
        const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        queryBuilder = queryBuilder.gte('completed_at', since);
      }

      const { data, error } = await queryBuilder;

      if (error || !data) {
        console.error('Error fetching trades:', error?.message);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.completed_at),
        type: 'cex-dex' as const,
        symbol: 'BTC/USDT',
        entryPrice: 0,
        exitPrice: 0,
        amount: parseFloat(row.amount),
        profit: parseFloat(row.actual_profit),
        fees: 0,
        netProfit: parseFloat(row.actual_profit),
        executionTime: 60,
        successful: parseFloat(row.actual_profit) > 0
      }));
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  /**
   * Save metrics to database
   */
  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const client = dbService.getClient();
      await client.from('performance_metrics').upsert({
        strategy: metrics.strategy,
        period: metrics.period,
        sharpe_ratio: metrics.sharpeRatio,
        sortino_ratio: metrics.sortinoRatio,
        calmar_ratio: metrics.calmarRatio,
        max_drawdown: metrics.maxDrawdown,
        current_drawdown: metrics.currentDrawdown,
        win_rate: metrics.winRate,
        profit_factor: metrics.profitFactor,
        avg_win: metrics.avgWin,
        avg_loss: metrics.avgLoss,
        total_trades: metrics.totalTrades,
        total_profit: metrics.totalProfit,
        snapshot_date: metrics.snapshotDate
      }, { onConflict: 'strategy,period,snapshot_date' });
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Calculate returns (% change) from equity curve
   */
  private calculateReturns(equityCurve: EquityCurve[]): number[] {
    const returns: number[] = [];

    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].equity;
      const currentEquity = equityCurve[i].equity;
      const returnPct = ((currentEquity - prevEquity) / prevEquity) * 100;
      returns.push(returnPct);
    }

    return returns;
  }

  /**
   * Helper: Calculate mean
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Helper: Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;

    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = this.mean(squaredDiffs);

    return Math.sqrt(variance);
  }

  /**
   * Return empty metrics
   */
  private emptyMetrics(strategy: string, period: '24h' | '7d' | '30d' | 'all'): PerformanceMetrics {
    return {
      strategy,
      period,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalTrades: 0,
      totalProfit: 0,
      totalFees: 0,
      returnPercent: 0,
      volatility: 0,
      recoveryTime: 0,
      snapshotDate: new Date()
    };
  }
}

// Export singleton
export const performanceTracker = new PerformanceTracker();
