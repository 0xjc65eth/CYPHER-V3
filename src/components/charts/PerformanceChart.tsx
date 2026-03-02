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
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  Zap,
  Calendar,
  Maximize2,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useMarketData } from '@/hooks/useMarketData';

// Types
export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  volatility: number;
  beta: number;
  alpha: number;
}

export interface PerformanceData {
  timestamp: number;
  portfolioValue: number;
  benchmarkValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  drawdown: number;
  volume: number;
}

export interface TradePerformance {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  pnl: number;
  pnlPercent: number;
  duration: number;
  commission: number;
}

export interface PerformanceChartProps {
  walletAddress?: string;
  timeframe?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  benchmark?: 'BTC' | 'ETH' | 'SPY' | 'NASDAQ';
  showBenchmark?: boolean;
  showDrawdown?: boolean;
  showVolume?: boolean;
  height?: number;
  allowFullscreen?: boolean;
}

// Custom Tooltip Components
const PerformanceTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
        <p className="text-sm font-medium mb-2">{new Date(label).toLocaleDateString()}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <span className="text-sm" style={{ color: entry.color }}>
              {entry.name}:
            </span>
            <span className="text-sm font-bold">
              {entry.name.includes('Return') || entry.name.includes('Drawdown') 
                ? `${entry.value?.toFixed(2)}%` 
                : `$${entry.value?.toLocaleString()}`
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TradeTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    const trade = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
        <p className="text-sm font-medium mb-2">{trade.symbol}</p>
        <div className="space-y-1 text-xs">
          <div>Price: ${trade.price?.toLocaleString()}</div>
          <div>Quantity: {trade.quantity}</div>
          <div className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
            P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toLocaleString()} ({trade.pnlPercent?.toFixed(2)}%)
          </div>
          <div>Duration: {Math.floor(trade.duration / 3600)}h {Math.floor((trade.duration % 3600) / 60)}m</div>
        </div>
      </div>
    );
  }
  return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  walletAddress,
  timeframe = '30d',
  benchmark = 'BTC',
  showBenchmark = true,
  showDrawdown = true,
  showVolume = false,
  height = 400,
  allowFullscreen = true
}) => {
  // State
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedBenchmark, setSelectedBenchmark] = useState(benchmark);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'trades' | 'metrics'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'composed'>('area');

  // Hooks
  const {
    performance,
    trades,
    metrics,
    loading,
    error,
    refetch
  } = useTradingEngine(walletAddress, selectedTimeframe);

  const { marketData } = useMarketData();

  // Process performance data
  const performanceData = useMemo(() => {
    if (!performance) return [];
    
    return performance.map((p: any) => ({
      timestamp: p.timestamp,
      date: new Date(p.timestamp).toLocaleDateString(),
      portfolioValue: p.portfolioValue,
      benchmarkValue: p.benchmarkValue,
      dailyReturn: p.dailyReturn * 100,
      cumulativeReturn: p.cumulativeReturn * 100,
      drawdown: Math.abs(p.drawdown * 100),
      volume: p.volume
    }));
  }, [performance]);

  // Process trades data
  const tradesData = useMemo(() => {
    if (!trades) return [];
    
    return trades.map((trade: any) => ({
      ...trade,
      date: new Date(trade.timestamp).toLocaleDateString(),
      time: new Date(trade.timestamp).toLocaleTimeString()
    }));
  }, [trades]);

  // Calculate additional metrics
  const calculatedMetrics = useMemo(() => {
    if (!performanceData.length || !metrics) return null;

    const returns = performanceData.map((d: any) => d.dailyReturn);
    const positiveReturns = returns.filter((r: number) => r > 0);
    const negativeReturns = returns.filter((r: number) => r < 0);
    
    return {
      ...metrics,
      bestDay: Math.max(...returns),
      worstDay: Math.min(...returns),
      consecutiveWins: calculateConsecutiveWins(returns),
      consecutiveLosses: calculateConsecutiveLosses(returns),
      avgDailyReturn: returns.reduce((sum: number, r: number) => sum + r, 0) / returns.length,
      volatilityAnnualized: Math.sqrt(252) * Math.sqrt(returns.reduce((sum: number, r: number) => sum + Math.pow(r - (returns.reduce((s: number, ret: number) => s + ret, 0) / returns.length), 2), 0) / returns.length)
    };
  }, [performanceData, metrics]);

  // Timeframe options
  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  // Benchmark options
  const benchmarks = [
    { value: 'BTC', label: 'Bitcoin' },
    { value: 'ETH', label: 'Ethereum' },
    { value: 'SPY', label: 'S&P 500' },
    { value: 'NASDAQ', label: 'NASDAQ' }
  ];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Helper functions
  function calculateConsecutiveWins(returns: number[]): number {
    let maxWins = 0;
    let currentWins = 0;
    for (const ret of returns as number[]) {
      if (ret > 0) {
        currentWins++;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentWins = 0;
      }
    }
    return maxWins;
  }

  function calculateConsecutiveLosses(returns: number[]): number {
    let maxLosses = 0;
    let currentLosses = 0;
    for (const ret of returns as number[]) {
      if (ret < 0) {
        currentLosses++;
        maxLosses = Math.max(maxLosses, currentLosses);
      } else {
        currentLosses = 0;
      }
    }
    return maxLosses;
  }

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
            <div className="text-red-500 mb-2">Performance Data Error</div>
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
                <Activity className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
              
              {calculatedMetrics && (
                <div className="flex items-center gap-2">
                  <Badge variant={calculatedMetrics.totalReturnPercent >= 0 ? "default" : "destructive"}>
                    {calculatedMetrics.totalReturnPercent >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {calculatedMetrics.totalReturnPercent.toFixed(2)}%
                  </Badge>
                  <Badge variant="outline">
                    Sharpe: {calculatedMetrics.sharpeRatio.toFixed(2)}
                  </Badge>
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

              {/* Benchmark Selector */}
              {showBenchmark && (
                <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {benchmarks.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>

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

          {/* Key Performance Metrics */}
          {calculatedMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Return</div>
                <div className={`text-sm font-bold ${
                  calculatedMetrics.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {calculatedMetrics.totalReturnPercent.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Sharpe Ratio</div>
                <div className="text-sm font-bold">{calculatedMetrics.sharpeRatio.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Max Drawdown</div>
                <div className="text-sm font-bold text-red-600">
                  -{calculatedMetrics.maxDrawdown.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Win Rate</div>
                <div className="text-sm font-bold">{calculatedMetrics.winRate.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Profit Factor</div>
                <div className="text-sm font-bold">{calculatedMetrics.profitFactor.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Trades</div>
                <div className="text-sm font-bold">{calculatedMetrics.totalTrades}</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
              <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
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
                    <div className="space-y-6">
                      {/* Performance Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <ComposedChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis yAxisId="left" className="text-xs" />
                          <YAxis yAxisId="right" orientation="right" className="text-xs" />
                          <Tooltip content={<PerformanceTooltip />} />
                          <Legend />
                          
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="cumulativeReturn"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.2}
                            name="Cumulative Return"
                          />
                          
                          {showBenchmark && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="benchmarkValue"
                              stroke="#10B981"
                              strokeWidth={2}
                              name={`${selectedBenchmark} Benchmark`}
                              dot={false}
                            />
                          )}
                          
                          {showDrawdown && (
                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="drawdown"
                              stroke="#EF4444"
                              fill="#EF4444"
                              fillOpacity={0.1}
                              name="Drawdown"
                            />
                          )}
                          
                          {showVolume && (
                            <Bar
                              yAxisId="right"
                              dataKey="volume"
                              fill="#6B7280"
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Performance Summary */}
                      {calculatedMetrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-green-700 dark:text-green-300">Best Day</div>
                                <div className="text-lg font-bold text-green-600">
                                  +{calculatedMetrics.bestDay.toFixed(2)}%
                                </div>
                              </div>
                              <Award className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-red-700 dark:text-red-300">Worst Day</div>
                                <div className="text-lg font-bold text-red-600">
                                  {calculatedMetrics.worstDay.toFixed(2)}%
                                </div>
                              </div>
                              <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">Avg Daily Return</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {calculatedMetrics.avgDailyReturn.toFixed(3)}%
                                </div>
                              </div>
                              <Target className="w-6 h-6 text-blue-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-purple-700 dark:text-purple-300">Volatility (Ann.)</div>
                                <div className="text-lg font-bold text-purple-600">
                                  {calculatedMetrics.volatilityAnnualized.toFixed(2)}%
                                </div>
                              </div>
                              <Zap className="w-6 h-6 text-purple-500" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="detailed" className="mt-0">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Detailed Performance Analysis</h4>
                        <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="area">Area Chart</SelectItem>
                            <SelectItem value="composed">Composed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={height}>
                        {chartType === 'composed' ? (
                          <ComposedChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" className="text-xs" />
                            <YAxis yAxisId="left" className="text-xs" />
                            <YAxis yAxisId="right" orientation="right" className="text-xs" />
                            <Tooltip content={<PerformanceTooltip />} />
                            <Legend />
                            
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="portfolioValue"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.2}
                              name="Portfolio Value"
                            />
                            
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="benchmarkValue"
                              stroke="#10B981"
                              strokeWidth={2}
                              name="Benchmark"
                              dot={false}
                            />
                            
                            <Bar
                              yAxisId="right"
                              dataKey="dailyReturn"
                              fill="#F59E0B"
                              opacity={0.6}
                              name="Daily Return %"
                            />
                            
                            <ReferenceLine yAxisId="right" y={0} stroke="#6B7280" strokeDasharray="2 2" />
                          </ComposedChart>
                        ) : chartType === 'area' ? (
                          <AreaChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip content={<PerformanceTooltip />} />
                            <Legend />
                            
                            <Area
                              type="monotone"
                              dataKey="cumulativeReturn"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.3}
                              name="Cumulative Return %"
                            />
                            
                            <Area
                              type="monotone"
                              dataKey="drawdown"
                              stroke="#EF4444"
                              fill="#EF4444"
                              fillOpacity={0.2}
                              name="Drawdown %"
                            />
                          </AreaChart>
                        ) : (
                          <LineChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip content={<PerformanceTooltip />} />
                            <Legend />
                            
                            <Line
                              type="monotone"
                              dataKey="portfolioValue"
                              stroke="#3B82F6"
                              strokeWidth={2}
                              name="Portfolio Value"
                              dot={false}
                            />
                            
                            <Line
                              type="monotone"
                              dataKey="benchmarkValue"
                              stroke="#10B981"
                              strokeWidth={2}
                              name="Benchmark"
                              dot={false}
                            />
                          </LineChart>
                        )}
                      </ResponsiveContainer>

                      {/* Detailed Statistics */}
                      {calculatedMetrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h5 className="font-medium">Return Statistics</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total Return:</span>
                                <span className="font-medium">{calculatedMetrics.totalReturnPercent.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Average Daily Return:</span>
                                <span className="font-medium">{calculatedMetrics.avgDailyReturn.toFixed(3)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Best Day:</span>
                                <span className="font-medium text-green-600">+{calculatedMetrics.bestDay.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Worst Day:</span>
                                <span className="font-medium text-red-600">{calculatedMetrics.worstDay.toFixed(2)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="font-medium">Risk Statistics</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Volatility (Annualized):</span>
                                <span className="font-medium">{calculatedMetrics.volatilityAnnualized.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max Drawdown:</span>
                                <span className="font-medium text-red-600">-{calculatedMetrics.maxDrawdown.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Sharpe Ratio:</span>
                                <span className="font-medium">{calculatedMetrics.sharpeRatio.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Beta:</span>
                                <span className="font-medium">{calculatedMetrics.beta.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="trades" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Trade Performance Analysis</h4>
                      
                      {/* Trade Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <LineChart data={tradesData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip content={<TradeTooltip />} />
                          <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
                          
                          <Line
                            type="monotone"
                            dataKey="pnl"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            name="Trade P&L"
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Trade Statistics */}
                      {calculatedMetrics && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-3">Trade Summary</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total Trades:</span>
                                <span className="font-medium">{calculatedMetrics.totalTrades}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Winning Trades:</span>
                                <span className="font-medium text-green-600">{calculatedMetrics.winningTrades}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Losing Trades:</span>
                                <span className="font-medium text-red-600">{calculatedMetrics.losingTrades}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Win Rate:</span>
                                <span className="font-medium">{calculatedMetrics.winRate.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-3">P&L Analysis</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Average Win:</span>
                                <span className="font-medium text-green-600">${calculatedMetrics.averageWin.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Average Loss:</span>
                                <span className="font-medium text-red-600">-${Math.abs(calculatedMetrics.averageLoss).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Profit Factor:</span>
                                <span className="font-medium">{calculatedMetrics.profitFactor.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total P&L:</span>
                                <span className={`font-medium ${calculatedMetrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${calculatedMetrics.totalReturn.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <h5 className="font-medium mb-3">Streak Analysis</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Max Consecutive Wins:</span>
                                <span className="font-medium text-green-600">{calculatedMetrics.consecutiveWins}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max Consecutive Losses:</span>
                                <span className="font-medium text-red-600">{calculatedMetrics.consecutiveLosses}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Trades Table */}
                      <div>
                        <h5 className="font-medium mb-3">Recent Trades</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Side</th>
                                <th className="text-right p-2">Quantity</th>
                                <th className="text-right p-2">Price</th>
                                <th className="text-right p-2">P&L</th>
                                <th className="text-right p-2">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tradesData.slice(0, 10).map((trade: any) => (
                                <tr key={trade.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="p-2">{trade.date}</td>
                                  <td className="p-2 font-medium">{trade.symbol}</td>
                                  <td className="p-2">
                                    <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                                      {trade.side.toUpperCase()}
                                    </Badge>
                                  </td>
                                  <td className="text-right p-2">{trade.quantity}</td>
                                  <td className="text-right p-2">${trade.price.toLocaleString()}</td>
                                  <td className={`text-right p-2 ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                                  </td>
                                  <td className="text-right p-2">
                                    {Math.floor(trade.duration / 3600)}h {Math.floor((trade.duration % 3600) / 60)}m
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="metrics" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Risk & Performance Metrics</h4>
                      
                      {calculatedMetrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Risk-Adjusted Returns */}
                          <div className="space-y-4">
                            <h5 className="font-medium">Risk-Adjusted Returns</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Sharpe Ratio</span>
                                <span className="font-bold">{calculatedMetrics.sharpeRatio.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Beta</span>
                                <span className="font-bold">{calculatedMetrics.beta.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Alpha</span>
                                <span className="font-bold">{calculatedMetrics.alpha.toFixed(3)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Risk Metrics */}
                          <div className="space-y-4">
                            <h5 className="font-medium">Risk Metrics</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Maximum Drawdown</span>
                                <span className="font-bold text-red-600">-{calculatedMetrics.maxDrawdown.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Volatility (Annual)</span>
                                <span className="font-bold">{calculatedMetrics.volatilityAnnualized.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                                <span>Profit Factor</span>
                                <span className="font-bold">{calculatedMetrics.profitFactor.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Performance Rating */}
                      {calculatedMetrics && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Overall Performance Rating</h5>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-blue-600">
                              {(() => {
                                const score = Math.min(10, Math.max(0, 
                                  (calculatedMetrics.sharpeRatio * 2) + 
                                  (calculatedMetrics.winRate / 10) + 
                                  (calculatedMetrics.profitFactor / 2) - 
                                  (calculatedMetrics.maxDrawdown / 10)
                                ));
                                return score.toFixed(1);
                              })()}/10
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 mb-1">
                                Based on Sharpe ratio, win rate, profit factor, and drawdown
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(100, Math.max(0, 
                                      ((calculatedMetrics.sharpeRatio * 2) + 
                                       (calculatedMetrics.winRate / 10) + 
                                       (calculatedMetrics.profitFactor / 2) - 
                                       (calculatedMetrics.maxDrawdown / 10)) * 10
                                    ))}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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

export default PerformanceChart;