/**
 * Paper Trading Panel Component
 * Simulates trade execution without real funds
 * Tracks virtual portfolio and P&L
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PaperTrade {
  id: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  exchange: string;
  symbol: string;
  price: number;
  amount: number;
  fee: number;
  total: number;
  status: 'pending' | 'filled' | 'cancelled';
}

interface Position {
  symbol: string;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface PaperTradingPanelProps {
  initialBalance?: number;
  onTradeExecuted?: (trade: PaperTrade) => void;
}

export function PaperTradingPanel({
  initialBalance = 10000,
  onTradeExecuted
}: PaperTradingPanelProps) {
  const [isActive, setIsActive] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [startingBalance] = useState(initialBalance);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Trade form state
  const [tradeForm, setTradeForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    exchange: 'binance',
    symbol: 'BTC/USDT',
    price: 45000,
    amount: 0.01
  });

  // Performance metrics
  const [metrics, setMetrics] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    profitFactor: 0,
    roi: 0
  });

  // Calculate total portfolio value
  const portfolioValue = balance + positions.reduce((sum, pos) =>
    sum + (pos.amount * pos.currentPrice), 0
  );

  const totalPnL = portfolioValue - startingBalance;
  const totalPnLPercent = (totalPnL / startingBalance) * 100;

  // Execute paper trade
  const executePaperTrade = () => {
    if (!isActive) {
      alert('Please start paper trading session first');
      return;
    }

    const { type, exchange, symbol, price, amount } = tradeForm;
    const fee = price * amount * 0.001; // 0.1% fee
    const total = price * amount + (type === 'buy' ? fee : -fee);

    // Check balance for buys
    if (type === 'buy' && total > balance) {
      alert('Insufficient balance');
      return;
    }

    // Create trade
    const newTrade: PaperTrade = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      exchange,
      symbol,
      price,
      amount,
      fee,
      total,
      status: 'filled'
    };

    // Update balance
    if (type === 'buy') {
      setBalance(prev => prev - total);

      // Update or create position
      setPositions(prev => {
        const existing = prev.find(p => p.symbol === symbol);
        if (existing) {
          const newAmount = existing.amount + amount;
          const newAvgPrice = ((existing.avgPrice * existing.amount) + (price * amount)) / newAmount;
          return prev.map(p => p.symbol === symbol ? {
            ...p,
            amount: newAmount,
            avgPrice: newAvgPrice,
            currentPrice: price,
            unrealizedPnL: (price - newAvgPrice) * newAmount,
            unrealizedPnLPercent: ((price - newAvgPrice) / newAvgPrice) * 100
          } : p);
        } else {
          return [...prev, {
            symbol,
            amount,
            avgPrice: price,
            currentPrice: price,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0
          }];
        }
      });
    } else {
      // Sell: close or reduce position
      const position = positions.find(p => p.symbol === symbol);
      if (!position || position.amount < amount) {
        alert('Insufficient position to sell');
        return;
      }

      setBalance(prev => prev + total);

      // Calculate realized P&L
      const realizedPnL = (price - position.avgPrice) * amount - fee;

      setPositions(prev => {
        const updated = prev.map(p => {
          if (p.symbol === symbol) {
            const newAmount = p.amount - amount;
            if (newAmount <= 0) {
              return null; // Remove position
            }
            return {
              ...p,
              amount: newAmount,
              unrealizedPnL: (price - p.avgPrice) * newAmount,
              unrealizedPnLPercent: ((price - p.avgPrice) / p.avgPrice) * 100
            };
          }
          return p;
        }).filter(p => p !== null) as Position[];
        return updated;
      });

      // Update metrics
      setMetrics(prev => {
        const isWin = realizedPnL > 0;
        const totalTrades = prev.totalTrades + 1;
        const winningTrades = prev.winningTrades + (isWin ? 1 : 0);
        const losingTrades = prev.losingTrades + (isWin ? 0 : 1);
        const totalProfit = prev.totalProfit + (isWin ? realizedPnL : 0);
        const totalLoss = prev.totalLoss + (isWin ? 0 : Math.abs(realizedPnL));
        const winRate = (winningTrades / totalTrades) * 100;
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
        const roi = ((portfolioValue - startingBalance) / startingBalance) * 100;

        return {
          totalTrades,
          winningTrades,
          losingTrades,
          totalProfit,
          totalLoss,
          winRate,
          profitFactor,
          roi
        };
      });
    }

    // Add trade to history
    setTrades(prev => [newTrade, ...prev].slice(0, 50)); // Keep last 50 trades

    // Callback
    if (onTradeExecuted) {
      onTradeExecuted(newTrade);
    }
  };

  const resetSession = () => {
    if (confirm('Reset paper trading session? This will clear all trades and positions.')) {
      setBalance(startingBalance);
      setTrades([]);
      setPositions([]);
      setMetrics({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        profitFactor: 0,
        roi: 0
      });
      setIsActive(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Session Control */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#00ff88] flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Paper Trading Session
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={isActive ? 'bg-green-500/20 border-green-500 text-green-400 border' : 'bg-gray-500/20 border-gray-500 text-gray-400 border'}>
                {isActive ? 'ACTIVE' : 'PAUSED'}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className={isActive ? 'border-yellow-500 hover:border-yellow-400 h-7' : 'border-green-500 hover:border-green-400 h-7'}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500 hover:border-red-400 h-7"
                onClick={resetSession}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Portfolio Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="text-xs text-gray-500 mb-1">Cash Balance</div>
              <div className="text-lg font-mono text-cyan-400 font-bold">
                {formatCurrency(balance)}
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="text-xs text-gray-500 mb-1">Portfolio Value</div>
              <div className="text-lg font-mono text-[#00ff88] font-bold">
                {formatCurrency(portfolioValue)}
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="text-xs text-gray-500 mb-1">Total P&L</div>
              <div className={`text-lg font-mono font-bold ${totalPnL >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                {formatCurrency(totalPnL)}
                <span className="text-xs ml-1">({formatPercent(totalPnLPercent)})</span>
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="text-xs text-gray-500 mb-1">Total Trades</div>
              <div className="text-lg font-mono text-orange-400 font-bold">
                {metrics.totalTrades}
              </div>
            </div>
          </div>

          {/* Trade Execution Form */}
          <div className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e]">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Execute Paper Trade</h3>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <select
                  value={tradeForm.type}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1.5 text-sm text-white"
                  disabled={!isActive}
                >
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Symbol</label>
                <Input
                  value={tradeForm.symbol}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
                  className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8"
                  disabled={!isActive}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Price</label>
                <Input
                  type="number"
                  value={tradeForm.price}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8"
                  disabled={!isActive}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount</label>
                <Input
                  type="number"
                  step="0.001"
                  value={tradeForm.amount}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8"
                  disabled={!isActive}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={executePaperTrade}
                  className={`w-full h-8 ${tradeForm.type === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={!isActive}
                >
                  {tradeForm.type === 'buy' ? 'BUY' : 'SELL'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-sm">Open Positions ({positions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No open positions. Execute a BUY trade to open a position.
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((pos, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm text-white font-bold">{pos.symbol}</div>
                      <div className="text-xs text-gray-500">
                        Amount: {pos.amount.toFixed(4)} @ Avg: ${pos.avgPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold ${pos.unrealizedPnL >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                        {formatCurrency(pos.unrealizedPnL)}
                      </div>
                      <div className={`text-xs ${pos.unrealizedPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercent(pos.unrealizedPnLPercent)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-sm">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No trades executed yet. Start by executing your first paper trade.
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between bg-[#0d0d1a] rounded px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={trade.type === 'buy' ? 'bg-green-500/20 border-green-500 text-green-400 border text-[10px]' : 'bg-red-500/20 border-red-500 text-red-400 border text-[10px]'}>
                      {trade.type.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-white">{trade.symbol}</span>
                    <span className="text-gray-500">{trade.amount.toFixed(4)} @ ${trade.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{formatCurrency(trade.total)}</span>
                    <span className="text-gray-500 text-[10px]">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-sm">Session Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0d0d1a] rounded p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Win Rate</div>
              <div className="text-lg font-mono text-cyan-400 font-bold">
                {metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.winningTrades}W / {metrics.losingTrades}L
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Profit Factor</div>
              <div className="text-lg font-mono text-[#00ff88] font-bold">
                {metrics.profitFactor.toFixed(2)}
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Profit</div>
              <div className="text-lg font-mono text-green-400 font-bold">
                {formatCurrency(metrics.totalProfit)}
              </div>
            </div>
            <div className="bg-[#0d0d1a] rounded p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Loss</div>
              <div className="text-lg font-mono text-red-400 font-bold">
                {formatCurrency(metrics.totalLoss)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d0d1a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2a3e;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3a3a4e;
        }
      `}</style>
    </div>
  );
}
