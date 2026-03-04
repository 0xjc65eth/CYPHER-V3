'use client'

import { useState } from 'react'
import { Card, Title, Text, ProgressBar, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react'
import { RiBrainLine, RiPulseLine, RiLineChartLine, RiRefreshLine, RiSettings4Line, RiPlayLine, RiPauseLine, RiCloudLine } from 'react-icons/ri'
import { useNeuralLearning } from '@/hooks/useNeuralLearning'

export function NeuralLearningStatusCard() {
  const {
    isLearning,
    startLearning,
    stopLearning,
    insights,
    models,
    status,
    lastModelUpdate,
    learningProgress,
    isLoading
  } = useNeuralLearning({
    refreshInterval: 10000, // 10 segundos
    insightLimit: 20
  })

  const [activeTab, setActiveTab] = useState(0)

  // Formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Calcular média de precisão dos modelos
  const averageAccuracy = (models?.reduce((sum, model) => sum + model.accuracy, 0) ?? 0) / (models?.length || 1)

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiBrainLine className={`w-6 h-6 text-blue-400 ${isLearning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <Title className="text-white text-xl">Neural Learning System</Title>
            <Text className="text-xs text-gray-400">
              {isLearning ? 'Learning in progress' : 'Learning paused'} • Last update: {formatDate(lastModelUpdate || '')}
            </Text>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={isLearning ? stopLearning : startLearning}
            className={`px-3 py-1.5 rounded-lg flex items-center ${
              isLearning
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {isLearning ? (
              <>
                <RiPauseLine className="mr-1" /> Pause
              </>
            ) : (
              <>
                <RiPlayLine className="mr-1" /> Start
              </>
            )}
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
          >
            <RiSettings4Line />
          </button>
        </div>
      </div>

      {isLearning && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <Text className="text-xs text-gray-400">Learning Progress</Text>
            <Text className="text-xs text-blue-300">{learningProgress}%</Text>
          </div>
          <ProgressBar value={learningProgress} color="blue" className="h-1.5" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Models</Text>
          <div className="flex items-end justify-between">
            <Text className="text-xl font-bold text-white">{models?.length || 0}</Text>
            <div className="flex items-center">
              <Text className="text-xs text-blue-300 mr-1">Avg. Accuracy:</Text>
              <Text className="text-sm font-medium text-emerald-400">{(averageAccuracy * 100).toFixed(1)}%</Text>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Data Points</Text>
          <div className="flex items-end justify-between">
            <Text className="text-xl font-bold text-white">{status?.dataPoints?.market || 0}</Text>
            <div className="flex items-center">
              <RiPulseLine className="text-blue-400 mr-1" />
              <Text className="text-xs text-blue-300">Active</Text>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Insights Generated</Text>
          <div className="flex items-end justify-between">
            <Text className="text-xl font-bold text-white">{insights?.length || 0}</Text>
            <div className="flex items-center">
              <RiLineChartLine className="text-blue-400 mr-1" />
              <Text className="text-xs text-blue-300">Active</Text>
            </div>
          </div>
        </div>
      </div>

      <TabGroup index={activeTab} onIndexChange={setActiveTab}>
        <TabList className="mb-4">
          <Tab className="text-sm">Latest Insights</Tab>
          <Tab className="text-sm">Models</Tab>
          <Tab className="text-sm">System Status</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RiRefreshLine className="animate-spin text-blue-400 w-6 h-6" />
                </div>
              ) : insights && insights.length > 0 ? (
                insights.map((insight) => (
                  <div key={insight.id} className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          insight.type === 'price' ? 'bg-emerald-400' :
                          insight.type === 'smc' ? 'bg-purple-400' :
                          insight.type === 'arbitrage' ? 'bg-amber-400' :
                          insight.type === 'ordinals' ? 'bg-blue-400' :
                          'bg-rose-400'
                        }`}></span>
                        <Text className="text-sm font-medium text-white capitalize">{insight.type} Insight</Text>
                      </div>
                      <div className="flex items-center">
                        <Text className="text-xs text-gray-400 mr-1">Confidence:</Text>
                        <Text className={`text-xs font-medium ${
                          insight.confidence > 0.8 ? 'text-emerald-400' :
                          insight.confidence > 0.7 ? 'text-blue-400' :
                          'text-amber-400'
                        }`}>{(insight.confidence * 100).toFixed(0)}%</Text>
                      </div>
                    </div>
                    <Text className="text-sm text-white/90 mb-1">{insight.explanation}</Text>
                    <div className="flex justify-between items-center mt-1">
                      <Text className="text-xs text-gray-400">{formatDate(insight.timestamp)}</Text>
                      <Text className="text-xs text-blue-300">Model: {insight.modelId}</Text>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Text className="text-gray-400">No insights generated yet</Text>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {models?.map((model) => (
                <div key={model.id} className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                  <div className="flex justify-between items-center mb-1">
                    <Text className="text-sm font-medium text-white">{model.name}</Text>
                    <div className="flex items-center">
                      <Text className="text-xs text-gray-400 mr-1">Accuracy:</Text>
                      <Text className={`text-xs font-medium ${
                        model.accuracy > 0.8 ? 'text-emerald-400' :
                        model.accuracy > 0.7 ? 'text-blue-400' :
                        'text-amber-400'
                      }`}>{(model.accuracy * 100).toFixed(1)}%</Text>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <Text className="text-xs text-gray-400">Data Points</Text>
                      <Text className="text-sm font-medium text-white">{model.dataPoints.toLocaleString()}</Text>
                    </div>
                    <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <Text className="text-xs text-gray-400">Last Training</Text>
                      <Text className="text-sm font-medium text-white">{formatDate(model.lastTraining).split(',')[0]}</Text>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Text className="text-xs text-gray-400 mb-1">Features</Text>
                    <div className="flex flex-wrap gap-1">
                      {model.features.map((feature: any) => (
                        <span key={String(feature)} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                          {String(feature)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>

          <TabPanel>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <Text className="text-sm font-medium text-white mb-2">Learning Configuration</Text>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Learning Rate</Text>
                    <Text className="text-sm font-medium text-white">{status?.config?.learningRate || 0.01}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Batch Size</Text>
                    <Text className="text-sm font-medium text-white">{status?.config?.batchSize || 32}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Epochs</Text>
                    <Text className="text-sm font-medium text-white">{status?.config?.epochs || 10}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Data Retention</Text>
                    <Text className="text-sm font-medium text-white">{status?.config?.dataRetentionDays || 30} days</Text>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <Text className="text-sm font-medium text-white mb-2">Data Collection Status</Text>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Market Data</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.market || 0}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Mempool Data</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.mempool || 0}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Ordinals Data</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.ordinals || 0}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Runes Data</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.runes || 0}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Social Data</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.socialSentiment || 0}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Trade Setups</Text>
                    <Text className="text-sm font-medium text-white">{status?.dataPoints?.tradeSetups || 0}</Text>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <Text className="text-sm font-medium text-white mb-2">System Performance</Text>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Learning Status</Text>
                    <Text className={`text-sm font-medium ${isLearning ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isLearning ? 'Active' : 'Paused'}
                    </Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Last Update</Text>
                    <Text className="text-sm font-medium text-white">{formatDate(lastModelUpdate || '')}</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Avg. Model Accuracy</Text>
                    <Text className={`text-sm font-medium ${
                      averageAccuracy > 0.8 ? 'text-emerald-400' :
                      averageAccuracy > 0.7 ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>{(averageAccuracy * 100).toFixed(1)}%</Text>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    <Text className="text-xs text-gray-400">Insights Generated</Text>
                    <Text className="text-sm font-medium text-white">{insights?.length || 0}</Text>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <div className="mt-3 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 border border-blue-500/30">
            <RiCloudLine className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-blue-300">Degoo Cloud Storage Integration</p>
            <p className="text-xs text-emerald-400">24/7 Neural Learning Enabled</p>
          </div>
        </div>
        <p className="text-xs text-white/80">
          Our advanced neural system continuously learns from market data, even when your device is offline,
          thanks to Degoo cloud storage integration. This ensures you always have the most accurate insights
          and predictions for Bitcoin, Ordinals, Runes, and arbitrage opportunities.
        </p>
        <div className="mt-2 text-xs text-gray-400 flex justify-between items-center">
          <span>Neural learning system is running 24/7 to improve insights and predictions</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </Card>
  )
}
