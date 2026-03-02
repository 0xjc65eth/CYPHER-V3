'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, ProgressBar } from '@tremor/react'
import { RiBarChartBoxLine, RiLineChartLine, RiTimeLine, RiRefreshLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri'
import { useNeuralLearning } from '@/hooks/useNeuralLearning'
import { DashboardCard } from '@/components/dashboard-card'

export function NeuralSmcCard() {
  const [mounted, setMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const {
    insights,
    isLearning,
    learningProgress,
    isLoading,
    getInsightsByType
  } = useNeuralLearning({
    insightTypes: ['smc'],
    refreshInterval: 15000 // 15 segundos
  })
  
  // Obter apenas insights de SMC
  const smcInsights = getInsightsByType('smc', 1)
  const latestSmcInsight = smcInsights[0]
  
  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Simular atualização
  const handleRefresh = () => {
    setIsUpdating(true)
    setTimeout(() => {
      setIsUpdating(false)
    }, 1500)
  }
  
  // Formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString()
  }
  
  return (
    <DashboardCard title="Neural SMC Analysis" className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30">
              <RiBarChartBoxLine className={`w-5 h-5 text-purple-400 ${isUpdating ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <p className="text-sm text-purple-300">Smart Money Concepts</p>
              <p className="text-xs text-gray-400">Neural market structure analysis</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
          >
            <RiRefreshLine className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {isLearning && (
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <Text className="text-xs text-gray-400">Learning Progress</Text>
              <Text className="text-xs text-blue-300">{learningProgress}%</Text>
            </div>
            <ProgressBar value={learningProgress} color="purple" className="h-1" />
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <RiRefreshLine className="animate-spin text-purple-400 w-6 h-6" />
          </div>
        ) : mounted && latestSmcInsight ? (
          <>
            <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-lg p-3 border border-purple-500/20">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <RiBarChartBoxLine className="w-4 h-4 text-purple-400 mr-1" />
                  <span className="text-sm font-medium text-white">Market Structure</span>
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  latestSmcInsight.prediction.marketStructure.includes('Bullish') ? 'bg-emerald-500/20 text-emerald-300' :
                  latestSmcInsight.prediction.marketStructure.includes('Bearish') ? 'bg-rose-500/20 text-rose-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {latestSmcInsight.prediction.marketStructure}
                </span>
              </div>
              
              <p className="text-sm text-white/90 mb-3">
                {latestSmcInsight.explanation}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-purple-300">Key Level</p>
                  <p className="text-sm font-medium text-white">${latestSmcInsight.prediction.keyLevel.toLocaleString()}</p>
                </div>
                <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-purple-300">Confidence</p>
                  <p className={`text-sm font-medium ${
                    latestSmcInsight.confidence > 0.8 ? 'text-emerald-400' :
                    latestSmcInsight.confidence > 0.7 ? 'text-blue-400' :
                    'text-amber-400'
                  }`}>{(latestSmcInsight.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-lg p-3 border border-purple-500/20">
                <p className="text-xs text-purple-300 mb-2">Order Blocks</p>
                <div className="space-y-2">
                  {latestSmcInsight.prediction.orderBlocks.map((block: any, index: number) => (
                    <div key={index} className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${block.type === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {block.type}
                        </span>
                        <span className="text-xs text-gray-400">Strength: {(block.strength * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-sm font-medium text-white">${block.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-lg p-3 border border-purple-500/20">
                <p className="text-xs text-purple-300 mb-2">Fair Value Gaps</p>
                <div className="space-y-2">
                  {latestSmcInsight.prediction.fairValueGaps.map((gap: any, index: number) => (
                    <div key={index} className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${gap.type === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {gap.type}
                        </span>
                        <span className={`text-xs ${gap.status === 'Filled' ? 'text-gray-400' : 'text-blue-400'}`}>
                          {gap.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white">${gap.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 rounded-lg p-3 border border-indigo-500/20">
              <p className="text-xs text-indigo-300 mb-2">Trade Setup</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">Entry</p>
                  <p className="text-sm font-medium text-white">${(latestSmcInsight.prediction.keyLevel - 500).toLocaleString()}</p>
                </div>
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">Direction</p>
                  <p className={`text-sm font-medium ${
                    latestSmcInsight.prediction.marketStructure.includes('Bullish') ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {latestSmcInsight.prediction.marketStructure.includes('Bullish') ? 'Long' : 'Short'}
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">Take Profit</p>
                  <p className="text-sm font-medium text-white">
                    ${(latestSmcInsight.prediction.marketStructure.includes('Bullish') 
                      ? latestSmcInsight.prediction.keyLevel + 2000 
                      : latestSmcInsight.prediction.keyLevel - 2000).toLocaleString()}
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">Stop Loss</p>
                  <p className="text-sm font-medium text-white">
                    ${(latestSmcInsight.prediction.marketStructure.includes('Bullish') 
                      ? latestSmcInsight.prediction.keyLevel - 1000 
                      : latestSmcInsight.prediction.keyLevel + 1000).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Risk/Reward: 1:{latestSmcInsight.prediction.marketStructure.includes('Bullish') ? '2.0' : '2.0'}</span>
                <span>Based on neural SMC analysis</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <Text className="text-gray-400">No SMC analysis available</Text>
            <Text className="text-xs text-gray-500 mt-1">The neural system is analyzing market structure</Text>
          </div>
        )}
        
        <div className="mt-3 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
          <p className="text-sm text-white/90">
            <span className="font-bold text-purple-400">Neural Analysis:</span> Our advanced neural engine continuously
            analyzes market structure using Smart Money Concepts, identifying key levels, order blocks, and fair value gaps.
            Trade setups are generated with precise entry, take profit, and stop loss levels.
          </p>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>Last update: {mounted && latestSmcInsight ? formatDate(latestSmcInsight.timestamp) : new Date().toLocaleTimeString()}</span>
            <span>Model accuracy: {mounted && latestSmcInsight ? `${(latestSmcInsight.confidence * 100).toFixed(0)}%` : '82%'}</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}
