'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedChartSystem, type ChartType, type ChartData } from './UnifiedChartSystem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Deterministic sample data generators
const generateLineData = (count: number = 50): ChartData => {
  const data = []
  const basePrice = 50000

  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60000).toISOString()
    const t = i / count
    const currentPrice = basePrice + Math.sin(t * Math.PI * 6) * 3000 + Math.cos(t * Math.PI * 3 + i * 0.2) * 1500
    data.push({
      time,
      value: Math.max(currentPrice, 1000)
    })
  }
  return data
}

const generateCandlestickData = (count: number = 50): ChartData => {
  const data = []
  let currentPrice = 50000

  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60000).toISOString()
    const t = i / count
    const open = currentPrice
    const change = Math.sin(t * Math.PI * 5 + i * 0.4) * 800 + Math.cos(t * Math.PI * 3) * 400
    const close = Math.max(open + change, 1000)
    const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.7)) * 300 + 100
    const low = Math.min(open, close) - Math.abs(Math.cos(i * 0.9)) * 300 - 100
    const volume = 500000 + Math.sin(i * 0.6) * 300000 + Math.cos(i * 1.1) * 150000

    data.push({
      time,
      open,
      high: Math.max(high, 1000),
      low: Math.max(low, 500),
      close,
      volume
    })

    currentPrice = close
  }
  return data
}

const generateBarData = (): ChartData => {
  const categories = ['BTC', 'ETH', 'ADA', 'SOL', 'AVAX', 'DOT', 'MATIC', 'LINK']
  const baseValues = [85000, 62000, 34000, 71000, 48000, 55000, 42000, 67000]
  const hues = [30, 200, 120, 270, 350, 60, 160, 300]
  return categories.map((category, i) => ({
    category,
    value: baseValues[i],
    color: `hsl(${hues[i]}, 70%, 50%)`
  }))
}

export function ChartExample() {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [chartData, setChartData] = useState<ChartData>([])
  const [isLoading, setIsLoading] = useState(false)

  // Generate data based on chart type
  const generateData = () => {
    setIsLoading(true)

    setTimeout(() => {
      switch (chartType) {
        case 'line':
        case 'area':
          setChartData(generateLineData())
          break
        case 'candlestick':
          setChartData(generateCandlestickData())
          break
        case 'bar':
          setChartData(generateBarData())
          break
        default:
          setChartData(generateLineData())
      }
      setIsLoading(false)
    }, 500)
  }

  useEffect(() => {
    generateData()
  }, [chartType, generateData])

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unified Chart System Demo</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Professional Bitcoin analytics charts with automatic provider selection and error handling
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

            <Button onClick={generateData} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate New Data'}
            </Button>
          </div>

          {/* Chart Display */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <UnifiedChartSystem
              type={chartType}
              data={chartData}
              config={{
                title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart Demo`,
                subtitle: `Professional ${chartType} visualization with automatic optimization`,
                height: 400,
                theme: 'auto',
                showGrid: true,
                showLegend: true,
                showTooltip: true,
                showCrosshair: chartType === 'candlestick',
                precision: 2,
                colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                responsive: true
              }}
              provider="auto"
              onError={(error) => console.error('Chart error:', error)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bitcoin Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Bitcoin Price (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedChartSystem
              type="area"
              data={generateLineData(100)}
              config={{
                height: 250,
                theme: 'auto',
                showGrid: false,
                showLegend: false,
                colors: ['#F7931A'],
                precision: 0
              }}
              provider="lightweight"
            />
          </CardContent>
        </Card>

        {/* Trading Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedChartSystem
              type="bar"
              data={generateBarData()}
              config={{
                height: 250,
                theme: 'auto',
                showGrid: true,
                showLegend: false,
                precision: 0
              }}
              provider="recharts"
            />
          </CardContent>
        </Card>
      </div>

      {/* Professional Trading Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Trading Terminal</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Full-featured candlestick chart with lightweight-charts for maximum performance
          </p>
        </CardHeader>
        <CardContent>
          <UnifiedChartSystem
            type="candlestick"
            data={generateCandlestickData(200)}
            config={{
              height: 500,
              theme: 'auto',
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showCrosshair: true,
              precision: 2,
              colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
              responsive: true
            }}
            provider="lightweight"
          />
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <h4 className="font-semibold">Quick Start:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`import { UnifiedChartSystem } from '@/components/charts/UnifiedChartSystem'

// Bitcoin price chart
<UnifiedChartSystem
  type="line"
  data={bitcoinPriceData}
  config={{
    title: "Bitcoin Price (USD)",
    height: 400,
    theme: "auto",
    colors: ["#F7931A"]
  }}
  provider="auto"
/>`}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Chart Types</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>Line charts</li>
                <li>Area charts</li>
                <li>Candlestick charts</li>
                <li>Bar charts</li>
                <li>Heatmaps (coming soon)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Providers</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li><strong>Lightweight</strong>: Trading charts</li>
                <li><strong>Recharts</strong>: Dashboard widgets</li>
                <li><strong>Simple</strong>: Fallback SVG</li>
                <li><strong>Auto</strong>: Smart selection</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Features</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>Error boundaries</li>
                <li>Automatic fallbacks</li>
                <li>Responsive design</li>
                <li>Dark/light themes</li>
                <li>Performance optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChartExample
