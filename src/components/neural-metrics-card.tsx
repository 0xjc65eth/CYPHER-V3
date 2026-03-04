'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, ProgressBar } from '@tremor/react'
import { RiBrainLine, RiTimeLine, RiLineChartLine, RiArrowUpSLine, RiArrowDownSLine, RiBarChartLine } from 'react-icons/ri'
import { useTradingData } from '@/hooks/useTradingData'
import { NeuralMetric } from '@/services/trading-data-service'
import { DataFreshness } from '@/components/ui/DataFreshness'

export function NeuralMetricsCard() {
  const { data, isLoading, error, lastUpdated } = useTradingData(30000) // Refresh every 30 seconds
  const [mounted, setMounted] = useState(false)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show loading state
  if (isLoading && !data) {
    return (
      <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Neural Network Metrics</Title>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Neural Network Metrics</Title>
        <Text className="text-rose-400">Error loading neural metrics</Text>
      </Card>
    )
  }

  // Get neural metrics from data
  const neuralMetrics = data?.neuralMetrics || []

  // Calculate overall confidence score (average of all metrics)
  const overallScore = neuralMetrics.length > 0
    ? Math.round(neuralMetrics.reduce((sum, metric) => sum + metric.value, 0) / neuralMetrics.length)
    : 0

  // Get sentiment based on overall score
  const getSentiment = (score: number) => {
    if (score >= 70) return { text: 'Strongly Bullish', color: 'emerald' }
    if (score >= 60) return { text: 'Bullish', color: 'emerald' }
    if (score >= 50) return { text: 'Slightly Bullish', color: 'emerald' }
    if (score >= 40) return { text: 'Neutral', color: 'blue' }
    if (score >= 30) return { text: 'Slightly Bearish', color: 'amber' }
    if (score >= 20) return { text: 'Bearish', color: 'rose' }
    return { text: 'Strongly Bearish', color: 'rose' }
  }

  const sentiment = getSentiment(overallScore)

  const currentDate = new Date()
  const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiBrainLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Bitcoin Neural Metrics</Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? <DataFreshness timestamp={lastUpdated} /> : 'Real-time data'}
            </Text>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-500/30">
          AI-Powered
        </span>
      </div>

      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Text className="text-sm text-white">
          <span className="font-bold">How it works:</span> Our neural network analyzes multiple data points across
          on-chain metrics, market sentiment, and technical indicators to generate a comprehensive market outlook.
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          Analysis date: {formattedDate} • Data sources: CoinMarketCap API
        </Text>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <Text className="text-sm text-gray-400">Overall Bitcoin Confidence Score</Text>
          <Text className={`text-sm font-bold text-${sentiment.color}-400`}>{sentiment.text}</Text>
        </div>
        <ProgressBar
          value={overallScore}
          color={sentiment.color as any}
          className="mt-1"
        />
        <div className="flex justify-between items-center mt-1">
          <Text className="text-xs text-gray-500">Bearish</Text>
          <Text className="text-xs text-gray-500">Neutral</Text>
          <Text className="text-xs text-gray-500">Bullish</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        {neuralMetrics.map((metric, index) => (
          <div key={index} className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <RiBarChartLine className="w-4 h-4 text-blue-400 mr-2" />
                <Text className="text-sm font-medium text-white">{metric.name}</Text>
              </div>
              <div className="flex items-center">
                <Text className="text-xs text-gray-400 mr-1">{metric.timeframe}</Text>
                <span className={`ml-1 ${
                  metric.trend === 'Up' ? 'text-emerald-400' :
                  metric.trend === 'Down' ? 'text-rose-400' :
                  'text-gray-400'
                }`}>
                  {metric.trend === 'Up' ? <RiArrowUpSLine /> :
                   metric.trend === 'Down' ? <RiArrowDownSLine /> :
                   <RiLineChartLine />}
                </span>
              </div>
            </div>

            <ProgressBar
              value={metric.value}
              color={
                metric.trend === 'Up' ? 'emerald' :
                metric.trend === 'Down' ? 'rose' :
                'blue'
              }
              className="mt-1"
            />

            <div className="flex justify-between items-center mt-1">
              <Text className="text-xs text-gray-400">Confidence: {metric.confidence}%</Text>
              <Text className="text-xs text-white">{metric.value}%</Text>
            </div>

            <Text className="text-xs text-gray-400 mt-2">{metric.interpretation}</Text>
          </div>
        ))}
      </div>

      {neuralMetrics.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">No neural metrics available at the moment</Text>
        </div>
      )}

      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          The neural metrics provided are based on algorithmic analysis and should not be considered as financial advice.
          These indicators are experimental and may not accurately predict market movements. Always conduct your own
          research before making investment decisions.
        </Text>
      </div>
    </Card>
  )
}
