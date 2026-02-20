'use client'

/**
 * HistoricalChart Component - CYPHER V3
 * Bloomberg Terminal-style historical price and volume charts
 * Migrated from chart.js to recharts
 */

import { useState } from 'react'
import { useHistoricalData } from '@/hooks/ordinals/useHistoricalData'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

type Timeframe = '7d' | '30d' | '90d' | '1y' | 'all'
type ChartType = 'line' | 'area'

interface HistoricalChartProps {
  symbol: string
  defaultTimeframe?: Timeframe
}

export function HistoricalChart({ symbol, defaultTimeframe = '30d' }: HistoricalChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [showMA7, setShowMA7] = useState(true)
  const [showMA30, setShowMA30] = useState(false)
  const [showVolume, setShowVolume] = useState(true)

  const { data, isLoading, error } = useHistoricalData(symbol, timeframe)

  if (isLoading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3"></div>
          <div className="h-64 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black border border-red-900 rounded-lg p-6">
        <div className="text-red-500">
          Failed to load historical data: {error.message}
        </div>
        <div className="text-gray-500 text-sm mt-2">
          Try collecting a snapshot first: POST /api/ordinals/snapshot
        </div>
      </div>
    )
  }

  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="text-gray-400">
          No historical data available yet. Collect snapshots to see historical charts.
        </div>
      </div>
    )
  }

  // Calculate moving averages
  const calculateMA = (values: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = []
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null)
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
        result.push(sum / period)
      }
    }
    return result
  }

  const prices = data.timeSeries.map(d => d.floorPrice || 0)
  const ma7 = calculateMA(prices, 7)
  const ma30 = calculateMA(prices, 30)

  // Prepare recharts data
  const chartData = data.timeSeries.map((d, i) => {
    const date = new Date(d.timestamp)
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: prices[i],
      ma7: ma7[i],
      ma30: ma30[i],
      volume: d.volume || 0,
    }
  })

  const PriceChart = chartType === 'area' ? AreaChart : LineChart

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Historical Chart - {symbol}</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y', 'all'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === tf
                  ? 'bg-orange-500 text-black font-bold'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA7}
            onChange={e => setShowMA7(e.target.checked)}
            className="rounded"
          />
          7d MA
        </label>
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA30}
            onChange={e => setShowMA30(e.target.checked)}
            className="rounded"
          />
          30d MA
        </label>
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showVolume}
            onChange={e => setShowVolume(e.target.checked)}
            className="rounded"
          />
          Show Volume
        </label>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'line'
                ? 'bg-orange-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'area'
                ? 'bg-orange-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Area
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PriceChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
            <YAxis tick={{ fill: '#888', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', color: '#fff' }}
            />
            <Legend wrapperStyle={{ color: '#888' }} />
            {chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="price"
                name="Floor Price (BTC)"
                stroke="#ff8c00"
                fill="rgba(255, 140, 0, 0.1)"
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="price"
                name="Floor Price (BTC)"
                stroke="#ff8c00"
                strokeWidth={2}
                dot={false}
              />
            )}
            {showMA7 && (
              <Line
                type="monotone"
                dataKey="ma7"
                name="7d MA"
                stroke="#00ff00"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            )}
            {showMA30 && (
              <Line
                type="monotone"
                dataKey="ma30"
                name="30d MA"
                stroke="#ff0000"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            )}
          </PriceChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', color: '#fff' }}
              />
              <Bar dataKey="volume" name="Volume (BTC)" fill="#ff8c00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-gray-800 pt-4">
        <div>
          <div className="text-gray-500">Price Change</div>
          <div
            className={`font-bold ${
              data.analytics.priceChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {data.analytics.priceChange >= 0 ? '+' : ''}
            {data.analytics.priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Avg Volume</div>
          <div className="text-white font-bold">
            {(data.analytics.averageVolume / 1).toFixed(4)} BTC
          </div>
        </div>
        <div>
          <div className="text-gray-500">Volatility</div>
          <div className="text-white font-bold">{data.analytics.volatility.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-gray-500">Trend</div>
          <div
            className={`font-bold uppercase ${
              data.analytics.trend === 'uptrend'
                ? 'text-green-500'
                : data.analytics.trend === 'downtrend'
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {data.analytics.trend}
          </div>
        </div>
      </div>

      {/* Data Points Info */}
      <div className="text-xs text-gray-600">
        {data.summary.dataPoints} data points ({data.summary.firstDate} to {data.summary.lastDate})
      </div>
    </div>
  )
}
