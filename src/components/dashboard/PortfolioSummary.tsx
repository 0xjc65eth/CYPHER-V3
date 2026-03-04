'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart,
  Activity,
  Timer,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { formatUSD, formatPct, formatCompactNumber } from '@/utils/formatters';

interface PortfolioSummaryProps {
  showValues?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  colorScheme: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'gray';
  showValues: boolean;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  subtitle, 
  icon, 
  colorScheme, 
  showValues,
  loading = false 
}) => {
  const colorClasses = {
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    gray: 'bg-gray-500/20 border-gray-500/30 text-gray-400'
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight size={12} />;
    if (value < 0) return <ArrowDownRight size={12} />;
    return <Minus size={12} />;
  };

  const formatValue = () => {
    if (!showValues) return '••••••';
    if (typeof value === 'number') {
      if (value >= 1000) return formatCompactNumber(value);
      return formatUSD(value);
    }
    return value;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
            <div className="w-20 h-4 bg-gray-700 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-gray-700 rounded"></div>
          <div className="w-16 h-3 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all duration-200 group">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${colorClasses[colorScheme]}`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs ${getChangeColor(change)}`}>
            {getChangeIcon(change)}
            <span>{showValues ? formatPct(change) : '••••'}</span>
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">
          {formatValue()}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-400">{showValues ? subtitle : '••••••••••'}</p>
        )}
      </div>
    </div>
  );
};

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ showValues = true }) => {
  const { portfolioData, balance, loading, isConnected } = useWallet();

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!portfolioData) {
      return {
        totalValue: (balance || 0) * 42000,
        totalPNL: 0,
        totalPNLPercentage: 0,
        bitcoinValue: (balance || 0) * 42000, // Mock BTC price
        ordinalsValue: 0,
        runesValue: 0,
        realizedPNL: 0,
        unrealizedPNL: 0,
        totalCost: 0
      };
    }

    const ordinalsValue = portfolioData.ordinals.reduce((sum: number, o: any) => sum + o.currentValue, 0);
    const runesValue = portfolioData.runes.reduce((sum: number, r: any) => sum + r.currentValue, 0);

    return {
      totalValue: portfolioData.totalValue,
      totalPNL: portfolioData.totalPNL,
      totalPNLPercentage: portfolioData.totalPNLPercentage,
      bitcoinValue: portfolioData.bitcoin.currentValue,
      ordinalsValue,
      runesValue,
      realizedPNL: portfolioData.bitcoin.realizedPNL,
      unrealizedPNL: portfolioData.bitcoin.unrealizedPNL,
      totalCost: portfolioData.totalCost
    };
  }, [portfolioData, balance]);

  const formatCurrency = (value: number) => formatUSD(value);

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-8">
          <PieChart className="text-gray-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Portfolio Summary</h3>
          <p className="text-sm text-gray-500">Connect your wallet to view your portfolio summary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Portfolio Summary</h2>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Timer size={12} />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <StatCard
          title="Total Portfolio"
          value={formatCurrency(portfolioMetrics.totalValue)}
          change={portfolioMetrics.totalPNLPercentage}
          subtitle={`Cost: ${formatCurrency(portfolioMetrics.totalCost)}`}
          icon={<DollarSign size={20} />}
          colorScheme="blue"
          showValues={showValues}
          loading={loading}
        />

        <StatCard
          title="Total P&L"
          value={formatCurrency(portfolioMetrics.totalPNL)}
          subtitle={portfolioMetrics.totalPNL >= 0 ? 'Profit' : 'Loss'}
          icon={portfolioMetrics.totalPNL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          colorScheme={portfolioMetrics.totalPNL >= 0 ? 'green' : 'red'}
          showValues={showValues}
          loading={loading}
        />

        <StatCard
          title="Bitcoin Holdings"
          value={formatCurrency(portfolioMetrics.bitcoinValue)}
          subtitle={`${balance?.toFixed(8) || '0.00000000'} BTC`}
          icon={<Activity size={20} />}
          colorScheme="orange"
          showValues={showValues}
          loading={loading}
        />

        <StatCard
          title="Digital Assets"
          value={`${(portfolioData?.ordinals?.length || 0) + (portfolioData?.runes?.length || 0)}`}
          subtitle={`${portfolioData?.ordinals?.length || 0} Ordinals, ${portfolioData?.runes?.length || 0} Runes`}
          icon={<PieChart size={20} />}
          colorScheme="purple"
          showValues={showValues}
          loading={loading}
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Asset Distribution */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <BarChart3 size={20} className="text-blue-400" />
            <span>Asset Distribution</span>
          </h3>
          
          <div className="space-y-4">
            {/* Bitcoin */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Bitcoin</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {showValues ? formatCurrency(portfolioMetrics.bitcoinValue) : '••••••'}
                </p>
                <p className="text-xs text-gray-400">
                  {showValues ? `${formatCompactNumber((portfolioMetrics.bitcoinValue / portfolioMetrics.totalValue) * 100, 1)}%` : '••%'}
                </p>
              </div>
            </div>

            {/* Ordinals */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Ordinals</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {showValues ? formatCurrency(portfolioMetrics.ordinalsValue) : '••••••'}
                </p>
                <p className="text-xs text-gray-400">
                  {showValues ? `${formatCompactNumber((portfolioMetrics.ordinalsValue / portfolioMetrics.totalValue) * 100, 1)}%` : '••%'}
                </p>
              </div>
            </div>

            {/* Runes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Runes</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {showValues ? formatCurrency(portfolioMetrics.runesValue) : '••••••'}
                </p>
                <p className="text-xs text-gray-400">
                  {showValues ? `${formatCompactNumber((portfolioMetrics.runesValue / portfolioMetrics.totalValue) * 100, 1)}%` : '••%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Target size={20} className="text-green-400" />
            <span>P&L Breakdown</span>
          </h3>
          
          <div className="space-y-4">
            {/* Realized P&L */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Realized P&L</span>
              <span className={`text-sm font-medium ${
                portfolioMetrics.realizedPNL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {showValues ? formatCurrency(portfolioMetrics.realizedPNL) : '••••••'}
              </span>
            </div>

            {/* Unrealized P&L */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Unrealized P&L</span>
              <span className={`text-sm font-medium ${
                portfolioMetrics.unrealizedPNL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {showValues ? formatCurrency(portfolioMetrics.unrealizedPNL) : '••••••'}
              </span>
            </div>

            {/* Total P&L */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <span className="text-sm font-medium text-white">Total P&L</span>
              <span className={`text-lg font-bold ${
                portfolioMetrics.totalPNL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {showValues ? formatCurrency(portfolioMetrics.totalPNL) : '••••••'}
              </span>
            </div>

            {/* P&L Percentage */}
            <div className="flex items-center justify-center">
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                portfolioMetrics.totalPNLPercentage >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {portfolioMetrics.totalPNLPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>
                  {showValues ? formatPct(portfolioMetrics.totalPNLPercentage) : '••••%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;