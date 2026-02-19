'use client';

import React, { useEffect, useState } from 'react';
import { GitBranch, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';

interface CorrelationData {
  correlations: Record<string, { value: number | null; note?: string }>;
  fearGreed: {
    current: { value: number; classification: string } | null;
    history: { value: number; classification: string; date: string }[];
  };
  timestamp: number;
}

interface CorrelationsProProps {
  refreshTrigger?: number;
}

export function CorrelationsPro({ refreshTrigger = 0 }: CorrelationsProProps) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/market/correlations/');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          throw new Error('Failed to fetch correlations');
        }
      } catch (err) {
        console.error('Error fetching correlations:', err);
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
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#ff3366]" />
          <div className="text-sm text-[#e4e4e7]/60 mb-2">Failed to load correlations</div>
          <div className="text-xs text-[#e4e4e7]/40">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getCorrelationColor = (value: number | null) => {
    if (value === null) return 'text-[#e4e4e7]/30';
    const abs = Math.abs(value);
    if (abs >= 0.7) return value > 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
    if (abs >= 0.5) return value > 0 ? 'text-[#88cc00]' : 'text-[#ff8833]';
    return 'text-[#e4e4e7]/60';
  };

  const getCorrelationStrength = (value: number | null) => {
    if (value === null) return 'N/A';
    const abs = Math.abs(value);
    if (abs >= 0.7) return 'Strong';
    if (abs >= 0.5) return 'Moderate';
    if (abs >= 0.3) return 'Weak';
    return 'Very Weak';
  };

  const getCorrelationBar = (value: number | null) => {
    if (value === null) return 0;
    return Math.abs(value) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Fear & Greed Index */}
      {data.fearGreed?.current && (
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
              Market Sentiment
            </h3>
            <div className="text-[8px] text-[#e4e4e7]/40 font-mono">
              Fear & Greed Index
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1a1a2e"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={
                      data.fearGreed.current.value <= 25
                        ? '#ff3366'
                        : data.fearGreed.current.value <= 50
                        ? '#ffcc00'
                        : '#00ff88'
                    }
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(data.fearGreed.current.value / 100) * 251.2} 251.2`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#e4e4e7]">
                      {data.fearGreed.current.value}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-sm font-bold text-[#e4e4e7] mb-1">
                {data.fearGreed.current.classification}
              </div>
              <div className="text-xs text-[#e4e4e7]/60 mb-3">
                Current market sentiment indicator
              </div>

              {/* Mini history */}
              {data.fearGreed.history && data.fearGreed.history.length > 0 && (
                <div className="flex items-end gap-0.5 h-12">
                  {data.fearGreed.history.slice(-30).map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${(h.value / 100) * 48}px`,
                        backgroundColor:
                          h.value <= 25
                            ? '#ff3366'
                            : h.value <= 50
                            ? '#ffcc00'
                            : '#00ff88',
                        opacity: 0.3 + (i / data.fearGreed.history.length) * 0.7,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Correlations Matrix */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Bitcoin Correlations
          </h3>
          <div className="text-[8px] text-[#e4e4e7]/40 font-mono">
            vs Traditional Assets
          </div>
        </div>

        <div className="space-y-3">
          {data.correlations && Object.entries(data.correlations).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#e4e4e7]/80 uppercase font-mono text-xs">
                    {key}
                  </span>
                  {val.value !== null && (
                    <span className="text-[9px] text-[#e4e4e7]/40">
                      {getCorrelationStrength(val.value)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {val.value !== null ? (
                    <>
                      <div className="w-32 h-2 bg-[#1a1a2e] rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            val.value >= 0 ? 'bg-[#00ff88]' : 'bg-[#ff3366]'
                          }`}
                          style={{
                            width: `${getCorrelationBar(val.value)}%`,
                          }}
                        />
                      </div>
                      <span className={`font-mono text-xs font-bold w-16 text-right ${getCorrelationColor(val.value)}`}>
                        {val.value.toFixed(3)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-[#e4e4e7]/30 italic">
                      {val.note || 'No data'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!data.correlations || Object.keys(data.correlations).length === 0) && (
          <div className="text-center py-8 text-[#e4e4e7]/40 text-sm">
            No correlation data available
          </div>
        )}
      </div>

      {/* Correlation Guide */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
        <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono mb-3">
          Interpretation Guide
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[#00ff88] font-mono mb-1">+1.0 to +0.7</div>
            <div className="text-[#e4e4e7]/60">Strong positive correlation</div>
          </div>
          <div>
            <div className="text-[#88cc00] font-mono mb-1">+0.7 to +0.3</div>
            <div className="text-[#e4e4e7]/60">Moderate positive correlation</div>
          </div>
          <div>
            <div className="text-[#e4e4e7]/60 font-mono mb-1">+0.3 to -0.3</div>
            <div className="text-[#e4e4e7]/60">Weak/No correlation</div>
          </div>
          <div>
            <div className="text-[#ff3366] font-mono mb-1">-0.3 to -1.0</div>
            <div className="text-[#e4e4e7]/60">Negative correlation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
