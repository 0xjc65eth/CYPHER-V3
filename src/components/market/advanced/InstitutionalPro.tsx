'use client';

import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, TrendingDown, AlertCircle, DollarSign, Activity, Briefcase } from 'lucide-react';

interface InstitutionalData {
  etfFlows: {
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    topInflows: { name: string; flow: number; aum: number }[];
    topOutflows: { name: string; flow: number; aum: number }[];
  };
  corporateTreasury: {
    totalBitcoin: number;
    totalUsd: number;
    topHolders: { name: string; bitcoin: number; avgPrice: number }[];
    recentPurchases: { name: string; bitcoin: number; date: string; price: number }[];
  };
  grayscale: {
    premium: number;
    aum: number;
    dailyFlow: number;
  };
  timestamp: number;
}

interface InstitutionalProProps {
  refreshTrigger?: number;
}

export function InstitutionalPro({ refreshTrigger = 0 }: InstitutionalProProps) {
  const [data, setData] = useState<InstitutionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/market/institutional/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          throw new Error('Failed to fetch institutional data');
        }
      } catch (err) {
        console.error('Error fetching institutional data:', err);
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
          <div key={i} className="h-32 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#ff3366]" />
          <div className="text-sm text-[#e4e4e7]/60 mb-2">Failed to load institutional data</div>
          <div className="text-xs text-[#e4e4e7]/40">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatBTC = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const formatUSD = (n: number) => {
    const isNegative = n < 0;
    const absValue = Math.abs(n);
    let formatted = '';

    if (absValue >= 1e9) {
      formatted = `$${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      formatted = `$${(absValue / 1e6).toFixed(2)}M`;
    } else {
      formatted = `$${absValue.toLocaleString()}`;
    }

    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <div className="space-y-4">
      {/* ETF Flows Overview */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Bitcoin ETF Flows
          </h3>
          <Activity className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-1">DAILY</div>
            <div className={`text-lg font-bold ${
              data.etfFlows.daily >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
            }`}>
              {formatUSD(data.etfFlows.daily)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-1">WEEKLY</div>
            <div className={`text-lg font-bold ${
              data.etfFlows.weekly >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
            }`}>
              {formatUSD(data.etfFlows.weekly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-1">MONTHLY</div>
            <div className={`text-lg font-bold ${
              data.etfFlows.monthly >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
            }`}>
              {formatUSD(data.etfFlows.monthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-1">TOTAL AUM</div>
            <div className="text-lg font-bold text-[#e4e4e7]">
              {formatUSD(data.etfFlows.total)}
            </div>
          </div>
        </div>

        {/* Top Flows */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[#00ff88] mb-2 font-mono">TOP INFLOWS</div>
            <div className="space-y-2">
              {data.etfFlows.topInflows.map((etf, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#e4e4e7]/80">{etf.name}</span>
                  <div className="text-right">
                    <div className="text-[#00ff88] font-mono">{formatUSD(etf.flow)}</div>
                    <div className="text-[#e4e4e7]/40 text-[10px]">
                      AUM: {formatUSD(etf.aum)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#ff3366] mb-2 font-mono">TOP OUTFLOWS</div>
            <div className="space-y-2">
              {data.etfFlows.topOutflows.map((etf, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#e4e4e7]/80">{etf.name}</span>
                  <div className="text-right">
                    <div className="text-[#ff3366] font-mono">{formatUSD(etf.flow)}</div>
                    <div className="text-[#e4e4e7]/40 text-[10px]">
                      AUM: {formatUSD(etf.aum)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Treasury */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Corporate Bitcoin Holdings
          </h3>
          <Building2 className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">TOTAL BTC</div>
            <div className="text-2xl font-bold text-[#e4e4e7]">
              {formatBTC(data.corporateTreasury.totalBitcoin)} BTC
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">TOTAL VALUE</div>
            <div className="text-2xl font-bold text-[#00ff88]">
              {formatUSD(data.corporateTreasury.totalUsd)}
            </div>
          </div>
        </div>

        {/* Top Holders */}
        <div className="mb-4">
          <div className="text-[10px] text-[#e4e4e7]/60 mb-2 font-mono">TOP HOLDERS</div>
          <div className="space-y-2">
            {data.corporateTreasury.topHolders.map((holder, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-[#1a1a2e]/30 p-2 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-[#F7931A] font-mono">{i + 1}</span>
                  <span className="text-[#e4e4e7]">{holder.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-[#e4e4e7] font-mono">{formatBTC(holder.bitcoin)} BTC</div>
                  <div className="text-[#e4e4e7]/40 text-[10px]">
                    Avg: ${holder.avgPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases */}
        <div>
          <div className="text-[10px] text-[#e4e4e7]/60 mb-2 font-mono">RECENT PURCHASES</div>
          <div className="space-y-2">
            {data.corporateTreasury.recentPurchases.map((purchase, i) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-[#1a1a2e]/30 pb-2">
                <div>
                  <div className="text-[#e4e4e7]">{purchase.name}</div>
                  <div className="text-[#e4e4e7]/40 text-[10px]">{purchase.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#00ff88] font-mono">
                    +{formatBTC(purchase.bitcoin)} BTC
                  </div>
                  <div className="text-[#e4e4e7]/40 text-[10px]">
                    @ ${purchase.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grayscale */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Grayscale Bitcoin Trust (GBTC)
          </h3>
          <Briefcase className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">PREMIUM/DISCOUNT</div>
            <div className={`text-2xl font-bold ${
              data.grayscale.premium >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
            }`}>
              {data.grayscale.premium >= 0 ? '+' : ''}{data.grayscale.premium.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">AUM</div>
            <div className="text-2xl font-bold text-[#e4e4e7]">
              {formatUSD(data.grayscale.aum)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#e4e4e7]/40 mb-2">DAILY FLOW</div>
            <div className={`text-2xl font-bold ${
              data.grayscale.dailyFlow >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'
            }`}>
              {formatUSD(data.grayscale.dailyFlow)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
