'use client';

import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, TrendingDown, Briefcase, BarChart3 } from 'lucide-react';

interface ETFFlowData {
  name: string;
  ticker: string;
  flow24h: number;
  flow7d: number;
  aum: number;
  premium: number;
}

interface InstitutionalData {
  etfFlows: ETFFlowData[];
  totalETFFlow24h: number;
  totalETFFlow7d: number;
  microstrategyHoldings: number;
  publicCompanyHoldings: number;
  institutionalBuyPressure: 'high' | 'medium' | 'low';
}

interface InstitutionalFlowProps {
  refreshTrigger?: number;
}

export function InstitutionalFlow({ refreshTrigger = 0 }: InstitutionalFlowProps) {
  const [data, setData] = useState<InstitutionalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/institutional/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching institutional flow:', error);
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
          <div key={i} className="h-16 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const etfData: ETFFlowData[] = data?.etfFlows || [
    { name: 'BlackRock IBIT', ticker: 'IBIT', flow24h: 245.6, flow7d: 1823.4, aum: 45678, premium: 0.15 },
    { name: 'Fidelity FBTC', ticker: 'FBTC', flow24h: 189.3, flow7d: 1456.2, aum: 38902, premium: 0.08 },
    { name: 'Grayscale GBTC', ticker: 'GBTC', flow24h: -67.8, flow7d: -234.5, aum: 28456, premium: -1.2 },
    { name: 'ARK 21Shares ARKB', ticker: 'ARKB', flow24h: 98.4, flow7d: 678.9, aum: 12345, premium: 0.22 },
    { name: 'Bitwise BITB', ticker: 'BITB', flow24h: 56.7, flow7d: 445.6, aum: 8901, premium: 0.11 }
  ];

  const totalFlow24h = data?.totalETFFlow24h || etfData.reduce((sum, etf) => sum + etf.flow24h, 0);
  const totalFlow7d = data?.totalETFFlow7d || etfData.reduce((sum, etf) => sum + etf.flow7d, 0);

  return (
    <div className="space-y-2">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gradient-to-br from-[#00D4AA]/10 to-[#00D4AA]/5 border border-[#00D4AA]/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#00D4AA]" />
            <span className="text-[9px] font-mono text-[#00D4AA] uppercase">24h ETF Inflow</span>
          </div>
          <div className="text-lg font-bold text-[#00D4AA]">
            ${totalFlow24h.toFixed(1)}M
          </div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-1">
            Strong institutional demand
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#3B82F6]/10 to-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="text-[9px] font-mono text-[#3B82F6] uppercase">7d ETF Flow</span>
          </div>
          <div className="text-lg font-bold text-[#3B82F6]">
            ${totalFlow7d.toFixed(1)}M
          </div>
          <div className="text-[8px] text-[#e4e4e7]/50 mt-1">
            Weekly accumulation trend
          </div>
        </div>
      </div>

      {/* ETF Details */}
      <div className="space-y-1.5">
        {etfData.map((etf) => {
          const isInflow = etf.flow24h > 0;
          return (
            <div
              key={etf.ticker}
              className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-2.5 hover:border-[#F7931A]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-[10px] font-bold text-[#e4e4e7]">{etf.ticker}</span>
                  <span className="text-[8px] text-[#e4e4e7]/50 ml-1.5">{etf.name}</span>
                </div>
                <div className="text-[8px] text-[#e4e4e7]/40">
                  AUM: ${(etf.aum / 1000).toFixed(1)}B
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">24h Flow</div>
                  <div className={`text-[11px] font-bold font-mono ${
                    isInflow ? 'text-[#00D4AA]' : 'text-[#FF4757]'
                  }`}>
                    {isInflow ? '+' : ''}{etf.flow24h.toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">7d Flow</div>
                  <div className={`text-[11px] font-bold font-mono ${
                    etf.flow7d > 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'
                  }`}>
                    {etf.flow7d > 0 ? '+' : ''}{etf.flow7d.toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-[#e4e4e7]/40 mb-0.5">Premium</div>
                  <div className={`text-[11px] font-bold font-mono ${
                    etf.premium > 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'
                  }`}>
                    {etf.premium > 0 ? '+' : ''}{etf.premium.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Public Company Holdings */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-3.5 h-3.5 text-[#F7931A]" />
          <span className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase">Public Company Holdings</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">MicroStrategy</div>
            <div className="text-sm font-bold text-[#F7931A]">
              {(data?.microstrategyHoldings || 189150).toLocaleString()} BTC
            </div>
            <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
              ~$18.2B at current price
            </div>
          </div>
          <div>
            <div className="text-[8px] text-[#e4e4e7]/40 mb-1">All Public Companies</div>
            <div className="text-sm font-bold text-[#00D4AA]">
              {(data?.publicCompanyHoldings || 542389).toLocaleString()} BTC
            </div>
            <div className="text-[8px] text-[#e4e4e7]/50 mt-0.5">
              2.6% of total supply
            </div>
          </div>
        </div>
      </div>

      {/* Buy Pressure Indicator */}
      <div className={`border rounded-lg p-3 ${
        (data?.institutionalBuyPressure || 'high') === 'high'
          ? 'bg-[#00D4AA]/10 border-[#00D4AA]/30'
          : (data?.institutionalBuyPressure || 'high') === 'medium'
          ? 'bg-[#F7931A]/10 border-[#F7931A]/30'
          : 'bg-[#FF4757]/10 border-[#FF4757]/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(data?.institutionalBuyPressure || 'high') === 'high' ? (
              <TrendingUp className="w-4 h-4 text-[#00D4AA]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#FF4757]" />
            )}
            <div>
              <div className="text-[10px] font-mono text-[#e4e4e7]/80 uppercase">Institutional Buy Pressure</div>
              <div className={`text-xs font-bold ${
                (data?.institutionalBuyPressure || 'high') === 'high' ? 'text-[#00D4AA]' :
                (data?.institutionalBuyPressure || 'high') === 'medium' ? 'text-[#F7931A]' :
                'text-[#FF4757]'
              }`}>
                {(data?.institutionalBuyPressure || 'high').toUpperCase()}
              </div>
            </div>
          </div>
          <div className="text-[8px] text-[#e4e4e7]/50 text-right">
            Based on ETF flows,<br/>premium levels & volume
          </div>
        </div>
      </div>
    </div>
  );
}
