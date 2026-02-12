/**
 * 🟡 BRC-20 MINT TRACKER COMPONENT
 * Real-time mint activity tracker with live data from Hiro API
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HiroBRC20API } from '@/lib/api/hiro/brc20';
import type { BRC20Activity } from '@/lib/api/hiro/types';
import {
  Activity,
  Clock,
  User,
  Hash,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Coins,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MintTrackerProps {
  ticker?: string;
  limit?: number;
}

export function BRC20MintTracker({ ticker, limit = 20 }: MintTrackerProps) {
  const [activities, setActivities] = useState<BRC20Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<'all' | 'deploy' | 'mint' | 'transfer'>('all');

  const hiroAPI = new HiroBRC20API();

  useEffect(() => {
    loadActivities();
  }, [ticker, selectedOperation]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      if (ticker) {
        // Load activity for specific token
        const response = await hiroAPI.getActivity(ticker, {
          limit,
          operation: selectedOperation === 'all' ? undefined : selectedOperation
        });
        setActivities(response.results);
      } else {
        // Load global activity - fetch from multiple tokens
        const tokensResponse = await hiroAPI.getTokens({ limit: 10 });
        const allActivities: BRC20Activity[] = [];

        for (const token of tokensResponse.results) {
          try {
            const activityResponse = await hiroAPI.getActivity(token.ticker, {
              limit: 5,
              operation: selectedOperation === 'all' ? undefined : selectedOperation
            });
            allActivities.push(...activityResponse.results);
          } catch (err) {
            console.error(`Failed to fetch activity for ${token.ticker}`);
          }
        }

        // Sort by timestamp and limit
        allActivities.sort((a, b) => b.timestamp - a.timestamp);
        setActivities(allActivities.slice(0, limit));
      }
    } catch (err) {
      console.error('Failed to load BRC-20 activities:', err);
      setError('Failed to load mint activity data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
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

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'deploy':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'mint':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'transfer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'deploy':
        return <Coins className="w-4 h-4" />;
      case 'mint':
        return <TrendingUp className="w-4 h-4" />;
      case 'transfer':
        return <Activity className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to Load Activity</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="text-xl font-bold text-white">
                {ticker ? `${ticker.toUpperCase()} Activity` : 'BRC-20 Activity Feed'}
              </h3>
              <p className="text-sm text-gray-400">Real-time mint and transfer tracking</p>
            </div>
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

        {/* Operation Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'deploy', 'mint', 'transfer'] as const).map((operation) => (
            <Button
              key={operation}
              size="sm"
              variant={selectedOperation === operation ? "default" : "outline"}
              onClick={() => setSelectedOperation(operation)}
              className={cn(
                "text-xs capitalize",
                selectedOperation === operation && "bg-orange-600 hover:bg-orange-700"
              )}
            >
              {operation}
            </Button>
          ))}
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No activity found</p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityRow key={activity.inscription_id} activity={activity} />
            ))
          )}
        </div>

        {/* Stats Footer */}
        {activities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {activities.filter(a => a.operation === 'deploy').length}
                </div>
                <div className="text-xs text-gray-400">Deploys</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {activities.filter(a => a.operation === 'mint').length}
                </div>
                <div className="text-xs text-gray-400">Mints</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {activities.filter(a => a.operation === 'transfer').length}
                </div>
                <div className="text-xs text-gray-400">Transfers</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
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

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'deploy':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'mint':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'transfer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'deploy':
        return <Coins className="w-4 h-4" />;
      case 'mint':
        return <TrendingUp className="w-4 h-4" />;
      case 'transfer':
        return <Activity className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Operation Badge */}
          <Badge className={cn("capitalize", getOperationColor(activity.operation))}>
            <span className="flex items-center gap-1">
              {getOperationIcon(activity.operation)}
              {activity.operation}
            </span>
          </Badge>

          {/* Activity Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white uppercase font-mono">
                {activity.ticker}
              </span>
              {activity.valid && (
                <CheckCircle className="h-3 w-3 text-green-400" />
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {formatAddress(activity.address)}
              </span>

              {activity.to_address && (
                <>
                  <span>→</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {formatAddress(activity.to_address)}
                  </span>
                </>
              )}
            </div>

            {activity.amount && (
              <div className="mt-1 text-sm font-mono text-orange-400">
                Amount: {activity.amount}
              </div>
            )}
          </div>
        </div>

        {/* Timestamp and Block */}
        <div className="text-right text-sm">
          <div className="flex items-center gap-1 text-gray-400 mb-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(activity.timestamp)}
          </div>
          <div className="text-xs text-gray-500">
            Block #{activity.block_height.toLocaleString()}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`https://ordiscan.com/tx/${activity.tx_id}`, '_blank')}
            className="mt-1 h-6 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
