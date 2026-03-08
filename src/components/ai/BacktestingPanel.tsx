'use client';

import { useState, useEffect } from 'react';
import { useBacktesting } from '@/hooks/useBacktesting';
import { strategies } from '@/lib/backtesting/strategies';
import { Play, Square, TrendingUp, TrendingDown, Activity } from 'lucide-react';

function computeRSI(prices: number[], period = 14): number[] {
  const rsi: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) { rsi.push(50); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = prices[j] - prices[j - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

function computeEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export default function BacktestingPanel() {
  const [selectedStrategy, setSelectedStrategy] = useState(strategies[0] ?? null);
  const { runBacktest, results, isRunning, progress, error, stop } = useBacktesting();
  const [klineData, setKlineData] = useState<any[] | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const res = await fetch('/api/cypher-ai/dashboard-data', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (cancelled || !data.klines) return;

        const klines: number[][] = data.klines;
        const closes = klines.map(k => parseFloat(String(k[4])));
        const opens = klines.map(k => parseFloat(String(k[1])));
        const highs = klines.map(k => parseFloat(String(k[2])));
        const lows = klines.map(k => parseFloat(String(k[3])));
        const volumes = klines.map(k => parseFloat(String(k[5])));

        // Compute indicators
        const rsi = computeRSI(closes);
        const ema12 = computeEMA(closes, 12);
        const ema26 = computeEMA(closes, 26);
        const macd = ema12.map((v, i) => v - ema26[i]);
        const signal = computeEMA(macd, 9);
        const histogram = macd.map((v, i) => v - signal[i]);

        // SMA 20 / 50
        const sma = (prices: number[], p: number) => prices.map((_, i) => {
          if (i < p - 1) return prices[i];
          const slice = prices.slice(i - p + 1, i + 1);
          return slice.reduce((a, b) => a + b, 0) / p;
        });
        const ma20 = sma(closes, 20);
        const ma50 = sma(closes, 50);

        // Bollinger Bands (20-period, 2 std dev)
        const bb = closes.map((_, i) => {
          if (i < 19) return { upper: closes[i] * 1.02, lower: closes[i] * 0.98 };
          const slice = closes.slice(i - 19, i + 1);
          const mean = slice.reduce((a, b) => a + b, 0) / 20;
          const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
          return { upper: mean + 2 * std, lower: mean - 2 * std };
        });

        // Volume MA
        const volumeMA = sma(volumes, 20);

        const formatted = klines.map((k, i) => ({
          timestamp: k[0],
          open: opens[i],
          high: highs[i],
          low: lows[i],
          close: closes[i],
          volume: volumes[i],
          ma20: ma20[i],
          ma50: ma50[i],
          rsi: rsi[i],
          macd: macd[i],
          signal: signal[i],
          histogram: histogram[i],
          upperBand: bb[i].upper,
          lowerBand: bb[i].lower,
          volumeMA: volumeMA[i],
        }));

        setKlineData(formatted);
        setLoadingData(false);
      } catch {
        if (!cancelled) setLoadingData(false);
      }
    };

    fetchData();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const handleRunBacktest = async () => {
    if (!klineData || !selectedStrategy) return;
    await runBacktest(selectedStrategy, klineData);
  };

  if (!selectedStrategy) {
    return (
      <div className="text-sm text-gray-400">No strategies available.</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strategy Selector */}
      <div className="bg-zinc-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Select Strategy</h3>
        <select
          value={selectedStrategy.name}
          onChange={(e) => {
            const strategy = strategies.find(s => s.name === e.target.value);
            if (strategy) setSelectedStrategy(strategy);
          }}
          className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
          disabled={isRunning}
        >
          {strategies.map(strategy => (
            <option key={strategy.name} value={strategy.name}>
              {strategy.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-zinc-400 mt-2">{selectedStrategy.description}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={isRunning ? stop : handleRunBacktest}
          disabled={loadingData || !klineData}
          className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700'
              : loadingData
              ? 'bg-zinc-600 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              Stop Backtest
            </>
          ) : loadingData ? (
            'Loading data...'
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Backtest
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Processing...</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Backtest Results
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-zinc-400">Total Return</p>
              <p className={`text-xl font-bold ${
                results.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {results.totalReturn >= 0 ? '+' : ''}{results.totalReturn.toFixed(2)}%
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Win Rate</p>
              <p className="text-xl font-bold">{results.winRate.toFixed(1)}%</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Total Trades</p>
              <p className="text-xl font-bold">{results.totalTrades}</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Sharpe Ratio</p>
              <p className="text-xl font-bold">{results.sharpeRatio.toFixed(2)}</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Max Drawdown</p>
              <p className="text-xl font-bold text-red-500">
                -{results.maxDrawdown.toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Profit Factor</p>
              <p className="text-xl font-bold">{results.profitFactor.toFixed(2)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Profitable Trades</span>
              <span className="text-green-500">{results.profitableTrades}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-zinc-400">Average Profit</span>
              <span className="text-green-500">+${results.averageProfit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-zinc-400">Average Loss</span>
              <span className="text-red-500">-${results.averageLoss.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2">
            * Backtested on real Binance BTCUSDT hourly data (168 candles)
          </div>
        </div>
      )}
    </div>
  );
}
