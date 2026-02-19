/**
 * 🟡 BRC-20 PORTFOLIO COMPONENT
 * Professional portfolio management with real-time balances and analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { brc20Service, type BRC20Portfolio, type BRC20Balance } from '@/services/BRC20Service';
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  Send,
  Coins,
  PieChart
} from 'lucide-react';

interface BRC20PortfolioProps {
  address?: string;
}

export function BRC20Portfolio({ address: propAddress }: BRC20PortfolioProps) {
  const { address: connectedAddress } = useLaserEyes();
  const address = propAddress || connectedAddress;
  
  const [portfolio, setPortfolio] = useState<BRC20Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'balance' | 'percentage'>('value');

  useEffect(() => {
    if (address) {
      loadPortfolio(address);
    }
  }, [address]);

  const loadPortfolio = async (addr: string) => {
    if (!addr) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const portfolioData = await brc20Service.getBRC20Portfolio(addr);
      setPortfolio(portfolioData);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLoad = () => {
    if (manualAddress.trim()) {
      loadPortfolio(manualAddress.trim());
    }
  };

  const handleRefresh = () => {
    if (address) {
      loadPortfolio(address);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
  };

  const formatPrice = (price: number) => {
    if (price < 0.000001) {
      return `$${price.toExponential(2)}`;
    }
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatNumber = (num: number, compact = false) => {
    if (compact && num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (compact && num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (compact && num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const sortedBalances = portfolio?.balances
    .filter(balance => parseFloat(balance.balance) > 0)
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.value - a.value;
        case 'balance':
          return parseFloat(b.balance) - parseFloat(a.balance);
        case 'percentage':
          return b.percentage - a.percentage;
        default:
          return 0;
      }
    }) || [];

  if (!address && !manualAddress) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8">
        <div className="text-center">
          <Wallet className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect Wallet or Enter Address</h3>
          <p className="text-gray-400 mb-6">
            Connect your wallet or enter a Bitcoin address to view BRC-20 portfolio
          </p>
          
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Input
              placeholder="Enter Bitcoin address..."
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="bg-gray-800 border-gray-600"
            />
            <Button onClick={handleManualLoad} disabled={!manualAddress.trim()}>
              Load
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-500" />
              BRC-20 Portfolio
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm font-mono">
                {address || manualAddress}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyAddress(address || manualAddress)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="border-gray-600 hover:border-gray-500"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
            <Button onClick={() => setError(null)} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {portfolio && !loading && (
          <>
            {/* Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Value</p>
                    <p className="text-xl font-bold text-white">
                      ${formatNumber(portfolio.totalValueUSD, true)}
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Tokens Held</p>
                    <p className="text-xl font-bold text-white">{portfolio.tokenCount}</p>
                  </div>
                  <Coins className="w-6 h-6 text-blue-500" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">24h Performance</p>
                    <p className={`text-xl font-bold ${
                      portfolio.performance24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {portfolio.performance24h >= 0 ? '+' : ''}{portfolio.performance24h.toFixed(1)}%
                    </p>
                  </div>
                  {portfolio.performance24h >= 0 ? 
                    <TrendingUp className="w-6 h-6 text-green-500" /> :
                    <TrendingDown className="w-6 h-6 text-red-500" />
                  }
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">30d Performance</p>
                    <p className={`text-xl font-bold ${
                      portfolio.performance30d >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {portfolio.performance30d >= 0 ? '+' : ''}{portfolio.performance30d.toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-orange-500" />
                </div>
              </Card>
            </div>

            {/* Holdings Table */}
            <Card className="bg-gray-800 border-gray-700">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-orange-500" />
                    Token Holdings ({sortedBalances.length})
                  </h4>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-gray-900 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-orange-500 focus:outline-none cursor-pointer"
                  >
                    <option value="value">Sort by Value</option>
                    <option value="balance">Sort by Balance</option>
                    <option value="percentage">Sort by %</option>
                  </select>
                </div>

                {sortedBalances.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-700">
                        <tr className="text-left text-gray-400 text-sm">
                          <th className="pb-3 font-medium">Token</th>
                          <th className="pb-3 font-medium text-right">Balance</th>
                          <th className="pb-3 font-medium text-right">Transferable</th>
                          <th className="pb-3 font-medium text-right">Value</th>
                          <th className="pb-3 font-medium text-right">Portfolio %</th>
                          <th className="pb-3 font-medium text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBalances.map((balance) => (
                          <BalanceRow 
                            key={balance.ticker} 
                            balance={balance}
                            formatPrice={formatPrice}
                            formatNumber={formatNumber}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No BRC-20 tokens found in this address</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
}

interface BalanceRowProps {
  balance: BRC20Balance;
  formatPrice: (price: number) => string;
  formatNumber: (num: number, compact?: boolean) => string;
}

function BalanceRow({ balance, formatPrice, formatNumber }: BalanceRowProps) {
  const handleTrade = () => {
    const platforms = brc20Service.getBRC20TradingPlatforms(balance.ticker);
    window.open(platforms[0].url, '_blank');
  };

  const handleViewDetails = () => {
    window.open(`https://ordiscan.com/brc20/${balance.ticker}`, '_blank');
  };

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs uppercase">
              {balance.ticker.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="font-semibold text-white uppercase font-mono">{balance.ticker}</div>
          </div>
        </div>
      </td>
      
      <td className="py-4 text-right">
        <div className="font-mono text-white">
          {formatNumber(parseFloat(balance.balance))}
        </div>
      </td>
      
      <td className="py-4 text-right">
        <div className="font-mono text-white">
          {formatNumber(parseFloat(balance.transferable))}
        </div>
        <div className="text-xs text-gray-400">
          {parseFloat(balance.transferable) > 0 ? 
            `${((parseFloat(balance.transferable) / parseFloat(balance.balance)) * 100).toFixed(1)}%` : 
            '0%'
          }
        </div>
      </td>
      
      <td className="py-4 text-right">
        <div className="font-mono text-white">
          {formatPrice(balance.value)}
        </div>
      </td>
      
      <td className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-white font-medium">
            {balance.percentage.toFixed(1)}%
          </span>
          <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              style={{ width: `${Math.min(balance.percentage, 100)}%` }}
            />
          </div>
        </div>
      </td>
      
      <td className="py-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewDetails}
            className="border-gray-600 hover:border-gray-500"
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            onClick={handleTrade}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}