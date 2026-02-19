'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart2, AlertTriangle } from 'lucide-react';

interface MacroData {
  dxy: { value: number; change: number };
  treasury10y: { value: number; change: number };
  vix: { value: number; change: number };
  sp500: { value: number; change: number };
  nasdaq: { value: number; change: number };
  gold: { value: number; change: number };
  oil: { value: number; change: number };
  cpi: { value: number; date: string };
  fedRate: { value: number; nextMeeting: string };
}

interface MacroIndicatorsProps {
  refreshTrigger?: number;
}

export function MacroIndicators({ refreshTrigger = 0 }: MacroIndicatorsProps) {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/macro-indicators/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching macro indicators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const indicators = [
    {
      label: 'DXY (US Dollar)',
      value: data?.dxy.value || 104.25,
      change: data?.dxy.change || -0.18,
      icon: DollarSign,
      impact: 'Inverse correlation with BTC',
      color: '#3B82F6'
    },
    {
      label: '10Y Treasury Yield',
      value: data?.treasury10y.value || 4.35,
      change: data?.treasury10y.change || 0.05,
      icon: Percent,
      impact: 'Higher yields = lower risk appetite',
      suffix: '%',
      color: '#8B5CF6'
    },
    {
      label: 'VIX (Fear Index)',
      value: data?.vix.value || 15.8,
      change: data?.vix.change || -2.1,
      icon: AlertTriangle,
      impact: 'Market volatility indicator',
      color: '#EF4444'
    },
    {
      label: 'S&P 500',
      value: data?.sp500.value || 5847.23,
      change: data?.sp500.change || 0.45,
      icon: TrendingUp,
      impact: 'Risk-on sentiment proxy',
      prefix: '$',
      color: '#10B981'
    },
    {
      label: 'NASDAQ',
      value: data?.nasdaq.value || 18402.56,
      change: data?.nasdaq.change || 0.58,
      icon: BarChart2,
      impact: 'Tech stocks correlation',
      prefix: '$',
      color: '#06B6D4'
    },
    {
      label: 'Gold (XAU/USD)',
      value: data?.gold.value || 2634.50,
      change: data?.gold.change || 0.32,
      icon: TrendingUp,
      impact: 'Store of value competition',
      prefix: '$',
      color: '#F59E0B'
    }
  ];

  return (
    <div className="space-y-2">
      {/* Economic Data Section */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-3">
          <div className="text-[9px] text-[#e4e4e7]/35 font-mono uppercase mb-1">Fed Funds Rate</div>
          <div className="text-lg font-bold text-[#F7931A]">{data?.fedRate.value || 5.50}%</div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-1">
            Next FOMC: {data?.fedRate.nextMeeting || 'Mar 20, 2026'}
          </div>
        </div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-3">
          <div className="text-[9px] text-[#e4e4e7]/35 font-mono uppercase mb-1">CPI (Inflation)</div>
          <div className="text-lg font-bold text-[#FF4757]">{data?.cpi.value || 3.2}%</div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-1">
            Last: {data?.cpi.date || 'Jan 2026'}
          </div>
        </div>
      </div>

      {/* Traditional Markets Grid */}
      <div className="space-y-1.5">
        {indicators.map((indicator) => {
          const Icon = indicator.icon;
          const isPositive = indicator.change >= 0;

          return (
            <div
              key={indicator.label}
              className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5 hover:border-[#F7931A]/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded" style={{ backgroundColor: `${indicator.color}15` }}>
                    <Icon className="w-3 h-3" style={{ color: indicator.color }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#e4e4e7]/80">{indicator.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#e4e4e7] font-mono">
                    {indicator.prefix}{indicator.value.toFixed(2)}{indicator.suffix}
                  </span>
                  <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                    isPositive ? 'text-[#00D4AA]' : 'text-[#FF4757]'
                  }`}>
                    {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(indicator.change).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="text-[8px] text-[#e4e4e7]/40 font-mono pl-7">
                {indicator.impact}
              </div>
            </div>
          );
        })}
      </div>

      {/* Crypto Impact Analysis */}
      <div className="bg-gradient-to-r from-[#F7931A]/10 to-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg p-3 mt-3">
        <div className="text-[9px] text-[#F7931A] font-mono uppercase mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Market Impact Analysis
        </div>
        <div className="space-y-1.5 text-[10px] text-[#e4e4e7]/70 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span><strong>DXY weakening</strong> typically supports BTC as alternative store of value</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#FF4757] mt-0.5">▸</span>
            <span><strong>Rising yields</strong> may pressure risk assets short-term</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span><strong>Low VIX</strong> indicates stable conditions favorable for crypto</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span><strong>Equity strength</strong> suggests risk-on environment supporting BTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
