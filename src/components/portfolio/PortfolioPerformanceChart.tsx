'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePortfolioHistory } from '@/hooks/portfolio/usePortfolioHistory';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { RiLineChartLine, RiArrowUpLine as RiTrendingUpLine, RiArrowDownLine as RiTrendingDownLine, RiInformationLine } from 'react-icons/ri';

interface PortfolioPerformanceChartProps {
  address?: string;
}

export function PortfolioPerformanceChart({ address }: PortfolioPerformanceChartProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL'>('30D');
  const [chartType, setChartType] = useState<'total' | 'breakdown'>('total');

  const { data, isLoading, error, refetch } = usePortfolioHistory({
    address,
    timeframe,
    enabled: !!address,
  });

  if (!address) {
    return (
      <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
        <div className="text-center py-12">
          <RiLineChartLine className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Connect wallet to view portfolio performance</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
        <div className="text-center py-12">
          <p className="text-red-400">Error loading portfolio history</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF8555] transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mr-3 border border-[#FF6B35]/30">
            <RiLineChartLine className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Portfolio Performance</h3>
            <p className="text-sm text-gray-400">Track your portfolio value over time</p>
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChartType('total')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              chartType === 'total'
                ? 'bg-[#FF6B35] text-white'
                : 'bg-[#FF6B35]/10 text-gray-400 hover:bg-[#FF6B35]/20'
            }`}
          >
            Total Value
          </button>
          <button
            onClick={() => setChartType('breakdown')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              chartType === 'breakdown'
                ? 'bg-[#FF6B35] text-white'
                : 'bg-[#FF6B35]/10 text-gray-400 hover:bg-[#FF6B35]/20'
            }`}
          >
            Breakdown
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {/* Total Return */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase">Total Return</span>
              {data.totalReturnPercentage >= 0 ? (
                <RiTrendingUpLine className="w-4 h-4 text-green-500" />
              ) : (
                <RiTrendingDownLine className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold ${data.totalReturnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.totalReturnPercentage >= 0 ? '+' : ''}
                {data.totalReturnPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1">
              <span className={`text-xs ${data.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${Math.abs(data.totalReturn).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Start Value */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <span className="text-xs text-gray-400 uppercase block mb-2">Start Value</span>
            <span className="text-2xl font-bold text-white">
              ${data.startValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Current Value */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <span className="text-xs text-gray-400 uppercase block mb-2">Current Value</span>
            <span className="text-2xl font-bold text-white">
              ${data.endValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Peak */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <span className="text-xs text-gray-400 uppercase block mb-2">Peak</span>
            <span className="text-2xl font-bold text-green-500">
              ${data.peak.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Volatility */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <span className="text-xs text-gray-400 uppercase block mb-2">Volatility</span>
            <span className="text-2xl font-bold text-blue-400">
              {data.volatility.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="flex items-center justify-end space-x-2 mb-6">
        {(['1D', '7D', '30D', '90D', '1Y', 'ALL'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeframe === tf
                ? 'bg-[#FF6B35] text-white'
                : 'bg-[#FF6B35]/10 text-gray-400 hover:bg-[#FF6B35]/20'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#0F1729]/50 rounded-lg p-6 border border-[#FF6B35]/20 mb-4">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
          </div>
        ) : data && data.snapshots.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'total' ? (
              <AreaChart data={data.snapshots}>
                <defs>
                  <linearGradient id="totalValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5A" opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#6B7280"
                  tickFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    if (timeframe === '1D') {
                      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    } else if (timeframe === '7D') {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }}
                />
                <YAxis
                  stroke="#6B7280"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #FF6B35',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#D1D5DB' }}
                  formatter={(value: number) => [`$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'Total Value']}
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#FF6B35"
                  strokeWidth={2}
                  fill="url(#totalValueGradient)"
                />
              </AreaChart>
            ) : (
              <LineChart data={data.snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5A" opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#6B7280"
                  tickFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    if (timeframe === '1D') {
                      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }}
                />
                <YAxis
                  stroke="#6B7280"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #FF6B35',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#D1D5DB' }}
                  formatter={(value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Legend />
                <Line type="monotone" dataKey="btcValue" stroke="#F7931A" strokeWidth={2} name="Bitcoin" dot={false} />
                <Line type="monotone" dataKey="ordinalsValue" stroke="#8B5CF6" strokeWidth={2} name="Ordinals" dot={false} />
                <Line type="monotone" dataKey="runesValue" stroke="#10B981" strokeWidth={2} name="Runes" dot={false} />
                <Line type="monotone" dataKey="rareSatsValue" stroke="#3B82F6" strokeWidth={2} name="Rare Sats" dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-400">No data available</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
        <div className="flex items-center mb-2">
          <RiInformationLine className="w-4 h-4 text-[#FF6B35] mr-2" />
          <span className="text-white font-medium text-sm">Performance Insights</span>
        </div>
        <p className="text-sm text-gray-300">
          {data && data.totalReturnPercentage >= 0 ? (
            <>
              Your portfolio is performing well with a {data.totalReturnPercentage.toFixed(2)}% return over {timeframe}.
              {data.volatility > 5 ? ' However, volatility is elevated - consider diversifying.' : ' Volatility is moderate.'}
            </>
          ) : (
            <>
              Your portfolio is down {Math.abs(data?.totalReturnPercentage || 0).toFixed(2)}% over {timeframe}.
              Consider reviewing your allocation and rebalancing into stronger assets.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
