'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Coins,
  DollarSign,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Zap,
  Shield,
  Clock,
  Hash,
  Wallet,
  Send,
  X,
  RefreshCw,
  Download,
  Volume2,
  VolumeX,
  Settings,
  Star,
  Heart,
  Share2,
  Plus,
  Minus,
  Calculator,
  TrendingFlat,
  Target,
  Award,
  Flame
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

// Enhanced interfaces for better typing and functionality
interface RuneTerms {
  amount: string;
  cap: string;
  heightStart: number;
  heightEnd: number;
  offsetStart: number;
  offsetEnd: number;
  deadline?: number;
}

interface RuneSupply {
  total: string;
  minted: string;
  mintable: string;
  burned: string;
  circulating: string;
  premine: string;
  remaining: string;
}

interface RuneMarket {
  price: number;
  usdPrice: number;
  marketCap: number;
  volume24h: number;
  volumeTotal: number;
  change24h: number;
  change7d: number;
  holders: number;
  transactions24h: number;
  liquidity: number;
  priceHistory: Array<{
    price: number;
    timestamp: Date;
    volume: number;
  }>;
}

interface RuneEtching {
  block: number;
  tx: string;
  timestamp: Date;
  etcher: string;
  fee: number;
}

interface Rune {
  id: string;
  name: string;
  symbol: string;
  runeId: string;
  number: number;
  divisibility: number;
  supply: RuneSupply;
  terms: RuneTerms;
  timestamp: Date;
  etching: RuneEtching;
  turbo: boolean;
  market: RuneMarket;
  spacedName: string;
  website?: string;
  description?: string;
  social?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  tags: string[];
  verified: boolean;
  isActive: boolean;
  totalMints: number;
  uniqueHolders: number;
  deployerBalance: string;
}

interface RuneBalance {
  rune: Rune;
  amount: string;
  value: number;
  usdValue: number;
  percentage: number;
  lastUpdated: Date;
}

interface RuneTransaction {
  id: string;
  type: 'mint' | 'transfer' | 'burn' | 'etch';
  runeId: string;
  runeName: string;
  amount: string;
  from: string;
  to: string;
  txHash: string;
  blockHeight: number;
  timestamp: Date;
  fee: number;
  feeRate: number;
  status: 'confirmed' | 'pending' | 'failed';
  confirmations: number;
}

interface MarketStats {
  totalMarketCap: number;
  volume24h: number;
  volumeChange24h: number;
  runesCount: number;
  activeRunes: number;
  holders: number;
  transactions24h: number;
  avgPrice: number;
  medianPrice: number;
  topGainer: Rune | null;
  topLoser: Rune | null;
  topVolume: Rune | null;
  newRunes24h: number;
  burnedValue24h: number;
}

interface MintingOpportunity {
  rune: Rune;
  remainingMints: number;
  costPerMint: number;
  estimatedProfit: number;
  profitMargin: number;
  timeRemaining: number;
  difficulty: 'easy' | 'medium' | 'hard';
  recommendation: 'buy' | 'hold' | 'avoid';
}

type TabView = 'market' | 'portfolio' | 'mint' | 'activity' | 'analytics' | 'opportunities';
type SortBy = 'marketCap' | 'volume' | 'price' | 'change' | 'holders' | 'recent' | 'mints' | 'profit';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

// Enhanced mock data with more realistic values
const MOCK_RUNES: Rune[] = [
  {
    id: '1',
    name: 'SATOSHI•NAKAMOTO',
    symbol: 'SATOSHI',
    spacedName: 'SATOSHI•NAKAMOTO',
    runeId: '2:1',
    number: 1,
    divisibility: 8,
    supply: {
      total: '21000000000000000',
      minted: '15000000000000000',
      mintable: '6000000000000000',
      burned: '100000000000000',
      circulating: '14900000000000000',
      premine: '0',
      remaining: '6000000000000000'
    },
    terms: {
      amount: '1000000000',
      cap: '21000000',
      heightStart: 840000,
      heightEnd: 850000,
      offsetStart: 0,
      offsetEnd: 10000
    },
    timestamp: new Date('2024-04-20'),
    etching: {
      block: 840000,
      tx: 'abc123...',
      timestamp: new Date('2024-04-20'),
      etcher: 'bc1q...',
      fee: 50000
    },
    turbo: true,
    market: {
      price: 0.00000085,
      usdPrice: 0.083,
      marketCap: 12650000,
      volume24h: 1234567,
      volumeTotal: 45678900,
      change24h: 15.7,
      change7d: -3.2,
      holders: 12345,
      transactions24h: 5678,
      liquidity: 2345678,
      priceHistory: []
    },
    website: 'https://satoshi-rune.com',
    description: 'The first and most iconic Rune on Bitcoin, commemorating Satoshi Nakamoto',
    social: {
      twitter: '@SatoshiRune',
      discord: 'satoshi-rune'
    },
    tags: ['legendary', 'first', 'collectible'],
    verified: true,
    isActive: true,
    totalMints: 15000,
    uniqueHolders: 12345,
    deployerBalance: '1000000000000000'
  },
  {
    id: '2',
    name: 'BITCOIN•WIZARD',
    symbol: 'WIZARD',
    spacedName: 'BITCOIN•WIZARD',
    runeId: '3:1',
    number: 2,
    divisibility: 6,
    supply: {
      total: '1000000000000',
      minted: '800000000000',
      mintable: '200000000000',
      burned: '5000000000',
      circulating: '795000000000',
      premine: '100000000000',
      remaining: '200000000000'
    },
    terms: {
      amount: '100000',
      cap: '10000000',
      heightStart: 840100,
      heightEnd: 850100,
      offsetStart: 0,
      offsetEnd: 10000
    },
    timestamp: new Date('2024-04-21'),
    etching: {
      block: 840100,
      tx: 'def456...',
      timestamp: new Date('2024-04-21'),
      etcher: 'bc1q...',
      fee: 75000
    },
    turbo: false,
    market: {
      price: 0.00000125,
      usdPrice: 0.123,
      marketCap: 993750,
      volume24h: 234567,
      volumeTotal: 5678900,
      change24h: -8.3,
      change7d: 12.1,
      holders: 3456,
      transactions24h: 1234,
      liquidity: 456789,
      priceHistory: []
    },
    website: 'https://bitcoin-wizard.org',
    description: 'Magical Bitcoin wizardry on the Runes protocol',
    social: {
      twitter: '@BitcoinWizard',
      telegram: 'bitcoin_wizard'
    },
    tags: ['magic', 'meme', 'community'],
    verified: true,
    isActive: true,
    totalMints: 8000,
    uniqueHolders: 3456,
    deployerBalance: '50000000000'
  }
];

const MOCK_OPPORTUNITIES: MintingOpportunity[] = [
  {
    rune: MOCK_RUNES[0],
    remainingMints: 6000000,
    costPerMint: 0.0001,
    estimatedProfit: 0.00005,
    profitMargin: 50,
    timeRemaining: 86400 * 7, // 7 days
    difficulty: 'medium',
    recommendation: 'buy'
  },
  {
    rune: MOCK_RUNES[1],
    remainingMints: 2000000,
    costPerMint: 0.00008,
    estimatedProfit: 0.00002,
    profitMargin: 25,
    timeRemaining: 86400 * 3, // 3 days
    difficulty: 'hard',
    recommendation: 'hold'
  }
];

export function RunesTabFixed() {
  // State management with better organization
  const [activeTab, setActiveTab] = useState<TabView>('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('marketCap');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedRune, setSelectedRune] = useState<Rune | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteRunes, setFavoriteRunes] = useState<Set<string>>(new Set());
  
  // Data state
  const [runes, setRunes] = useState<Rune[]>(MOCK_RUNES);
  const [portfolio, setPortfolio] = useState<RuneBalance[]>([]);
  const [transactions, setTransactions] = useState<RuneTransaction[]>([]);
  const [opportunities, setOpportunities] = useState<MintingOpportunity[]>(MOCK_OPPORTUNITIES);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalMarketCap: 13643750,
    volume24h: 1469134,
    volumeChange24h: 23.5,
    runesCount: 156,
    activeRunes: 142,
    holders: 15801,
    transactions24h: 6912,
    avgPrice: 0.000845,
    medianPrice: 0.000234,
    topGainer: MOCK_RUNES[0],
    topLoser: MOCK_RUNES[1],
    topVolume: MOCK_RUNES[0],
    newRunes24h: 12,
    burnedValue24h: 45.6
  });

  // Filter state
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    marketCapMin: '',
    marketCapMax: '',
    volumeMin: '',
    verified: false,
    turbo: false,
    active: false,
    tags: [] as string[]
  });

  // Wallet state (temporarily disabled)
  const connectionState = { isConnected: false, account: null };

  // Refs for performance
  const abortControllerRef = useRef<AbortController>();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load data effect with auto-refresh
  useEffect(() => {
    loadRunesData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadRunesData, 60000); // CoinGecko rate limit: increased to 60s
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [sortBy, timeRange, autoRefresh]);

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

  // Load portfolio data when connected
  useEffect(() => {
    if (connectionState.isConnected && connectionState.account) {
      loadPortfolio();
    }
  }, [connectionState.isConnected, connectionState.account]);

  // Enhanced data loading with proper error handling
  const loadRunesData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        timeRange
      });

      const [runesRes, statsRes, opportunitiesRes] = await Promise.all([
        fetch(`/api/runes/list?${params}`, { 
          signal: abortControllerRef.current.signal 
        }),
        fetch(`/api/runes/stats?${params}`, { 
          signal: abortControllerRef.current.signal 
        }),
        fetch(`/api/runes/opportunities?${params}`, { 
          signal: abortControllerRef.current.signal 
        })
      ]);

      if (runesRes.ok) {
        const data = await runesRes.json();
        setRunes(data.runes || MOCK_RUNES);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setMarketStats(data.stats || marketStats);
      }

      if (opportunitiesRes.ok) {
        const data = await opportunitiesRes.json();
        setOpportunities(data.opportunities || MOCK_OPPORTUNITIES);
      }

      // Play notification sound for new opportunities
      if (soundEnabled && opportunities.length > 0) {
        playNotificationSound();
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load runes:', error);
        toast.error('Failed to load runes data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, timeRange, soundEnabled, opportunities.length, marketStats]);

  const loadPortfolio = useCallback(async () => {
    if (!connectionState.account) return;
    
    try {
      const response = await fetch(`/api/runes/balances/${connectionState.account.address}`);
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.balances || []);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  }, [connectionState.account]);

  // Utility functions
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('/sounds/rune-notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const toggleFavorite = useCallback((runeId: string) => {
    setFavoriteRunes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runeId)) {
        newSet.delete(runeId);
        toast.success('Removed from favorites');
      } else {
        newSet.add(runeId);
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
      runes: filteredRunes,
      marketStats,
      portfolio,
      opportunities,
      filters
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runes-data-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  }, [timeRange, runes, marketStats, portfolio, opportunities, filters]);

  // Enhanced filter and search with performance optimization
  const filteredRunes = useMemo(() => {
    let filtered = [...runes];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(rune =>
        rune.name.toLowerCase().includes(query) ||
        rune.symbol.toLowerCase().includes(query) ||
        rune.runeId.includes(query) ||
        rune.spacedName.toLowerCase().includes(query) ||
        rune.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Price filters
    if (filters.priceMin || filters.priceMax) {
      const min = parseFloat(filters.priceMin) || 0;
      const max = parseFloat(filters.priceMax) || Infinity;
      filtered = filtered.filter(rune => 
        rune.market.price >= min && rune.market.price <= max
      );
    }

    // Market cap filters
    if (filters.marketCapMin || filters.marketCapMax) {
      const min = parseFloat(filters.marketCapMin) || 0;
      const max = parseFloat(filters.marketCapMax) || Infinity;
      filtered = filtered.filter(rune => 
        rune.market.marketCap >= min && rune.market.marketCap <= max
      );
    }

    // Boolean filters
    if (filters.verified) {
      filtered = filtered.filter(rune => rune.verified);
    }
    if (filters.turbo) {
      filtered = filtered.filter(rune => rune.turbo);
    }
    if (filters.active) {
      filtered = filtered.filter(rune => rune.isActive);
    }

    // Tag filters
    if (filters.tags.length > 0) {
      filtered = filtered.filter(rune => 
        filters.tags.some(tag => rune.tags.includes(tag))
      );
    }
    
    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'marketCap':
          return b.market.marketCap - a.market.marketCap;
        case 'volume':
          return b.market.volume24h - a.market.volume24h;
        case 'price':
          return b.market.price - a.market.price;
        case 'change':
          return b.market.change24h - a.market.change24h;
        case 'holders':
          return b.market.holders - a.market.holders;
        case 'mints':
          return b.totalMints - a.totalMints;
        case 'recent':
          return b.timestamp.getTime() - a.timestamp.getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [runes, searchQuery, sortBy, filters]);

  // Format functions with better precision
  const formatPrice = (price: number): string => {
    if (price < 0.00001) return price.toExponential(2);
    return price.toFixed(8);
  };

  const formatUSDPrice = (price: number): string => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatAmount = (amount: string, divisibility: number): string => {
    try {
      const num = BigInt(amount);
      const divisor = BigInt(10 ** divisibility);
      const whole = num / divisor;
      const decimal = num % divisor;
      
      if (decimal === 0n) return whole.toString();
      
      const decimalStr = decimal.toString().padStart(divisibility, '0');
      return `${whole}.${decimalStr.replace(/0+$/, '')}`;
    } catch {
      return '0';
    }
  };

  const formatMarketCap = (cap: number): string => {
    if (cap >= 1000000) return `$${(cap / 1000000).toFixed(2)}M`;
    if (cap >= 1000) return `$${(cap / 1000).toFixed(2)}K`;
    return `$${cap.toFixed(2)}`;
  };

  const formatChange = (change: number): string => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'buy': return 'text-green-400';
      case 'hold': return 'text-yellow-400';
      case 'avoid': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const handleMint = async (rune: Rune, amount: string) => {
    if (!connectionState.isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    try {
      setIsLoading(true);
      // Implement minting logic here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      toast.success(`Minting ${amount} ${rune.symbol}...`);
      setShowMintModal(false);
      
      // Refresh data after minting
      loadRunesData();
    } catch (error) {
      toast.error('Minting failed');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMintingProfit = (opportunity: MintingOpportunity): number => {
    return opportunity.estimatedProfit - opportunity.costPerMint;
  };

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Runes Protocol Pro
              </h1>
              <p className="text-gray-400 text-sm">Advanced fungible tokens analytics on Bitcoin</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Enhanced Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search runes, symbols, IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-96"
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
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {connectionState.isConnected && (
                <button
                  onClick={() => setShowMintModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Mint Runes
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Market Stats */}
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Market Cap</span>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{formatMarketCap(marketStats.totalMarketCap)}</p>
              <p className="text-sm text-green-400">+12.5%</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">24h Volume</span>
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{formatMarketCap(marketStats.volume24h)}</p>
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
                <span className="text-gray-400 text-sm">Total Runes</span>
                <Coins className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{marketStats.runesCount}</p>
              <p className="text-sm text-gray-500">
                {marketStats.activeRunes} active • +{marketStats.newRunes24h} today
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Top Gainer</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              {marketStats.topGainer && (
                <>
                  <p className="text-lg font-bold truncate">{marketStats.topGainer.symbol}</p>
                  <p className="text-sm text-green-400">+{marketStats.topGainer.market.change24h.toFixed(1)}%</p>
                </>
              )}
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Top Loser</span>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              {marketStats.topLoser && (
                <>
                  <p className="text-lg font-bold truncate">{marketStats.topLoser.symbol}</p>
                  <p className="text-sm text-red-400">{marketStats.topLoser.market.change24h.toFixed(1)}%</p>
                </>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">Avg Price</span>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{formatPrice(marketStats.avgPrice)} BTC</p>
              <p className="text-sm text-gray-500">
                Median: {formatPrice(marketStats.medianPrice)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-[140px] z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[
                { id: 'market', label: 'Market', icon: BarChart3 },
                { id: 'opportunities', label: 'Opportunities', icon: Target },
                { id: 'portfolio', label: 'Portfolio', icon: Wallet },
                { id: 'mint', label: 'Mint', icon: Zap },
                { id: 'activity', label: 'Activity', icon: Activity },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 CLIQUE NA ABA RUNES:', tab.id);
                    setActiveTab(tab.id as TabView);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer relative z-50 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
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
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="marketCap">Market Cap</option>
                <option value="volume">Volume</option>
                <option value="price">Price</option>
                <option value="change">24h Change</option>
                <option value="holders">Holders</option>
                <option value="mints">Total Mints</option>
                <option value="profit">Profit Potential</option>
                <option value="recent">Recent</option>
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
                      step="0.00000001"
                      placeholder="Min"
                      value={filters.priceMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      step="0.00000001"
                      placeholder="Max"
                      value={filters.priceMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Market Cap ($)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.marketCapMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, marketCapMin: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.marketCapMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, marketCapMax: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Volume Min ($)</label>
                  <input
                    type="number"
                    placeholder="Min volume"
                    value={filters.volumeMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Tags</label>
                  <select 
                    multiple
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm h-[42px] overflow-hidden"
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      setFilters(prev => ({ ...prev, tags: values }));
                    }}
                  >
                    <option value="legendary">Legendary</option>
                    <option value="meme">Meme</option>
                    <option value="utility">Utility</option>
                    <option value="gaming">Gaming</option>
                    <option value="defi">DeFi</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Properties</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.verified}
                        onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-800 text-purple-500"
                      />
                      <span className="text-gray-300">Verified</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.turbo}
                        onChange={(e) => setFilters(prev => ({ ...prev, turbo: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-800 text-purple-500"
                      />
                      <span className="text-gray-300">Turbo</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setFilters({
                      priceMin: '',
                      priceMax: '',
                      marketCapMin: '',
                      marketCapMax: '',
                      volumeMin: '',
                      verified: false,
                      turbo: false,
                      active: false,
                      tags: []
                    })}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={loadRunesData}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
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
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading runes data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Market View */}
            {activeTab === 'market' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">#</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">24h %</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Market Cap</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Volume</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Holders</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Supply Progress</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRunes.map((rune, index) => (
                      <tr 
                        key={rune.id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors group"
                        onClick={() => setSelectedRune(rune)}
                      >
                        <td className="py-4 px-4 text-gray-400">{index + 1}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center relative">
                              <Coins className="w-4 h-4 text-purple-400" />
                              {rune.verified && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                                {rune.spacedName}
                                {rune.turbo && <Zap className="w-3 h-3 text-yellow-400" />}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(rune.id);
                                  }}
                                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                                    favoriteRunes.has(rune.id) ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                                  }`}
                                >
                                  <Heart className="w-3 h-3" />
                                </button>
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-400">{rune.symbol}</p>
                                <div className="flex gap-1">
                                  {rune.tags.slice(0, 2).map(tag => (
                                    <span
                                      key={tag}
                                      className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4">
                          <p className="font-mono text-white">{formatPrice(rune.market.price)} BTC</p>
                          <p className="text-sm text-gray-400">{formatUSDPrice(rune.market.usdPrice)}</p>
                        </td>
                        <td className="text-right py-4 px-4">
                          <p className={`font-medium ${getChangeColor(rune.market.change24h)}`}>
                            {formatChange(rune.market.change24h)}
                          </p>
                          <p className="text-sm text-gray-500">
                            7d: {formatChange(rune.market.change7d)}
                          </p>
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          <p>{formatMarketCap(rune.market.marketCap)}</p>
                          <p className="text-sm text-gray-500">
                            Rank #{rune.number}
                          </p>
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          <p>{formatMarketCap(rune.market.volume24h)}</p>
                          <p className="text-sm text-gray-500">
                            {rune.market.transactions24h} txs
                          </p>
                        </td>
                        <td className="text-right py-4 px-4 text-white">
                          <p>{rune.market.holders.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">
                            {rune.totalMints.toLocaleString()} mints
                          </p>
                        </td>
                        <td className="text-right py-4 px-4">
                          <div className="text-right">
                            <p className="text-white text-sm">
                              {formatAmount(rune.supply.minted, rune.divisibility)}
                            </p>
                            <div className="w-20 h-2 bg-gray-700 rounded-full ml-auto mt-1">
                              <div 
                                className="h-2 bg-purple-500 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (BigInt(rune.supply.minted) * 100n) / BigInt(rune.supply.total))}%` 
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {((BigInt(rune.supply.minted) * 100n) / BigInt(rune.supply.total)).toString()}% minted
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRune(rune);
                                setShowMintModal(true);
                              }}
                              className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors"
                              title="Mint"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(rune.runeId, 'Rune ID');
                              }}
                              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                              title="Copy ID"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://mempool.space/tx/${rune.etching.tx}`, '_blank');
                              }}
                              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                              title="View on Mempool"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Opportunities View */}
            {activeTab === 'opportunities' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    Minting Opportunities
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Discover profitable minting opportunities based on current market conditions
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {opportunities.map(opportunity => (
                      <motion.div
                        key={opportunity.rune.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                              <Coins className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{opportunity.rune.symbol}</h4>
                              <p className="text-xs text-gray-400">{opportunity.rune.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${getDifficultyColor(opportunity.difficulty)}`}>
                              {opportunity.difficulty.toUpperCase()}
                            </p>
                            <p className={`text-xs ${getRecommendationColor(opportunity.recommendation)}`}>
                              {opportunity.recommendation.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Cost per Mint</p>
                              <p className="text-white font-medium">{formatPrice(opportunity.costPerMint)} BTC</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Est. Profit</p>
                              <p className="text-green-400 font-medium">
                                +{formatPrice(calculateMintingProfit(opportunity))} BTC
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Remaining</p>
                              <p className="text-white">{opportunity.remainingMints.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Time Left</p>
                              <p className="text-yellow-400">{formatTimeRemaining(opportunity.timeRemaining)}</p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-400">Profit Margin</span>
                              <span className={`text-sm font-medium ${
                                opportunity.profitMargin > 50 ? 'text-green-400' :
                                opportunity.profitMargin > 25 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {opportunity.profitMargin}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  opportunity.profitMargin > 50 ? 'bg-green-500' :
                                  opportunity.profitMargin > 25 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, opportunity.profitMargin)}%` }}
                              />
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setSelectedRune(opportunity.rune);
                              setShowMintModal(true);
                            }}
                            disabled={!connectionState.isConnected}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            {connectionState.isConnected ? 'Start Minting' : 'Connect Wallet'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio View */}
            {activeTab === 'portfolio' && (
              <div>
                {!connectionState.isConnected ? (
                  <div className="text-center py-24">
                    <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-500 mb-4">Connect your wallet to view your Runes portfolio</p>
                    <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium">
                      Connect Wallet
                    </button>
                  </div>
                ) : portfolio.length === 0 ? (
                  <div className="text-center py-24">
                    <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Runes Found</h3>
                    <p className="text-gray-500 mb-4">You don't have any Runes in your wallet yet</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🔥 CLIQUE MARKET RUNES');
                          setActiveTab('market');
                        }}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium relative z-50"
                        style={{ position: 'relative', zIndex: 50 }}
                      >
                        Explore Runes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🔥 CLIQUE OPPORTUNITIES RUNES');
                          setActiveTab('opportunities');
                        }}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium relative z-50"
                        style={{ position: 'relative', zIndex: 50 }}
                      >
                        Find Opportunities
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Portfolio Summary */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Portfolio Summary</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">Total Value</p>
                          <p className="text-2xl font-bold text-white">
                            {formatPrice(portfolio.reduce((sum, item) => sum + item.value, 0))} BTC
                          </p>
                          <p className="text-gray-500 text-sm">
                            {formatUSDPrice(portfolio.reduce((sum, item) => sum + item.usdValue, 0))}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">Holdings</p>
                          <p className="text-2xl font-bold text-white">{portfolio.length}</p>
                          <p className="text-gray-500 text-sm">Different Runes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">Top Holding</p>
                          <p className="text-lg font-bold text-white">
                            {portfolio[0]?.rune.symbol || 'N/A'}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {portfolio[0]?.percentage.toFixed(1)}% of portfolio
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">24h Change</p>
                          <p className="text-lg font-bold text-green-400">+$1,234</p>
                          <p className="text-gray-500 text-sm">+5.2%</p>
                        </div>
                      </div>
                    </div>

                    {/* Holdings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {portfolio.map(balance => (
                        <motion.div
                          key={balance.rune.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                                <Coins className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{balance.rune.symbol}</h4>
                                <p className="text-sm text-gray-400">{balance.rune.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {balance.rune.turbo && <Zap className="w-4 h-4 text-yellow-400" />}
                              {balance.rune.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-400">Balance</p>
                              <p className="text-xl font-bold text-white">
                                {formatAmount(balance.amount, balance.rune.divisibility)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {balance.percentage.toFixed(2)}% of portfolio
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm text-gray-400">BTC Value</p>
                                <p className="text-lg font-semibold text-white">
                                  {formatPrice(balance.value)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">USD Value</p>
                                <p className="text-lg font-semibold text-white">
                                  {formatUSDPrice(balance.usdValue)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg font-medium transition-colors">
                                Send
                              </button>
                              <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors">
                                Trade
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {filteredRunes.length === 0 && activeTab === 'market' && (
              <div className="text-center py-24">
                <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No runes found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search query</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({
                      priceMin: '',
                      priceMax: '',
                      marketCapMin: '',
                      marketCapMax: '',
                      volumeMin: '',
                      verified: false,
                      turbo: false,
                      active: false,
                      tags: []
                    });
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Rune Detail Modal */}
      <AnimatePresence>
        {selectedRune && !showMintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedRune(null)}
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
                    <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <Coins className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-white">{selectedRune.spacedName}</h2>
                        {selectedRune.verified && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {selectedRune.turbo && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Turbo
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">Symbol: {selectedRune.symbol} • ID: {selectedRune.runeId}</p>
                      {selectedRune.description && (
                        <p className="text-gray-500 mt-1">{selectedRune.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRune(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Market Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Market Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Current Price</p>
                      <p className="text-xl font-bold text-white">{formatPrice(selectedRune.market.price)} BTC</p>
                      <p className="text-sm text-gray-500">{formatUSDPrice(selectedRune.market.usdPrice)}</p>
                      <p className={`text-sm mt-1 ${getChangeColor(selectedRune.market.change24h)}`}>
                        {formatChange(selectedRune.market.change24h)} (24h)
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Market Cap</p>
                      <p className="text-xl font-bold text-white">{formatMarketCap(selectedRune.market.marketCap)}</p>
                      <p className="text-sm text-gray-500 mt-1">Rank #{selectedRune.number}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">24h Volume</p>
                      <p className="text-xl font-bold text-white">{formatMarketCap(selectedRune.market.volume24h)}</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedRune.market.transactions24h} txs</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Holders</p>
                      <p className="text-xl font-bold text-white">{selectedRune.market.holders.toLocaleString()}</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedRune.totalMints.toLocaleString()} total mints</p>
                    </div>
                  </div>
                </div>

                {/* Supply Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Supply Information</h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Supply</span>
                          <span className="text-white font-mono">{formatAmount(selectedRune.supply.total, selectedRune.divisibility)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Minted</span>
                          <span className="text-white font-mono">{formatAmount(selectedRune.supply.minted, selectedRune.divisibility)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Remaining</span>
                          <span className="text-green-400 font-mono">{formatAmount(selectedRune.supply.remaining, selectedRune.divisibility)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Circulating</span>
                          <span className="text-white font-mono">{formatAmount(selectedRune.supply.circulating, selectedRune.divisibility)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Burned</span>
                          <span className="text-red-400 font-mono">{formatAmount(selectedRune.supply.burned, selectedRune.divisibility)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Premine</span>
                          <span className="text-yellow-400 font-mono">{formatAmount(selectedRune.supply.premine, selectedRune.divisibility)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Minting Progress</span>
                        <span>{((BigInt(selectedRune.supply.minted) * 100n) / BigInt(selectedRune.supply.total)).toString()}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(BigInt(selectedRune.supply.minted) * 100n) / BigInt(selectedRune.supply.total)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mint Terms */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Mint Terms</h3>
                  <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Amount per Mint</p>
                      <p className="text-white font-mono">{formatAmount(selectedRune.terms.amount, selectedRune.divisibility)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Mint Cap</p>
                      <p className="text-white font-mono">{selectedRune.terms.cap}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Start Block</p>
                      <p className="text-white">{selectedRune.terms.heightStart.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">End Block</p>
                      <p className="text-white">{selectedRune.terms.heightEnd.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {(selectedRune.website || selectedRune.social) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Links</h3>
                    <div className="flex items-center gap-3">
                      {selectedRune.website && (
                        <a
                          href={selectedRune.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Website
                        </a>
                      )}
                      {selectedRune.social?.twitter && (
                        <a
                          href={`https://twitter.com/${selectedRune.social.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm"
                        >
                          Twitter
                        </a>
                      )}
                      {selectedRune.social?.discord && (
                        <a
                          href={selectedRune.social.discord}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm"
                        >
                          Discord
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowMintModal(true);
                    }}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Mint {selectedRune.symbol}
                  </button>
                  <button
                    onClick={() => toggleFavorite(selectedRune.id)}
                    className={`px-4 py-3 rounded-lg transition-colors ${
                      favoriteRunes.has(selectedRune.id)
                        ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedRune.runeId, 'Rune ID')}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => window.open(`https://mempool.space/tx/${selectedRune.etching.tx}`, '_blank')}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Mint Modal */}
      <AnimatePresence>
        {showMintModal && selectedRune && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowMintModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  Mint {selectedRune.symbol}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Amount to Mint</label>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">
                        {formatAmount(selectedRune.terms.amount, selectedRune.divisibility)} {selectedRune.symbol}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Per mint transaction</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-sm text-gray-400">Estimated Cost</p>
                      <p className="text-lg font-bold text-white">0.0001 BTC</p>
                      <p className="text-xs text-gray-500">~$9.85</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-sm text-gray-400">Remaining</p>
                      <p className="text-lg font-bold text-white">
                        {formatAmount(selectedRune.supply.remaining, selectedRune.divisibility)}
                      </p>
                      <p className="text-xs text-gray-500">Available to mint</p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-200 font-medium">Minting Information</p>
                        <ul className="text-xs text-yellow-200/70 mt-1 space-y-1">
                          <li>• Requires Bitcoin transaction fee (~$15-30)</li>
                          <li>• Success not guaranteed (first-come, first-served)</li>
                          <li>• Check mempool congestion before minting</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleMint(selectedRune, selectedRune.terms.amount)}
                      className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center justify-center gap-2"
                      disabled={!connectionState.isConnected || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                      {connectionState.isConnected ? 'Mint Now' : 'Connect Wallet'}
                    </button>
                    <button
                      onClick={() => setShowMintModal(false)}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
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