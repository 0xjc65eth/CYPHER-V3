'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { enhancedNeuralLearningService, EnhancedNeuralInsight, EnhancedNeuralLearningEvents } from '@/services/enhanced-neural-learning-service'
import { neuralLearningService, NeuralInsight } from '@/services/neural-learning-service'

interface UseNeuralLearningOptions {
  autoStart?: boolean
  insightTypes?: string[]
  insightLimit?: number
  refreshInterval?: number
  useEnhancedService?: boolean
}

export function useNeuralLearning(options: UseNeuralLearningOptions = {}) {
  const {
    autoStart = true,
    insightTypes = [],
    insightLimit = 10,
    refreshInterval = 30000, // 30 seconds
    useEnhancedService = true
  } = options

  const [isLearning, setIsLearning] = useState(false)
  const [lastModelUpdate, setLastModelUpdate] = useState<string | null>(null)
  const [learningProgress, setLearningProgress] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [healthStatus, setHealthStatus] = useState<string>('unknown')
  const [modelErrors, setModelErrors] = useState<any[]>([])
  const [trainingMetrics, setTrainingMetrics] = useState<any>(null)

  // Initialize and setup event listeners
  useEffect(() => {
    const service = useEnhancedService ? enhancedNeuralLearningService : neuralLearningService;
    
    if (autoStart && useEnhancedService) {
      // Enhanced service doesn't have start/stop methods like the original
      // It auto-initializes and runs continuously
    } else if (autoStart) {
      startLearning()
    }

    // Setup event handlers for enhanced service
    if (useEnhancedService) {
      const handleModelTrained = (data: any) => {
        setLastModelUpdate(data.timestamp)
        setTrainingMetrics(data)
      }

      const handleTrainingStarted = (data: any) => {
        setIsLearning(true)
        setLearningProgress(0)
      }

      const handleTrainingCompleted = (data: any) => {
        setIsLearning(false)
        setLastModelUpdate(data.timestamp)
        setTrainingMetrics(data)
      }

      const handleTrainingEpoch = (data: any) => {
        setLearningProgress(data.progress)
      }

      const handleModelSaved = (data: any) => {
        setLastSyncTime(data.timestamp)
      }

      const handlePerformanceUpdated = (data: any) => {
        setHealthStatus(data.healthStatus || data.status || 'healthy')
        if (data.status === 'recovered') {
          setIsInitialized(true)
        }
      }

      const handleErrorOccurred = (data: any) => {
        setModelErrors(prev => [...prev.slice(-9), data]) // Keep last 10 errors
        if (data.severity === 'critical' || data.severity === 'fatal') {
          setIsInitialized(false)
        }
      }

      const handleAutoRetrain = (data: any) => {
      }

      // Register enhanced service listeners
      service.on(EnhancedNeuralLearningEvents.MODEL_TRAINED, handleModelTrained)
      service.on(EnhancedNeuralLearningEvents.MODEL_TRAINING_STARTED, handleTrainingStarted)
      service.on(EnhancedNeuralLearningEvents.MODEL_TRAINING_COMPLETED, handleTrainingCompleted)
      service.on(EnhancedNeuralLearningEvents.MODEL_TRAINING_EPOCH, handleTrainingEpoch)
      service.on(EnhancedNeuralLearningEvents.MODEL_SAVED, handleModelSaved)
      service.on(EnhancedNeuralLearningEvents.PERFORMANCE_UPDATED, handlePerformanceUpdated)
      service.on(EnhancedNeuralLearningEvents.ERROR_OCCURRED, handleErrorOccurred)
      service.on(EnhancedNeuralLearningEvents.AUTO_RETRAIN_TRIGGERED, handleAutoRetrain)

      // Check if service is initialized
      setIsInitialized(true) // Enhanced service auto-initializes

      // Cleanup function
      return () => {
        service.off(EnhancedNeuralLearningEvents.MODEL_TRAINED, handleModelTrained)
        service.off(EnhancedNeuralLearningEvents.MODEL_TRAINING_STARTED, handleTrainingStarted)
        service.off(EnhancedNeuralLearningEvents.MODEL_TRAINING_COMPLETED, handleTrainingCompleted)
        service.off(EnhancedNeuralLearningEvents.MODEL_TRAINING_EPOCH, handleTrainingEpoch)
        service.off(EnhancedNeuralLearningEvents.MODEL_SAVED, handleModelSaved)
        service.off(EnhancedNeuralLearningEvents.PERFORMANCE_UPDATED, handlePerformanceUpdated)
        service.off(EnhancedNeuralLearningEvents.ERROR_OCCURRED, handleErrorOccurred)
        service.off(EnhancedNeuralLearningEvents.AUTO_RETRAIN_TRIGGERED, handleAutoRetrain)
      }
    } else {
      // Original service event handlers
      const currentStatus = neuralLearningService.getStatus()
      setIsLearning(currentStatus.isLearning)
      setLastModelUpdate(currentStatus.lastModelUpdate)

      const handleModelTrained = (data: any) => {
        setLastModelUpdate(data.timestamp)
        setLearningProgress(prev => Math.min(100, prev + 5))
      }

      const handleLearningStarted = () => {
        setIsLearning(true)
        setLearningProgress(0)
      }

      const handleLearningStopped = () => {
        setIsLearning(false)
      }

      const handleCloudSyncStarted = () => {
        setIsSyncing(true)
      }

      const handleCloudSyncCompleted = (data: any) => {
        setIsSyncing(false)
        setLastSyncTime(data.timestamp)
      }

      const handleForcedCloudSync = (data: any) => {
        if (data.success) {
          setLastSyncTime(data.timestamp)
        }
        setIsSyncing(false)
      }

      // Register original service listeners
      neuralLearningService.on('model-trained', handleModelTrained)
      neuralLearningService.on('learning-started', handleLearningStarted)
      neuralLearningService.on('learning-stopped', handleLearningStopped)
      neuralLearningService.on('cloud-sync-started', handleCloudSyncStarted)
      neuralLearningService.on('cloud-data-saved', handleCloudSyncCompleted)
      neuralLearningService.on('cloud-data-loaded', handleCloudSyncCompleted)
      neuralLearningService.on('forced-cloud-sync', handleForcedCloudSync)

      setIsInitialized(true)

      // Cleanup function
      return () => {
        neuralLearningService.off('model-trained', handleModelTrained)
        neuralLearningService.off('learning-started', handleLearningStarted)
        neuralLearningService.off('learning-stopped', handleLearningStopped)
        neuralLearningService.off('cloud-sync-started', handleCloudSyncStarted)
        neuralLearningService.off('cloud-data-saved', handleCloudSyncCompleted)
        neuralLearningService.off('cloud-data-loaded', handleCloudSyncCompleted)
        neuralLearningService.off('forced-cloud-sync', handleForcedCloudSync)
      }
    }
  }, [autoStart, useEnhancedService])

  // Functions for starting/stopping learning
  const startLearning = () => {
    if (!useEnhancedService) {
      neuralLearningService.startContinuousLearning()
      setIsLearning(true)
    }
    // Enhanced service auto-starts, no manual start needed
  }

  const stopLearning = () => {
    if (!useEnhancedService) {
      neuralLearningService.stopContinuousLearning()
      setIsLearning(false)
    }
    // Enhanced service runs continuously, no manual stop
  }

  // Get insights using React Query
  const { data: insights, isLoading, error, refetch } = useQuery({
    queryKey: ['neural-insights', insightTypes, insightLimit, useEnhancedService],
    queryFn: async () => {
      if (useEnhancedService) {
        // Use enhanced service insights
        const enhancedInsights = await enhancedNeuralLearningService.generateInsights({
          count: insightLimit,
          types: insightTypes.length > 0 ? insightTypes : undefined,
          minConfidence: 0.6
        })
        return enhancedInsights
      } else {
        // Use original service insights
        const allInsights = neuralLearningService.getRecentInsights(insightLimit)
        
        // Filter by types if specified
        if (insightTypes.length > 0) {
          return allInsights.filter(insight => insightTypes.includes(insight.type))
        }
        
        return allInsights
      }
    },
    staleTime: 30000, // 30s - AI insights
    refetchInterval: refreshInterval,
    enabled: isInitialized
  })

  // Get service status
  const { data: status } = useQuery({
    queryKey: ['neural-learning-status', useEnhancedService],
    queryFn: () => {
      if (useEnhancedService) {
        return {
          isLearning,
          isInitialized,
          healthStatus,
          modelErrors: modelErrors.slice(-5), // Last 5 errors
          trainingMetrics,
          modelsCount: 5, // Enhanced service has 5 models
          lastModelUpdate,
          lastSyncTime
        }
      } else {
        return neuralLearningService.getStatus()
      }
    },
    staleTime: 10000, // 10s - status changes frequently
    refetchInterval: refreshInterval,
    enabled: true
  })

  // Get models
  const { data: models } = useQuery({
    queryKey: ['neural-learning-models', useEnhancedService],
    queryFn: () => {
      if (useEnhancedService) {
        return enhancedNeuralLearningService.getModels()
      } else {
        return neuralLearningService.getAllModels()
      }
    },
    refetchInterval: refreshInterval,
    enabled: isInitialized
  })

  // Function to get insights by type
  const getInsightsByType = (type: string, limit: number = 5) => {
    if (useEnhancedService) {
      return enhancedNeuralLearningService.getInsights({
        count: limit,
        types: [type],
        minConfidence: 0.6
      })
    } else {
      return neuralLearningService.getRecentInsights(limit, type)
    }
  }

  // Function to update configuration
  const updateConfig = (newConfig: any) => {
    if (useEnhancedService) {
      enhancedNeuralLearningService.setOptions(newConfig)
    } else {
      neuralLearningService.updateConfig(newConfig)
    }
  }

  // Function to train a specific model (enhanced service only)
  const trainModel = async (modelId: string, trainingData: any, options: any = {}) => {
    if (useEnhancedService) {
      try {
        return await enhancedNeuralLearningService.trainModel(modelId, trainingData, options)
      } catch (error) {
        console.error('Error training model:', error)
        throw error
      }
    } else {
      throw new Error('Model training only available with enhanced service')
    }
  }

  // Function to generate predictions (enhanced service only)
  const generatePrediction = async (timeframe: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' = '24h') => {
    if (useEnhancedService) {
      try {
        return await enhancedNeuralLearningService.generatePredictions(timeframe)
      } catch (error) {
        console.error('Error generating prediction:', error)
        throw error
      }
    } else {
      throw new Error('Advanced predictions only available with enhanced service')
    }
  }

  // Function to force cloud sync
  const forceSyncWithCloud = async () => {
    try {
      if (useEnhancedService) {
        // Enhanced service auto-syncs via IndexedDB and cache
        return true
      } else {
        await neuralLearningService.forceSyncWithCloud()
        return true
      }
    } catch (error) {
      console.error('Error syncing with cloud:', error)
      throw error
    }
  }

  return {
    // Core state
    isLearning,
    isInitialized,
    lastModelUpdate,
    learningProgress,
    isSyncing,
    lastSyncTime,
    
    // Enhanced service specific state
    healthStatus,
    modelErrors,
    trainingMetrics,
    
    // Query state
    insights,
    models,
    status,
    isLoading,
    error,
    refetch,
    
    // Actions
    startLearning,
    stopLearning,
    getInsightsByType,
    updateConfig,
    forceSyncWithCloud,
    
    // Enhanced service specific actions
    trainModel,
    generatePrediction,
    
    // Service type
    useEnhancedService
  }
}
