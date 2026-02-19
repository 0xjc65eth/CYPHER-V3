'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Hash, Coins, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'market' | 'block' | 'fee';
  timestamp: Date;
  title: string;
  description: string;
  value?: string;
  priority?: 'high' | 'medium' | 'low';
}

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchActivity = useCallback(async () => {
    try {
      // Fetch real data from mempool.space for recent blocks
      const [blocksRes, feesRes] = await Promise.allSettled([
        fetch('/api/mempool/?endpoint=/v1/blocks'),
        fetch('/api/mempool/?endpoint=/v1/fees/recommended'),
      ]);

      if (!mountedRef.current) return;

      const items: ActivityItem[] = [];

      // Parse recent blocks
      if (blocksRes.status === 'fulfilled' && blocksRes.value.ok) {
        const blocks = await blocksRes.value.json();
        if (Array.isArray(blocks)) {
          blocks.slice(0, 5).forEach((block: any) => {
            items.push({
              id: `block-${block.height}`,
              type: 'block',
              timestamp: new Date((block.timestamp || 0) * 1000),
              title: `Block #${block.height}`,
              description: `${block.tx_count || 0} transactions, ${((block.size || 0) / 1024).toFixed(0)} KB`,
              value: block.extras?.pool?.name || 'Unknown Miner',
              priority: 'medium',
            });
          });
        }
      }

      // Parse fee data
      if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
        const fees = await feesRes.value.json();
        items.push({
          id: `fee-${Date.now()}`,
          type: 'fee',
          timestamp: new Date(),
          title: 'Fee Update',
          description: `Fast: ${fees.fastestFee} sat/vB | Medium: ${fees.halfHourFee} sat/vB | Slow: ${fees.hourFee} sat/vB`,
          value: `${fees.fastestFee} sat/vB`,
          priority: fees.fastestFee > 50 ? 'high' : fees.fastestFee > 20 ? 'medium' : 'low',
        });
      }

      // Sort by timestamp descending
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setActivities(items);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('LiveActivityFeed fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchActivity();

    const interval = setInterval(fetchActivity, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchActivity]);

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'block': return <Hash className="w-4 h-4" />;
      case 'fee': return <Coins className="w-4 h-4" />;
      case 'market': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'block': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'fee': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'market': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter);

  return (
    <Card className="bg-gray-900 border-gray-800 p-4 h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Live Activity Feed
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700"
          >
            <option value="all">All Events</option>
            <option value="block">Blocks</option>
            <option value="fee">Fees</option>
            <option value="market">Market</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-gray-400">Loading activity...</span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No activity data available</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                      {getIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-white">{activity.title}</h4>
                        {activity.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">HIGH</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.value && (
                      <p className="text-sm font-medium text-white">{activity.value}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Activity Stats */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Events</div>
            <div className="text-sm font-bold text-white">{activities.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Blocks</div>
            <div className="text-sm font-bold text-orange-500">
              {activities.filter(a => a.type === 'block').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Fee Updates</div>
            <div className="text-sm font-bold text-purple-500">
              {activities.filter(a => a.type === 'fee').length}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
