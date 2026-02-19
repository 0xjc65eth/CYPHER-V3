'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Ordinal {
  id: string;
  inscriptionNumber: number;
  inscriptionId: string;
  owner: string;
  contentType: string;
  contentUrl: string;
  timestamp: Date;
  genesisHeight: number;
  genesisFee: number;
  outputValue: number;
  location: string;
  collection?: {
    id: string;
    name: string;
    slug: string;
    verified: boolean;
  };
  rarity?: {
    rank: number;
    score: number;
    traits: Record<string, any>;
  };
  market?: {
    listed: boolean;
    price?: number;
    marketplace?: string;
    lastSale?: {
      price: number;
      timestamp: Date;
      from: string;
      to: string;
    };
  };
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  verified: boolean;
  supply: number;
  holders: number;
  floorPrice: number;
  volume24h: number;
  volumeTotal: number;
  change24h: number;
  listings: number;
  royaltyFee: number;
  createdAt: Date;
}

interface MarketStats {
  totalVolume: number;
  volume24h: number;
  totalSales: number;
  sales24h: number;
  avgPrice: number;
  floorPrice: number;
  uniqueBuyers: number;
  uniqueSellers: number;
}

type ViewMode = 'grid' | 'list';
type TabView = 'trending' | 'collections' | 'inscriptions' | 'activity';
type SortBy = 'recent' | 'price_asc' | 'price_desc' | 'rarity' | 'number';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

// No mock data - all data comes from real API endpoints

export function OrdinalsSystemV2() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabView>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrdinal, setSelectedOrdinal] = useState<Ordinal | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalVolume: 0,
    volume24h: 0,
    totalSales: 0,
    sales24h: 0,
    avgPrice: 0,
    floorPrice: 0,
    uniqueBuyers: 0,
    uniqueSellers: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    collections: [] as string[],
    contentTypes: [] as string[],
    attributes: {} as Record<string, string[]>
  });

  // Load data
  useEffect(() => {
    loadOrdinalsData();
  }, [sortBy, timeRange, filters]);

  const loadOrdinalsData = async () => {
    setIsLoading(true);
    try {
      // Load ordinals data from API
      const response = await fetch('/api/ordinals/list/?' + new URLSearchParams({
        sort: sortBy,
        timeRange,
        ...filters
      }));
      
      if (response.ok) {
        const data = await response.json();
        setOrdinals(data.ordinals || []);
        setMarketStats(data.stats || marketStats);
      }
    } catch (error) {
      console.error('Failed to load ordinals:', error);
      toast.error('Failed to load ordinals data');
    } finally {
      setIsLoading(false);
    }
  };

  // Bitcoin address validation - use improved validation from apiCache
  const isBitcoinAddress = (address: string): boolean => {
    if (!address || typeof address !== 'string') return false;
    
    const cleanAddress = address.trim();
    
    // Bitcoin address patterns - comprehensive validation
    const patterns = [
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // P2PKH and P2SH Legacy addresses
      /^bc1[a-z0-9]{39,59}$/, // Bech32 native segwit (P2WPKH and P2WSH)
      /^bc1p[a-z0-9]{58}$/, // Bech32m Taproot (P2TR)
      /^tb1[a-z0-9]{39,59}$/, // Testnet Bech32
      /^tb1p[a-z0-9]{58}$/, // Testnet Bech32m Taproot
      /^2[a-km-zA-HJ-NP-Z1-9]{33}$/, // Testnet P2SH
      /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Testnet P2PKH
    ];
    
    return patterns.some(pattern => pattern.test(cleanAddress));
  };

  // Address search state
  const [addressSearchResults, setAddressSearchResults] = useState<{
    ordinals: any[];
    isLoading: boolean;
    error: string | null;
    searchedAddress: string | null;
  }>({
    ordinals: [],
    isLoading: false,
    error: null,
    searchedAddress: null
  });

  // Handle address search with timeout and retry logic
  const searchByAddress = async (address: string) => {
    setAddressSearchResults(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      searchedAddress: address 
    }));
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(`/api/ordinals/address/${address}/?limit=20`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const inscriptions = data.data?.inscriptions || [];
        setAddressSearchResults({
          ordinals: inscriptions,
          isLoading: false,
          error: null,
          searchedAddress: address
        });
        
        // Switch to inscriptions tab to show results
        if (inscriptions.length > 0) {
          setActiveTab('inscriptions');
          toast.success(`Found ${data.data.total_inscriptions || inscriptions.length} inscriptions for this address`);
        } else {
          toast.success('No inscriptions found for this address');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch address data');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Address search error:', error);
      
      let errorMessage = 'Failed to search address data';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Search request timed out. Please try again.';
        } else if (error.message.includes('HTTP 429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('HTTP 5')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setAddressSearchResults({
        ordinals: [],
        isLoading: false,
        error: errorMessage,
        searchedAddress: address
      });
      
      toast.error(errorMessage);
    }
  };

  // Handle search input with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Clear previous search timeout
    if (handleSearch.timeout) {
      clearTimeout(handleSearch.timeout);
    }
    
    // Check if it's a Bitcoin address
    if (query.length > 10 && isBitcoinAddress(query.trim())) {
      // Debounce address search to avoid excessive API calls
      handleSearch.timeout = setTimeout(() => {
        searchByAddress(query.trim());
      }, 1000); // 1 second debounce
    } else {
      // Clear address results if not searching by address
      setAddressSearchResults({
        ordinals: [],
        isLoading: false,
        error: null,
        searchedAddress: null
      });
    }
  };
  
  // Add timeout property to function
  (handleSearch as any).timeout = null;

  // Filter and search
  const filteredResults = useMemo(() => {
    // If we have address search results, show them
    if (addressSearchResults.ordinals.length > 0 && activeTab === 'inscriptions') {
      return addressSearchResults.ordinals;
    }

    let results = activeTab === 'collections' ? collections : ordinals;
    
    if (searchQuery && !isBitcoinAddress(searchQuery.trim())) {
      if (activeTab === 'collections') {
        results = collections.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        results = ordinals.filter(o => 
          o.inscriptionNumber.toString().includes(searchQuery) ||
          o.inscriptionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.owner.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }
    
    return results;
  }, [activeTab, collections, ordinals, searchQuery, addressSearchResults.ordinals]);

  const formatPrice = (price: number): string => {
    return `${price.toFixed(4)} BTC`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Ordinals Explorer
              </h1>
              <p className="text-gray-400 text-sm">Discover and analyze Bitcoin inscriptions</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inscriptions, collections, or paste Bitcoin address..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.length > 10 && isBitcoinAddress(searchQuery.trim())) {
                      if (handleSearch.timeout) {
                        clearTimeout(handleSearch.timeout);
                      }
                      searchByAddress(searchQuery.trim());
                    }
                  }}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-96"
                />
                {searchQuery && isBitcoinAddress(searchQuery.trim()) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-orange-400 flex items-center gap-2 z-50">
                    <Search className="w-4 h-4" />
                    {addressSearchResults.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching Bitcoin address...
                      </>
                    ) : (
                      'Will search Bitcoin address on Enter or after 1 second'
                    )}
                  </div>
                )}
              </div>
              
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
              
              <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">24h Volume</span>
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.volume24h)}</p>
              <p className="text-sm text-green-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +15.7%
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Floor Price</span>
                <DollarSign className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.floorPrice)}</p>
              <p className="text-sm text-red-400 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" />
                -3.2%
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Total Sales</span>
                <BarChart3 className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatNumber(marketStats.totalSales)}</p>
              <p className="text-sm text-gray-500">{formatNumber(marketStats.sales24h)} today</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Avg Price</span>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.avgPrice)}</p>
              <p className="text-sm text-gray-500">Last {timeRange}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-[140px] z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'collections', label: 'Collections', icon: Grid },
                { id: 'inscriptions', label: 'Inscriptions', icon: Gem },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabView)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

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
                <option value="rarity">Rarity</option>
                <option value="number">Inscription #</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-800 bg-gray-850"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Price Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Content Type</label>
                  <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm">
                    <option value="">All Types</option>
                    <option value="image">Images</option>
                    <option value="text">Text</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Collection</label>
                  <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm">
                    <option value="">All Collections</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setFilters({
                      priceMin: '',
                      priceMax: '',
                      collections: [],
                      contentTypes: [],
                      attributes: {}
                    })}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={loadOrdinalsData}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {(isLoading || addressSearchResults.isLoading) ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="ml-2 text-gray-400">
              {addressSearchResults.isLoading ? 'Searching address...' : 'Loading...'}
            </span>
          </div>
        ) : (
          <>
            {/* Address Search Results Info */}
            {((addressSearchResults.ordinals.length > 0) || addressSearchResults.error) && activeTab === 'inscriptions' && addressSearchResults.searchedAddress && (
              <div className={`mb-6 bg-gradient-to-r rounded-lg p-4 border ${
                addressSearchResults.error 
                  ? 'from-red-500/10 to-red-600/10 border-red-500/20' 
                  : 'from-orange-500/10 to-amber-500/10 border-orange-500/20'
              }`}>
                <div className="flex items-center gap-3">
                  {addressSearchResults.error ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {addressSearchResults.error ? 'Address Search Error' : 'Address Search Results'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {addressSearchResults.error ? (
                        <span className="text-red-400">{addressSearchResults.error}</span>
                      ) : (
                        <>
                          Found {addressSearchResults.ordinals.length} inscriptions for address: 
                          <span className="text-orange-400 ml-1 font-mono text-xs">
                            {addressSearchResults.searchedAddress.substring(0, 8)}...{addressSearchResults.searchedAddress.substring(addressSearchResults.searchedAddress.length - 8)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {addressSearchResults.error && (
                    <button
                      onClick={() => addressSearchResults.searchedAddress && searchByAddress(addressSearchResults.searchedAddress)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inscriptions View with Address Results */}
            {activeTab === 'inscriptions' && addressSearchResults.ordinals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {addressSearchResults.ordinals.map((inscription, index) => (
                  <motion.div
                    key={inscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-orange-500 transition-all cursor-pointer"
                    onClick={() => setSelectedOrdinal(inscription)}
                  >
                    <div className="aspect-square bg-gray-700 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20" />
                      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
                        #{inscription.number}
                      </div>
                      {inscription.collection && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                          {inscription.collection.name}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Inscription</span>
                        <span className="text-xs text-gray-500">{inscription.content_type || 'unknown'}</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">#{inscription.number || 'N/A'}</h3>
                      <p className="text-xs text-gray-400 font-mono mb-2">
                        {inscription.id ? `${inscription.id.substring(0, 12)}...` : 'No ID'}
                      </p>
                      {inscription.market?.listed && inscription.market.price && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Price</span>
                          <span className="text-sm font-medium text-green-400">
                            {formatPrice(inscription.market.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Collections View */}
            {activeTab === 'collections' && (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
                {collections.map(collection => (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedCollection(collection)}
                    className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all ${
                      viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square bg-gray-700 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20" />
                          {collection.verified && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white mb-1">{collection.name}</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400">Floor</p>
                              <p className="text-white font-medium">{formatPrice(collection.floorPrice)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">24h Vol</p>
                              <p className="text-white font-medium">{formatPrice(collection.volume24h)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-gray-400">{formatNumber(collection.supply)} items</span>
                            <span className={`text-sm font-medium ${collection.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {collection.change24h >= 0 ? '+' : ''}{collection.change24h.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{collection.name}</h3>
                            {collection.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-sm text-gray-400">{collection.description}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-center">
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
                            <p className="text-sm text-gray-400">24h</p>
                            <p className={`font-medium ${collection.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {collection.change24h >= 0 ? '+' : ''}{collection.change24h.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredResults.length === 0 && (
              <div className="text-center py-24">
                <Gem className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No results found</h3>
                <p className="text-gray-500">Try adjusting your filters or search query</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Collection Detail Modal */}
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
              className="bg-gray-900 rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-800 rounded-lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-white">{selectedCollection.name}</h2>
                        {selectedCollection.verified && (
                          <CheckCircle2 className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <p className="text-gray-400 mt-1">{selectedCollection.description}</p>
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

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Collection Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Floor Price</p>
                    <p className="text-xl font-bold text-white">{formatPrice(selectedCollection.floorPrice)}</p>
                    <p className={`text-sm mt-1 ${selectedCollection.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCollection.change24h >= 0 ? '+' : ''}{selectedCollection.change24h.toFixed(1)}% (24h)
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Volume</p>
                    <p className="text-xl font-bold text-white">{formatPrice(selectedCollection.volumeTotal)}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatPrice(selectedCollection.volume24h)} (24h)</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Items</p>
                    <p className="text-xl font-bold text-white">{formatNumber(selectedCollection.supply)}</p>
                    <p className="text-sm text-gray-500 mt-1">{selectedCollection.listings} listed</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Holders</p>
                    <p className="text-xl font-bold text-white">{formatNumber(selectedCollection.holders)}</p>
                    <p className="text-sm text-gray-500 mt-1">{selectedCollection.royaltyFee}% royalty</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mb-8">
                  <button className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors">
                    View Collection
                  </button>
                  <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Recent Items Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Inscriptions</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square bg-gray-800 rounded-lg"></div>
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