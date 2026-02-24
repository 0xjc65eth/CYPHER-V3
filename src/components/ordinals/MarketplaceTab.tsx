'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/primitives/Card';
import { ShoppingCart, TrendingUp, Activity, Clock, Filter, RefreshCw, Image } from 'lucide-react';
import { useMarketplace } from '@/hooks/ordinals/useMarketplace';

interface MarketActivity {
  kind: string;
  collectionSymbol?: string;
  tokenId?: string;
  listedPrice?: number;
  price?: number;
  createdAt?: string;
  timestamp?: string | number;
  collectionImage?: string;
  seller?: string;
  buyer?: string;
  txId?: string;
  inscriptionNumber?: number;
}

interface MarketStats {
  totalListings: number;
  totalSales: number;
  avgSalePrice: number;
  totalVolume24h: number;
}

interface FilterState {
  activityType: 'all' | 'listing' | 'sale';
  collection: string;
  minPrice: string;
  maxPrice: string;
  timeRange: '1h' | '24h' | '7d' | '30d';
}

export default function MarketplaceTab() {
  // Professional marketplace hook for UniSat + Magic Eden data
  const marketplace = useMarketplace();

  const [activities, setActivities] = useState<MarketActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<MarketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('0s ago');
  const [stats, setStats] = useState<MarketStats>({
    totalListings: 0,
    totalSales: 0,
    avgSalePrice: 0,
    totalVolume24h: 0
  });
  const [filters, setFilters] = useState<FilterState>({
    activityType: 'all',
    collection: 'all',
    minPrice: '',
    maxPrice: '',
    timeRange: '30d'
  });
  const [collections, setCollections] = useState<string[]>([]);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Merge marketplace hook stats with local stats for richer data
  const enrichedStats = useMemo(() => {
    if (marketplace.stats) {
      return {
        totalListings: marketplace.stats.totalListings || stats.totalListings,
        totalSales: marketplace.stats.totalSales || stats.totalSales,
        avgSalePrice: marketplace.stats.avgSalePrice || stats.avgSalePrice,
        totalVolume24h: marketplace.stats.totalVolume || stats.totalVolume24h,
      };
    }
    return stats;
  }, [marketplace.stats, stats]);

  useEffect(() => {
    fetchMarketActivity();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        fetchMarketActivity();
      }, 30000); // 30 seconds
    } else {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    applyFilters();
  }, [activities, filters]);

  // Update "time since last update" every second
  useEffect(() => {
    const updateTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSinceUpdate(`${hours}h ago`);
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, [lastUpdated]);

  const fetchMarketActivity = async (isManual = false) => {
    try {
      // Only show full loading on initial load
      if (activities.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      // Also trigger marketplace hook refresh
      marketplace.refetchAll();

      const response = await fetch('/api/ordinals/activity/?limit=50');

      if (!response.ok) throw new Error('Failed to fetch market activity');

      const data = await response.json();

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      // Normalize activity data - ensure listedPrice and createdAt fields exist
      const rawActivities: MarketActivity[] = Array.isArray(data.data) ? data.data : [];
      const activityData = rawActivities.map((item: MarketActivity) => ({
        ...item,
        // Ensure listedPrice is set (API may return as price)
        listedPrice: item.listedPrice ?? item.price ?? undefined,
        // Ensure createdAt is a string
        createdAt: item.createdAt
          ? String(item.createdAt)
          : item.timestamp
            ? (typeof item.timestamp === 'number'
              ? new Date(item.timestamp < 1e12 ? item.timestamp * 1000 : item.timestamp).toISOString()
              : String(item.timestamp))
            : undefined,
      }));
      setActivities(activityData);
      setLastUpdated(new Date());

      // Extract unique collections
      const uniqueCollections = Array.from(
        new Set(activityData.map((a: MarketActivity) => a.collectionSymbol).filter(Boolean))
      ) as string[];
      setCollections(uniqueCollections);

      // Calculate stats
      calculateStats(activityData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market activity');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchMarketActivity(true);
  };

  const calculateStats = (activityData: MarketActivity[]) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Filter to recent activities, but if all are outside 24h, use all data
    const recentActivities = activityData.filter(a => {
      if (!a.createdAt) return true; // Include items without dates
      try {
        return new Date(a.createdAt).getTime() > twentyFourHoursAgo;
      } catch {
        return true;
      }
    });

    const dataToUse = recentActivities.length > 0 ? recentActivities : activityData;

    const listings = dataToUse.filter(a =>
      a.kind === 'listing' || a.kind === 'list' || a.kind === 'inscription'
    );
    const sales = dataToUse.filter(a => a.kind === 'sale' || a.kind === 'buying_broadcasted');

    const totalVolume = sales.reduce((sum, a) => sum + (a.listedPrice || 0), 0);
    const avgPrice = sales.length > 0 ? totalVolume / sales.length : 0;

    // When all data comes from Hiro fallback (kind=listing from inscriptions), use total count
    const listingCount = listings.length > 0 ? listings.length : activityData.length;

    setStats({
      totalListings: listingCount,
      totalSales: sales.length,
      avgSalePrice: avgPrice,
      totalVolume24h: totalVolume
    });
  };

  const applyFilters = () => {
    let filtered = [...activities];

    // Activity type filter
    if (filters.activityType !== 'all') {
      if (filters.activityType === 'listing') {
        filtered = filtered.filter(a => a.kind === 'listing' || a.kind === 'list' || a.kind === 'inscription');
      } else if (filters.activityType === 'sale') {
        filtered = filtered.filter(a => a.kind === 'sale' || a.kind === 'buying_broadcasted');
      } else {
        filtered = filtered.filter(a => a.kind === filters.activityType);
      }
    }

    // Collection filter
    if (filters.collection !== 'all') {
      filtered = filtered.filter(a => a.collectionSymbol === filters.collection);
    }

    // Price range filter
    if (filters.minPrice) {
      const minPriceSats = parseFloat(filters.minPrice) * 1e8;
      filtered = filtered.filter(a => (a.listedPrice || 0) >= minPriceSats);
    }
    if (filters.maxPrice) {
      const maxPriceSats = parseFloat(filters.maxPrice) * 1e8;
      filtered = filtered.filter(a => (a.listedPrice || 0) <= maxPriceSats);
    }

    // Time range filter - include items without dates to avoid empty results
    if (filters.timeRange) {
      const now = Date.now();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const cutoff = now - timeRanges[filters.timeRange];
      filtered = filtered.filter(a => {
        if (!a.createdAt) return true; // Include items without dates
        try {
          return new Date(a.createdAt).getTime() > cutoff;
        } catch {
          return true;
        }
      });
    }

    setFilteredActivities(filtered);
  };

  const formatPrice = (sats: number) => {
    return `${(sats / 1e8).toFixed(6)} BTC`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <Card variant="bordered" padding="lg" className="bg-gradient-to-r from-[#0a0a0f] to-[#1a1a2e] border-[#2a2a3e]">
          <div className="h-16 bg-[#2a2a3e] rounded animate-pulse"></div>
        </Card>

        {/* Activity Feed Skeleton */}
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Card key={i} variant="bordered" padding="none" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#2a2a3e] rounded-lg animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[#2a2a3e] rounded animate-pulse w-1/3"></div>
                    <div className="h-3 bg-[#2a2a3e] rounded animate-pulse w-1/4"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-5 bg-[#2a2a3e] rounded animate-pulse w-24"></div>
                  <div className="h-3 bg-[#2a2a3e] rounded animate-pulse w-16"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && activities.length === 0) {
    return (
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/50">
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Market Activity</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchMarketActivity(); }}
            className="px-4 py-2 bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#f59e0b]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Controls */}
      <Card variant="bordered" padding="lg" className="bg-gradient-to-r from-[#0a0a0f] to-[#1a1a2e] border-[#f59e0b]/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Marketplace Activity</h2>
            <p className="text-sm text-gray-400 mt-1">Real-time listings and sales across all marketplaces</p>
          </div>

          {/* Refresh Controls */}
          <div className="flex items-center gap-4">
            {/* Last Updated Indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Updated {timeSinceUpdate}</span>
            </div>

            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              <span>{autoRefresh ? 'AUTO-REFRESH ON' : 'AUTO-REFRESH OFF'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] rounded-lg transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="lg" className="bg-[#0d0d1a] border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider">Total Listings</h4>
            <ShoppingCart className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#e4e4e7] font-mono">{enrichedStats.totalListings.toLocaleString()}</div>
          <div className="text-[9px] text-[#e4e4e7]/40 font-mono mt-1">Last 24h {marketplace.stats ? '(multi-source)' : ''}</div>
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#0d0d1a] border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider">Total Sales</h4>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-[#e4e4e7] font-mono">{enrichedStats.totalSales.toLocaleString()}</div>
          <div className="text-[9px] text-[#e4e4e7]/40 font-mono mt-1">Last 24h</div>
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#0d0d1a] border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider">Avg Sale Price</h4>
            <Activity className="w-4 h-4 text-[#F7931A]" />
          </div>
          <div className="text-2xl font-bold text-[#e4e4e7] font-mono">{formatPrice(enrichedStats.avgSalePrice)}</div>
          <div className="text-[9px] text-[#e4e4e7]/40 font-mono mt-1">Average</div>
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#0d0d1a] border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider">Total Volume 24h</h4>
            <TrendingUp className="w-4 h-4 text-[#00ff88]" />
          </div>
          <div className="text-2xl font-bold text-[#00ff88] font-mono">{formatPrice(enrichedStats.totalVolume24h)}</div>
          <div className="text-[9px] text-[#e4e4e7]/40 font-mono mt-1">24h Volume</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card variant="bordered" padding="lg" className="bg-[#0d0d1a] border-[#1a1a2e]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[#F7931A]" />
          <h3 className="text-sm font-mono text-[#F7931A] uppercase tracking-wider">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Activity Type Filter */}
          <div>
            <label className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase block mb-2">Activity Type</label>
            <select
              value={filters.activityType}
              onChange={(e) => setFilters({ ...filters, activityType: e.target.value as FilterState['activityType'] })}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
            >
              <option value="all">All Activities</option>
              <option value="listing">Listings</option>
              <option value="sale">Sales</option>
            </select>
          </div>

          {/* Collection Filter */}
          <div>
            <label className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase block mb-2">Collection</label>
            <select
              value={filters.collection}
              onChange={(e) => setFilters({ ...filters, collection: e.target.value })}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
            >
              <option value="all">All Collections</option>
              {collections.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Min Price Filter */}
          <div>
            <label className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase block mb-2">Min Price (BTC)</label>
            <input
              type="number"
              step="0.00000001"
              placeholder="0.00000000"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
            />
          </div>

          {/* Max Price Filter */}
          <div>
            <label className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase block mb-2">Max Price (BTC)</label>
            <input
              type="number"
              step="0.00000001"
              placeholder="999.99999999"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
            />
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase block mb-2">Time Range</label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as FilterState['timeRange'] })}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-[#F7931A] focus:outline-none"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[#e4e4e7]/60 font-mono">
            Showing {filteredActivities.length} of {activities.length} activities
          </div>
          <button
            onClick={() => setFilters({
              activityType: 'all',
              collection: 'all',
              minPrice: '',
              maxPrice: '',
              timeRange: '30d'
            })}
            className="px-4 py-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
          >
            Clear Filters
          </button>
        </div>
      </Card>

      {/* Activity Feed */}
      <div className={`space-y-2 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
        {filteredActivities.length === 0 ? (
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold text-white mb-2">No Activities Found</h3>
              <p className="text-sm text-gray-400">Try adjusting your filters or check back later</p>
            </div>
          </Card>
        ) : (
          filteredActivities.map((activity, index) => (
            <Card key={index} variant="bordered" padding="none" className="bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#f59e0b]/50 transition-all">
              <div className="p-4 flex items-center justify-between">
                {/* Left: Activity Type & Details */}
                <div className="flex items-center gap-4">
                  {/* Collection Thumbnail */}
                  {activity.collectionImage ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#2a2a3e] flex-shrink-0">
                      <img
                        src={activity.collectionImage}
                        alt={activity.collectionSymbol || 'Collection'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full bg-[#2a2a3e] flex items-center justify-center"><svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#2a2a3e] border border-[#2a2a3e] flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-gray-500" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${
                    (activity.kind === 'listing' || activity.kind === 'list' || activity.kind === 'inscription') ? 'bg-blue-500/10' :
                    (activity.kind === 'sale' || activity.kind === 'buying_broadcasted') ? 'bg-green-500/10' :
                    'bg-purple-500/10'
                  }`}>
                    {(activity.kind === 'listing' || activity.kind === 'list' || activity.kind === 'inscription') ? (
                      <ShoppingCart className="w-5 h-5 text-blue-400" />
                    ) : (activity.kind === 'sale' || activity.kind === 'buying_broadcasted') ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <Activity className="w-5 h-5 text-purple-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                        (activity.kind === 'listing' || activity.kind === 'list' || activity.kind === 'inscription') ? 'bg-blue-500/20 text-blue-400' :
                        (activity.kind === 'sale' || activity.kind === 'buying_broadcasted') ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {activity.kind === 'inscription' ? 'listing' : activity.kind}
                      </span>
                      {activity.collectionSymbol && (
                        <span className="text-sm font-bold text-white">{activity.collectionSymbol}</span>
                      )}
                    </div>
                    {activity.tokenId ? (
                      <p className="text-xs text-gray-500 font-mono">
                        {activity.inscriptionNumber
                          ? `Inscription #${activity.inscriptionNumber}`
                          : `Token ${activity.tokenId.slice(0, 12)}...`}
                      </p>
                    ) : activity.inscriptionNumber ? (
                      <p className="text-xs text-gray-500 font-mono">Inscription #{activity.inscriptionNumber}</p>
                    ) : null}
                  </div>
                </div>

                {/* Right: Price & Time */}
                <div className="text-right">
                  {activity.listedPrice && (
                    <div className="text-lg font-bold text-[#f59e0b] font-mono mb-1">
                      {formatPrice(activity.listedPrice)}
                    </div>
                  )}
                  {activity.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(activity.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
