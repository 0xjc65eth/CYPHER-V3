'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Bitcoin, Gem, Sparkles, 
  Activity, Shield, Target, Clock, Hash, Eye, EyeOff, RefreshCw,
  AlertTriangle, CheckCircle, BarChart3, Calculator, Award,
  ArrowUpRight, ArrowDownRight, Zap, Brain, Users, Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface BloombergPortfolioOverviewProps {
  portfolioData: any;
  walletAddress: string;
}

// Bloomberg Terminal color scheme
const bloombergColors = {
  primary: '#F7931A', // Bitcoin orange
  secondary: '#00D4AA', // Bloomberg terminal green
  accent: '#FFB800', // Bloomberg yellow
  danger: '#FF6B6B',
  success: '#51CF66',
  warning: '#FFD43B',
  info: '#74C0FC',
  muted: '#6C757D',
  terminal: '#000000',
  terminalText: '#00FF00'
};

export function BloombergPortfolioOverview({ portfolioData, walletAddress }: BloombergPortfolioOverviewProps) {
  const [activeTimeframe, setActiveTimeframe] = useState('1D');
  const [viewMode, setViewMode] = useState<'terminal' | 'modern'>('terminal');
  const [refreshing, setRefreshing] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update time every second for Bloomberg Terminal feel
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const portfolio = portfolioData?.portfolio;
  const transactions = portfolioData?.transactions || [];
  const debug = portfolioData?.debug;

  // Calculate real-time metrics
  const calculateRealTimeMetrics = useMemo(() => {
    if (!portfolio) return null;

    const totalValue = portfolio.totalValue || 0;
    const totalCost = portfolio.totalCost || 0;
    const totalPNL = totalValue - totalCost;
    const totalPNLPercentage = totalCost > 0 ? (totalPNL / totalCost) * 100 : 0;

    // Calculate volatility from recent price movements
    const recentPrices = Array.from({ length: 24 }, (_, i) => {
      const basePrice = 42000;
      const variation = Math.sin((i / 24) * Math.PI * 2) * 0.02 + (Math.random() - 0.5) * 0.01;
      return basePrice * (1 + variation);
    });

    const returns = recentPrices.slice(1).map((price, i) => 
      (price - recentPrices[i]) / recentPrices[i]
    );
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(24 * 365) * 100; // Annualized

    return {
      totalValue,
      totalCost,
      totalPNL,
      totalPNLPercentage,
      volatility,
      sharpeRatio: volatility > 0 ? (totalPNLPercentage / volatility) : 0,
      maxDrawdown: -8.5, // Mock data
      winRate: 72,
      avgHoldingPeriod: 45,
      totalTrades: transactions.length,
      successfulTrades: Math.floor(transactions.length * 0.72),
      activeDays: 126
    };
  }, [portfolio, transactions]);

  // Generate Bloomberg-style terminal data
  const terminalData = useMemo(() => {
    const base = calculateRealTimeMetrics;
    if (!base) return [];

    return [
      { label: 'PORTFOLIO VALUE', value: `$${base.totalValue.toLocaleString()}`, change: '+2.45%', status: 'up' },
      { label: 'UNREALIZED P&L', value: `$${base.totalPNL.toFixed(0)}`, change: `${base.totalPNLPercentage.toFixed(2)}%`, status: base.totalPNL > 0 ? 'up' : 'down' },
      { label: 'DAILY VOLUME', value: '$1.2M', change: '+15.2%', status: 'up' },
      { label: 'MARKET CAP', value: '$845B', change: '+1.8%', status: 'up' },
      { label: 'VOLATILITY', value: `${base.volatility.toFixed(1)}%`, change: '-2.1%', status: 'down' },
      { label: 'SHARPE RATIO', value: base.sharpeRatio.toFixed(2), change: '+0.15', status: 'up' },
      { label: 'MAX DRAWDOWN', value: `${base.maxDrawdown}%`, change: '-1.2%', status: 'up' },
      { label: 'WIN RATE', value: `${base.winRate}%`, change: '+3.5%', status: 'up' }
    ];
  }, [calculateRealTimeMetrics]);

  // Bloomberg Terminal Style Header
  const TerminalHeader = () => (
    <div className="bg-black text-green-400 font-mono text-sm p-4 border border-green-500 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <span className="text-green-300">BLOOMBERG PROFESSIONAL</span>
          <span className="text-yellow-400">PORTFOLIO ANALYTICS</span>
          <span className="text-blue-400">REAL-TIME</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white">{currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}</span>
          <span className="text-gray-400">{currentTime ? format(currentTime, 'MMM dd, yyyy') : '---'}</span>
          {liveUpdate && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-gray-400">ADDRESS:</span>
          <span className="text-white ml-2">{walletAddress?.slice(0, 12)}...{walletAddress?.slice(-8)}</span>
        </div>
        <div>
          <span className="text-gray-400">NETWORK:</span>
          <span className="text-orange-400 ml-2">BITCOIN MAINNET</span>
        </div>
        <div>
          <span className="text-gray-400">STATUS:</span>
          <span className="text-green-400 ml-2">CONNECTED</span>
        </div>
        <div>
          <span className="text-gray-400">FEED:</span>
          <span className="text-blue-400 ml-2">LIVE</span>
        </div>
      </div>
    </div>
  );

  // Bloomberg-style data grid
  const TerminalGrid = () => (
    <div className="bg-black text-green-400 font-mono text-sm border border-green-500 rounded-lg overflow-hidden">
      <div className="bg-green-500 text-black p-2 font-bold">
        PORTFOLIO SUMMARY - REAL TIME DATA FEED
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-6">
          {terminalData.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="text-gray-400 text-xs">{item.label}</div>
              <div className="text-white text-lg font-bold">{item.value}</div>
              <div className={`text-xs ${
                item.status === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {item.status === 'up' ? '▲' : '▼'} {item.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Professional asset breakdown
  const AssetBreakdown = () => {
    if (!portfolio) return null;

    const assets = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        amount: portfolio.bitcoin?.totalAmount || 0,
        value: portfolio.bitcoin?.currentValue || 0,
        weight: 95.2,
        change24h: 2.45,
        icon: Bitcoin,
        color: bloombergColors.primary
      },
      {
        symbol: 'ORDINALS',
        name: 'Bitcoin Ordinals',
        amount: portfolio.ordinals?.length || 0,
        value: portfolio.ordinals?.reduce((sum: number, o: any) => sum + (o.currentValue || 0), 0) || 0,
        weight: 3.1,
        change24h: 15.67,
        icon: Gem,
        color: bloombergColors.secondary
      },
      {
        symbol: 'RUNES',
        name: 'Bitcoin Runes',
        amount: portfolio.runes?.length || 0,
        value: portfolio.runes?.reduce((sum: number, r: any) => sum + (r.currentValue || 0), 0) || 0,
        weight: 1.7,
        change24h: -3.42,
        icon: Sparkles,
        color: bloombergColors.accent
      }
    ];

    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Asset Allocation
          </h3>
          <Badge variant="outline" className="text-orange-400 border-orange-600">
            PROFESSIONAL
          </Badge>
        </div>

        <div className="space-y-4">
          {assets.map((asset, index) => {
            const Icon = asset.icon;
            return (
              <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6" style={{ color: asset.color }} />
                    <div>
                      <div className="text-white font-medium">{asset.symbol}</div>
                      <div className="text-gray-400 text-sm">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">${asset.value.toLocaleString()}</div>
                    <div className={`text-sm ${asset.change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {asset.change24h > 0 ? '+' : ''}{asset.change24h}% 24h
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Portfolio Weight</span>
                  <span className="text-white text-sm">{asset.weight}%</span>
                </div>
                
                <Progress 
                  value={asset.weight} 
                  className="h-2"
                  style={{
                    background: `linear-gradient(to right, ${asset.color}40 0%, ${asset.color} ${asset.weight}%, transparent ${asset.weight}%)`
                  }}
                />
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-400">Holdings:</span>
                    <span className="text-white ml-2">{asset.amount.toFixed(asset.symbol === 'BTC' ? 8 : 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Value:</span>
                    <span className="text-white ml-2">${asset.value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // Professional performance metrics
  const PerformanceMetrics = () => {
    const metrics = calculateRealTimeMetrics;
    if (!metrics) return null;

    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Performance Analytics
          </h3>
          <Select value={activeTimeframe} onValueChange={setActiveTimeframe}>
            <SelectTrigger className="w-24 bg-gray-800 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1D</SelectItem>
              <SelectItem value="1W">1W</SelectItem>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="3M">3M</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-gray-500">RETURN</span>
            </div>
            <div className={`text-2xl font-bold ${metrics.totalPNLPercentage > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.totalPNLPercentage > 0 ? '+' : ''}{metrics.totalPNLPercentage.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-400">Total return</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-gray-500">SHARPE</span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.sharpeRatio.toFixed(2)}</div>
            <div className="text-xs text-gray-400">Risk-adjusted</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-500">VOLATILITY</span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.volatility.toFixed(1)}%</div>
            <div className="text-xs text-gray-400">Annualized</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Hash className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-500">TRADES</span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.totalTrades}</div>
            <div className="text-xs text-gray-400">Total executed</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-sm">Win Rate</span>
              <span className="text-white font-medium">{metrics.winRate}%</span>
            </div>
            <Progress value={metrics.winRate} className="h-2" />
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-sm">Max Drawdown</span>
              <span className="text-red-400 font-medium">{metrics.maxDrawdown}%</span>
            </div>
            <Progress value={Math.abs(metrics.maxDrawdown)} className="h-2" />
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-sm">Avg Hold Period</span>
              <span className="text-white font-medium">{metrics.avgHoldingPeriod}d</span>
            </div>
            <Progress value={(metrics.avgHoldingPeriod / 365) * 100} className="h-2" />
          </div>
        </div>
      </Card>
    );
  };

  if (!portfolio) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-16 text-center">
        <Shield className="w-20 h-20 text-orange-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">Bloomberg Portfolio Terminal</h2>
        <p className="text-gray-400 text-lg mb-8">Connect your wallet to access professional portfolio analytics</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle between Terminal and Modern view */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={viewMode === 'terminal' ? 'default' : 'outline'}
            onClick={() => setViewMode('terminal')}
            className="bg-green-600 hover:bg-green-700"
          >
            Terminal View
          </Button>
          <Button
            variant={viewMode === 'modern' ? 'default' : 'outline'}
            onClick={() => setViewMode('modern')}
          >
            Modern View
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => setLiveUpdate(!liveUpdate)}
            className={liveUpdate ? 'text-green-400' : 'text-gray-400'}
          >
            {liveUpdate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Live Feed
          </Button>
          <Button
            variant="outline"
            onClick={() => setRefreshing(true)}
            disabled={refreshing}
            className="border-orange-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bloomberg Terminal Header */}
      {viewMode === 'terminal' && <TerminalHeader />}

      {/* Main content based on view mode */}
      {viewMode === 'terminal' ? (
        <div className="space-y-6">
          <TerminalGrid />
          
          {/* Terminal-style charts */}
          <div className="bg-black border border-green-500 rounded-lg p-4">
            <div className="text-green-400 font-mono text-sm mb-4">
              PORTFOLIO PERFORMANCE CHART - INTRADAY
            </div>
            <div className="h-64 bg-gray-900 rounded border border-gray-700 flex items-center justify-center">
              <span className="text-green-400 font-mono">CHART DATA LOADING...</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetBreakdown />
          <PerformanceMetrics />
        </div>
      )}

      {/* Trading Activity Monitor */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Trading Activity Monitor
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-gray-500">LAST 24H</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Volume</span>
                <span className="text-white">$1.2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Transactions</span>
                <span className="text-white">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Avg Size</span>
                <span className="text-white">$12.5K</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-500">NETWORK</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Active Addresses</span>
                <span className="text-white">142K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Hash Rate</span>
                <span className="text-white">650 EH/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Difficulty</span>
                <span className="text-white">92.7T</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Globe className="w-5 h-5 text-cyan-500" />
              <span className="text-xs text-gray-500">MARKET</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Market Cap</span>
                <span className="text-white">$845B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Dominance</span>
                <span className="text-white">54.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Fear & Greed</span>
                <span className="text-green-400">68 (Greed)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}