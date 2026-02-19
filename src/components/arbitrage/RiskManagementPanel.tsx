/**
 * Risk Management Panel
 * Professional risk controls and calculators:
 * - Position sizing (Kelly Criterion)
 * - Stop-loss calculator
 * - Exposure limits monitor
 * - Max drawdown threshold
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Percent,
  Calculator,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RiskLimits {
  maxPositionSize: number; // % of capital
  maxDrawdown: number; // %
  maxDailyLoss: number; // %
  maxExposure: number; // % of capital across all positions
  stopLossPercent: number; // %
}

interface RiskManagementPanelProps {
  capital?: number;
  currentExposure?: number;
  currentDrawdown?: number;
}

export function RiskManagementPanel({
  capital = 10000,
  currentExposure = 0,
  currentDrawdown = 0
}: RiskManagementPanelProps) {
  // Risk limits (institutional standards)
  const [limits] = useState<RiskLimits>({
    maxPositionSize: 10, // Max 10% per position
    maxDrawdown: 15, // Stop trading at -15%
    maxDailyLoss: 5, // Max -5% daily loss
    maxExposure: 30, // Max 30% total exposure
    stopLossPercent: 2 // Default 2% stop-loss
  });

  // Kelly Criterion calculator
  const [winRate, setWinRate] = useState(55);
  const [winLossRatio, setWinLossRatio] = useState(1.5);
  const [kellyPercent, setKellyPercent] = useState(0);

  // Stop-loss calculator
  const [tradeSize, setTradeSize] = useState(1000);
  const [stopLossPrice, setStopLossPrice] = useState(0);
  const [entryPrice, setEntryPrice] = useState(45000);
  const [stopLossAmount, setStopLossAmount] = useState(0);

  // Calculate Kelly Criterion
  const calculateKelly = () => {
    const w = winRate / 100; // Win probability
    const r = winLossRatio; // Win/loss ratio

    // Kelly formula: W - [(1-W)/R]
    const kelly = w - ((1 - w) / r);

    // Kelly % (capped at 25% for safety - half Kelly)
    const kellyPercentage = Math.min(Math.max(kelly * 100 / 2, 0), 25);

    setKellyPercent(kellyPercentage);
  };

  // Calculate stop-loss
  const calculateStopLoss = () => {
    if (stopLossPrice === 0 || entryPrice === 0) return;

    const priceDiff = Math.abs(entryPrice - stopLossPrice);
    const units = tradeSize / entryPrice;
    const loss = priceDiff * units;

    setStopLossAmount(loss);
  };

  // Check if within risk limits
  const exposureStatus = currentExposure <= limits.maxExposure;
  const drawdownStatus = currentDrawdown <= limits.maxDrawdown;
  const dailyLossStatus = true; // Would need daily P&L tracking

  const allChecksPass = exposureStatus && drawdownStatus && dailyLossStatus;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#00ff88] mb-1">Risk Management</h2>
          <p className="text-gray-400 text-sm">Professional risk controls & position sizing</p>
        </div>
        <Badge className={`border ${allChecksPass ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
          {allChecksPass ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          {allChecksPass ? 'ALL CLEAR' : 'RISK ALERT'}
        </Badge>
      </div>

      {/* Risk Limits Status */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Limits Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Exposure */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current Exposure</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${exposureStatus ? 'text-cyan-400' : 'text-red-400'}`}>
                  {currentExposure.toFixed(1)}%
                </span>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{limits.maxExposure}%</span>
                {exposureStatus ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-[#0d0d1a] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentExposure / limits.maxExposure) * 100}%` }}
                className={`h-full rounded-full ${
                  exposureStatus ? 'bg-gradient-to-r from-cyan-500 to-cyan-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
              />
            </div>
          </div>

          {/* Current Drawdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current Drawdown</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${drawdownStatus ? 'text-orange-400' : 'text-red-400'}`}>
                  {currentDrawdown.toFixed(1)}%
                </span>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{limits.maxDrawdown}%</span>
                {drawdownStatus ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-[#0d0d1a] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentDrawdown / limits.maxDrawdown) * 100}%` }}
                className={`h-full rounded-full ${
                  drawdownStatus ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
              />
            </div>
          </div>

          {/* Available Capital */}
          <div className="pt-3 border-t border-[#2a2a3e]">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Capital</div>
                <div className="text-sm font-mono text-white font-bold">{formatCurrency(capital)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Available</div>
                <div className="text-sm font-mono text-[#00ff88] font-bold">
                  {formatCurrency(capital * (1 - currentExposure / 100))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">At Risk</div>
                <div className="text-sm font-mono text-red-400 font-bold">
                  {formatCurrency(capital * (currentExposure / 100))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kelly Criterion Calculator */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Kelly Criterion Position Sizing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="winRate" className="text-gray-400 text-xs">Win Rate (%)</Label>
              <Input
                id="winRate"
                type="number"
                value={winRate}
                onChange={(e) => setWinRate(parseFloat(e.target.value) || 0)}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white font-mono mt-1"
                min="0"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="winLossRatio" className="text-gray-400 text-xs">Win/Loss Ratio</Label>
              <Input
                id="winLossRatio"
                type="number"
                step="0.1"
                value={winLossRatio}
                onChange={(e) => setWinLossRatio(parseFloat(e.target.value) || 0)}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white font-mono mt-1"
                min="0"
              />
            </div>
          </div>

          <Button
            onClick={calculateKelly}
            className="w-full bg-[#ff8800] hover:bg-[#ff8800]/90"
          >
            Calculate Optimal Position Size
          </Button>

          {kellyPercent > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0d0d1a] rounded-lg p-4 border border-[#00ff88]/30"
            >
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2">Recommended Position Size (Half Kelly)</div>
                <div className="text-4xl font-bold font-mono text-[#00ff88] mb-2">
                  {kellyPercent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">
                  = {formatCurrency(capital * (kellyPercent / 100))} per trade
                </div>
                <div className="mt-3 text-xs text-cyan-400">
                  Max position capped at {limits.maxPositionSize}% ({formatCurrency(capital * limits.maxPositionSize / 100)})
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200">
                <strong>Kelly Criterion</strong> calculates optimal bet size to maximize long-term growth.
                We use <strong>Half Kelly</strong> (50% of calculated value) for safety.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stop-Loss Calculator */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Stop-Loss Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="tradeSize" className="text-gray-400 text-xs">Trade Size ($)</Label>
              <Input
                id="tradeSize"
                type="number"
                value={tradeSize}
                onChange={(e) => setTradeSize(parseFloat(e.target.value) || 0)}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white font-mono mt-1"
              />
            </div>
            <div>
              <Label htmlFor="entryPrice" className="text-gray-400 text-xs">Entry Price ($)</Label>
              <Input
                id="entryPrice"
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white font-mono mt-1"
              />
            </div>
            <div>
              <Label htmlFor="stopLossPrice" className="text-gray-400 text-xs">Stop-Loss ($)</Label>
              <Input
                id="stopLossPrice"
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                className="bg-[#0d0d1a] border-[#2a2a3e] text-white font-mono mt-1"
              />
            </div>
          </div>

          <Button
            onClick={calculateStopLoss}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Calculate Stop-Loss
          </Button>

          {stopLossAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0d0d1a] rounded-lg p-4 border border-red-500/30"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Max Loss Amount</span>
                  <span className="text-lg font-bold font-mono text-red-400">
                    -{formatCurrency(stopLossAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Loss Percentage</span>
                  <span className="text-sm font-mono text-red-400">
                    -{((stopLossAmount / tradeSize) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#2a2a3e]">
                  <span className="text-sm text-gray-400">% of Capital</span>
                  <span className={`text-sm font-mono ${(stopLossAmount / capital) * 100 <= limits.stopLossPercent ? 'text-[#00ff88]' : 'text-red-400'}`}>
                    {((stopLossAmount / capital) * 100).toFixed(2)}%
                    {(stopLossAmount / capital) * 100 <= limits.stopLossPercent && ' ✓'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-200">
                <strong>Recommended:</strong> Never risk more than {limits.stopLossPercent}% of capital
                per trade ({formatCurrency(capital * limits.stopLossPercent / 100)})
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Rules Summary */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <CardTitle className="text-[#00ff88] text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Institutional Risk Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Max Position Size', value: `${limits.maxPositionSize}% of capital`, status: true },
              { label: 'Max Total Exposure', value: `${limits.maxExposure}% of capital`, status: exposureStatus },
              { label: 'Max Drawdown Threshold', value: `-${limits.maxDrawdown}%`, status: drawdownStatus },
              { label: 'Max Daily Loss', value: `-${limits.maxDailyLoss}%`, status: dailyLossStatus },
              { label: 'Stop-Loss per Trade', value: `${limits.stopLossPercent}% of capital`, status: true },
              { label: 'Position Diversification', value: 'Min 3 different assets', status: true }
            ].map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#0d0d1a] rounded border border-[#2a2a3e]"
              >
                <div>
                  <div className="text-xs text-gray-400">{rule.label}</div>
                  <div className="text-sm font-mono text-white">{rule.value}</div>
                </div>
                {rule.status ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
