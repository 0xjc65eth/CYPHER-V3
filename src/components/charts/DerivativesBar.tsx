'use client'

import React from 'react'

interface Props {
  fundingRate: number | null
  openInterest: number | null
  longShortRatio: number | null
  loading: boolean
  lastPrice?: number
  predictedFunding?: number | null
}

function formatOI(n: number | null): string {
  if (n === null) return '--'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(2)
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n.toFixed(2)
}

export function DerivativesBar({ fundingRate, openInterest, longShortRatio, loading, lastPrice, predictedFunding }: Props) {
  const fundingPct = fundingRate !== null ? (fundingRate * 100).toFixed(4) : '--'
  const fundingColor =
    fundingRate === null ? 'text-gray-500' : fundingRate > 0 ? 'text-green-400' : fundingRate < 0 ? 'text-red-400' : 'text-gray-400'

  const lsDisplay = longShortRatio !== null ? longShortRatio.toFixed(2) : '--'
  const lsColor =
    longShortRatio === null ? 'text-gray-500' : longShortRatio > 1 ? 'text-green-400' : longShortRatio < 1 ? 'text-red-400' : 'text-gray-400'

  // Estimated liquidation levels (simplified: based on common leverage positions)
  const price = lastPrice || 0
  const liqLong10x = price > 0 ? price * 0.9 : 0 // 10x long liquidation ~-10%
  const liqShort10x = price > 0 ? price * 1.1 : 0 // 10x short liquidation ~+10%

  const predictedPct = predictedFunding !== null && predictedFunding !== undefined
    ? (predictedFunding * 100).toFixed(4)
    : null
  const predColor = predictedFunding !== null && predictedFunding !== undefined
    ? (predictedFunding > (fundingRate || 0) ? 'text-green-400' : predictedFunding < (fundingRate || 0) ? 'text-red-400' : 'text-gray-400')
    : 'text-gray-500'

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-[#111118] border border-gray-800 rounded text-xs font-mono">
      {loading && <span className="text-gray-600 animate-pulse">Loading derivatives...</span>}

      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 uppercase tracking-wider">Funding</span>
        <span className={`font-bold ${fundingColor}`}>{fundingPct}%</span>
      </div>
      <div className="w-px h-3 bg-gray-700" />

      {predictedPct && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase tracking-wider">Pred.</span>
            <span className={`font-bold ${predColor}`}>{predictedPct}%</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
        </>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 uppercase tracking-wider">OI</span>
        <span className="font-bold text-blue-400">{formatOI(openInterest)}</span>
      </div>
      <div className="w-px h-3 bg-gray-700" />

      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 uppercase tracking-wider">L/S</span>
        <span className={`font-bold ${lsColor}`}>{lsDisplay}</span>
      </div>

      {price > 0 && (
        <>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase tracking-wider">Liq 10x</span>
            <span className="text-red-400 font-bold">${formatPrice(liqLong10x)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-green-400 font-bold">${formatPrice(liqShort10x)}</span>
          </div>
        </>
      )}
    </div>
  )
}
