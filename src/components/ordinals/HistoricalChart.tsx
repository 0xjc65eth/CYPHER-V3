'use client'

/**
 * HistoricalChart Component - CYPHER V3
 * Bloomberg Terminal-style historical price and volume charts
 */

import { useState } from 'react'
import { useHistoricalData } from '@/hooks/ordinals/useHistoricalData'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

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

  // Price chart data
  const priceData = {
    labels: data.timeSeries.map(d => {
      const date = new Date(d.timestamp)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Floor Price (BTC)',
        data: prices,
        borderColor: '#ff8c00',
        backgroundColor: chartType === 'area' ? 'rgba(255, 140, 0, 0.1)' : 'transparent',
        fill: chartType === 'area',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      ...(showMA7
        ? [
            {
              label: '7d MA',
              data: ma7,
              borderColor: '#00ff00',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              tension: 0.4,
            },
          ]
        : []),
      ...(showMA30
        ? [
            {
              label: '30d MA',
              data: ma30,
              borderColor: '#ff0000',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              tension: 0.4,
            },
          ]
        : []),
    ],
  }

  // Volume chart data
  const volumeData = {
    labels: data.timeSeries.map(d => {
      const date = new Date(d.timestamp)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Volume (BTC)',
        data: data.timeSeries.map(d => d.volume || 0),
        backgroundColor: '#ff8c00',
        borderColor: '#ff8c00',
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: { color: '#888' },
        grid: { color: '#333' },
      },
      x: {
        ticks: { color: '#888', maxRotation: 0, minRotation: 0 },
        grid: { color: '#333' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#888' },
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Historical Chart - {symbol}</h2>
        <div className="flex gap-2">
          {/* Timeframe Selector */}
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
        <Line data={priceData} options={chartOptions} />
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="h-32">
          <Bar data={volumeData} options={chartOptions} />
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
