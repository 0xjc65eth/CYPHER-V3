'use client'

/**
 * TrendIndicators Component - CYPHER V3
 * Display trend analysis and trading signals
 */

import { useCollectionTrend } from '@/hooks/ordinals/useTrendDetection'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface TrendIndicatorsProps {
  symbol: string
  period?: '7d' | '30d' | '90d'
}

export function TrendIndicators({ symbol, period = '30d' }: TrendIndicatorsProps) {
  const { data: trend, isLoading, error } = useCollectionTrend(symbol, period)

  if (isLoading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !trend) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="text-gray-400 text-sm">
          No trend data available. Collect snapshots to see trend analysis.
        </div>
      </div>
    )
  }

  const getTrendIcon = () => {
    switch (trend.trendType) {
      case 'uptrend':
      case 'breakout':
        return <TrendingUp className="w-6 h-6" />
      case 'downtrend':
      case 'breakdown':
        return <TrendingDown className="w-6 h-6" />
      default:
        return <Minus className="w-6 h-6" />
    }
  }

  const getTrendColor = () => {
    switch (trend.trendType) {
      case 'uptrend':
      case 'breakout':
        return 'text-green-500'
      case 'downtrend':
      case 'breakdown':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getTrendBgColor = () => {
    switch (trend.trendType) {
      case 'uptrend':
      case 'breakout':
        return 'bg-green-500/10 border-green-500/30'
      case 'downtrend':
      case 'breakdown':
        return 'bg-red-500/10 border-red-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6 space-y-4">
      {/* Header */}
      <h3 className="text-lg font-bold text-white">Trend Analysis</h3>

      {/* Trend Badge */}
      <div
        className={`border rounded-lg p-4 ${getTrendBgColor()} flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className={getTrendColor()}>{getTrendIcon()}</div>
          <div>
            <div className={`text-lg font-bold uppercase ${getTrendColor()}`}>
              {trend.trendType}
            </div>
            <div className="text-sm text-gray-400">{period} Period</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{trend.strength.toFixed(0)}</div>
          <div className="text-xs text-gray-500">Strength</div>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-4">
        {trend.indicators.ma7 && (
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500">7d MA</div>
            <div className="text-white font-bold">{trend.indicators.ma7.toFixed(6)} BTC</div>
          </div>
        )}
        {trend.indicators.ma30 && (
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500">30d MA</div>
            <div className="text-white font-bold">{trend.indicators.ma30.toFixed(6)} BTC</div>
          </div>
        )}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Current Price</div>
          <div className="text-white font-bold">
            {trend.indicators.currentPrice.toFixed(6)} BTC
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Volume Trend</div>
          <div
            className={`font-bold uppercase text-sm ${
              trend.indicators.volumeTrend === 'increasing'
                ? 'text-green-500'
                : trend.indicators.volumeTrend === 'decreasing'
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {trend.indicators.volumeTrend === 'increasing' && <ArrowUpRight className="inline w-4 h-4" />}
            {trend.indicators.volumeTrend === 'decreasing' && <ArrowDownRight className="inline w-4 h-4" />}
            {' '}
            {trend.indicators.volumeTrend}
          </div>
        </div>
      </div>

      {/* Trading Signals */}
      <div className="space-y-2">
        <div className="text-sm font-bold text-gray-400">Trading Signals</div>
        {trend.signals.map((signal, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 ${
              signal.type === 'buy'
                ? 'bg-green-500/10 border-green-500/30'
                : signal.type === 'sell'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-gray-500/10 border-gray-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                    signal.type === 'buy'
                      ? 'bg-green-500 text-black'
                      : signal.type === 'sell'
                      ? 'bg-red-500 text-black'
                      : 'bg-gray-500 text-black'
                  }`}
                >
                  {signal.type}
                </span>
                <span className="ml-2 text-gray-300 text-sm">{signal.reason}</span>
              </div>
              <div className="text-sm text-gray-500">
                {signal.strength.toFixed(0)}% confidence
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence Meter */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Analysis Confidence</span>
          <span className="text-white font-bold">{trend.confidence.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all"
            style={{ width: `${trend.confidence}%` }}
          />
        </div>
      </div>
    </div>
  )
}
