'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  AlertTriangle,
  Info,
  Maximize2,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletPortfolio } from '@/hooks/useWalletPortfolio';
import { useMarketData } from '@/hooks/useMarketData';

// Types
export interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  price: number;
  change24h: number;
  changePercent24h: number;
  allocation: number;
  color?: string;
}

export interface PortfolioPerformance {
  timestamp: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  bestPerformer: PortfolioAsset;
  worstPerformer: PortfolioAsset;
  diversificationScore: number;
  riskScore: number;
}

export interface PortfolioChartProps {
  walletAddress?: string;
  timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  showAllocation?: boolean;
  showPerformance?: boolean;
  showMetrics?: boolean;
  height?: number;
  allowFullscreen?: boolean;
}

// Custom Tooltip Components
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AllocationTooltip = ({ active, payload }: { active?: boolean; payload?: any }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-gray-600">Value: ${data.value?.toLocaleString()}</p>
        <p className="text-sm text-gray-600">Allocation: {data.allocation?.toFixed(2)}%</p>
        <p className="text-sm" style={{ color: data.changePercent24h >= 0 ? '#10B981' : '#EF4444' }}>
          24h: {data.changePercent24h >= 0 ? '+' : ''}{data.changePercent24h?.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

// Color palette for portfolio assets
const ASSET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  walletAddress,
  timeframe = '7d',
  showAllocation = true,
  showPerformance = true,
  showMetrics = true,
  height = 400,
  allowFullscreen = true
}) => {
  // State
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'performance' | 'metrics'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  
  // Hooks
  const {
    portfolio,
    performance,
    metrics,
    loading,
    error,
    refetch
  } = useWalletPortfolio(walletAddress, selectedTimeframe);

  const { marketData } = useMarketData();

  // Process portfolio data with colors
  const processedAssets = useMemo(() => {
    if (!portfolio) return [];
    
    return portfolio.map((asset: any, index: number) => ({
      ...asset,
      color: ASSET_COLORS[index % ASSET_COLORS.length]
    }));
  }, [portfolio]);

  // Performance chart data
  const performanceData = useMemo(() => {
    if (!performance) return [];
    
    return performance.map((p: any) => ({
      timestamp: new Date(p.timestamp).toLocaleDateString(),
      value: p.totalValue,
      pnl: p.pnl,
      pnlPercent: p.pnlPercent
    }));
  }, [performance]);

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    return processedAssets.map((asset: any) => ({
      name: asset.symbol,
      value: asset.value,
      allocation: asset.allocation,
      changePercent24h: asset.changePercent24h,
      color: asset.color
    }));
  }, [processedAssets]);

  // Risk distribution data
  const riskData = useMemo(() => {
    if (!processedAssets.length) return [];
    
    const lowRisk = processedAssets.filter((a: any) => Math.abs(a.changePercent24h) < 5);
    const mediumRisk = processedAssets.filter((a: any) => Math.abs(a.changePercent24h) >= 5 && Math.abs(a.changePercent24h) < 15);
    const highRisk = processedAssets.filter((a: any) => Math.abs(a.changePercent24h) >= 15);
    
    return [
      { name: 'Low Risk', value: lowRisk.reduce((sum: number, a: any) => sum + a.value, 0), color: '#10B981' },
      { name: 'Medium Risk', value: mediumRisk.reduce((sum: number, a: any) => sum + a.value, 0), color: '#F59E0B' },
      { name: 'High Risk', value: highRisk.reduce((sum: number, a: any) => sum + a.value, 0), color: '#EF4444' }
    ].filter((item: any) => item.value > 0);
  }, [processedAssets]);

  // Timeframe options
  const timeframes = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-48 rounded" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-md" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full border-red-200 dark:border-red-800">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 mb-2">Portfolio Loading Error</div>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4' : ''}`}
    >
      <Card className="w-full h-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Portfolio Analytics
              </CardTitle>
              
              {metrics && (
                <div className="flex items-center gap-2">
                  <Badge variant={metrics.totalPnLPercent >= 0 ? "default" : "destructive"}>
                    {metrics.totalPnLPercent >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {metrics.totalPnLPercent.toFixed(2)}%
                  </Badge>
                  <span className="text-lg font-bold">
                    ${metrics.totalValue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Timeframe Selector */}
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4" />
              </Button>

              {allowFullscreen && (
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}

              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Total Value</div>
                <div className="text-lg font-bold">${metrics.totalValue.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Total P&L</div>
                <div className={`text-lg font-bold ${
                  metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${metrics.totalPnL.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Best Performer</div>
                <div className="text-sm font-medium">
                  {metrics.bestPerformer?.symbol} (+{metrics.bestPerformer?.changePercent24h.toFixed(2)}%)
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Risk Score</div>
                <div className={`text-lg font-bold ${
                  metrics.riskScore < 3 ? 'text-green-600' : 
                  metrics.riskScore < 7 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metrics.riskScore.toFixed(1)}/10
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="metrics">Risk Analysis</TabsTrigger>
            </TabsList>

            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="overview" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Portfolio Value Chart */}
                      <div>
                        <h4 className="font-semibold mb-3">Portfolio Value Trend</h4>
                        <ResponsiveContainer width="100%" height={height}>
                          <AreaChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="timestamp" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Asset Allocation */}
                      <div>
                        <h4 className="font-semibold mb-3">Asset Allocation</h4>
                        <ResponsiveContainer width="100%" height={height}>
                          <PieChart>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              outerRadius={Math.min(height / 3, 120)}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ allocation }: any) => `${allocation.toFixed(1)}%`}
                            >
                              {allocationData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<AllocationTooltip />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="allocation" className="mt-0">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Portfolio Allocation Breakdown</h4>
                        <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pie">Pie Chart</SelectItem>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={height}>
                        {chartType === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              outerRadius={height / 3}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, allocation }) => `${name}: ${allocation.toFixed(1)}%`}
                            >
                              {allocationData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<AllocationTooltip />} />
                          </PieChart>
                        ) : (
                          <BarChart data={allocationData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip content={<AllocationTooltip />} />
                            <Bar dataKey="allocation" fill="#3B82F6" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>

                      {/* Assets Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Asset</th>
                              <th className="text-right p-2">Amount</th>
                              <th className="text-right p-2">Value</th>
                              <th className="text-right p-2">Allocation</th>
                              <th className="text-right p-2">24h Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedAssets.map((asset, index) => (
                              <tr key={asset.symbol} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: asset.color }}
                                    />
                                    <span className="font-medium">{asset.symbol}</span>
                                  </div>
                                </td>
                                <td className="text-right p-2">{asset.amount.toFixed(6)}</td>
                                <td className="text-right p-2">${asset.value.toLocaleString()}</td>
                                <td className="text-right p-2">{asset.allocation.toFixed(2)}%</td>
                                <td className={`text-right p-2 ${
                                  asset.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Performance Analysis</h4>
                      
                      {/* P&L Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="timestamp" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="pnl"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <h5 className="font-medium mb-2">Total Return</h5>
                          <div className={`text-2xl font-bold ${
                            metrics?.totalPnLPercent && metrics.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metrics?.totalPnLPercent.toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <h5 className="font-medium mb-2">Best Day</h5>
                          <div className="text-2xl font-bold text-green-600">
                            +{Math.max(...(performance?.map(p => p.pnlPercent) || [0])).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <h5 className="font-medium mb-2">Worst Day</h5>
                          <div className="text-2xl font-bold text-red-600">
                            {Math.min(...(performance?.map(p => p.pnlPercent) || [0])).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="metrics" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Risk Analysis</h4>
                      
                      {/* Risk Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium mb-3">Risk Distribution</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={riskData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }: any) => `${name}: $${value.toLocaleString()}`}
                              >
                                {riskData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Diversification Metrics */}
                        <div className="space-y-4">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-2">Diversification Score</h5>
                            <div className="text-2xl font-bold">
                              {metrics?.diversificationScore.toFixed(1)}/10
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {metrics && metrics.diversificationScore >= 7 ? 'Well diversified' :
                               metrics && metrics.diversificationScore >= 4 ? 'Moderately diversified' :
                               'Needs more diversification'}
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-2">Portfolio Risk</h5>
                            <div className={`text-2xl font-bold ${
                              metrics && metrics.riskScore < 3 ? 'text-green-600' :
                              metrics && metrics.riskScore < 7 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {metrics?.riskScore.toFixed(1)}/10
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {metrics && metrics.riskScore < 3 ? 'Conservative' :
                               metrics && metrics.riskScore < 7 ? 'Moderate' : 'Aggressive'}
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-2">Number of Assets</h5>
                            <div className="text-2xl font-bold">
                              {processedAssets.length}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Asset classes in portfolio
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PortfolioChart;