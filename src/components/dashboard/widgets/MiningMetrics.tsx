'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Hammer, DollarSign, Gauge, Users, TrendingUp } from 'lucide-react';

const FALLBACK_MINING = {
  profitability: { btcPerTH: 0.0000073, usdPerTH: 0.47, change24h: -2.3 },
  pools: [
    { name: 'Foundry', hashrate: 28.5, blocks: 42 },
    { name: 'AntPool', hashrate: 22.3, blocks: 35 },
    { name: 'F2Pool', hashrate: 15.7, blocks: 24 },
    { name: 'Others', hashrate: 33.5, blocks: 53 }
  ],
  efficiency: { avgWattPerTH: 29.5, breakEven: 0.08, roi: 245 }
};

export function MiningMetrics() {
  const [isMounted, setIsMounted] = useState(false);
  const [miningData, setMiningData] = useState(FALLBACK_MINING);

  useEffect(() => {
    setIsMounted(true);

    const fetchMiningData = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch('/api/mining-data/', { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            setMiningData({
              profitability: {
                btcPerTH: d.profitability ? d.profitability / 10000 : FALLBACK_MINING.profitability.btcPerTH,
                usdPerTH: d.profitability ? (d.profitability / 10000) * 65000 : FALLBACK_MINING.profitability.usdPerTH,
                change24h: FALLBACK_MINING.profitability.change24h
              },
              pools: d.pools || FALLBACK_MINING.pools,
              efficiency: d.efficiency || FALLBACK_MINING.efficiency
            });
          }
        }
      } catch (err) { console.debug("[widget] Fetch error:", (err as Error).message);
      }
    };

    fetchMiningData();
  }, []);

  const totalBlocks = miningData.pools.reduce((sum, pool) => sum + pool.blocks, 0);

  if (!isMounted) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <Hammer className="w-4 h-4 mr-1.5 text-yellow-500" />
            Mining Metrics
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
          <Hammer className="w-4 h-4 mr-1.5 text-yellow-500" />
          Mining Metrics
        </h4>
      </div>

      <div className="space-y-3">
        {/* Profitability */}
        <div className="bg-gray-800 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 flex items-center">
              <DollarSign className="w-3 h-3 mr-1" />
              Profitability
            </span>
            <span className={`text-xs ${miningData.profitability.change24h < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {miningData.profitability.change24h > 0 ? '+' : ''}{miningData.profitability.change24h}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-xs text-gray-500 block">BTC/TH/day</span>
              <span className="text-xs font-bold text-white">{miningData.profitability.btcPerTH}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">USD/TH/day</span>
              <span className="text-xs font-bold text-green-500">${miningData.profitability.usdPerTH}</span>
            </div>
          </div>
        </div>

        {/* Pool Distribution */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Pool Distribution (24h)
            </span>
            <span className="text-xs text-gray-500">{totalBlocks} blocks</span>
          </div>
          <div className="space-y-1">
            {miningData.pools.map((pool) => (
              <div key={pool.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-xs text-gray-400 w-16">{pool.name}</span>
                  <Progress value={pool.hashrate} className="h-1.5 flex-1" />
                </div>
                <span className="text-xs text-white ml-2">{pool.hashrate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="grid grid-cols-3 gap-1">
          <div className="bg-gray-800 rounded p-2 text-center">
            <Gauge className="w-3 h-3 mx-auto mb-1 text-blue-500" />
            <span className="text-xs text-gray-500 block">W/TH</span>
            <span className="text-xs font-bold text-white">{miningData.efficiency.avgWattPerTH}</span>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <DollarSign className="w-3 h-3 mx-auto mb-1 text-yellow-500" />
            <span className="text-xs text-gray-500 block">$/kWh</span>
            <span className="text-xs font-bold text-white">{miningData.efficiency.breakEven}</span>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <TrendingUp className="w-3 h-3 mx-auto mb-1 text-green-500" />
            <span className="text-xs text-gray-500 block">ROI</span>
            <span className="text-xs font-bold text-white">{miningData.efficiency.roi}d</span>
          </div>
        </div>
      </div>
    </Card>
  );
}