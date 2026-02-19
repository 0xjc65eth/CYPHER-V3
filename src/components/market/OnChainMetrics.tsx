'use client';

import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Database, Zap, Users, Lock } from 'lucide-react';

interface OnChainData {
  mvrvRatio: number;
  nvtRatio: number;
  stockToFlow: { actual: number; model: number };
  exchangeReserves: { btc: number; change24h: number };
  whaleTransactions: { count24h: number; volume: number };
  hashRibbons: 'buy' | 'sell' | 'neutral';
  sopr: number;
  puellMultiple: number;
}

interface OnChainMetricsProps {
  refreshTrigger?: number;
}

export function OnChainMetrics({ refreshTrigger = 0 }: OnChainMetricsProps) {
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/onchain-metrics/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching on-chain metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'MVRV Ratio',
      value: data?.mvrvRatio || 2.34,
      description: 'Market Value to Realized Value',
      signal: (data?.mvrvRatio || 2.34) > 3.5 ? 'Overvalued' : (data?.mvrvRatio || 2.34) < 1 ? 'Undervalued' : 'Fair Value',
      signalColor: (data?.mvrvRatio || 2.34) > 3.5 ? '#FF4757' : (data?.mvrvRatio || 2.34) < 1 ? '#00D4AA' : '#F7931A',
      icon: Activity,
      optimal: '1.0 - 3.0'
    },
    {
      label: 'NVT Ratio',
      value: data?.nvtRatio || 45.2,
      description: 'Network Value to Transactions',
      signal: (data?.nvtRatio || 45.2) > 90 ? 'Overheated' : (data?.nvtRatio || 45.2) < 30 ? 'Undervalued' : 'Normal',
      signalColor: (data?.nvtRatio || 45.2) > 90 ? '#FF4757' : (data?.nvtRatio || 45.2) < 30 ? '#00D4AA' : '#F7931A',
      icon: Zap,
      optimal: '30 - 90'
    },
    {
      label: 'SOPR',
      value: data?.sopr || 1.02,
      description: 'Spent Output Profit Ratio',
      signal: (data?.sopr || 1.02) > 1 ? 'Profits Realized' : 'Losses Realized',
      signalColor: (data?.sopr || 1.02) > 1 ? '#00D4AA' : '#FF4757',
      icon: TrendingUp,
      optimal: '> 1.0 bullish'
    },
    {
      label: 'Puell Multiple',
      value: data?.puellMultiple || 1.45,
      description: 'Miner Revenue vs 365D MA',
      signal: (data?.puellMultiple || 1.45) > 4 ? 'Top Zone' : (data?.puellMultiple || 1.45) < 0.5 ? 'Bottom Zone' : 'Normal',
      signalColor: (data?.puellMultiple || 1.45) > 4 ? '#FF4757' : (data?.puellMultiple || 1.45) < 0.5 ? '#00D4AA' : '#F7931A',
      icon: Database,
      optimal: '0.5 - 4.0'
    }
  ];

  return (
    <div className="space-y-2">
      {/* Advanced Metrics Grid */}
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5 hover:border-[#F7931A]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon className="w-3 h-3 text-[#F7931A]" />
                <span className="text-[10px] font-mono text-[#e4e4e7]/80">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#e4e4e7] font-mono">
                  {metric.value.toFixed(2)}
                </span>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${metric.signalColor}20`, color: metric.signalColor }}
                >
                  {metric.signal}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-[#e4e4e7]/40 font-mono">{metric.description}</span>
              <span className="text-[8px] text-[#e4e4e7]/30 font-mono">Optimal: {metric.optimal}</span>
            </div>
          </div>
        );
      })}

      {/* Stock-to-Flow Model */}
      <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="text-[10px] font-mono text-[#8B5CF6] uppercase">Stock-to-Flow Model</span>
          </div>
          <span className="text-[8px] text-[#e4e4e7]/50 font-mono">Post-Halving Cycle</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">Actual Price</div>
            <div className="text-sm font-bold text-[#e4e4e7]">
              ${(data?.stockToFlow.actual || 95000).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">Model Price</div>
            <div className="text-sm font-bold text-[#8B5CF6]">
              ${(data?.stockToFlow.model || 125000).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[8px] text-[#e4e4e7]/50">
          Model suggests {((data?.stockToFlow.model || 125000) / (data?.stockToFlow.actual || 95000) - 1) * 100 > 0 ? 'upside' : 'downside'} potential of {Math.abs(((data?.stockToFlow.model || 125000) / (data?.stockToFlow.actual || 95000) - 1) * 100).toFixed(1)}%
        </div>
      </div>

      {/* Exchange & Whale Activity */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lock className="w-3 h-3 text-[#00D4AA]" />
            <span className="text-[9px] text-[#e4e4e7]/60 font-mono">Exchange Reserves</span>
          </div>
          <div className="text-sm font-bold text-[#e4e4e7]">
            {(data?.exchangeReserves.btc || 2456789).toLocaleString()} BTC
          </div>
          <div className={`text-[8px] font-mono mt-1 ${
            (data?.exchangeReserves.change24h || -0.45) < 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'
          }`}>
            {(data?.exchangeReserves.change24h || -0.45) < 0 ? '↓' : '↑'} {Math.abs(data?.exchangeReserves.change24h || -0.45).toFixed(2)}% 24h
            <span className="text-[#e4e4e7]/40 ml-1">
              ({(data?.exchangeReserves.change24h || -0.45) < 0 ? 'Bullish' : 'Bearish'})
            </span>
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3 h-3 text-[#F7931A]" />
            <span className="text-[9px] text-[#e4e4e7]/60 font-mono">Whale Activity</span>
          </div>
          <div className="text-sm font-bold text-[#e4e4e7]">
            {data?.whaleTransactions.count24h || 342} txs
          </div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-1">
            {((data?.whaleTransactions.volume || 45678) / 1000).toFixed(1)}K BTC volume
          </div>
        </div>
      </div>

      {/* Hash Ribbons Signal */}
      <div className={`border rounded-lg p-3 ${
        (data?.hashRibbons || 'buy') === 'buy'
          ? 'bg-[#00D4AA]/10 border-[#00D4AA]/30'
          : (data?.hashRibbons || 'buy') === 'sell'
          ? 'bg-[#FF4757]/10 border-[#FF4757]/30'
          : 'bg-[#F7931A]/10 border-[#F7931A]/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${
              (data?.hashRibbons || 'buy') === 'buy' ? 'text-[#00D4AA]' :
              (data?.hashRibbons || 'buy') === 'sell' ? 'text-[#FF4757]' : 'text-[#F7931A]'
            }`} />
            <div>
              <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase">Hash Ribbons</div>
              <div className={`text-xs font-bold ${
                (data?.hashRibbons || 'buy') === 'buy' ? 'text-[#00D4AA]' :
                (data?.hashRibbons || 'buy') === 'sell' ? 'text-[#FF4757]' : 'text-[#F7931A]'
              }`}>
                {(data?.hashRibbons || 'buy').toUpperCase()} SIGNAL
              </div>
            </div>
          </div>
          <div className="text-[8px] text-[#e4e4e7]/50 text-right">
            Miner capitulation<br/>indicator
          </div>
        </div>
      </div>
    </div>
  );
}
