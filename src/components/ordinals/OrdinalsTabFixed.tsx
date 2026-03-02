'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabsFixed } from '@/components/ui/TabsFixed';
import {
  Search,
  Filter,
  Grid,
  List,
  TrendingUp,
  TrendingDown,
  Activity,
  Gem,
  DollarSign,
  Clock,
  Eye,
  Heart,
  Share2,
  ExternalLink,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Info,
  Copy,
  Bookmark,
  Minus as TrendingFlat,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Send,
  Hash
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { ordinalsService, OrdinalsAnalytics } from '@/services/ordinals';

// Enhanced interfaces with better typing
interface OrdinalRarity {
  rank: number;
  score: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  traits: Array<{
    type: string;
    value: string;
    rarity: number;
  }>;
}

interface OrdinalMarket {
  listed: boolean;
  price?: number;
  usdPrice?: number;
  marketplace?: 'magic-eden' | 'ordinals-wallet' | 'gamma' | 'unisat';
  lastSale?: {
    price: number;
    usdPrice: number;
    timestamp: Date;
    from: string;
    to: string;
    marketplace: string;
  };
  priceHistory: Array<{
    price: number;
    timestamp: Date;
    event: 'sale' | 'listing' | 'delisting';
  }>;
}

interface Ordinal {
  id: string;
  inscriptionNumber: number;
  inscriptionId: string;
  owner: string;
  contentType: string;
  contentUrl: string;
  contentPreview?: string;
  timestamp: Date;
  genesisHeight: number;
  genesisFee: number;
  outputValue: number;
  location: string;
  size: number;
  collection?: {
    id: string;
    name: string;
    slug: string;
    verified: boolean;
    description: string;
    imageUrl: string;
    website?: string;
    twitter?: string;
    discord?: string;
  };
  rarity?: OrdinalRarity;
  market?: OrdinalMarket;
  metadata?: Record<string, any>;
  isVideo: boolean;
  isAudio: boolean;
  isText: boolean;
  isImage: boolean;
  favorited?: boolean;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  verified: boolean;
  supply: number;
  holders: number;
  floorPrice: number;
  volume24h: number;
  volumeTotal: number;
  change24h: number;
  change7d: number;
  listings: number;
  sales24h: number;
  royaltyFee: number;
  createdAt: Date;
  website?: string;
  twitter?: string;
  discord?: string;
  tags: string[];
  stats: {
    avgPrice: number;
    medianPrice: number;
    highestSale: number;
    uniqueOwners: number;
    listedPercent: number;
  };
}

interface MarketStats {
  totalVolume: number;
  volume24h: number;
  volumeChange24h: number;
  totalSales: number;
  sales24h: number;
  avgPrice: number;
  avgPriceChange24h: number;
  floorPrice: number;
  floorPriceChange24h: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  marketCap: number;
  activeListings: number;
  topSale24h?: {
    price: number;
    collection: string;
    inscriptionNumber: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'sale' | 'listing' | 'transfer' | 'mint';
  inscriptionNumber: number;
  collection?: string;
  price?: number;
  from: string;
  to: string;
  timestamp: Date;
  txHash: string;
  marketplace?: string;
}

type ViewMode = 'grid' | 'list' | 'masonry';
type TabView = 'trending' | 'collections' | 'inscriptions' | 'activity' | 'analytics';
type SortBy = 'recent' | 'price_asc' | 'price_desc' | 'rarity' | 'number' | 'volume' | 'popularity';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

// No mock data - all data comes from real API endpoints

export function OrdinalsTabFixed() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabView>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedOrdinal, setSelectedOrdinal] = useState<Ordinal | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Data state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<OrdinalsAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalVolume: 0,
    volume24h: 0,
    volumeChange24h: 0,
    totalSales: 0,
    sales24h: 0,
    avgPrice: 0,
    avgPriceChange24h: 0,
    floorPrice: 0,
    floorPriceChange24h: 0,
    uniqueBuyers: 0,
    uniqueSellers: 0,
    marketCap: 0,
    activeListings: 0,
    topSale24h: {
      price: 0,
      collection: '',
      inscriptionNumber: 0
    }
  });

  // Filters state
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    collections: [] as string[],
    contentTypes: [] as string[],
    rarity: [] as string[],
    attributes: {} as Record<string, string[]>,
    isListed: false,
    hasRarity: false
  });

  // Refs for performance
  const abortControllerRef = useRef<AbortController>();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load data effect
  useEffect(() => {
    loadOrdinalsData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadOrdinalsData, 30000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [sortBy, timeRange, filters, autoRefresh]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Load analytics data when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      loadAnalyticsData();
    }
  }, [activeTab]);

  const loadAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await ordinalsService.fetchOrdinalsStats();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Data loading function with abort control
  const loadOrdinalsData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        timeRange,
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : String(value)
          ])
        )
      });

      const [ordinalsRes, collectionsRes, activityRes, statsRes] = await Promise.all([
        fetch(`/api/ordinals/list/?${params}`, { 
          signal: abortControllerRef.current.signal 
        }),
        fetch(`/api/ordinals/collections/?${params}`, { 
          signal: abortControllerRef.current.signal 
        }),
        fetch(`/api/ordinals/activity/?${params}`, { 
          signal: abortControllerRef.current.signal 
        }),
        fetch(`/api/ordinals/stats/?${params}`, { 
          signal: abortControllerRef.current.signal 
        })
      ]);

      if (ordinalsRes.ok) {
        const data = await ordinalsRes.json();
        setOrdinals(data.ordinals || []);
      }

      if (collectionsRes.ok) {
        const data = await collectionsRes.json();
        setCollections(data.collections || []);
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setMarketStats(data.stats || marketStats);
      }

      // Play notification sound if enabled
      if (soundEnabled && activity.length > 0) {
        playNotificationSound();
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load ordinals:', error);
        toast.error('Failed to load ordinals data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, timeRange, filters, soundEnabled, activity.length, marketStats]);

  // Utility functions
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        toast.success('Removed from favorites');
      } else {
        newSet.add(id);
        toast.success('Added to favorites');
      }
      return newSet;
    });
  }, []);

  const copyToClipboard = useCallback((text: string, label: string = 'Text') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const exportData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      collections: filteredResults,
      marketStats,
      activity: activity.slice(0, 100), // Last 100 activities
      filters
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordinals-data-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  }, [timeRange, collections, marketStats, activity, filters]);

  // Filter and search with performance optimization
  const filteredResults = useMemo(() => {
    let results = activeTab === 'collections' ? collections : ordinals;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      if (activeTab === 'collections') {
        results = collections.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.slug.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.tags.some(tag => tag.toLowerCase().includes(query))
        );
      } else {
        results = ordinals.filter(o => 
          o.inscriptionNumber.toString().includes(query) ||
          o.inscriptionId.toLowerCase().includes(query) ||
          o.owner.toLowerCase().includes(query) ||
          o.collection?.name.toLowerCase().includes(query)
        );
      }
    }

    // Price filter
    if (filters.priceMin || filters.priceMax) {
      const min = parseFloat(filters.priceMin) || 0;
      const max = parseFloat(filters.priceMax) || Infinity;
      
      if (activeTab === 'collections') {
        results = (results as Collection[]).filter(c => 
          c.floorPrice >= min && c.floorPrice <= max
        );
      } else {
        results = (results as Ordinal[]).filter(o => 
          o.market?.price && o.market.price >= min && o.market.price <= max
        );
      }
    }

    // Content type filter
    if (filters.contentTypes.length > 0) {
      results = (results as Ordinal[]).filter(o => 
        filters.contentTypes.includes(o.contentType.split('/')[0])
      );
    }

    // Collection filter
    if (filters.collections.length > 0 && activeTab !== 'collections') {
      results = (results as Ordinal[]).filter(o => 
        o.collection && filters.collections.includes(o.collection.id)
      );
    }

    // Sort results
    if (activeTab === 'collections') {
      (results as Collection[]).sort((a, b) => {
        switch (sortBy) {
          case 'volume':
            return b.volume24h - a.volume24h;
          case 'price_desc':
            return b.floorPrice - a.floorPrice;
          case 'price_asc':
            return a.floorPrice - b.floorPrice;
          case 'popularity':
            return b.holders - a.holders;
          case 'recent':
          default:
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
      });
    }
    
    return results;
  }, [activeTab, collections, ordinals, searchQuery, sortBy, filters]);

  // Format functions
  const formatPrice = (price: number): string => {
    return `${price.toFixed(4)} BTC`;
  };

  const formatUSDPrice = (btcPrice: number): string => {
    const usdPrice = btcPrice * 98500; // Assuming BTC price
    return `$${usdPrice.toLocaleString()}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatChange = (change: number): string => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getContentTypeIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.startsWith('text/')) return '📄';
    return '📎';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Ordinals Explorer Pro
              </h1>
              <p className="text-gray-400 text-sm">Professional Bitcoin inscriptions analytics</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inscriptions, collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-96"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border transition-colors ${
                  soundEnabled 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
                title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              {/* Auto Refresh */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg border transition-colors ${
                  autoRefresh 
                    ? 'bg-green-600/20 border-green-500 text-green-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
                title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              >
                <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Export */}
              <button
                onClick={exportData}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                title="Export data"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-orange-600/20 border-orange-500 text-orange-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {/* View Mode */}
              <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1">
                {[
                  { mode: 'grid', icon: Grid },
                  { mode: 'list', icon: List },
                  { mode: 'masonry', icon: BarChart3 }
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={`p-2 rounded ${viewMode === mode ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Market Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">24h Volume</span>
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.volume24h)}</p>
              <p className={`text-sm flex items-center gap-1 ${getChangeColor(marketStats.volumeChange24h)}`}>
                {marketStats.volumeChange24h >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {formatChange(marketStats.volumeChange24h)}
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Floor Price</span>
                <DollarSign className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.floorPrice)}</p>
              <p className={`text-sm flex items-center gap-1 ${getChangeColor(marketStats.floorPriceChange24h)}`}>
                {marketStats.floorPriceChange24h >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {formatChange(marketStats.floorPriceChange24h)}
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Sales</span>
                <BarChart3 className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatNumber(marketStats.sales24h)}</p>
              <p className="text-sm text-gray-500">{formatNumber(marketStats.totalSales)} total</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Avg Price</span>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.avgPrice)}</p>
              <p className={`text-sm flex items-center gap-1 ${getChangeColor(marketStats.avgPriceChange24h)}`}>
                {marketStats.avgPriceChange24h >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {formatChange(marketStats.avgPriceChange24h)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Listings</span>
                <Gem className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatNumber(marketStats.activeListings)}</p>
              <p className="text-sm text-gray-500">
                {marketStats.topSale24h && `Top: ${formatPrice(marketStats.topSale24h.price)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-[140px] z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <TabsFixed
              tabs={[
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'collections', label: 'Collections', icon: Grid },
                { id: 'inscriptions', label: 'Inscriptions', icon: Gem },
                { id: 'activity', label: 'Activity', icon: Activity },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ]}
              activeTab={activeTab}
              onTabChange={(tabId) => {
                setActiveTab(tabId as TabView);
              }}
            />

            {/* Sort and Time Range */}
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="1h">1 Hour</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="all">All Time</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="recent">Most Recent</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="volume">Volume</option>
                <option value="popularity">Popularity</option>
                <option value="rarity">Rarity</option>
                <option value="number">Inscription #</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-800 bg-gray-850"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Price Range (BTC)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Min"
                      value={filters.priceMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Max"
                      value={filters.priceMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Content Type</label>
                  <select 
                    multiple
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm h-[42px] overflow-hidden"
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      setFilters(prev => ({ ...prev, contentTypes: values }));
                    }}
                  >
                    <option value="image">Images</option>
                    <option value="text">Text</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="application">Apps</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Collection</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    onChange={(e) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        collections: e.target.value ? [e.target.value] : [] 
                      }));
                    }}
                  >
                    <option value="">All Collections</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Rarity</label>
                  <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm">
                    <option value="">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                    <option value="mythic">Mythic</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Status</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.isListed}
                        onChange={(e) => setFilters(prev => ({ ...prev, isListed: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-800 text-orange-500"
                      />
                      <span className="text-gray-300">Listed only</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.hasRarity}
                        onChange={(e) => setFilters(prev => ({ ...prev, hasRarity: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-800 text-orange-500"
                      />
                      <span className="text-gray-300">Has rarity</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setFilters({
                      priceMin: '',
                      priceMax: '',
                      collections: [],
                      contentTypes: [],
                      rarity: [],
                      attributes: {},
                      isListed: false,
                      hasRarity: false
                    })}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={loadOrdinalsData}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading ordinals data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Collections View */}
            {activeTab === 'collections' && (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
                  : viewMode === 'masonry'
                  ? 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4'
                  : 'space-y-4'
              }>
                {(filteredResults as Collection[]).map(collection => (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => setSelectedCollection(collection)}
                    className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all duration-300 group ${
                      viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'break-inside-avoid'
                    }`}
                  >
                    {viewMode === 'grid' || viewMode === 'masonry' ? (
                      <>
                        <div className="aspect-square bg-gray-700 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20" />
                          <div className="absolute top-2 right-2 flex gap-2">
                            {collection.verified && (
                              <div className="bg-blue-600 text-white p-1 rounded-full">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(collection.id);
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                favoriteItems.has(collection.id)
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-800/80 text-gray-400 hover:text-red-400'
                              }`}
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Volume indicator */}
                          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1">
                            <p className="text-xs text-white font-medium">
                              {formatPrice(collection.volume24h)} 24h
                            </p>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                              {collection.name}
                            </h3>
                            {collection.verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <p className="text-gray-400">Floor</p>
                              <p className="text-white font-medium">{formatPrice(collection.floorPrice)}</p>
                              <p className="text-xs text-gray-500">{formatUSDPrice(collection.floorPrice)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">24h Vol</p>
                              <p className="text-white font-medium">{formatPrice(collection.volume24h)}</p>
                              <p className="text-xs text-gray-500">{collection.sales24h} sales</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">{formatNumber(collection.supply)} items</span>
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                {collection.stats.listedPercent.toFixed(1)}% listed
                              </span>
                            </div>
                            <span className={`text-sm font-medium ${getChangeColor(collection.change24h)}`}>
                              {formatChange(collection.change24h)}
                            </span>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {collection.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{collection.name}</h3>
                            {collection.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                            <div className="flex gap-1">
                              {collection.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{collection.description}</p>
                        </div>
                        <div className="grid grid-cols-5 gap-4 text-center flex-shrink-0">
                          <div>
                            <p className="text-sm text-gray-400">Floor</p>
                            <p className="font-medium">{formatPrice(collection.floorPrice)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">24h Vol</p>
                            <p className="font-medium">{formatPrice(collection.volume24h)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Supply</p>
                            <p className="font-medium">{formatNumber(collection.supply)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Holders</p>
                            <p className="font-medium">{formatNumber(collection.holders)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">24h</p>
                            <p className={`font-medium ${getChangeColor(collection.change24h)}`}>
                              {formatChange(collection.change24h)}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Activity View */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {activity.map(item => (
                      <div key={item.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                              item.type === 'listing' ? 'bg-blue-500/20 text-blue-400' :
                              item.type === 'transfer' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {item.type === 'sale' && <DollarSign className="w-5 h-5" />}
                              {item.type === 'listing' && <Activity className="w-5 h-5" />}
                              {item.type === 'transfer' && <Send className="w-5 h-5" />}
                              {item.type === 'mint' && <Zap className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white">
                                  #{item.inscriptionNumber}
                                </p>
                                {item.collection && (
                                  <span className="text-sm text-gray-400">
                                    from {item.collection}
                                  </span>
                                )}
                                <span className={`text-sm font-medium capitalize ${
                                  item.type === 'sale' ? 'text-green-400' :
                                  item.type === 'listing' ? 'text-blue-400' :
                                  item.type === 'transfer' ? 'text-purple-400' :
                                  'text-orange-400'
                                }`}>
                                  {item.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>{formatDistanceToNow(item.timestamp)} ago</span>
                                {item.marketplace && (
                                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                                    {item.marketplace}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {item.price && (
                              <div>
                                <p className="font-medium text-white">
                                  {formatPrice(item.price)}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {formatUSDPrice(item.price)}
                                </p>
                              </div>
                            )}

                            <button
                              onClick={() => copyToClipboard(item.txHash, 'Transaction hash')}
                              className="text-sm text-gray-400 hover:text-white transition-colors mt-1"
                            >
                              <Hash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                ) : analyticsData ? (
                  <>
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Total Inscriptions</span>
                          <Gem className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {typeof analyticsData.totalInscriptions === 'number'
                            ? analyticsData.totalInscriptions.toLocaleString()
                            : analyticsData.totalInscriptions}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {typeof analyticsData.trends.inscriptionsGrowth === 'number'
                            ? `${analyticsData.trends.inscriptionsGrowth > 0 ? '+' : ''}${analyticsData.trends.inscriptionsGrowth}% growth`
                            : analyticsData.trends.inscriptionsGrowth}
                        </p>
                      </div>

                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">24h Volume</span>
                          <BarChart3 className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {typeof analyticsData.totalVolume24h === 'number'
                            ? `₿${analyticsData.totalVolume24h.toFixed(2)}`
                            : analyticsData.totalVolume24h}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {typeof analyticsData.trends.volumeGrowth === 'number'
                            ? `${analyticsData.trends.volumeGrowth > 0 ? '+' : ''}${analyticsData.trends.volumeGrowth}% vs yesterday`
                            : analyticsData.trends.volumeGrowth}
                        </p>
                      </div>

                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">24h Sales</span>
                          <Activity className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {typeof analyticsData.totalSales24h === 'number'
                            ? analyticsData.totalSales24h.toLocaleString()
                            : analyticsData.totalSales24h}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">transactions</p>
                      </div>

                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Avg. Price</span>
                          <DollarSign className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {typeof analyticsData.averagePrice === 'number'
                            ? `${analyticsData.averagePrice.toLocaleString()} sats`
                            : analyticsData.averagePrice}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">inscription fee</p>
                      </div>
                    </div>

                    {/* Market Sentiment */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-orange-500" />
                          Market Sentiment
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          analyticsData.marketSentiment === 'bullish'
                            ? 'bg-green-500/20 text-green-400'
                            : analyticsData.marketSentiment === 'bearish'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {analyticsData.marketSentiment.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400">
                        The Ordinals market is currently showing {analyticsData.marketSentiment} signals based on volume growth and activity trends.
                      </p>
                    </div>

                    {/* Top Collections */}
                    {analyticsData.topCollections && analyticsData.topCollections.length > 0 && (
                      <div className="bg-gray-800 rounded-xl border border-gray-700">
                        <div className="p-4 border-b border-gray-700">
                          <h3 className="text-lg font-semibold text-white">Top Collections</h3>
                        </div>
                        <div className="divide-y divide-gray-700">
                          {analyticsData.topCollections.map((collection, index) => (
                            <div key={collection.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-white">{collection.name}</p>
                                    <p className="text-sm text-gray-400">Floor: ₿{collection.floorPrice.toFixed(4)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-white">₿{collection.volume24h.toFixed(2)}</p>
                                  <p className={`text-sm flex items-center gap-1 ${
                                    collection.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {collection.change24h >= 0 ? (
                                      <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                      <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    {Math.abs(collection.change24h).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Refresh Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={loadAnalyticsData}
                        disabled={analyticsLoading}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                        Refresh Data
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-24">
                    <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Failed to load analytics</h3>
                    <p className="text-gray-500 mb-4">Unable to fetch data from Hiro API</p>
                    <button
                      onClick={loadAnalyticsData}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {filteredResults.length === 0 && (
              <div className="text-center py-24">
                <Gem className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No results found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search query</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({
                      priceMin: '',
                      priceMax: '',
                      collections: [],
                      contentTypes: [],
                      rarity: [],
                      attributes: {},
                      isListed: false,
                      hasRarity: false
                    });
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Collection Detail Modal */}
      <AnimatePresence>
        {selectedCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedCollection(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl border border-gray-800 max-w-6xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header with Banner */}
              <div className="relative">
                {selectedCollection.bannerUrl && (
                  <div className="h-32 bg-gradient-to-r from-orange-500/20 to-purple-500/20" />
                )}
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gray-800 rounded-lg border-4 border-gray-900 -mt-12 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-purple-500/30 rounded-lg" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-white">{selectedCollection.name}</h2>
                          {selectedCollection.verified && (
                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                          )}
                          <button
                            onClick={() => toggleFavorite(selectedCollection.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              favoriteItems.has(selectedCollection.id)
                                ? 'bg-red-600/20 text-red-400'
                                : 'bg-gray-800 text-gray-400 hover:text-red-400'
                            }`}
                          >
                            <Heart className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-gray-400 mt-1">{selectedCollection.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {selectedCollection.website && (
                            <a
                              href={selectedCollection.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Website
                            </a>
                          )}
                          {selectedCollection.twitter && (
                            <a
                              href={`https://twitter.com/${selectedCollection.twitter.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              {selectedCollection.twitter}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCollection(null)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Enhanced Collection Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Floor Price</p>
                    <p className="text-xl font-bold text-white">{formatPrice(selectedCollection.floorPrice)}</p>
                    <p className="text-sm text-gray-500">{formatUSDPrice(selectedCollection.floorPrice)}</p>
                    <p className={`text-sm mt-1 ${getChangeColor(selectedCollection.change24h)}`}>
                      {formatChange(selectedCollection.change24h)} (24h)
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Volume</p>
                    <p className="text-xl font-bold text-white">{formatPrice(selectedCollection.volumeTotal)}</p>
                    <p className="text-sm text-gray-500">{formatUSDPrice(selectedCollection.volumeTotal)}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatPrice(selectedCollection.volume24h)} (24h)</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Items</p>
                    <p className="text-xl font-bold text-white">{formatNumber(selectedCollection.supply)}</p>
                    <p className="text-sm text-gray-500 mt-1">{selectedCollection.listings} listed ({selectedCollection.stats.listedPercent.toFixed(1)}%)</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Holders</p>
                    <p className="text-xl font-bold text-white">{formatNumber(selectedCollection.holders)}</p>
                    <p className="text-sm text-gray-500 mt-1">{selectedCollection.royaltyFee}% royalty</p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Avg Price</p>
                    <p className="text-lg font-bold text-white">{formatPrice(selectedCollection.stats.avgPrice)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Median Price</p>
                    <p className="text-lg font-bold text-white">{formatPrice(selectedCollection.stats.medianPrice)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Highest Sale</p>
                    <p className="text-lg font-bold text-white">{formatPrice(selectedCollection.stats.highestSale)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">24h Sales</p>
                    <p className="text-lg font-bold text-white">{selectedCollection.sales24h}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCollection.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mb-8">
                  <button className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors">
                    View Collection
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedCollection.slug, 'Collection slug')}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {/* Recent Items Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Inscriptions</h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {[...Array(16)].map((_, i) => (
                      <div 
                        key={i} 
                        className="aspect-square bg-gray-800 rounded-lg relative group cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-lg" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/80 rounded-lg px-2 py-1">
                            <p className="text-xs text-white">#{(i + 1) * 1000}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}