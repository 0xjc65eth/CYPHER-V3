/**
 * 📊 CYPHER FEE REPORTS COMPONENT
 * Interface administrativa para relatórios de taxas
 * Visualização completa de revenue, distribuições e auditoria
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  formatRevenueAmount, 
  formatGrowthPercentage, 
  getStatusColor,
  getStatusDisplayName 
} from '@/lib/revenueTracking';
import { getNetworkDisplayName, formatDistributionAmount } from '@/lib/feeDistribution';
import { NetworkType } from '@/lib/feeManager';

// Interfaces para dados da API
interface FeeStats {
  revenue: {
    total: number;
    transactions: number;
    average: number;
    growth: number;
    daily: Array<{ date: string; revenue: number; transactions: number }>;
    monthly: Array<{ month: string; revenue: number; transactions: number }>;
  };
  distribution: {
    totalCollected: number;
    totalPending: number;
    totalNetworks: number;
    activeNetworks: number;
    lastDistribution: string | null;
  };
  networks: Array<{
    network: NetworkType;
    totalCollected: number;
    totalTransactions: number;
    pendingDistribution: number;
    lastDistribution: string | null;
    status: 'active' | 'pending' | 'error';
    recipientAddress: string;
  }>;
  topNetworks: Array<{
    network: NetworkType;
    revenue: number;
    transactions: number;
    percentage: number;
  }>;
}

interface DistributionConfig {
  minimumAmount: number;
  distributionFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  autoDistribution: boolean;
  gasOptimization: boolean;
}

export default function FeeReports() {
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [config, setConfig] = useState<DistributionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [isDistributing, setIsDistributing] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadFeeStats();
    loadDistributionConfig();
  }, [selectedPeriod, selectedNetwork]);

  const loadFeeStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPeriod !== 'all') params.set('period', selectedPeriod);
      if (selectedNetwork !== 'all') params.set('network', selectedNetwork);

      const response = await fetch(`/api/fees/stats/?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load fee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistributionConfig = async () => {
    try {
      const response = await fetch('/api/fees/distribute/');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load distribution config:', error);
    }
  };

  const handleDistributeAll = async () => {
    try {
      setIsDistributing(true);
      const response = await fetch('/api/fees/distribute/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute_all' })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully distributed fees to ${data.count} networks. Total: ${formatRevenueAmount(data.totalAmount)}`);
        loadFeeStats(); // Recarregar dados
      } else {
        alert(`Distribution failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Distribution error:', error);
      alert('Failed to distribute fees');
    } finally {
      setIsDistributing(false);
    }
  };

  const handleDistributeNetwork = async (network: NetworkType) => {
    try {
      const response = await fetch('/api/fees/distribute/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'distribute_network', 
          network,
          force: confirm(`Force distribute ${network} fees?`)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully distributed ${network} fees: ${formatRevenueAmount(data.results[0].amount)}`);
        loadFeeStats();
      } else {
        alert(`Distribution failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Network distribution error:', error);
      alert('Failed to distribute network fees');
    }
  };

  const exportData = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch('/api/fees/stats/export/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          format, 
          period: selectedPeriod !== 'all' ? selectedPeriod : undefined,
          network: selectedNetwork !== 'all' ? selectedNetwork : undefined
        })
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cypher-fees-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert(`Exported ${data.count} records`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading fee reports...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            💰 Cypher Fee Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Revenue tracking, distribution management, and audit reports
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => exportData('csv')} variant="outline">
            Export CSV
          </Button>
          <Button onClick={() => exportData('json')} variant="outline">
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24h</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            <SelectItem value="bitcoin">Bitcoin</SelectItem>
            <SelectItem value="ethereum">Ethereum</SelectItem>
            <SelectItem value="polygon">Polygon</SelectItem>
            <SelectItem value="solana">Solana</SelectItem>
            <SelectItem value="bsc">BNB Chain</SelectItem>
            <SelectItem value="arbitrum">Arbitrum</SelectItem>
            <SelectItem value="optimism">Optimism</SelectItem>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="avalanche">Avalanche</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatRevenueAmount(stats.revenue.total)}
                  </div>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm ${stats.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatGrowthPercentage(stats.revenue.growth)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">vs previous period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.revenue.transactions.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg: {formatRevenueAmount(stats.revenue.average)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatRevenueAmount(stats.distribution.totalPending)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Across {stats.distribution.activeNetworks} networks
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Distributed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatRevenueAmount(stats.distribution.totalCollected)}
                  </div>
                  {stats.distribution.lastDistribution && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last: {new Date(stats.distribution.lastDistribution).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Networks */}
          {stats && stats.topNetworks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Networks by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topNetworks.map((network, index) => (
                    <div key={network.network} className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{getNetworkDisplayName(network.network)}</span>
                          <span className="text-sm text-gray-600">
                            {formatRevenueAmount(network.revenue)} ({network.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={network.percentage} className="mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Distribution Management</h2>
            <Button 
              onClick={handleDistributeAll}
              disabled={isDistributing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDistributing ? 'Distributing...' : 'Distribute All Pending'}
            </Button>
          </div>

          {stats && config && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribution Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Auto Distribution:</span>
                    <Badge variant={config.autoDistribution ? 'default' : 'secondary'}>
                      {config.autoDistribution ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <Badge variant="outline">{config.distributionFrequency}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Amount:</span>
                    <span>{formatRevenueAmount(config.minimumAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Optimization:</span>
                    <Badge variant={config.gasOptimization ? 'default' : 'secondary'}>
                      {config.gasOptimization ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Collected:</span>
                    <span className="font-bold text-green-600">
                      {formatRevenueAmount(stats.distribution.totalCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Distribution:</span>
                    <span className="font-bold text-orange-600">
                      {formatRevenueAmount(stats.distribution.totalPending)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Networks:</span>
                    <span>{stats.distribution.activeNetworks} / {stats.distribution.totalNetworks}</span>
                  </div>
                  {stats.distribution.lastDistribution && (
                    <div className="flex justify-between">
                      <span>Last Distribution:</span>
                      <span>{new Date(stats.distribution.lastDistribution).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Networks Tab */}
        <TabsContent value="networks" className="space-y-6">
          <h2 className="text-2xl font-bold">Network Details</h2>
          
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {stats.networks.map((network) => (
                <Card key={network.network}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        {getNetworkDisplayName(network.network)}
                      </CardTitle>
                      <Badge 
                        variant={network.status === 'active' ? 'default' : 'destructive'}
                        className={`bg-${getStatusColor(network.status === 'active' ? 'collected' : 'failed')}-100`}
                      >
                        {network.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Collected:</span>
                      <span className="font-medium text-green-600">
                        {formatRevenueAmount(network.totalCollected)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Transactions:</span>
                      <span>{network.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending:</span>
                      <span className="font-medium text-orange-600">
                        {formatRevenueAmount(network.pendingDistribution)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Address: {network.recipientAddress}
                    </div>
                    {network.lastDistribution && (
                      <div className="text-xs text-gray-500">
                        Last: {new Date(network.lastDistribution).toLocaleDateString()}
                      </div>
                    )}
                    
                    {network.pendingDistribution > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={() => handleDistributeNetwork(network.network)}
                      >
                        Distribute Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <h2 className="text-2xl font-bold">System Configuration</h2>
          
          {config && (
            <Card>
              <CardHeader>
                <CardTitle>Fee System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Fee Collection</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Fee Percentage:</span>
                        <span className="font-medium">0.20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Transaction:</span>
                        <span className="font-medium">$10.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Supported Networks:</span>
                        <span className="font-medium">9</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Distribution Settings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Auto Distribution:</span>
                        <Badge variant={config.autoDistribution ? 'default' : 'secondary'}>
                          {config.autoDistribution ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Frequency:</span>
                        <span className="font-medium capitalize">{config.distributionFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Amount:</span>
                        <span className="font-medium">{formatRevenueAmount(config.minimumAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gas Optimization:</span>
                        <Badge variant={config.gasOptimization ? 'default' : 'secondary'}>
                          {config.gasOptimization ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">Wallet Addresses</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Bitcoin:</span>
                      <span className="ml-2 font-mono text-xs">358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb</span>
                    </div>
                    <div>
                      <span className="font-medium">EVM Networks:</span>
                      <span className="ml-2 font-mono text-xs">0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3</span>
                    </div>
                    <div>
                      <span className="font-medium">Solana:</span>
                      <span className="ml-2 font-mono text-xs">4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}