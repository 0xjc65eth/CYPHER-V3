'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEscapeKey } from '@/hooks/useEscapeKey'

function formatNum(n: number | string | null | undefined): string {
  if (n == null) return '--'
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return '--'
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

function truncate(s: string | null | undefined, len = 8): string {
  if (!s) return '--'
  if (s.length <= len + 3) return s
  return s.slice(0, len) + '...'
}

function timeAgo(ts: string | number | null | undefined): string {
  if (!ts) return '--'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function mintProgress(minted: string | number | null | undefined, total: string | number | null | undefined): number {
  const m = typeof minted === 'string' ? parseFloat(minted) : (minted ?? 0)
  const t = typeof total === 'string' ? parseFloat(total) : (total ?? 0)
  if (!t) return 0
  return Math.min((m / t) * 100, 100)
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3e] rounded ${className}`} />
}

function TableSkeleton({ rows = 8, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

interface BRC20Token {
  ticker: string
  max_supply: string | number | null
  total_minted: string | number | null
  holders_count: number | null
  deployed_timestamp: string | number | null
  mint_limit: string | number | null
  decimals: number | null
  mint_progress: number | null
  source: string
}

interface BRC20Activity {
  operation: string
  ticker: string
  inscription_id: string
  block_height: number
  tx_id: string
  address: string
  amount: string | number
  timestamp: string
}

interface BRC20Analytics {
  total_tokens?: number
  total_holders?: number
  total_transactions?: number
  total_mints?: number
  total_transfers?: number
  market_cap_usd?: number
  volume_24h_usd?: number
  active_tokens?: number
}

type SortKey = 'ticker' | 'max_supply' | 'total_minted' | 'holders_count' | 'deployed_timestamp' | 'mint_pct'
type SortDir = 'asc' | 'desc'

export default function BRC20Page() {
  const [tokens, setTokens] = useState<BRC20Token[]>([])
  const [activity, setActivity] = useState<BRC20Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [sortKey, setSortKey] = useState<SortKey>('holders_count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Analytics state
  const [analytics, setAnalytics] = useState<BRC20Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Mint tracker state
  const [mintActivity, setMintActivity] = useState<BRC20Activity[]>([])
  const [mintLoading, setMintLoading] = useState(false)

  // DEX activity state
  const [dexActivity, setDexActivity] = useState<BRC20Activity[]>([])
  const [dexLoading, setDexLoading] = useState(false)

  // Modal state for token details
  const [selectedToken, setSelectedToken] = useState<BRC20Token | null>(null)

  // ESC key handler for modal
  useEscapeKey(() => setSelectedToken(null), !!selectedToken)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [tokRes, actRes] = await Promise.allSettled([
        fetch('/api/brc20/tokens/?limit=50'),
        fetch('/api/brc20/activity/?limit=20'),
      ])

      let gotData = false
      if (tokRes.status === 'fulfilled' && tokRes.value.ok) {
        const d = await tokRes.value.json()
        if (d.success) { setTokens(d.data || []); gotData = true }
      }
      if (actRes.status === 'fulfilled' && actRes.value.ok) {
        const d = await actRes.value.json()
        if (d.success) { setActivity(d.data || []); gotData = true }
      }

      if (!gotData) setError('Failed to fetch BRC-20 data from all sources')
      setLastUpdated(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch('/api/brc20/analytics/')
      if (res.ok) {
        const d = await res.json()
        if (d.success) setAnalytics(d.data || d)
      }
    } catch { /* silent */ } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  const fetchMintActivity = useCallback(async () => {
    setMintLoading(true)
    try {
      const res = await fetch('/api/brc20/activity/?limit=30')
      if (res.ok) {
        const d = await res.json()
        if (d.success) {
          const mints = (d.data || []).filter((a: BRC20Activity) => a.operation === 'mint')
          setMintActivity(mints)
        }
      }
    } catch { /* silent */ } finally {
      setMintLoading(false)
    }
  }, [])

  const fetchDexActivity = useCallback(async () => {
    setDexLoading(true)
    try {
      const res = await fetch('/api/brc20/activity/?limit=30')
      if (res.ok) {
        const d = await res.json()
        if (d.success) {
          const trades = (d.data || []).filter((a: BRC20Activity) => a.operation === 'transfer' || a.operation === 'trade')
          setDexActivity(trades)
        }
      }
    } catch { /* silent */ } finally {
      setDexLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ' \u2195'
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  const sortedTokens = [...tokens].sort((a, b) => {
    let av: number, bv: number
    if (sortKey === 'ticker') {
      return sortDir === 'asc'
        ? (a.ticker || '').localeCompare(b.ticker || '')
        : (b.ticker || '').localeCompare(a.ticker || '')
    }
    if (sortKey === 'max_supply') {
      av = parseFloat(String(a.max_supply)) || 0; bv = parseFloat(String(b.max_supply)) || 0
    } else if (sortKey === 'total_minted') {
      av = parseFloat(String(a.total_minted)) || 0; bv = parseFloat(String(b.total_minted)) || 0
    } else if (sortKey === 'holders_count') {
      av = a.holders_count ?? 0; bv = b.holders_count ?? 0
    } else if (sortKey === 'deployed_timestamp') {
      av = new Date(String(a.deployed_timestamp)).getTime() || 0
      bv = new Date(String(b.deployed_timestamp)).getTime() || 0
    } else if (sortKey === 'mint_pct') {
      av = mintProgress(a.total_minted, a.max_supply)
      bv = mintProgress(b.total_minted, b.max_supply)
    } else {
      av = 0; bv = 0
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const totalTokens = tokens.length
  const totalHolders = tokens.reduce((sum, t) => sum + (t.holders_count ?? 0), 0)
  const fullyMinted = tokens.filter(t => mintProgress(t.total_minted, t.max_supply) >= 100).length

  const handleTabChange = (value: string) => {
    if (value === 'analytics' && !analytics && !analyticsLoading) {
      fetchAnalytics()
    }
    if (value === 'mint' && mintActivity.length === 0 && !mintLoading) {
      fetchMintActivity()
    }
    if (value === 'dex' && dexActivity.length === 0 && !dexLoading) {
      fetchDexActivity()
    }
  }

  const handleTokenClick = (token: BRC20Token) => {
    setSelectedToken(token)
    // TODO: Navigate to detail page when created
    // router.push(`/brc20/${token.ticker}`)
  }

  const renderActivityTable = (data: BRC20Activity[], isLoading: boolean, emptyMsg: string) => (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {isLoading ? <TableSkeleton cols={6} /> : data.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{emptyMsg}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0f]">
              <tr className="text-gray-500 text-xs">
                <th className="text-left p-3">Operation</th>
                <th className="text-left p-3">Ticker</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Block</th>
                <th className="text-left p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((act, i) => (
                <tr key={i} className="border-t border-[#2a2a3e] hover:bg-[#2a2a3e]/50 transition-colors">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      act.operation === 'mint' ? 'bg-green-900/50 text-green-400' :
                      act.operation === 'transfer' ? 'bg-blue-900/50 text-blue-400' :
                      act.operation === 'deploy' ? 'bg-purple-900/50 text-purple-400' :
                      act.operation === 'trade' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {act.operation}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-[#3b82f6] uppercase">{act.ticker}</td>
                  <td className="p-3">{formatNum(act.amount)}</td>
                  <td className="p-3 text-gray-400">{truncate(act.address)}</td>
                  <td className="p-3 text-gray-500">{formatNum(act.block_height)}</td>
                  <td className="p-3 text-gray-500">{timeAgo(act.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  if (error && tokens.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-mono">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="text-red-400 text-lg mb-4">Error: {error}</div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="px-6 py-2 bg-[#3b82f6] text-white font-bold rounded hover:bg-[#2563eb] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-mono text-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#3b82f6]">BRC-20</h1>
          <span className="text-xs text-gray-500">
            Last updated: {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
          </span>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Tokens', value: formatNum(totalTokens) },
            { label: 'Total Holders', value: formatNum(totalHolders) },
            { label: 'Fully Minted', value: formatNum(fullyMinted) },
            { label: 'Recent Activity', value: formatNum(activity.length) },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              {loading ? <Skeleton className="h-6 w-20" /> : (
                <div className="text-lg font-bold text-[#3b82f6]">{s.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tokens" className="w-full" onValueChange={handleTabChange}>
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="tokens" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent data-[state=active]:text-[#3b82f6] text-gray-500 px-4 py-2 text-sm font-mono">
                Token List
              </TabsTrigger>
              <TabsTrigger value="mint" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent data-[state=active]:text-[#3b82f6] text-gray-500 px-4 py-2 text-sm font-mono">
                Mint Tracker
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent data-[state=active]:text-[#3b82f6] text-gray-500 px-4 py-2 text-sm font-mono">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="dex" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent data-[state=active]:text-[#3b82f6] text-gray-500 px-4 py-2 text-sm font-mono">
                DEX Activity
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Token List Tab */}
          <TabsContent value="tokens">
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
              {loading ? <TableSkeleton /> : sortedTokens.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No BRC-20 tokens data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0a0a0f]">
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left p-3 cursor-pointer hover:text-gray-300" onClick={() => handleSort('ticker')}>
                          Ticker{sortIndicator('ticker')}
                        </th>
                        <th className="text-left p-3 cursor-pointer hover:text-gray-300" onClick={() => handleSort('max_supply')}>
                          Supply{sortIndicator('max_supply')}
                        </th>
                        <th className="text-left p-3 cursor-pointer hover:text-gray-300" onClick={() => handleSort('mint_pct')}>
                          Minted %{sortIndicator('mint_pct')}
                        </th>
                        <th className="text-left p-3 cursor-pointer hover:text-gray-300" onClick={() => handleSort('holders_count')}>
                          Holders{sortIndicator('holders_count')}
                        </th>
                        <th className="text-left p-3 cursor-pointer hover:text-gray-300" onClick={() => handleSort('deployed_timestamp')}>
                          Deployed{sortIndicator('deployed_timestamp')}
                        </th>
                        <th className="text-left p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTokens.map((token) => {
                        const pct = mintProgress(token.total_minted, token.max_supply)
                        return (
                          <tr key={token.ticker} className="border-t border-[#2a2a3e] hover:bg-[#2a2a3e]/50 transition-colors cursor-pointer" onClick={() => handleTokenClick(token)}>
                            <td className="p-3 font-bold text-[#3b82f6] uppercase hover:text-[#3b82f6]/80">{token.ticker}</td>
                            <td className="p-3">{formatNum(token.max_supply)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-[#3b82f6]'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs ${pct >= 100 ? 'text-green-400' : 'text-gray-400'}`}>
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-green-400">{formatNum(token.holders_count)}</td>
                            <td className="p-3 text-gray-500">{timeAgo(token.deployed_timestamp)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                pct >= 100
                                  ? 'bg-green-900/50 text-green-400'
                                  : 'bg-[#3b82f6]/10 text-[#3b82f6]'
                              }`}>
                                {pct >= 100 ? 'Completed' : 'Minting'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mint Tracker Tab */}
          <TabsContent value="mint">
            {renderActivityTable(
              mintActivity.length > 0 ? mintActivity : activity.filter(a => a.operation === 'mint'),
              mintLoading || (loading && mintActivity.length === 0),
              'No minting activity available'
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {analyticsLoading ? (
              <StatsSkeleton />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tokens', value: formatNum(analytics?.total_tokens ?? totalTokens) },
                    { label: 'Total Holders', value: formatNum(analytics?.total_holders ?? totalHolders) },
                    { label: 'Total Transactions', value: formatNum(analytics?.total_transactions) },
                    { label: 'Total Mints', value: formatNum(analytics?.total_mints) },
                    { label: 'Total Transfers', value: formatNum(analytics?.total_transfers) },
                    { label: 'Market Cap (USD)', value: analytics?.market_cap_usd ? `$${formatNum(analytics.market_cap_usd)}` : '--' },
                    { label: '24h Volume (USD)', value: analytics?.volume_24h_usd ? `$${formatNum(analytics.volume_24h_usd)}` : '--' },
                    { label: 'Active Tokens', value: formatNum(analytics?.active_tokens) },
                  ].map(s => (
                    <div key={s.label} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                      <div className="text-lg font-bold text-[#3b82f6]">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Mint completion distribution */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Mint Completion Distribution</h3>
                  <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                    {tokens.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">No token data available</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: '0-25%', count: tokens.filter(t => { const p = mintProgress(t.total_minted, t.max_supply); return p < 25 }).length },
                          { label: '25-50%', count: tokens.filter(t => { const p = mintProgress(t.total_minted, t.max_supply); return p >= 25 && p < 50 }).length },
                          { label: '50-75%', count: tokens.filter(t => { const p = mintProgress(t.total_minted, t.max_supply); return p >= 50 && p < 75 }).length },
                          { label: '75-100%', count: tokens.filter(t => { const p = mintProgress(t.total_minted, t.max_supply); return p >= 75 }).length },
                        ].map(bucket => (
                          <div key={bucket.label} className="text-center">
                            <div className="text-2xl font-bold text-[#3b82f6]">{bucket.count}</div>
                            <div className="text-xs text-gray-500">{bucket.label} minted</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* DEX Activity Tab */}
          <TabsContent value="dex">
            {renderActivityTable(
              dexActivity.length > 0 ? dexActivity : activity.filter(a => a.operation === 'transfer' || a.operation === 'trade'),
              dexLoading || (loading && dexActivity.length === 0),
              'No DEX trading activity available'
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Token Detail Modal */}
      {selectedToken && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedToken(null)}
        >
          <div
            className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#3b82f6] uppercase">{selectedToken.ticker}</h2>
              <button
                onClick={() => setSelectedToken(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Max Supply</div>
                  <div className="text-white font-bold">{formatNum(selectedToken.max_supply)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Minted</div>
                  <div className="text-white font-bold">{formatNum(selectedToken.total_minted)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Holders</div>
                  <div className="text-green-400 font-bold">{formatNum(selectedToken.holders_count)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Mint Limit</div>
                  <div className="text-white font-bold">{formatNum(selectedToken.mint_limit)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Decimals</div>
                  <div className="text-white font-bold">{selectedToken.decimals ?? '--'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Deployed</div>
                  <div className="text-white font-bold">{timeAgo(selectedToken.deployed_timestamp)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500">Mint Progress</div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          mintProgress(selectedToken.total_minted, selectedToken.max_supply) >= 100
                            ? 'bg-green-500'
                            : 'bg-[#3b82f6]'
                        }`}
                        style={{
                          width: `${Math.min(mintProgress(selectedToken.total_minted, selectedToken.max_supply), 100)}%`
                        }}
                      />
                    </div>
                    <div className="text-white font-bold font-mono">
                      {mintProgress(selectedToken.total_minted, selectedToken.max_supply).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500">Source</div>
                  <div className="text-gray-400 text-xs">{selectedToken.source}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center text-xs text-gray-500">
              Detail page coming soon
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
