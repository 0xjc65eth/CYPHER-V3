'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, Activity, Zap, Target } from 'lucide-react'

export interface ChartDataPoint {
  time: string | number
  value: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

export interface ProfessionalChartConfig {
  type: 'line' | 'area' | 'candlestick' | 'bar' | 'mini-line'
  height?: number
  width?: number | string
  theme?: 'dark' | 'light'
  showGrid?: boolean
  showCrosshair?: boolean
  showTooltip?: boolean
  showVolume?: boolean
  colors?: string[]
  precision?: number
  realtime?: boolean
  library?: 'lightweight' | 'recharts' | 'auto'
}

interface ProfessionalChartProps {
  data: ChartDataPoint[]
  config: ProfessionalChartConfig
  title?: string
  subtitle?: string
  currentValue?: number
  change24h?: number
  className?: string
}

const DEFAULT_COLORS = {
  bullish: '#10B981',
  bearish: '#EF4444',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  warning: '#F59E0B',
  accent: '#06B6D4'
}

export function ProfessionalChart({ 
  data, 
  config, 
  title, 
  subtitle, 
  currentValue, 
  change24h,
  className = ''
}: ProfessionalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<any> | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Determine which chart library to use
  const useLibrary = useMemo(() => {
    if (config.library !== 'auto') return config.library || 'recharts'
    
    // Auto-select based on chart type and data complexity
    if (config.type === 'candlestick' || config.realtime || data.length > 100) {
      return 'lightweight'
    }
    return 'recharts'
  }, [config.library, config.type, config.realtime, data.length])

  // Lightweight Charts implementation
  const LightweightChartComponent = () => {
    useEffect(() => {
      if (!containerRef.current || !data.length) return

      const isDark = config.theme === 'dark'
      
      const chartOptions = {
        width: typeof config.width === 'number' ? config.width : containerRef.current.clientWidth,
        height: config.height || 300,
        layout: {
          background: { type: ColorType.Solid, color: isDark ? 'transparent' : '#ffffff' },
          textColor: isDark ? '#E5E7EB' : '#374151',
          fontSize: 12,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        },
        grid: {
          vertLines: {
            color: isDark ? '#374151' : '#F3F4F6',
            style: LineStyle.Solid,
            visible: config.showGrid !== false,
          },
          horzLines: {
            color: isDark ? '#374151' : '#F3F4F6',
            style: LineStyle.Solid,
            visible: config.showGrid !== false,
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: isDark ? '#6B7280' : '#9CA3AF',
            width: 1,
            style: LineStyle.Dashed,
            visible: config.showCrosshair !== false,
          },
          horzLine: {
            color: isDark ? '#6B7280' : '#9CA3AF',
            width: 1,
            style: LineStyle.Dashed,
            visible: config.showCrosshair !== false,
          },
        },
        rightPriceScale: {
          borderColor: isDark ? '#374151' : '#E5E7EB',
          textColor: isDark ? '#E5E7EB' : '#374151',
          scaleMargins: { top: 0.1, bottom: config.showVolume ? 0.3 : 0.1 },
        },
        timeScale: {
          borderColor: isDark ? '#374151' : '#E5E7EB',
          textColor: isDark ? '#E5E7EB' : '#374151',
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

      const chart = createChart(containerRef.current, chartOptions)
      chartRef.current = chart

      let series: ISeriesApi<any>

      try {
        switch (config.type) {
          case 'candlestick':
            series = chart.addSeries(CandlestickSeries, {
              upColor: config.colors?.[0] || DEFAULT_COLORS.bullish,
              downColor: config.colors?.[1] || DEFAULT_COLORS.bearish,
              borderUpColor: config.colors?.[0] || DEFAULT_COLORS.bullish,
              borderDownColor: config.colors?.[1] || DEFAULT_COLORS.bearish,
              wickUpColor: config.colors?.[0] || DEFAULT_COLORS.bullish,
              wickDownColor: config.colors?.[1] || DEFAULT_COLORS.bearish,
            })
            
            const candleData = data.map(item => ({
              time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
              open: item.open || item.value,
              high: item.high || item.value * 1.01,
              low: item.low || item.value * 0.99,
              close: item.close || item.value,
            }))
            series.setData(candleData)
            break

          case 'area':
            series = chart.addSeries(AreaSeries, {
              lineColor: config.colors?.[0] || DEFAULT_COLORS.primary,
              topColor: config.colors?.[0] ? `${config.colors[0]}40` : `${DEFAULT_COLORS.primary}40`,
              bottomColor: config.colors?.[0] ? `${config.colors[0]}00` : `${DEFAULT_COLORS.primary}00`,
              lineWidth: 2,
            })
            
            const areaData = data.map(item => ({
              time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
              value: item.value,
            }))
            series.setData(areaData)
            break

          default: // line
            series = chart.addSeries(LineSeries, {
              color: config.colors?.[0] || DEFAULT_COLORS.primary,
              lineWidth: 2,
              pointMarkersVisible: false,
              crosshairMarkerVisible: true,
              lastValueVisible: true,
              priceLineVisible: true,
            })
            
            const lineData = data.map(item => ({
              time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
              value: item.value,
            }))
            series.setData(lineData)
            break
        }

        seriesRef.current = series

        // Volume series if enabled
        if (config.showVolume && data.some(d => d.volume)) {
          const volumeSeries = chart.addSeries(HistogramSeries, {
            color: isDark ? '#374151' : '#F3F4F6',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            scaleMargins: { top: 0.7, bottom: 0 },
          })

          const volumeData = data.map(item => ({
            time: typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 : item.time,
            value: item.volume || 0,
            color: item.close && item.open ? 
              (item.close >= item.open ? `${DEFAULT_COLORS.bullish}60` : `${DEFAULT_COLORS.bearish}60`) :
              `${DEFAULT_COLORS.primary}60`
          }))
          volumeSeries.setData(volumeData)
        }

        // Handle resize
        const handleResize = () => {
          if (containerRef.current && chart) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
            })
          }
        }

        window.addEventListener('resize', handleResize)
        setIsReady(true)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (chartRef.current) {
            chartRef.current.remove()
            chartRef.current = null
            seriesRef.current = null
          }
        }
      } catch (error) {
        console.error('Error creating lightweight chart:', error)
      }
    }, [data, config])

    return (
      <div 
        ref={containerRef}
        className="w-full"
        style={{ height: config.height || 300 }}
      />
    )
  }

  // Recharts implementation
  const RechartsComponent = () => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        time: typeof item.time === 'string' ? item.time : new Date(item.time).toLocaleTimeString(),
        value: item.value,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        index
      }))
    }, [data])

    const isDark = config.theme === 'dark'
    const gridColor = isDark ? '#374151' : '#F3F4F6'
    const textColor = isDark ? '#E5E7EB' : '#374151'

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload || !payload.length) return null

      return (
        <div className="bg-gray-900/95 backdrop-blur-sm p-3 rounded-lg border border-gray-700 shadow-xl">
          <p className="text-sm font-medium text-gray-200 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name || 'Value'}: ${typeof entry.value === 'number' ? 
                entry.value.toLocaleString('en-US', { 
                  minimumFractionDigits: config.precision || 2,
                  maximumFractionDigits: config.precision || 2 
                }) : entry.value}`}
            </p>
          ))}
        </div>
      )
    }

    const renderChart = () => {
      const commonProps = {
        data: chartData,
        margin: { top: 5, right: 30, left: 20, bottom: 5 }
      }

      const axisProps = {
        axisLine: { stroke: gridColor },
        tickLine: { stroke: gridColor },
        tick: { fill: textColor, fontSize: 11 }
      }

      switch (config.type) {
        case 'area':
          return (
            <AreaChart {...commonProps}>
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              )}
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.colors?.[0] || DEFAULT_COLORS.primary}
                fill={config.colors?.[0] ? `${config.colors[0]}20` : `${DEFAULT_COLORS.primary}20`}
                strokeWidth={2}
              />
            </AreaChart>
          )

        case 'bar':
          return (
            <BarChart {...commonProps}>
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              )}
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
              <Bar 
                dataKey="value" 
                fill={config.colors?.[0] || DEFAULT_COLORS.primary}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          )

        default: // line
          return (
            <LineChart {...commonProps}>
              {config.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              )}
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.colors?.[0] || DEFAULT_COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: config.colors?.[0] || DEFAULT_COLORS.primary }}
              />
              {change24h !== undefined && (
                <ReferenceLine 
                  y={currentValue ? currentValue - (currentValue * change24h / 100) : 0} 
                  stroke={change24h >= 0 ? DEFAULT_COLORS.bullish : DEFAULT_COLORS.bearish}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
            </LineChart>
          )
      }
    }

    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={config.height || 300}>
        {renderChart()}
      </ResponsiveContainer>
    )
  }

  // Chart header component
  const ChartHeader = () => {
    if (!title && !currentValue) return null

    const changeIcon = change24h && change24h >= 0 ? TrendingUp : TrendingDown
    const changeColor = change24h && change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'

    return (
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-200 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-400" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {currentValue && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-100">
              ${currentValue.toLocaleString('en-US', { 
                minimumFractionDigits: config.precision || 2,
                maximumFractionDigits: config.precision || 2 
              })}
            </div>
            {change24h !== undefined && (
              <div className={`flex items-center justify-end mt-1 ${changeColor}`}>
                {React.createElement(changeIcon, { className: 'w-4 h-4 mr-1' })}
                <span className="text-sm font-medium">
                  {Math.abs(change24h).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-lg p-4 ${className}`}>
      <ChartHeader />
      <div className="relative">
        {useLibrary === 'lightweight' ? <LightweightChartComponent /> : <RechartsComponent />}
        
        {/* Professional overlay effects */}
        <div className="absolute top-0 right-0 p-2">
          <div className="flex items-center space-x-2">
            {config.realtime && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
                <span className="text-xs text-green-400 font-mono">LIVE</span>
              </div>
            )}
            <span className="text-xs text-gray-500 font-mono">
              {useLibrary.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfessionalChart