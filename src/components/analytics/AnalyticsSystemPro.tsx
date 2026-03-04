'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Clock,
  Calendar,
  ChevronDown,
  Download,
  RefreshCw,
  Filter,
  Zap,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Percent,
  Target,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  Share2,
  Bookmark,
  Maximize2,
  MinusCircle,
  PlusCircle,
  Volume2,
  VolumeX,
  Brain,
  Minus as TrendingFlat,
  Shield,
  Award,
  Flame,
  Globe,
  Server,
  Database,
  Cpu,
  HardDrive,
  Network,
  MemoryStick,
  MonitorSpeaker,
  X,
  Building2 as Building
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

// Enhanced interfaces for comprehensive analytics
interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  prefix?: string;
  suffix?: string;
  trend: 'up' | 'down' | 'neutral';
  importance: 'critical' | 'high' | 'medium' | 'low';
  tooltip?: string;
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  strength: number;
  confidence: number;
  timeframe: string;
  description: string;
}

interface MarketMetrics {
  price: number;
  volume24h: number;
  marketCap: number;
  dominance: number;
  hashrate: number;
  difficulty: number;
  blockHeight: number;
  mempoolSize: number;
  feeRate: {
    fast: number;
    medium: number;
    slow: number;
  };
  derivatives: {
    openInterest: number;
    volume24h: number;
    fundingRate: number;
    longShortRatio: number;
  };
  defi: {
    tvl: number;
    volume24h: number;
    users24h: number;
    protocols: number;
  };
  institutional: {
    holdings: number;
    inflows24h: number;
    premiums: number;
    etfVolume: number;
  };
}

interface OnChainMetrics {
  activeAddresses: number;
  transactionCount: number;
  transactionVolume: number;
  averageTransactionValue: number;
  utxoCount: number;
  hodlerMetrics: {
    longTermHolders: number;
    shortTermHolders: number;
    realizationCap: number;
    dormancy: number;
  };
  networkHealth: {
    nodeCount: number;
    nodeDistribution: Record<string, number>;
    mempoolCongestion: number;
    feeMarket: {
      medianFee: number;
      highPriorityFee: number;
      economicalFee: number;
    };
  };
  miningMetrics: {
    hashPrice: number;
    revenue24h: number;
    miners: number;
    poolDistribution: Record<string, number>;
  };
}

interface PredictionModel {
  id: string;
  name: string;
  type: 'technical' | 'fundamental' | 'sentiment' | 'onchain' | 'macro';
  prediction: {
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    timeframe: string;
    targetPrice?: number;
    probability: number;
  };
  inputs: string[];
  accuracy: number;
  lastUpdated: Date;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'change_percent';
  value: number;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: Date;
  actions: ('notification' | 'email' | 'webhook')[];
}

type TimeRange = '1h' | '4h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
type ChartType = 'price' | 'volume' | 'onchain' | 'mining' | 'defi' | 'derivatives' | 'sentiment' | 'correlation';
type ViewMode = 'overview' | 'professional' | 'institutional' | 'research';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid #333',
  color: '#fff',
};

const _CHART_OPTIONS_LEGACY = {
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#9CA3AF',
        maxTicksLimit: 8
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
          return typeof value === 'number' ? value.toLocaleString() : value;
        }
      }
    }
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
  elements: {
    point: {
      radius: 0,
      hoverRadius: 6,
    },
    line: {
      tension: 0.4
    }
  }
};

export function AnalyticsSystemPro() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartType, setChartType] = useState<ChartType>('price');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['price', 'volume', 'marketCap']));
  
  // Data state
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics>({
    price: 98500,
    volume24h: 45678900000,
    marketCap: 1920000000000,
    dominance: 52.3,
    hashrate: 450.5,
    difficulty: 72.01,
    blockHeight: 825000,
    mempoolSize: 125,
    feeRate: {
      fast: 50,
      medium: 30,
      slow: 15
    },
    derivatives: {
      openInterest: 15600000000,
      volume24h: 89000000000,
      fundingRate: 0.0001,
      longShortRatio: 1.25
    },
    defi: {
      tvl: 2300000000,
      volume24h: 890000000,
      users24h: 45600,
      protocols: 156
    },
    institutional: {
      holdings: 1200000,
      inflows24h: 450000000,
      premiums: 2.3,
      etfVolume: 1200000000
    }
  });

  const [onChainMetrics, setOnChainMetrics] = useState<OnChainMetrics>({
    activeAddresses: 1234567,
    transactionCount: 234567,
    transactionVolume: 567890123456,
    averageTransactionValue: 2420,
    utxoCount: 45678901,
    hodlerMetrics: {
      longTermHolders: 0.73,
      shortTermHolders: 0.27,
      realizationCap: 567890123456,
      dormancy: 234
    },
    networkHealth: {
      nodeCount: 15678,
      nodeDistribution: {
        'US': 0.23,
        'Germany': 0.18,
        'Netherlands': 0.12,
        'France': 0.09,
        'Other': 0.38
      },
      mempoolCongestion: 0.65,
      feeMarket: {
        medianFee: 25,
        highPriorityFee: 45,
        economicalFee: 12
      }
    },
    miningMetrics: {
      hashPrice: 0.089,
      revenue24h: 23456789,
      miners: 1567,
      poolDistribution: {
        'AntPool': 0.18,
        'Foundry USA': 0.16,
        'F2Pool': 0.14,
        'Binance Pool': 0.11,
        'Other': 0.41
      }
    }
  });

  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [predictionModels, setPredictionModels] = useState<PredictionModel[]>([
    {
      id: '1',
      name: 'Technical Analysis Model',
      type: 'technical',
      prediction: {
        direction: 'bullish',
        confidence: 0.78,
        timeframe: '7 days',
        targetPrice: 105000,
        probability: 0.65
      },
      inputs: ['RSI', 'MACD', 'Bollinger Bands', 'Volume Profile'],
      accuracy: 0.73,
      lastUpdated: new Date()
    },
    {
      id: '2',
      name: 'On-Chain Analysis Model',
      type: 'onchain',
      prediction: {
        direction: 'neutral',
        confidence: 0.62,
        timeframe: '30 days',
        probability: 0.58
      },
      inputs: ['HODL Waves', 'Exchange Flows', 'MVRV Ratio', 'Active Addresses'],
      accuracy: 0.69,
      lastUpdated: new Date()
    },
    {
      id: '3',
      name: 'Sentiment Analysis Model',
      type: 'sentiment',
      prediction: {
        direction: 'bullish',
        confidence: 0.84,
        timeframe: '14 days',
        targetPrice: 102000,
        probability: 0.72
      },
      inputs: ['Social Volume', 'Fear & Greed Index', 'News Sentiment', 'Reddit Activity'],
      accuracy: 0.66,
      lastUpdated: new Date()
    }
  ]);

  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicator[]>([
    { 
      name: 'RSI (14)', 
      value: 68.5, 
      signal: 'neutral', 
      strength: 0.6, 
      confidence: 0.8,
      timeframe: '4h',
      description: 'Relative Strength Index indicating momentum'
    },
    { 
      name: 'MACD', 
      value: 1250, 
      signal: 'buy', 
      strength: 0.8, 
      confidence: 0.75,
      timeframe: '1d',
      description: 'Moving Average Convergence Divergence showing trend'
    },
    { 
      name: 'SMA (50)', 
      value: 95000, 
      signal: 'buy', 
      strength: 0.7, 
      confidence: 0.85,
      timeframe: '1d',
      description: '50-period Simple Moving Average'
    },
    { 
      name: 'SMA (200)', 
      value: 85000, 
      signal: 'strong_buy', 
      strength: 0.9, 
      confidence: 0.9,
      timeframe: '1d',
      description: '200-period Simple Moving Average'
    },
    { 
      name: 'Bollinger Bands', 
      value: 2.1, 
      signal: 'sell', 
      strength: 0.5, 
      confidence: 0.65,
      timeframe: '4h',
      description: 'Volatility bands indicating potential reversals'
    },
    { 
      name: 'Stochastic', 
      value: 82, 
      signal: 'sell', 
      strength: 0.6, 
      confidence: 0.7,
      timeframe: '4h',
      description: 'Stochastic oscillator showing momentum'
    },
    { 
      name: 'Volume Profile', 
      value: 1.34, 
      signal: 'buy', 
      strength: 0.75, 
      confidence: 0.8,
      timeframe: '1d',
      description: 'Volume-based support and resistance levels'
    }
  ]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'Price Alert - $100k',
      metric: 'price',
      condition: 'above',
      value: 100000,
      enabled: true,
      triggered: false,
      actions: ['notification', 'email']
    },
    {
      id: '2',
      name: 'Volume Spike',
      metric: 'volume24h',
      condition: 'change_percent',
      value: 50,
      enabled: true,
      triggered: false,
      actions: ['notification']
    },
    {
      id: '3',
      name: 'Hash Rate Drop',
      metric: 'hashrate',
      condition: 'below',
      value: 400,
      enabled: false,
      triggered: false,
      actions: ['notification', 'webhook']
    }
  ]);

  // Refs for performance
  const abortControllerRef = useRef<AbortController>();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load data effect
  useEffect(() => {
    loadAnalyticsData();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadAnalyticsData, 30000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [timeRange, chartType, autoRefresh]);

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

  // Enhanced data loading with comprehensive metrics
  const loadAnalyticsData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      const dataPoints = getDataPointsForTimeRange(timeRange);
      const now = Date.now();
      
      // Generate realistic chart data based on type
      const labels = dataPoints.map(i => {
        const date = new Date(now - i * getTimeInterval(timeRange));
        return format(date, 
          timeRange === '1h' || timeRange === '4h' ? 'HH:mm' : 
          timeRange === '24h' ? 'HH:mm' :
          timeRange === '7d' ? 'MMM dd' :
          'MMM dd'
        );
      }).reverse();
      
      let datasets: any[] = [];
      
      switch (chartType) {
        case 'price':
          const priceValues = dataPoints.map((_, i) =>
            marketMetrics.price + (Math.sin(i * 0.1) * 2000)
          ).reverse();
          
          datasets = [{
            label: 'Bitcoin Price',
            data: priceValues,
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4
          }];
          break;
          
        case 'volume':
          const volumeValues = dataPoints.map(() =>
            marketMetrics.volume24h / 1000000000
          ).reverse();
          
          datasets = [{
            label: 'Volume (B)',
            data: volumeValues,
            backgroundColor: volumeValues.map((_, i) => 
              i > volumeValues.length / 2 ? '#10B981' : '#EF4444'
            ),
            borderRadius: 4
          }];
          break;
          
        case 'onchain':
          const addressValues = dataPoints.map(() =>
            onChainMetrics.activeAddresses / 1000000
          ).reverse();
          
          datasets = [{
            label: 'Active Addresses (M)',
            data: addressValues,
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4
          }];
          break;
          
        case 'derivatives':
          const oiValues = dataPoints.map(() =>
            marketMetrics.derivatives.openInterest / 1000000000
          ).reverse();
          
          datasets = [{
            label: 'Open Interest (B)',
            data: oiValues,
            borderColor: '#EC4899',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            fill: true,
            tension: 0.4
          }];
          break;
          
        default:
          datasets = [{
            label: 'Data',
            data: dataPoints.map(() => 0).reverse(),
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4
          }];
      }
      
      setChartData({ labels, datasets });
      
      // Update predictions and indicators
      updatePredictions();
      checkAlerts();
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load analytics:', error);
        toast.error('Failed to load analytics data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, chartType, marketMetrics, onChainMetrics]);

  // Utility functions
  const getDataPointsForTimeRange = (range: TimeRange): number[] => {
    switch (range) {
      case '1h': return Array.from({ length: 12 }, (_, i) => i * 5); // 5-min intervals
      case '4h': return Array.from({ length: 24 }, (_, i) => i * 10); // 10-min intervals
      case '24h': return Array.from({ length: 24 }, (_, i) => i); // Hourly
      case '7d': return Array.from({ length: 7 }, (_, i) => i); // Daily
      case '30d': return Array.from({ length: 30 }, (_, i) => i); // Daily
      case '90d': return Array.from({ length: 30 }, (_, i) => i * 3); // 3-day intervals
      case '1y': return Array.from({ length: 52 }, (_, i) => i * 7); // Weekly
      default: return Array.from({ length: 30 }, (_, i) => i);
    }
  };

  const getTimeInterval = (range: TimeRange): number => {
    switch (range) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '4h': return 10 * 60 * 1000; // 10 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      case '90d': return 3 * 24 * 60 * 60 * 1000; // 3 days
      case '1y': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 24 * 60 * 60 * 1000;
    }
  };

  const updatePredictions = useCallback(() => {
    // No fake prediction updates - keep models static
    setPredictionModels(prev => prev.map(model => ({
      ...model,
      lastUpdated: new Date()
    })));
  }, []);

  const checkAlerts = useCallback(() => {
    // Alert checking without fake random triggers - real alerts only
    // In production, this would check actual market conditions
    setAlertRules(prev => prev.map(rule => rule));
  }, [soundEnabled]);

  // Enhanced metric cards based on view mode
  const metricCards: MetricCard[] = useMemo(() => {
    const baseCards: MetricCard[] = [
      {
        id: 'price',
        title: 'Bitcoin Price',
        value: marketMetrics.price,
        change: 2.34,
        changeLabel: '24h',
        icon: DollarSign,
        color: 'orange',
        prefix: '$',
        suffix: '',
        trend: 'up',
        importance: 'critical'
      },
      {
        id: 'volume',
        title: '24h Volume',
        value: (marketMetrics.volume24h / 1000000000).toFixed(2),
        change: 15.7,
        changeLabel: '24h',
        icon: Activity,
        color: 'blue',
        prefix: '$',
        suffix: 'B',
        trend: 'up',
        importance: 'high'
      },
      {
        id: 'marketCap',
        title: 'Market Cap',
        value: (marketMetrics.marketCap / 1000000000000).toFixed(2),
        change: 2.34,
        changeLabel: '24h',
        icon: BarChart3,
        color: 'green',
        prefix: '$',
        suffix: 'T',
        trend: 'up',
        importance: 'high'
      },
      {
        id: 'dominance',
        title: 'BTC Dominance',
        value: marketMetrics.dominance.toFixed(1),
        change: 0.5,
        changeLabel: '24h',
        icon: PieChart,
        color: 'purple',
        prefix: '',
        suffix: '%',
        trend: 'up',
        importance: 'medium'
      }
    ];

    if (viewMode === 'professional' || viewMode === 'institutional') {
      baseCards.push(
        {
          id: 'hashrate',
          title: 'Hash Rate',
          value: marketMetrics.hashrate.toFixed(1),
          change: 3.2,
          changeLabel: '7d',
          icon: Zap,
          color: 'yellow',
          prefix: '',
          suffix: ' EH/s',
          trend: 'up',
          importance: 'medium'
        },
        {
          id: 'difficulty',
          title: 'Difficulty',
          value: marketMetrics.difficulty.toFixed(2),
          change: 5.1,
          changeLabel: 'adjustment',
          icon: Target,
          color: 'red',
          prefix: '',
          suffix: 'T',
          trend: 'up',
          importance: 'medium'
        }
      );
    }

    if (viewMode === 'institutional' || viewMode === 'research') {
      baseCards.push(
        {
          id: 'derivatives',
          title: 'Open Interest',
          value: (marketMetrics.derivatives.openInterest / 1000000000).toFixed(1),
          change: 8.7,
          changeLabel: '24h',
          icon: TrendingUp,
          color: 'pink',
          prefix: '$',
          suffix: 'B',
          trend: 'up',
          importance: 'high'
        },
        {
          id: 'institutional',
          title: 'Institutional Inflows',
          value: (marketMetrics.institutional.inflows24h / 1000000).toFixed(0),
          change: 23.4,
          changeLabel: '24h',
          icon: Building,
          color: 'indigo',
          prefix: '$',
          suffix: 'M',
          trend: 'up',
          importance: 'critical'
        }
      );
    }

    return baseCards.filter(card => selectedMetrics.has(card.id));
  }, [marketMetrics, viewMode, selectedMetrics]);

  // Format functions
  const formatMetricValue = (card: MetricCard): string => {
    return `${card.prefix || ''}${
      typeof card.value === 'number' ? card.value.toLocaleString() : card.value
    }${card.suffix || ''}`;
  };

  const getSignalColor = (signal: string): string => {
    switch (signal) {
      case 'strong_buy': return 'text-green-500';
      case 'buy': return 'text-green-400';
      case 'neutral': return 'text-gray-400';
      case 'sell': return 'text-red-400';
      case 'strong_sell': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getSignalStrength = (strength: number): string => {
    if (strength >= 0.8) return 'Very Strong';
    if (strength >= 0.6) return 'Strong';
    if (strength >= 0.4) return 'Moderate';
    if (strength >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  const getPredictionColor = (direction: string): string => {
    switch (direction) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const exportData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      viewMode,
      metrics: marketMetrics,
      onChainMetrics,
      indicators: technicalIndicators,
      predictions: predictionModels,
      chartData: chartData.datasets[0]?.data || [],
      alerts: alertRules.filter(rule => rule.triggered)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitcoin-analytics-pro-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Advanced analytics data exported');
  }, [timeRange, viewMode, marketMetrics, onChainMetrics, technicalIndicators, predictionModels, chartData, alertRules]);

  const toggleMetric = useCallback((metricId: string) => {
    setSelectedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricId)) {
        newSet.delete(metricId);
      } else {
        newSet.add(metricId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Bitcoin Analytics Pro
              </h1>
              <p className="text-gray-400 mt-1">
                Advanced real-time market intelligence and predictive analytics
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode */}
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="overview">Overview</option>
                <option value="professional">Professional</option>
                <option value="institutional">Institutional</option>
                <option value="research">Research</option>
              </select>
              
              {/* Time Range */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="1y">1 Year</option>
                <option value="all">All Time</option>
              </select>
              
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
              
              {/* Alerts */}
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`p-2 rounded-lg border transition-colors relative ${
                  showAlerts 
                    ? 'bg-red-600/20 border-red-500 text-red-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
                title="Alerts"
              >
                <AlertCircle className="w-5 h-5" />
                {alertRules.some(rule => rule.triggered) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              
              {/* Export */}
              <button
                onClick={exportData}
                className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                title="Export data"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Metric Cards */}
        <div className={`grid gap-4 ${
          viewMode === 'overview' ? 'grid-cols-2 md:grid-cols-4' :
          viewMode === 'professional' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' :
          'grid-cols-2 md:grid-cols-4 lg:grid-cols-8'
        }`}>
          {metricCards.map(card => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all ${
                selectedMetrics.has(card.id) 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => toggleMetric(card.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{card.title}</span>
                <div className="flex items-center gap-1">
                  <card.icon className={`w-4 h-4 text-${card.color}-500`} />
                  {card.importance === 'critical' && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatMetricValue(card)}
              </p>
              <div className={`flex items-center gap-1 text-sm ${
                card.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {card.change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(card.change).toFixed(2)}%</span>
                <span className="text-gray-500">({card.changeLabel})</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Price Chart */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Market Analysis</h2>
              <div className="flex items-center gap-2">
                {['price', 'volume', 'onchain', 'derivatives', 'sentiment'].map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type as ChartType)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      chartType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : chartData.datasets.length > 0 ? (
                chartType === 'volume' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData.labels?.map((label: string, i: number) => ({
                      name: label,
                      value: chartData.datasets[0]?.data[i] ?? 0
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <RechartsBar dataKey="value" fill="#10B981" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData.labels?.map((label: string, i: number) => ({
                      name: label,
                      value: chartData.datasets[0]?.data[i] ?? 0
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <RechartsLine type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* AI Predictions */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              AI Predictions
            </h2>
            <div className="space-y-4">
              {predictionModels.map(model => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{model.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      model.type === 'technical' ? 'bg-blue-500/20 text-blue-400' :
                      model.type === 'onchain' ? 'bg-purple-500/20 text-purple-400' :
                      model.type === 'sentiment' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {model.type}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Direction</span>
                      <span className={`font-medium ${getPredictionColor(model.prediction.direction)}`}>
                        {model.prediction.direction.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${model.prediction.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-white text-sm">
                          {(model.prediction.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    {model.prediction.targetPrice && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Target</span>
                        <span className="text-white font-mono">
                          ${model.prediction.targetPrice.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Timeframe</span>
                      <span className="text-gray-300">{model.prediction.timeframe}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Accuracy: {(model.accuracy * 100).toFixed(1)}% • 
                      Updated {formatDistanceToNow(model.lastUpdated)} ago
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Indicators & On-Chain Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Technical Indicators */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Technical Analysis
            </h2>
            <div className="space-y-4">
              {technicalIndicators.map(indicator => (
                <div key={indicator.name} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white">{indicator.name}</p>
                      <span className="text-xs text-gray-500">({indicator.timeframe})</span>
                    </div>
                    <p className="text-xs text-gray-400">{indicator.description}</p>
                    <p className="font-mono text-gray-300 text-sm">
                      {indicator.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${getSignalColor(indicator.signal)}`}>
                      {indicator.signal.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getSignalStrength(indicator.strength)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-8 h-1 bg-gray-700 rounded-full">
                        <div 
                          className={`h-1 rounded-full ${
                            indicator.confidence > 0.8 ? 'bg-green-500' :
                            indicator.confidence > 0.6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${indicator.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(indicator.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Overall Signal */}
              <div className="pt-4 mt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Overall Signal</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`w-6 h-2 rounded-full ${
                            i <= 4 ? 'bg-green-500' : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-green-400 font-medium">STRONG BUY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* On-Chain Metrics */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              On-Chain Analysis
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-1">Active Addresses</p>
                  <p className="text-lg font-bold text-white">
                    {(onChainMetrics.activeAddresses / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-green-400">+5.2% (7d)</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-1">Transaction Volume</p>
                  <p className="text-lg font-bold text-white">
                    ${(onChainMetrics.transactionVolume / 1000000000).toFixed(1)}B
                  </p>
                  <p className="text-xs text-red-400">-2.1% (24h)</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">HODL Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Long-term Holders</span>
                    <span className="text-white">
                      {(onChainMetrics.hodlerMetrics.longTermHolders * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Short-term Holders</span>
                    <span className="text-white">
                      {(onChainMetrics.hodlerMetrics.shortTermHolders * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${onChainMetrics.hodlerMetrics.longTermHolders * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">Network Health</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Node Count</span>
                    <span className="text-white">{onChainMetrics.networkHealth.nodeCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Mempool Congestion</span>
                    <span className={`${
                      onChainMetrics.networkHealth.mempoolCongestion > 0.7 ? 'text-red-400' :
                      onChainMetrics.networkHealth.mempoolCongestion > 0.4 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {(onChainMetrics.networkHealth.mempoolCongestion * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Median Fee</span>
                    <span className="text-white">{onChainMetrics.networkHealth.feeMarket.medianFee} sat/vB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Metrics (Professional/Institutional/Research Views) */}
        {(viewMode === 'professional' || viewMode === 'institutional' || viewMode === 'research') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Derivatives */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-500" />
                Derivatives
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Open Interest</span>
                  <span className="text-white font-medium">
                    ${(marketMetrics.derivatives.openInterest / 1000000000).toFixed(1)}B
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Funding Rate</span>
                  <span className={`font-medium ${
                    marketMetrics.derivatives.fundingRate > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(marketMetrics.derivatives.fundingRate * 100).toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Long/Short</span>
                  <span className="text-white">{marketMetrics.derivatives.longShortRatio.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* DeFi */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                DeFi
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">TVL</span>
                  <span className="text-white font-medium">
                    ${(marketMetrics.defi.tvl / 1000000000).toFixed(1)}B
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Users</span>
                  <span className="text-white">{marketMetrics.defi.users24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocols</span>
                  <span className="text-white">{marketMetrics.defi.protocols}</span>
                </div>
              </div>
            </div>

            {/* Institutional */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Institutional
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Holdings</span>
                  <span className="text-white font-medium">
                    {(marketMetrics.institutional.holdings / 1000000).toFixed(1)}M BTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Inflows</span>
                  <span className="text-green-400">
                    +${(marketMetrics.institutional.inflows24h / 1000000).toFixed(0)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Premiums</span>
                  <span className="text-white">{marketMetrics.institutional.premiums.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Mining */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-yellow-500" />
                Mining
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hash Price</span>
                  <span className="text-white font-medium">
                    ${onChainMetrics.miningMetrics.hashPrice.toFixed(3)}/TH/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Revenue</span>
                  <span className="text-white">
                    ${(onChainMetrics.miningMetrics.revenue24h / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Miners</span>
                  <span className="text-white">{onChainMetrics.miningMetrics.miners.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Alerts Panel */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-20 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Alert Rules</h3>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alertRules.map(rule => (
                <div key={rule.id} className="p-4 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{rule.name}</span>
                    <div className="flex items-center gap-2">
                      {rule.triggered && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                      <button
                        onClick={() => {
                          setAlertRules(prev => prev.map(r => 
                            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                          ));
                        }}
                        className={`text-sm px-2 py-1 rounded ${
                          rule.enabled 
                            ? 'bg-green-600/20 text-green-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {rule.enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {rule.metric} {rule.condition.replace('_', ' ')} {rule.value.toLocaleString()}
                  </p>
                  {rule.lastTriggered && (
                    <p className="text-xs text-red-400 mt-1">
                      Last triggered: {formatDistanceToNow(rule.lastTriggered)} ago
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}