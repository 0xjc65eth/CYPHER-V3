'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts'
import type { ChartType, ChartData, ChartConfig, CandlestickData, LineData } from './UnifiedChartSystem'

interface LightweightChartProps {
  type: ChartType
  data: ChartData
  config: ChartConfig
}

export function LightweightChart({ type, data, config }: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<any> | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !data.length) return

    // Chart options
    const chartOptions = {
      width: typeof config.width === 'number' ? config.width : containerRef.current.clientWidth,
      height: config.height || 300,
      layout: {
        background: {
          type: ColorType.Solid,
          color: config.theme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
        textColor: config.theme === 'dark' ? '#d1d5db' : '#374151',
        fontSize: 12,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      },
      grid: {
        vertLines: {
          color: config.theme === 'dark' ? '#374151' : '#f3f4f6',
          style: LineStyle.Solid,
          visible: config.showGrid !== false,
        },
        horzLines: {
          color: config.theme === 'dark' ? '#374151' : '#f3f4f6',
          style: LineStyle.Solid,
          visible: config.showGrid !== false,
        },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: config.theme === 'dark' ? '#6b7280' : '#9ca3af',
          width: 1 as const,
          style: LineStyle.Dashed,
          visible: config.showCrosshair !== false,
        },
        horzLine: {
          color: config.theme === 'dark' ? '#6b7280' : '#9ca3af',
          width: 1 as const,
          style: LineStyle.Dashed,
          visible: config.showCrosshair !== false,
        },
      },
      rightPriceScale: {
        borderColor: config.theme === 'dark' ? '#374151' : '#e5e7eb',
        borderVisible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: config.theme === 'dark' ? '#374151' : '#e5e7eb',
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    }

    // Create chart
    const chart = createChart(containerRef.current, chartOptions)
    chartRef.current = chart

    let series: ISeriesApi<any>

    try {
      // Create appropriate series based on chart type
      switch (type) {
        case 'candlestick':
          series = chart.addSeries(CandlestickSeries, {
            upColor: config.colors?.[1] || '#10B981',
            downColor: config.colors?.[3] || '#EF4444',
            borderUpColor: config.colors?.[1] || '#10B981',
            borderDownColor: config.colors?.[3] || '#EF4444',
            wickUpColor: config.colors?.[1] || '#10B981',
            wickDownColor: config.colors?.[3] || '#EF4444',
          })
          
          // Transform and set candlestick data
          const candlestickData = (data as CandlestickData[]).map(item => ({
            time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }))
          series.setData(candlestickData)
          break

        case 'line':
        case 'area':
          series = chart.addSeries(LineSeries, {
            color: config.colors?.[0] || '#3B82F6',
            lineWidth: 2,
            lineType: 0, // Simple line
            lineStyle: LineStyle.Solid,
            pointMarkersVisible: false,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: config.colors?.[0] || '#3B82F6',
            crosshairMarkerBackgroundColor: '#ffffff',
            lastValueVisible: true,
            priceLineVisible: true,
            baseLineVisible: false,
            ...(type === 'area' && {
              topColor: config.colors?.[0] ? `${config.colors[0]}20` : '#3B82F620',
              bottomColor: config.colors?.[0] ? `${config.colors[0]}00` : '#3B82F600',
              lineColor: config.colors?.[0] || '#3B82F6',
            }),
          })

          // Transform and set line data
          const lineData = (data as LineData[]).map(item => ({
            time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
            value: item.value,
          }))
          series.setData(lineData)
          break

        default:
          throw new Error(`Chart type ${type} not supported by LightweightChart`)
      }

      seriesRef.current = series

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && chart) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
          })
        }
      }

      if (config.responsive !== false) {
        window.addEventListener('resize', handleResize)
        const resizeObserver = new ResizeObserver(handleResize)
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current)
        }

        // Cleanup resize handlers
        return () => {
          window.removeEventListener('resize', handleResize)
          resizeObserver.disconnect()
        }
      }

      setIsReady(true)

    } catch (error) {
      console.error('Error creating lightweight chart:', error)
      throw error
    }

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [type, data, config])

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !data.length || !isReady) return

    try {
      switch (type) {
        case 'candlestick':
          const candlestickData = (data as CandlestickData[]).map(item => ({
            time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }))
          seriesRef.current.setData(candlestickData)
          break

        case 'line':
        case 'area':
          const lineData = (data as LineData[]).map(item => ({
            time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
            value: item.value,
          }))
          seriesRef.current.setData(lineData)
          break
      }

      // Fit content to visible area
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }
    } catch (error) {
      console.error('Error updating lightweight chart data:', error)
    }
  }, [data, type, isReady])

  return (
    <div 
      ref={containerRef}
      className="lightweight-chart-container w-full"
      style={{ 
        minHeight: config.height || 300,
        position: 'relative'
      }}
    />
  )
}

export default LightweightChart