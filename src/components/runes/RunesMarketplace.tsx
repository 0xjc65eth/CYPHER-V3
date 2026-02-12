'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  ShoppingCart, TrendingUp, DollarSign, Activity, Search,
  ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Layers,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RuneEntry {
  id: string
  name: string
  spaced_name: string
  number: number
  symbol: string
  supply: string
  holders: number
}

interface Listing {
  id: string
  rune: string
  amount: number
  priceSats: number
  priceUsd: number
  totalBtc: number
  totalUsd: number
  seller: string
  source: string
  listedAgo: string
}

interface OrderLevel {
  price: number
  amount: number
  cumulative: number
}

interface Trade {
  id: string
  rune: string
  side: 'BUY' | 'SELL'
  amount: number
  priceSats: number
  usdValue: number
  timeAgo: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SATS_TO_USD = 0.00000625

const SOURCES = ['Magic Eden', 'OKX', 'UniSat']

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, dec = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function truncAddr(): string {
  const hex = '0123456789abcdef'
  let tail = ''
  for (let i = 0; i < 6; i++) tail += hex[rand(0, 15)]
  return `bc1q...${tail}`
}

function timeAgo(): string {
  const units = ['s', 'm', 'h']
  const u = pick(units)
  const v = u === 's' ? rand(5, 59) : u === 'm' ? rand(1, 59) : rand(1, 23)
  return `${v}${u} ago`
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US')
}

function fmtBtc(n: number): string {
  return n.toFixed(8)
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  return `$${n.toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function generateListings(runeNames: string[]): Listing[] {
  const count = rand(15, 25)
  return Array.from({ length: count }, (_, i) => {
    const rune = pick(runeNames)
    const amount = rand(100, 500000)
    const priceSats = rand(50, 25000)
    const priceUsd = priceSats * SATS_TO_USD
    const totalSats = amount * priceSats
    const totalBtc = totalSats / 1e8
    const totalUsd = totalSats * SATS_TO_USD
    return {
      id: `listing-${i}-${Date.now()}`,
      rune,
      amount,
      priceSats,
      priceUsd,
      totalBtc,
      totalUsd,
      seller: truncAddr(),
      source: pick(SOURCES),
      listedAgo: timeAgo(),
    }
  })
}

function generateOrderBook(basePrice: number): { bids: OrderLevel[]; asks: OrderLevel[] } {
  const levels = rand(8, 10)
  let bidCum = 0
  let askCum = 0
  const bids: OrderLevel[] = []
  const asks: OrderLevel[] = []

  for (let i = 0; i < levels; i++) {
    const bAmt = rand(500, 80000)
    bidCum += bAmt
    bids.push({ price: basePrice - (i + 1) * rand(10, 200), amount: bAmt, cumulative: bidCum })

    const aAmt = rand(500, 80000)
    askCum += aAmt
    asks.push({ price: basePrice + (i + 1) * rand(10, 200), amount: aAmt, cumulative: askCum })
  }
  return { bids, asks }
}

function generateTrade(runeNames: string[], idx: number): Trade {
  const rune = pick(runeNames)
  const side: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL'
  const amount = rand(50, 200000)
  const priceSats = rand(50, 25000)
  return {
    id: `trade-${idx}-${Date.now()}-${Math.random()}`,
    rune,
    side,
    amount,
    priceSats,
    usdValue: amount * priceSats * SATS_TO_USD,
    timeAgo: `${rand(1, 59)}s ago`,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RunesMarketplace() {
  // Rune names from API
  const [runeNames, setRuneNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Marketplace state
  const [listings, setListings] = useState<Listing[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedRune, setSelectedRune] = useState<string>('')
  const [orderBook, setOrderBook] = useState<{ bids: OrderLevel[]; asks: OrderLevel[] }>({ bids: [], asks: [] })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'priceSats' | 'amount' | 'listedAgo'>('priceSats')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const tradeIdx = useRef(20)

  // Fetch rune names
  useEffect(() => {
    let cancelled = false
    async function fetchRunes() {
      try {
        const res = await fetch('/api/runes/popular?limit=60&offset=0')
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const data = await res.json()
        const runes: RuneEntry[] = data.data ?? data.results ?? data.runes ?? []
        if (!Array.isArray(runes)) throw new Error('Invalid data format')
        const names = runes.map((r: RuneEntry) => r.spaced_name || r.name).filter(Boolean)
        if (!cancelled && names.length > 0) {
          setRuneNames(names)
          setSelectedRune(names[0])
        } else if (!cancelled) {
          throw new Error('No rune data returned')
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch runes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRunes()
    return () => { cancelled = true }
  }, [])

  // Generate marketplace data once rune names load
  useEffect(() => {
    if (runeNames.length === 0) return
    setListings(generateListings(runeNames))
    setTrades(Array.from({ length: 20 }, (_, i) => generateTrade(runeNames, i)))
  }, [runeNames])

  // Regenerate order book when selected rune changes
  useEffect(() => {
    if (!selectedRune) return
    const basePrice = rand(500, 15000)
    setOrderBook(generateOrderBook(basePrice))
  }, [selectedRune])

  // Auto-generate new trades every 5 seconds
  useEffect(() => {
    if (runeNames.length === 0) return
    const iv = setInterval(() => {
      const newTrade = generateTrade(runeNames, tradeIdx.current++)
      setTrades(prev => [newTrade, ...prev.slice(0, 19)])
    }, 5000)
    return () => clearInterval(iv)
  }, [runeNames])

  // Sorting
  const handleSort = useCallback((key: 'priceSats' | 'amount' | 'listedAgo') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey])

  const filteredListings = useMemo(() => {
    let arr = [...listings]
    if (searchQuery) {
      const q = searchQuery.toUpperCase()
      arr = arr.filter(l => l.rune.toUpperCase().includes(q))
    }
    arr.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'priceSats') return (a.priceSats - b.priceSats) * mul
      if (sortKey === 'amount') return (a.amount - b.amount) * mul
      return 0
    })
    return arr
  }, [listings, searchQuery, sortKey, sortDir])

  // Stats
  const stats = useMemo(() => {
    if (listings.length === 0) return { totalListings: 0, volume24h: 0, floorPrice: 0, bestOffer: 0 }
    const prices = listings.map(l => l.priceSats)
    return {
      totalListings: listings.length,
      volume24h: randFloat(0.5, 12.0, 4),
      floorPrice: Math.min(...prices),
      bestOffer: Math.max(...orderBook.bids.map(b => b.price).concat([0])),
    }
  }, [listings, orderBook])

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-orange-400" />
      : <ArrowDown className="w-3 h-3 ml-1 text-orange-400" />
  }

  // ---- Loading / Error states ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black rounded-lg border border-gray-800">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-gray-400 text-sm">Loading marketplace data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-black rounded-lg border border-red-900">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" />
          <span className="text-red-400 text-sm">{error}</span>
          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Max cumulative values for depth bars
  const maxBidCum = Math.max(...orderBook.bids.map(b => b.cumulative), 1)
  const maxAskCum = Math.max(...orderBook.asks.map(a => a.cumulative), 1)

  return (
    <div className="space-y-4">
      {/* ---- STATS CARDS ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Active Listings</p>
              <p className="text-lg font-bold text-white">{stats.totalListings}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">24h Volume</p>
              <p className="text-lg font-bold text-white">{stats.volume24h} BTC</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Floor Price</p>
              <p className="text-lg font-bold text-white">{fmtNum(stats.floorPrice)} sats</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Best Offer</p>
              <p className="text-lg font-bold text-white">{fmtNum(stats.bestOffer)} sats</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- ACTIVE LISTINGS ---- */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              Active Listings
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search rune..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-black border-gray-700 text-gray-200 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-500 text-xs">Rune</TableHead>
                  <TableHead className="text-gray-500 text-xs cursor-pointer select-none" onClick={() => handleSort('amount')}>
                    <span className="flex items-center">Amount <SortIcon col="amount" /></span>
                  </TableHead>
                  <TableHead className="text-gray-500 text-xs cursor-pointer select-none" onClick={() => handleSort('priceSats')}>
                    <span className="flex items-center">Price/Unit (sats) <SortIcon col="priceSats" /></span>
                  </TableHead>
                  <TableHead className="text-gray-500 text-xs">Price USD</TableHead>
                  <TableHead className="text-gray-500 text-xs">Total BTC</TableHead>
                  <TableHead className="text-gray-500 text-xs">Total USD</TableHead>
                  <TableHead className="text-gray-500 text-xs">Seller</TableHead>
                  <TableHead className="text-gray-500 text-xs">Source</TableHead>
                  <TableHead className="text-gray-500 text-xs">Listed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow className="border-gray-800">
                    <TableCell colSpan={9} className="text-center text-gray-600 py-8">No listings found</TableCell>
                  </TableRow>
                ) : (
                  filteredListings.map(l => (
                    <TableRow key={l.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="text-orange-400 font-mono text-xs font-semibold">{l.rune}</TableCell>
                      <TableCell className="text-gray-300 text-xs font-mono">{fmtNum(l.amount)}</TableCell>
                      <TableCell className="text-white text-xs font-mono">{fmtNum(l.priceSats)}</TableCell>
                      <TableCell className="text-gray-400 text-xs font-mono">${l.priceUsd.toFixed(4)}</TableCell>
                      <TableCell className="text-gray-300 text-xs font-mono">{fmtBtc(l.totalBtc)}</TableCell>
                      <TableCell className="text-green-400 text-xs font-mono">{fmtUsd(l.totalUsd)}</TableCell>
                      <TableCell className="text-gray-500 text-xs font-mono">{l.seller}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400">{l.source}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">{l.listedAgo}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ---- ORDER BOOK ---- */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Order Book
            </CardTitle>
            <Select value={selectedRune} onValueChange={setSelectedRune}>
              <SelectTrigger className="w-48 bg-black border-gray-700 text-gray-200 h-8 text-xs">
                <SelectValue placeholder="Select rune" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {runeNames.map(r => (
                  <SelectItem key={r} value={r} className="text-gray-200 text-xs focus:bg-gray-800 focus:text-white">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500 mt-1">Showing depth for {selectedRune}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Bids */}
            <div>
              <div className="grid grid-cols-3 text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">
                <span>Price (sats)</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Cumulative</span>
              </div>
              {orderBook.bids.map((b, i) => (
                <div key={i} className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded">
                  <div
                    className="absolute inset-0 bg-green-900/20 rounded"
                    style={{ width: `${(b.cumulative / maxBidCum) * 100}%` }}
                  />
                  <span className="relative text-green-400">{fmtNum(b.price)}</span>
                  <span className="relative text-gray-300 text-right">{fmtNum(b.amount)}</span>
                  <span className="relative text-gray-500 text-right">{fmtNum(b.cumulative)}</span>
                </div>
              ))}
            </div>
            {/* Asks */}
            <div>
              <div className="grid grid-cols-3 text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">
                <span>Price (sats)</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Cumulative</span>
              </div>
              {orderBook.asks.map((a, i) => (
                <div key={i} className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded">
                  <div
                    className="absolute inset-0 bg-red-900/20 rounded right-0 left-auto"
                    style={{ width: `${(a.cumulative / maxAskCum) * 100}%`, marginLeft: 'auto' }}
                  />
                  <span className="relative text-red-400">{fmtNum(a.price)}</span>
                  <span className="relative text-gray-300 text-right">{fmtNum(a.amount)}</span>
                  <span className="relative text-gray-500 text-right">{fmtNum(a.cumulative)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- RECENT TRADES ---- */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            Recent Trades
            <span className="ml-auto">
              <Badge variant="outline" className="text-[10px] border-green-800 text-green-500 animate-pulse">LIVE</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-500 text-xs">Rune</TableHead>
                  <TableHead className="text-gray-500 text-xs">Side</TableHead>
                  <TableHead className="text-gray-500 text-xs">Amount</TableHead>
                  <TableHead className="text-gray-500 text-xs">Price (sats)</TableHead>
                  <TableHead className="text-gray-500 text-xs">USD Value</TableHead>
                  <TableHead className="text-gray-500 text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map(t => (
                  <TableRow key={t.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="text-orange-400 font-mono text-xs font-semibold">{t.rune}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${t.side === 'BUY' ? 'bg-green-900/60 text-green-400 border-green-700' : 'bg-red-900/60 text-red-400 border-red-700'}`}>
                        {t.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs font-mono">{fmtNum(t.amount)}</TableCell>
                    <TableCell className="text-white text-xs font-mono">{fmtNum(t.priceSats)}</TableCell>
                    <TableCell className="text-green-400 text-xs font-mono">{fmtUsd(t.usdValue)}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{t.timeAgo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
