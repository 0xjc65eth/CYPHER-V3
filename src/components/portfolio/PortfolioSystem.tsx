'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  PieChart,
  BarChart3,
  LineChart,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ChevronDown,
  Bitcoin,
  Gem,
  Coins,
  Activity
} from 'lucide-react';
// WALLET TEMPORARILY DISABLED - import { useWalletContext } from '@/contexts/WalletContext';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Asset {
  id: string;
  type: 'bitcoin' | 'ordinal' | 'rune' | 'brc20';
  name: string;
  symbol: string;
  balance: number;
  value: number;
  price: number;
  change24h: number;
  allocation: number;
  icon?: string;
  metadata?: {
    inscriptionId?: string;
    runeId?: string;
    tokenStandard?: string;
  };
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'receive' | 'send';
  asset: string;
  amount: number;
  price: number;
  value: number;
  fee: number;
  timestamp: Date;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  weekPnL: number;
  weekPnLPercent: number;
  monthPnL: number;
  monthPnLPercent: number;
  bestPerformer: Asset | null;
  worstPerformer: Asset | null;
}

interface PortfolioHistory {
  timestamp: Date;
  value: number;
  cost: number;
  pnl: number;
}

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
type AssetFilter = 'all' | 'bitcoin' | 'ordinals' | 'runes' | 'brc20';

export function PortfolioSystem() {
  // WALLET TEMPORARILY DISABLED - const { connectionState } = useWalletContext();
  const connectionState = { isConnected: false, account: null as string | null };
  
  const [showValues, setShowValues] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Calculate portfolio metrics
  const metrics = useMemo<PortfolioMetrics>(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalCost = transactions
      .filter(tx => tx.type === 'buy')
      .reduce((sum, tx) => sum + tx.value + tx.fee, 0);
    
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Calculate time-based P&L (mock data for demo)
    const dayPnL = totalValue * 0.023; // Mock 2.3% daily change
    const dayPnLPercent = 2.3;
    const weekPnL = totalValue * 0.087; // Mock 8.7% weekly change
    const weekPnLPercent = 8.7;
    const monthPnL = totalValue * 0.234; // Mock 23.4% monthly change
    const monthPnLPercent = 23.4;

    const bestPerformer = assets.reduce((best, asset) => 
      !best || asset.change24h > best.change24h ? asset : best, null as Asset | null
    );
    
    const worstPerformer = assets.reduce((worst, asset) => 
      !worst || asset.change24h < worst.change24h ? asset : worst, null as Asset | null
    );

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      dayPnL,
      dayPnLPercent,
      weekPnL,
      weekPnLPercent,
      monthPnL,
      monthPnLPercent,
      bestPerformer,
      worstPerformer
    };
  }, [assets, transactions]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    if (assetFilter === 'all') return assets;
    if (assetFilter === 'ordinals') return assets.filter(a => a.type === 'ordinal');
    if (assetFilter === 'runes') return assets.filter(a => a.type === 'rune');
    if (assetFilter === 'brc20') return assets.filter(a => a.type === 'brc20');
    return assets.filter(a => a.type === 'bitcoin');
  }, [assets, assetFilter]);

  // Load portfolio data
  const loadPortfolioData = async () => {
    if (!connectionState.account) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch portfolio data
      const [assetsRes, transactionsRes] = await Promise.all([
        fetch(`/api/portfolio/balance/?address=${connectionState.account.address}`),
        fetch(`/api/portfolio/transactions/?address=${connectionState.account.address}`)
      ]);

      if (!assetsRes.ok || !transactionsRes.ok) {
        throw new Error('Failed to load portfolio data');
      }

      const assetsData = await assetsRes.json();
      const transactionsData = await transactionsRes.json();

      // Mock data for demonstration
      const mockAssets: Asset[] = [
        {
          id: '1',
          type: 'bitcoin',
          name: 'Bitcoin',
          symbol: 'BTC',
          balance: connectionState.balance?.total || 0,
          value: (connectionState.balance?.total || 0) / 100000000 * 98500,
          price: 98500,
          change24h: 2.34,
          allocation: 45,
          icon: '/icons/bitcoin.svg'
        },
        {
          id: '2',
          type: 'ordinal',
          name: 'Bitcoin Punks #1234',
          symbol: 'PUNK',
          balance: 1,
          value: 15000,
          price: 15000,
          change24h: 12.5,
          allocation: 25,
          metadata: { inscriptionId: 'abc123' }
        },
        {
          id: '3',
          type: 'rune',
          name: 'SATOSHI•NAKAMOTO',
          symbol: 'SATOSHI',
          balance: 1000000,
          value: 8500,
          price: 0.0085,
          change24h: -3.2,
          allocation: 15,
          metadata: { runeId: 'rune123' }
        },
        {
          id: '4',
          type: 'brc20',
          name: 'ORDI',
          symbol: 'ORDI',
          balance: 500,
          value: 12500,
          price: 25,
          change24h: 5.7,
          allocation: 15,
          metadata: { tokenStandard: 'brc-20' }
        }
      ];

      setAssets(mockAssets);
      setTransactions(transactionsData || []);

      // Generate mock history data
      const mockHistory: PortfolioHistory[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
        value: metrics.totalValue * (0.8 + Math.random() * 0.4),
        cost: metrics.totalCost,
        pnl: 0
      }));
      
      mockHistory.forEach(point => {
        point.pnl = point.value - point.cost;
      });
      
      setHistory(mockHistory);

    } catch (err) {
      console.error('Portfolio data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      toast.error('Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (connectionState.isConnected) {
      loadPortfolioData();
    }
  }, [connectionState.isConnected, connectionState.account]);

  // Format currency
  const formatCurrency = (value: number, hidden = false): string => {
    if (hidden) return '****';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Export portfolio data
  const exportPortfolio = () => {
    const data = {
      portfolio: {
        totalValue: metrics.totalValue,
        totalPnL: metrics.totalPnL,
        assets: assets.map(a => ({
          name: a.name,
          balance: a.balance,
          value: a.value,
          allocation: a.allocation
        }))
      },
      transactions: transactions.map(t => ({
        date: t.timestamp,
        type: t.type,
        asset: t.asset,
        amount: t.amount,
        value: t.value
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Portfolio exported successfully');
  };

  if (!connectionState.isConnected) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Portfolio Overview</h2>
            <p className="text-gray-400">Track your Bitcoin, Ordinals, Runes & BRC-20 assets</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowValues(!showValues)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-sm">{showValues ? 'Hide' : 'Show'} Values</span>
            </button>
            
            <button
              onClick={loadPortfolioData}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportPortfolio}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Value */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Value</span>
              <DollarSign className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(metrics.totalValue, !showValues)}
            </p>
            <p className={`text-sm mt-1 flex items-center gap-1 ${
              metrics.dayPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {metrics.dayPnLPercent >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {formatPercentage(metrics.dayPnLPercent)} (24h)
            </p>
          </div>

          {/* Total P&L */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total P&L</span>
              <TrendingUp className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-2xl font-bold ${
              metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(metrics.totalPnL, !showValues)}
            </p>
            <p className={`text-sm mt-1 ${
              metrics.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(metrics.totalPnLPercent)}
            </p>
          </div>

          {/* Best Performer */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Best Performer</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            {metrics.bestPerformer ? (
              <>
                <p className="text-lg font-semibold text-white truncate">
                  {metrics.bestPerformer.symbol}
                </p>
                <p className="text-sm text-green-400">
                  {formatPercentage(metrics.bestPerformer.change24h)}
                </p>
              </>
            ) : (
              <p className="text-gray-500 font-mono text-sm">--</p>
            )}
          </div>

          {/* Worst Performer */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Worst Performer</span>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            {metrics.worstPerformer ? (
              <>
                <p className="text-lg font-semibold text-white truncate">
                  {metrics.worstPerformer.symbol}
                </p>
                <p className="text-sm text-red-400">
                  {formatPercentage(metrics.worstPerformer.change24h)}
                </p>
              </>
            ) : (
              <p className="text-gray-500 font-mono text-sm">--</p>
            )}
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Assets</h3>
          
          {/* Asset Filter */}
          <div className="flex items-center gap-2">
            {(['all', 'bitcoin', 'ordinals', 'runes', 'brc20'] as AssetFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setAssetFilter(filter)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  assetFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading portfolio...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadPortfolioData}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No assets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Asset</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Balance</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Value</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">24h Change</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => (
                  <tr 
                    key={asset.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                          {asset.type === 'bitcoin' && <Bitcoin className="w-6 h-6 text-orange-500" />}
                          {asset.type === 'ordinal' && <Gem className="w-6 h-6 text-purple-500" />}
                          {asset.type === 'rune' && <Activity className="w-6 h-6 text-blue-500" />}
                          {asset.type === 'brc20' && <Coins className="w-6 h-6 text-green-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-white">{asset.name}</p>
                          <p className="text-sm text-gray-400">{asset.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="font-mono text-white">
                        {asset.balance.toLocaleString()}
                      </p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="text-white">
                        {formatCurrency(asset.price, !showValues)}
                      </p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="font-medium text-white">
                        {formatCurrency(asset.value, !showValues)}
                      </p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className={`font-medium ${
                        asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(asset.change24h)}
                      </p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${asset.allocation}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-12 text-right">
                          {asset.allocation}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Detail Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">{selectedAsset.name}</h3>
              {/* Add more asset details here */}
              <button
                onClick={() => setSelectedAsset(null)}
                className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}