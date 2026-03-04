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
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Treemap
} from 'recharts';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Coins,
  Activity,
  Flame,
  Crown,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Maximize2,
  Download,
  RefreshCw,
  Settings,
  Filter,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunesTokenPrices } from '@/hooks/useRunesTokenPrices';
import { useRunesTradingActivity } from '@/hooks/useRunesTradingActivity';
// RuneSelector was removed - using inline select instead

// Types
export interface RuneToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  holders: number;
  mintProgress: number;
  mintingActive: boolean;
  etching: {
    block: number;
    transaction: string;
    timestamp: number;
    etcher: string;
  };
  divisibility: number;
  spacers: number;
  premine: number;
  cap: number;
  heightStart?: number;
  heightEnd?: number;
  offsetStart?: number;
  offsetEnd?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category?: string;
}

export interface RunesMetrics {
  totalTokens: number;
  totalMarketCap: number;
  totalVolume24h: number;
  totalHolders: number;
  activeMints: number;
  completedMints: number;
  averagePrice: number;
  topGainer: RuneToken;
  topLoser: RuneToken;
  mostVolume: RuneToken;
  marketCapGrowth24h: number;
  holderGrowth24h: number;
}

export interface RunesActivity {
  timestamp: number;
  totalVolume: number;
  transactionCount: number;
  uniqueTraders: number;
  averageTransactionSize: number;
  mintingVolume: number;
  tradingVolume: number;
  fees: number;
}

export interface RunesChartProps {
  token?: string;
  timeframe?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  showVolume?: boolean;
  showMinting?: boolean;
  showHolders?: boolean;
  category?: string;
  minMarketCap?: number;
  height?: number;
  allowFullscreen?: boolean;
}

// Custom Tooltip Components
const RuneTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-xs">
        <p className="font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {data.name} ({data.symbol})
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Price:</span>
            <span className="font-medium">{data.price.toFixed(8)} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>24h Change:</span>
            <span className={`font-medium ${
              data.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.priceChangePercent24h >= 0 ? '+' : ''}{data.priceChangePercent24h.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Volume:</span>
            <span className="font-medium">{data.volume24h.toFixed(2)} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>Market Cap:</span>
            <span className="font-medium">{data.marketCap.toFixed(2)} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>Holders:</span>
            <span className="font-medium">{data.holders.toLocaleString()}</span>
          </div>
          {data.mintingActive && (
            <div className="flex justify-between">
              <span>Mint Progress:</span>
              <span className="font-medium">{data.mintProgress.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const ActivityTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-medium mb-2">{new Date(label).toLocaleDateString()}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Volume') ? `${entry.value?.toFixed(2)} BTC` : entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Color schemes
const RARITY_COLORS = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

const STATUS_COLORS = {
  minting: '#10B981',
  completed: '#3B82F6',
  ended: '#6B7280'
};

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const RunesChart: React.FC<RunesChartProps> = ({
  token,
  timeframe = '7d',
  showVolume = true,
  showMinting = true,
  showHolders = true,
  category,
  minMarketCap = 0,
  height = 400,
  allowFullscreen = true
}) => {
  // State
  const [selectedToken, setSelectedToken] = useState(token || 'all');
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'minting' | 'analytics'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState<'marketcap' | 'volume' | 'price' | 'holders' | 'change'>('marketcap');
  const [showSettings, setShowSettings] = useState(false);
  const [filterMarketCap, setFilterMarketCap] = useState(minMarketCap);
  const [mintingFilter, setMintingFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Hooks with dynamic token and timeframe
  const {
    tokens,
    metrics,
    priceHistory,
    loading,
    error,
    refetch
  } = useRunesTokenPrices(selectedToken, selectedTimeframe);

  const {
    activity,
    mintingActivity,
    loading: activityLoading
  } = useRunesTradingActivity(selectedTimeframe, selectedToken);

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    if (!tokens) return [];
    
    let filtered = tokens.filter(token => 
      token.marketCap >= filterMarketCap &&
      (selectedCategory === 'all' || token.category === selectedCategory) &&
      (mintingFilter === 'all' || 
       (mintingFilter === 'active' && token.mintingActive) ||
       (mintingFilter === 'completed' && !token.mintingActive))
    );

    // Sort tokens
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'marketcap':
          return b.marketCap - a.marketCap;
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'price':
          return b.price - a.price;
        case 'holders':
          return b.holders - a.holders;
        case 'change':
          return b.priceChangePercent24h - a.priceChangePercent24h;
        default:
          return b.marketCap - a.marketCap;
      }
    });

    return filtered.map((token, index) => ({
      ...token,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  }, [tokens, filterMarketCap, selectedCategory, mintingFilter, sortBy]);

  // Minting status breakdown
  const mintingBreakdown = useMemo(() => {
    if (!tokens) return [];
    
    const active = tokens.filter(t => t.mintingActive).length;
    const completed = tokens.filter(t => !t.mintingActive && t.mintProgress === 100).length;
    const inProgress = tokens.filter(t => t.mintingActive && t.mintProgress < 100).length;
    
    return [
      { name: 'Active Minting', value: active, color: STATUS_COLORS.minting },
      { name: 'In Progress', value: inProgress, color: '#F59E0B' },
      { name: 'Completed', value: completed, color: STATUS_COLORS.completed }
    ].filter(item => item.value > 0);
  }, [tokens]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!tokens) return [];
    
    const categories = tokens.reduce((acc, token) => {
      const cat = token.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = { name: cat, count: 0, volume: 0, marketCap: 0 };
      }
      acc[cat].count++;
      acc[cat].volume += token.volume24h;
      acc[cat].marketCap += token.marketCap;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(categories).map((cat: any, index) => ({
      ...cat,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  }, [tokens]);

  // Market cap distribution
  const marketCapDistribution = useMemo(() => {
    if (!tokens) return [];
    
    const large = tokens.filter(t => t.marketCap >= 100).length;
    const medium = tokens.filter(t => t.marketCap >= 10 && t.marketCap < 100).length;
    const small = tokens.filter(t => t.marketCap >= 1 && t.marketCap < 10).length;
    const micro = tokens.filter(t => t.marketCap < 1).length;
    
    return [
      { name: 'Large (≥100 BTC)', value: large, color: '#3B82F6' },
      { name: 'Medium (10-100 BTC)', value: medium, color: '#10B981' },
      { name: 'Small (1-10 BTC)', value: small, color: '#F59E0B' },
      { name: 'Micro (<1 BTC)', value: micro, color: '#EF4444' }
    ].filter(item => item.value > 0);
  }, [tokens]);

  // Timeframe options
  const timeframes = [
    { value: '1d', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  // Categories
  const categories = ['all', 'meme', 'utility', 'gaming', 'defi', 'art', 'other'];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Loading state
  if (loading || activityLoading) {
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
            <Zap className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 mb-2">Runes Data Error</div>
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
                <Zap className="w-5 h-5" />
                Runes Analytics
              </CardTitle>
              
              {metrics && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {metrics.totalTokens} Tokens
                  </Badge>
                  <Badge variant="outline">
                    {metrics.totalVolume24h.toFixed(2)} BTC
                  </Badge>
                  <Badge variant="outline" className={
                    metrics.marketCapGrowth24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }>
                    {metrics.marketCapGrowth24h >= 0 ? '+' : ''}{metrics.marketCapGrowth24h.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Token Selector */}
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  {filteredTokens.slice(0, 20).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Timeframe Selector */}
              <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as typeof selectedTimeframe)}>
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

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  <label className="text-sm font-medium mb-2 block">Min Market Cap (BTC)</label>
                  <Select value={filterMarketCap.toString()} onValueChange={(value) => setFilterMarketCap(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All</SelectItem>
                      <SelectItem value="1">≥1 BTC</SelectItem>
                      <SelectItem value="10">≥10 BTC</SelectItem>
                      <SelectItem value="100">≥100 BTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Minting Status</label>
                  <Select value={mintingFilter} onValueChange={(value) => setMintingFilter(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active Minting</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setFilterMarketCap(0);
                      setMintingFilter('all');
                      setSelectedCategory('all');
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
                <div className="text-xs text-gray-500">Total Tokens</div>
                <div className="text-lg font-bold">{metrics.totalTokens}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Market Cap</div>
                <div className="text-lg font-bold">{metrics.totalMarketCap.toFixed(0)} BTC</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">24h Volume</div>
                <div className="text-lg font-bold">{metrics.totalVolume24h.toFixed(2)} BTC</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Active Mints</div>
                <div className="text-lg font-bold text-green-600">{metrics.activeMints}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Holders</div>
                <div className="text-lg font-bold">{metrics.totalHolders.toLocaleString()}</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="minting">Minting</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                      {/* Volume and Activity */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Trading Volume</h4>
                          <ResponsiveContainer width="100%" height={height}>
                            <AreaChart data={activity}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="timestamp" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip content={<ActivityTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="totalVolume"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.3}
                                name="Total Volume"
                              />
                              <Area
                                type="monotone"
                                dataKey="tradingVolume"
                                stroke="#10B981"
                                fill="#10B981"
                                fillOpacity={0.2}
                                name="Trading Volume"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Market Activity</h4>
                          <ResponsiveContainer width="100%" height={height}>
                            <ComposedChart data={activity}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="timestamp" className="text-xs" />
                              <YAxis yAxisId="left" className="text-xs" />
                              <YAxis yAxisId="right" orientation="right" className="text-xs" />
                              <Tooltip content={<ActivityTooltip />} />
                              <Legend />
                              
                              <Bar
                                yAxisId="left"
                                dataKey="transactionCount"
                                fill="#3B82F6"
                                name="Transactions"
                                opacity={0.6}
                              />
                              
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="uniqueTraders"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Unique Traders"
                                dot={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Market Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Category Distribution</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={categoryBreakdown}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="marketCap"
                                label={({ name, marketCap }) => `${name}: ${marketCap.toFixed(1)} BTC`}
                              >
                                {categoryBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Market Cap Distribution</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={marketCapDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {marketCapDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top Performers */}
                      {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-green-700 dark:text-green-300">Top Gainer</div>
                                <div className="font-bold">{metrics.topGainer?.symbol || 'N/A'}</div>
                                <div className="text-sm text-green-600">
                                  +{metrics.topGainer?.priceChangePercent24h.toFixed(2) || '0'}%
                                </div>
                              </div>
                              <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">Most Volume</div>
                                <div className="font-bold">{metrics.mostVolume?.symbol || 'N/A'}</div>
                                <div className="text-sm text-blue-600">
                                  {metrics.mostVolume?.volume24h.toFixed(2) || '0'} BTC
                                </div>
                              </div>
                              <Activity className="w-6 h-6 text-blue-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-red-700 dark:text-red-300">Top Loser</div>
                                <div className="font-bold">{metrics.topLoser?.symbol || 'N/A'}</div>
                                <div className="text-sm text-red-600">
                                  {metrics.topLoser?.priceChangePercent24h.toFixed(2) || '0'}%
                                </div>
                              </div>
                              <TrendingDown className="w-6 h-6 text-red-500" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tokens" className="mt-0">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Token Rankings</h4>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marketcap">Market Cap</SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="price">Price</SelectItem>
                            <SelectItem value="holders">Holders</SelectItem>
                            <SelectItem value="change">24h Change</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Token Performance Chart */}
                      <ResponsiveContainer width="100%" height={height}>
                        <ScatterChart data={filteredTokens}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="marketCap" 
                            name="Market Cap"
                            className="text-xs"
                            label={{ value: 'Market Cap (BTC)', position: 'insideBottom', offset: -10 }}
                          />
                          <YAxis 
                            dataKey="volume24h" 
                            name="Volume"
                            className="text-xs"
                            label={{ value: 'Volume (BTC)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip content={<RuneTooltip />} />
                          <Scatter dataKey="volume24h" fill="#3B82F6" fillOpacity={0.7} />
                        </ScatterChart>
                      </ResponsiveContainer>

                      {/* Tokens Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Token</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-right p-2">24h Change</th>
                              <th className="text-right p-2">Volume</th>
                              <th className="text-right p-2">Market Cap</th>
                              <th className="text-right p-2">Holders</th>
                              <th className="text-center p-2">Minting</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTokens.slice(0, 20).map((token) => (
                              <tr key={token.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: token.color }}
                                    />
                                    <div>
                                      <div className="font-medium flex items-center gap-1">
                                        {token.symbol}
                                        {token.rarity === 'legendary' && <Crown className="w-3 h-3 text-yellow-500" />}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate max-w-24">{token.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right p-2 font-medium">
                                  {token.price.toFixed(8)} BTC
                                </td>
                                <td className={`text-right p-2 ${
                                  token.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {token.priceChangePercent24h >= 0 ? '+' : ''}{token.priceChangePercent24h.toFixed(2)}%
                                </td>
                                <td className="text-right p-2">
                                  {token.volume24h.toFixed(2)} BTC
                                </td>
                                <td className="text-right p-2">
                                  {token.marketCap.toFixed(2)} BTC
                                </td>
                                <td className="text-right p-2">
                                  {token.holders.toLocaleString()}
                                </td>
                                <td className="text-center p-2">
                                  {token.mintingActive ? (
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      <Flame className="w-3 h-3 mr-1" />
                                      {token.mintProgress.toFixed(0)}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Complete
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="minting" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Minting Activity</h4>
                      
                      {/* Minting Status Overview */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium mb-3">Minting Status</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={mintingBreakdown}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {mintingBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h5 className="font-medium mb-3">Minting Volume Trend</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={mintingActivity}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="timestamp" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip />
                              <Area
                                type="monotone"
                                dataKey="mintingVolume"
                                stroke="#10B981"
                                fill="#10B981"
                                fillOpacity={0.3}
                                name="Minting Volume"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Active Mints */}
                      <div>
                        <h5 className="font-medium mb-3">Active Mints</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredTokens
                            .filter(token => token.mintingActive)
                            .slice(0, 9)
                            .map((token) => (
                              <div 
                                key={token.id} 
                                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    {token.symbol}
                                  </div>
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    Active
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Progress:</span>
                                    <span className="font-medium">{token.mintProgress.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${token.mintProgress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Supply:</span>
                                    <span className="font-medium">
                                      {token.circulatingSupply.toLocaleString()} / {token.totalSupply.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Holders:</span>
                                    <span className="font-medium">{token.holders.toLocaleString()}</span>
                                  </div>
                                  {token.heightEnd && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">End Block:</span>
                                      <span className="font-medium">{token.heightEnd.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-0">
                    <div className="space-y-6">
                      <h4 className="font-semibold">Advanced Analytics</h4>
                      
                      {/* Market Health Metrics */}
                      {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">Market Cap Growth</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {metrics.marketCapGrowth24h >= 0 ? '+' : ''}{metrics.marketCapGrowth24h.toFixed(1)}%
                                </div>
                              </div>
                              <Target className="w-6 h-6 text-blue-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-green-700 dark:text-green-300">Holder Growth</div>
                                <div className="text-lg font-bold text-green-600">
                                  +{metrics.holderGrowth24h.toFixed(1)}%
                                </div>
                              </div>
                              <Activity className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-purple-700 dark:text-purple-300">Avg Price</div>
                                <div className="text-lg font-bold text-purple-600">
                                  {metrics.averagePrice.toFixed(6)} BTC
                                </div>
                              </div>
                              <BarChart3 className="w-6 h-6 text-purple-500" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-orange-700 dark:text-orange-300">Active Mints</div>
                                <div className="text-lg font-bold text-orange-600">
                                  {metrics.activeMints}
                                </div>
                              </div>
                              <Flame className="w-6 h-6 text-orange-500" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Token Treemap */}
                      <div>
                        <h5 className="font-medium mb-3">Market Cap Visualization</h5>
                        <ResponsiveContainer width="100%" height={height}>
                          <Treemap
                            data={filteredTokens.slice(0, 20).map(t => ({
                              name: t.symbol,
                              size: t.marketCap,
                              fill: t.color
                            })) as any}
                            dataKey="size"
                            {...{ ratio: 4/3 } as any}
                            stroke="#fff"
                            fill="#8884d8"
                          />
                        </ResponsiveContainer>
                      </div>

                      {/* Ecosystem Health Score */}
                      {metrics && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Runes Ecosystem Health Score</h5>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-indigo-600">
                              {(() => {
                                const score = Math.min(10, Math.max(0,
                                  (metrics.totalVolume24h / 50) +
                                  (metrics.activeMints / 10) +
                                  (metrics.marketCapGrowth24h / 10) +
                                  (metrics.holderGrowth24h / 10) +
                                  (metrics.totalTokens / 100)
                                ));
                                return score.toFixed(1);
                              })()}/10
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 mb-1">
                                Based on volume, minting activity, growth, and ecosystem size
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(100, Math.max(0,
                                      ((metrics.totalVolume24h / 50) +
                                       (metrics.activeMints / 10) +
                                       (metrics.marketCapGrowth24h / 10) +
                                       (metrics.holderGrowth24h / 10) +
                                       (metrics.totalTokens / 100)) * 10
                                    ))}%`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Key Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Token Statistics</h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span>Total Tokens:</span>
                              <span className="font-medium">{metrics?.totalTokens || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Actively Minting:</span>
                              <span className="font-medium text-green-600">{metrics?.activeMints || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed Mints:</span>
                              <span className="font-medium">{metrics?.completedMints || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Average Price:</span>
                              <span className="font-medium">{metrics?.averagePrice.toFixed(6) || '0'} BTC</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
                          <h5 className="font-medium mb-4">Market Insights</h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-yellow-500" />
                              <span>Top performing category: {categoryBreakdown[0]?.name || 'Meme'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span>Most active minting: {filteredTokens.find(t => t.mintingActive)?.symbol || 'None'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span>Market trend: {metrics && metrics.marketCapGrowth24h > 0 ? 'Growing' : 'Stable'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-blue-500" />
                              <span>Most watched: {metrics?.mostVolume?.symbol || 'N/A'}</span>
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

export default RunesChart;