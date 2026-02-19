'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle } from 'lucide-react';

interface FundingRate {
  exchange: string;
  rate: number;
  nextFunding: string;
}

interface DerivativesData {
  fundingRates: FundingRate[];
  averageFunding: number;
  openInterest: number;
  openInterestChange24h: number;
  longShortRatio: number;
  liquidations24h: { longs: number; shorts: number };
  optionsPutCallRatio: number;
  maxPain: number;
}

interface DerivativesMetricsProps {
  refreshTrigger?: number;
}

export function DerivativesMetrics({ refreshTrigger = 0 }: DerivativesMetricsProps) {
  const [data, setData] = useState<DerivativesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/derivatives/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching derivatives metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const fundingRates: FundingRate[] = data?.fundingRates || [
    { exchange: 'Binance', rate: 0.0085, nextFunding: '4h 23m' },
    { exchange: 'Bybit', rate: 0.0092, nextFunding: '4h 23m' },
    { exchange: 'OKX', rate: 0.0078, nextFunding: '7h 15m' },
    { exchange: 'Deribit', rate: 0.0105, nextFunding: '3h 45m' }
  ];

  const avgFunding = data?.averageFunding || fundingRates.reduce((sum, fr) => sum + fr.rate, 0) / fundingRates.length;
  const openInterest = data?.openInterest || 28.4;
  const oiChange = data?.openInterestChange24h || 4.2;
  const longShortRatio = data?.longShortRatio || 1.34;
  const liquidations = data?.liquidations24h || { longs: 45.6, shorts: 78.3 };

  const getFundingSignal = (rate: number) => {
    if (rate > 0.01) return { text: 'Overheated', color: '#FF4757' };
    if (rate > 0.005) return { text: 'Bullish', color: '#F7931A' };
    if (rate >= -0.005) return { text: 'Neutral', color: '#3B82F6' };
    return { text: 'Bearish', color: '#00D4AA' };
  };

  const signal = getFundingSignal(avgFunding);

  return (
    <div className="space-y-2">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`border rounded-lg p-3 ${
          avgFunding > 0.01 ? 'bg-[#FF4757]/10 border-[#FF4757]/30' :
          avgFunding > 0 ? 'bg-[#F7931A]/10 border-[#F7931A]/30' :
          'bg-[#00D4AA]/10 border-[#00D4AA]/30'
        }`}>
          <div className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase mb-1">Avg Funding Rate</div>
          <div className="text-lg font-bold" style={{ color: signal.color }}>
            {(avgFunding * 100).toFixed(4)}%
          </div>
          <div className="text-[8px] mt-1" style={{ color: signal.color }}>
            {signal.text} • 8h basis
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-3">
          <div className="text-[9px] text-[#e4e4e7]/60 font-mono uppercase mb-1">Open Interest</div>
          <div className="text-lg font-bold text-[#e4e4e7]">
            ${openInterest.toFixed(1)}B
          </div>
          <div className={`text-[8px] mt-1 flex items-center gap-1 ${
            oiChange > 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'
          }`}>
            {oiChange > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {oiChange > 0 ? '+' : ''}{oiChange.toFixed(2)}% 24h
          </div>
        </div>
      </div>

      {/* Funding Rates by Exchange */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
        <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase mb-2">Funding Rates by Exchange</div>
        <div className="space-y-1.5">
          {fundingRates.map((fr) => (
            <div key={fr.exchange} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#F7931A]" />
                <span className="text-[10px] text-[#e4e4e7]/80">{fr.exchange}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] text-[#e4e4e7]/50">{fr.nextFunding}</span>
                <span className={`text-[11px] font-bold font-mono ${
                  fr.rate > 0.01 ? 'text-[#FF4757]' :
                  fr.rate > 0 ? 'text-[#F7931A]' : 'text-[#00D4AA]'
                }`}>
                  {(fr.rate * 100).toFixed(4)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Long/Short Ratio */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase">Long/Short Ratio</div>
          <div className="text-sm font-bold text-[#e4e4e7] font-mono">
            {longShortRatio.toFixed(2)}
          </div>
        </div>

        {/* Visual Ratio Bar */}
        <div className="relative h-6 bg-[#1a1a2e] rounded-lg overflow-hidden mb-2">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00D4AA] to-[#00D4AA]/80 transition-all"
            style={{ width: `${(longShortRatio / (longShortRatio + 1)) * 100}%` }}
          />
          <div
            className="absolute top-0 right-0 h-full bg-gradient-to-l from-[#FF4757] to-[#FF4757]/80 transition-all"
            style={{ width: `${(1 / (longShortRatio + 1)) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-[9px] font-bold text-white/90">
              {((longShortRatio / (longShortRatio + 1)) * 100).toFixed(1)}% Long
            </span>
            <span className="text-[9px] font-bold text-white/90">
              {((1 / (longShortRatio + 1)) * 100).toFixed(1)}% Short
            </span>
          </div>
        </div>

        <div className="text-[8px] text-[#e4e4e7]/50">
          {longShortRatio > 1.5 ? 'Market overlevered long - caution on squeeze' :
           longShortRatio < 0.7 ? 'Heavy short positioning - squeeze potential' :
           'Balanced positioning'}
        </div>
      </div>

      {/* Liquidations */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
        <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase mb-2">24h Liquidations</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#FF4757]/10 border border-[#FF4757]/20 rounded p-2">
            <div className="text-[8px] text-[#FF4757]/80 mb-0.5">Longs</div>
            <div className="text-sm font-bold text-[#FF4757]">${liquidations.longs.toFixed(1)}M</div>
          </div>
          <div className="bg-[#00D4AA]/10 border border-[#00D4AA]/20 rounded p-2">
            <div className="text-[8px] text-[#00D4AA]/80 mb-0.5">Shorts</div>
            <div className="text-sm font-bold text-[#00D4AA]">${liquidations.shorts.toFixed(1)}M</div>
          </div>
        </div>
        <div className="text-[8px] text-[#e4e4e7]/50 mt-2">
          Total: ${(liquidations.longs + liquidations.shorts).toFixed(1)}M
          {liquidations.shorts > liquidations.longs ? ' • Short squeeze in progress' : ' • Long liquidation event'}
        </div>
      </div>

      {/* Options Data */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5">
        <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase mb-2">Options Market</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">Put/Call Ratio</div>
            <div className="text-sm font-bold text-[#e4e4e7]">
              {data?.optionsPutCallRatio || 0.72}
            </div>
            <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
              {(data?.optionsPutCallRatio || 0.72) < 0.7 ? 'Bullish' :
               (data?.optionsPutCallRatio || 0.72) > 1 ? 'Bearish' : 'Neutral'}
            </div>
          </div>
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">Max Pain</div>
            <div className="text-sm font-bold text-[#F7931A]">
              ${(data?.maxPain || 94000).toLocaleString()}
            </div>
            <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
              Friday expiry
            </div>
          </div>
        </div>
      </div>

      {/* Trading Signal */}
      <div className="bg-gradient-to-r from-[#F7931A]/10 to-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg p-3">
        <div className="text-[9px] text-[#F7931A] font-mono uppercase mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Derivatives Signal
        </div>
        <div className="space-y-1.5 text-[10px] text-[#e4e4e7]/70 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className={avgFunding > 0.01 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}>▸</span>
            <span>
              <strong>Funding:</strong> {avgFunding > 0.01 ? 'Extreme long leverage - reversal risk' : 'Healthy levels'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className={oiChange > 5 ? 'text-[#F7931A]' : 'text-[#00D4AA]'}>▸</span>
            <span>
              <strong>OI Change:</strong> {oiChange > 5 ? 'Rising fast - volatile moves likely' : 'Stable positioning'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className={longShortRatio > 1.5 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}>▸</span>
            <span>
              <strong>L/S Ratio:</strong> {longShortRatio > 1.5 ? 'Crowded long - squeeze risk' : 'Balanced'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
