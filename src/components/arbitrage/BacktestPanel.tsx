/**
 * Backtest Panel Component
 * Run historical backtests on arbitrage strategies
 * Visualize results with equity curve and performance metrics
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  PlayCircle,
  StopCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  equityCurve: { timestamp: number; value: number }[];
}

interface BacktestPanelProps {
  onBacktestComplete?: (result: BacktestResult) => void;
}

export function BacktestPanel({ onBacktestComplete }: BacktestPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Backtest configuration
  const [config, setConfig] = useState({
    strategy: 'cex-dex' as 'cex-dex' | 'triangular' | 'smc' | 'statistical',
    symbol: 'BTC/USDT',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    initialCapital: 10000,
    feePercent: 0.1,
    minSpreadPercent: 0.5,
    minProfitPercent: 0.3,
    orderBlockStrength: 7
  });

  const runBacktest = async () => {
    setIsRunning(true);

    try {
      const response = await fetch('/api/arbitrage/backtest/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Backtest failed');
      }

      const data = await response.json();
      setResult(data);

      if (onBacktestComplete) {
        onBacktestComplete(data);
      }
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Backtest failed. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'cex-dex': return 'bg-cyan-500/20 border-cyan-500 text-cyan-400';
      case 'triangular': return 'bg-purple-500/20 border-purple-500 text-purple-400';
      case 'smc': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'statistical': return 'bg-pink-500/20 border-pink-500 text-pink-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const getRatingColor = (value: number, metric: string) => {
    if (metric === 'sharpe') {
      if (value >= 2) return 'text-[#00ff88]';
      if (value >= 1) return 'text-cyan-400';
      if (value >= 0.5) return 'text-yellow-400';
      return 'text-red-400';
    } else if (metric === 'winRate') {
      if (value >= 60) return 'text-[#00ff88]';
      if (value >= 50) return 'text-cyan-400';
      if (value >= 40) return 'text-yellow-400';
      return 'text-red-400';
    } else if (metric === 'profitFactor') {
      if (value >= 2) return 'text-[#00ff88]';
      if (value >= 1.5) return 'text-cyan-400';
      if (value >= 1) return 'text-yellow-400';
      return 'text-red-400';
    }
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Backtest Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Strategy Selection */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Strategy</label>
              <select
                value={config.strategy}
                onChange={(e) => setConfig(prev => ({ ...prev, strategy: e.target.value as any }))}
                className="w-full bg-[#0d0d1a] border border-[#2a2a3e] rounded px-3 py-2 text-sm text-white"
                disabled={isRunning}
              >
                <option value="cex-dex">CEX-DEX Arbitrage</option>
                <option value="triangular">Triangular Arbitrage</option>
                <option value="smc">Smart Money Concepts</option>
                <option value="statistical">Statistical Arbitrage</option>
              </select>
            </div>

            {/* Symbol */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Symbol</label>
              <Input
                value={config.symbol}
                onChange={(e) => setConfig(prev => ({ ...prev, symbol: e.target.value }))}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>

            {/* Initial Capital */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Initial Capital ($)</label>
              <Input
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: parseFloat(e.target.value) }))}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Start Date */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Start Date</label>
              <Input
                type="date"
                value={config.startDate.toISOString().split('T')[0]}
                onChange={(e) => setConfig(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">End Date</label>
              <Input
                type="date"
                value={config.endDate.toISOString().split('T')[0]}
                onChange={(e) => setConfig(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>

            {/* Fee Percent */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Fee %</label>
              <Input
                type="number"
                step="0.01"
                value={config.feePercent}
                onChange={(e) => setConfig(prev => ({ ...prev, feePercent: parseFloat(e.target.value) }))}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>

            {/* Strategy-specific parameter */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">
                {config.strategy === 'cex-dex' ? 'Min Spread %' :
                 config.strategy === 'triangular' ? 'Min Profit %' :
                 config.strategy === 'smc' ? 'OB Strength' : 'Threshold'}
              </label>
              <Input
                type="number"
                step="0.1"
                value={
                  config.strategy === 'cex-dex' ? config.minSpreadPercent :
                  config.strategy === 'triangular' ? config.minProfitPercent :
                  config.orderBlockStrength
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (config.strategy === 'cex-dex') {
                    setConfig(prev => ({ ...prev, minSpreadPercent: value }));
                  } else if (config.strategy === 'triangular') {
                    setConfig(prev => ({ ...prev, minProfitPercent: value }));
                  } else {
                    setConfig(prev => ({ ...prev, orderBlockStrength: value }));
                  }
                }}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={runBacktest}
            disabled={isRunning}
            className={`w-full ${isRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-[#00ff88] hover:bg-[#00ff88]/90 text-black'}`}
          >
            {isRunning ? (
              <>
                <StopCircle className="h-4 w-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#00ff88] text-sm">Backtest Results</CardTitle>
                <Badge className={`${getStrategyColor(result.strategyName)} border text-xs`}>
                  {result.strategyName.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
                  <div className="text-xs text-gray-500 mb-1">Period</div>
                  <div className="text-xs font-mono text-white">
                    {formatDate(result.startDate)} - {formatDate(result.endDate)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
                  <div className="text-xs text-gray-500 mb-1">Initial Capital</div>
                  <div className="text-sm font-mono text-cyan-400 font-bold">
                    {formatCurrency(result.initialCapital)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
                  <div className="text-xs text-gray-500 mb-1">Final Capital</div>
                  <div className="text-sm font-mono text-[#00ff88] font-bold">
                    {formatCurrency(result.finalCapital)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
                  <div className="text-xs text-gray-500 mb-1">Total Return</div>
                  <div className={`text-sm font-mono font-bold ${result.totalReturn >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                    {formatCurrency(result.totalReturn)}
                    <span className="text-xs ml-1">({formatPercent(result.totalReturnPercent)})</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Sharpe Ratio</span>
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className={`text-2xl font-mono font-bold ${getRatingColor(result.sharpeRatio, 'sharpe')}`}>
                    {result.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.sharpeRatio >= 2 ? 'Excellent' :
                     result.sharpeRatio >= 1 ? 'Good' :
                     result.sharpeRatio >= 0.5 ? 'Fair' : 'Poor'}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Win Rate</span>
                    <TrendingUp className="h-4 w-4 text-[#00ff88]" />
                  </div>
                  <div className={`text-2xl font-mono font-bold ${getRatingColor(result.winRate, 'winRate')}`}>
                    {result.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.winningTrades}W / {result.losingTrades}L
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Profit Factor</span>
                    <DollarSign className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className={`text-2xl font-mono font-bold ${getRatingColor(result.profitFactor, 'profitFactor')}`}>
                    {result.profitFactor.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.profitFactor >= 2 ? 'Excellent' :
                     result.profitFactor >= 1.5 ? 'Good' :
                     result.profitFactor >= 1 ? 'Fair' : 'Poor'}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Metrics */}
          <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
            <CardHeader>
              <CardTitle className="text-[#00ff88] text-sm">Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3">
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Total Trades</div>
                  <div className="text-sm font-mono text-white font-bold">
                    {result.totalTrades}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Avg Win</div>
                  <div className="text-sm font-mono text-green-400 font-bold">
                    {formatCurrency(result.averageWin)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Avg Loss</div>
                  <div className="text-sm font-mono text-red-400 font-bold">
                    {formatCurrency(result.averageLoss)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Largest Win</div>
                  <div className="text-sm font-mono text-green-400 font-bold">
                    {formatCurrency(result.largestWin)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Largest Loss</div>
                  <div className="text-sm font-mono text-red-400 font-bold">
                    {formatCurrency(result.largestLoss)}
                  </div>
                </div>
                <div className="bg-[#0d0d1a] rounded p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">Max Drawdown</div>
                  <div className="text-sm font-mono text-orange-400 font-bold">
                    {formatPercent(result.maxDrawdownPercent)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity Curve (simplified visualization) */}
          <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
            <CardHeader>
              <CardTitle className="text-[#00ff88] text-sm">Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e] h-48 flex items-end gap-1">
                {result.equityCurve.slice(0, 50).map((point, index) => {
                  const heightPercent = ((point.value - result.initialCapital) / result.initialCapital) * 100;
                  const isPositive = heightPercent >= 0;
                  const barHeight = Math.max(Math.abs(heightPercent), 1);

                  return (
                    <div
                      key={index}
                      className={`flex-1 ${isPositive ? 'bg-[#00ff88]/60' : 'bg-red-500/60'} rounded-t`}
                      style={{ height: `${Math.min(barHeight, 100)}%` }}
                      title={`${formatCurrency(point.value)} (${formatPercent(heightPercent)})`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                Capital growth over {result.totalTrades} trades
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-200">
            <strong>Backtesting</strong> replays your strategy on historical data to validate performance.
            Results are based on simulated execution and may differ from live trading due to slippage,
            latency, and changing market conditions. Use backtests to refine strategies before deploying.
          </div>
        </div>
      </div>
    </div>
  );
}
