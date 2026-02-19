/**
 * Triangular Arbitrage Path Visualizer
 * Interactive visualization of 3-step arbitrage paths
 * Shows: Path flow, profit calculation, execution steps
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Play
} from 'lucide-react';

interface TradingStep {
  fromCurrency: string;
  toCurrency: string;
  exchange: string;
  price: number;
  fee: number;
}

interface TriangularPath {
  id: string;
  baseCurrency: string;
  tradingPath: TradingStep[];
  exchanges: string[];
  expectedProfit: number;
  profitAmount: number;
  fees: {
    trading: number;
    network: number;
    slippage: number;
    total: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  executionTime: number;
  status: 'active' | 'expired' | 'executed';
  expiresAt: Date;
  createdAt: Date;
}

interface TriangularPathVisualizerProps {
  path: TriangularPath;
  onExecute?: (path: TriangularPath) => void;
}

export function TriangularPathVisualizer({
  path,
  onExecute
}: TriangularPathVisualizerProps) {
  const isExpired = new Date(path.expiresAt) < new Date();
  const isProfitable = path.expectedProfit > 0;

  // Build full currency path
  const fullPath = [path.baseCurrency, ...path.tradingPath.map(step => step.toCurrency)];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'HIGH': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'expired': return 'bg-gray-500/20 border-gray-500 text-gray-400';
      case 'executed': return 'bg-blue-500/20 border-blue-500 text-blue-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  return (
    <Card className={`bg-[#1a1a2e] border transition-all ${
      isExpired ? 'border-gray-600/30 opacity-60' :
      isProfitable ? 'border-[#00ff88]/20 hover:border-[#00ff88]/40' :
      'border-red-500/20 hover:border-red-500/40'
    }`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`border text-xs ${getStatusColor(path.status)}`}>
              {path.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {path.status === 'expired' && <AlertCircle className="h-3 w-3 mr-1" />}
              {path.status.toUpperCase()}
            </Badge>
            <Badge className={`border text-xs ${getRiskColor(path.riskLevel)}`}>
              RISK: {path.riskLevel}
            </Badge>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold font-mono ${
              isProfitable ? 'text-[#00ff88]' : 'text-red-400'
            }`}>
              {isProfitable ? '+' : ''}{path.expectedProfit.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              ${path.profitAmount.toFixed(2)} profit
            </div>
          </div>
        </div>

        {/* Trading Path Visualization */}
        <div className="mb-4">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Trading Path</h4>
          <div className="space-y-2">
            {path.tradingPath.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#0d0d1a] rounded-lg p-3 border border-[#2a2a3e]"
              >
                <div className="flex items-center justify-between">
                  {/* Step Number */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 border border-[#00ff88] flex items-center justify-center">
                      <span className="text-[#00ff88] font-bold text-sm">{index + 1}</span>
                    </div>

                    {/* Currency Flow */}
                    <div className="flex items-center gap-2">
                      <div className="text-white font-mono font-bold">
                        {step.fromCurrency}
                      </div>
                      <ArrowRight className="h-4 w-4 text-cyan-400" />
                      <div className="text-cyan-400 font-mono font-bold">
                        {step.toCurrency}
                      </div>
                    </div>
                  </div>

                  {/* Exchange & Fee */}
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{step.exchange}</div>
                    <div className="text-xs text-gray-500">
                      Fee: {(step.fee * 100).toFixed(3)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Final Return Arrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: path.tradingPath.length * 0.1 + 0.2 }}
            className="flex items-center justify-center my-2"
          >
            <div className="flex items-center gap-2 text-gray-500">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
              <TrendingUp className={`h-4 w-4 ${isProfitable ? 'text-[#00ff88]' : 'text-red-400'}`} />
              <span className="text-xs font-mono">
                Back to {path.baseCurrency}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            </div>
          </motion.div>

          {/* Path Summary */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 bg-[#0d0d1a] px-3 py-1 rounded-full border border-[#2a2a3e]">
              {fullPath.join(' → ')}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Confidence</div>
            <div className="text-cyan-400 font-mono font-bold">{path.confidence}%</div>
          </div>
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Exec. Time</div>
            <div className="text-orange-400 font-mono font-bold">{path.executionTime}s</div>
          </div>
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Total Fees</div>
            <div className="text-red-400 font-mono font-bold">${path.fees.total.toFixed(2)}</div>
          </div>
          <div className="bg-[#0d0d1a] rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Exchanges</div>
            <div className="text-purple-400 font-mono font-bold">{path.exchanges.length}</div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="bg-[#0d0d1a] rounded p-3 mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Fee Breakdown</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Trading Fees</span>
              <span className="text-red-400 font-mono">${path.fees.trading.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Network Fees</span>
              <span className="text-red-400 font-mono">${path.fees.network.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Est. Slippage</span>
              <span className="text-red-400 font-mono">${path.fees.slippage.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#2a2a3e]">
              <span className="text-gray-400 font-semibold">Total Cost</span>
              <span className="text-red-400 font-mono font-bold">${path.fees.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {path.status === 'active' && !isExpired && (
            <Button
              onClick={() => onExecute?.(path)}
              disabled={!isProfitable}
              className={`flex-1 ${
                isProfitable
                  ? 'bg-[#00ff88] hover:bg-[#00ff88]/90 text-black'
                  : 'bg-gray-700 cursor-not-allowed'
              }`}
            >
              <Play className="h-4 w-4 mr-2" />
              {isProfitable ? 'Execute (Paper Trade)' : 'Not Profitable'}
            </Button>
          )}
          {(path.status === 'expired' || isExpired) && (
            <div className="flex-1 text-center py-2 text-gray-500 text-sm">
              <Clock className="h-4 w-4 inline mr-1" />
              Expired
            </div>
          )}
          {path.status === 'executed' && (
            <div className="flex-1 text-center py-2 text-blue-400 text-sm">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Executed
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          Created: {new Date(path.createdAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
