'use client'

import { useState, useEffect, useCallback } from 'react'

interface MempoolBlock {
  blockSize: number
  blockVSize: number
  nTx: number
  totalFees: number
  medianFee: number
  feeRange: number[]
}

function getFeeColor(medianFee: number): string {
  if (medianFee >= 100) return 'from-red-500 to-orange-500'
  if (medianFee >= 50) return 'from-orange-500 to-amber-500'
  if (medianFee >= 20) return 'from-amber-500 to-yellow-500'
  if (medianFee >= 10) return 'from-yellow-500 to-green-500'
  return 'from-green-500 to-emerald-500'
}

function getFeeLabel(medianFee: number): string {
  if (medianFee >= 100) return 'Very High'
  if (medianFee >= 50) return 'High'
  if (medianFee >= 20) return 'Medium'
  if (medianFee >= 10) return 'Low'
  return 'Very Low'
}

function formatBTC(sats: number): string {
  return (sats / 1e8).toFixed(4)
}

export function MempoolVisualization() {
  const [blocks, setBlocks] = useState<MempoolBlock[]>([])
  const [mempoolStats, setMempoolStats] = useState<{ count: number; vsize: number; total_fee: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMempool = useCallback(async () => {
    try {
      const [blocksRes, statsRes] = await Promise.all([
        fetch('https://mempool.space/api/v1/fees/mempool-blocks'),
        fetch('/api/onchain/mempool/'),
      ])

      if (!blocksRes.ok) throw new Error('Failed to fetch mempool blocks')
      const blocksData: MempoolBlock[] = await blocksRes.json()
      setBlocks(blocksData.slice(0, 8))

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (!statsData.error) {
          setMempoolStats(statsData)
        }
      }

      setLastUpdated(new Date())
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mempool data')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMempool()
    const interval = setInterval(fetchMempool, 30000)
    return () => clearInterval(interval)
  }, [fetchMempool])

  if (isLoading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
        <div className="h-6 w-48 bg-gray-700/50 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-red-500/20 p-6 font-mono">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={fetchMempool} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Retry
        </button>
      </div>
    )
  }

  const totalTx = mempoolStats?.count || blocks.reduce((sum, b) => sum + b.nTx, 0)
  const totalFees = blocks.reduce((sum, b) => sum + b.totalFees, 0)

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Mempool Blocks</h3>
          <p className="text-xs text-gray-400">Pending transactions by fee priority</p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-center">
            <div className="text-orange-400 font-bold">{totalTx.toLocaleString()}</div>
            <div className="text-gray-500">Total TXs</div>
          </div>
          <div className="text-center">
            <div className="text-amber-400 font-bold">{formatBTC(totalFees)} BTC</div>
            <div className="text-gray-500">Total Fees</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {blocks.map((block, i) => (
          <div
            key={i}
            className={`relative rounded-lg p-3 bg-gradient-to-br ${getFeeColor(block.medianFee)} bg-opacity-20 border border-white/10 transition-all duration-300 hover:scale-105 hover:border-orange-400/40`}
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="absolute top-1 right-1.5 text-[10px] text-white/60 font-mono">
              #{i + 1}
            </div>
            <div className="text-white font-bold text-sm mb-1">
              {block.nTx.toLocaleString()} txs
            </div>
            <div className="text-white/80 text-[11px]">
              ~{Math.round(block.medianFee)} sat/vB
            </div>
            <div className="text-white/60 text-[10px]">
              {formatBTC(block.totalFees)} BTC
            </div>
            <div className="mt-1.5 text-[9px] text-white/50">
              {getFeeLabel(block.medianFee)}
            </div>
            <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/40"
                style={{ width: `${Math.min(100, (block.nTx / (blocks[0]?.nTx || 1)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center text-gray-500 py-8 text-sm">
          No pending blocks in mempool
        </div>
      )}

      {lastUpdated && (
        <div className="text-[10px] text-gray-500 text-right mt-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
