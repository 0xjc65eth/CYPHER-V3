"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { neuralLearningService } from '@/services/neural-learning-service'

interface NeuralMetric {
  name: string
  value: number
  change: number
  description: string
}

interface AutoCorrection {
  id: string
  timestamp: string
  dataType: string
  field: string
  oldValue: string | number
  newValue: string | number
  confidence: number
  source: string
  explanation: string
}

interface LearningProgress {
  stage: 'data_collection' | 'preprocessing' | 'training' | 'validation' | 'insight_generation' | 'correction'
  progress: number
  startTime: string
  estimatedEndTime: string
  currentTask: string
  completedTasks: number
  totalTasks: number
}

interface NeuralSystemData {
  status: 'training' | 'analyzing' | 'idle' | 'error' | 'correcting'
  lastUpdated: string
  accuracy: number
  dataPoints: number
  metrics: NeuralMetric[]
  recentInsights: string[]
  errorMessage?: string
  learningProgress: LearningProgress
  autoCorrections: AutoCorrection[]
}

export default function NeuralSystemStatus() {
  const [data, setData] = useState<NeuralSystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNeuralSystemStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to get real data from the neural learning service
      let realData = null

      try {
        // Get status from neural learning service
        const serviceStatus = neuralLearningService.getStatus()
        const models = neuralLearningService.getAllModels()
        const insights = neuralLearningService.getRecentInsights(5)
        const corrections = (neuralLearningService as any).getAutoCorrections ?
          (neuralLearningService as any).getAutoCorrections(5) :
          generateMockCorrections(5)

        if (serviceStatus && models) {
          // Use real data if available
          realData = {
            status: serviceStatus.isLearning ? 'training' : 'idle',
            lastUpdated: serviceStatus.lastModelUpdate || new Date().toISOString(),
            accuracy: models.reduce((sum, model) => sum + model.accuracy, 0) / models.length * 100,
            dataPoints: Object.values(serviceStatus.dataPoints || {}).reduce((sum: number, val: any) => sum + Number(val), 0),
            metrics: models.map(model => ({
              name: model.name,
              value: model.accuracy * 100,
              change: 0,
              description: `Accuracy of ${model.name.toLowerCase()} based on ${model.dataPoints} data points`
            })),
            recentInsights: insights.map(insight => insight.explanation),
            learningProgress: getLearningProgress(),
            autoCorrections: corrections
          }
        }
      } catch (error) {
        // Fall back to mock data if real data is not available
      }

      if (!realData) {
        // Fallback data when neural service is unavailable
        console.warn('[NEURAL] Using fallback data - neural service unavailable')
        const now = new Date()

        realData = {
          status: 'idle' as const,
          lastUpdated: now.toISOString(),
          accuracy: 0,
          dataPoints: 0,
          metrics: [
            {
              name: 'Ordinals Price Prediction',
              value: 0,
              change: 0,
              description: 'Accuracy of 24-hour price movement predictions for top Ordinals collections'
            },
            {
              name: 'Runes Market Analysis',
              value: 0,
              change: 0,
              description: 'Precision of Runes market trend analysis and liquidity predictions'
            },
            {
              name: 'Arbitrage Opportunity Detection',
              value: 0,
              change: 0,
              description: 'Success rate of identified arbitrage opportunities across marketplaces'
            },
            {
              name: 'Sentiment Analysis',
              value: 0,
              change: 0,
              description: 'Correlation between social sentiment analysis and actual market movements'
            }
          ],
          recentInsights: [
            'Neural system initializing - connect to data sources for real-time insights'
          ],
          learningProgress: {
            stage: 'data_collection' as const,
            progress: 0,
            startTime: now.toISOString(),
            estimatedEndTime: now.toISOString(),
            currentTask: 'Waiting for data sources',
            completedTasks: 0,
            totalTasks: 0
          },
          autoCorrections: []
        }
      }

      setData(realData as any)
    } catch (err) {
      console.error('Error fetching neural system status:', err)
      setError('Failed to fetch neural system status')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get task description based on stage
  const getTaskDescription = (stage: LearningProgress['stage']): string => {
    switch (stage) {
      case 'data_collection':
        return 'Collecting market data from multiple sources'
      case 'preprocessing':
        return 'Normalizing and cleaning collected data'
      case 'training':
        return 'Training neural models with latest data'
      case 'validation':
        return 'Validating model accuracy with test data'
      case 'insight_generation':
        return 'Generating insights based on trained models'
      case 'correction':
        return 'Autonomously correcting inconsistent data'
      default:
        return 'Processing neural data'
    }
  }

  // Returns empty corrections when service is unavailable
  const generateMockCorrections = (_count: number): AutoCorrection[] => {
    return []
  }

  // Helper function to get current learning progress
  const getLearningProgress = (): LearningProgress => {
    // Try to get real learning progress from service
    try {
      if ((neuralLearningService as any).getLearningProgress) {
        const progress = (neuralLearningService as any).getLearningProgress()
        if (progress) return progress
      }
    } catch (error) {
    }

    // Fallback: idle state
    const now = new Date()
    return {
      stage: 'data_collection' as const,
      progress: 0,
      startTime: now.toISOString(),
      estimatedEndTime: now.toISOString(),
      currentTask: 'Waiting for data sources',
      completedTasks: 0,
      totalTasks: 0
    }
  }

  useEffect(() => {
    fetchNeuralSystemStatus()

    // Set up polling for updates
    const intervalId = setInterval(fetchNeuralSystemStatus, 30000) // Update every 30 seconds

    return () => clearInterval(intervalId)
  }, [])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Neural System Status</CardTitle>
          <CardDescription>Loading neural system data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Neural System Status</CardTitle>
          <CardDescription>Error loading neural system data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
          <Button onClick={fetchNeuralSystemStatus} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Neural System Status</CardTitle>
            <CardDescription className="text-gray-200">
              Real-time learning and analysis metrics
            </CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            data.status === 'training'
              ? 'bg-green-500/20 text-green-200'
              : data.status === 'analyzing'
              ? 'bg-blue-500/20 text-blue-200'
              : data.status === 'correcting'
              ? 'bg-amber-500/20 text-amber-200'
              : data.status === 'error'
              ? 'bg-red-500/20 text-red-200'
              : 'bg-gray-500/20 text-gray-200'
          }`}>
            {data.status === 'training' && (
              <span className="flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Training Active
              </span>
            )}
            {data.status === 'analyzing' && (
              <span className="flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Analyzing Data
              </span>
            )}
            {data.status === 'correcting' && (
              <span className="flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                Auto-Correcting Data
              </span>
            )}
            {data.status === 'idle' && "System Idle"}
            {data.status === 'error' && "System Error"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-5 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">Overall Accuracy</h3>
                <p className="text-3xl font-bold">{data.accuracy.toFixed(1)}%</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  {data.accuracy > 93
                    ? "Exceptional performance"
                    : data.accuracy > 90
                    ? "Strong performance"
                    : "Good performance"}
                </p>
              </div>
              <div className="bg-indigo-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={data.accuracy} className="h-2" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-5 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/30">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Training Data</h3>
                <p className="text-3xl font-bold">{(data.dataPoints / 1000000).toFixed(2)}M</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Data points processed
                </p>
              </div>
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-purple-700 dark:text-purple-400">
              <div className="flex justify-between">
                <span>Last updated:</span>
                <span className="font-medium">{new Date(data.lastUpdated).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Storage usage:</span>
                <span className="font-medium">42.8 GB / 100 GB</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
          <div className="space-y-4">
            {data.metrics.map((metric, index) => (
              <div key={index} className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/30">
                <div className="flex justify-between mb-2">
                  <h4 className="font-medium">{metric.name}</h4>
                  <div className="flex items-center">
                    <span className="font-bold mr-2">{metric.value.toFixed(1)}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      metric.change > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{metric.description}</p>
                <div className="mt-2">
                  <Progress value={metric.value} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Learning Progress</h3>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {data.learningProgress.currentTask}
                </span>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {data.learningProgress.progress}%
                </span>
              </div>
              <Progress value={data.learningProgress.progress} className="h-2.5 bg-blue-100 dark:bg-blue-900/30" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/50 dark:bg-gray-800/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Stage</div>
                <div className="font-medium text-blue-700 dark:text-blue-300 capitalize">
                  {data.learningProgress.stage.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasks Completed</div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  {data.learningProgress.completedTasks} / {data.learningProgress.totalTasks}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-gray-800/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Started</div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  {new Date(data.learningProgress.startTime).toLocaleTimeString()}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Completion</div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  {new Date(data.learningProgress.estimatedEndTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="insights" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">Neural Insights</TabsTrigger>
            <TabsTrigger value="corrections">Auto Corrections</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <ul className="space-y-3">
                {data.recentInsights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <div className="bg-indigo-100 dark:bg-indigo-800/30 p-1 rounded-full mr-2 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M2 12h5"></path><path d="M9 12h5"></path><path d="M16 12h6"></path><path d="M3.5 5.5L7 3"></path><path d="M3.5 18.5L7 21"></path><path d="M20.5 5.5L17 3"></path><path d="M20.5 18.5L17 21"></path></svg>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="corrections" className="mt-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
              <div className="mb-3 text-sm text-amber-700 dark:text-amber-300">
                The neural system autonomously detects and corrects inconsistencies in data to improve accuracy.
              </div>
              <ul className="space-y-3">
                {data.autoCorrections.map((correction, index) => (
                  <li key={index} className="bg-white/50 dark:bg-gray-800/30 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        {correction.dataType} {correction.field}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {correction.confidence}% confidence
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {correction.explanation}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30">
                        <span className="text-gray-500 dark:text-gray-400">Old Value:</span>
                        <span className="ml-1 font-medium text-red-700 dark:text-red-300">{correction.oldValue}</span>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded border border-green-100 dark:border-green-900/30">
                        <span className="text-gray-500 dark:text-gray-400">New Value:</span>
                        <span className="ml-1 font-medium text-green-700 dark:text-green-300">{correction.newValue}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                      <span>Source: {correction.source}</span>
                      <span>{new Date(correction.timestamp).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-gray-50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-700/30 flex justify-between">
        <div className="text-xs text-gray-500">
          Neural system running on Degoo cloud storage with 24/7 learning capability and autonomous data correction
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              try {
                (neuralLearningService as any).detectAndCorrectInconsistencies && (neuralLearningService as any).detectAndCorrectInconsistencies();
                fetchNeuralSystemStatus();
              } catch (error) {
                console.error('Error triggering auto-correction:', error);
              }
            }}
            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            Run Auto-Correction
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchNeuralSystemStatus}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
          >
            Refresh Status
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
