'use client';

import React, { useState } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import OnChainMetrics from '@/components/analytics/professional/OnChainMetrics';
import NetworkHealth from '@/components/analytics/professional/NetworkHealth';
import EntityClustering from '@/components/analytics/professional/EntityClustering';
import UTXOAnalysis from '@/components/analytics/professional/UTXOAnalysis';
import MarketStructure from '@/components/analytics/professional/MarketStructure';
import { MacroDashboard } from '@/components/analytics/dashboards/MacroDashboard';
import { MinerDashboard } from '@/components/analytics/dashboards/MinerDashboard';
import { InstitutionalDashboard } from '@/components/analytics/dashboards/InstitutionalDashboard';
import { DerivativesDashboard } from '@/components/analytics/dashboards/DerivativesDashboard';
import { LightningDashboard } from '@/components/analytics/dashboards/LightningDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Activity,
  Network,
  Zap,
  Building,
  Hammer,
  BarChart3,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [isLive, setIsLive] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'onchain', label: 'On-Chain', icon: TrendingUp },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'entities', label: 'Entities', icon: Building },
    { id: 'utxo', label: 'UTXO', icon: Activity },
    { id: 'market', label: 'Market Structure', icon: BarChart3 },
    { id: 'miners', label: 'Miners', icon: Hammer },
    { id: 'lightning', label: 'Lightning', icon: Zap },
    { id: 'derivatives', label: 'Derivatives', icon: TrendingUp }
  ];

  const timeRanges = ['24h', '7d', '30d', '90d', '1y', 'all'];

  return (
    <TopNavLayout>
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#F7931A] to-orange-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold font-mono text-white">Analytics Hub</h1>
                    <p className="text-gray-400 text-sm font-mono">Professional On-Chain Intelligence</p>
                  </div>
                </div>

                <Badge className={`${isLive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400'} animate-pulse`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  {isLive ? 'Live Data' : 'Static'}
                </Badge>
              </div>

              <div className="flex items-center space-x-3">
                {/* Time Range Selector */}
                <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                  {timeRanges.map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                      className={timeRange === range
                        ? 'bg-[#F7931A] hover:bg-orange-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }
                    >
                      {range}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLive(!isLive)}
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLive ? 'animate-spin' : ''}`} />
                  {isLive ? 'Pause' : 'Resume'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-full mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-800">
              <TabsList className="bg-transparent border-0 p-0 h-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Overview Dashboard */}
            <TabsContent value="overview" className="mt-6">
              <MacroDashboard timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* On-Chain Metrics */}
            <TabsContent value="onchain" className="mt-6">
              <OnChainMetrics />
            </TabsContent>

            {/* Network Health */}
            <TabsContent value="network" className="mt-6">
              <NetworkHealth />
            </TabsContent>

            {/* Entity Clustering */}
            <TabsContent value="entities" className="mt-6">
              <EntityClustering timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* UTXO Analysis */}
            <TabsContent value="utxo" className="mt-6">
              <UTXOAnalysis timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* Market Structure */}
            <TabsContent value="market" className="mt-6">
              <MarketStructure timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* Miners Dashboard */}
            <TabsContent value="miners" className="mt-6">
              <MinerDashboard timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* Lightning Dashboard */}
            <TabsContent value="lightning" className="mt-6">
              <LightningDashboard timeRange={timeRange} isLive={isLive} />
            </TabsContent>

            {/* Derivatives Dashboard */}
            <TabsContent value="derivatives" className="mt-6">
              <InstitutionalDashboard timeRange={timeRange} isLive={isLive} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TopNavLayout>
  );
}
