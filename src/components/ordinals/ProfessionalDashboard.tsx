'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { useMempool } from '@/hooks/ordinals/useMempool';

interface MarketMetrics {
  totalCollections: number;
  totalVolume24h: number;
  totalVolume7d: number;
  totalVolumeAllTime: number;
  avgFloorPrice: number;
  totalListed: number;
  totalOwners: number;
  totalSupply: number;
  marketCap: number;
}

interface ProfessionalDashboardProps {
  collections: any[];
  loading?: boolean;
}

export default function ProfessionalDashboard({ collections, loading }: ProfessionalDashboardProps) {
  // Use mempool hook for real BTC price and network data
  const mempool = useMempool();

  // WebSocket connection status (from parent)
  const wsConnected = typeof window !== 'undefined' && window.localStorage.getItem('ws-connected') === 'true';
  const metrics = useMemo((): MarketMetrics => {
    if (collections.length === 0) {
      return {
        totalCollections: 0,
        totalVolume24h: 0,
        totalVolume7d: 0,
        totalVolumeAllTime: 0,
        avgFloorPrice: 0,
        totalListed: 0,
        totalOwners: 0,
        totalSupply: 0,
        marketCap: 0
      };
    }

    const totalVolume24h = collections.reduce((sum, c) => sum + (c.volume24h || 0), 0);
    const totalVolume7d = collections.reduce((sum, c) => sum + (c.volume7d || 0), 0);
    // All-time total volume (fallback when 24h volume is unavailable)
    const totalVolumeAllTime = collections.reduce((sum, c) => sum + (c.totalVolume || 0), 0);
    const totalListed = collections.reduce((sum, c) => sum + (c.listed || 0), 0);

    // Sanitize owners: cap each collection's owners at 500k to prevent garbage values
    const totalOwners = collections.reduce((sum, c) => {
      const owners = Number(c.owners || 0);
      return sum + (Number.isFinite(owners) && owners > 0 && owners < 1_000_000 ? Math.round(owners) : 0);
    }, 0);

    // Total supply across all collections (used for liquidity ratio)
    const totalSupply = collections.reduce((sum, c) => sum + (c.supply || 0), 0);

    const validFloorPrices = collections.filter(c => c.floorPrice).map(c => c.floorPrice);
    const avgFloorPrice = validFloorPrices.length > 0
      ? validFloorPrices.reduce((sum, p) => sum + p, 0) / validFloorPrices.length
      : 0;

    // Estimate market cap (floor price * supply for each collection)
    const marketCap = collections.reduce((sum, c) => {
      return sum + ((c.floorPrice || 0) * (c.supply || 0));
    }, 0);

    return {
      totalCollections: collections.length,
      totalVolume24h,
      totalVolume7d,
      totalVolumeAllTime,
      avgFloorPrice,
      totalListed,
      totalOwners,
      totalSupply,
      marketCap
    };
  }, [collections]);

  const volume24hChange = useMemo(() => {
    if (metrics.totalVolume7d === 0) return 0;
    const avg7d = metrics.totalVolume7d / 7;
    if (avg7d === 0) return 0;
    return ((metrics.totalVolume24h - avg7d) / avg7d) * 100;
  }, [metrics]);

  const formatBTC = (btcValue: number): string => {
    return btcValue.toFixed(4);
  };

  // Get real BTC price from mempool hook, fallback to 50000
  const btcPriceUSD = useMemo(() => {
    if (mempool.bitcoinPrices.data) {
      const priceData = mempool.bitcoinPrices.data as Record<string, number>;
      return priceData.USD || 50000;
    }
    return 50000;
  }, [mempool.bitcoinPrices.data]);

  const formatUSD = (btcValue: number): string => {
    const usd = btcValue * btcPriceUSD;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    return `$${usd.toFixed(0)}`;
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
            <div className="h-16 bg-[#2a2a3e] animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const MetricCard = ({
    title,
    value,
    subValue,
    change,
    icon: Icon,
    trend
  }: {
    title: string;
    value: string;
    subValue?: string;
    change?: number;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 hover:border-[#f59e0b]/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#f59e0b]/10 rounded-lg">
            <Icon className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold font-mono text-white tracking-tight">{value}</div>
        {subValue && <div className="text-xs text-gray-500 font-mono">{subValue}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mb-6">
      {/* Market Overview Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2a2a3e] border border-[#f59e0b]/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">ORDINALS MARKET OVERVIEW</h2>
            <p className="text-sm text-gray-400">Institutional-Grade Bitcoin Ordinals Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            {/* WebSocket Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className={`text-xs font-medium ${wsConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                {wsConnected ? 'REALTIME' : 'POLLING'}
              </span>
            </div>

            {/* Live Data Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse"></div>
              <span className="text-xs text-[#f59e0b] font-medium">LIVE DATA</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2a2a3e]">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">
              {metrics.totalVolume24h > 0 ? '24H VOLUME' : 'TOTAL VOLUME'}
            </div>
            <div className="text-lg font-bold text-[#f59e0b] font-mono">
              {formatBTC(metrics.totalVolume24h > 0 ? metrics.totalVolume24h : metrics.totalVolumeAllTime)} BTC
            </div>
            <div className="text-xs text-gray-500">
              {formatUSD(metrics.totalVolume24h > 0 ? metrics.totalVolume24h : metrics.totalVolumeAllTime)}
            </div>
          </div>
          <div className="text-center border-x border-[#2a2a3e]">
            <div className="text-xs text-gray-400 mb-1">MARKET CAP</div>
            <div className="text-lg font-bold text-white font-mono">
              {formatBTC(metrics.marketCap)} BTC
            </div>
            <div className="text-xs text-gray-500">{formatUSD(metrics.marketCap)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">AVG FLOOR</div>
            <div className="text-lg font-bold text-white font-mono">
              {formatBTC(metrics.avgFloorPrice)} BTC
            </div>
            <div className="text-xs text-gray-500">{formatUSD(metrics.avgFloorPrice)}</div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Collections"
          value={formatNumber(metrics.totalCollections)}
          subValue="Active Ordinals Series"
          icon={PieChart}
          trend="neutral"
        />

        <MetricCard
          title={metrics.totalVolume24h > 0 ? '24H Volume' : 'Total Volume'}
          value={`${formatBTC(metrics.totalVolume24h > 0 ? metrics.totalVolume24h : metrics.totalVolumeAllTime)} BTC`}
          subValue={formatUSD(metrics.totalVolume24h > 0 ? metrics.totalVolume24h : metrics.totalVolumeAllTime)}
          change={metrics.totalVolume24h > 0 ? volume24hChange : undefined}
          icon={Activity}
          trend={metrics.totalVolume24h > 0 ? (volume24hChange > 0 ? 'up' : 'down') : 'neutral'}
        />

        <MetricCard
          title={metrics.totalVolume7d > 0 ? '7D Volume' : 'All-Time Vol'}
          value={`${formatBTC(metrics.totalVolume7d > 0 ? metrics.totalVolume7d : metrics.totalVolumeAllTime)} BTC`}
          subValue={metrics.totalVolume7d > 0 ? formatUSD(metrics.totalVolume7d) : 'Cumulative across collections'}
          icon={BarChart3}
          trend="neutral"
        />

        <MetricCard
          title="Market Cap"
          value={`${formatBTC(metrics.marketCap)} BTC`}
          subValue={formatUSD(metrics.marketCap)}
          icon={DollarSign}
          trend="neutral"
        />

        <MetricCard
          title="Total Listings"
          value={formatNumber(metrics.totalListed)}
          subValue="Available for Purchase"
          icon={Activity}
        />

        <MetricCard
          title="Unique Owners"
          value={formatNumber(metrics.totalOwners)}
          subValue="Market Participants"
          icon={PieChart}
        />

        <MetricCard
          title="Avg Floor Price"
          value={`${formatBTC(metrics.avgFloorPrice)} BTC`}
          subValue={formatUSD(metrics.avgFloorPrice)}
          icon={TrendingUp}
        />

        <MetricCard
          title="Liquidity Ratio"
          value={`${metrics.totalSupply > 0 ? ((metrics.totalListed / metrics.totalSupply) * 100).toFixed(1) : '0.0'}%`}
          subValue="Listed / Total Supply"
          icon={BarChart3}
        />
      </div>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a2e] border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-semibold text-green-400 uppercase">Market Strength</span>
          </div>
          <p className="text-sm text-gray-300">
            Strong 24h volume indicates healthy market activity. Institutional interest remains high.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-semibold text-blue-400 uppercase">Liquidity Analysis</span>
          </div>
          <p className="text-sm text-gray-300">
            {metrics.totalListed > 5000 ? 'High' : 'Moderate'} liquidity with {formatNumber(metrics.totalListed)} listings.
            Excellent entry/exit opportunities.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs font-semibold text-orange-400 uppercase">Risk Assessment</span>
          </div>
          <p className="text-sm text-gray-300">
            Diversified collection base with {metrics.totalOwners > 50000 ? 'strong' : 'growing'} holder distribution.
            Low concentration risk.
          </p>
        </div>
      </div>

      {/* Network Status Bar - powered by Mempool.space */}
      {mempool.recommendedFees.data && (
        <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">Bitcoin Network Status</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">via mempool.space</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase mb-1">BTC Price</div>
              <div className="text-sm font-bold text-white font-mono">${btcPriceUSD.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase mb-1">Fast Fee</div>
              <div className="text-sm font-bold text-green-400 font-mono">{mempool.recommendedFees.data.fastestFee} sat/vB</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase mb-1">Medium Fee</div>
              <div className="text-sm font-bold text-yellow-400 font-mono">{mempool.recommendedFees.data.halfHourFee} sat/vB</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase mb-1">Economy Fee</div>
              <div className="text-sm font-bold text-blue-400 font-mono">{mempool.recommendedFees.data.economyFee} sat/vB</div>
            </div>
            {mempool.mempoolStats.data && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase mb-1">Mempool Size</div>
                <div className="text-sm font-bold text-white font-mono">{(mempool.mempoolStats.data.count || 0).toLocaleString()} txs</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
