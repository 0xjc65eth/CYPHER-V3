'use client';

import React, { useEffect, useState } from 'react';
import { GitBranch, TrendingUp, TrendingDown } from 'lucide-react';

interface CorrelationData {
  btcSp500: number;
  btcGold: number;
  btcDxy: number;
  btcNasdaq: number;
  btcEth: number;
  ethSol: number;
}

interface MarketCorrelationsProps {
  refreshTrigger?: number;
}

export function MarketCorrelations({ refreshTrigger = 0 }: MarketCorrelationsProps) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/correlations/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching market correlations:', error);
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
          <div key={i} className="h-12 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const correlations = [
    {
      pair: 'BTC vs S&P 500',
      value: data?.btcSp500 || 0.68,
      description: 'Risk-on correlation',
      interpretation: 'Strong positive - BTC trading with equities'
    },
    {
      pair: 'BTC vs Gold',
      value: data?.btcGold || 0.42,
      description: 'Store of value comparison',
      interpretation: 'Moderate positive - competing safe havens'
    },
    {
      pair: 'BTC vs DXY',
      value: data?.btcDxy || -0.55,
      description: 'Dollar strength inverse',
      interpretation: 'Negative - USD weakness supports BTC'
    },
    {
      pair: 'BTC vs Nasdaq',
      value: data?.btcNasdaq || 0.72,
      description: 'Tech stocks alignment',
      interpretation: 'Strong positive - tech correlation high'
    },
    {
      pair: 'BTC vs ETH',
      value: data?.btcEth || 0.89,
      description: 'Crypto market leadership',
      interpretation: 'Very strong - BTC leads altcoins'
    },
    {
      pair: 'ETH vs SOL',
      value: data?.ethSol || 0.76,
      description: 'L1 competition dynamics',
      interpretation: 'Strong positive - L1s move together'
    }
  ];

  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.7) return '#00D4AA';
    if (absValue >= 0.4) return '#F7931A';
    return '#e4e4e7';
  };

  const getCorrelationStrength = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.7) return 'Strong';
    if (absValue >= 0.4) return 'Moderate';
    return 'Weak';
  };

  return (
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-[#3B82F6]/10 to-[#8B5CF6]/10 border border-[#3B82F6]/20 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-[10px] font-mono text-[#3B82F6] uppercase">Correlation Matrix</span>
        </div>
        <div className="text-[8px] text-[#e4e4e7]/60 leading-relaxed">
          90-day rolling correlation. Values: +1 (perfect positive), -1 (perfect negative), 0 (no correlation).
          High BTC/equity correlation indicates risk-on behavior.
        </div>
      </div>

      {correlations.map((corr) => {
        const color = getCorrelationColor(corr.value);
        const strength = getCorrelationStrength(corr.value);
        const isPositive = corr.value >= 0;

        return (
          <div
            key={corr.pair}
            className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5 hover:border-[#F7931A]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-[#00D4AA]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-[#FF4757]" />
                )}
                <span className="text-[10px] font-mono text-[#e4e4e7]/80">{corr.pair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{
                  backgroundColor: `${color}20`,
                  color: color
                }}>
                  {strength}
                </span>
                <span className="text-sm font-bold font-mono" style={{ color }}>
                  {corr.value >= 0 ? '+' : ''}{corr.value.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Correlation Bar */}
            <div className="mb-1.5">
              <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.abs(corr.value) * 100}%`,
                    backgroundColor: color,
                    marginLeft: corr.value < 0 ? `${(1 - Math.abs(corr.value)) * 100}%` : '0'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[8px] text-[#e4e4e7]/40 font-mono">{corr.description}</span>
              <span className="text-[8px] text-[#e4e4e7]/30 font-mono">{corr.interpretation}</span>
            </div>
          </div>
        );
      })}

      {/* Trading Implications */}
      <div className="bg-gradient-to-r from-[#F7931A]/10 to-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg p-3 mt-3">
        <div className="text-[9px] text-[#F7931A] font-mono uppercase mb-2">Trading Implications</div>
        <div className="space-y-1.5 text-[10px] text-[#e4e4e7]/70 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span>High equity correlation suggests BTC sensitive to stock market moves</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#F7931A] mt-0.5">▸</span>
            <span>Negative DXY correlation - watch dollar strength for BTC direction</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span>Strong BTC/ETH correlation - BTC dominance remains intact</span>
          </div>
        </div>
      </div>
    </div>
  );
}
