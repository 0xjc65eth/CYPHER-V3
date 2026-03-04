/**
 * 📊 REAL-TIME MONITOR - CYPHER AI v3.0
 * Monitor em tempo real do sistema de trading
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatUSD } from '@/utils/formatters';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, 
  Cpu, 
  Database, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Brain
} from 'lucide-react';

interface SystemMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  tradingEngineStatus: 'active' | 'inactive' | 'error';
  aiModelAccuracy: number;
  totalTrades: number;
  profitLoss: number;
  activePairs: number;
  riskScore: number;
}

interface MarketTick {
  timestamp: number;
  btc: number;
  eth: number;
  ordi: number;
}

export function RealTimeMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [marketData, setMarketData] = useState<MarketTick[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Initialize with zero/default values - real data should come from system monitoring
    const initialMetrics: SystemMetrics = {
      timestamp: Date.now(),
      cpuUsage: 0,
      memoryUsage: 0,
      networkLatency: 0,
      tradingEngineStatus: 'inactive',
      aiModelAccuracy: 0,
      totalTrades: 0,
      profitLoss: 0,
      activePairs: 0,
      riskScore: 0
    };

    const initialMarketTick: MarketTick = {
      timestamp: Date.now(),
      btc: 0,
      eth: 0,
      ordi: 0
    };

    setCurrentMetrics(initialMetrics);
    setMetrics([initialMetrics]);
    setMarketData([initialMarketTick]);
    setIsConnected(false);

    // In production, connect to real system monitoring and market data feeds
    // Example: connectToSystemMonitor() / connectToMarketDataFeed()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getMetricColor = (value: number, threshold: number, inverse = false) => {
    const isHigh = value > threshold;
    if (inverse) {
      return isHigh ? 'text-red-500' : 'text-green-500';
    }
    return isHigh ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white font-medium">
              Real-Time Monitor {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </Card>

      {/* System Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className={getMetricColor(currentMetrics.cpuUsage, 80, true)}>
                {currentMetrics.cpuUsage.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">CPU Usage</div>
            <Progress value={currentMetrics.cpuUsage} className="h-2" />
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-purple-500" />
              <span className={getMetricColor(currentMetrics.memoryUsage, 85, true)}>
                {currentMetrics.memoryUsage.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">Memory</div>
            <Progress value={currentMetrics.memoryUsage} className="h-2" />
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Wifi className="w-5 h-5 text-cyan-500" />
              <span className={getMetricColor(currentMetrics.networkLatency, 50, true)}>
                {currentMetrics.networkLatency.toFixed(0)}ms
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">Latency</div>
            <Progress value={Math.min(currentMetrics.networkLatency * 2, 100)} className="h-2" />
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-yellow-500" />
              <span className={getMetricColor(currentMetrics.aiModelAccuracy, 75)}>
                {currentMetrics.aiModelAccuracy.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">AI Accuracy</div>
            <Progress value={currentMetrics.aiModelAccuracy} className="h-2" />
          </Card>
        </div>
      )}

      {/* Trading Status */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Activity className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold text-white">Trading Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Engine Status</span>
                <Badge variant={currentMetrics.tradingEngineStatus === 'active' ? 'default' : 'destructive'}>
                  {currentMetrics.tradingEngineStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Pairs</span>
                <span className="text-white font-mono">{currentMetrics.activePairs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades</span>
                <span className="text-white font-mono">{currentMetrics.totalTrades}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-white">Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">P&L</span>
                <span className={`font-mono ${currentMetrics.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUSD(currentMetrics.profitLoss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Score</span>
                <span className={`font-mono ${getMetricColor(currentMetrics.riskScore, 70, true)}`}>
                  {currentMetrics.riskScore.toFixed(0)}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">AI Confidence</span>
                <span className="text-white font-mono">{currentMetrics.aiModelAccuracy.toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-white">Alerts</h3>
            </div>
            <div className="space-y-2">
              {currentMetrics.cpuUsage > 80 && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>High CPU usage detected</span>
                </div>
              )}
              {currentMetrics.networkLatency > 50 && (
                <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Network latency elevated</span>
                </div>
              )}
              {currentMetrics.riskScore > 80 && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>High risk exposure</span>
                </div>
              )}
              {currentMetrics.tradingEngineStatus === 'active' && currentMetrics.cpuUsage < 80 && (
                <div className="flex items-center space-x-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>All systems operational</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Performance Chart */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="CPU %"
                />
                <Line 
                  type="monotone" 
                  dataKey="memoryUsage" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Memory %"
                />
                <Line 
                  type="monotone" 
                  dataKey="aiModelAccuracy" 
                  stroke="#EAB308" 
                  strokeWidth={2}
                  name="AI Accuracy %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Market Prices Chart */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Market Prices</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  formatter={(value: any, name: string) => [
                    `$${parseFloat(value).toLocaleString()}`,
                    name.toUpperCase()
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="btc" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="btc"
                />
                <Line 
                  type="monotone" 
                  dataKey="eth" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  name="eth"
                />
                <Line 
                  type="monotone" 
                  dataKey="ordi" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="ordi"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}