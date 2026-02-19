'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Activity,
  Download,
  RefreshCw,
  Wallet,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield
} from 'lucide-react';
import { RevenueDataV3, DailyRevenueV3, TopTrader } from '@/types/quickTrade';

interface RevenueStatsCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

export function QuickTradeRevenueDashboard() {
  const [revenueData, setRevenueData] = useState<RevenueDataV3 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, [selectedTimeframe]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/quicktrade/revenue/?wallet=0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3');
      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.data.revenue);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/quicktrade/revenue/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
          action: 'export',
          params: { format, dateRange: selectedTimeframe }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // In production, trigger download
        alert('Export completed successfully!');
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !revenueData) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900 rounded-lg p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  const statsCards: RevenueStatsCard[] = [
    {
      title: 'Total Revenue',
      value: `$${revenueData.totalUSD.toLocaleString()}`,
      change: '+23.5%',
      changeType: 'positive',
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      title: 'Total Transactions',
      value: revenueData.transactionCount.toLocaleString(),
      change: '+18.2%',
      changeType: 'positive',
      icon: <Activity className="w-6 h-6" />
    },
    {
      title: 'Success Rate',
      value: `${(revenueData.successRate * 100).toFixed(1)}%`,
      change: '+0.2%',
      changeType: 'positive',
      icon: <Shield className="w-6 h-6" />
    },
    {
      title: 'Avg Fee',
      value: `$${revenueData.averageFeeUSD.toFixed(2)}`,
      change: '-5.1%',
      changeType: 'negative',
      icon: <BarChart3 className="w-6 h-6" />
    }
  ];

  const getChainName = (chainId: string): string => {
    const chainNames: Record<string, string> = {
      '1': 'Ethereum',
      '42161': 'Arbitrum',
      '10': 'Optimism',
      '137': 'Polygon',
      '8453': 'Base',
      '43114': 'Avalanche',
      '56': 'BNB Chain',
      'solana': 'Solana'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
          <p className="text-gray-400">QuickTrade V3.0 fee collection analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-green-400 border-green-400">
            Admin Access
          </Badge>
          <Button variant="outline" onClick={fetchRevenueData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => exportData('csv')} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <div className="flex items-center space-x-1">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chains">Chain Analysis</TabsTrigger>
          <TabsTrigger value="traders">Top Traders</TabsTrigger>
          <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Daily Revenue (Last 30 Days)</h3>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Chart visualization would go here</p>
                </div>
              </div>
            </Card>

            {/* Revenue by Chain */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue by Chain</h3>
              <div className="space-y-3">
                {Object.entries(revenueData.totalCollected)
                  .sort(([,a], [,b]) => b.usd - a.usd)
                  .slice(0, 5)
                  .map(([chainId, data]) => (
                  <div key={chainId} className="flex justify-between items-center py-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{data.tokenSymbol}</span>
                      </div>
                      <span className="text-white">{getChainName(chainId)}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">${data.usd.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{data.native} {data.tokenSymbol}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Chain Analysis Tab */}
        <TabsContent value="chains" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(revenueData.totalCollected).map(([chainId, data]) => (
              <Card key={chainId} className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{getChainName(chainId)}</h3>
                  <Badge variant="outline">{data.tokenSymbol}</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue (USD)</span>
                    <span className="text-white font-medium">${data.usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue (Native)</span>
                    <span className="text-white font-medium">{data.native} {data.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Share</span>
                    <span className="text-white font-medium">
                      {((data.usd / revenueData.totalUSD) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Wallet className="w-4 h-4 mr-2" />
                    View Wallet
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Top Traders Tab */}
        <TabsContent value="traders" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Top Traders by Volume</h3>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-left p-4 text-gray-300">Rank</th>
                      <th className="text-left p-4 text-gray-300">Address</th>
                      <th className="text-left p-4 text-gray-300">Volume</th>
                      <th className="text-left p-4 text-gray-300">Fees Paid</th>
                      <th className="text-left p-4 text-gray-300">Transactions</th>
                      <th className="text-left p-4 text-gray-300">Favorite DEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.topTraders.slice(0, 10).map((trader, index) => (
                      <tr key={trader.address} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="p-4">
                          <Badge variant={index < 3 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <code className="text-blue-400 font-mono text-sm">
                            {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
                          </code>
                        </td>
                        <td className="p-4 text-white font-medium">
                          ${trader.totalVolumeUSD.toLocaleString()}
                        </td>
                        <td className="p-4 text-green-400 font-medium">
                          ${trader.totalFeesUSD.toFixed(2)}
                        </td>
                        <td className="p-4 text-gray-300">
                          {trader.transactionCount}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{trader.favoriteDEX}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Admin Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Actions */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => exportData('csv')}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV Report
                </Button>
                <Button
                  onClick={() => exportData('json')}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON Data
                </Button>
              </div>
            </Card>

            {/* Withdrawal Actions */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fund Management</h3>
              <div className="space-y-3">
                <Button className="w-full" variant="outline">
                  <Wallet className="w-4 h-4 mr-2" />
                  Initiate Withdrawal
                </Button>
                <Button className="w-full" variant="outline">
                  <PieChart className="w-4 h-4 mr-2" />
                  Distribute Revenue
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Fee collected</div>
                      <div className="text-xs text-gray-400">Transaction on Ethereum</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-medium">+$12.45</div>
                    <div className="text-xs text-gray-400">2 min ago</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}