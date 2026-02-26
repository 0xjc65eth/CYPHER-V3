'use client';

import React, { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';

interface CorrelationMatrixProps {
  loading: boolean;
  error?: string | null;
}

const ASSETS = ['BTC', 'S&P500', 'Gold', 'DXY', 'NASDAQ', 'ETH', 'Oil', 'Bonds'];

type Matrix = number[][];

// BTC correlation estimates (row 0 / col 0)
// These are hardcoded estimates - same as what the API returns
const BTC_CORRELATIONS: Record<number, number> = {
  1: 0.68,   // S&P 500
  2: 0.42,   // Gold
  3: -0.55,  // DXY
  4: 0.72,   // Nasdaq
  5: 0.89,   // Ethereum
  6: 0.28,   // Oil
  7: -0.32,  // Bonds
};

// Non-BTC pair correlations (realistic financial estimates)
const PAIR_CORRELATIONS: Record<string, number> = {
  '1-2': 0.12, '1-3': -0.45, '1-4': 0.95, '1-5': 0.72, '1-6': 0.35, '1-7': -0.28,
  '2-3': -0.62, '2-4': 0.15, '2-5': 0.08, '2-6': 0.22, '2-7': 0.45,
  '3-4': -0.38, '3-5': -0.15, '3-6': -0.12, '3-7': -0.55,
  '4-5': 0.78, '4-6': 0.30, '4-7': -0.32,
  '5-6': 0.18, '5-7': -0.10,
  '6-7': -0.08,
};

function buildMatrix(): Matrix {
  const n = ASSETS.length;
  const m: Matrix = Array.from({ length: n }, () => Array(n).fill(0));

  // Diagonal = 1
  for (let i = 0; i < n; i++) m[i][i] = 1;

  // BTC correlations (row 0 / col 0)
  for (const [idx, val] of Object.entries(BTC_CORRELATIONS)) {
    const j = parseInt(idx);
    m[0][j] = val;
    m[j][0] = val;
  }

  // Non-BTC pairs
  for (const [key, val] of Object.entries(PAIR_CORRELATIONS)) {
    const [iStr, jStr] = key.split('-');
    const i = parseInt(iStr);
    const j = parseInt(jStr);
    m[i][j] = val;
    m[j][i] = val;
  }

  return m;
}

function correlationColor(value: number): string {
  if (value >= 1) return 'rgba(228, 228, 231, 0.08)'; // diagonal
  const abs = Math.abs(value);
  const intensity = Math.min(abs, 1);

  if (value > 0.5) return `rgba(0, 255, 136, ${0.2 + intensity * 0.5})`;
  if (value > 0) return `rgba(0, 255, 136, ${0.05 + intensity * 0.2})`;
  if (value > -0.5) return `rgba(255, 51, 102, ${0.05 + intensity * 0.2})`;
  return `rgba(255, 51, 102, ${0.2 + intensity * 0.5})`;
}

function correlationTextColor(value: number): string {
  if (Math.abs(value) >= 0.99) return 'text-[#e4e4e7]/30';
  if (value > 0.5) return 'text-[#00ff88]';
  if (value > 0) return 'text-[#00ff88]/60';
  if (value > -0.5) return 'text-[#ff3366]/60';
  return 'text-[#ff3366]';
}

function SkeletonMatrix() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-1">
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} className="w-10 h-10 bg-[#2a2a3e]/30 animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Pre-build the matrix (static data, no API call needed)
const STATIC_MATRIX = buildMatrix();

export function CorrelationMatrix({ loading: externalLoading, error: externalError }: CorrelationMatrixProps) {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Use static matrix directly - no API call needed since data is hardcoded
    setMatrix(STATIC_MATRIX);
    setFetching(false);
  }, []);

  const isLoading = externalLoading || fetching;

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
          Cross-Asset Correlations
        </span>
      </div>

      {isLoading ? (
        <SkeletonMatrix />
      ) : externalError ? (
        <div className="py-6 text-center text-[10px] text-[#ff3366] font-mono">{externalError}</div>
      ) : !matrix ? (
        <div className="py-6 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
          No correlation data
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th className="w-10 h-8" />
                {ASSETS.map((asset) => (
                  <th
                    key={asset}
                    className="text-[8px] font-mono text-[#e4e4e7]/40 font-normal px-0.5 h-8 w-10 text-center"
                  >
                    <span className="inline-block" style={{ writingMode: 'horizontal-tb' }}>
                      {asset}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((rowAsset, i) => (
                <tr key={rowAsset}>
                  <td className="text-[8px] font-mono text-[#e4e4e7]/40 pr-1 text-right whitespace-nowrap">
                    {rowAsset}
                  </td>
                  {ASSETS.map((_, j) => {
                    const val = matrix[i]?.[j] ?? 0;
                    const isDiag = i === j;
                    return (
                      <td key={j} className="p-0.5">
                        <div
                          className={`w-10 h-10 flex items-center justify-center rounded-sm transition-colors ${
                            isDiag ? 'border border-[#2a2a3e]/30' : 'hover:brightness-150 cursor-default'
                          }`}
                          style={{ backgroundColor: correlationColor(val) }}
                          title={`${rowAsset} vs ${ASSETS[j]}: ${val.toFixed(3)}`}
                        >
                          <span
                            className={`text-[9px] font-mono ${correlationTextColor(val)}`}
                          >
                            {isDiag ? '1.00' : val.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-[#2a2a3e]/30">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,51,102,0.5)' }} />
              <span className="text-[8px] font-mono text-[#e4e4e7]/30">Strong -</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,51,102,0.15)' }} />
              <span className="text-[8px] font-mono text-[#e4e4e7]/30">Weak -</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(0,255,136,0.15)' }} />
              <span className="text-[8px] font-mono text-[#e4e4e7]/30">Weak +</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(0,255,136,0.5)' }} />
              <span className="text-[8px] font-mono text-[#e4e4e7]/30">Strong +</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
