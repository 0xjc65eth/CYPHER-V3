'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Info, ExternalLink, Bell } from 'lucide-react';

interface MacroData {
  dxy: { value: number; change: number; change1w: number; change1m: number; high52w: number; low52w: number };
  treasury10y: { value: number; change: number; change1w: number; change1m: number; high52w: number; low52w: number };
  treasury2y: { value: number; change: number };
  yieldSpread: { value: number; inverted: boolean };
  vix: { value: number; change: number; percentile90d: number; high52w: number; low52w: number };
  sp500: { value: number; change: number; change1w: number; change1m: number; change1y: number; pe: number; high52w: number; low52w: number };
  nasdaq: { value: number; change: number; change1w: number; change1m: number; change1y: number };
  gold: { value: number; change: number; change1w: number; change1m: number; change1y: number };
  oil: { value: number; change: number; change1w: number; change1m: number };
  cpi: { value: number; previous: number; date: string; trend: 'rising' | 'falling' | 'stable' };
  ppi: { value: number; previous: number; date: string };
  fedRate: { value: number; nextMeeting: string; probability: { hold: number; cut25: number; hike25: number } };
  unemployment: { value: number; previous: number; date: string };
}

interface MacroIndicatorsProProps {
  refreshTrigger?: number;
}

export function MacroIndicatorsPro({ refreshTrigger = 0 }: MacroIndicatorsProProps) {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rates: true,
    equities: true,
    commodities: false,
    inflation: false,
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market/macro-indicators-pro/');
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPercentile = (value: number, low: number, high: number) => {
    return ((value - low) / (high - low)) * 100;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const mockData: MacroData = {
    dxy: { value: 104.25, change: -0.18, change1w: -0.45, change1m: 1.23, high52w: 107.35, low52w: 99.58 },
    treasury10y: { value: 4.35, change: 0.05, change1w: 0.12, change1m: -0.23, high52w: 5.02, low52w: 3.79 },
    treasury2y: { value: 4.68, change: 0.03 },
    yieldSpread: { value: -0.33, inverted: true },
    vix: { value: 15.8, change: -2.1, percentile90d: 32, high52w: 28.45, low52w: 12.12 },
    sp500: { value: 5847.23, change: 0.45, change1w: 1.23, change1m: 3.45, change1y: 24.67, pe: 21.4, high52w: 5892.11, low52w: 4103.78 },
    nasdaq: { value: 18402.56, change: 0.58, change1w: 1.67, change1m: 4.23, change1y: 31.24 },
    gold: { value: 2634.50, change: 0.32, change1w: -0.78, change1m: 2.34, change1y: 18.45 },
    oil: { value: 78.45, change: -1.24, change1w: -2.34, change1m: -5.67 },
    cpi: { value: 3.2, previous: 3.4, date: 'Jan 2026', trend: 'falling' },
    ppi: { value: 2.4, previous: 2.6, date: 'Jan 2026' },
    fedRate: { value: 5.50, nextMeeting: 'Mar 20, 2026', probability: { hold: 78.5, cut25: 19.2, hike25: 2.3 } },
    unemployment: { value: 3.7, previous: 3.8, date: 'Jan 2026' },
  };

  const d = data || mockData;

  const getChangeByTimeframe = (indicator: any) => {
    switch (selectedTimeframe) {
      case '1D': return indicator.change;
      case '1W': return indicator.change1w || indicator.change;
      case '1M': return indicator.change1m || indicator.change;
      case '1Y': return indicator.change1y || indicator.change;
      default: return indicator.change;
    }
  };

  return (
    <div className="space-y-3">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between bg-[#0a0a0f] border border-[#1a1a2e] rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[#e4e4e7]/40 font-mono">TIMEFRAME</div>
          <div className="flex gap-1">
            {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-[#F7931A] text-black font-bold'
                    : 'bg-[#1a1a2e] text-[#e4e4e7]/60 hover:text-[#e4e4e7]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#e4e4e7]/40">
          <button className="flex items-center gap-1 hover:text-[#F7931A] transition-colors">
            <Bell className="w-3 h-3" />
            Alerts
          </button>
          <button className="flex items-center gap-1 hover:text-[#F7931A] transition-colors">
            <ExternalLink className="w-3 h-3" />
            Bloomberg
          </button>
        </div>
      </div>

      {/* Fed Policy & Rates */}
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded">
        <button
          onClick={() => toggleSection('rates')}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#1a1a2e]/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-bold text-[#F7931A] font-mono">FEDERAL RESERVE & RATES</div>
            <div className="text-[9px] text-[#e4e4e7]/40">(4 indicators)</div>
          </div>
          {expandedSections.rates ? <ChevronUp className="w-4 h-4 text-[#e4e4e7]/40" /> : <ChevronDown className="w-4 h-4 text-[#e4e4e7]/40" />}
        </button>

        {expandedSections.rates && (
          <div className="border-t border-[#1a1a2e]">
            {/* Fed Funds Rate */}
            <div className="p-3 border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/20 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[10px] text-[#e4e4e7]/60 mb-1 flex items-center gap-1">
                    Fed Funds Rate
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Info className="w-3 h-3 text-[#e4e4e7]/40" />
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-[#F7931A] font-mono">{d.fedRate.value.toFixed(2)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#e4e4e7]/40 mb-1">Next FOMC</div>
                  <div className="text-[11px] text-[#e4e4e7]/80">{d.fedRate.nextMeeting}</div>
                </div>
              </div>

              {/* Fed Probabilities */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#e4e4e7]/60">Hold @ {d.fedRate.value}%</span>
                  <span className="text-[#00D4AA] font-mono">{d.fedRate.probability.hold}%</span>
                </div>
                <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D4AA]" style={{ width: `${d.fedRate.probability.hold}%` }} />
                </div>

                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-[#e4e4e7]/60">Cut 25bps</span>
                  <span className="text-[#3B82F6] font-mono">{d.fedRate.probability.cut25}%</span>
                </div>
                <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6]" style={{ width: `${d.fedRate.probability.cut25}%` }} />
                </div>

                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-[#e4e4e7]/60">Hike 25bps</span>
                  <span className="text-[#FF4757] font-mono">{d.fedRate.probability.hike25}%</span>
                </div>
                <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF4757]" style={{ width: `${d.fedRate.probability.hike25}%` }} />
                </div>
              </div>

              <div className="mt-2 text-[9px] text-[#e4e4e7]/50 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Market pricing via CME FedWatch Tool
              </div>
            </div>

            {/* Treasury 10Y */}
            <div className="p-3 border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] text-[#e4e4e7]/60 mb-0.5">10Y Treasury Yield</div>
                    <div className="text-xl font-bold text-[#8B5CF6] font-mono">{d.treasury10y.value.toFixed(3)}%</div>
                  </div>
                  <div className={`text-[11px] font-bold font-mono ${getChangeByTimeframe(d.treasury10y) >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {getChangeByTimeframe(d.treasury10y) >= 0 ? '+' : ''}{getChangeByTimeframe(d.treasury10y).toFixed(3)}%
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[9px] text-[#e4e4e7]/40">52W Range</div>
                  <div className="text-[10px] text-[#e4e4e7]/60 font-mono">
                    {d.treasury10y.low52w.toFixed(2)} - {d.treasury10y.high52w.toFixed(2)}%
                  </div>
                  <div className="h-1 w-24 bg-[#1a1a2e] rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-[#00D4AA] via-[#F7931A] to-[#FF4757]"
                      style={{ width: `${getPercentile(d.treasury10y.value, d.treasury10y.low52w, d.treasury10y.high52w)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-[#e4e4e7]/40">1W: </span>
                  <span className={`font-mono ${d.treasury10y.change1w >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {d.treasury10y.change1w >= 0 ? '+' : ''}{d.treasury10y.change1w.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[#e4e4e7]/40">1M: </span>
                  <span className={`font-mono ${d.treasury10y.change1m >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {d.treasury10y.change1m >= 0 ? '+' : ''}{d.treasury10y.change1m.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[#e4e4e7]/40">Impact: </span>
                  <span className="text-[#FF4757]">Bearish</span>
                </div>
              </div>
            </div>

            {/* Yield Curve */}
            <div className="p-3 border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#e4e4e7]/60 mb-1 flex items-center gap-2">
                    Yield Curve (10Y-2Y)
                    {d.yieldSpread.inverted && (
                      <span className="px-1.5 py-0.5 bg-[#FF4757]/20 text-[#FF4757] text-[8px] rounded font-bold">
                        INVERTED
                      </span>
                    )}
                  </div>
                  <div className={`text-xl font-bold font-mono ${d.yieldSpread.inverted ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {d.yieldSpread.value.toFixed(3)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#e4e4e7]/40 mb-1">2Y Yield</div>
                  <div className="text-[11px] text-[#e4e4e7]/80 font-mono">{d.treasury2y.value.toFixed(3)}%</div>
                </div>
              </div>
              <div className="mt-2 text-[9px] text-[#e4e4e7]/50">
                {d.yieldSpread.inverted
                  ? '⚠️ Inverted yield curve historically precedes recessions'
                  : '✓ Normal yield curve suggests stable growth expectations'
                }
              </div>
            </div>

            {/* DXY */}
            <div className="p-3 hover:bg-[#1a1a2e]/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] text-[#e4e4e7]/60 mb-0.5">DXY (US Dollar Index)</div>
                    <div className="text-xl font-bold text-[#3B82F6] font-mono">{d.dxy.value.toFixed(2)}</div>
                  </div>
                  <div className={`text-[11px] font-bold font-mono ${getChangeByTimeframe(d.dxy) >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {getChangeByTimeframe(d.dxy) >= 0 ? '+' : ''}{getChangeByTimeframe(d.dxy).toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#e4e4e7]/40">BTC Correlation</div>
                  <div className="text-[11px] text-[#00D4AA] font-mono">-0.55 (Inverse)</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-[#e4e4e7]/40">1W: </span>
                  <span className={`font-mono ${d.dxy.change1w >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {d.dxy.change1w >= 0 ? '+' : ''}{d.dxy.change1w.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[#e4e4e7]/40">1M: </span>
                  <span className={`font-mono ${d.dxy.change1m >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
                    {d.dxy.change1m >= 0 ? '+' : ''}{d.dxy.change1m.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[#e4e4e7]/40">Impact: </span>
                  <span className={d.dxy.change < 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}>
                    {d.dxy.change < 0 ? 'Bullish' : 'Bearish'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rest of the sections will be added in next files... */}
    </div>
  );
}
