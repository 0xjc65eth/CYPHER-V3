'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeeRateChart } from '@/components/network/FeeRateChart'
import { MempoolVisualization } from '@/components/network/MempoolVisualization'
import { HashrateChart } from '@/components/network/HashrateChart'
import { DifficultyChart } from '@/components/network/DifficultyChart'
import { MiningPoolDistribution } from '@/components/network/MiningPoolDistribution'

interface NetworkStats {
  market_price_usd: number
  hash_rate: number
  difficulty: number
  n_tx: number
  n_blocks_total: number
  minutes_between_blocks: number
  totalbc: number
  estimated_transaction_volume_usd: number
  miners_revenue_usd: number
}

interface LightningStats {
  latest: {
    channel_count: number
    node_count: number
    total_capacity: number
    avg_capacity: number
  }
}

interface FeeData {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
}

interface MempoolData {
  count: number
  vsize: number
  total_fee: number
}

function formatHashrate(gh: number): string {
  if (gh >= 1e9) return (gh / 1e9).toFixed(1) + ' EH/s'
  if (gh >= 1e6) return (gh / 1e6).toFixed(1) + ' PH/s'
  if (gh >= 1e3) return (gh / 1e3).toFixed(1) + ' TH/s'
  return gh.toFixed(1) + ' GH/s'
}

function formatDifficulty(d: number): string {
  if (d >= 1e12) return (d / 1e12).toFixed(2) + 'T'
  if (d >= 1e9) return (d / 1e9).toFixed(2) + 'G'
  return d.toFixed(0)
}

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatBTC(sats: number): string {
  return (sats / 1e8).toFixed(2)
}

const tabTriggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono"

export default function NetworkPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [fees, setFees] = useState<FeeData | null>(null)
  const [mempool, setMempool] = useState<MempoolData | null>(null)
  const [lightning, setLightning] = useState<LightningStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(30)

  const fetchTopStats = useCallback(async () => {
    try {
      const [statsRes, feesRes, mempoolRes, lnRes] = await Promise.allSettled([
        fetch('/api/onchain/stats'),
        fetch('/api/onchain/fees'),
        fetch('/api/onchain/mempool'),
        fetch('https://mempool.space/api/v1/lightning/statistics/latest'),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json()
        if (!data.error) setStats(data)
      }

      if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
        const data = await feesRes.value.json()
        if (!data.error) setFees(data)
      }

      if (mempoolRes.status === 'fulfilled' && mempoolRes.value.ok) {
        const data = await mempoolRes.value.json()
        if (!data.error) setMempool(data)
      }

      if (lnRes.status === 'fulfilled' && lnRes.value.ok) {
        const data = await lnRes.value.json()
        setLightning(data)
      }

      setLastUpdated(new Date())
      setStatsLoading(false)
      setStatsError(null)
      setCountdown(30)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load stats')
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopStats()
    const interval = setInterval(fetchTopStats, 60000) // CoinGecko rate limit: increased to 60s
    return () => clearInterval(interval)
  }, [fetchTopStats])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const StatSkeleton = () => (
    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4 animate-pulse">
      <div className="h-3 w-16 bg-gray-700/50 rounded mb-2" />
      <div className="h-6 w-24 bg-gray-700/50 rounded" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      <div className="container mx-auto py-6 px-4">
        {/* Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Bitcoin Network</h1>
            <p className="text-sm text-gray-400 mt-1">Real-time on-chain data from mempool.space</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>LIVE</span>
            </div>
            <div className="text-xs text-gray-500 bg-[#1a1a2e] px-3 py-1.5 rounded-lg border border-[#2a2a3e]">
              Refresh in {countdown}s
            </div>
            {lastUpdated && (
              <div className="text-xs text-gray-500">
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {statsError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <span>{statsError}</span>
            <button onClick={fetchTopStats} className="text-xs underline hover:text-red-300">Retry</button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
              <TabsTrigger value="mempool" className={tabTriggerClass}>Mempool</TabsTrigger>
              <TabsTrigger value="mining" className={tabTriggerClass}>Mining</TabsTrigger>
              <TabsTrigger value="lightning" className={tabTriggerClass}>Lightning</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statsLoading ? (
                  <>
                    {[...Array(6)].map((_, i) => <StatSkeleton key={i} />)}
                  </>
                ) : (
                  <>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Block Height</div>
                      <div className="text-lg font-bold text-orange-400">
                        {stats?.n_blocks_total ? stats.n_blocks_total.toLocaleString() : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Hash Rate</div>
                      <div className="text-lg font-bold text-blue-400">
                        {stats?.hash_rate ? formatHashrate(stats.hash_rate) : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Difficulty</div>
                      <div className="text-lg font-bold text-purple-400">
                        {stats?.difficulty ? formatDifficulty(stats.difficulty) : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Fee (Fast)</div>
                      <div className="text-lg font-bold text-amber-400">
                        {fees?.fastestFee ? `${fees.fastestFee} sat/vB` : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mempool TXs</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {mempool?.count ? formatNumber(mempool.count) : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">BTC Price</div>
                      <div className="text-lg font-bold text-green-400">
                        {stats?.market_price_usd ? `$${stats.market_price_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Summary charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FeeRateChart />
                </div>
                <div className="lg:col-span-1">
                  <MempoolVisualization />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mempool Tab */}
          <TabsContent value="mempool">
            <div className="space-y-6">
              {/* Fee summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statsLoading ? (
                  [...Array(4)].map((_, i) => <StatSkeleton key={i} />)
                ) : (
                  <>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Fastest Fee</div>
                      <div className="text-lg font-bold text-[#00ff88]">
                        {fees?.fastestFee ? `${fees.fastestFee} sat/vB` : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">30 Min Fee</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {fees?.halfHourFee ? `${fees.halfHourFee} sat/vB` : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">1 Hour Fee</div>
                      <div className="text-lg font-bold text-blue-400">
                        {fees?.hourFee ? `${fees.hourFee} sat/vB` : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Economy Fee</div>
                      <div className="text-lg font-bold text-gray-400">
                        {fees?.economyFee ? `${fees.economyFee} sat/vB` : '--'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mempool size info */}
              {mempool && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Unconfirmed TXs</div>
                    <div className="text-lg font-bold text-[#00ff88]">{formatNumber(mempool.count)}</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mempool Size</div>
                    <div className="text-lg font-bold text-[#00ff88]">
                      {mempool.vsize ? `${(mempool.vsize / 1e6).toFixed(1)} MvB` : '--'}
                    </div>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FeeRateChart />
                </div>
                <div className="lg:col-span-1">
                  <MempoolVisualization />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mining Tab */}
          <TabsContent value="mining">
            <div className="space-y-6">
              {/* Mining stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statsLoading ? (
                  [...Array(4)].map((_, i) => <StatSkeleton key={i} />)
                ) : (
                  <>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Hash Rate</div>
                      <div className="text-lg font-bold text-[#00ff88]">
                        {stats?.hash_rate ? formatHashrate(stats.hash_rate) : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Difficulty</div>
                      <div className="text-lg font-bold text-purple-400">
                        {stats?.difficulty ? formatDifficulty(stats.difficulty) : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Block Time</div>
                      <div className="text-lg font-bold text-amber-400">
                        {stats?.minutes_between_blocks ? `${stats.minutes_between_blocks.toFixed(1)} min` : '--'}
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-lg border border-[#2a2a3e] p-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Miner Revenue</div>
                      <div className="text-lg font-bold text-green-400">
                        {stats?.miners_revenue_usd ? `$${formatNumber(stats.miners_revenue_usd)}` : '--'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HashrateChart />
                <DifficultyChart />
              </div>

              <MiningPoolDistribution />
            </div>
          </TabsContent>

          {/* Lightning Tab */}
          <TabsContent value="lightning">
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Lightning Network</h3>
                    <p className="text-xs text-gray-400">Layer 2 payment network statistics</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    <span className="text-yellow-400">LN</span>
                  </div>
                </div>

                {lightning?.latest ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0a0a0f] rounded-lg p-4 border border-[#2a2a3e]">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Channels</div>
                      <div className="text-xl font-bold text-yellow-400">
                        {lightning.latest.channel_count?.toLocaleString() || '--'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0f] rounded-lg p-4 border border-[#2a2a3e]">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nodes</div>
                      <div className="text-xl font-bold text-yellow-400">
                        {lightning.latest.node_count?.toLocaleString() || '--'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0f] rounded-lg p-4 border border-[#2a2a3e]">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Capacity</div>
                      <div className="text-xl font-bold text-yellow-400">
                        {lightning.latest.total_capacity ? formatBTC(lightning.latest.total_capacity) + ' BTC' : '--'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0f] rounded-lg p-4 border border-[#2a2a3e]">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Capacity</div>
                      <div className="text-xl font-bold text-yellow-400">
                        {lightning.latest.avg_capacity ? formatBTC(lightning.latest.avg_capacity) + ' BTC' : '--'}
                      </div>
                    </div>
                  </div>
                ) : statsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-[#0a0a0f] rounded-lg p-4 border border-[#2a2a3e] animate-pulse">
                        <div className="h-3 w-16 bg-gray-700/50 rounded mb-2" />
                        <div className="h-6 w-20 bg-gray-700/50 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    Lightning Network data unavailable
                  </div>
                )}

                {lastUpdated && (
                  <div className="text-[10px] text-gray-500 text-right mt-3">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#2a2a3e] text-xs text-gray-500 flex justify-between items-center">
          <span>Data sources: mempool.space API, blockchain.com API</span>
          {lastUpdated && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
