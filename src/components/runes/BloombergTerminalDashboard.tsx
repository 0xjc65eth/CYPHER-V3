'use client';

import React, { useMemo, lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  Activity,
  DollarSign,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Volume2,
  Layers,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';

// Services and contexts
import { useRunesTerminal, useRunesFilters, useRunesSettings, useRunesFavorites } from '@/contexts/RunesTerminalContext';
import { useRunesRealTimeData } from '@/hooks/useRunesRealTimeData';

// Lazy-loaded components for performance
const RuneSelector = lazy(() => import('@/components/runes/RuneSelector'));
const RunesGlobalFilters = lazy(() => import('@/components/runes/RunesGlobalFilters'));
const TopRunesMovers = lazy(() => import('@/components/runes/widgets/TopRunesMovers'));
const RunesHeatmap = lazy(() => import('@/components/runes/widgets/RunesHeatmap'));
const MarketCapRanking = lazy(() => import('@/components/runes/widgets/MarketCapRanking'));
const MintingActivity = lazy(() => import('@/components/runes/widgets/MintingActivity'));
const RunesProfessionalChart = lazy(() => import('@/components/runes/charts/RunesProfessionalChart'));
const RunesMarketTable = lazy(() => import('@/components/runes/tables/RunesMarketTable'));

// Component-specific types
interface MarketOverviewCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  trendIcon?: React.ComponentType<any>;
}

// Main Dashboard Component  
export default function BloombergTerminalDashboard() {
  // Context hooks
  const { filters, setFilters } = useRunesFilters();
  const { settings, setSettings } = useRunesSettings();
  const { favorites, toggleFavorite } = useRunesFavorites();
  const { state, isConnected } = useRunesTerminal();
  
  // Local state
  const [selectedRune, setSelectedRune] = useState<RuneMarketData | null>(null);
  
  // Real-time data hook
  const { data, refreshData } = useRunesRealTimeData();

  // Processed data with filters applied
  const processedData = useMemo(() => {
    if (!data.marketData.length) return null;

    let filtered = [...data.marketData];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(rune => 
        rune.name.toLowerCase().includes(searchLower) ||
        rune.symbol.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(rune => 
        rune.name.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    // Apply value range filter
    filtered = filtered.filter(rune => 
      rune.marketCap.current >= filters.minValue && 
      rune.marketCap.current <= filters.maxValue
    );

    // Sort data
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (filters.sortBy) {
        case 'marketCap':
          aValue = a.marketCap.current;
          bValue = b.marketCap.current;
          break;
        case 'volume':
          aValue = a.volume.volume24h;
          bValue = b.volume.volume24h;
          break;
        case 'change':
          aValue = a.price.change24h;
          bValue = b.price.change24h;
          break;
        case 'holders':
          aValue = a.holders;
          bValue = b.holders;
          break;
        case 'name':
          return filters.sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        default:
          aValue = a.marketCap.current;
          bValue = b.marketCap.current;
      }
      
      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return {
      marketData: filtered,
      analytics: data.analytics,
      pools: data.pools
    };
  }, [data, filters]);

  // Utility functions
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
    return value.toFixed(decimals);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 0.01 ? 8 : 2
    }).format(value);
  };

  // Action handlers
  const toggleFullscreen = () => {
    setSettings({ isFullscreen: !settings.isFullscreen });
  };

  const toggleAutoRefresh = () => {
    setSettings({ autoRefresh: !settings.autoRefresh });
  };

  // Loading state
  if (data.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Inicializando Terminal Bloomberg</h2>
            <p className="text-gray-400">Conectando aos feeds de mercado em tempo real...</p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (data.error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erro de Conexão</h2>
            <p className="text-gray-400 mb-4">{data.error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => refreshData()}
                className="bg-orange-600 hover:bg-orange-700 px-6 py-3 rounded-lg transition-colors"
              >
                Reconectar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white transition-all duration-300 ${
      settings.isFullscreen ? 'p-0' : 'p-4'
    }`}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 bg-gray-900/50 backdrop-blur-sm border border-orange-500/20 rounded-lg p-4"
      >
        {/* Left: Logo and Status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-orange-400">RUNES</span>
                <span className="text-green-400 ml-1">TERMINAL</span>
              </h1>
              <p className="text-xs text-gray-400">Bloomberg-Style Trading Interface</p>
            </div>
          </div>

          {/* Market Status */}
          <div className="flex items-center space-x-4 border-l border-gray-700 pl-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">CONNECTED</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">OFFLINE</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400">
              Last Update: {data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString() : '--'}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-3">
          {/* Rune Selector */}
          <Suspense fallback={<div className="w-32 h-10 bg-gray-800 rounded animate-pulse" />}>
            <RuneSelector
              tokens={processedData?.marketData.map(rune => ({
                id: rune.id,
                name: rune.name,
                symbol: rune.symbol,
                price: rune.price.current,
                priceChangePercent24h: rune.price.change24h,
                volume24h: rune.volume.volume24h,
                marketCap: rune.marketCap.current,
                holders: rune.holders,
                mintProgress: rune.minting.progress,
                mintingActive: rune.minting.progress < 100,
                totalSupply: rune.supply.total,
                circulatingSupply: rune.supply.circulating
              })) || []}
              selectedToken={settings.selectedRune}
              onTokenSelect={(tokenId) => setSettings({ selectedRune: tokenId })}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              size="md"
              showAdvancedFilters
            />
          </Suspense>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 border-l border-gray-700 pl-3">
            <button
              onClick={toggleAutoRefresh}
              className={`p-2 rounded-lg transition-colors ${
                settings.autoRefresh
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Auto Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${settings.autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={refreshData}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Manual Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Toggle Fullscreen"
            >
              {settings.isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => window.location.href = '/settings'}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Global Filters */}
      <Suspense fallback={<div className="bg-gray-900/50 border border-orange-500/20 rounded-lg p-4 mb-6 animate-pulse h-16" />}>
        <RunesGlobalFilters />
      </Suspense>

      {/* Main Market Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {/* Total Market Cap */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-400">Total Market Cap</span>
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data.analytics ? formatCurrency(data.analytics.marketOverview.totalMarketCap) : '--'}
          </div>
          <div className="text-xs text-green-400 mt-1">+12.5% vs last week</div>
        </div>

        {/* 24H Volume */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-400">24H Volume</span>
            </div>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data.analytics ? formatCurrency(data.analytics.marketOverview.totalVolume24h) : '--'}
          </div>
          <div className="text-xs text-red-400 mt-1">-5.2% vs yesterday</div>
        </div>

        {/* Active Runes */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-400">Active Runes</span>
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data.analytics ? data.analytics.marketOverview.activeRunes : '--'}
          </div>
          <div className="text-xs text-green-400 mt-1">
            +{data.analytics ? data.analytics.marketOverview.newRunes24h : 0} new today
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-400">Market Sentiment</span>
            </div>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white capitalize">
            {data.analytics ? data.analytics.marketOverview.marketSentiment : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Avg Change: {data.analytics ? data.analytics.marketOverview.averageChange24h.toFixed(2) : '--'}%
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout - Bloomberg Style */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-320px)]">
        {/* Left Panel: Charts and Price Data (8 columns) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-8 space-y-4"
        >
          {/* Price Chart Section */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4 h-1/2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-orange-400" />
                Price & Volume Analysis
              </h3>
              <div className="flex items-center space-x-2">
                {['1H', '24H', '7D', '30D'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setFilters(prev => ({ ...prev, timeframe: period.toLowerCase() as any }))}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      filters.timeframe === period.toLowerCase()
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chart Placeholder - would integrate with chart library */}
            <div className="h-full bg-gray-800/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Price Chart Loading...</p>
                <p className="text-xs text-gray-500 mt-1">
                  {settings.selectedRune === 'all' ? 'Aggregate Market View' : `${settings.selectedRune} Analysis`}
                </p>
              </div>
            </div>
          </div>

          {/* Holdings & Transactions Table */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4 h-1/2 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-orange-400" />
                Top Holders & Recent Activity
              </h3>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                  Holders
                </button>
                <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                  Transactions
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full">
              {/* Mock holders/transactions data */}
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                        #{i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {`${Array(6).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}...`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatNumber(Math.random() * 1000000)} tokens
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {(Math.random() * 10).toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-400">of supply</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Panel: Market Widgets (4 columns) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-4 space-y-4 overflow-y-auto"
        >
          {/* Top Movers Widget */}
          <Suspense fallback={<div className="bg-gray-900/80 border border-orange-500/30 rounded-lg p-4 animate-pulse">Loading...</div>}>
            <TopRunesMovers />
          </Suspense>

          {/* Liquidity Pools */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white flex items-center mb-4">
              <PieChart className="w-5 h-5 mr-2 text-orange-400" />
              Liquidity Pools
            </h3>
            
            <div className="space-y-3">
              {data.pools?.slice(0, 3).map((pool, i) => (
                <div key={pool.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-1">
                        <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-gray-800" />
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-gray-800" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {pool.tokenA.symbol}/{pool.tokenB.symbol}
                      </span>
                    </div>
                    <span className="text-xs text-green-400 font-medium">
                      {pool.apr.toFixed(1)}% APR
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">TVL</div>
                      <div className="text-white font-medium">{formatCurrency(pool.tvl)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">24h Vol</div>
                      <div className="text-white font-medium">{formatCurrency(pool.volume24h)}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-3">
                    <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-1 rounded transition-colors">
                      Add Liquidity
                    </button>
                    <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 rounded transition-colors">
                      Swap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Cap Ranking */}
          <Suspense fallback={<div className="bg-gray-900/80 border border-orange-500/30 rounded-lg p-4 animate-pulse">Loading...</div>}>
            <MarketCapRanking />
          </Suspense>

          {/* Quick Actions */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white flex items-center mb-4">
              <Zap className="w-5 h-5 mr-2 text-orange-400" />
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                Buy Runes
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                Sell Runes
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors text-sm font-medium col-span-2"
              >
                Add Liquidity
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}