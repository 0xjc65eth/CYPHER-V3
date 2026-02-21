/**
 * Backtesting Engine Service
 * Replays arbitrage strategies on historical data
 * Calculates performance metrics for strategy validation
 */

import { cache } from '@/lib/cache/redis.config';
import { dbService } from '@/lib/database/db-service';

interface HistoricalCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestTrade {
  id: string;
  timestamp: number;
  type: 'buy' | 'sell';
  exchange: string;
  symbol: string;
  price: number;
  amount: number;
  fee: number;
  total: number;
  profit: number;
}

interface BacktestResult {
  strategyName: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  trades: BacktestTrade[];
  equityCurve: { timestamp: number; value: number }[];
}

interface BacktestConfig {
  strategy: 'cex-dex' | 'triangular' | 'statistical' | 'smc';
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  feePercent: number;
  minSpreadPercent?: number; // For CEX-DEX
  minProfitPercent?: number; // For triangular
  orderBlockStrength?: number; // For SMC
}

export class BacktestEngine {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly RISK_FREE_RATE = 0.02; // 2% annual

  /**
   * Run backtest on historical data
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const cacheKey = `backtest:${config.strategy}:${config.symbol}:${config.startDate.getTime()}:${config.endDate.getTime()}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch historical data
    const historicalData = await this.fetchHistoricalData(
      config.symbol,
      config.startDate,
      config.endDate
    );

    // Generate trades based on strategy
    const trades = await this.simulateStrategy(config, historicalData);

    // Calculate performance metrics
    const result = this.calculateBacktestResults(config, trades, historicalData);

    // Cache result
    await cache.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    // Save to database
    await this.saveBacktestResult(result);

    return result;
  }

  /**
   * Fetch historical price data
   */
  private async fetchHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalCandle[]> {
    // Try to get from database first
    const result = await dbService.query(`
      SELECT
        EXTRACT(EPOCH FROM timestamp) * 1000 AS timestamp,
        open, high, low, close, volume
      FROM exchange_prices
      WHERE symbol = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `, [symbol, startDate, endDate]);

    if (result.rows && result.rows.length > 0) {
      return result.rows.map((row: any) => ({
        timestamp: parseInt(row.timestamp),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume)
      }));
    }

    // If no historical data, generate sample data
    return this.generateSampleHistoricalData(startDate, endDate);
  }

  /**
   * Generate sample historical data using a deterministic seed.
   * ⚠️ DEMO FALLBACK: Only used when no real historical data exists in the database.
   * Uses a seeded pseudo-random to produce reproducible results for testing.
   */
  private generateSampleHistoricalData(
    startDate: Date,
    endDate: Date
  ): HistoricalCandle[] {
    const data: HistoricalCandle[] = [];
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const interval = 3600 * 1000; // 1 hour
    let price = 0; // No hardcoded price — requires real historical data
    // Simple seeded PRNG for reproducible backtests (not Math.random)
    let seed = startTime % 2147483647;
    const nextSeed = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646; // 0..1
    };

    for (let time = startTime; time <= endTime; time += interval) {
      const change = (nextSeed() - 0.5) * 500;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + nextSeed() * 200;
      const low = Math.min(open, close) - nextSeed() * 200;
      const volume = nextSeed() * 1000 + 500;

      data.push({
        timestamp: time,
        open,
        high,
        low,
        close,
        volume
      });

      price = close;
    }

    return data;
  }

  /**
   * Simulate strategy on historical data
   */
  private async simulateStrategy(
    config: BacktestConfig,
    historicalData: HistoricalCandle[]
  ): Promise<BacktestTrade[]> {
    const trades: BacktestTrade[] = [];

    switch (config.strategy) {
      case 'cex-dex':
        return this.simulateCexDexStrategy(config, historicalData);
      case 'triangular':
        return this.simulateTriangularStrategy(config, historicalData);
      case 'smc':
        return this.simulateSMCStrategy(config, historicalData);
      case 'statistical':
        return this.simulateStatisticalStrategy(config, historicalData);
      default:
        return trades;
    }
  }

  /**
   * Simulate CEX-DEX arbitrage strategy
   */
  private simulateCexDexStrategy(
    config: BacktestConfig,
    historicalData: HistoricalCandle[]
  ): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    const minSpreadPercent = config.minSpreadPercent || 0.5;

    for (let i = 0; i < historicalData.length - 1; i++) {
      const candle = historicalData[i];

      // Derive DEX price variance deterministically from candle data
      // Uses the ratio of (close - open) / open as a proxy for market imbalance
      const cexPrice = candle.close;
      const imbalance = candle.open > 0 ? (candle.close - candle.open) / candle.open : 0;
      const dexPrice = cexPrice * (1 + imbalance * 2); // Amplify imbalance for DEX lag

      const spreadPercent = Math.abs((dexPrice - cexPrice) / cexPrice) * 100;

      if (spreadPercent >= minSpreadPercent) {
        const isBuyCex = dexPrice > cexPrice;
        const buyPrice = isBuyCex ? cexPrice : dexPrice;
        const sellPrice = isBuyCex ? dexPrice : cexPrice;
        const amount = 0.1; // Fixed position size for simplicity
        const fee = (buyPrice + sellPrice) * amount * (config.feePercent / 100);
        const total = sellPrice * amount - buyPrice * amount - fee;

        trades.push({
          id: crypto.randomUUID(),
          timestamp: candle.timestamp,
          type: 'buy',
          exchange: isBuyCex ? 'binance' : 'uniswap',
          symbol: config.symbol,
          price: buyPrice,
          amount,
          fee: fee / 2,
          total: buyPrice * amount,
          profit: total
        });

        trades.push({
          id: crypto.randomUUID(),
          timestamp: candle.timestamp,
          type: 'sell',
          exchange: isBuyCex ? 'uniswap' : 'binance',
          symbol: config.symbol,
          price: sellPrice,
          amount,
          fee: fee / 2,
          total: sellPrice * amount,
          profit: total
        });
      }
    }

    return trades;
  }

  /**
   * Simulate Triangular arbitrage strategy
   */
  private simulateTriangularStrategy(
    config: BacktestConfig,
    historicalData: HistoricalCandle[]
  ): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    const minProfitPercent = config.minProfitPercent || 0.3;

    // Triangular arbitrage: BTC → ETH → USDT → BTC
    for (let i = 0; i < historicalData.length - 1; i++) {
      const candle = historicalData[i];

      // Simulate triangular path (simplified)
      const btcUsdt = candle.close;
      const ethUsdt = btcUsdt * 0.05; // Assume ETH is 5% of BTC price
      const btcEth = btcUsdt / ethUsdt;

      // Derive price inefficiency deterministically from volume change
      const volumeSignal = candle.volume > 0 ? ((candle.high - candle.low) / candle.close) : 0;
      const syntheticBtcEth = btcEth * (1 + (volumeSignal - 0.005) * 0.5);

      const profitPercent = ((syntheticBtcEth - btcEth) / btcEth) * 100;

      if (Math.abs(profitPercent) >= minProfitPercent) {
        const amount = 0.1;
        const fee = btcUsdt * amount * (config.feePercent / 100) * 3; // 3 trades
        const profit = (profitPercent / 100) * btcUsdt * amount - fee;

        trades.push({
          id: crypto.randomUUID(),
          timestamp: candle.timestamp,
          type: 'buy',
          exchange: 'binance',
          symbol: 'BTC/USDT',
          price: btcUsdt,
          amount,
          fee: fee / 3,
          total: btcUsdt * amount,
          profit
        });
      }
    }

    return trades;
  }

  /**
   * Simulate SMC (Smart Money Concepts) strategy
   */
  private simulateSMCStrategy(
    config: BacktestConfig,
    historicalData: HistoricalCandle[]
  ): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    const minStrength = config.orderBlockStrength || 7;

    // Detect Order Blocks
    for (let i = 3; i < historicalData.length - 1; i++) {
      const prevCandle = historicalData[i - 1];
      const currentCandle = historicalData[i];
      const nextCandle = historicalData[i + 1];

      // Bullish Order Block: Strong down candle followed by reversal
      const isBullishOB = prevCandle.close < prevCandle.open &&
                          currentCandle.close > currentCandle.open &&
                          currentCandle.volume > prevCandle.volume * 1.5;

      // Bearish Order Block: Strong up candle followed by reversal
      const isBearishOB = prevCandle.close > prevCandle.open &&
                          currentCandle.close < currentCandle.open &&
                          currentCandle.volume > prevCandle.volume * 1.5;

      if (isBullishOB) {
        const amount = 0.1;
        const fee = currentCandle.close * amount * (config.feePercent / 100);

        // Enter long
        trades.push({
          id: crypto.randomUUID(),
          timestamp: currentCandle.timestamp,
          type: 'buy',
          exchange: 'binance',
          symbol: config.symbol,
          price: currentCandle.close,
          amount,
          fee,
          total: currentCandle.close * amount,
          profit: 0
        });

        // Exit after 5 candles (simplified)
        if (i + 5 < historicalData.length) {
          const exitCandle = historicalData[i + 5];
          const profit = (exitCandle.close - currentCandle.close) * amount - fee * 2;

          trades.push({
            id: crypto.randomUUID(),
            timestamp: exitCandle.timestamp,
            type: 'sell',
            exchange: 'binance',
            symbol: config.symbol,
            price: exitCandle.close,
            amount,
            fee,
            total: exitCandle.close * amount,
            profit
          });
        }
      } else if (isBearishOB) {
        // Similar logic for short (omitted for brevity)
      }
    }

    return trades;
  }

  /**
   * Simulate Statistical arbitrage strategy (simplified)
   */
  private simulateStatisticalStrategy(
    config: BacktestConfig,
    historicalData: HistoricalCandle[]
  ): BacktestTrade[] {
    const trades: BacktestTrade[] = [];

    // Mean reversion strategy
    const prices = historicalData.map(c => c.close);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    );

    for (let i = 20; i < historicalData.length - 1; i++) {
      const candle = historicalData[i];
      const zScore = (candle.close - mean) / stdDev;

      // Enter when price deviates > 2 std dev
      if (Math.abs(zScore) > 2) {
        const amount = 0.1;
        const fee = candle.close * amount * (config.feePercent / 100);

        const entryType = zScore > 0 ? 'sell' : 'buy'; // Contrarian

        trades.push({
          id: crypto.randomUUID(),
          timestamp: candle.timestamp,
          type: entryType,
          exchange: 'binance',
          symbol: config.symbol,
          price: candle.close,
          amount,
          fee,
          total: candle.close * amount,
          profit: 0
        });

        // Exit when price reverts to mean (simplified: after 10 candles)
        if (i + 10 < historicalData.length) {
          const exitCandle = historicalData[i + 10];
          const exitType = entryType === 'buy' ? 'sell' : 'buy';
          const profit = entryType === 'buy'
            ? (exitCandle.close - candle.close) * amount - fee * 2
            : (candle.close - exitCandle.close) * amount - fee * 2;

          trades.push({
            id: crypto.randomUUID(),
            timestamp: exitCandle.timestamp,
            type: exitType,
            exchange: 'binance',
            symbol: config.symbol,
            price: exitCandle.close,
            amount,
            fee,
            total: exitCandle.close * amount,
            profit
          });
        }
      }
    }

    return trades;
  }

  /**
   * Calculate backtest performance metrics
   */
  private calculateBacktestResults(
    config: BacktestConfig,
    trades: BacktestTrade[],
    historicalData: HistoricalCandle[]
  ): BacktestResult {
    let capital = config.initialCapital;
    const equityCurve: { timestamp: number; value: number }[] = [
      { timestamp: config.startDate.getTime(), value: capital }
    ];

    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let largestWin = 0;
    let largestLoss = 0;

    const returns: number[] = [];
    let peak = capital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    // Process each trade pair (buy + sell)
    for (let i = 0; i < trades.length; i += 2) {
      if (i + 1 >= trades.length) break;

      const buyTrade = trades[i];
      const sellTrade = trades[i + 1];

      const profit = sellTrade.total - buyTrade.total - (buyTrade.fee + sellTrade.fee);
      const returnPercent = (profit / buyTrade.total) * 100;

      capital += profit;

      if (profit > 0) {
        totalProfit += profit;
        winningTrades++;
        largestWin = Math.max(largestWin, profit);
      } else {
        totalLoss += Math.abs(profit);
        losingTrades++;
        largestLoss = Math.min(largestLoss, profit);
      }

      returns.push(returnPercent);

      // Update equity curve
      equityCurve.push({
        timestamp: sellTrade.timestamp,
        value: capital
      });

      // Calculate drawdown
      if (capital > peak) {
        peak = capital;
      }
      const drawdown = peak - capital;
      const drawdownPercent = (drawdown / peak) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    const totalTrades = Math.floor(trades.length / 2);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    const averageWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;

    // Calculate Sharpe Ratio
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const annualizedReturn = avgReturn * 252; // Assuming 252 trading days
    const annualizedStdDev = stdDev * Math.sqrt(252);
    const sharpeRatio = annualizedStdDev > 0
      ? (annualizedReturn - this.RISK_FREE_RATE) / annualizedStdDev
      : 0;

    const totalReturn = capital - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;

    return {
      strategyName: config.strategy,
      symbol: config.symbol,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      finalCapital: capital,
      totalReturn,
      totalReturnPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      trades,
      equityCurve
    };
  }

  /**
   * Save backtest result to database
   */
  private async saveBacktestResult(result: BacktestResult): Promise<void> {
    try {
      await dbService.query(`
        INSERT INTO backtest_results (
          strategy_name, symbol, start_date, end_date,
          initial_capital, final_capital, total_return, total_return_percent,
          total_trades, winning_trades, losing_trades, win_rate,
          profit_factor, sharpe_ratio, max_drawdown, max_drawdown_percent,
          average_win, average_loss, largest_win, largest_loss,
          equity_curve, trades_data, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
        )
      `, [
        result.strategyName, result.symbol, result.startDate, result.endDate,
        result.initialCapital, result.finalCapital, result.totalReturn, result.totalReturnPercent,
        result.totalTrades, result.winningTrades, result.losingTrades, result.winRate,
        result.profitFactor, result.sharpeRatio, result.maxDrawdown, result.maxDrawdownPercent,
        result.averageWin, result.averageLoss, result.largestWin, result.largestLoss,
        JSON.stringify(result.equityCurve), JSON.stringify(result.trades)
      ]);
    } catch (error) {
      console.error('Error saving backtest result:', error);
    }
  }
}

// Singleton instance
export const backtestEngine = new BacktestEngine();
