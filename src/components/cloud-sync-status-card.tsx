'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, ProgressBar, Button } from '@tremor/react'
import { RiCloudLine, RiRefreshLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri'
import { useNeuralLearning } from '@/hooks/useNeuralLearning'

export function CloudSyncStatusCard() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState(0)
  
  const {
    status,
    forceSyncWithCloud
  } = useNeuralLearning({
    refreshInterval: 10000 // 10 segundos
  })
  
  // Formatar data
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Never') return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  // Iniciar sincronização manual
  const handleSync = async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    setSyncProgress(0)
    setSyncSuccess(null)
    setSyncError(null)
    
    // Simular progresso
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 8
      })
    }, 300)
    
    try {
      await forceSyncWithCloud()
      setSyncSuccess(true)
      setSyncProgress(100)
    } catch (error) {
      setSyncSuccess(false)
      setSyncError(String(error))
      setSyncProgress(0)
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setIsSyncing(false)
      }, 2000)
    }
  }
  
  // Resetar status após alguns segundos
  useEffect(() => {
    if (syncSuccess !== null) {
      const timer = setTimeout(() => {
        setSyncSuccess(null)
        setSyncError(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [syncSuccess])
  
  // Verificar se o armazenamento em nuvem está habilitado
  const isCloudEnabled = status?.cloudStorage?.enabled || false
  
  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiCloudLine className={`w-6 h-6 text-blue-400 ${isSyncing ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <Title className="text-white text-xl">Cloud Sync Status</Title>
            <Text className="text-xs text-gray-400">
              {isCloudEnabled ? 'Neural data is synced with cloud storage' : 'Cloud storage is disabled'}
            </Text>
          </div>
        </div>
        <Button
          size="xs"
          color="blue"
          variant="secondary"
          icon={isSyncing ? RiRefreshLine : RiCloudLine}
          iconPosition="left"
          loading={isSyncing}
          disabled={!isCloudEnabled || isSyncing}
          onClick={handleSync}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>
      
      {isSyncing && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <Text className="text-xs text-gray-400">Sync Progress</Text>
            <Text className="text-xs text-blue-300">{Math.round(syncProgress)}%</Text>
          </div>
          <ProgressBar value={syncProgress} color="blue" className="h-1.5" />
        </div>
      )}
      
      {syncSuccess === true && (
        <div className="mb-4 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center">
          <RiCheckLine className="w-5 h-5 text-emerald-400 mr-2" />
          <Text className="text-sm text-emerald-300">Sync completed successfully</Text>
        </div>
      )}
      
      {syncSuccess === false && (
        <div className="mb-4 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
          <div className="flex items-center mb-1">
            <RiErrorWarningLine className="w-5 h-5 text-rose-400 mr-2" />
            <Text className="text-sm text-rose-300">Sync failed</Text>
          </div>
          {syncError && (
            <Text className="text-xs text-rose-200/70 ml-7">{syncError}</Text>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Cloud Status</Text>
          <Text className="text-sm font-medium text-white">
            {isCloudEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </div>
        
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Last Sync</Text>
          <Text className="text-sm font-medium text-white">
            {formatDate(status?.cloudStorage?.lastSync || 'Never')}
          </Text>
        </div>
        
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Sync Interval</Text>
          <Text className="text-sm font-medium text-white">
            {status?.cloudStorage?.syncInterval || 'N/A'}
          </Text>
        </div>
        
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <Text className="text-xs text-gray-400">Models Synced</Text>
          <Text className="text-sm font-medium text-white">
            {status?.models?.length || 0}
          </Text>
        </div>
      </div>
      
      <div className="mt-3 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
        <Text className="text-sm text-white/90">
          <span className="font-bold text-blue-400">Cloud Storage:</span> Neural learning data is automatically synced with cloud storage, allowing the system to continue learning even when your computer is offline. The cloud storage retains model weights, training data, and insights.
        </Text>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
          <span>Auto-sync every {status?.cloudStorage?.syncInterval || 'N/A'}</span>
          <span>Models, data, and insights are preserved</span>
        </div>
      </div>
    </Card>
  )
}
