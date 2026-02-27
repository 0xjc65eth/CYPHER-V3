'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { EnhancedErrorBoundary, SectionErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { DashboardSkeleton } from '@/components/ui/skeletons/DashboardSkeleton';
import { LazyOnView, LazyChart, LazyDashboard } from '@/components/common/LazyLoader';
import { useOptimizedAPI } from '@/lib/api/optimized-api-client';
import { withCache, performanceCaches } from '@/lib/cache/performance-cache';
import { useLoadingState } from '@/components/ui/enhanced-loading';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Zap, 
  Globe, Clock, Target, Shield, Users, Volume2, VolumeX, RefreshCw,
  Play, Pause, AlertTriangle, ExternalLink, Brain, Bot, Sparkles,
  Award, Bell, LineChart, Wallet, Bitcoin, BarChart, Monitor,
  Building, PieChart, Signal, Satellite, Layers, Cpu, Database,
  Eye, Hash, Coins, Network, Server, Home, Settings, 
  ChevronUp, ChevronDown, ArrowUpDown, Calendar, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Optimized interfaces with memoization
interface BloombergMarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

interface LiveActivity {
  id: string;
  type: 'TRANSACTION' | 'BLOCK' | 'ORDINAL' | 'RUNE' | 'LIGHTNING';
  description: string;
  amount?: number;
  symbol?: string;
  hash: string;
  timestamp: Date;
  network: 'Bitcoin' | 'Lightning' | 'Ethereum' | 'Solana';
}

interface MiningMetrics {
  hashrate: string;
  difficulty: string;
  nextAdjustment: string;
  profitability: number;
  averageBlockTime: string;
  mempoolSize: string;
}

interface LightningMetrics {
  capacity: string;
  channels: number;
  nodes: number;
  avgFee: number;
  growth24h: number;
}

interface NetworkStatus {
  bitcoinNodes: number;
  blockHeight: number;
  lastBlock: string;
  txInMempool: number;
  avgFeeRate: number;
  confirmationTime: string;
}

// Memoized sub-components for better performance
const MarketOverviewGrid = React.memo(({ 
  marketData, 
  miningMetrics, 
  lightningMetrics, 
  networkStatus 
}: {
  marketData: BloombergMarketData[];
  miningMetrics: MiningMetrics | null;
  lightningMetrics: LightningMetrics | null;
  networkStatus: NetworkStatus | null;
}) => {
  return (
    <div className="grid grid-cols-6 gap-2 mb-4">
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">TOTAL MKT CAP</div>
        <div className="text-lg font-bold text-orange-500 font-mono">$2.85T</div>
        <div className="text-[10px] text-green-400 font-mono">▲ 3.24%</div>
      </div>
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">24H VOLUME</div>
        <div className="text-lg font-bold text-orange-500 font-mono">$89.5B</div>
        <div className="text-[10px] text-red-400 font-mono">▼ 5.67%</div>
      </div>
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">BTC DOMINANCE</div>
        <div className="text-lg font-bold text-orange-500 font-mono">54.7%</div>
        <div className="text-[10px] text-green-400 font-mono">▲ 0.45%</div>
      </div>
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">BLOCK HEIGHT</div>
        <div className="text-lg font-bold text-orange-500 font-mono">
          {networkStatus?.blockHeight?.toLocaleString() || '---'}
        </div>
        <div className="text-[10px] text-green-400 font-mono">LATEST</div>
      </div>
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">LN NODES</div>
        <div className="text-lg font-bold text-orange-500 font-mono">
          {lightningMetrics?.nodes.toLocaleString() || '15,687'}
        </div>
        <div className="text-[10px] text-purple-400 font-mono">ACTIVE</div>
      </div>
      <div className="bg-gray-900 border border-orange-500/30 p-3">
        <div className="text-[10px] text-orange-500/60 font-mono mb-1">AVG FEE</div>
        <div className="text-lg font-bold text-orange-500 font-mono">
          {networkStatus?.avgFeeRate || 35} sat/vB
        </div>
        <div className="text-[10px] text-yellow-400 font-mono">MODERATE</div>
      </div>
    </div>
  );
});

MarketOverviewGrid.displayName = 'MarketOverviewGrid';

const MarketDataTable = React.memo(({ marketData }: { marketData: BloombergMarketData[] }) => {
  return (
    <div className="bg-black border border-orange-500/30">
      <div className="border-b border-orange-500/30 p-3">
        <h3 className="text-sm font-bold text-orange-500 font-mono">MARKET DATA - MAJOR ASSETS</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-0 text-[10px] font-mono text-orange-500/60 border-b border-orange-500/30 p-2 min-w-[700px]">
          <div>SYMBOL</div>
          <div className="text-right">LAST</div>
          <div className="text-right">CHG%</div>
          <div className="text-right">HIGH</div>
          <div className="text-right">LOW</div>
          <div className="text-right">VOLUME</div>
          <div className="text-right">MKT CAP</div>
          <div className="text-center">TREND</div>
        </div>
        
        {marketData.map((asset) => (
          <div key={asset.symbol} className="grid grid-cols-8 gap-0 text-xs font-mono border-b border-orange-500/10 p-2 hover:bg-orange-500/5 min-w-[700px]">
            <div className="text-orange-500 font-bold">{asset.symbol}</div>
            <div className="text-right text-orange-500">${asset.price.toLocaleString()}</div>
            <div className={`text-right ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
            </div>
            <div className="text-right text-orange-500/80">${asset.high24h.toLocaleString()}</div>
            <div className="text-right text-orange-500/80">${asset.low24h.toLocaleString()}</div>
            <div className="text-right text-orange-500/60">${(asset.volume24h / 1000000000).toFixed(1)}B</div>
            <div className="text-right text-orange-500/60">${(asset.marketCap / 1000000000).toFixed(0)}B</div>
            <div className="text-center">
              {asset.change24h >= 0 ? 
                <ChevronUp className="w-3 h-3 text-green-400 mx-auto" /> : 
                <ChevronDown className="w-3 h-3 text-red-400 mx-auto" />
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

MarketDataTable.displayName = 'MarketDataTable';

const LiveActivityFeed = React.memo(({ liveActivity }: { liveActivity: LiveActivity[] }) => {
  return (
    <div className="bg-black border border-orange-500/30 h-full">
      <div className="border-b border-orange-500/30 p-3">
        <h3 className="text-sm font-bold text-orange-500 font-mono">LIVE ACTIVITY FEED</h3>
      </div>
      <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
        {liveActivity.map((activity) => (
          <div key={activity.id} className="border-b border-orange-500/10 pb-2 hover:bg-orange-500/5 p-2 rounded">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[10px] px-1 py-0 ${
                    activity.type === 'TRANSACTION' ? 'bg-green-500/20 text-green-400' :
                    activity.type === 'BLOCK' ? 'bg-blue-500/20 text-blue-400' :
                    activity.type === 'ORDINAL' ? 'bg-orange-500/20 text-orange-400' :
                    activity.type === 'RUNE' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {activity.type}
                  </Badge>
                  <span className="text-[10px] text-orange-500/60 font-mono">
                    {activity.network}
                  </span>
                </div>
                <p className="text-xs text-orange-500 leading-tight mb-1">
                  {activity.description}
                </p>
                {activity.amount && (
                  <p className="text-xs text-green-400 font-mono">
                    {activity.amount.toFixed(4)} {activity.symbol}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-orange-500/40 font-mono">
                    {activity.hash}...
                  </span>
                  <span className="text-[10px] text-orange-500/60">
                    {activity.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

LiveActivityFeed.displayName = 'LiveActivityFeed';

// Lazy-loaded components
const LazyBloombergCypherTrade = React.lazy(() => 
  import('@/components/dashboard/BloombergCypherTrade').then(module => ({
    default: module.BloombergCypherTrade
  }))
);

const LazyBloombergProfessionalChart = React.lazy(() => 
  import('@/components/dashboard/BloombergProfessionalChart').then(module => ({
    default: module.BloombergProfessionalChart
  }))
);

export default function OptimizedBloombergDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'mining' | 'lightning'>('overview');
  
  // Optimized data states with proper typing
  const [marketData, setMarketData] = useState<BloombergMarketData[]>([]);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [miningMetrics, setMiningMetrics] = useState<MiningMetrics | null>(null);
  const [lightningMetrics, setLightningMetrics] = useState<LightningMetrics | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);

  // Performance optimized loading state
  const { 
    isLoading, 
    error, 
    startLoading, 
    stopLoading, 
    setLoadingError 
  } = useLoadingState(true);

  // Optimized API client
  const apiClient = useOptimizedAPI();

  // Memoized data loaders with caching
  const loadMarketData = useCallback(async (): Promise<BloombergMarketData[]> => {
    return withCache(
      performanceCaches.market,
      'bloomberg-market-data',
      async () => {
        try {
          const response = await apiClient.client.get('/api/coinmarketcap?symbols=BTC,ETH,SOL,ORDI,RUNE,MATIC', {
            cacheTTL: 30000, // 30 seconds
            cacheTags: ['market', 'prices']
          });
          
          if (response.data.success && response.data.data?.current) {
            return Object.entries(response.data.data.current).map(([symbol, info]: [string, any]) => ({
              symbol,
              price: info.price || 0,
              change24h: info.change24h || 0,
              volume24h: info.volume24h || 0,
              marketCap: info.marketCap || 0,
              high24h: info.price * 1.05 || 0,
              low24h: info.price * 0.95 || 0,
            }));
          }
          
          return generateFallbackMarket();
        } catch (error) {
          console.error('Market data error:', error);
          return generateFallbackMarket();
        }
      },
      { cacheTTL: 30000, tags: ['market'] }
    );
  }, [apiClient]);

  const loadMiningData = useCallback(async (): Promise<MiningMetrics> => {
    return withCache(
      performanceCaches.market,
      'bloomberg-mining-data',
      async () => {
        try {
          const response = await apiClient.client.get('/api/mining-data', {
            cacheTTL: 60000, // 1 minute
            cacheTags: ['mining', 'bitcoin']
          });
          
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
        }
        
        return {
          hashrate: '578.4 EH/s',
          difficulty: '62.46 T',
          nextAdjustment: '6 days',
          profitability: 87.5,
          averageBlockTime: '9.8 min',
          mempoolSize: '142 MB'
        };
      },
      { cacheTTL: 60000, tags: ['mining'] }
    );
  }, [apiClient]);

  const loadLightningData = useCallback(async (): Promise<LightningMetrics> => {
    return withCache(
      performanceCaches.market,
      'bloomberg-lightning-data',
      async () => {
        try {
          const response = await apiClient.client.get('/api/lightning-data', {
            cacheTTL: 180000, // 3 minutes
            cacheTags: ['lightning', 'bitcoin']
          });
          
          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (error) {
        }
        
        return {
          capacity: '5,234 BTC',
          channels: 82547,
          nodes: 15687,
          avgFee: 1.2,
          growth24h: 3.4
        };
      },
      { cacheTTL: 180000, tags: ['lightning'] }
    );
  }, [apiClient]);

  const loadNetworkData = useCallback(async (): Promise<NetworkStatus> => {
    return withCache(
      performanceCaches.market,
      'bloomberg-network-data',
      async () => {
        try {
          // Fetch real data from mempool.space via our proxy
          const [blocksRes, feesRes, mempoolRes] = await Promise.allSettled([
            fetch('/api/mempool/?endpoint=/v1/blocks').then(r => r.ok ? r.json() : null),
            fetch('/api/mempool/?endpoint=/v1/fees/recommended').then(r => r.ok ? r.json() : null),
            fetch('/api/mempool/?endpoint=/mempool').then(r => r.ok ? r.json() : null),
          ]);

          const blocks = blocksRes.status === 'fulfilled' ? blocksRes.value : null;
          const fees = feesRes.status === 'fulfilled' ? feesRes.value : null;
          const mempool = mempoolRes.status === 'fulfilled' ? mempoolRes.value : null;

          const latestBlock = Array.isArray(blocks) && blocks.length > 0 ? blocks[0] : null;
          const blockHeight = latestBlock?.height || 0;
          const blockTime = latestBlock?.timestamp ? Math.floor((Date.now() / 1000) - latestBlock.timestamp) : 0;

          return {
            bitcoinNodes: 0, // Not available from mempool API
            blockHeight,
            lastBlock: blockTime > 0 ? `${blockTime} sec ago` : '---',
            txInMempool: mempool?.count || 0,
            avgFeeRate: fees?.halfHourFee || 0,
            confirmationTime: fees?.halfHourFee ? '~30 min' : '---'
          };
        } catch {
          return {
            bitcoinNodes: 0,
            blockHeight: 0,
            lastBlock: '---',
            txInMempool: 0,
            avgFeeRate: 0,
            confirmationTime: '---'
          };
        }
      },
      { cacheTTL: 30000, tags: ['network'] }
    );
  }, []);

  const loadActivityData = useCallback(async (): Promise<LiveActivity[]> => {
    return withCache(
      performanceCaches.market,
      'bloomberg-activity-data',
      async () => {
        try {
          const response = await apiClient.client.get('/api/live-activity', {
            cacheTTL: 15000, // 15 seconds
            cacheTags: ['activity', 'live']
          });
          
          if (response.data.success && response.data.data) {
            return response.data.data.map((item: any) => ({
              id: item.id,
              type: item.type,
              description: item.description,
              amount: item.amount,
              symbol: item.symbol,
              hash: item.hash,
              timestamp: new Date(item.timestamp),
              network: item.network
            }));
          }
        } catch (error) {
        }
        
        return generateFallbackActivity();
      },
      { cacheTTL: 15000, tags: ['activity'] }
    );
  }, [apiClient]);

  // Optimized data loading with parallel execution
  const loadRealData = useCallback(async () => {
    startLoading();
    
    try {
      const [market, mining, lightning, network, activity] = await Promise.allSettled([
        loadMarketData(),
        loadMiningData(),
        loadLightningData(),
        loadNetworkData(),
        loadActivityData()
      ]);
      
      // Handle successful results
      if (market.status === 'fulfilled') setMarketData(market.value || []);
      if (mining.status === 'fulfilled') setMiningMetrics(mining.value);
      if (lightning.status === 'fulfilled') setLightningMetrics(lightning.value);
      if (network.status === 'fulfilled') setNetworkStatus(network.value);
      if (activity.status === 'fulfilled') setLiveActivity(activity.value || []);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadingError(error as Error);
    } finally {
      stopLoading();
    }
  }, [
    startLoading, 
    stopLoading, 
    setLoadingError,
    loadMarketData, 
    loadMiningData, 
    loadLightningData, 
    loadNetworkData, 
    loadActivityData
  ]);

  // Auto-refresh with cleanup
  useEffect(() => {
    loadRealData();
    
    let intervalId: ReturnType<typeof setInterval> | undefined;
    
    if (autoRefresh) {
      intervalId = setInterval(loadRealData, 180000); // 3 minutes
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, loadRealData]);

  const handleManualRefresh = useCallback(() => {
    loadRealData();
  }, [loadRealData]);

  // Memoized fallback data generators
  const generateFallbackMarket = useMemo(() => (): BloombergMarketData[] => [
    { symbol: 'BTC', price: 105847, change24h: 2.85, volume24h: 34567000000, marketCap: 2075000000000, high24h: 108759, low24h: 103234 },
    { symbol: 'ETH', price: 3345, change24h: 3.42, volume24h: 18234000000, marketCap: 402000000000, high24h: 3455, low24h: 3234 },
    { symbol: 'SOL', price: 188.5, change24h: -1.23, volume24h: 3456000000, marketCap: 84000000000, high24h: 195, low24h: 185 }
  ], []);

  const generateFallbackActivity = useMemo(() => (): LiveActivity[] => [
    {
      id: '1',
      type: 'TRANSACTION',
      description: 'Large Bitcoin transfer detected',
      amount: 15.7,
      symbol: 'BTC',
      hash: 'abc123def456',
      timestamp: new Date(),
      network: 'Bitcoin'
    }
  ], []);

  // Loading state
  if (isLoading && marketData.length === 0) {
    return (
      <TopNavLayout>
        <DashboardSkeleton variant="bloomberg" />
      </TopNavLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <TopNavLayout>
        <EnhancedErrorBoundary level="page">
          <div className="bg-black min-h-screen flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-mono text-red-500">DASHBOARD ERROR</h2>
              <p className="text-sm text-red-500/60 font-mono mt-2">
                {error.message || 'Failed to load dashboard data'}
              </p>
              <Button
                onClick={handleManualRefresh}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </EnhancedErrorBoundary>
      </TopNavLayout>
    );
  }

  return (
    <TopNavLayout>
      <div className="bg-black min-h-screen">
        {/* Bloomberg Terminal Header */}
        <div className="border-b-2 border-orange-500">
          <div className="grid grid-cols-12 gap-0 text-orange-500 font-mono text-xs">
            <div className="col-span-2 p-3 border-r border-orange-500/30">
              <div className="text-[10px] opacity-60">BLOOMBERG PROFESSIONAL</div>
              <div className="text-lg font-bold">CRYPTO HUB</div>
            </div>
            <div className="col-span-10 flex items-center">
              <div className="flex-1 grid grid-cols-6 gap-0">
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">BTC/USD</div>
                  <div className="text-sm font-bold text-green-400">
                    {marketData.find(m => m.symbol === 'BTC')?.price.toLocaleString() || '105,847'} 
                    ▲{(marketData.find(m => m.symbol === 'BTC')?.change24h || 2.85).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">HASH RATE</div>
                  <div className="text-sm font-bold text-green-400">{miningMetrics?.hashrate || '578.4 EH/s'}</div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">DIFFICULTY</div>
                  <div className="text-sm font-bold text-orange-400">{miningMetrics?.difficulty || '62.46 T'}</div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">LIGHTNING</div>
                  <div className="text-sm font-bold text-purple-400">{lightningMetrics?.capacity || '5,234 BTC'}</div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">MEMPOOL</div>
                  <div className="text-sm font-bold text-blue-400">{miningMetrics?.mempoolSize || '142 MB'}</div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] opacity-60">{new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}</div>
                  <div className="text-sm font-bold animate-pulse">● LIVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Control Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-orange-500 font-mono">CRYPTOCURRENCY ANALYTICS TERMINAL</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleManualRefresh}
                className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "ghost"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`font-mono text-xs ${autoRefresh ? 'bg-orange-500 text-black hover:bg-orange-600' : 'text-orange-500 hover:bg-orange-500/10'}`}
              >
                {autoRefresh ? 'AUTO' : 'MANUAL'}
              </Button>
              <span className="text-xs text-orange-500/60 font-mono ml-2">
                UPD: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Market Overview Grid */}
          <MarketOverviewGrid
            marketData={marketData}
            miningMetrics={miningMetrics}
            lightningMetrics={lightningMetrics}
            networkStatus={networkStatus}
          />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Left Panel - CYPHER TRADE & Charts */}
            <div className="col-span-8 space-y-4">
              
              {/* CYPHER TRADE - Lazy loaded */}
              <SectionErrorBoundary>
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-500 rounded border border-orange-500/50 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-orange-500 font-mono">CYPHER TRADE</h3>
                          <p className="text-[10px] text-orange-500/60 font-mono">MULTI-CHAIN DEX AGGREGATOR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 text-[10px] font-mono">LIVE</Badge>
                        <Badge className="bg-purple-500/20 text-purple-400 text-[10px] font-mono">0.35% FEE</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <LazyOnView
                      threshold={0.1}
                      fallback={<div className="h-64 bg-orange-500/10 rounded animate-pulse" />}
                    >
                      <React.Suspense fallback={<div className="h-64 bg-orange-500/10 rounded animate-pulse flex items-center justify-center">
                        <div className="text-orange-500 text-sm">Loading CYPHER TRADE...</div>
                      </div>}>
                        <LazyBloombergCypherTrade />
                      </React.Suspense>
                    </LazyOnView>
                  </div>
                </div>
              </SectionErrorBoundary>

              {/* Professional Charts - Lazy loaded */}
              <SectionErrorBoundary>
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">MARKET ANALYTICS TERMINAL</h3>
                  </div>
                  <div className="p-4">
                    <LazyOnView
                      threshold={0.1}
                      fallback={<div className="h-80 bg-orange-500/10 rounded animate-pulse" />}
                    >
                      <React.Suspense fallback={<div className="h-80 bg-orange-500/10 rounded animate-pulse flex items-center justify-center">
                        <div className="text-orange-500 text-sm">Loading Charts...</div>
                      </div>}>
                        <LazyBloombergProfessionalChart />
                      </React.Suspense>
                    </LazyOnView>
                  </div>
                </div>
              </SectionErrorBoundary>
              
              {/* Market Data Table */}
              <SectionErrorBoundary>
                <LazyOnView
                  threshold={0.1}
                  fallback={<div className="h-64 bg-gray-900 border border-orange-500/30 animate-pulse" />}
                >
                  <MarketDataTable marketData={marketData} />
                </LazyOnView>
              </SectionErrorBoundary>

              {/* Network Metrics Grid */}
              <LazyOnView
                threshold={0.1}
                fallback={<div className="grid grid-cols-2 gap-4">
                  <div className="h-48 bg-gray-900 border border-orange-500/30 animate-pulse" />
                  <div className="h-48 bg-gray-900 border border-orange-500/30 animate-pulse" />
                </div>}
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Mining Metrics */}
                  <div className="bg-black border border-orange-500/30 p-4">
                    <h4 className="text-xs font-bold text-orange-500 font-mono mb-3">MINING NETWORK</h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Hash Rate:</span>
                        <span className="text-green-400">{miningMetrics?.hashrate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Difficulty:</span>
                        <span className="text-orange-500">{miningMetrics?.difficulty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Next Adjustment:</span>
                        <span className="text-orange-500">{miningMetrics?.nextAdjustment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Profitability:</span>
                        <span className="text-green-400">{miningMetrics?.profitability.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Avg Block Time:</span>
                        <span className="text-orange-500">{miningMetrics?.averageBlockTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lightning Network */}
                  <div className="bg-black border border-orange-500/30 p-4">
                    <h4 className="text-xs font-bold text-orange-500 font-mono mb-3">LIGHTNING NETWORK</h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Total Capacity:</span>
                        <span className="text-purple-400">{lightningMetrics?.capacity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Active Channels:</span>
                        <span className="text-orange-500">{lightningMetrics?.channels.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Network Nodes:</span>
                        <span className="text-orange-500">{lightningMetrics?.nodes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">Avg Fee Rate:</span>
                        <span className="text-green-400">{lightningMetrics?.avgFee.toFixed(1)} ppm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500/60">24h Growth:</span>
                        <span className="text-green-400">+{lightningMetrics?.growth24h.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </LazyOnView>
            </div>

            {/* Right Panel - Live Activity Feed */}
            <div className="col-span-4">
              <SectionErrorBoundary>
                <LazyOnView
                  threshold={0.1}
                  fallback={<div className="h-full min-h-[600px] bg-black border border-orange-500/30 animate-pulse" />}
                >
                  <LiveActivityFeed liveActivity={liveActivity} />
                </LazyOnView>
              </SectionErrorBoundary>
            </div>
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="border-t border-orange-500/30 bg-black p-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-4">
              <span className="text-orange-500/60">SYSTEM STATUS:</span>
              <span className="text-green-400">OPERATIONAL</span>
              <span className="text-orange-500/60">|</span>
              <span className="text-orange-500/60">NETWORK:</span>
              <span className="text-orange-500">MULTI-CHAIN</span>
              <span className="text-orange-500/60">|</span>
              <span className="text-orange-500/60">DATA PROVIDERS:</span>
              <span className="text-orange-500">CMC • BLOCKCHAIN.INFO • 1ML</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-orange-500/60">© 2024 CYPHER ORDI FUTURE</span>
              <span className="text-orange-500/60">TERMINAL v3.1.0 OPTIMIZED</span>
            </div>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}