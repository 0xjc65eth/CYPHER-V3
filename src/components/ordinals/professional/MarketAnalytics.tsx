'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  Users,
  Zap,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ordinalsService } from '@/services/ordinals'
import { useQuery } from '@tanstack/react-query'

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#ea580c']

export default function MarketAnalytics() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [analysisType, setAnalysisType] = useState<'overview' | 'collections' | 'volume' | 'trends'>('overview')

  // Fetch real-time market analytics
  const { data: marketStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['ordinals-market-analytics', timeframe],
    queryFn: () => ordinalsService.getOrdinalsStats(),
    refetchInterval: 30000,
    staleTime: 15000
  })

  const { data: topCollections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['ordinals-top-collections-analytics'],
    queryFn: () => ordinalsService.getTopCollections(20),
    refetchInterval: 60000,
    staleTime: 30000
  })

  const { data: recentSales, isLoading: isLoadingSales } = useQuery({
    queryKey: ['ordinals-recent-sales-analytics'],
    queryFn: () => ordinalsService.getRecentSales(100),
    refetchInterval: 30000,
    staleTime: 15000
  })

  // Process data for charts
  const volumeTrendData = marketStats?.recent_sales?.slice(-30).reduce((acc: any[], sale: any, index: number) => {
    const date = new Date(sale.timestamp).toISOString().split('T')[0]
    const existing = acc.find((item: any) => item.date === date)
    
    if (existing) {
      existing.volume += sale.price
      existing.sales += 1
      existing.avgPrice = existing.volume / existing.sales
    } else {
      acc.push({
        date,
        volume: sale.price,
        sales: 1,
        avgPrice: sale.price,
        timestamp: sale.timestamp
      })
    }
    return acc
  }, [] as any[])?.sort((a: any, b: any) => a.timestamp - b.timestamp) || []

  const collectionDistribution = topCollections?.slice(0, 6).map((collection: any) => ({
    name: collection.name,
    value: collection.volume_24h,
    percentage: 0, // Will be calculated
    floor: collection.floor_price,
    holders: collection.holders_count
  })) || []

  // Calculate percentages
  const totalVolume = collectionDistribution.reduce((sum: number, item: any) => sum + item.value, 0)
  collectionDistribution.forEach((item: any) => {
    item.percentage = totalVolume > 0 ? (item.value / totalVolume) * 100 : 0
  })

  const priceRangeData = marketStats?.price_ranges || []

  const marketActivityData = volumeTrendData.map((item: any) => ({
    time: item.date,
    activeTrades: item.sales,
    volume: item.volume
  }))

  const correlationData = topCollections?.slice(0, 10).map((collection: any) => ({
    collection: collection.name.substring(0, 8),
    volume: collection.volume_24h,
    floor: collection.floor_price * 100, // Scale for visibility
    holders: collection.holders_count / 100, // Scale for visibility
    marketCap: collection.floor_price * collection.total_supply
  })) || []

  const liquidityMetrics = topCollections?.map((collection: any) => {
    const marketCap = collection.floor_price * collection.total_supply;
    const liquidity = collection.total_supply > 0 ? (collection.listed_count / collection.total_supply) * 100 : 0;
    const velocity = marketCap > 0 ? (collection.volume_24h / marketCap) * 100 : 0;
    // Depth score based on listed count relative to volume - higher listed count with active trading = deeper market
    const depth = collection.listed_count > 0 && collection.volume_24h > 0
      ? Math.min((collection.listed_count / 100) * (velocity + 1), 100)
      : liquidity * 0.5;
    return {
      name: collection.name,
      liquidity,
      velocity,
      depth,
    };
  }) || []

  const isLoading = isLoadingStats || isLoadingCollections || isLoadingSales

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Market Analytics</h2>
          <p className="text-muted-foreground">Comprehensive market analysis and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Badge className="bg-green-500/20 text-green-500">
            Live Data
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Total Volume ({timeframe})
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
                <p className="text-2xl font-bold">
                  ₿{marketStats?.totalVolume24h.toFixed(1) || '0.0'}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+12.3%</span>
                  <span className="text-muted-foreground">vs prev</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Active Collections
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
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
                <p className="text-2xl font-bold">
                  {marketStats?.topCollections.length.toLocaleString() || '0'}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <Activity className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-500">
                    {topCollections?.filter(c => c.volume_24h > 0).length || 0} trading
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Avg Sale Price
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
                <p className="text-2xl font-bold">
                  ₿{marketStats?.average_sale_price_24h.toFixed(4) || '0.0000'}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">-3.2%</span>
                  <span className="text-muted-foreground">24h</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Active Wallets
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
                <p className="text-2xl font-bold">
                  {marketStats?.active_wallets_24h.toLocaleString() || '0'}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+5.7%</span>
                  <span className="text-muted-foreground">new</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={analysisType} onValueChange={(value: any) => setAnalysisType(value)} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        labelStyle={{ color: '#999' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#f97316" 
                        fill="#f97316" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collection Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={collectionDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }: any) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {collectionDistribution.map((entry: any, index: number) => (
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Price Range Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceRangeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="range" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Bar dataKey="count" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Collections Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCollections?.slice(0, 8).map((collection: any, index: number) => (
                    <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <div>
                          <div className="font-medium">{collection.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Floor: ₿{collection.floor_price.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₿{collection.volume_24h.toFixed(2)}</div>
                        <div className={`text-sm flex items-center gap-1 ${
                          collection.volume_change_24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {collection.volume_change_24h >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(collection.volume_change_24h).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liquidity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={liquidityMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="liquidity" stroke="#666" name="Liquidity %" />
                      <YAxis dataKey="velocity" stroke="#666" name="Velocity" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        labelStyle={{ color: '#999' }}
                        formatter={(value: any, name: any) => [
                          typeof value === 'number' ? value.toFixed(2) : value,
                          name === 'liquidity' ? 'Liquidity %' : 'Velocity'
                        ]}
                      />
                      <Scatter dataKey="depth" fill="#f97316" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Bar dataKey="activeTrades" fill="#fdba74" name="Trades" />
                    <Bar dataKey="volume" fill="#f97316" name="Volume (BTC)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Bullish Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Volume increasing 3 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">New wallet adoption up</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Floor price stability</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Watch Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">High listing concentration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Whale wallet activity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Cross-platform arbitrage</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Risk Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Declining holder count</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Liquidity fragmentation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Support level tested</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}