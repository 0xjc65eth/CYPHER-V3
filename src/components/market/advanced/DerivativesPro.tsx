'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Percent, Activity } from 'lucide-react';

interface DerivativesData {
  fundingRate: number | null;
  predictedFunding: number | null;
  openInterest: number | null;
  oiChange24h: number | null;
  longShortRatio: number | null;
  topTraderRatio: number | null;
  liquidations24h: number | null;
  timestamp: number;
}

interface DerivativesProProps {
  refreshTrigger?: number;
}

export function DerivativesPro({ refreshTrigger = 0 }: DerivativesProProps) {
  const [data, setData] = useState<DerivativesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/market/derivatives/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          throw new Error('Failed to fetch derivatives');
        }
      } catch (err) {
        console.error('Error fetching derivatives:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
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
          <div key={i} className="h-24 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#ff3366]" />
          <div className="text-sm text-[#e4e4e7]/60 mb-2">Failed to load derivatives data</div>
          <div className="text-xs text-[#e4e4e7]/40">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const annualizedFunding = data.fundingRate != null ? data.fundingRate * 3 * 365 * 100 : null;

  const lsLong = data.longShortRatio != null
    ? (data.longShortRatio / (1 + data.longShortRatio)) * 100
    : null;
  const lsShort = lsLong != null ? 100 - lsLong : null;

  const topLong = data.topTraderRatio != null
    ? (data.topTraderRatio / (1 + data.topTraderRatio)) * 100
    : null;
  const topShort = topLong != null ? 100 - topLong : null;

  return (
    <div className="space-y-4">
      {/* Funding Rate */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Perpetual Funding Rate
          </h3>
          <Percent className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">CURRENT RATE (8H)</div>
            <div className={`text-3xl font-bold ${
              data.fundingRate != null
                ? data.fundingRate >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
                : 'text-[#e4e4e7]/30'
            }`}>
              {data.fundingRate != null ? `${(data.fundingRate * 100).toFixed(4)}%` : '—'}
            </div>
            {data.fundingRate != null && (
              <div className="mt-1 text-xs text-[#e4e4e7]/60">
                {data.fundingRate >= 0 ? 'Longs pay shorts' : 'Shorts pay longs'}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">ANNUALIZED</div>
            <div className="text-3xl font-bold text-[#e4e4e7]">
              {annualizedFunding != null ? `${annualizedFunding.toFixed(2)}%` : '—'}
            </div>
            {data.predictedFunding != null && (
              <div className="mt-1 text-xs text-[#e4e4e7]/60">
                Next: {(data.predictedFunding * 100).toFixed(4)}%
              </div>
            )}
          </div>
        </div>

        {/* Funding indicator */}
        {data.fundingRate != null && (
          <div className="mt-4">
            <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  data.fundingRate >= 0 ? 'bg-[#00ff88]' : 'bg-[#ff3366]'
                }`}
                style={{
                  width: `${Math.min(Math.abs(data.fundingRate) * 10000, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Open Interest */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Open Interest
          </h3>
          <DollarSign className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">TOTAL OI (BTC)</div>
            <div className="text-3xl font-bold text-[#e4e4e7]">
              {data.openInterest != null
                ? `${data.openInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : '—'}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">24H CHANGE</div>
            <div className={`text-3xl font-bold ${
              data.oiChange24h != null
                ? data.oiChange24h >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
                : 'text-[#e4e4e7]/30'
            }`}>
              {data.oiChange24h != null
                ? `${data.oiChange24h >= 0 ? '+' : ''}${data.oiChange24h.toFixed(2)}%`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Long/Short Ratio */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono flex items-center gap-2">
            Long / Short Ratio
            {data.longShortRatio != null && (
              <span className="text-[#F7931A] font-mono">
                {data.longShortRatio.toFixed(2)}
              </span>
            )}
          </h3>
          <Activity className="w-4 h-4 text-[#F7931A]" />
        </div>

        {lsLong != null && lsShort != null ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#00ff88] w-16 text-right font-mono">
                {lsLong.toFixed(1)}%
              </span>
              <div className="flex-1 h-6 rounded overflow-hidden flex">
                <div
                  className="bg-[#00ff88]/60 h-full flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ width: `${lsLong}%` }}
                >
                  {lsLong > 20 && 'LONG'}
                </div>
                <div
                  className="bg-[#ff3366]/60 h-full flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ width: `${lsShort}%` }}
                >
                  {lsShort > 20 && 'SHORT'}
                </div>
              </div>
              <span className="text-xs text-[#ff3366] w-16 font-mono">
                {lsShort.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-[#e4e4e7]/40 text-center">
              {lsLong > 60 ? 'Market heavily long - potential long squeeze risk' :
               lsShort > 60 ? 'Market heavily short - potential short squeeze risk' :
               'Balanced positioning'}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-[#e4e4e7]/30 text-sm">
            No data available
          </div>
        )}
      </div>

      {/* Top Trader Ratio */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono flex items-center gap-2">
            Top Trader L/S
            {data.topTraderRatio != null && (
              <span className="text-[#F7931A] font-mono">
                {data.topTraderRatio.toFixed(2)}
              </span>
            )}
          </h3>
          <TrendingUp className="w-4 h-4 text-[#F7931A]" />
        </div>

        {topLong != null && topShort != null ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#00ff88] w-16 text-right font-mono">
                {topLong.toFixed(1)}%
              </span>
              <div className="flex-1 h-6 rounded overflow-hidden flex">
                <div
                  className="bg-[#00ff88]/40 h-full flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ width: `${topLong}%` }}
                >
                  {topLong > 20 && 'LONG'}
                </div>
                <div
                  className="bg-[#ff3366]/40 h-full flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ width: `${topShort}%` }}
                >
                  {topShort > 20 && 'SHORT'}
                </div>
              </div>
              <span className="text-xs text-[#ff3366] w-16 font-mono">
                {topShort.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-[#e4e4e7]/40 text-center">
              Smart money positioning indicator
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-[#e4e4e7]/30 text-sm">
            No data available
          </div>
        )}
      </div>

      {/* Liquidations */}
      {data.liquidations24h != null && (
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
              24H Liquidations
            </h3>
            <AlertCircle className="w-4 h-4 text-[#ff3366]" />
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-[#ff3366]">
              ${(data.liquidations24h / 1e6).toFixed(2)}M
            </div>
            <div className="text-xs text-[#e4e4e7]/60 mt-1">
              Total liquidations in last 24 hours
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
