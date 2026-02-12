'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PoolData {
  name: string
  blocks: number
  share: number
}

const COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308',
  '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#64748b',
]

export function MiningPoolDistribution() {
  const [pools, setPools] = useState<PoolData[]>([])
  const [totalBlocks, setTotalBlocks] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPools = useCallback(async () => {
    try {
      const res = await fetch('/api/onchain/mining')
      if (!res.ok) throw new Error('Failed to fetch mining pools')
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const poolList: PoolData[] = (data.pools || [])
        .slice(0, 12)
        .map((p: { name: string; blocks: number; share: number }) => ({
          name: p.name,
          blocks: p.blocks,
          share: p.share,
        }))

      setPools(poolList)
      setTotalBlocks(poolList.reduce((s: number, p: PoolData) => s + p.blocks, 0))
      setLastUpdated(new Date())
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mining pool data')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPools()
    const interval = setInterval(fetchPools, 300000)
    return () => clearInterval(interval)
  }, [fetchPools])

  if (isLoading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
        <div className="h-6 w-48 bg-gray-700/50 rounded mb-4 animate-pulse" />
        <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-red-500/20 p-6 font-mono">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={fetchPools} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Mining Pool Distribution</h3>
          <p className="text-xs text-gray-400">Past 7 days - {totalBlocks.toLocaleString()} blocks mined</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pools}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="blocks"
                nameKey="name"
                stroke="none"
              >
                {pools.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value} blocks`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2">
          {pools.map((pool, i) => (
            <div
              key={pool.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="min-w-0">
                <div className="text-white text-xs font-medium truncate">{pool.name}</div>
                <div className="text-gray-400 text-[10px]">
                  {pool.blocks} blocks ({pool.share}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastUpdated && (
        <div className="text-[10px] text-gray-500 text-right mt-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
