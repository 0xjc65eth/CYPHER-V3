'use client';

import React, { useState } from 'react';
import { 
  Bitcoin, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Wallet,
  Activity,
  PieChart
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

interface WalletStatsProps {
  showValues?: boolean;
  onToggleVisibility?: () => void;
}

const WalletStats: React.FC<WalletStatsProps> = ({ 
  showValues = true, 
  onToggleVisibility 
}) => {
  const { balance, portfolioData, loading, refreshBalance, refreshPortfolio, isConnected } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshBalance(), refreshPortfolio()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!showValues) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatBitcoin = (value: number) => {
    if (!showValues) return '•••••';
    return `${value.toFixed(8)} BTC`;
  };

  const formatPercentage = (value: number) => {
    if (!showValues) return '••••';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp size={16} />;
    if (value < 0) return <TrendingDown size={16} />;
    return <Activity size={16} />;
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-8">
          <Wallet className="text-gray-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Wallet Connected</h3>
          <p className="text-sm text-gray-500">Connect your wallet to view your portfolio statistics</p>
        </div>
      </div>
    );
  }

  if (loading && !balance && !portfolioData) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Wallet Statistics</h2>
        
        <div className="flex items-center space-x-2">
          {/* Visibility Toggle */}
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={showValues ? "Hide values" : "Show values"}
            >
              {showValues ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Bitcoin Balance */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Bitcoin className="text-orange-400" size={20} />
              </div>
              <span className="text-sm font-medium text-gray-300">Bitcoin</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              {formatBitcoin(balance?.bitcoin || 0)}
            </p>
            <p className="text-sm text-gray-400">
              {formatCurrency((balance?.bitcoin || 0) * 42000)} {/* Mock BTC price */}
            </p>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-green-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="text-green-400" size={20} />
              </div>
              <span className="text-sm font-medium text-gray-300">Total Value</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              {formatCurrency(portfolioData?.totalValue || balance?.usd || 0)}
            </p>
            <div className="flex items-center space-x-1">
              {getChangeIcon(portfolioData?.totalPNLPercentage || 0)}
              <span className={`text-sm font-medium ${getChangeColor(portfolioData?.totalPNLPercentage || 0)}`}>
                {formatPercentage(portfolioData?.totalPNLPercentage || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="text-blue-400" size={20} />
              </div>
              <span className="text-sm font-medium text-gray-300">Total P&L</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${getChangeColor(portfolioData?.totalPNL || 0)}`}>
              {formatCurrency(portfolioData?.totalPNL || 0)}
            </p>
            <p className="text-sm text-gray-400">Realized + Unrealized</p>
          </div>
        </div>

        {/* Assets Count */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PieChart className="text-purple-400" size={20} />
              </div>
              <span className="text-sm font-medium text-gray-300">Assets</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              {showValues ? (
                (portfolioData?.ordinals?.length || 0) + 
                (portfolioData?.runes?.length || 0) + 
                (balance?.bitcoin ? 1 : 0)
              ) : '•••'}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>Ordinals: {showValues ? (portfolioData?.ordinals?.length || 0) : '••'}</span>
              <span>Runes: {showValues ? (portfolioData?.runes?.length || 0) : '••'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {portfolioData && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Portfolio Breakdown</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bitcoin Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                <Bitcoin size={16} className="text-orange-400" />
                <span>Bitcoin</span>
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white">{formatBitcoin(portfolioData.bitcoin.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Value:</span>
                  <span className="text-white">{formatCurrency(portfolioData.bitcoin.currentValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unrealized P&L:</span>
                  <span className={getChangeColor(portfolioData.bitcoin.unrealizedPNL)}>
                    {formatCurrency(portfolioData.bitcoin.unrealizedPNL)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ordinals */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                <span className="text-purple-400">🎨</span>
                <span>Ordinals</span>
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Count:</span>
                  <span className="text-white">{showValues ? portfolioData.ordinals.length : '••'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white">
                    {formatCurrency(portfolioData.ordinals.reduce((sum: number, o: any) => sum + o.currentValue, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Cost:</span>
                  <span className="text-white">
                    {formatCurrency(portfolioData.ordinals.reduce((sum: number, o: any) => sum + o.cost, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Runes */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                <span className="text-cyan-400">⚡</span>
                <span>Runes</span>
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Count:</span>
                  <span className="text-white">{showValues ? portfolioData.runes.length : '••'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white">
                    {formatCurrency(portfolioData.runes.reduce((sum: number, r: any) => sum + r.currentValue, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Cost:</span>
                  <span className="text-white">
                    {formatCurrency(portfolioData.runes.reduce((sum: number, r: any) => sum + r.cost, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletStats;