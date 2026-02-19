'use client'

import { useState, useEffect } from 'react'
import { TopNavLayout } from '@/components/layout/TopNavLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMempoolHashrate } from '@/hooks/useMempoolHashrate'
import { useMempoolDifficulty } from '@/hooks/useMempoolDifficulty'
import { useMempoolPools } from '@/hooks/useMempoolPools'
import { useMempoolBlocks } from '@/hooks/useMempoolBlocks'

interface MiningEconomics {
  blockReward: number
  avgFeePerBlock: number
  hashPrice: number
  breakEvenPrice: number
  dailyRevenue: number
  networkHashrate: number
}

const tabTriggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-[#8B5CF6] text-gray-500 px-4 py-2 text-sm font-mono"

export default function MinersPage() {
  const { data: hashrateData, isLoading: isHashrateLoading } = useMempoolHashrate()
  const { data: difficultyData, isLoading: isDifficultyLoading } = useMempoolDifficulty()
  const { data: poolsData, isLoading: isPoolsLoading } = useMempoolPools()
  const { data: blocksData, isLoading: isBlocksLoading } = useMempoolBlocks()
  const [economics, setEconomics] = useState<MiningEconomics | null>(null)
  const [economicsLoading, setEconomicsLoading] = useState(true)
  const [economicsError, setEconomicsError] = useState<string | null>(null)

  const decentralization = poolsData && poolsData.length > 0 ? 100 - poolsData[0].share : 0

  useEffect(() => {
    async function fetchEconomics() {
      try {
        const res = await fetch('/api/onchain/mining/')
        if (res.ok) {
          const data = await res.json()
          if (!data.error) setEconomics(data)
        }
      } catch {
        setEconomicsError('Failed to load mining economics')
      } finally {
        setEconomicsLoading(false)
      }
    }
    fetchEconomics()
  }, [])

  return (
    <TopNavLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">
            MINERS & NETWORK HEALTH
          </h1>
          <h2 className="text-lg text-muted-foreground mb-6">
            Real-time Bitcoin mining data
          </h2>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
              <TabsTrigger value="pools" className={tabTriggerClass}>Pools</TabsTrigger>
              <TabsTrigger value="blocks" className={tabTriggerClass}>Blocks</TabsTrigger>
              <TabsTrigger value="economics" className={tabTriggerClass}>Economics</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <HashrateCard data={hashrateData} loading={isHashrateLoading} />
                <DifficultyCard data={difficultyData} loading={isDifficultyLoading} />
                <PoolsCard data={poolsData} loading={isPoolsLoading} />
                <DecentralizationCard decentralization={decentralization} />
              </div>
              <RecentBlocksCard data={blocksData} loading={isBlocksLoading} />
            </div>
          </TabsContent>

          {/* Pools Tab */}
          <TabsContent value="pools">
            <PoolsTable data={poolsData} loading={isPoolsLoading} hashrateData={hashrateData} />
          </TabsContent>

          {/* Blocks Tab */}
          <TabsContent value="blocks">
            <BlocksTable data={blocksData} loading={isBlocksLoading} />
          </TabsContent>

          {/* Economics Tab */}
          <TabsContent value="economics">
            <EconomicsPanel data={economics} loading={economicsLoading} error={economicsError} />
          </TabsContent>
        </Tabs>
      </div>
    </TopNavLayout>
  )
}

/* ── Existing sub-components ── */

function HashrateCard({ data, loading }: { data: any; loading: boolean }) {
  return (
    <Card className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white border-none">
      <CardHeader>
        <CardTitle className="text-white">Network Hashrate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading || !Array.isArray(data) || data.length === 0
            ? 'Loading...'
            : `${(data[data.length - 1].avgHashrate / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })} EH/s`}
        </div>
      </CardContent>
    </Card>
  )
}

function DifficultyCard({ data, loading }: { data: any; loading: boolean }) {
  return (
    <Card className="bg-gradient-to-br from-[#f59e42] to-[#fbbf24] text-white border-none">
      <CardHeader>
        <CardTitle className="text-white">Current Difficulty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading || !data ? 'Loading...' : `${(data / 1e12).toLocaleString('en-US', { maximumFractionDigits: 2 })} T`}
        </div>
      </CardContent>
    </Card>
  )
}

function PoolsCard({ data, loading }: { data: any; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mining Pools</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {data?.slice(0, 3).map((pool: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span>{pool.name || 'Unknown'}</span>
                <span>{pool.share ? pool.share.toFixed(1) : '0.0'}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DecentralizationCard({ decentralization }: { decentralization: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decentralization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{decentralization.toFixed(1)}%</div>
        <p className="text-sm text-muted-foreground mt-2">
          Network distribution level
        </p>
      </CardContent>
    </Card>
  )
}

function RecentBlocksCard({ data, loading }: { data: any; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Blocks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {data?.slice(0, 5).map((block: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>#{block.height}</span>
                <span>{block.poolName || 'Unknown'}</span>
                <span>{(block.reward / 1e8).toFixed(2)} BTC</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── New sub-components ── */

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 animate-pulse">
          {[...Array(cols)].map((_, c) => (
            <div key={c} className="h-5 bg-gray-700/50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function PoolsTable({ data, loading, hashrateData }: { data: any; loading: boolean; hashrateData: any }) {
  const networkHashrate = Array.isArray(hashrateData) && hashrateData.length > 0
    ? hashrateData[hashrateData.length - 1].avgHashrate
    : 0

  return (
    <div className="bg-[#0d0d1a] rounded-xl border border-[#1a1a2e] p-6">
      <h3 className="text-lg font-bold text-white font-mono mb-4">Mining Pool Distribution</h3>
      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : !data || data.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm font-mono">No pool data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#1a1a2e]">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Pool Name</th>
                <th className="text-right py-3 px-2">Share %</th>
                <th className="text-right py-3 px-2">Est. Hashrate</th>
                <th className="text-right py-3 px-2">Blocks Found</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pool: any, idx: number) => (
                <tr key={idx} className="border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/30 transition-colors">
                  <td className="py-3 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-2 text-white font-semibold">{pool.name || 'Unknown'}</td>
                  <td className="py-3 px-2 text-right text-[#8B5CF6]">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8B5CF6] rounded-full"
                          style={{ width: `${Math.min(pool.share || 0, 100)}%` }}
                        />
                      </div>
                      {pool.share ? pool.share.toFixed(1) : '0.0'}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-300">
                    {networkHashrate && pool.share
                      ? `${((networkHashrate * pool.share / 100) / 1e18).toFixed(2)} EH/s`
                      : '--'}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-300">
                    {pool.blockCount?.toLocaleString() || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BlocksTable({ data, loading }: { data: any; loading: boolean }) {
  return (
    <div className="bg-[#0d0d1a] rounded-xl border border-[#1a1a2e] p-6">
      <h3 className="text-lg font-bold text-white font-mono mb-4">Recent Blocks</h3>
      {loading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : !data || data.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm font-mono">No block data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#1a1a2e]">
                <th className="text-left py-3 px-2">Height</th>
                <th className="text-left py-3 px-2">Timestamp</th>
                <th className="text-left py-3 px-2">Miner</th>
                <th className="text-right py-3 px-2">TX Count</th>
                <th className="text-right py-3 px-2">Size</th>
                <th className="text-right py-3 px-2">Fee (BTC)</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 15).map((block: any, idx: number) => (
                <tr key={idx} className="border-b border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/30 transition-colors">
                  <td className="py-3 px-2 text-[#8B5CF6] font-semibold">#{block.height?.toLocaleString()}</td>
                  <td className="py-3 px-2 text-gray-400">
                    {block.timestamp
                      ? new Date(block.timestamp * 1000).toLocaleString()
                      : '--'}
                  </td>
                  <td className="py-3 px-2 text-white">{block.poolName || block.extras?.pool?.name || 'Unknown'}</td>
                  <td className="py-3 px-2 text-right text-gray-300">{block.tx_count?.toLocaleString() || '--'}</td>
                  <td className="py-3 px-2 text-right text-gray-300">
                    {block.size ? `${(block.size / 1e6).toFixed(2)} MB` : '--'}
                  </td>
                  <td className="py-3 px-2 text-right text-amber-400">
                    {block.reward ? ((block.reward - 312500000) / 1e8).toFixed(4) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EconomicsPanel({ data, loading, error }: { data: MiningEconomics | null; loading: boolean; error: string | null }) {
  if (error) {
    return (
      <div className="bg-[#0d0d1a] rounded-xl border border-red-500/20 p-6">
        <div className="text-center text-red-400 py-8 text-sm font-mono">{error}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#0d0d1a] rounded-xl border border-[#1a1a2e] p-6 animate-pulse">
            <div className="h-3 w-20 bg-gray-700/50 rounded mb-3" />
            <div className="h-7 w-28 bg-gray-700/50 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-700/50 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Block Reward',
      value: data?.blockReward ? `${(data.blockReward / 1e8).toFixed(4)} BTC` : '3.125 BTC',
      sub: 'Current subsidy per block',
      color: 'text-[#8B5CF6]',
    },
    {
      label: 'Avg Fee Revenue',
      value: data?.avgFeePerBlock ? `${(data.avgFeePerBlock / 1e8).toFixed(4)} BTC` : '--',
      sub: 'Average fees per block',
      color: 'text-amber-400',
    },
    {
      label: 'Daily Revenue',
      value: data?.dailyRevenue ? `$${data.dailyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--',
      sub: 'Estimated daily miner revenue',
      color: 'text-green-400',
    },
    {
      label: 'Break-Even Price',
      value: data?.breakEvenPrice ? `$${data.breakEvenPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--',
      sub: 'Avg mining cost estimate',
      color: 'text-red-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-[#0d0d1a] rounded-xl border border-[#1a1a2e] p-6">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-2">{card.label}</div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-2 font-mono">{card.sub}</div>
          </div>
        ))}
      </div>
      {data?.networkHashrate && (
        <div className="bg-[#0d0d1a] rounded-xl border border-[#1a1a2e] p-6">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-2">Network Hashrate</div>
          <div className="text-xl font-bold text-[#8B5CF6] font-mono">
            {(data.networkHashrate / 1e18).toFixed(2)} EH/s
          </div>
        </div>
      )}
    </div>
  )
}
