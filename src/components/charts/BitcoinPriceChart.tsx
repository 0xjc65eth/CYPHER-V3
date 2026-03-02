'use client'

import React, { useMemo } from 'react'
import { UnifiedChartSystem } from './UnifiedChartSystem'
import { useMarketData } from '@/hooks/useMarketData'
import { useBitcoinPriceHistory } from '@/hooks/useBitcoinPriceHistory'

interface BitcoinPriceChartProps {
  height?: number
  showVolume?: boolean
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  type?: 'line' | 'area' | 'candlestick'
}

export function BitcoinPriceChart({ 
  height = 300, 
  showVolume = false,
  interval = '1h',
  type = 'area'
}: BitcoinPriceChartProps) {
  const marketData = useMarketData()
  const { data: priceHistory, loading, error } = useBitcoinPriceHistory(interval)

  // Transform price history data for chart
  const chartData = useMemo(() => {
    if (!priceHistory?.length) {
      // No data available yet - return empty array until API responds
      return []
    }
    
    // Transform real data
    return priceHistory.map(item => {
      if (type === 'candlestick') {
        return {
          time: item.timestamp,
          open: item.open || item.price,
          high: item.high || item.price * 1.001,
          low: item.low || item.price * 0.999,
          close: item.close || item.price,
          volume: item.volume || 0
        }
      } else {
        return {
          time: item.timestamp,
          value: item.price
        }
      }
    })
  }, [priceHistory, marketData?.btcPrice, type])

  // Chart configuration
  const chartConfig = {
    title: `Bitcoin Price (${interval.toUpperCase()})`,
    subtitle: marketData?.btcPrice ? `Current: $${marketData.btcPrice.toLocaleString()}` : 'Loading...',
    height,
    theme: 'auto' as const,
    showGrid: true,
    showLegend: false,
    showTooltip: true,
    showCrosshair: type === 'candlestick',
    precision: 0,
    colors: ['#F7931A', '#10B981', '#F59E0B', '#EF4444'],
    responsive: true
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading Bitcoin price data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-red-500">
          <p className="text-sm">Failed to load price data</p>
          <p className="text-xs text-gray-500 mt-1">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bitcoin-price-chart">
      <UnifiedChartSystem
        type={type}
        data={chartData}
        config={chartConfig}
        provider="auto"
        onError={(error) => {
          console.error('Bitcoin price chart error:', error)
        }}
      />
      
      {/* Price info overlay */}
      {marketData && (
        <div className="flex items-center justify-between mt-2 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              ${marketData.btcPrice?.toLocaleString() || 'N/A'}
            </span>
            <span className={`flex items-center gap-1 ${
              (marketData.btcChange24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {(marketData.btcChange24h || 0) >= 0 ? '↗' : '↘'}
              {Math.abs(marketData.btcChange24h || 0).toFixed(2)}%
            </span>
          </div>
          
          <div className="text-gray-500 text-xs">
            {interval} • Live data
          </div>
        </div>
      )}
    </div>
  )
}

export default BitcoinPriceChart