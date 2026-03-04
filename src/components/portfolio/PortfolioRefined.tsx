'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Eye,
  EyeOff,
  Download,
  Upload,
  Share2,
  Settings,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Gem,
  Zap,
  Target,
  Award,
  Shield,
  Minus as TrendingFlat,
  Calculator,
  BookOpen,
  FileText,
  ExternalLink,
  Copy,
  Heart,
  Star,
  Bookmark,
  Bell,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { format, subDays, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

// Enhanced interfaces for comprehensive portfolio management
interface PortfolioAsset {
  id: string;
  type: 'bitcoin' | 'ordinals' | 'runes' | 'brc20' | 'other';
  name: string;
  symbol: string;
  amount: string;
  amountFormatted: string;
  currentPrice: number;
  usdPrice: number;
  value: number;
  usdValue: number;
  percentage: number;
  change24h: number;
  change7d: number;
  change30d: number;
  lastUpdated: Date;
  metadata?: {
    inscriptionNumber?: number;
    inscriptionId?: string;
    collection?: string;
    rarity?: string;
    runeId?: string;
    divisibility?: number;
    verified?: boolean;
    turbo?: boolean;
  };
  performance: {
    costBasis: number;
    realizedPnL: number;
    unrealizedPnL: number;
    totalReturn: number;
    holdingPeriod: number;
  };
  transactions: Transaction[];
  alerts: AssetAlert[];
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'mint' | 'transfer_in' | 'transfer_out' | 'fee';
  assetId: string;
  amount: string;
  price: number;
  usdPrice: number;
  total: number;
  usdTotal: number;
  fee: number;
  timestamp: Date;
  txHash: string;
  from?: string;
  to?: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmations: number;
  blockHeight: number;
  notes?: string;
}

interface AssetAlert {
  id: string;
  assetId: string;
  type: 'price_above' | 'price_below' | 'change_percent' | 'volume_spike';
  condition: number;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: Date;
  message: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalUsdValue: number;
  change24h: number;
  change7d: number;
  change30d: number;
  allTimeHigh: number;
  allTimeLow: number;
  totalAssets: number;
  bestPerformer: PortfolioAsset | null;
  worstPerformer: PortfolioAsset | null;
  diversity: {
    bitcoin: number;
    ordinals: number;
    runes: number;
    brc20: number;
    other: number;
  };
  performance: {
    totalInvested: number;
    totalRealized: number;
    totalUnrealized: number;
    totalReturn: number;
    averageHoldingPeriod: number;
    winRate: number;
  };
}

interface PortfolioAnalytics {
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
    var95: number; // Value at Risk
  };
  concentration: {
    top1: number;
    top3: number;
    top5: number;
    herfindahlIndex: number;
  };
  correlations: Array<{
    asset1: string;
    asset2: string;
    correlation: number;
  }>;
  rebalancing: {
    recommended: boolean;
    suggestions: Array<{
      action: 'buy' | 'sell';
      asset: string;
      amount: number;
      reason: string;
    }>;
  };
}

type ViewMode = 'overview' | 'assets' | 'transactions' | 'analytics' | 'performance';
type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
type SortBy = 'value' | 'change' | 'performance' | 'name' | 'type';

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#333',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: false
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#9CA3AF'
      }
    },
    y: {
      grid: {
        color: 'rgba(75, 85, 99, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: '#9CA3AF',
        callback: function(value: any) {
          return `$${value.toLocaleString()}`;
        }
      }
    }
  }
};

export function PortfolioRefined() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [sortBy, setSortBy] = useState<SortBy>('value');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  
  // Portfolio data
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>({
    totalValue: 2.45678,
    totalUsdValue: 241890.45,
    change24h: 5.67,
    change7d: -2.34,
    change30d: 23.45,
    allTimeHigh: 289456.78,
    allTimeLow: 156789.23,
    totalAssets: 15,
    bestPerformer: null,
    worstPerformer: null,
    diversity: {
      bitcoin: 0.65,
      ordinals: 0.20,
      runes: 0.10,
      brc20: 0.03,
      other: 0.02
    },
    performance: {
      totalInvested: 198456.78,
      totalRealized: 12345.67,
      totalUnrealized: 29087.00,
      totalReturn: 21.89,
      averageHoldingPeriod: 156,
      winRate: 0.73
    }
  });

  const [assets, setAssets] = useState<PortfolioAsset[]>([
    {
      id: '1',
      type: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      amount: '2.15678945',
      amountFormatted: '2.156789',
      currentPrice: 1.0,
      usdPrice: 98500,
      value: 2.15678945,
      usdValue: 212543.67,
      percentage: 87.85,
      change24h: 2.34,
      change7d: -1.56,
      change30d: 15.67,
      lastUpdated: new Date(),
      performance: {
        costBasis: 185000,
        realizedPnL: 5670.45,
        unrealizedPnL: 22873.22,
        totalReturn: 15.37,
        holdingPeriod: 234
      },
      transactions: [],
      alerts: []
    },
    {
      id: '2',
      type: 'ordinals',
      name: 'Bitcoin Punks #1234',
      symbol: 'ORDINALS',
      amount: '1',
      amountFormatted: '1',
      currentPrice: 0.000256,
      usdPrice: 25.25,
      value: 0.000256,
      usdValue: 25.25,
      percentage: 0.01,
      change24h: 12.45,
      change7d: -5.67,
      change30d: 156.78,
      lastUpdated: new Date(),
      metadata: {
        inscriptionNumber: 1234,
        inscriptionId: 'abc123def456...',
        collection: 'Bitcoin Punks',
        rarity: 'Rare',
        verified: true
      },
      performance: {
        costBasis: 20.00,
        realizedPnL: 0,
        unrealizedPnL: 5.25,
        totalReturn: 26.25,
        holdingPeriod: 67
      },
      transactions: [],
      alerts: []
    },
    {
      id: '3',
      type: 'runes',
      name: 'SATOSHI•NAKAMOTO',
      symbol: 'SATOSHI',
      amount: '1000000000000',
      amountFormatted: '10,000.00000000',
      currentPrice: 0.00000085,
      usdPrice: 0.083,
      value: 0.00085,
      usdValue: 83.75,
      percentage: 0.035,
      change24h: 15.7,
      change7d: -3.2,
      change30d: 78.9,
      lastUpdated: new Date(),
      metadata: {
        runeId: '2:1',
        divisibility: 8,
        verified: true,
        turbo: true
      },
      performance: {
        costBasis: 50.00,
        realizedPnL: 12.50,
        unrealizedPnL: 21.25,
        totalReturn: 67.5,
        holdingPeriod: 45
      },
      transactions: [],
      alerts: []
    }
  ]);

  const [portfolioChart, setPortfolioChart] = useState<{
    labels: string[];
    datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; fill: boolean; tension: number; }[];
  }>({
    labels: [],
    datasets: []
  });

  const [analytics, setAnalytics] = useState<PortfolioAnalytics>({
    riskMetrics: {
      volatility: 0.65,
      sharpeRatio: 1.23,
      maxDrawdown: -0.28,
      beta: 1.15,
      var95: -0.08
    },
    concentration: {
      top1: 0.8785,
      top3: 0.9886,
      top5: 0.9965,
      herfindahlIndex: 0.7856
    },
    correlations: [
      { asset1: 'BTC', asset2: 'ORDINALS', correlation: 0.45 },
      { asset1: 'BTC', asset2: 'RUNES', correlation: 0.67 },
      { asset1: 'ORDINALS', asset2: 'RUNES', correlation: 0.23 }
    ],
    rebalancing: {
      recommended: true,
      suggestions: [
        {
          action: 'sell',
          asset: 'BTC',
          amount: 0.05,
          reason: 'Over-concentrated position'
        },
        {
          action: 'buy',
          asset: 'ORDINALS',
          amount: 2000,
          reason: 'Diversification opportunity'
        }
      ]
    }
  });

  // Filters
  const [filters, setFilters] = useState({
    types: [] as string[],
    valueMin: '',
    valueMax: '',
    changeMin: '',
    changeMax: '',
    showZeroBalance: true
  });

  // Refs
  const abortControllerRef = useRef<AbortController>();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load portfolio data
  useEffect(() => {
    loadPortfolioData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadPortfolioData, 30000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [timeRange, autoRefresh]);

  // Cleanup
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

  // Load portfolio data
  const loadPortfolioData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      // Generate mock portfolio chart data
      const dataPoints = getDataPointsForTimeRange(timeRange);
      const now = Date.now();
      
      const labels = dataPoints.map(i => {
        const date = new Date(now - i * getTimeInterval(timeRange));
        return format(date, timeRange === '24h' ? 'HH:mm' : 'MMM dd');
      }).reverse();

      const portfolioValues = dataPoints.map(() =>
        portfolioSummary.totalUsdValue
      ).reverse();

      setPortfolioChart({
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data: portfolioValues,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      });
      
      // Update best/worst performers
      const sortedByChange = [...assets].sort((a, b) => b.change24h - a.change24h);
      setPortfolioSummary(prev => ({
        ...prev,
        bestPerformer: sortedByChange[0] || null,
        worstPerformer: sortedByChange[sortedByChange.length - 1] || null
      }));
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load portfolio:', error);
        toast.error('Failed to load portfolio data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, portfolioSummary.totalUsdValue, assets]);

  // Utility functions
  const getDataPointsForTimeRange = (range: TimeRange): number[] => {
    switch (range) {
      case '24h': return Array.from({ length: 24 }, (_, i) => i);
      case '7d': return Array.from({ length: 7 }, (_, i) => i);
      case '30d': return Array.from({ length: 30 }, (_, i) => i);
      case '90d': return Array.from({ length: 30 }, (_, i) => i * 3);
      case '1y': return Array.from({ length: 52 }, (_, i) => i * 7);
      default: return Array.from({ length: 30 }, (_, i) => i);
    }
  };

  const getTimeInterval = (range: TimeRange): number => {
    switch (range) {
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      case '90d': return 3 * 24 * 60 * 60 * 1000; // 3 days
      case '1y': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 24 * 60 * 60 * 1000;
    }
  };

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = [...assets];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query) ||
        (asset.metadata?.collection && asset.metadata.collection.toLowerCase().includes(query))
      );
    }
    
    // Type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter(asset => filters.types.includes(asset.type));
    }
    
    // Value filter
    if (filters.valueMin || filters.valueMax) {
      const min = parseFloat(filters.valueMin) || 0;
      const max = parseFloat(filters.valueMax) || Infinity;
      filtered = filtered.filter(asset => 
        asset.usdValue >= min && asset.usdValue <= max
      );
    }
    
    // Change filter
    if (filters.changeMin || filters.changeMax) {
      const min = parseFloat(filters.changeMin) || -Infinity;
      const max = parseFloat(filters.changeMax) || Infinity;
      filtered = filtered.filter(asset => 
        asset.change24h >= min && asset.change24h <= max
      );
    }
    
    // Zero balance filter
    if (!filters.showZeroBalance) {
      filtered = filtered.filter(asset => parseFloat(asset.amount) > 0);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.usdValue - a.usdValue;
        case 'change':
          return b.change24h - a.change24h;
        case 'performance':
          return b.performance.totalReturn - a.performance.totalReturn;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [assets, searchQuery, sortBy, filters]);

  // Format functions
  const formatValue = (value: number): string => {
    return showValues ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '****';
  };

  const formatBTC = (value: number): string => {
    return showValues ? `${value.toFixed(8)} BTC` : '****';
  };

  const formatChange = (change: number): string => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'bitcoin': return DollarSign;
      case 'ordinals': return Gem;
      case 'runes': return Zap;
      case 'brc20': return Coins;
      default: return Coins;
    }
  };

  const exportPortfolio = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      summary: portfolioSummary,
      assets: assets,
      analytics: analytics,
      performance: portfolioChart.datasets[0]?.data || []
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Portfolio exported successfully');
  }, [portfolioSummary, assets, analytics, portfolioChart]);

  const copyToClipboard = useCallback((text: string, label: string = 'Text') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
                Portfolio Manager
              </h1>
              <p className="text-gray-400 mt-1">Professional Bitcoin asset management</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Time Range */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-green-500"
              >
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="1y">1 Year</option>
                <option value="all">All Time</option>
              </select>
              
              {/* Privacy Toggle */}
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-2 rounded-lg border transition-colors ${
                  showValues 
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white' 
                    : 'bg-blue-600/20 border-blue-500 text-blue-400'
                }`}
                title={showValues ? 'Hide Values' : 'Show Values'}
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              
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
                <RefreshCw className={`w-5 h-5 ${autoRefresh && isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Export */}
              <button
                onClick={exportPortfolio}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                title="Export portfolio"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-green-600/20 border-green-500 text-green-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Portfolio Value</span>
              <Wallet className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatValue(portfolioSummary.totalUsdValue)}
            </p>
            <p className="text-lg text-gray-300">
              {formatBTC(portfolioSummary.totalValue)}
            </p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${getChangeColor(portfolioSummary.change24h)}`}>
              {portfolioSummary.change24h >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{formatChange(portfolioSummary.change24h)} (24h)</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Return</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {formatChange(portfolioSummary.performance.totalReturn)}
            </p>
            <p className="text-sm text-gray-300">
              {formatValue(portfolioSummary.performance.totalUnrealized)} unrealized
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>Win Rate: {(portfolioSummary.performance.winRate * 100).toFixed(0)}%</span>
              <span>Avg Hold: {portfolioSummary.performance.averageHoldingPeriod}d</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Best Performer</span>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            {portfolioSummary.bestPerformer && (
              <>
                <p className="text-lg font-bold text-white mb-1">
                  {portfolioSummary.bestPerformer.symbol}
                </p>
                <p className="text-sm text-gray-300">
                  {portfolioSummary.bestPerformer.name}
                </p>
                <div className={`flex items-center gap-1 mt-2 text-sm ${getChangeColor(portfolioSummary.bestPerformer.change24h)}`}>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{formatChange(portfolioSummary.bestPerformer.change24h)} (24h)</span>
                </div>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Diversity Score</span>
              <PieChart className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {(1 - analytics.concentration.herfindahlIndex).toFixed(2)}
            </p>
            <p className="text-sm text-gray-300">
              {portfolioSummary.totalAssets} different assets
            </p>
            <div className="text-xs text-gray-500 mt-2">
              Top asset: {(analytics.concentration.top1 * 100).toFixed(1)}%
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'assets', label: 'Assets', icon: Coins },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'performance', label: 'Performance', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  viewMode === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border border-gray-800 bg-gray-800/50 rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Asset Type</label>
                    <select 
                      multiple
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm h-[42px] overflow-hidden"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setFilters(prev => ({ ...prev, types: values }));
                      }}
                    >
                      <option value="bitcoin">Bitcoin</option>
                      <option value="ordinals">Ordinals</option>
                      <option value="runes">Runes</option>
                      <option value="brc20">BRC-20</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Value Range ($)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.valueMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, valueMin: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.valueMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, valueMax: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">24h Change (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.changeMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, changeMin: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.changeMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, changeMax: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    >
                      <option value="value">Value</option>
                      <option value="change">24h Change</option>
                      <option value="performance">Total Return</option>
                      <option value="name">Name</option>
                      <option value="type">Type</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={filters.showZeroBalance}
                          onChange={(e) => setFilters(prev => ({ ...prev, showZeroBalance: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-800 text-green-500"
                        />
                        <span className="text-gray-300">Show zero balance</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setFilters({
                        types: [],
                        valueMin: '',
                        valueMax: '',
                        changeMin: '',
                        changeMax: '',
                        showZeroBalance: true
                      })}
                      className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Chart */}
            <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {format(new Date(), 'HH:mm:ss')}</span>
                </div>
              </div>
              
              <div className="h-80">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
                  </div>
                ) : portfolioChart.datasets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={portfolioChart.labels.map((label: string, i: number) => ({
                      name: label,
                      value: portfolioChart.datasets[0]?.data[i] ?? 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', color: '#fff' }} />
                      <RechartsLine type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Asset Allocation */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Asset Allocation</h2>
              
              <div className="h-64 mb-4 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      const segments = [
                        { pct: portfolioSummary.diversity.bitcoin * 100, color: '#F59E0B' },
                        { pct: portfolioSummary.diversity.ordinals * 100, color: '#8B5CF6' },
                        { pct: portfolioSummary.diversity.runes * 100, color: '#10B981' },
                        { pct: portfolioSummary.diversity.brc20 * 100, color: '#3B82F6' },
                        { pct: portfolioSummary.diversity.other * 100, color: '#6B7280' },
                      ];
                      let offset = 0;
                      return segments.filter(s => s.pct > 0).map((seg, i) => {
                        const circumference = 2 * Math.PI * 40;
                        const dash = (seg.pct / 100) * circumference;
                        const gap = circumference - dash;
                        const el = (
                          <circle
                            key={i}
                            cx="50" cy="50" r="40"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="20"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += dash;
                        return el;
                      });
                    })()}
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Bitcoin', percentage: portfolioSummary.diversity.bitcoin, color: 'bg-yellow-500' },
                  { name: 'Ordinals', percentage: portfolioSummary.diversity.ordinals, color: 'bg-purple-500' },
                  { name: 'Runes', percentage: portfolioSummary.diversity.runes, color: 'bg-green-500' },
                  { name: 'BRC-20', percentage: portfolioSummary.diversity.brc20, color: 'bg-blue-500' },
                  { name: 'Other', percentage: portfolioSummary.diversity.other, color: 'bg-gray-500' }
                ].map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {(item.percentage * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets View */}
        {viewMode === 'assets' && (
          <div className="space-y-4">
            {filteredAssets.map(asset => {
              const Icon = getAssetIcon(asset.type);
              const isExpanded = expandedAsset === asset.id;
              
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          asset.type === 'bitcoin' ? 'bg-yellow-500/20 text-yellow-500' :
                          asset.type === 'ordinals' ? 'bg-purple-500/20 text-purple-500' :
                          asset.type === 'runes' ? 'bg-green-500/20 text-green-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{asset.name}</h3>
                            {asset.metadata?.verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                            {asset.metadata?.turbo && (
                              <Zap className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {asset.amountFormatted} {asset.symbol}
                          </p>
                          {asset.metadata?.collection && (
                            <p className="text-xs text-gray-500">{asset.metadata.collection}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatValue(asset.usdValue)}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatBTC(asset.value)}
                        </p>
                        <div className={`text-sm ${getChangeColor(asset.change24h)}`}>
                          {formatChange(asset.change24h)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-700 bg-gray-900/50"
                      >
                        <div className="p-6 space-y-4">
                          {/* Performance Metrics */}
                          <div>
                            <h4 className="text-sm font-medium text-white mb-3">Performance</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Cost Basis</p>
                                <p className="text-sm font-medium text-white">
                                  {formatValue(asset.performance.costBasis)}
                                </p>
                              </div>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Unrealized P&L</p>
                                <p className={`text-sm font-medium ${
                                  asset.performance.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatValue(asset.performance.unrealizedPnL)}
                                </p>
                              </div>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Total Return</p>
                                <p className={`text-sm font-medium ${
                                  asset.performance.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatChange(asset.performance.totalReturn)}
                                </p>
                              </div>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Holding Period</p>
                                <p className="text-sm font-medium text-white">
                                  {asset.performance.holdingPeriod} days
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Asset Metadata */}
                          {asset.metadata && (
                            <div>
                              <h4 className="text-sm font-medium text-white mb-3">Details</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {asset.metadata.inscriptionNumber && (
                                  <div>
                                    <span className="text-gray-400">Inscription #</span>
                                    <span className="text-white ml-2">
                                      {asset.metadata.inscriptionNumber.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {asset.metadata.runeId && (
                                  <div>
                                    <span className="text-gray-400">Rune ID</span>
                                    <span className="text-white ml-2">{asset.metadata.runeId}</span>
                                  </div>
                                )}
                                {asset.metadata.rarity && (
                                  <div>
                                    <span className="text-gray-400">Rarity</span>
                                    <span className="text-white ml-2">{asset.metadata.rarity}</span>
                                  </div>
                                )}
                                {asset.metadata.divisibility !== undefined && (
                                  <div>
                                    <span className="text-gray-400">Divisibility</span>
                                    <span className="text-white ml-2">{asset.metadata.divisibility}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">
                              Send
                            </button>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                              Trade
                            </button>
                            <button
                              onClick={() => copyToClipboard(asset.id, 'Asset ID')}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              Copy ID
                            </button>
                            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {filteredAssets.length === 0 && (
              <div className="text-center py-12">
                <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No assets found</h3>
                <p className="text-gray-500">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Metrics */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Risk Analysis
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Volatility</p>
                    <p className="text-2xl font-bold text-white">
                      {(analytics.riskMetrics.volatility * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Annualized</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-white">
                      {analytics.riskMetrics.sharpeRatio.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Risk-adjusted return</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Max Drawdown</p>
                    <p className="text-2xl font-bold text-red-400">
                      {(analytics.riskMetrics.maxDrawdown * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Worst decline</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">VaR (95%)</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {(analytics.riskMetrics.var95 * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">1-day potential loss</p>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Portfolio Beta</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.riskMetrics.beta?.toFixed(2) ?? 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">Correlation to Bitcoin</p>
                </div>
              </div>
            </div>

            {/* Concentration Analysis */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Concentration Analysis
              </h2>
              
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Top 1 Asset</span>
                    <span className="text-white font-bold">
                      {(analytics.concentration.top1 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${analytics.concentration.top1 * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Top 3 Assets</span>
                    <span className="text-white font-bold">
                      {(analytics.concentration.top3 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${analytics.concentration.top3 * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Top 5 Assets</span>
                    <span className="text-white font-bold">
                      {(analytics.concentration.top5 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${analytics.concentration.top5 * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Herfindahl Index</span>
                    <span className="text-white font-bold">
                      {analytics.concentration.herfindahlIndex.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.concentration.herfindahlIndex > 0.25 ? 'Highly concentrated' :
                     analytics.concentration.herfindahlIndex > 0.15 ? 'Moderately concentrated' :
                     'Well diversified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rebalancing Suggestions */}
            {analytics.rebalancing.recommended && (
              <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-500" />
                  Rebalancing Suggestions
                </h2>
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-200 font-medium">Portfolio Rebalancing Recommended</p>
                      <p className="text-yellow-200/70 text-sm mt-1">
                        Your portfolio shows signs of concentration that could benefit from rebalancing.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {analytics.rebalancing.suggestions.map((suggestion, index) => (
                    <div key={index} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          suggestion.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {suggestion.action === 'buy' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {suggestion.action.toUpperCase()} {suggestion.asset}
                          </p>
                          <p className="text-gray-400 text-sm">{suggestion.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-mono">
                          {suggestion.amount.toFixed(8)} BTC
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}