'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Import working chart components
import SimpleChart from './SimpleChart'
import RechartsChart from './RechartsChart'

// Types
type ChartType = 'line' | 'area' | 'bar' | 'candlestick'

// Deterministic sample data generators
const generateLineData = (count: number = 50) => {
  const data = []
  const basePrice = 50000

  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60000).toLocaleTimeString()
    const t = i / count
    const currentPrice = basePrice + Math.sin(t * Math.PI * 6) * 3000 + Math.cos(t * Math.PI * 3 + i * 0.2) * 1500
    data.push({
      time,
      value: Math.max(currentPrice, 1000)
    })
  }
  return data
}

const generateBarData = () => {
  const categories = ['BTC', 'ETH', 'ADA', 'SOL', 'AVAX']
  const baseValues = [85000, 62000, 34000, 71000, 48000]
  const hues = [30, 200, 120, 270, 350]
  return categories.map((category, i) => ({
    category,
    value: baseValues[i],
    color: `hsl(${hues[i]}, 70%, 50%)`
  }))
}

const generateCandlestickData = (count: number = 30) => {
  const data = []
  let currentPrice = 50000

  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60000).toLocaleTimeString()
    const t = i / count
    const open = currentPrice
    const change = Math.sin(t * Math.PI * 5 + i * 0.4) * 800 + Math.cos(t * Math.PI * 3) * 400
    const close = Math.max(open + change, 1000)
    const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.7)) * 300 + 100
    const low = Math.min(open, close) - Math.abs(Math.cos(i * 0.9)) * 300 - 100

    data.push({
      time,
      open,
      high: Math.max(high, 1000),
      low: Math.max(low, 500),
      close,
      volume: 500000 + Math.sin(i * 0.6) * 300000 + Math.cos(i * 1.1) * 150000
    })

    currentPrice = close
  }
  return data
}

export function WorkingChartSystem() {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [provider, setProvider] = useState<'simple' | 'recharts'>('simple')

  // Generate data based on chart type
  const chartData = useMemo(() => {
    switch (chartType) {
      case 'line':
      case 'area':
        return generateLineData()
      case 'bar':
        return generateBarData()
      case 'candlestick':
        return generateCandlestickData()
      default:
        return generateLineData()
    }
  }, [chartType])

  const chartConfig = {
    height: 400,
    theme: 'auto' as const,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    precision: 2,
    colors: ['#F7931A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    responsive: true
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Chart System</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Simplified chart system with working components
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Chart Type:</label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Provider:</label>
              <Select value={provider} onValueChange={(value) => setProvider(value as 'simple' | 'recharts')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple SVG</SelectItem>
                  <SelectItem value="recharts">Recharts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chart Display */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <div className="mb-4">
              <h3 className="font-medium text-lg">
                {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
                <span className="text-sm text-gray-500 ml-2">({provider})</span>
              </h3>
            </div>

            {provider === 'simple' ? (
              <SimpleChart
                type={chartType}
                data={chartData}
                config={chartConfig}
              />
            ) : (
              <RechartsChart
                type={chartType}
                data={chartData}
                config={chartConfig}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bitcoin Price - Simple */}
        <Card>
          <CardHeader>
            <CardTitle>Bitcoin Price (Simple SVG)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleChart
              type="area"
              data={generateLineData(24)}
              config={{
                height: 250,
                theme: 'auto',
                showGrid: false,
                showLegend: false,
                colors: ['#F7931A'],
                precision: 0
              }}
            />
          </CardContent>
        </Card>

        {/* Trading Volume - Recharts */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Volume (Recharts)</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsChart
              type="bar"
              data={generateBarData()}
              config={{
                height: 250,
                theme: 'auto',
                showGrid: true,
                showLegend: false,
                precision: 0
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Status & Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-green-600">Working Components</h4>
              <ul className="space-y-1 text-sm">
                <li>Simple SVG Charts (All types)</li>
                <li>Recharts Integration (Line, Area, Bar)</li>
                <li>Data generation and processing</li>
                <li>Theme support (Dark/Light)</li>
                <li>Responsive design</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-blue-600">Next Steps</h4>
              <ul className="space-y-1 text-sm">
                <li>Fix LightweightChart dynamic import</li>
                <li>Add real-time data updates</li>
                <li>Implement error boundaries</li>
                <li>Add more chart types</li>
                <li>Performance optimizations</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Charts are now working!</strong> You can use SimpleChart and RechartsChart components throughout your project.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WorkingChartSystem
