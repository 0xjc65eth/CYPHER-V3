'use client';

import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Database, Zap, Users, Lock, Target, AlertTriangle, Info, ChevronRight } from 'lucide-react';

interface OnChainData {
  price: { current: number; realized: number; thermocap: number };
  mvrv: { ratio: number; zScore: number; percentile: number; signal: string };
  nvt: { ratio: number; signal: number; percentile: number };
  sopr: { value: number; adjusted: number; longTerm: number; shortTerm: number };
  nupl: { value: number; percentile: number; zone: string };
  puellMultiple: { value: number; percentile: number; signal: string };
  stockToFlow: { actual: number; model: number; deflection: number; daysFromHalving: number };
  exchangeFlow: {
    netFlow24h: number;
    reserves: number;
    reservesChange7d: number;
    inflowUsd: number;
    outflowUsd: number;
  };
  whales: {
    addresses1kPlus: number;
    addresses10kPlus: number;
    totalHoldings: number;
    netPositionChange24h: number;
    largestTx24h: { amount: number; usd: number };
  };
  hashRate: {
    current: number;
    ma30: number;
    ma60: number;
    ribbonSignal: 'buy' | 'sell' | 'neutral';
    difficulty: number;
    nextAdjustment: number;
  };
  miner: {
    revenue24h: number;
    txFees: number;
    blockreward: number;
    puellMultiple: number;
    sellingPressure: 'high' | 'medium' | 'low';
  };
  hodlWaves: {
    lessThan1m: number;
    oneToThreeM: number;
    threeToSixM: number;
    sixToTwelveM: number;
    oneToTwoY: number;
    moreThanTwoY: number;
  };
}

interface OnChainMetricsProProps {
  refreshTrigger?: number;
}

export function OnChainMetricsPro({ refreshTrigger = 0 }: OnChainMetricsProProps) {
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/onchain-metrics-pro/');
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
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-20 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  // FALLBACK: Static fallback data used when /api/market/onchain-metrics-pro/ is unavailable.
  // Replace with real API data once on-chain data pipeline is connected.
  const fallbackData: OnChainData = {
    price: { current: 0, realized: 0, thermocap: 0 },
    mvrv: { ratio: 0, zScore: 0, percentile: 0, signal: 'N/A' },
    nvt: { ratio: 0, signal: 0, percentile: 0 },
    sopr: { value: 1, adjusted: 1, longTerm: 1, shortTerm: 1 },
    nupl: { value: 0, percentile: 0, zone: 'N/A' },
    puellMultiple: { value: 0, percentile: 0, signal: 'N/A' },
    stockToFlow: { actual: 0, model: 0, deflection: 0, daysFromHalving: 0 },
    exchangeFlow: {
      netFlow24h: 0,
      reserves: 0,
      reservesChange7d: 0,
      inflowUsd: 0,
      outflowUsd: 0,
    },
    whales: {
      addresses1kPlus: 0,
      addresses10kPlus: 0,
      totalHoldings: 0,
      netPositionChange24h: 0,
      largestTx24h: { amount: 0, usd: 0 },
    },
    hashRate: {
      current: 0,
      ma30: 0,
      ma60: 0,
      ribbonSignal: 'neutral',
      difficulty: 0,
      nextAdjustment: 0,
    },
    miner: {
      revenue24h: 0,
      txFees: 0,
      blockreward: 0,
      puellMultiple: 0,
      sellingPressure: 'low',
    },
    hodlWaves: {
      lessThan1m: 0,
      oneToThreeM: 0,
      threeToSixM: 0,
      sixToTwelveM: 0,
      oneToTwoY: 0,
      moreThanTwoY: 0,
    },
  };

  const d = data || fallbackData;

  const getZoneColor = (zone: string) => {
    const zones: Record<string, string> = {
      'Euphoria': '#FF4757',
      'Greed': '#FF8833',
      'Belief-Denial': '#F7931A',
      'Hope-Fear': '#FFCC00',
      'Capitulation': '#00D4AA',
    };
    return zones[zone] || '#e4e4e7';
  };

  const formatHashrate = (hr: number) => `${hr.toFixed(0)} EH/s`;
  const formatBTC = (btc: number) => `${(btc / 1000).toFixed(1)}K BTC`;
  const formatUsd = (usd: number) => {
    if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
    if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
    return `$${usd.toLocaleString()}`;
  };

  return (
    <div className="space-y-3">
      {/* Price Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded p-3 hover:border-[#F7931A]/50 transition-all cursor-pointer">
          <div className="text-[9px] text-[#e4e4e7]/40 mb-1">CURRENT PRICE</div>
          <div className="text-lg font-bold text-[#F7931A] font-mono">${d.price.current.toLocaleString()}</div>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded p-3 hover:border-[#00D4AA]/50 transition-all cursor-pointer">
          <div className="text-[9px] text-[#e4e4e7]/40 mb-1">REALIZED PRICE</div>
          <div className="text-lg font-bold text-[#00D4AA] font-mono">${d.price.realized.toLocaleString()}</div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
            +{(d.price.realized > 0 ? ((d.price.current / d.price.realized - 1) * 100).toFixed(1) : '0.0')}% premium
          </div>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded p-3 hover:border-[#8B5CF6]/50 transition-all cursor-pointer">
          <div className="text-[9px] text-[#e4e4e7]/40 mb-1">THERMOCAP PRICE</div>
          <div className="text-lg font-bold text-[#8B5CF6] font-mono">${d.price.thermocap.toLocaleString()}</div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">Miner cost basis</div>
        </div>
      </div>

      {/* MVRV Ratio - Enhanced */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded">
        <div className="p-3 border-b border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#F7931A]" />
              <div className="text-[11px] font-bold text-[#e4e4e7] font-mono">MVRV RATIO</div>
              <button className="text-[#e4e4e7]/40 hover:text-[#F7931A] transition-colors">
                <Info className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[9px] text-[#e4e4e7]/40">Signal:</div>
              <div className="px-2 py-0.5 bg-[#F7931A]/20 text-[#F7931A] text-[9px] rounded font-bold">
                {d.mvrv.signal}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Ratio</div>
              <div className="text-2xl font-bold text-[#F7931A] font-mono">{d.mvrv.ratio.toFixed(3)}</div>
              <div className="mt-1 text-[8px] text-[#e4e4e7]/50">
                {d.mvrv.ratio > 3.5 ? 'Overvalued' : d.mvrv.ratio < 1 ? 'Undervalued' : 'Fair Value'}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Z-Score</div>
              <div className="text-2xl font-bold text-[#8B5CF6] font-mono">{d.mvrv.zScore.toFixed(2)}</div>
              <div className="mt-1 text-[8px] text-[#e4e4e7]/50">
                {d.mvrv.zScore > 7 ? 'Extreme High' : d.mvrv.zScore < -1.5 ? 'Extreme Low' : 'Normal Range'}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Percentile (5Y)</div>
              <div className="text-2xl font-bold text-[#00D4AA] font-mono">{d.mvrv.percentile}%</div>
              <div className="mt-2 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00D4AA] via-[#F7931A] to-[#FF4757]" style={{ width: `${d.mvrv.percentile}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#1a1a2e]/30">
          <div className="flex items-start gap-2 text-[9px] text-[#e4e4e7]/70 leading-relaxed">
            <AlertTriangle className="w-3 h-3 text-[#F7931A] mt-0.5 flex-shrink-0" />
            <div>
              <strong>Historical Context:</strong> MVRV &gt; 3.5 marked cycle tops (2013, 2017, 2021). Current {d.mvrv.ratio.toFixed(2)} suggests {d.mvrv.ratio > 3.5 ? 'overheated' : d.mvrv.ratio < 1 ? 'accumulation zone' : 'mid-cycle expansion'}. Z-Score at {d.mvrv.zScore.toFixed(2)} is {d.mvrv.zScore > 7 ? 'historically extreme' : 'within normal bounds'}.
            </div>
          </div>
        </div>
      </div>

      {/* SOPR Multi-Timeframe */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00D4AA]" />
            <div className="text-[11px] font-bold text-[#e4e4e7] font-mono">SOPR (Spent Output Profit Ratio)</div>
          </div>
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            d.sopr.value > 1 ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[#FF4757]/20 text-[#FF4757]'
          }`}>
            {d.sopr.value > 1 ? 'PROFIT TAKING' : 'LOSS REALIZATION'}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#1a1a2e]/50 rounded p-2">
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">SOPR</div>
            <div className={`text-lg font-bold font-mono ${d.sopr.value > 1 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {d.sopr.value.toFixed(4)}
            </div>
          </div>
          <div className="bg-[#1a1a2e]/50 rounded p-2">
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">aSOPR</div>
            <div className={`text-lg font-bold font-mono ${d.sopr.adjusted > 1 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {d.sopr.adjusted.toFixed(4)}
            </div>
            <div className="text-[7px] text-[#e4e4e7]/50 mt-0.5">Adjusted</div>
          </div>
          <div className="bg-[#1a1a2e]/50 rounded p-2">
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">LTH-SOPR</div>
            <div className={`text-lg font-bold font-mono ${d.sopr.longTerm > 1 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {d.sopr.longTerm.toFixed(4)}
            </div>
            <div className="text-[7px] text-[#e4e4e7]/50 mt-0.5">&gt;155 days</div>
          </div>
          <div className="bg-[#1a1a2e]/50 rounded p-2">
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">STH-SOPR</div>
            <div className={`text-lg font-bold font-mono ${d.sopr.shortTerm > 1 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {d.sopr.shortTerm.toFixed(4)}
            </div>
            <div className="text-[7px] text-[#e4e4e7]/50 mt-0.5">&lt;155 days</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[9px] text-[#e4e4e7]/60">
          <ChevronRight className="w-3 h-3" />
          <span>SOPR &gt; 1.0 indicates holders selling at profit. Below 1.0 suggests capitulation or accumulation.</span>
        </div>
      </div>

      {/* Stock-to-Flow Model */}
      <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 border border-[#8B5CF6]/30 rounded p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#8B5CF6]" />
            <div className="text-[11px] font-bold text-[#8B5CF6] font-mono">STOCK-TO-FLOW MODEL</div>
          </div>
          <div className="text-[9px] text-[#e4e4e7]/50">{d.stockToFlow.daysFromHalving} days from halving</div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Current Price</div>
            <div className="text-xl font-bold text-[#e4e4e7] font-mono">${d.stockToFlow.actual.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Model Price</div>
            <div className="text-xl font-bold text-[#8B5CF6] font-mono">${d.stockToFlow.model.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Deflection</div>
            <div className={`text-xl font-bold font-mono ${d.stockToFlow.deflection < 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {d.stockToFlow.deflection.toFixed(1)}%
            </div>
            <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
              {d.stockToFlow.deflection < 0 ? 'Undervalued' : 'Overvalued'}
            </div>
          </div>
        </div>

        <div className="relative h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-[#00D4AA]/30" />
            <div className="w-px bg-[#8B5CF6]" />
            <div className="flex-1 bg-[#FF4757]/30" />
          </div>
          <div
            className="absolute top-0 h-full w-1 bg-[#F7931A]"
            style={{
              left: `${50 + (d.stockToFlow.deflection / 100) * 50}%`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-[#e4e4e7]/40 mt-1">
          <span>-50% (Very Undervalued)</span>
          <span>0% (Fair)</span>
          <span>+50% (Very Overvalued)</span>
        </div>
      </div>

      {/* Exchange Flows - Compact Table */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded">
        <div className="px-3 py-2 border-b border-[#1a1a2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00D4AA]" />
            <div className="text-[11px] font-bold text-[#e4e4e7] font-mono">EXCHANGE FLOWS</div>
          </div>
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            d.exchangeFlow.netFlow24h < 0 ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[#FF4757]/20 text-[#FF4757]'
          }`}>
            {d.exchangeFlow.netFlow24h < 0 ? 'NET OUTFLOW' : 'NET INFLOW'}
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#00D4AA]/10 border border-[#00D4AA]/30 rounded p-2">
              <div className="text-[8px] text-[#00D4AA]/80 mb-1">24h Net Flow</div>
              <div className="text-lg font-bold text-[#00D4AA] font-mono">{formatBTC(Math.abs(d.exchangeFlow.netFlow24h))}</div>
              <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
                {formatUsd(Math.abs(d.exchangeFlow.netFlow24h) * d.price.current)} {d.exchangeFlow.netFlow24h < 0 ? 'withdrawn' : 'deposited'}
              </div>
            </div>
            <div className="bg-[#1a1a2e]/50 rounded p-2">
              <div className="text-[8px] text-[#e4e4e7]/40 mb-1">Exchange Reserves</div>
              <div className="text-lg font-bold text-[#e4e4e7] font-mono">{formatBTC(d.exchangeFlow.reserves)}</div>
              <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
                {d.exchangeFlow.reservesChange7d.toFixed(2)}% (7d)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="text-[9px] text-[#e4e4e7]/40 border-b border-[#1a1a2e]">
              <tr>
                <th className="text-left py-1">Direction</th>
                <th className="text-right py-1">Volume</th>
                <th className="text-right py-1">USD Value</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-[#1a1a2e]/30">
                <td className="py-2 text-[#FF4757]">Inflow</td>
                <td className="text-right">{formatBTC(d.exchangeFlow.inflowUsd / d.price.current)}</td>
                <td className="text-right">{formatUsd(d.exchangeFlow.inflowUsd)}</td>
              </tr>
              <tr>
                <td className="py-2 text-[#00D4AA]">Outflow</td>
                <td className="text-right">{formatBTC(d.exchangeFlow.outflowUsd / d.price.current)}</td>
                <td className="text-right">{formatUsd(d.exchangeFlow.outflowUsd)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Remaining metrics continue... */}
    </div>
  );
}
