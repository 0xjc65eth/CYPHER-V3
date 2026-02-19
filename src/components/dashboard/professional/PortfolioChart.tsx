'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Loader2,
  Wallet
} from 'lucide-react';
import { usePortfolioMetrics } from '@/hooks/dashboard/usePortfolioMetrics';

const COLORS = ['#f7931a', '#627eea', '#9945ff', '#ff6b35', '#00d4aa', '#6b7280'];

export function PortfolioChart() {
  const { metrics, loading, error } = usePortfolioMetrics();
  const [showBalance, setShowBalance] = useState(true);

  const formatValue = (value: number): string => {
    if (!showBalance) return '****';
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <span className="ml-2 text-sm text-gray-400">Loading portfolio...</span>
      </div>
    );
  }

  if (!metrics || metrics.totalValue === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">No Portfolio Data</p>
        <p className="text-xs text-gray-500 mt-1">Connect a wallet to see your portfolio</p>
      </div>
    );
  }

  const pieData = metrics.assets.map((asset, i) => ({
    name: asset.symbol,
    value: asset.value,
    color: COLORS[i % COLORS.length],
    allocation: asset.allocation,
    change24h: asset.pnlPercent,
  }));

  return (
    <div className="space-y-4">
      {/* Portfolio Value */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="text-2xl font-bold">
            {formatValue(metrics.totalValue)}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBalance(!showBalance)}
            className="h-6 w-6"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2">
          {metrics.totalPnL >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalPnL >= 0 ? '+' : ''}{showBalance ? formatValue(Math.abs(metrics.totalPnL)) : '****'}
            ({metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnLPercent.toFixed(2)}%)
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">24h P&L</p>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatValue(value), 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance */}
      {(metrics.performance.day !== 0 || metrics.performance.week !== 0) && (
        <Card className="p-3 bg-gray-800/30 border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Performance</h4>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { label: '24h', value: metrics.performance.day },
              { label: '7d', value: metrics.performance.week },
              { label: '30d', value: metrics.performance.month },
              { label: '1y', value: metrics.performance.year },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <p className="text-gray-400">{p.label}</p>
                <p className={`font-medium ${p.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assets List */}
      <div className="space-y-2">
        {metrics.assets.map((asset, index) => (
          <motion.div
            key={asset.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div>
                <p className="text-sm font-medium">{asset.symbol}</p>
                <p className="text-xs text-gray-400">{asset.allocation.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatValue(asset.value)}
              </p>
              <p className={`text-xs ${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {asset.pnlPercent >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
