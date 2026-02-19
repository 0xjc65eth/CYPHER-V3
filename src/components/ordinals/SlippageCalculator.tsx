/**
 * SlippageCalculator Component
 * Estimates price slippage for different order sizes
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, AlertCircle } from 'lucide-react';
import { useMarketDepth } from '@/hooks/ordinals/useMarketDepth';

interface SlippageCalculatorProps {
  symbol: string;
}

export default function SlippageCalculator({ symbol }: SlippageCalculatorProps) {
  const { depthAnalysis, isLoading } = useMarketDepth({ symbol });
  const [quantity, setQuantity] = useState(5);

  if (isLoading || !depthAnalysis) {
    return (
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Slippage Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading slippage data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const slippage = depthAnalysis.slippage;

  // Find slippage for current quantity
  const currentSlippage = slippage.slippageCurve.find(s => s.quantity === quantity) ||
                         slippage.slippageCurve[slippage.slippageCurve.length - 1];

  const slippageLevel = currentSlippage.slippagePercent < 2 ? 'low' :
                       currentSlippage.slippagePercent < 5 ? 'medium' : 'high';

  return (
    <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#F7931A]" />
            Slippage Calculator
          </CardTitle>
          {slippageLevel === 'high' && (
            <div className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>High Slippage</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Quantity Selector */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-2">
            Number of Items to Buy
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="w-full h-2 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-[#F7931A]"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span className="text-white font-mono">{quantity} items</span>
            <span>50</span>
          </div>
        </div>

        {/* Slippage Estimates */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Expected Price</p>
            <p className="text-sm font-mono text-white">
              {currentSlippage.expectedPrice.toFixed(6)} BTC
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Slippage</p>
            <p className={`text-sm font-mono font-bold ${
              slippageLevel === 'low' ? 'text-green-500' :
              slippageLevel === 'medium' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {currentSlippage.slippagePercent.toFixed(2)}%
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-sm font-mono text-white">
              {(currentSlippage.expectedPrice * quantity).toFixed(6)} BTC
            </p>
          </div>
        </div>

        {/* Quick Estimates */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Buy 1 item</span>
            <span className="font-mono text-green-500">{slippage.buy1Item.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Buy 5 items</span>
            <span className="font-mono text-yellow-500">{slippage.buy5Items.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Buy 10 items</span>
            <span className="font-mono text-orange-500">{slippage.buy10Items.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Buy 20 items</span>
            <span className="font-mono text-red-500">{slippage.buy20Items.toFixed(2)}%</span>
          </div>
        </div>

        {/* Slippage Curve Chart */}
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slippage.slippageCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="quantity"
                stroke="#666"
                label={{ value: 'Quantity', position: 'insideBottom', offset: -5, fill: '#999' }}
              />
              <YAxis
                stroke="#666"
                label={{ value: 'Slippage %', angle: -90, position: 'insideLeft', fill: '#999' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#999' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Slippage']}
                labelFormatter={(label) => `Quantity: ${label} items`}
              />
              <Line
                type="monotone"
                dataKey="slippagePercent"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Warning Message */}
        {slippageLevel === 'high' && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-400">
                <p className="font-medium mb-1">High slippage detected</p>
                <p className="text-red-400/80">
                  Buying {quantity} items may result in significant price impact. Consider splitting your order into smaller chunks.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
