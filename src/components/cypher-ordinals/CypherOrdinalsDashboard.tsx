'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Layers,
  Hash,
  Bitcoin,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wallet,
  Zap,
  ShoppingBag,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useMagicEdenCollections } from '@/hooks/ordinals/useMagicEdenCollections'
import { useMagicEdenActivity } from '@/hooks/ordinals/useMagicEdenActivity'

interface CypherOrdinalsDashboardProps {
  searchQuery: string
}

function formatBtcPrice(sats: number): string {
  if (!sats || sats === 0) return '--'
  const btc = sats / 1e8
  if (btc >= 1) return `${btc.toFixed(4)} BTC`
  if (btc >= 0.001) return `${btc.toFixed(6)} BTC`
  return `${sats.toLocaleString()} sats`
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

const activityTypeColor: Record<string, string> = {
  sale: 'bg-green-500',
  listing: 'bg-blue-500',
  bid: 'bg-yellow-500',
  transfer: 'bg-purple-500',
}

const activityTypeLabel: Record<string, string> = {
  sale: 'Sale',
  listing: 'Listing',
  bid: 'Bid',
  transfer: 'Transfer',
}

export function CypherOrdinalsDashboard({ searchQuery }: CypherOrdinalsDashboardProps) {
  const [timeRange, setTimeRange] = useState('24h')
  const [isLoading, setIsLoading] = useState(true)
  const [inscriptionsData, setInscriptionsData] = useState<{time: string; inscriptions: number; volume: number}[]>([])
  const [recentInscriptions, setRecentInscriptions] = useState<any[]>([])
  const [topBRC20, setTopBRC20] = useState<{symbol: string; price: number; volume24h: number; change: number; marketCap: number}[]>([])

  const { collections: meCollections, loading: meCollectionsLoading, error: meCollectionsError } = useMagicEdenCollections(20)
  const { activities: meActivities, loading: meActivityLoading, error: meActivityError } = useMagicEdenActivity()

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      try {
        const [inscRes, brc20Res] = await Promise.allSettled([
          fetch('https://api.hiro.so/ordinals/v1/inscriptions?limit=20&order=desc', { signal: controller.signal }),
          fetch('https://api.hiro.so/ordinals/v1/brc-20/tokens?limit=10&order_by=tx_count&order=desc', { signal: controller.signal }),
        ])

        if (inscRes.status === 'fulfilled' && inscRes.value.ok) {
          const inscData = await inscRes.value.json()
          const results = inscData.results || []
          setRecentInscriptions(results)

          const hourBuckets: Record<string, { count: number }> = {}
          results.forEach((insc: any) => {
            const ts = insc.timestamp ? new Date(insc.timestamp * 1000) : new Date()
            const hour = `${ts.getHours().toString().padStart(2, '0')}:00`
            if (!hourBuckets[hour]) hourBuckets[hour] = { count: 0 }
            hourBuckets[hour].count++
          })
          const chartData = Object.entries(hourBuckets).map(([time, data]) => ({
            time,
            inscriptions: data.count,
            volume: data.count * 0.002,
          }))
          if (chartData.length > 0) setInscriptionsData(chartData)
        }

        if (brc20Res.status === 'fulfilled' && brc20Res.value.ok) {
          const brc20Data = await brc20Res.value.json()
          const tokens = (brc20Data.results || []).slice(0, 4).map((t: any) => ({
            symbol: t.ticker?.toUpperCase() || 'UNKN',
            price: 0,
            volume24h: t.tx_count || 0,
            change: 0,
            marketCap: parseFloat(t.minted_supply || '0'),
          }))
          setTopBRC20(tokens)
        }
      } catch {
        // Silently handle errors
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [])

  const recentTransactions = recentInscriptions.slice(0, 3).map((insc: any) => ({
    type: 'inscription' as const,
    hash: insc.id ? `${insc.id.slice(0, 10)}...` : '--',
    amount: `#${insc.number || '--'}`,
    collection: insc.content_type || 'Inscription',
    time: insc.timestamp ? `${Math.floor((Date.now() / 1000 - insc.timestamp) / 60)} min` : '--',
    from: insc.address ? `${insc.address.slice(0, 12)}...` : '--',
    to: insc.address ? `${insc.address.slice(0, 12)}...` : '--',
  }))

  const rarityDistribution = [
    { name: 'Common', value: 65, color: '#8B5CF6' },
    { name: 'Uncommon', value: 20, color: '#10B981' },
    { name: 'Rare', value: 10, color: '#F59E0B' },
    { name: 'Epic', value: 4, color: '#EF4444' },
    { name: 'Legendary', value: 1, color: '#F97316' }
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Geral</h2>
        <div className="flex items-center gap-2">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-orange-600' : ''}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-orange-500" />
              Atividade de Inscricoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={inscriptionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inscriptions"
                  stroke="#F97316"
                  fill="url(#inscriptionsGradient)"
                />
                <defs>
                  <linearGradient id="inscriptionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Volume de Negociacao (BTC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inscriptionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="volume" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Magic Eden Collections & Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-pink-500" />
            Magic Eden Marketplace
            <Badge variant="outline" className="ml-2 text-pink-400 border-pink-400/50">Magic Eden</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="collections">
            <TabsList className="mb-4">
              <TabsTrigger value="collections">Top Collections</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="collections">
              {meCollectionsError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Connect Magic Eden API</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Magic Eden API key may not be configured. Showing Hiro data only.
                  </p>
                </div>
              ) : meCollectionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500 mr-2" />
                  <span className="text-sm text-muted-foreground">Loading collections...</span>
                </div>
              ) : meCollections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No collections data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-muted-foreground">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-right py-2 px-3">Floor Price</th>
                        <th className="text-right py-2 px-3">24h Volume</th>
                        <th className="text-right py-2 px-3">Listed</th>
                        <th className="text-right py-2 px-3">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meCollections.slice(0, 10).map((col, idx) => (
                        <tr key={col.symbol} className="border-b border-gray-800 hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {col.imageUri && (
                                <img src={col.imageUri} alt="" className="w-6 h-6 rounded-full object-cover" />
                              )}
                              <span className="font-medium">{col.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{formatBtcPrice(col.floorPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatBtcPrice(col.volume24hr)}</td>
                          <td className="py-2 px-3 text-right">{col.listedCount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatBtcPrice(col.avgPrice24hr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity">
              {meActivityError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Connect Magic Eden API</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Magic Eden API key may not be configured. Activity feed unavailable.
                  </p>
                </div>
              ) : meActivityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500 mr-2" />
                  <span className="text-sm text-muted-foreground">Loading activity...</span>
                </div>
              ) : meActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {meActivities.slice(0, 20).map((act, idx) => (
                    <div key={`${act.txId}-${idx}`} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${activityTypeColor[act.type] || 'bg-gray-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{act.collectionSymbol}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {activityTypeLabel[act.type] || act.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {act.from.slice(0, 8)}...  {act.to ? `-> ${act.to.slice(0, 8)}...` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm font-mono">
                          {act.price ? formatBtcPrice(act.price) : '--'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(act.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Collections and BRC20 Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Collections - Hiro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Top Colecoes
              <Badge variant="outline" className="ml-2 text-blue-400 border-blue-400/50 text-xs">Hiro</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Collections data coming soon</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Marketplace integration in progress</p>
            </div>
          </CardContent>
        </Card>

        {/* Top BRC20 Tokens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-amber-500" />
              Top Tokens BRC-20
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topBRC20.map((token, index) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        Supply: {token.marketCap > 0 ? `${(token.marketCap / 1000000).toFixed(1)}M` : '--'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{token.volume24h > 0 ? `${token.volume24h.toLocaleString()} txs` : '--'}</p>
                    <div className="flex items-center gap-1 text-sm">
                      {token.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={token.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {Math.abs(token.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Whale Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Transacoes Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.type === 'inscription' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                    <div>
                      <p className="font-medium text-sm">{tx.collection}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.from.slice(0, 8)}...→{tx.to.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{tx.amount}</p>
                    <p className="text-xs text-muted-foreground">{tx.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Whale Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-red-500" />
              Atividade de Baleias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Whale tracking coming soon</p>
              <p className="text-xs text-muted-foreground/60 mt-1">On-chain analysis requires indexing infrastructure</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
