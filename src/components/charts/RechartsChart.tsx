'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { ChartType, ChartData, ChartConfig, CandlestickData, LineData, BarData } from './UnifiedChartSystem'

export interface RechartsChartProps {
  type: ChartType
  data: ChartData | any[]
  config: ChartConfig
  className?: string
}

export function RechartsChart({ type, data, config }: RechartsChartProps) {
  // Transform data for Recharts format
  const chartData = useMemo(() => {
    switch (type) {
      case 'line':
      case 'area':
        return (data as LineData[]).map(item => ({
          time: typeof item.time === 'string' ? item.time : new Date(item.time).toLocaleTimeString(),
          value: item.value,
          label: item.label || ''
        }))

      case 'bar':
        return (data as BarData[]).map(item => ({
          category: item.category,
          value: item.value,
          fill: item.color || config.colors?.[0] || '#3B82F6'
        }))

      case 'candlestick':
        // For candlestick, we'll show close price as line
        return (data as CandlestickData[]).map(item => ({
          time: typeof item.time === 'string' ? item.time : new Date(item.time).toLocaleTimeString(),
          close: item.close,
          high: item.high,
          low: item.low,
          open: item.open,
          volume: item.volume || 0
        }))

      default:
        return []
    }
  }, [data, type, config])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toFixed(config.precision || 2) : entry.value}`}
          </p>
        ))}
      </div>
    )
  }

  // Theme colors
  const isDark = config.theme === 'dark'
  const gridColor = isDark ? '#374151' : '#f3f4f6'
  const textColor = isDark ? '#d1d5db' : '#374151'

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    const axisProps = {
      axisLine: { stroke: gridColor },
      tickLine: { stroke: gridColor },
      tick: { fill: textColor, fontSize: 12 }
    }

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}
            <XAxis dataKey="time" {...axisProps} />
            <YAxis {...axisProps} />
            {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
            {config.showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.colors?.[0] || '#3B82F6'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: config.colors?.[0] || '#3B82F6' }}
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}
            <XAxis dataKey="time" {...axisProps} />
            <YAxis {...axisProps} />
            {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
            {config.showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.colors?.[0] || '#3B82F6'}
              fill={config.colors?.[0] ? `${config.colors[0]}20` : '#3B82F620'}
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}
            <XAxis dataKey="category" {...axisProps} />
            <YAxis {...axisProps} />
            {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
            {config.showLegend && <Legend />}
            <Bar dataKey="value" fill={config.colors?.[0] || '#3B82F6'} />
          </BarChart>
        )

      case 'candlestick':
        // Render as line chart for close prices (Recharts doesn't have native candlestick)
        return (
          <LineChart {...commonProps}>
            {config.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}
            <XAxis dataKey="time" {...axisProps} />
            <YAxis {...axisProps} />
            {config.showTooltip !== false && <Tooltip content={<CustomTooltip />} />}
            {config.showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="close"
              stroke={config.colors?.[1] || '#10B981'}
              strokeWidth={2}
              dot={false}
              name="Close Price"
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke={config.colors?.[2] || '#F59E0B'}
              strokeWidth={1}
              dot={false}
              strokeDasharray="3 3"
              name="High"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke={config.colors?.[3] || '#EF4444'}
              strokeWidth={1}
              dot={false}
              strokeDasharray="3 3"
              name="Low"
            />
          </LineChart>
        )

      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Chart type "{type}" not supported by RechartsChart
          </div>
        )
    }
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={config.height || 300}>
      {renderChart()}
    </ResponsiveContainer>
  )
}

export default RechartsChart