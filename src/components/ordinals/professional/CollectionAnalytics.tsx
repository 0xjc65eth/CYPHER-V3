'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Layers, BarChart3 } from 'lucide-react'
import { useOrdinals } from '@/contexts/OrdinalsContext'
import { useQuery } from '@tanstack/react-query'

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

interface HistoryPoint {
  date?: string
  timestamp?: number
  floorPrice?: number
  floor_price?: number
  volume?: number
  volumeUSD?: number
  trades?: number
}

interface ActivityRecord {
  kind?: string
  price?: number
  listedPrice?: number
  createdAt?: string
  timestamp?: string
  collectionSymbol?: string
}

interface TradingMetrics {
  vwap24h?: number
  vwap7d?: number
  currentFloor?: number
  volume?: { volume24h?: number; volume7d?: number; volumeChange24h?: number }
  trades?: { trades24h?: number; trades7d?: number; uniqueBuyers24h?: number; uniqueSellers24h?: number }
  tradeSize?: { avgTradeSize?: number; medianTradeSize?: number }
  priceMetrics?: { highestSale24h?: number; lowestSale24h?: number; priceVolatility?: number }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
      <div className="text-center space-y-2">
        <BarChart3 className="h-8 w-8 mx-auto opacity-40" />
        <p>{message}</p>
      </div>
    </div>
  )
}

export default function CollectionAnalytics() {
  const { selectedCollection, setSelectedCollection, selectedTimeRange, setSelectedTimeRange } = useOrdinals()

  // Fetch top collections from API route
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['ordinals-top-collections'],
    queryFn: async () => {
      const res = await fetch('/api/ordinals/')
      if (!res.ok) return []
      const json = await res.json()
      return json.data?.trending_collections?.map((c: Record<string, unknown>) => ({
        id: c.symbol,
        name: c.name,
        slug: c.symbol,
        floor_price: c.floor,
        volume_24h: c.volume24h,
        volume_change_24h: c.change,
        holders_count: c.owners,
        total_supply: c.supply,
        listed_count: c.listed,
        listed_percentage: (c.supply as number) > 0 ? ((c.listed as number) / (c.supply as number)) * 100 : 0,
        floor_price_change_24h: c.change,
      })) || []
    },
    refetchInterval: 30000,
    staleTime: 20000
  })

  // Collection details from collection-stats endpoint
  const { data: collectionDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['ordinals-collection-details', selectedCollection],
    queryFn: async () => {
      if (!selectedCollection) return null
      const res = await fetch(`/api/ordinals/collection-stats/?symbol=${selectedCollection}`)
      if (!res.ok) return null
      const json = await res.json()
      if (!json.success) return null
      const d = json.data
      return {
        floor_price: d.floorPrice,
        floor_price_change_24h: d.change24h,
        volume_24h: d.volume24h,
        volume_change_24h: d.volumeChange24h,
        holders_count: d.owners,
        total_supply: d.supply,
        listed_count: d.listedCount,
        listed_percentage: d.supply > 0 ? (d.listedCount / d.supply) * 100 : 0,
      }
    },
    enabled: !!selectedCollection,
    refetchInterval: 60000,
    staleTime: 30000
  })

  // Floor price history from historical endpoint
  const { data: historicalData } = useQuery({
    queryKey: ['ordinals-historical', selectedCollection, selectedTimeRange],
    queryFn: async () => {
      const res = await fetch(`/api/ordinals/historical/${selectedCollection}/?period=${selectedTimeRange}&metrics=price,volume`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data || json
    },
    enabled: !!selectedCollection,
    staleTime: 300000,
  })

  // Trading metrics (VWAP, trade size, volatility)
  const { data: tradingMetrics } = useQuery({
    queryKey: ['ordinals-trading-metrics', selectedCollection],
    queryFn: async () => {
      const res = await fetch(`/api/ordinals/trading-metrics/${selectedCollection}/`)
      if (!res.ok) return null
      const json = await res.json()
      return (json.data || json) as TradingMetrics
    },
    enabled: !!selectedCollection,
    staleTime: 30000,
  })

  // Recent activity/sales
  const { data: activityData } = useQuery({
    queryKey: ['ordinals-activity', selectedCollection],
    queryFn: async () => {
      const res = await fetch(`/api/ordinals/activity/?limit=100&kind=sale`)
      if (!res.ok) return null
      const json = await res.json()
      const items: ActivityRecord[] = json.data || json.activities || []
      // Filter to selected collection if possible
      if (selectedCollection) {
        return items.filter((a: ActivityRecord) => a.collectionSymbol === selectedCollection || !a.collectionSymbol)
      }
      return items
    },
    enabled: !!selectedCollection,
    staleTime: 15000,
  })

  const isLoading = isLoadingCollections || isLoadingDetails

  const currentCollection = collectionDetails || (collectionsData?.find((c: { id: string; slug: string }) => c.id === selectedCollection || c.slug === selectedCollection))

  // Process floor history into chart data
  const floorPriceData = useMemo(() => {
    const timeSeries: HistoryPoint[] = historicalData?.timeSeries || historicalData?.floor_price_history || []
    if (!timeSeries.length) return []
    return timeSeries.map((item: HistoryPoint) => {
      const price = item.floorPrice ?? item.floor_price ?? 0
      return {
        date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : ''),
        price,
        volume: item.volume ?? 0,
        support: price * 0.95,
        resistance: price * 1.05,
      }
    })
  }, [historicalData])

  // Process activity into sales velocity (group by day & hour bucket)
  const salesVelocityData = useMemo(() => {
    if (!activityData || !activityData.length) return []
    const dayBuckets: Record<string, { hour0: number; hour6: number; hour12: number; hour18: number }> = {}
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    for (const sale of activityData) {
      const dateStr = sale.createdAt || sale.timestamp
      if (!dateStr) continue
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) continue
      const dayName = days[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1]
      if (!dayBuckets[dayName]) dayBuckets[dayName] = { hour0: 0, hour6: 0, hour12: 0, hour18: 0 }
      const hour = d.getUTCHours()
      if (hour < 6) dayBuckets[dayName].hour0++
      else if (hour < 12) dayBuckets[dayName].hour6++
      else if (hour < 18) dayBuckets[dayName].hour12++
      else dayBuckets[dayName].hour18++
    }

    return days.filter(d => dayBuckets[d]).map(d => ({ day: d, ...dayBuckets[d] }))
  }, [activityData])

  // Holder distribution from collection stats (real breakdown not available on-chain, show listed vs unlisted)
  const holderDistribution = useMemo(() => {
    if (!currentCollection?.holders_count || !currentCollection?.total_supply) return []
    const listed = currentCollection.listed_count || 0
    const holders = currentCollection.holders_count || 0
    const supply = currentCollection.total_supply || 0
    const unlisted = supply - listed

    if (holders === 0) return []
    return [
      { name: 'Listed', value: Math.round((listed / supply) * 100), count: listed },
      { name: 'Unlisted (Held)', value: Math.round((unlisted / supply) * 100), count: unlisted },
    ]
  }, [currentCollection])

  // Volume profile from historical data
  const volumeProfileData = useMemo(() => {
    const timeSeries: HistoryPoint[] = historicalData?.timeSeries || []
    if (!timeSeries.length) return []
    // Group by price range
    const prices = timeSeries.filter((p: HistoryPoint) => (p.floorPrice ?? p.floor_price ?? 0) > 0)
    if (!prices.length) return []
    const min = Math.min(...prices.map((p: HistoryPoint) => p.floorPrice ?? p.floor_price ?? 0))
    const max = Math.max(...prices.map((p: HistoryPoint) => p.floorPrice ?? p.floor_price ?? 0))
    const step = (max - min) / 5 || 0.001
    const buckets: { price: string; volume: number; percentage: number }[] = []
    for (let i = 0; i < 5; i++) {
      const lo = min + i * step
      const hi = lo + step
      const inRange = prices.filter((p: HistoryPoint) => {
        const v = p.floorPrice ?? p.floor_price ?? 0
        return v >= lo && (i === 4 ? v <= hi : v < hi)
      })
      const vol = inRange.reduce((s: number, p: HistoryPoint) => s + (p.volume ?? 0), 0)
      buckets.push({ price: `${lo.toFixed(4)}-${hi.toFixed(4)}`, volume: Math.round(vol * 1e4) / 1e4, percentage: 0 })
    }
    const totalVol = buckets.reduce((s, b) => s + b.volume, 0) || 1
    return buckets.map(b => ({ ...b, percentage: Math.round((b.volume / totalVol) * 100) }))
  }, [historicalData])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              {collectionsData?.slice(0, 10).map((collection: { id: string; name: string }) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              )) || (
                <>
                  <SelectItem value="nodemonkes">NodeMonkes</SelectItem>
                  <SelectItem value="bitcoin-puppets">Bitcoin Puppets</SelectItem>
                  <SelectItem value="runestones">Runestones</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tradingMetrics?.vwap24h ? (
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>VWAP 24h: <span className="text-white">{tradingMetrics.vwap24h.toFixed(4)} BTC</span></span>
            {tradingMetrics.trades?.trades24h !== undefined && (
              <span>Trades: <span className="text-white">{tradingMetrics.trades.trades24h}</span></span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Select a collection to view analytics</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Floor Price
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">{currentCollection?.floor_price?.toFixed(4) || '—'} BTC</p>
                <div className="flex items-center gap-1 text-sm">
                  {currentCollection?.floor_price_change_24h !== undefined && currentCollection.floor_price_change_24h !== 0 ? (
                    <>
                      {currentCollection.floor_price_change_24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={currentCollection.floor_price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {currentCollection.floor_price_change_24h >= 0 ? '+' : ''}{currentCollection.floor_price_change_24h.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <span className="text-muted-foreground">24h</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Volume (24h)
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">{currentCollection?.volume_24h?.toFixed(2) || '—'} BTC</p>
                <div className="flex items-center gap-1 text-sm">
                  {currentCollection?.volume_change_24h !== undefined && currentCollection.volume_change_24h !== 0 ? (
                    <>
                      {currentCollection.volume_change_24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={currentCollection.volume_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {currentCollection.volume_change_24h >= 0 ? '+' : ''}{currentCollection.volume_change_24h.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <span className="text-muted-foreground">vs yesterday</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Holders
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">{currentCollection?.holders_count?.toLocaleString() || '—'}</p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">Total unique holders</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Listed
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">{currentCollection?.listed_percentage?.toFixed(1) || '—'}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {currentCollection?.listed_count?.toLocaleString() || '0'} of {currentCollection?.total_supply?.toLocaleString() || '0'} items
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="floor" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="floor">Floor Analysis</TabsTrigger>
          <TabsTrigger value="volume">Volume Profile</TabsTrigger>
          <TabsTrigger value="holders">Listed vs Held</TabsTrigger>
          <TabsTrigger value="velocity">Sales Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="floor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Floor Price with Support/Resistance</CardTitle>
            </CardHeader>
            <CardContent>
              {floorPriceData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={floorPriceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" fontSize={11} />
                      <YAxis stroke="#666" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        labelStyle={{ color: '#999' }}
                        formatter={(value: number) => [`${value.toFixed(4)} BTC`, '']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#f97316" strokeWidth={2} dot={false} name="Floor" />
                      <Line type="monotone" dataKey="support" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Support" />
                      <Line type="monotone" dataKey="resistance" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Resistance" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message={selectedCollection ? "No floor history data available for this collection yet. Data accumulates over time." : "Select a collection to view floor price history."} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume by Price Range</CardTitle>
            </CardHeader>
            <CardContent>
              {volumeProfileData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeProfileData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#666" fontSize={11} />
                      <YAxis dataKey="price" type="category" stroke="#666" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        labelStyle={{ color: '#999' }}
                      />
                      <Bar dataKey="volume" fill="#f97316" name="Volume (BTC)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message={selectedCollection ? "No volume profile data available yet." : "Select a collection to view volume profile."} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holders" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Listed vs Held</CardTitle>
              </CardHeader>
              <CardContent>
                {holderDistribution.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={holderDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }: { name: string; value: number }) => `${name}: ${value}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {holderDistribution.map((_entry, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#999' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No holder data available for this collection." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supply Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {holderDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {holderDistribution.map((group, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{group.name}</span>
                          <span className="text-sm text-muted-foreground">{group.count.toLocaleString()} items</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${group.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {currentCollection?.holders_count && (
                      <div className="pt-4 border-t border-[#2a2a3e] text-sm text-muted-foreground">
                        {currentCollection.holders_count.toLocaleString()} unique holders
                      </div>
                    )}
                    {tradingMetrics?.trades?.uniqueBuyers24h !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        {tradingMetrics.trades.uniqueBuyers24h} buyers / {tradingMetrics.trades.uniqueSellers24h || 0} sellers (24h)
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState message="Select a collection to see supply breakdown." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Velocity by Day & Hour</CardTitle>
            </CardHeader>
            <CardContent>
              {salesVelocityData.length > 0 ? (
                <>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesVelocityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="day" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#999' }}
                        />
                        <Bar dataKey="hour0" stackId="a" fill="#fed7aa" name="00:00-06:00" />
                        <Bar dataKey="hour6" stackId="a" fill="#fdba74" name="06:00-12:00" />
                        <Bar dataKey="hour12" stackId="a" fill="#fb923c" name="12:00-18:00" />
                        <Bar dataKey="hour18" stackId="a" fill="#f97316" name="18:00-00:00" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#fed7aa] rounded" />
                      <span className="text-sm">00:00-06:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#fdba74] rounded" />
                      <span className="text-sm">06:00-12:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#fb923c] rounded" />
                      <span className="text-sm">12:00-18:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#f97316] rounded" />
                      <span className="text-sm">18:00-00:00</span>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState message={selectedCollection ? "No recent sales activity found for this collection." : "Select a collection to view sales velocity."} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
