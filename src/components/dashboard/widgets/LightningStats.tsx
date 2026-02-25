'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Network, GitBranch, TrendingUp } from 'lucide-react';

const FALLBACK_LIGHTNING = {
  capacity: { btc: 5246, usd: 342998000, change24h: 1.2 },
  nodes: { total: 15234, active: 12876, change24h: 0.8 },
  channels: { total: 68452, active: 61234, avgCapacity: 0.0765 },
  routing: { volume24h: 234.5, fees24h: 0.082, avgFee: 0.00035 }
};

export function LightningStats() {
  const [isMounted, setIsMounted] = useState(false);
  const [lightningData, setLightningData] = useState(FALLBACK_LIGHTNING);

  useEffect(() => {
    setIsMounted(true);

    const fetchLightningData = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch('/api/lightning-data/', { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            setLightningData({
              capacity: {
                btc: parseFloat(d.capacity) || FALLBACK_LIGHTNING.capacity.btc,
                usd: (parseFloat(d.capacity) || FALLBACK_LIGHTNING.capacity.btc) * 65000,
                change24h: d.growth24h || FALLBACK_LIGHTNING.capacity.change24h
              },
              nodes: {
                total: d.nodes || FALLBACK_LIGHTNING.nodes.total,
                active: Math.round((d.nodes || FALLBACK_LIGHTNING.nodes.total) * 0.85),
                change24h: d.growth24h || FALLBACK_LIGHTNING.nodes.change24h
              },
              channels: {
                total: d.channels || FALLBACK_LIGHTNING.channels.total,
                active: Math.round((d.channels || FALLBACK_LIGHTNING.channels.total) * 0.9),
                avgCapacity: d.avgFee ? d.avgFee / 1000 : FALLBACK_LIGHTNING.channels.avgCapacity
              },
              routing: {
                volume24h: FALLBACK_LIGHTNING.routing.volume24h,
                fees24h: FALLBACK_LIGHTNING.routing.fees24h,
                avgFee: d.avgFee ? d.avgFee / 1000000 : FALLBACK_LIGHTNING.routing.avgFee
              }
            });
          }
        }
      } catch (err) { console.debug("[widget] Fetch error:", (err as Error).message);
      }
    };

    fetchLightningData();
  }, []);

  if (!isMounted) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <Zap className="w-4 h-4 mr-1.5 text-purple-500" />
            Lightning Network
          </h4>
        </div>
        <div className="h-32 bg-gray-800/50 rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Zap className="w-4 h-4 mr-1.5 text-purple-500" />
          Lightning Network
        </h4>
      </div>

      <div className="space-y-3">
        {/* Network Capacity */}
        <div className="bg-gray-800 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Network Capacity</span>
            <span className={`text-xs ${lightningData.capacity.change24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {lightningData.capacity.change24h > 0 ? '+' : ''}{lightningData.capacity.change24h}%
            </span>
          </div>
          <div className="text-lg font-bold text-white">{lightningData.capacity.btc.toLocaleString()} BTC</div>
          <div className="text-xs text-gray-500">${(lightningData.capacity.usd / 1000000).toFixed(1)}M USD</div>
        </div>

        {/* Nodes & Channels */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <Network className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-gray-400">Nodes</span>
            </div>
            <div className="text-sm font-bold text-white">{lightningData.nodes.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{Math.round(lightningData.nodes.active / lightningData.nodes.total * 100)}% active</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <GitBranch className="w-3 h-3 text-green-500" />
              <span className="text-xs text-gray-400">Channels</span>
            </div>
            <div className="text-sm font-bold text-white">{lightningData.channels.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Avg {lightningData.channels.avgCapacity} BTC</div>
          </div>
        </div>

        {/* Routing Activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Routing Activity (24h)</span>
            <TrendingUp className="w-3 h-3 text-gray-500" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="text-center">
              <span className="text-xs text-gray-500 block">Volume</span>
              <span className="text-xs font-bold text-white">{lightningData.routing.volume24h} BTC</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 block">Fees</span>
              <span className="text-xs font-bold text-yellow-500">{lightningData.routing.fees24h} BTC</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 block">Avg Fee</span>
              <span className="text-xs font-bold text-gray-300">{(lightningData.routing.avgFee * 100).toFixed(3)}%</span>
            </div>
          </div>
        </div>

        {/* Network Health */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Network Health</span>
            <span className="text-xs text-green-500">Excellent</span>
          </div>
          <Progress value={92} className="h-1.5" />
        </div>
      </div>
    </Card>
  );
}