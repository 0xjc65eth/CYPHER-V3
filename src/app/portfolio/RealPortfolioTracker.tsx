'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Bitcoin, 
  Gem, 
  Sparkles,
  RefreshCw,
  Download,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { format } from 'date-fns';

interface PortfolioData {
  portfolio: any;
  transactions: any[];
  debug: any;
}

export function RealPortfolioTracker() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolioData = useCallback(async () => {
    if (!wallet.address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/portfolio/real-pnl/?address=${wallet.address}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPortfolioData(data.data);
      } else {
        setError(data.error || 'Failed to fetch portfolio data');
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Error loading portfolio data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchPortfolioData();
    }
  }, [wallet.isConnected, wallet.address, fetchPortfolioData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolioData();
  };

  const exportData = () => {
    if (!portfolioData) return;
    
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `portfolio-${wallet.address}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!wallet.isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-12 text-center">
        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your Bitcoin wallet to view portfolio analytics</p>
      </Card>
    );
  }

  if (loading && !portfolioData) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Portfolio</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchPortfolioData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  if (!portfolioData) {
    return null;
  }

  const { portfolio, transactions, debug } = portfolioData;
  
  // Prepare data for charts
  const assetDistribution = [
    {
      name: 'Bitcoin',
      value: portfolio.bitcoin.currentValue,
      percentage: (portfolio.bitcoin.currentValue / portfolio.totalValue) * 100,
      color: '#f97316'
    },
    ...portfolio.ordinals.map((ord: any) => ({
      name: ord.assetName,
      value: ord.currentValue,
      percentage: (ord.currentValue / portfolio.totalValue) * 100,
      color: '#8b5cf6'
    })),
    ...portfolio.runes.map((rune: any) => ({
      name: rune.assetName,
      value: rune.currentValue,
      percentage: (rune.currentValue / portfolio.totalValue) * 100,
      color: '#10b981'
    }))
  ].filter(asset => asset.value > 0);

  // Transaction timeline
  const transactionTimeline = transactions
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .reverse()
    .map((tx: any) => ({
      date: format(new Date(tx.date), 'MMM dd'),
      value: tx.totalValue,
      type: tx.type
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Portfolio Analytics</h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            <Badge variant="outline" className="text-xs">Portfolio Value</Badge>
          </div>
          <p className="text-3xl font-bold text-white">${portfolio.totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">
            ≈ {(portfolio.totalValue / (debug.currentBtcPrice || 42000)).toFixed(4)} BTC
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            {portfolio.totalPNL >= 0 ? 
              <TrendingUp className="w-8 h-8 text-green-500" /> : 
              <TrendingDown className="w-8 h-8 text-red-500" />
            }
            <Badge variant="outline" className="text-xs">Total P&L</Badge>
          </div>
          <p className={`text-3xl font-bold ${portfolio.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolio.totalPNL >= 0 ? '+' : ''}{portfolio.totalPNL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {portfolio.totalPNLPercentage.toFixed(2)}% return
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <Bitcoin className="w-8 h-8 text-orange-500" />
            <Badge variant="outline" className="text-xs">Bitcoin Holdings</Badge>
          </div>
          <p className="text-3xl font-bold text-white">{portfolio.bitcoin.totalAmount.toFixed(8)}</p>
          <p className="text-sm text-gray-400 mt-1">
            ${portfolio.bitcoin.currentValue.toLocaleString()}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <Gem className="w-8 h-8 text-purple-500" />
            <Badge variant="outline" className="text-xs">Digital Assets</Badge>
          </div>
          <p className="text-3xl font-bold text-white">
            {portfolio.ordinals.length + portfolio.runes.length}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {portfolio.ordinals.length} Ordinals, {portfolio.runes.length} Runes
          </p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Distribution */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ percentage }) => `${percentage.toFixed(1)}%`}
              >
                {assetDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {assetDistribution.map((asset, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: asset.color }}></div>
                  <span className="text-sm text-gray-300">{asset.name}</span>
                </div>
                <span className="text-sm text-white font-medium">
                  ${asset.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Transaction Activity */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transactionTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                formatter={(value: any) => `$${value.toLocaleString()}`}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              />
              <Bar 
                dataKey="value" 
                fill="#f97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Performance Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Invested</span>
                <span className="text-white">${portfolio.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Realized P&L</span>
                <span className={portfolio.bitcoin.realizedPNL >= 0 ? 'text-green-500' : 'text-red-500'}>
                  ${portfolio.bitcoin.realizedPNL.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unrealized P&L</span>
                <span className={portfolio.bitcoin.unrealizedPNL >= 0 ? 'text-green-500' : 'text-red-500'}>
                  ${portfolio.bitcoin.unrealizedPNL.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Trading Activity</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Transactions</span>
                <span className="text-white">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Buy Transactions</span>
                <span className="text-white">{transactions.filter((tx: any) => tx.type === 'buy').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sell Transactions</span>
                <span className="text-white">{transactions.filter((tx: any) => tx.type === 'sell').length}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Wallet Info</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Wallet Type</span>
                <span className="text-white">Bitcoin Mainnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address Type</span>
                <span className="text-white">{wallet.address?.startsWith('bc1') ? 'SegWit' : 'Legacy'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}