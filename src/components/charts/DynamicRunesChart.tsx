'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Maximize2,
  RefreshCw,
  Settings,
  Download,
  Star,
  Eye,
  Volume2,
  Activity,
  Clock,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunesTokenPrices } from '@/hooks/useRunesTokenPrices';
import { useRunesTradingActivity } from '@/hooks/useRunesTradingActivity';

interface DynamicRunesChartProps {
  height?: number;
  allowFullscreen?: boolean;
  defaultToken?: string;
  showAdvancedTools?: boolean;
}

// Professional Trading Chart Component
const TradingChart: React.FC<{
  data: any[];
  chartType: 'line' | 'area' | 'candlestick' | 'volume';
  height: number;
  showVolume?: boolean;
}> = ({ data, chartType, height, showVolume = true }) => {
  const formatTooltip = (value: any, name: string) => {
    if (name === 'price' || name === 'high' || name === 'low' || name === 'open' || name === 'close') {
      return [`${value.toFixed(8)} BTC`, name];
    }
    if (name === 'volume') {
      return [`${value.toFixed(4)} BTC`, 'Volume'];
    }
    return [value, name];
  };

  switch (chartType) {
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className="text-xs"
            />
            <YAxis yAxisId="price" orientation="right" className="text-xs" />
            {showVolume && <YAxis yAxisId="volume" orientation="left" className="text-xs" />}
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend />
            
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#3B82F6"
                opacity={0.3}
                name="Volume"
              />
            )}
            
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.2}
              strokeWidth={2}
              name="Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case 'candlestick':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className="text-xs"
            />
            <YAxis yAxisId="price" orientation="right" className="text-xs" />
            {showVolume && <YAxis yAxisId="volume" orientation="left" className="text-xs" />}
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend />
            
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#6B7280"
                opacity={0.3}
                name="Volume"
              />
            )}
            
            {/* Simulate candlestick with bars */}
            <Bar
              yAxisId="price"
              dataKey="high"
              fill="transparent"
              stroke="#10B981"
              strokeWidth={1}
              name="High"
            />
            <Bar
              yAxisId="price"
              dataKey="low"
              fill="transparent"
              stroke="#EF4444"
              strokeWidth={1}
              name="Low"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              name="Close"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case 'volume':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Bar dataKey="volume" fill="#3B82F6" name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      );

    default: // line
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className="text-xs"
            />
            <YAxis yAxisId="price" orientation="right" className="text-xs" />
            {showVolume && <YAxis yAxisId="volume" orientation="left" className="text-xs" />}
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend />
            
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#3B82F6"
                opacity={0.3}
                name="Volume"
              />
            )}
            
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
  }
};

// Token Search Component
const TokenSearch: React.FC<{
  tokens: any[];
  selectedToken: string;
  onTokenSelect: (tokenId: string) => void;
  favorites: string[];
  onToggleFavorite: (tokenId: string) => void;
}> = ({ tokens, selectedToken, onTokenSelect, favorites, onToggleFavorite }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredTokens = useMemo(() => {
    let filtered = tokens;
    
    if (searchQuery) {
      filtered = filtered.filter(token => 
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(token => favorites.includes(token.id));
    }
    
    return filtered.slice(0, 20); // Limit to 20 results
  }, [tokens, searchQuery, showFavoritesOnly, favorites]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search runes by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Star className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2">
        <div
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedToken === 'all' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
          }`}
          onClick={() => onTokenSelect('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">All Runes</div>
              <div className="text-sm text-gray-500">Aggregate view of all tokens</div>
            </div>
            <Badge variant="outline">{tokens.length} tokens</Badge>
          </div>
        </div>
        
        {filteredTokens.map((token) => (
          <div
            key={token.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedToken === token.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
            }`}
            onClick={() => onTokenSelect(token.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{token.symbol}</div>
                  {token.mintingActive && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      Minting
                    </Badge>
                  )}
                  {token.rarity === 'legendary' && (
                    <Badge variant="default" className="text-xs bg-yellow-500">
                      Legendary
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate">{token.name}</div>
                <div className="text-xs text-gray-400">
                  {token.price.toFixed(8)} BTC • 
                  <span className={`ml-1 ${token.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {token.priceChangePercent24h >= 0 ? '+' : ''}{token.priceChangePercent24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(token.id);
                  }}
                  className="p-1"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      favorites.includes(token.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                    }`} 
                  />
                </Button>
                <div className="text-right text-xs">
                  <div>{token.marketCap.toFixed(2)} BTC</div>
                  <div className="text-gray-500">Market Cap</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DynamicRunesChart: React.FC<DynamicRunesChartProps> = ({
  height = 500,
  allowFullscreen = true,
  defaultToken = 'all',
  showAdvancedTools = true
}) => {
  // State
  const [selectedToken, setSelectedToken] = useState(defaultToken);
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | '90d' | '1y' | 'all'>('7d');
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick' | 'volume'>('area');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTokenSearch, setShowTokenSearch] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Hooks
  const {
    tokens,
    metrics,
    priceHistory,
    loading,
    error,
    refetch
  } = useRunesTokenPrices(selectedToken, timeframe);

  const {
    activity,
    loading: activityLoading
  } = useRunesTradingActivity(timeframe, selectedToken);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Get selected token info
  const selectedTokenInfo = useMemo(() => {
    if (selectedToken === 'all') return null;
    return tokens.find(token => token.id === selectedToken);
  }, [selectedToken, tokens]);

  // Timeframe options
  const timeframes = [
    { value: '1d', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  // Chart type options
  const chartTypes = [
    { value: 'line', label: 'Line', icon: Activity },
    { value: 'area', label: 'Area', icon: BarChart3 },
    { value: 'candlestick', label: 'Candlestick', icon: TrendingUp },
    { value: 'volume', label: 'Volume', icon: Volume2 }
  ];

  const toggleFavorite = (tokenId: string) => {
    setFavorites(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

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
            <Zap className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 mb-2">Chart Data Error</div>
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
                {selectedTokenInfo ? selectedTokenInfo.symbol : 'All Runes'} Chart
              </CardTitle>
              
              {selectedTokenInfo && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedTokenInfo.price.toFixed(8)} BTC
                  </Badge>
                  <Badge variant={selectedTokenInfo.priceChangePercent24h >= 0 ? 'default' : 'destructive'}>
                    {selectedTokenInfo.priceChangePercent24h >= 0 ? '+' : ''}
                    {selectedTokenInfo.priceChangePercent24h.toFixed(2)}%
                  </Badge>
                  <Badge variant="outline">
                    Vol: {selectedTokenInfo.volume24h.toFixed(2)} BTC
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Token Selector */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTokenSearch(!showTokenSearch)}
              >
                <Search className="w-4 h-4 mr-2" />
                Select Token
              </Button>

              {/* Timeframe Selector */}
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
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

              {/* Chart Type Selector */}
              <div className="flex border rounded-lg overflow-hidden">
                {chartTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={chartType === type.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartType(type.value as any)}
                      className="rounded-none border-none"
                      title={type.label}
                    >
                      <IconComponent className="w-4 h-4" />
                    </Button>
                  );
                })}
              </div>

              {/* Volume Toggle */}
              <Button
                variant={showVolume ? "default" : "outline"}
                size="sm"
                onClick={() => setShowVolume(!showVolume)}
                title="Toggle Volume"
              >
                <Volume2 className="w-4 h-4" />
              </Button>

              {/* Auto-refresh Toggle */}
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                title="Auto Refresh"
              >
                <Clock className="w-4 h-4" />
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

          {/* Token Search Modal */}
          <AnimatePresence>
            {showTokenSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t pt-4 mt-4"
              >
                <TokenSearch
                  tokens={tokens}
                  selectedToken={selectedToken}
                  onTokenSelect={(tokenId) => {
                    setSelectedToken(tokenId);
                    setShowTokenSearch(false);
                  }}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Stats */}
          {selectedTokenInfo && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Market Cap</div>
                <div className="text-lg font-bold">{selectedTokenInfo.marketCap.toFixed(2)} BTC</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">24h Volume</div>
                <div className="text-lg font-bold">{selectedTokenInfo.volume24h.toFixed(2)} BTC</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Holders</div>
                <div className="text-lg font-bold">{selectedTokenInfo.holders.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Supply</div>
                <div className="text-lg font-bold">{(selectedTokenInfo.circulatingSupply / 1000000).toFixed(1)}M</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Mint Progress</div>
                <div className="text-lg font-bold text-green-600">{selectedTokenInfo.mintProgress.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="p-4">
            <TradingChart
              data={priceHistory}
              chartType={chartType}
              height={isFullscreen ? window.innerHeight - 300 : height}
              showVolume={showVolume}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DynamicRunesChart;