'use client';

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface IndicatorValue {
  value: number | string;
  date?: string;
  previousValue?: number | string;
  change?: number;
}

export interface EconomicData {
  indicators: Record<string, IndicatorValue>;
  treasuryYieldCurve: Record<string, number>;
  yieldSpread2s10s: number;
  yieldCurveInverted: boolean;
}

interface EconomicDataPanelProps {
  data: EconomicData | null;
  loading: boolean;
  error?: string | null;
}

const INDICATOR_META: Record<string, { label: string; format: (v: number | string) => string }> = {
  gdp: { label: 'GDP', format: (v) => { const n = Number(v); return n > 10000 ? `$${(n / 1000).toFixed(1)}T` : n > 100 ? `$${n.toLocaleString()}B` : `$${n.toFixed(1)}B`; } },
  cpi: { label: 'CPI', format: (v) => `${Number(v).toFixed(1)}` },
  unemployment: { label: 'UNEMPLOYMENT', format: (v) => `${Number(v).toFixed(1)}%` },
  fedFundsRate: { label: 'FED FUNDS RATE', format: (v) => `${Number(v).toFixed(2)}%` },
  m2MoneySupply: { label: 'M2 SUPPLY', format: (v) => { const n = Number(v); return n > 1000 ? `$${(n / 1000).toFixed(1)}T` : `$${n.toFixed(0)}B`; } },
  consumerConfidence: { label: 'CONSUMER CONF', format: (v) => `${Number(v).toFixed(1)}` },
};

const INDICATOR_ORDER = ['gdp', 'cpi', 'unemployment', 'fedFundsRate', 'm2MoneySupply', 'consumerConfidence'];

const YIELD_TENORS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '20Y', '30Y'];

function ChangeArrow({ change }: { change?: number }) {
  if (change === undefined || change === null) return <Minus className="w-2.5 h-2.5 text-[#e4e4e7]/30" />;
  if (change > 0) return <TrendingUp className="w-2.5 h-2.5 text-[#00ff88]" />;
  if (change < 0) return <TrendingDown className="w-2.5 h-2.5 text-[#ff3366]" />;
  return <Minus className="w-2.5 h-2.5 text-[#e4e4e7]/30" />;
}

function changeColor(change?: number): string {
  if (change === undefined || change === null || change === 0) return 'text-[#e4e4e7]/50';
  return change > 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#0a0a0f] rounded p-2.5 animate-pulse">
          <div className="h-2 w-16 bg-[#2a2a3e]/50 rounded mb-2" />
          <div className="h-4 w-12 bg-[#2a2a3e]/60 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EconomicDataPanel({ data, loading, error }: EconomicDataPanelProps) {
  const yieldValues = data
    ? YIELD_TENORS.map((t) => data.treasuryYieldCurve[t] ?? 0)
    : [];
  const maxYield = yieldValues.length > 0 ? Math.max(...yieldValues, 0.01) : 1;

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
          Economic Indicators
        </span>
      </div>

      {loading ? (
        <>
          <SkeletonGrid />
          <div className="h-20 bg-[#0a0a0f] animate-pulse rounded" />
        </>
      ) : error ? (
        <div className="py-6 text-center text-[10px] text-[#ff3366] font-mono">{error}</div>
      ) : !data ? (
        <div className="py-6 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
          Market data temporarily unavailable — external APIs may be rate-limited
        </div>
      ) : (
        <>
          {/* Indicators Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {INDICATOR_ORDER.map((key) => {
              const meta = INDICATOR_META[key];
              const ind = data.indicators[key];
              if (!meta || !ind) return null;

              return (
                <div
                  key={key}
                  className="bg-[#0a0a0f] border border-[#2a2a3e]/50 rounded p-2.5"
                >
                  <div className="text-[10px] text-[#e4e4e7]/40 font-mono uppercase mb-1">
                    {meta.label}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#e4e4e7] font-mono">
                      {meta.format(ind.value)}
                    </span>
                    <div className="flex items-center gap-1">
                      <ChangeArrow change={ind.change} />
                      {ind.change !== undefined && ind.change !== null && (
                        <span className={`text-[9px] font-mono ${changeColor(ind.change)}`}>
                          {ind.change > 0 ? '+' : ''}
                          {Number(ind.change).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {ind.previousValue !== undefined && (
                    <div className="text-[9px] text-[#e4e4e7]/25 font-mono mt-0.5">
                      prev: {meta.format(ind.previousValue)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Treasury Yield Curve */}
          <div className="bg-[#0a0a0f] border border-[#2a2a3e]/50 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#e4e4e7]/40 font-mono uppercase">
                Treasury Yield Curve
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#e4e4e7]/40">
                  2s-10s:{' '}
                  <span
                    className={`font-bold ${
                      data.yieldSpread2s10s >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
                    }`}
                  >
                    {data.yieldSpread2s10s > 0 ? '+' : ''}
                    {data.yieldSpread2s10s.toFixed(0)}bps
                  </span>
                </span>
                {data.yieldCurveInverted && (
                  <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-[#ff3366] bg-[#ff3366]/10 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    INVERTED
                  </span>
                )}
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end justify-between gap-1 h-16">
              {YIELD_TENORS.map((tenor, i) => {
                const value = yieldValues[i] || 0;
                const height = maxYield > 0 ? (value / maxYield) * 100 : 0;
                const barColor = data.yieldCurveInverted ? '#ff3366' : '#00ff88';

                return (
                  <div key={tenor} className="flex flex-col items-center flex-1 min-w-0">
                    <span className="text-[8px] font-mono text-[#e4e4e7]/40 mb-0.5">
                      {value.toFixed(1)}
                    </span>
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        backgroundColor: barColor,
                        opacity: 0.4 + (height / 100) * 0.6,
                      }}
                    />
                    <span className="text-[7px] font-mono text-[#e4e4e7]/30 mt-1">
                      {tenor}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
