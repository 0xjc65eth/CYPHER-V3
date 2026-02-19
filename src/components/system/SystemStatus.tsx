'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Card, Title, Text, Badge, Metric } from '@tremor/react'
import { 
  RiCheckLine, 
  RiErrorWarningLine, 
  RiCloseLine,
  RiWifiLine,
  RiShieldCheckLine,
  RiDashboardLine,
  RiDatabase2Line,
  RiCpuLine,
  RiSpeedLine,
  RiRefreshLine
} from 'react-icons/ri'

interface SystemMetrics {
  overall: 'healthy' | 'degraded' | 'down'
  services: Array<{
    name: string
    status: 'healthy' | 'degraded' | 'down'
    responseTime?: number
    error?: string
  }>
  performance: {
    averageResponseTime: number
    slowestService: string
    fastestService: string
  }
  serviceStats: {
    healthy: number
    degraded: number
    down: number
    healthPercentage: number
  }
  cache: {
    size: number
    entries: number
  }
  uptime: number
  version: {
    api: string
    hiro: string
  }
}

export function SystemStatus() {
  const wallet = useWallet()
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status/')
      const data = await response.json()
      setSystemMetrics(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching system status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <RiCheckLine className="w-4 h-4 text-emerald-400" />
      case 'degraded':
        return <RiErrorWarningLine className="w-4 h-4 text-yellow-400" />
      case 'down':
        return <RiCloseLine className="w-4 h-4 text-red-400" />
      default:
        return <RiWifiLine className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'degraded':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'down':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m ${seconds % 60}s`
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-gray-500/30 shadow-xl backdrop-blur-xl">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <RiRefreshLine className="w-4 h-4 text-gray-400 animate-spin" />
            <Text className="text-gray-400 text-sm">Loading system status...</Text>
          </div>
        </div>
      </Card>
    )
  }

  if (!systemMetrics) {
    return (
      <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-red-500/30 shadow-xl backdrop-blur-xl">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <RiErrorWarningLine className="w-4 h-4 text-red-400" />
            <Text className="text-red-400 text-sm">Unable to load system status</Text>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-blue-500/30 shadow-xl backdrop-blur-xl">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemMetrics.overall)}
              <Title className="text-white text-sm">System Status</Title>
            </div>
            <Badge className={getStatusColor(systemMetrics.overall)}>
              {systemMetrics.overall.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {wallet.isPremium && (
              <RiShieldCheckLine className="w-4 h-4 text-yellow-400" />
            )}
            <button
              onClick={fetchSystemStatus}
              className="p-1 bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors"
            >
              <RiRefreshLine className="w-3 h-3 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-black/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center gap-1 mb-1">
              <RiDatabase2Line className="w-3 h-3 text-blue-400" />
              <Text className="text-gray-400 text-xs">Services</Text>
            </div>
            <Text className="text-white text-sm font-medium">
              {systemMetrics.serviceStats.healthy}/{systemMetrics.services.length}
            </Text>
          </div>

          <div className="bg-black/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center gap-1 mb-1">
              <RiSpeedLine className="w-3 h-3 text-emerald-400" />
              <Text className="text-gray-400 text-xs">Avg Response</Text>
            </div>
            <Text className="text-white text-sm font-medium">
              {Math.round(systemMetrics.performance.averageResponseTime)}ms
            </Text>
          </div>

          <div className="bg-black/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center gap-1 mb-1">
              <RiCpuLine className="w-3 h-3 text-purple-400" />
              <Text className="text-gray-400 text-xs">Cache</Text>
            </div>
            <Text className="text-white text-sm font-medium">
              {systemMetrics.cache.size} items
            </Text>
          </div>

          <div className="bg-black/30 rounded-lg p-2 border border-gray-600/30">
            <div className="flex items-center gap-1 mb-1">
              <RiDashboardLine className="w-3 h-3 text-cyan-400" />
              <Text className="text-gray-400 text-xs">Uptime</Text>
            </div>
            <Text className="text-white text-sm font-medium">
              {formatUptime(systemMetrics.uptime)}
            </Text>
          </div>
        </div>

        {/* Service Status */}
        <div className="space-y-2">
          {systemMetrics.services.slice(0, 4).map((service, index) => (
            <div key={index} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <Text className="text-gray-300 text-xs">
                  {service.name.replace('HIRO ', '')}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {service.responseTime && (
                  <Text className="text-gray-400 text-xs">
                    {service.responseTime}ms
                  </Text>
                )}
                <div className={`w-2 h-2 rounded-full ${
                  service.status === 'healthy' ? 'bg-emerald-400' :
                  service.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Text className="text-gray-400 text-xs">
              API v{systemMetrics.version.api}
            </Text>
            <Text className="text-gray-400 text-xs">
              HIRO v{systemMetrics.version.hiro}
            </Text>
          </div>
          
          {lastUpdate && (
            <Text className="text-gray-400 text-xs">
              Updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </div>
      </div>
    </Card>
  )
}