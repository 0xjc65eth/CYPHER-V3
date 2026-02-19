'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wallet, Bitcoin, TrendingUp, TrendingDown, DollarSign, 
  Activity, Zap, Shield, RefreshCw, ExternalLink,
  Gem, Sparkles, BarChart3, Clock, Hash
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

export function WalletDashboard() {
  // All hooks must be at the top level
  const [mounted, setMounted] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // Always call useWallet hook - no conditional calls
  const wallet = useWallet();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (wallet?.isConnected && wallet?.address) {
      fetchPortfolioData();
    }
  }, [wallet?.isConnected, wallet?.address]);

  // Handle wallet errors
  if (walletError || !wallet) {
    if (!mounted) {
      return (
        <Card className="bg-gray-900 border-gray-700 p-8">
          <div className="text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Loading Wallet...</h3>
            <p className="text-gray-400">Initializing wallet connection</p>
          </div>
        </Card>
      );
    }
    
    return (
      <Card className="bg-red-900/20 border-red-500 p-8">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-400 mb-2">Wallet Error</h3>
          <p className="text-red-300">{walletError || 'Failed to initialize wallet provider'}</p>
        </div>
      </Card>
    );
  }

  const fetchPortfolioData = async () => {
    if (!wallet.address) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/portfolio/real-pnl/?address=${wallet.address}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPortfolioData(data.data);
        
        // Log data source for debugging
        
        // Price history would come from real portfolio API; skip fake generation
        setPriceHistory([]);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.isConnected) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 p-8">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Connect your Bitcoin wallet to view your portfolio</p>
        </div>
      </Card>
    );
  }

  if (loading || !portfolioData) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  const { portfolio, transactions } = portfolioData;

  return (
    <div className="space-y-4">
      {/* Wallet Header Card */}
      <Card className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Wallet className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">Wallet Overview</h2>
                {portfolioData?.debug?.isRealData ? (
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">REAL DATA</span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">FALLBACK</span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
              </p>
              {portfolioData?.debug?.dataSource && (
                <p className="text-xs text-gray-500">
                  Source: {portfolioData.debug.dataSource}
                </p>
              )}
            </div>
          </div>
          <Button onClick={fetchPortfolioData} variant="outline" size="sm" className="border-gray-600">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <Badge variant="outline" className="text-xs">Portfolio</Badge>
            </div>
            <p className="text-2xl font-bold text-white">${portfolio.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              ≈ {(portfolio.totalValue / 42000).toFixed(4)} BTC
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              {portfolio.totalPNL >= 0 ? 
                <TrendingUp className="w-5 h-5 text-green-500" /> : 
                <TrendingDown className="w-5 h-5 text-red-500" />
              }
              <Badge variant="outline" className="text-xs">P&L</Badge>
            </div>
            <p className={`text-2xl font-bold ${portfolio.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolio.totalPNL >= 0 ? '+' : ''}${Math.abs(portfolio.totalPNL).toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {portfolio.totalPNLPercentage.toFixed(2)}% return
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Bitcoin className="w-5 h-5 text-orange-500" />
              <Badge variant="outline" className="text-xs">BTC</Badge>
            </div>
            <p className="text-2xl font-bold text-white">{portfolio.bitcoin.totalAmount.toFixed(4)}</p>
            <p className="text-xs text-gray-400 mt-1">
              ${portfolio.bitcoin.currentValue.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Gem className="w-5 h-5 text-purple-500" />
              <Badge variant="outline" className="text-xs">NFTs</Badge>
            </div>
            <p className="text-2xl font-bold text-white">
              {portfolio.ordinals.length + portfolio.runes.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Digital assets
            </p>
          </div>
        </div>

        {/* Portfolio Summary - Safe Version */}
        <div className="mt-4 bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-400">Portfolio Trend</span>
            </div>
            <div className="text-sm text-green-400">
              {portfolio.totalPNL >= 0 ? '+' : ''}${Math.abs(portfolio.totalPNL).toFixed(0)} ({portfolio.totalPNLPercentage.toFixed(2)}%)
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bitcoin Card */}
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-white">Bitcoin</span>
            </div>
            <Badge variant="default" className="bg-orange-600">
              {((portfolio.bitcoin.currentValue / portfolio.totalValue) * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Holdings</span>
              <span className="text-white">{portfolio.bitcoin.totalAmount.toFixed(8)} BTC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Value</span>
              <span className="text-white">${portfolio.bitcoin.currentValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Avg Price</span>
              <span className="text-white">${portfolio.bitcoin.averageBuyPrice.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Ordinals Card */}
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-white">Ordinals</span>
            </div>
            <Badge variant="outline">{portfolio.ordinals.length} items</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Collections</span>
              <span className="text-white">{new Set(portfolio.ordinals.map((o: any) => o.assetName.split('#')[0])).size}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Value</span>
              <span className="text-white">
                ${portfolio.ordinals.reduce((sum: number, o: any) => sum + o.currentValue, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Latest</span>
              <span className="text-white text-xs">
                {portfolio.ordinals[0]?.assetName.substring(0, 20)}...
              </span>
            </div>
          </div>
        </Card>

        {/* Runes Card */}
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-white">Runes</span>
            </div>
            <Badge variant="outline">{portfolio.runes.length} tokens</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tokens</span>
              <span className="text-white">{portfolio.runes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Value</span>
              <span className="text-white">
                ${portfolio.runes.reduce((sum: number, r: any) => sum + r.currentValue, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Top Rune</span>
              <span className="text-white text-xs">
                {portfolio.runes[0]?.assetName || 'None'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-900 border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Recent Activity
          </h3>
          <Badge variant="outline">{transactions.length} total</Badge>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 5).map((tx: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded ${tx.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {tx.type === 'buy' ? 
                    <TrendingDown className="w-4 h-4 text-green-500" /> : 
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.assetName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">${tx.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{tx.amount.toFixed(8)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}