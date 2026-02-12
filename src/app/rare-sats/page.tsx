'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function formatNum(n: number | string | null | undefined): string {
  if (n == null) return '--'
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return '--'
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3e] rounded ${className}`} />
}

interface RareSatCategory {
  name: string
  description: string
  rarity: string
  estimated_total: number
  frequency: string
  example_sat: string
  supply_info: string
}

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  mythic: { bg: 'bg-red-900/20', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  legendary: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/40', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  epic: { bg: 'bg-purple-900/20', border: 'border-purple-500/40', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  rare: { bg: 'bg-blue-900/20', border: 'border-blue-500/40', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
  very_rare: { bg: 'bg-cyan-900/20', border: 'border-cyan-500/40', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400' },
  uncommon: { bg: 'bg-green-900/20', border: 'border-green-500/40', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
  common: { bg: 'bg-gray-800/40', border: 'border-gray-600/40', text: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-400' },
}

function getColors(rarity: string) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common
}

// Rarity order for sorting
const RARITY_ORDER: Record<string, number> = {
  mythic: 0, legendary: 1, epic: 2, very_rare: 3, rare: 4, uncommon: 5, common: 6,
}

const EDUCATION_CONTENT = [
  {
    title: 'Mythic Sats',
    rarity: 'mythic',
    description: 'The rarest of all satoshis. Mythic sats are the very first satoshi of each new difficulty adjustment period. Only one exists per difficulty epoch, making them extraordinarily rare and valuable.',
    examples: 'The Genesis Sat (sat #0) is the most famous mythic satoshi, mined by Satoshi Nakamoto.',
  },
  {
    title: 'Legendary Sats',
    rarity: 'legendary',
    description: 'Legendary sats are the first satoshi of each halving epoch. Since Bitcoin only has 4 halvings total (with a potential 5th), there are extremely few legendary sats in existence.',
    examples: 'First sat of the 2012, 2016, 2020, and 2024 halving blocks.',
  },
  {
    title: 'Epic Sats',
    rarity: 'epic',
    description: 'Epic sats are the first satoshi of each difficulty adjustment period. Difficulty adjustments happen approximately every 2016 blocks, making these sats quite scarce.',
    examples: 'The first sat mined after each difficulty retarget.',
  },
  {
    title: 'Rare Sats',
    rarity: 'rare',
    description: 'Rare sats are the first satoshi of each new day (based on Bitcoin block time). As blocks are mined roughly every 10 minutes, a new "day" in Bitcoin happens every ~144 blocks.',
    examples: 'First sat of any block that starts a new Bitcoin day.',
  },
  {
    title: 'Uncommon Sats',
    rarity: 'uncommon',
    description: 'Uncommon sats are the first satoshi of each new block. Since a new block is mined approximately every 10 minutes, there are about 144 uncommon sats created per day.',
    examples: 'The coinbase (first) satoshi of any mined block.',
  },
]

const MOCK_MARKET_LISTINGS = [
  { id: 1, name: 'Uncommon Sat #450231', rarity: 'uncommon', price: 0.0012, currency: 'BTC', seller: 'sat_collector', listed: '2h ago' },
  { id: 2, name: 'Rare Sat #18902', rarity: 'rare', price: 0.025, currency: 'BTC', seller: 'ordinal_whale', listed: '5h ago' },
  { id: 3, name: 'Epic Sat #312', rarity: 'epic', price: 0.45, currency: 'BTC', seller: 'btc_maxi', listed: '1d ago' },
  { id: 4, name: 'Legendary Halving Sat', rarity: 'legendary', price: 2.5, currency: 'BTC', seller: 'genesis_hoarder', listed: '3d ago' },
  { id: 5, name: 'Uncommon Sat #781002', rarity: 'uncommon', price: 0.0009, currency: 'BTC', seller: 'rare_hunter', listed: '30m ago' },
  { id: 6, name: 'Rare Sat #29411', rarity: 'rare', price: 0.018, currency: 'BTC', seller: 'sat_dealer', listed: '12h ago' },
]

export default function RareSatsPage() {
  const [categories, setCategories] = useState<RareSatCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [explorerQuery, setExplorerQuery] = useState('')
  const [explorerResult, setExplorerResult] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/rare-sats/categories')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (!d.success) throw new Error(d.error || 'API returned error')
      setCategories(d.data || d.categories || [])
      setLastUpdated(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const sortedCategories = [...categories].sort(
    (a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
  )

  const handleExplorerSearch = () => {
    if (!explorerQuery.trim()) return
    setExplorerResult(`Searching for sat/block "${explorerQuery}"... Explorer API integration coming soon.`)
  }

  if (error && categories.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-mono">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="text-red-400 text-lg mb-4">Error: {error}</div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="px-6 py-2 bg-[#f59e0b] text-black font-bold rounded hover:bg-[#d97706] transition-colors"
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
          <h1 className="text-2xl font-bold text-[#f59e0b]">RARE SATS</h1>
          <span className="text-xs text-gray-500">
            Last updated: {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
          </span>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Categories', value: formatNum(categories.length) },
            { label: 'Mythic/Legendary', value: formatNum(categories.filter(c => c.rarity === 'mythic' || c.rarity === 'legendary').length) },
            { label: 'Epic/Rare', value: formatNum(categories.filter(c => c.rarity === 'epic' || c.rarity === 'rare' || c.rarity === 'very_rare').length) },
            { label: 'Common/Uncommon', value: formatNum(categories.filter(c => c.rarity === 'common' || c.rarity === 'uncommon').length) },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              {loading ? <Skeleton className="h-6 w-16" /> : (
                <div className="text-lg font-bold text-[#f59e0b]">{s.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="categories" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f59e0b] text-gray-500 px-4 py-2 text-sm font-mono">
                Categories
              </TabsTrigger>
              <TabsTrigger value="explorer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f59e0b] text-gray-500 px-4 py-2 text-sm font-mono">
                Explorer
              </TabsTrigger>
              <TabsTrigger value="market" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f59e0b] text-gray-500 px-4 py-2 text-sm font-mono">
                Market
              </TabsTrigger>
              <TabsTrigger value="education" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f59e0b] text-gray-500 px-4 py-2 text-sm font-mono">
                Education
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Categories Tab */}
          <TabsContent value="categories">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No rare sat categories available</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCategories.map((cat) => {
                  const colors = getColors(cat.rarity)
                  return (
                    <div
                      key={cat.name}
                      className={`${colors.bg} border ${colors.border} rounded-lg p-5 hover:scale-[1.02] transition-transform`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-lg font-bold ${colors.text}`}>{cat.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                          {cat.rarity.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 leading-relaxed">{cat.description}</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estimated Count</span>
                          <span className="text-gray-300">{formatNum(cat.estimated_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Frequency</span>
                          <span className="text-gray-300 text-right max-w-[60%]">{cat.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Example Sat</span>
                          <span className="text-gray-300 truncate max-w-[60%]">{cat.example_sat}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-gray-500 leading-relaxed">{cat.supply_info}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Explorer Tab */}
          <TabsContent value="explorer">
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
                <h2 className="text-lg font-bold text-[#f59e0b] mb-4">Satoshi / Block Explorer</h2>
                <p className="text-gray-400 text-sm mb-4">Search by satoshi number or block height to discover rare sats.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={explorerQuery}
                    onChange={(e) => setExplorerQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExplorerSearch()}
                    placeholder="Enter sat number or block height..."
                    className="flex-1 bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-gray-200 text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-[#f59e0b] transition-colors"
                  />
                  <button
                    onClick={handleExplorerSearch}
                    className="px-6 py-2.5 bg-[#f59e0b] text-black font-bold rounded-lg hover:bg-[#d97706] transition-colors text-sm"
                  >
                    Search
                  </button>
                </div>
                {explorerResult && (
                  <div className="mt-4 p-4 bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg">
                    <p className="text-gray-300 text-sm">{explorerResult}</p>
                  </div>
                )}
              </div>

              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Quick Lookup</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Genesis Block', value: 'Block #0', detail: 'Jan 3, 2009 - Satoshi Nakamoto' },
                    { label: 'First Halving', value: 'Block #210,000', detail: 'Nov 28, 2012 - 25 BTC reward' },
                    { label: 'Second Halving', value: 'Block #420,000', detail: 'Jul 9, 2016 - 12.5 BTC reward' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg p-4 hover:border-[#f59e0b]/40 transition-colors cursor-pointer"
                      onClick={() => { setExplorerQuery(item.value); setExplorerResult(`Looking up ${item.value}... Explorer API integration coming soon.`) }}
                    >
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      <div className="text-sm font-bold text-[#f59e0b]">{item.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Market Tab */}
          <TabsContent value="market">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#f59e0b]">Marketplace Listings</h2>
                <span className="text-xs text-gray-500 bg-[#1a1a2e] border border-[#2a2a3e] px-3 py-1 rounded">
                  {MOCK_MARKET_LISTINGS.length} listings
                </span>
              </div>

              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a3e]">
                      <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wider">Rarity</th>
                      <th className="text-right p-4 text-xs text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wider">Seller</th>
                      <th className="text-right p-4 text-xs text-gray-500 uppercase tracking-wider">Listed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_MARKET_LISTINGS.map((listing) => {
                      const colors = getColors(listing.rarity)
                      return (
                        <tr key={listing.id} className="border-b border-[#2a2a3e]/50 hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <span className="text-sm font-bold text-gray-200">{listing.name}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                              {listing.rarity.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm font-bold text-[#f59e0b] font-mono">{listing.price} {listing.currency}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-400">{listing.seller}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-xs text-gray-500">{listing.listed}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-center py-4">
                <p className="text-xs text-gray-500">Marketplace data is simulated. Live integration coming soon.</p>
              </div>
            </div>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education">
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#f59e0b] mb-2">Understanding Rare Satoshis</h2>
                <p className="text-gray-400 text-sm">Learn about the different rarity levels of satoshis based on the Ordinals theory by Casey Rodarmor.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EDUCATION_CONTENT.map((item) => {
                  const colors = getColors(item.rarity)
                  return (
                    <div
                      key={item.title}
                      className={`${colors.bg} border ${colors.border} rounded-lg p-6`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className={`text-lg font-bold ${colors.text}`}>{item.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                          {item.rarity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3 leading-relaxed">{item.description}</p>
                      <div className="pt-3 border-t border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Examples</div>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.examples}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
                <h3 className="text-sm font-bold text-[#f59e0b] mb-3">Rarity Hierarchy</h3>
                <div className="flex flex-wrap gap-2">
                  {['Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'].map((level, i) => {
                    const colors = getColors(level.toLowerCase())
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-xs font-bold ${colors.badge}`}>{level}</span>
                        {i < 5 && <span className="text-gray-600">&gt;</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
