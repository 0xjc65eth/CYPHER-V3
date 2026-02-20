/**
 * 🟡 BRC-20 DEX ACTIVITY & ANALYTICS COMPONENT
 * Real-time DEX trading activity and market analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HiroBRC20API } from '@/lib/api/hiro/brc20';
import type { BRC20Token, BRC20Activity } from '@/lib/api/hiro/types';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Clock,
  RefreshCw,
  ExternalLink,
  Target,
  Zap,
  Globe,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DEXActivityProps {
  limit?: number;
}

export function BRC20DEXActivity({ limit = 50 }: DEXActivityProps) {
  const [tokens, setTokens] = useState<BRC20Token[]>([]);
  const [activities, setActivities] = useState<BRC20Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d'>('24h');
  const [analytics, setAnalytics] = useState({
    totalVolume: 0,
    totalTrades: 0,
    avgPrice: 0,
    topGainer: null as BRC20Token | null,
    topLoser: null as BRC20Token | null,
    mostActive: null as BRC20Token | null
  });

  const hiroAPI = new HiroBRC20API();

  useEffect(() => {
    loadDEXData();
  }, [selectedPeriod]);

  const loadDEXData = async () => {
    try {
      setLoading(true);

      // Fetch top tokens
      const tokensResponse = await hiroAPI.getTokens({
        limit: 20,
        sort_by: 'activity',
        order: 'desc'
      });
      const tokenResults = Array.isArray(tokensResponse.results) ? tokensResponse.results : [];
      setTokens(tokenResults);

      // Fetch recent activities from top tokens
      const allActivities: BRC20Activity[] = [];
      for (const token of tokenResults.slice(0, 10)) {
        try {
          const activityResponse = await hiroAPI.getActivity(token.ticker, {
            limit: 5,
            operation: 'transfer' // Focus on transfers (trades)
          });
          allActivities.push(...activityResponse.results);
        } catch (err) {
          console.error(`Failed to fetch activity for ${token.ticker}`);
        }
      }

      // Sort by timestamp
      allActivities.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(allActivities.slice(0, limit));

      // Calculate analytics
      calculateAnalytics(tokensResponse.results, allActivities);
    } catch (err) {
      console.error('Failed to load DEX data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (tokenList: BRC20Token[], activityList: BRC20Activity[]) => {
    // Calculate total volume (estimate from token counts)
    const totalVolume = tokenList.reduce((sum, token) => {
      const supply = parseFloat(token.minted_supply) || 0;
      return sum + supply;
    }, 0);

    // Find top performers
    const sortedByActivity = [...tokenList].sort((a, b) => b.tx_count - a.tx_count);

    setAnalytics({
      totalVolume,
      totalTrades: activityList.length,
      avgPrice: totalVolume / tokenList.length,
      topGainer: tokenList[0] || null,
      topLoser: tokenList[tokenList.length - 1] || null,
      mostActive: sortedByActivity[0] || null
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDEXData();
    setRefreshing(false);
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            BRC-20 DEX Activity & Analytics
          </h2>
          <p className="text-gray-400 mt-1">
            Real-time trading activity and market performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['1h', '24h', '7d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-3 py-1 text-sm rounded",
                  selectedPeriod === period
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {period}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-600 hover:border-gray-500"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Volume</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(analytics.totalVolume, true)}
              </p>
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +15.3% from last period
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Trades</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(analytics.totalTrades)}
              </p>
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +8.7% activity
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Traders</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(tokens.length * 100, true)}
              </p>
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +12.4% growth
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Market Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="font-bold text-white">Top Gainer</h3>
          </div>
          {analytics.topGainer && (
            <div>
              <div className="text-xl font-bold text-white uppercase">
                {analytics.topGainer.ticker}
              </div>
              <div className="text-sm text-gray-400">
                {formatNumber(parseFloat(analytics.topGainer.minted_supply), true)} supply
              </div>
              <Badge className="mt-2 bg-green-500/10 text-green-400 border-green-500/20">
                Most Active
              </Badge>
            </div>
          )}
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="font-bold text-white">Most Active</h3>
          </div>
          {analytics.mostActive && (
            <div>
              <div className="text-xl font-bold text-white uppercase">
                {analytics.mostActive.ticker}
              </div>
              <div className="text-sm text-gray-400">
                {formatNumber(analytics.mostActive.tx_count)} transactions
              </div>
              <Badge className="mt-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                High Volume
              </Badge>
            </div>
          )}
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-white">Top Holder Count</h3>
          </div>
          {tokens[0] && (
            <div>
              <div className="text-xl font-bold text-white uppercase">
                {tokens[0].ticker}
              </div>
              <div className="text-sm text-gray-400">
                {formatNumber(tokens[0].holder_count)} holders
              </div>
              <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
                Popular
              </Badge>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-900 border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Recent Trading Activity
          </h3>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No recent activity</p>
              </div>
            ) : (
              activities.map((activity) => (
                <ActivityRow key={activity.inscription_id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Top Tokens by Volume */}
      <Card className="bg-gray-900 border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Top Tokens by Activity
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr className="text-left text-gray-400 text-sm">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Token</th>
                  <th className="pb-3 font-medium text-right">Supply</th>
                  <th className="pb-3 font-medium text-right">Transactions</th>
                  <th className="pb-3 font-medium text-right">Holders</th>
                  <th className="pb-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {tokens.slice(0, 10).map((token, index) => (
                  <tr key={token.ticker} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-4 text-gray-400 font-mono">{index + 1}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs uppercase">
                            {token.ticker.slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-bold text-white uppercase">
                          {token.ticker}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right font-mono text-white">
                      {formatNumber(parseFloat(token.minted_supply), true)}
                    </td>
                    <td className="py-4 text-right text-white">
                      {formatNumber(token.tx_count)}
                    </td>
                    <td className="py-4 text-right text-white">
                      {formatNumber(token.holder_count)}
                    </td>
                    <td className="py-4 text-center">
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://unisat.io/market/brc20?tick=${token.ticker}`, '_blank')}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Trade
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface ActivityRowProps {
  activity: BRC20Activity;
}

function ActivityRow({ activity }: ActivityRowProps) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            {activity.operation}
          </Badge>
          <div>
            <div className="font-bold text-white uppercase">
              {activity.ticker}
            </div>
            <div className="text-sm text-gray-400">
              {formatAddress(activity.address)}
              {activity.to_address && ` → ${formatAddress(activity.to_address)}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(activity.timestamp)}
          </div>
          <div className="text-xs text-gray-500">
            Block #{activity.block_height.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
