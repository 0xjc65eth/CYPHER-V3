'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  Info,
  ChevronRight,
  Bitcoin,
  Gem,
  Sparkles
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { AssetPNL, Transaction } from '@/types/portfolio';
import { format } from 'date-fns';

interface PortfolioPNLProps {
  onViewTransactions?: (assetType: string, assetId?: string) => void;
}

export function PortfolioPNL({ onViewTransactions }: PortfolioPNLProps) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchPortfolioData();
    }
  }, [wallet.isConnected, wallet.address]);

  const fetchPortfolioData = async () => {
    if (!wallet.address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/real-pnl/?address=${wallet.address}`);
      const data = await response.json();


      if (data.success && data.data) {
        setPortfolioData(data.data.portfolio);
      } else {
        setError(data.error || 'Failed to fetch portfolio data');
        console.error('Portfolio error:', data.error);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Error loading portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'bitcoin':
        return <Bitcoin className="w-5 h-5 text-orange-500" />;
      case 'ordinal':
        return <Gem className="w-5 h-5 text-purple-500" />;
      case 'rune':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatPNL = (value: number, percentage: number | undefined) => {
    const pct = percentage ?? 0;
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-semibold">
          {isPositive ? '+' : ''}{value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
        <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
          {isPositive ? '+' : ''}{pct.toFixed(2)}%
        </Badge>
      </div>
    );
  };

  const renderAssetPNL = (asset: AssetPNL) => {
    const totalAmount = asset.totalAmount ?? 0;
    const averageBuyPrice = asset.averageBuyPrice ?? 0;
    const currentPrice = asset.currentPrice ?? 0;

    return (
      <Card key={`${asset.assetType}-${asset.asset}`} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-6 hover:border-gray-600 transition-all duration-200 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-700/50 rounded-lg">
              {getAssetIcon(asset.assetType)}
            </div>
            <div>
              <h4 className="font-semibold text-white text-lg">{asset.assetName}</h4>
              <p className="text-sm text-gray-400">
                {totalAmount.toFixed(asset.assetType === 'bitcoin' ? 8 : 2)}
                {asset.assetType === 'bitcoin' ? ' BTC' : ' units'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewTransactions?.(asset.assetType, asset.asset)}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Info className="w-4 h-4 mr-1" />
            Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Avg Buy Price</p>
            <p className="font-medium text-white">
              ${averageBuyPrice.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Price</p>
            <p className="font-medium text-white">
              ${currentPrice.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Realized P&L</span>
            {formatPNL(asset.realizedPNL, asset.totalCost ? (asset.realizedPNL / asset.totalCost) * 100 : 0)}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Unrealized P&L</span>
            {formatPNL(asset.unrealizedPNL, asset.totalCost ? (asset.unrealizedPNL / asset.totalCost) * 100 : 0)}
          </div>
          <div className="pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-medium text-white">Total P&L</span>
              {formatPNL(asset.totalPNL, asset.pnlPercentage)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{asset.totalBuys ?? 0} buys • {asset.totalSells ?? 0} sells</span>
          {asset.lastActivityDate && (
            <span>Last: {format(new Date(asset.lastActivityDate), 'MMM d, yyyy')}</span>
          )}
        </div>
      </Card>
    );
  };

  if (!wallet.isConnected) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <p className="text-red-400">{error}</p>
      </Card>
    );
  }

  if (!portfolioData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 p-6 shadow-xl">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-orange-500" />
          Portfolio Performance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Total Value
            </p>
            <p className="text-2xl font-bold text-white">
              ${portfolioData.totalValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">Total Invested</p>
            <p className="text-2xl font-bold text-white">
              ${portfolioData.totalCost.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">Total P&L</p>
            {formatPNL(portfolioData.totalPNL, portfolioData.totalPNLPercentage)}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">24h Change</p>
            {formatPNL(portfolioData.dailyPNL, portfolioData.totalValue ? (portfolioData.dailyPNL / portfolioData.totalValue) * 100 : 0)}
          </div>
        </div>

        {/* Best/Worst Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioData.bestPerformer && (
            <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
              <p className="text-xs text-green-400 mb-2">Best Performer</p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">
                  {(portfolioData.bestPerformer as any)?.asset?.assetName || 'N/A'}
                </span>
                <Badge variant="default" className="bg-green-600">
                  +{((portfolioData.bestPerformer as any)?.pnlPercentage || 0).toFixed(2)}%
                </Badge>
              </div>
            </div>
          )}

          {portfolioData.worstPerformer && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-xs text-red-400 mb-2">Worst Performer</p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">
                  {(portfolioData.worstPerformer as any)?.asset?.assetName || 'N/A'}
                </span>
                <Badge variant="destructive">
                  {((portfolioData.worstPerformer as any)?.pnlPercentage || 0).toFixed(2)}%
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Asset Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Assets P&L</h3>

        {/* Bitcoin */}
        {(portfolioData as any)?.bitcoin?.totalAmount > 0 && renderAssetPNL((portfolioData as any).bitcoin)}

        {/* Ordinals */}
        {(portfolioData as any)?.ordinals?.length > 0 && (
          <>
            <h4 className="text-md font-medium text-gray-300 mt-4">Ordinals</h4>
            {(portfolioData as any).ordinals.map((ordinal: AssetPNL) => renderAssetPNL(ordinal))}
          </>
        )}

        {/* Runes */}
        {(portfolioData as any)?.runes?.length > 0 && (
          <>
            <h4 className="text-md font-medium text-gray-300 mt-4">Runes</h4>
            {(portfolioData as any).runes.map((rune: AssetPNL) => renderAssetPNL(rune))}
          </>
        )}
      </div>
    </div>
  );
}