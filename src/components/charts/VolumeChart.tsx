'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type HistogramData,
  type UTCTimestamp
} from 'lightweight-charts'

export interface VolumeDataPoint {
  time: number // Unix timestamp in seconds
  volume: number
  isPositive?: boolean // Green (up) or red (down)
}

export interface VolumeChartProps {
  data: VolumeDataPoint[]
  height?: number
  title?: string
  className?: string
}

export default function VolumeChart({
  data,
  height = 200,
  title = 'Trading Volume',
  className = ''
}: VolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0f' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
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

    // Create volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    })

    const volumeData: HistogramData[] = data.map(d => ({
      time: d.time as UTCTimestamp,
      value: d.volume,
      color: d.isPositive !== false ? '#10b98180' : '#ef444480',
    }))

    volumeSeries.setData(volumeData)
    seriesRef.current = volumeSeries

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
    }
  }, [data, height])

  // Calculate total volume
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0)

  return (
    <div className={`bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a3e]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <div className="text-sm font-mono text-gray-400">
            Total: <span className="text-white font-semibold">{totalVolume.toFixed(2)} BTC</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />

      {/* Loading State */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80">
          <div className="text-gray-500 text-sm">No volume data available</div>
        </div>
      )}
    </div>
  )
}
