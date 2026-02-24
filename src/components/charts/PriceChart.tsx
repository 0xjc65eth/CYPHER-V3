'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type UTCTimestamp,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
} from 'lightweight-charts'

export interface PriceDataPoint {
  time: number // Unix timestamp in seconds
  open?: number
  high?: number
  low?: number
  close?: number
  value?: number // For line charts
  volume?: number
}

export interface PriceChartProps {
  data: PriceDataPoint[]
  chartType?: 'candlestick' | 'line' | 'area'
  showVolume?: boolean
  height?: number
  ticker?: string
  className?: string
}

type Timeframe = '24H' | '7D' | '30D' | '90D' | 'ALL'

export default function PriceChart({
  data,
  chartType = 'line',
  showVolume = true,
  height = 400,
  ticker = 'BTC',
  className = ''
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('7D')
  const [stats, setStats] = useState({
    current: 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    volume: 0
  })

  // Calculate stats from data
  useEffect(() => {
    if (data.length === 0) return

    const sortedData = [...data].sort((a, b) => a.time - b.time)
    const latest = sortedData[sortedData.length - 1]
    const first = sortedData[0]

    const current = latest.close || latest.value || 0
    const previous = first.close || first.value || 0
    const change = current - previous
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0

    const high = Math.max(...sortedData.map(d => d.high || d.value || 0))
    const low = Math.min(...sortedData.filter(d => (d.low || d.value || 0) > 0).map(d => d.low || d.value || 0))
    const totalVolume = sortedData.reduce((sum, d) => sum + (d.volume || 0), 0)

    setStats({
      current,
      change,
      changePercent,
      high,
      low,
      volume: totalVolume
    })
  }, [data])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showVolume ? height : height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0f' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#f59e0b',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#f59e0b',
          width: 1,
          style: 2,
        },
      },
      timeScale: {
        borderColor: '#2a2a3e',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2a3e',
      },
    })

    chartRef.current = chart

    // Create main price series
    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>

    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      const candleData: CandlestickData[] = data
        .filter(d => d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined)
        .map(d => ({
          time: d.time as UTCTimestamp,
          open: d.open!,
          high: d.high!,
          low: d.low!,
          close: d.close!,
        }))

      series.setData(candleData)
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#f59e0b',
        topColor: 'rgba(245, 158, 11, 0.4)',
        bottomColor: 'rgba(245, 158, 11, 0.0)',
        lineWidth: 2,
      })

      const lineData: LineData[] = data
        .filter(d => d.value !== undefined || d.close !== undefined)
        .map(d => ({
          time: d.time as UTCTimestamp,
          value: d.value ?? d.close ?? 0,
        }))

      series.setData(lineData)
    } else {
      // Line chart (default)
      series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
      })

      const lineData: LineData[] = data
        .filter(d => d.value !== undefined || d.close !== undefined)
        .map(d => ({
          time: d.time as UTCTimestamp,
          value: d.value ?? d.close ?? 0,
        }))

      series.setData(lineData)
    }

    seriesRef.current = series

    // Add volume histogram if enabled
    if (showVolume && data.some(d => d.volume !== undefined)) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#6b7280',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      const volumeData: HistogramData[] = data
        .filter(d => d.volume !== undefined)
        .map(d => ({
          time: d.time as UTCTimestamp,
          value: d.volume!,
          color: (d.close ?? d.value ?? 0) >= (d.open ?? d.value ?? 0) ? '#10b98180' : '#ef444480',
        }))

      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
    }

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [data, chartType, showVolume, height])

  const formatPrice = (price: number) => {
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(8)
  }

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  return (
    <div className={`bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden ${className}`}>
      {/* Header with Stats */}
      <div className="p-4 border-b border-[#2a2a3e]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{ticker} Price</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-mono font-bold text-white">
                {formatPrice(stats.current)} BTC
              </span>
              <span className={`text-sm font-medium ${stats.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(stats.changePercent)}
              </span>
            </div>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex gap-1 bg-[#0a0a0f] rounded p-1">
            {(['24H', '7D', '30D', '90D', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-[#f59e0b] text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-gray-500 mb-1">High</div>
            <div className="font-mono text-white">{formatPrice(stats.high)} BTC</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Low</div>
            <div className="font-mono text-white">{formatPrice(stats.low)} BTC</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Volume</div>
            <div className="font-mono text-white">{stats.volume.toFixed(2)} BTC</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />

      {/* Loading State */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80">
          <div className="text-gray-500 text-sm">No price data available</div>
        </div>
      )}
    </div>
  )
}
