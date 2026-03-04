'use client'

import React, { useState, useEffect } from 'react'
import { Card, Title, Text, Badge, Metric } from '@tremor/react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'
import {
  RiPieChartLine,
  RiLineChartLine,
  RiBarChartLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowUpLine as RiTrendingUpLine,
  RiArrowDownLine as RiTrendingDownLine
} from 'react-icons/ri'

interface PortfolioData {
  date: string
  totalValue: number
  bitcoin: number
  ordinals: number
  runes: number
  pnl: number
  volume: number
}

interface AssetAllocation {
  name: string
  value: number
  percentage: number
  color: string
  change24h: number
}

const CHART_TYPES = [
  { id: 'portfolio', name: 'Portfolio', icon: RiLineChartLine },
  { id: 'allocation', name: 'Allocation', icon: RiPieChartLine },
  { id: 'performance', name: 'Performance', icon: RiBarChartLine }
]

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function PortfolioAnalyticsChart() {
  const [selectedChart, setSelectedChart] = useState('portfolio')
  const [timeRange, setTimeRange] = useState('7d')
  const [showValues, setShowValues] = useState(true)
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([])
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([])
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0)
  const [portfolioChange, setPortfolioChange] = useState(0)

  // Generate deterministic portfolio data
  const generatePortfolioData = (days: number): PortfolioData[] => {
    const data: PortfolioData[] = []
    let baseValue = 50000 // $50k portfolio

    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      // Deterministic portfolio movement using sine waves
      const t = (days - i) / days
      const dayIndex = days - i
      const change = (Math.sin(t * Math.PI * 4 + dayIndex * 0.3) * 0.3 + Math.cos(t * Math.PI * 2 + dayIndex * 0.5) * 0.2) * 0.05
      baseValue = baseValue * (1 + change)

      const bitcoin = baseValue * (0.6 + Math.sin(dayIndex * 0.4) * 0.05) // ~55-65%
      const ordinals = baseValue * (0.25 + Math.cos(dayIndex * 0.6) * 0.05) // ~20-30%
      const runes = baseValue * (0.15 + Math.sin(dayIndex * 0.8) * 0.05) // ~10-20%

      data.push({
        date: date.toISOString().split('T')[0],
        totalValue: baseValue,
        bitcoin,
        ordinals,
        runes,
        pnl: change * baseValue,
        volume: 3500 + Math.sin(dayIndex * 0.9) * 1500 + Math.cos(dayIndex * 0.4) * 1000
      })
    }

    return data
  }

  // Generate mock asset allocation
  const generateAssetAllocation = (): AssetAllocation[] => {
    return [
      {
        name: 'Bitcoin',
        value: 30000,
        percentage: 60,
        color: '#F7931A',
        change24h: 2.45
      },
      {
        name: 'Ordinals',
        value: 12500,
        percentage: 25,
        color: '#8B5CF6',
        change24h: -1.23
      },
      {
        name: 'Runes',
        value: 7500,
        percentage: 15,
        color: '#10B981',
        change24h: 5.67
      }
    ]
  }

  useEffect(() => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const data = generatePortfolioData(days)
    setPortfolioData(data)

    if (data.length > 0) {
      const latest = data[data.length - 1]
      const previous = data[data.length - 2] || data[0]
      setTotalPortfolioValue(latest.totalValue)
      setPortfolioChange(((latest.totalValue - previous.totalValue) / previous.totalValue) * 100)
    }

    setAssetAllocation(generateAssetAllocation())
  }, [timeRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderPortfolioChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={portfolioData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        <Area
          type="monotone"
          dataKey="totalValue"
          stroke="#3B82F6"
          fill="url(#portfolioGradient)"
          strokeWidth={2}
          name="Total Portfolio"
        />

        <Line
          type="monotone"
          dataKey="bitcoin"
          stroke="#F7931A"
          strokeWidth={2}
          dot={false}
          name="Bitcoin"
        />

        <Line
          type="monotone"
          dataKey="ordinals"
          stroke="#8B5CF6"
          strokeWidth={2}
          dot={false}
          name="Ordinals"
        />

        <Line
          type="monotone"
          dataKey="runes"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          name="Runes"
        />

        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
      </ComposedChart>
    </ResponsiveContainer>
  )

  const renderAllocationChart = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={assetAllocation}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
          >
            {assetAllocation.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                    <p className="text-white font-medium">{data.name}</p>
                    <p className="text-gray-300">Value: {formatCurrency(data.value)}</p>
                    <p className="text-gray-300">Allocation: {data.percentage}%</p>
                    <p className={`text-sm ${data.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      24h: {formatPercentage(data.change24h)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-4">
        {assetAllocation.map((asset, index) => (
          <div key={asset.name} className="bg-black/30 rounded-lg p-4 border border-gray-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <Text className="text-white font-medium">{asset.name}</Text>
              </div>
              <Badge className={`${
                asset.change24h >= 0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {asset.change24h >= 0 ? <RiTrendingUpLine className="w-3 h-3 mr-1" /> : <RiTrendingDownLine className="w-3 h-3 mr-1" />}
                {formatPercentage(asset.change24h)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <Metric className="text-white">
                {showValues ? formatCurrency(asset.value) : '••••••'}
              </Metric>
              <Text className="text-gray-400">{asset.percentage}%</Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPerformanceChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={portfolioData.slice(-7)}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
        />
        <YAxis
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        <Bar
          dataKey="pnl"
          name="Daily P&L"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />

        <Bar
          dataKey="volume"
          name="Volume"
          fill="#10B981"
          opacity={0.6}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-purple-500/30 shadow-2xl backdrop-blur-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <RiPieChartLine className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <Title className="text-white">Portfolio Analytics</Title>
              <div className="flex items-center gap-2">
                <Metric className="text-white">
                  {showValues ? formatCurrency(totalPortfolioValue) : '••••••••'}
                </Metric>
                <Badge className={`${
                  portfolioChange >= 0
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  {portfolioChange >= 0 ? <RiTrendingUpLine className="w-4 h-4 mr-1" /> : <RiTrendingDownLine className="w-4 h-4 mr-1" />}
                  {formatPercentage(portfolioChange)}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowValues(!showValues)}
            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
          >
            {showValues ? <RiEyeOffLine className="w-4 h-4 text-gray-300" /> : <RiEyeLine className="w-4 h-4 text-gray-300" />}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Chart Type Selection */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
            {CHART_TYPES.map((chart) => (
              <button
                key={chart.id}
                onClick={() => setSelectedChart(chart.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedChart === chart.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <chart.icon className="w-4 h-4" />
                {chart.name}
              </button>
            ))}
          </div>

          {/* Time Range Selection */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Content */}
        <div className="bg-black/20 rounded-xl p-4 border border-gray-600/30">
          {selectedChart === 'portfolio' && renderPortfolioChart()}
          {selectedChart === 'allocation' && renderAllocationChart()}
          {selectedChart === 'performance' && renderPerformanceChart()}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
            <Text className="text-gray-400 text-xs mb-1">Total Assets</Text>
            <Text className="text-white font-semibold">
              {showValues ? '3' : '•'}
            </Text>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
            <Text className="text-gray-400 text-xs mb-1">Best Performer</Text>
            <Text className="text-emerald-400 font-semibold">Runes +5.67%</Text>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
            <Text className="text-gray-400 text-xs mb-1">Worst Performer</Text>
            <Text className="text-red-400 font-semibold">Ordinals -1.23%</Text>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
            <Text className="text-gray-400 text-xs mb-1">Volatility</Text>
            <Text className="text-yellow-400 font-semibold">Medium</Text>
          </div>
        </div>
      </div>
    </Card>
  )
}
