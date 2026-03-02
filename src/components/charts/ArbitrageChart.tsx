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
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  Info,
  Maximize2,
  Download,
  RefreshCw,
  Eye,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArbitrageOpportunities } from '@/hooks/useArbitrageOpportunities';

// Types
export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  volume24h: number;
  liquidityScore: number;
  riskScore: number;
  estimatedProfit: number;
  executionTime: number;
  fees: {
    buyFee: number;
    sellFee: number;
    transferFee: number;
  };
  netProfit: number;
  netProfitPercent: number;
  lastUpdated: number;
  status: 'active' | 'expired' | 'executed' | 'monitoring';
}

export interface ArbitrageMetrics {
  totalOpportunities: number;
  activeOpportunities: number;
  averageSpread: number;
  totalPotentialProfit: number;
  averageExecutionTime: number;
  successRate: number;
  totalExecuted: number;
  totalProfit: number;
}

export interface ExchangeData {
  name: string;
  opportunities: number;
  avgSpread: number;
  reliability: number;
  volume: number;
  color: string;
}

export interface ArbitrageChartProps {
  symbol?: string;
  minSpread?: number;
  maxRisk?: number;
  showOnlyActive?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  height?: number;
  allowFullscreen?: boolean;
}

// Custom Tooltip Components
const OpportunityTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-xs">
        <p className="font-semibold mb-2">{data.symbol}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Buy Exchange:</span>
            <span className="font-medium">{data.buyExchange}</span>
          </div>
          <div className="flex justify-between">
            <span>Sell Exchange:</span>
            <span className="font-medium">{data.sellExchange}</span>
          </div>
          <div className="flex justify-between">
            <span>Spread:</span>
            <span className="font-medium text-green-600">{data.spreadPercent.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Net Profit:</span>
            <span className="font-medium text-blue-600">${data.netProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Risk Score:</span>
            <span className={`font-medium ${
              data.riskScore < 3 ? 'text-green-600' : 
              data.riskScore < 7 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {data.riskScore}/10
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SpreadTooltip = ({ active, payload, label }: { active?: boolean; payload?: any; label?: any }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(3)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Color schemes
const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444'
};

const EXCHANGE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const ArbitrageChart: React.FC<ArbitrageChartProps> = ({
  symbol,
  minSpread = 0.1,
  maxRisk = 7,
  showOnlyActive = true,
  autoRefresh = true,
  refreshInterval = 30000,
  height = 400,
  allowFullscreen = true
}) => {
  // State
  const [selectedSymbol, setSelectedSymbol] = useState(symbol || 'BTC');
  const [activeTab, setActiveTab] = useState<'opportunities' | 'spreads' | 'exchanges' | 'metrics'>('opportunities');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);
  const [sortBy, setSortBy] = useState<'spread' | 'profit' | 'risk' | 'volume'>('spread');
  const [showSettings, setShowSettings] = useState(false);
  const [filterRisk, setFilterRisk] = useState(maxRisk);
  const [filterSpread, setFilterSpread] = useState(minSpread);

  // Hooks
  const {
    opportunities,
    metrics,
    spreadHistory,
    exchangeData,
    loading,
    error,
    refetch,
    executeArbitrage
  } = useArbitrageOpportunities(selectedSymbol, {
    minSpread: filterSpread,
    maxRisk: filterRisk,
    activeOnly: showOnlyActive
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refetch]);

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];
    
    let filtered = opportunities.filter((opp: any) =>
      opp.spreadPercent >= filterSpread &&
      opp.riskScore <= filterRisk &&
      (!showOnlyActive || opp.status === 'active')
    );

    // Sort opportunities
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'spread':
          return b.spreadPercent - a.spreadPercent;
        case 'profit':
          return b.netProfit - a.netProfit;
        case 'risk':
          return a.riskScore - b.riskScore;
        case 'volume':
          return b.volume24h - a.volume24h;
        default:
          return b.spreadPercent - a.spreadPercent;
      }
    });

    return filtered;
  }, [opportunities, filterSpread, filterRisk, showOnlyActive, sortBy]);

  // Process data for charts
  const scatterData = useMemo(() => {
    return filteredOpportunities.map((opp: any) => ({
      x: opp.spreadPercent,
      y: opp.netProfit,
      z: opp.riskScore,
      ...opp
    }));
  }, [filteredOpportunities]);

  // Exchange breakdown
  const exchangeBreakdown = useMemo(() => {
    if (!exchangeData) return [];

    return exchangeData.map((exchange: any, index: number) => ({
      ...exchange,
      color: EXCHANGE_COLORS[index % EXCHANGE_COLORS.length]
    }));
  }, [exchangeData]);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    if (!filteredOpportunities.length) return [];

    const low = filteredOpportunities.filter((opp: any) => opp.riskScore < 3).length;
    const medium = filteredOpportunities.filter((opp: any) => opp.riskScore >= 3 && opp.riskScore < 7).length;
    const high = filteredOpportunities.filter((opp: any) => opp.riskScore >= 7).length;
    
    return [
      { name: 'Low Risk', value: low, color: RISK_COLORS.low },
      { name: 'Medium Risk', value: medium, color: RISK_COLORS.medium },
      { name: 'High Risk', value: high, color: RISK_COLORS.high }
    ].filter(item => item.value > 0);
  }, [filteredOpportunities]);

  // Symbol options
  const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC', 'AVAX', 'DOT', 'LINK'];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleExecuteArbitrage = (opportunityId: string) => {
    executeArbitrage(opportunityId);
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
            <div className="text-red-500 mb-2">Arbitrage Data Error</div>
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
                <ArrowUpDown className="w-5 h-5" />
                Arbitrage Scanner
              </CardTitle>
              
              {metrics && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {metrics.activeOpportunities} Active
                  </Badge>
                  <Badge variant="outline">
                    Avg: {metrics.averageSpread.toFixed(2)}%
                  </Badge>
                  <Badge variant="outline" className="text-green-600">
                    ${metrics.totalPotentialProfit.toLocaleString()}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Symbol Selector */}
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Selector */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spread">Spread</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                </SelectContent>
              </Select>

              {/* Auto-refresh toggle */}
              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              >
                {isAutoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

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

          {/* Filter Settings */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t pt-4 mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Spread %</label>
                  <Select value={filterSpread.toString()} onValueChange={(value) => setFilterSpread(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">0.1%</SelectItem>
                      <SelectItem value="0.5">0.5%</SelectItem>
                      <SelectItem value="1">1%</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Risk</label>
                  <Select value={filterRisk.toString()} onValueChange={(value) => setFilterRisk(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Low (≤3)</SelectItem>
                      <SelectItem value="7">Medium (≤7)</SelectItem>
                      <SelectItem value="10">High (≤10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setFilterSpread(0.1);
                      setFilterRisk(7);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Stats */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Opportunities</div>
                <div className="text-lg font-bold">{metrics.totalOpportunities}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Active Now</div>
                <div className="text-lg font-bold text-green-600">{metrics.activeOpportunities}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Avg Execution</div>
                <div className="text-lg font-bold">{metrics.averageExecutionTime}s</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Success Rate</div>
                <div className="text-lg font-bold">{metrics.successRate.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Profit</div>
                <div className="text-lg font-bold text-green-600">${metrics.totalProfit.toLocaleString()}</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="spreads">Spread Analysis</TabsTrigger>
              <TabsTrigger value="exchanges">Exchange Data</TabsTrigger>
              <TabsTrigger value="metrics">Performance</TabsTrigger>
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
                  <TabsContent value="opportunities" className="mt-0">
                    <div className="space-y-6">
                      {/* Opportunity Scatter Plot */}
                      <div>
                        <h4 className="font-semibold mb-3">Risk vs Profit Analysis</h4>
                        <ResponsiveContainer width="100%" height={height}>
                          <ScatterChart data={scatterData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="x" 
                              name="Spread %" 
                              className="text-xs"
                              label={{ value: 'Spread %', position: 'insideBottom', offset: -10 }}
                            />
                            <YAxis 
                              dataKey="y" 
                              name="Net Profit" 
                              className="text-xs"
                              label={{ value: 'Net Profit ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<OpportunityTooltip />} />
                            <Scatter 
                              dataKey="y" 
                              fill="#3B82F6"
                              fillOpacity={0.7}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Opportunities Table */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">Active Opportunities</h4>
                          <Badge variant="outline">
                            {filteredOpportunities.length} found
                          </Badge>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Buy Exchange</th>
                                <th className="text-left p-2">Sell Exchange</th>
                                <th className="text-right p-2">Spread %</th>
                                <th className="text-right p-2">Net Profit</th>
                                <th className="text-right p-2">Risk</th>
                                <th className="text-right p-2">Liquidity</th>
                                <th className="text-center p-2">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredOpportunities.slice(0, 10).map((opp: any) => (
                                <tr key={opp.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="p-2 font-medium">{opp.symbol}</td>
                                  <td className="p-2">{opp.buyExchange}</td>
                                  <td className="p-2">{opp.sellExchange}</td>
                                  <td className="text-right p-2">
                                    <Badge variant="default" className="text-green-600">
                                      {opp.spreadPercent.toFixed(2)}%
                                    </Badge>
                                  </td>
                                  <td className="text-right p-2 font-medium">
                                    ${opp.netProfit.toLocaleString()}
                                  </td>
                                  <td className="text-right p-2">
                                    <Badge 
                                      variant={opp.riskScore < 3 ? "default" : opp.riskScore < 7 ? "secondary" : "destructive"}
                                      className="text-xs"
                                    >
                                      {opp.riskScore}/10
                                    </Badge>
                                  </td>
                                  <td className="text-right p-2">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${opp.liquidityScore * 10}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="text-center p-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleExecuteArbitrage(opp.id)}
                                      disabled={opp.status !== 'active'}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="spreads" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Spread History & Analysis</h4>
                      
                      {/* Spread Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <AreaChart data={spreadHistory}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="timestamp" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip content={<SpreadTooltip />} />
                          <Legend />
                          
                          <Area
                            type="monotone"
                            dataKey="averageSpread"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.3}
                            name="Average Spread"
                          />
                          
                          <Area
                            type="monotone"
                            dataKey="maxSpread"
                            stroke="#10B981"
                            fill="#10B981"
                            fillOpacity={0.2}
                            name="Max Spread"
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Spread Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium mb-3">Current Spread Distribution</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={filteredOpportunities.slice(0, 10)}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="symbol" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Bar dataKey="spreadPercent" fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h5 className="font-medium mb-3">Risk Distribution</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={riskDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }: any) => `${name}: ${value}`}
                              >
                                {riskDistribution.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="exchanges" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Exchange Performance</h4>
                      
                      {/* Exchange Comparison */}
                      <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={exchangeBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Legend />
                          
                          <Bar dataKey="opportunities" fill="#3B82F6" name="Opportunities" />
                          <Bar dataKey="avgSpread" fill="#10B981" name="Avg Spread %" />
                          <Bar dataKey="reliability" fill="#F59E0B" name="Reliability Score" />
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Exchange Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exchangeBreakdown.map((exchange: any, index: number) => (
                          <div key={exchange.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium">{exchange.name}</h5>
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: exchange.color }}
                              />
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Opportunities:</span>
                                <span className="font-medium">{exchange.opportunities}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Spread:</span>
                                <span className="font-medium">{exchange.avgSpread.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Reliability:</span>
                                <span className="font-medium">{exchange.reliability}/10</span>
                              </div>
                              <div className="flex justify-between">
                                <span>24h Volume:</span>
                                <span className="font-medium">${exchange.volume.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="metrics" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Performance Metrics</h4>
                      
                      {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Execution Metrics */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                            <h5 className="font-medium mb-4">Execution Performance</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span>Success Rate:</span>
                                <Badge variant="default">{metrics.successRate.toFixed(1)}%</Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Total Executed:</span>
                                <span className="font-medium">{metrics.totalExecuted}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Avg Execution Time:</span>
                                <span className="font-medium">{metrics.averageExecutionTime}s</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Total Profit:</span>
                                <span className="font-medium text-green-600">${metrics.totalProfit.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Opportunity Metrics */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                            <h5 className="font-medium mb-4">Opportunity Analysis</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span>Total Opportunities:</span>
                                <span className="font-medium">{metrics.totalOpportunities}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Currently Active:</span>
                                <Badge variant="default">{metrics.activeOpportunities}</Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Average Spread:</span>
                                <span className="font-medium">{metrics.averageSpread.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Potential Profit:</span>
                                <span className="font-medium text-blue-600">${metrics.totalPotentialProfit.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Performance Score */}
                      {metrics && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Arbitrage Performance Score</h5>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-blue-600">
                              {(() => {
                                const score = Math.min(10, Math.max(0,
                                  (metrics.successRate / 10) +
                                  (metrics.averageSpread * 2) +
                                  (metrics.activeOpportunities / 5) +
                                  (metrics.totalExecuted / 20)
                                ));
                                return score.toFixed(1);
                              })()}/10
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 mb-1">
                                Based on success rate, spread quality, active opportunities, and execution history
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(100, Math.max(0,
                                      ((metrics.successRate / 10) +
                                       (metrics.averageSpread * 2) +
                                       (metrics.activeOpportunities / 5) +
                                       (metrics.totalExecuted / 20)) * 10
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

export default ArbitrageChart;