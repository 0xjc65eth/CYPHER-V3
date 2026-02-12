'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface Opportunity {
  buyFrom: string;
  sellTo: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  buyFee: number;
  sellFee: number;
  netProfitPercent: number;
  estimatedProfitPer1BTC: number;
}

// Also support legacy RealOpportunity format
interface RealOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  risk: 'low' | 'medium' | 'high';
  fees: { buyFee: number; sellFee: number; totalFeePercent: number };
  gasEstimate?: { cost: number; currency: string };
}

interface ProfitCalculatorProps {
  opportunities?: RealOpportunity[];
  arbOpportunities?: Opportunity[];
  fees?: Record<string, number>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000];

export default function ProfitCalculator({ opportunities, arbOpportunities, fees }: ProfitCalculatorProps) {
  const [tradeSize, setTradeSize] = useState(1000);

  // Normalize to common format
  const normalizedOpps = useMemo(() => {
    if (arbOpportunities && arbOpportunities.length > 0) {
      return arbOpportunities.map(opp => ({
        buyFrom: opp.buyFrom,
        sellTo: opp.sellTo,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        buyFee: opp.buyFee,
        sellFee: opp.sellFee,
        netProfitPercent: opp.netProfitPercent,
      }));
    }
    if (opportunities && opportunities.length > 0) {
      return opportunities.map(opp => ({
        buyFrom: opp.buyExchange,
        sellTo: opp.sellExchange,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        buyFee: opp.fees?.buyFee || 0.001,
        sellFee: opp.fees?.sellFee || 0.001,
        netProfitPercent: opp.profitPercent,
      }));
    }
    return [];
  }, [arbOpportunities, opportunities]);

  const calculations = useMemo(() => {
    return normalizedOpps.slice(0, 10).map(opp => {
      const quantity = tradeSize / opp.buyPrice;
      const buyCost = tradeSize;
      const buyFee = buyCost * opp.buyFee;
      const sellRevenue = quantity * opp.sellPrice;
      const sellFee = sellRevenue * opp.sellFee;
      const grossProfit = sellRevenue - buyCost;
      const totalFees = buyFee + sellFee;
      const netProfit = grossProfit - totalFees;
      const roi = buyCost > 0 ? (netProfit / buyCost) * 100 : 0;

      return {
        buyFrom: opp.buyFrom,
        sellTo: opp.sellTo,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        buyCost,
        buyFee,
        sellRevenue,
        sellFee,
        grossProfit,
        totalFees,
        netProfit,
        roi,
      };
    });
  }, [normalizedOpps, tradeSize]);

  const profitableCount = calculations.filter(c => c.netProfit > 0).length;

  return (
    <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-orange-400 flex items-center gap-2 font-mono text-base">
          <DollarSign className="h-4 w-4" />
          Profit Calculator
          {profitableCount > 0 && (
            <Badge className="bg-green-500/20 border-green-500/30 text-green-400 border ml-2 text-[10px]">
              {profitableCount} profitable
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Trade Size Input */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block font-mono">Trade Size (USD)</label>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">$</span>
              <input
                type="number"
                value={tradeSize}
                onChange={(e) => setTradeSize(Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-md px-8 py-2 text-white font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                min={0}
                step={100}
              />
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={100000}
            step={100}
            value={tradeSize}
            onChange={(e) => setTradeSize(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
            <span>$100</span>
            <span>$100K</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_AMOUNTS.map(amount => (
              <Button
                key={amount}
                size="sm"
                variant={tradeSize === amount ? 'default' : 'outline'}
                className={tradeSize === amount ? 'bg-orange-600 hover:bg-orange-700 font-mono' : 'border-[#2a2a3e] hover:border-orange-500 text-gray-300 font-mono'}
                onClick={() => setTradeSize(amount)}
              >
                ${amount >= 1000 ? `${amount / 1000}K` : amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Fee Table Reference */}
        {fees && Object.keys(fees).length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3e]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Exchange Fee Reference</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(fees).map(([name, fee]) => (
                <div key={name} className="text-xs font-mono">
                  <span className="text-gray-400">{name}: </span>
                  <span className="text-white">{(fee * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {calculations.length === 0 ? (
          <div className="text-center text-gray-400 py-6 font-mono">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No opportunities detected</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {calculations.map((calc, index) => {
              const isProfitable = calc.netProfit > 0;
              return (
                <motion.div
                  key={`${calc.buyFrom}-${calc.sellTo}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`p-4 rounded-lg border font-mono ${
                    isProfitable
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-[#0a0a0f] border-[#2a2a3e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-300 text-sm">
                      {calc.buyFrom} → {calc.sellTo}
                    </span>
                    {index === 0 && isProfitable && (
                      <Badge className="bg-orange-500/20 border-orange-500/30 text-orange-400 border text-[10px]">
                        BEST
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Buy @ </span>
                      <span className="text-white">${calc.buyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sell @ </span>
                      <span className="text-white">${calc.sellPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Buy fee</span>
                      <div className="text-red-400">${calc.buyFee.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Sell fee</span>
                      <div className="text-red-400">${calc.sellFee.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Gross</span>
                      <div className="text-gray-300">${calc.grossProfit.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Fee Impact Visual */}
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>Fee Impact</span>
                      <span>{((calc.totalFees / calc.buyCost) * 100).toFixed(3)}%</span>
                    </div>
                    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-green-500"
                        style={{ width: `${Math.min(100, (Math.abs(calc.grossProfit) / calc.buyCost) * 100)}%` }}
                        title="Gross Profit"
                      />
                      <div
                        className="absolute left-0 top-0 h-full bg-red-500 opacity-80"
                        style={{ width: `${Math.min(100, (calc.totalFees / calc.buyCost) * 100)}%` }}
                        title="Total Fees"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-green-400">■ Gross Spread</span>
                      <span className="text-red-400">■ Fees</span>
                    </div>
                    {!isProfitable && calc.grossProfit > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-yellow-400 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Fees exceed spread by ${Math.abs(calc.netProfit).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2a2a3e]">
                    <div>
                      <span className="text-gray-500 text-xs">Net Profit</span>
                      <div className={`font-bold text-lg ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfitable ? '+' : ''}${calc.netProfit.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-xs">ROI</span>
                      <div className={`font-bold text-lg flex items-center gap-1 ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfitable && <TrendingUp className="h-4 w-4" />}
                        {calc.roi.toFixed(3)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
