'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Layers, AlertCircle, Clock, Target, Zap, Shield } from 'lucide-react'
import { useMarketMetrics } from '@/hooks/ordinals/useMarketMetrics'
// Lazy imports to prevent SSR issues
const getOrdinalsAnalytics = () => import('@/services/ordinals/OrdinalsAnalytics').then(m => m.ordinalsAnalytics)
const getOrdinalsDataAggregator = () => import('@/services/ordinals/DataAggregator').then(m => m.ordinalsDataAggregator)
import { useQuery } from '@tanstack/react-query'

export default function MarketDepth() {
  const [selectedCollection, setSelectedCollection] = useState('nodemonkes')
  const [timeRange, setTimeRange] = useState('24h')
  const { data: marketData, isLoading } = useMarketMetrics(selectedCollection)

  // Enhanced data fetching with new analytics
  const { data: aggregatedData, isLoading: isLoadingAggregated } = useQuery({
    queryKey: ['aggregated-collection', selectedCollection],
    queryFn: async () => {
      const aggregator = await getOrdinalsDataAggregator()
      return aggregator.getAggregatedCollection(selectedCollection)
    },
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: typeof window !== 'undefined'
  })

  const { data: marketDepthData, isLoading: isLoadingDepth } = useQuery({
    queryKey: ['market-depth', selectedCollection],
    queryFn: async () => {
      const analytics = await getOrdinalsAnalytics()
      return analytics.analyzeMarketDepth(selectedCollection)
    },
    refetchInterval: 10000,
    staleTime: 5000,
    enabled: typeof window !== 'undefined'
  })

  const { data: arbitrageOpportunities } = useQuery({
    queryKey: ['arbitrage-opportunities', selectedCollection],
    queryFn: async () => {
      const aggregator = await getOrdinalsDataAggregator()
      return aggregator.findArbitrageOpportunities([selectedCollection])
    },
    refetchInterval: 15000,
    staleTime: 10000,
    enabled: typeof window !== 'undefined'
  })

  const loading = isLoading || isLoadingAggregated || isLoadingDepth

  // Enhanced order book data from real analytics
  const orderBookData = marketDepthData ? {
    bids: marketDepthData.bids.map(bid => ({
      price: bid.price,
      amount: bid.quantity,
      total: bid.totalValue,
      depth: bid.cumulativeQuantity
    })),
    asks: marketDepthData.asks.map(ask => ({
      price: ask.price,
      amount: ask.quantity,
      total: ask.totalValue,
      depth: ask.cumulativeQuantity
    })),
    spread: marketDepthData.spread,
    spreadPercentage: marketDepthData.spreadPercentage
  } : {
    bids: [],
    asks: [],
    spread: 0,
    spreadPercentage: 0
  }

  // Real data needed from market depth API - no mock fallback
  const liquidityDepthData: { price: number; buyVolume: number; sellVolume: number }[] = []
  const marketMakerActivity: { time: string; makers: number; takers: number; ratio: number }[] = []
  const spreadAnalysis: { time: string; spread: number; volume: number }[] = []

  const collections = [
    { value: 'nodemonkes', label: 'NodeMonkes' },
    { value: 'bitcoin-puppets', label: 'Bitcoin Puppets' },
    { value: 'runestones', label: 'Runestones' },
    { value: 'quantum-cats', label: 'Quantum Cats' },
    { value: 'bitcoin-frogs', label: 'Bitcoin Frogs' },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collections.map(collection => (
                <SelectItem key={collection.value} value={collection.value}>
                  {collection.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Data
          </Badge>
          <span className="text-sm text-muted-foreground">Updates every 5s</span>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Best Bid
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">0.0480 BTC</p>
            <p className="text-sm text-muted-foreground">5 items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Best Ask
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">0.0485 BTC</p>
            <p className="text-sm text-muted-foreground">3 items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Spread
              <Activity className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orderBookData.spreadPercentage}%</p>
            <p className="text-sm text-muted-foreground">{orderBookData.spread} BTC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              24h Volume
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">234.5 BTC</p>
            <p className="text-sm text-muted-foreground">1,234 trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Arbitrage Opportunities Alert */}
      {arbitrageOpportunities && arbitrageOpportunities.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Target className="h-5 w-5" />
              Arbitrage Opportunity Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {arbitrageOpportunities[0] && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Buy on</p>
                    <p className="font-medium capitalize">{arbitrageOpportunities[0].buyMarketplace.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sell on</p>
                    <p className="font-medium capitalize">{arbitrageOpportunities[0].sellMarketplace.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-bold text-green-500">+{arbitrageOpportunities[0].profitPercentage.toFixed(2)}%</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Analytics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Liquidity Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{marketDepthData?.liquidityScore?.toFixed(0) || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {(marketDepthData?.liquidityScore ?? 0) > 80 ? 'Excellent' :
               (marketDepthData?.liquidityScore ?? 0) > 60 ? 'Good' :
               (marketDepthData?.liquidityScore ?? 0) > 40 ? 'Fair' : 'Poor'} liquidity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Market Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{marketDepthData?.depthScore?.toFixed(0) || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {(marketDepthData?.depthScore ?? 0) > 80 ? 'High' :
               (marketDepthData?.depthScore ?? 0) > 60 ? 'Medium' : 'Low'} depth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Real-time Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Live Feed Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {aggregatedData ? 'Multi-marketplace data' : 'Single source data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs defaultValue="orderbook" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="orderbook">Order Book</TabsTrigger>
          <TabsTrigger value="depth">Liquidity Depth</TabsTrigger>
          <TabsTrigger value="spread">Spread Analysis</TabsTrigger>
          <TabsTrigger value="makers">Market Makers</TabsTrigger>
          <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="orderbook" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-500">Buy Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <span>Price</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Sum</span>
                  </div>
                  {orderBookData.bids.map((bid, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                      <span className="font-mono text-green-500">{bid.price.toFixed(4)}</span>
                      <span className="text-right">{bid.amount}</span>
                      <span className="text-right font-mono">{bid.total.toFixed(4)}</span>
                      <span className="text-right text-muted-foreground">{bid.depth}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-500">Sell Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <span>Price</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Sum</span>
                  </div>
                  {orderBookData.asks.map((ask, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                      <span className="font-mono text-red-500">{ask.price.toFixed(4)}</span>
                      <span className="text-right">{ask.amount}</span>
                      <span className="text-right font-mono">{ask.total.toFixed(4)}</span>
                      <span className="text-right text-muted-foreground">{ask.depth}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Book Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liquidityDepthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="price" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Line type="stepAfter" dataKey="buyVolume" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Line type="stepAfter" dataKey="sellVolume" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depth" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liquidity Depth Chart</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Buy Side: 85 items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Sell Side: 90 items</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liquidityDepthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="price" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Line type="monotone" dataKey="buyVolume" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Line type="monotone" dataKey="sellVolume" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Buy Side Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Bids</span>
                    <span className="font-mono">85 items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-mono">4.23 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Bid Size</span>
                    <span className="font-mono">14.2 items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Support Level</span>
                    <span className="font-mono text-green-500">0.0455 BTC</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sell Side Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Asks</span>
                    <span className="font-mono">90 items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-mono">4.53 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Ask Size</span>
                    <span className="font-mono">15.0 items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Resistance Level</span>
                    <span className="font-mono text-red-500">0.0510 BTC</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="spread" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bid-Ask Spread Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spreadAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#666" />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="spread" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Bar yAxisId="right" dataKey="volume" fill="#f97316" fillOpacity={0.3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Spread</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0.0005 BTC</p>
                <p className="text-sm text-muted-foreground">1.04% of mid price</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Spread (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0.0004 BTC</p>
                <p className="text-sm text-muted-foreground">0.83% of mid price</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Spread Volatility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">±28%</p>
                <p className="text-sm text-muted-foreground">High volatility</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="makers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Maker Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketMakerActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Bar dataKey="makers" stackId="a" fill="#10b981" />
                    <Bar dataKey="takers" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-sm">Maker Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-sm">Taker Orders</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Market Makers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">bc1q...abc</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">23 orders</p>
                      <p className="text-xs text-muted-foreground">2.34 BTC volume</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">bc1q...def</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">19 orders</p>
                      <p className="text-xs text-muted-foreground">1.87 BTC volume</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">bc1q...ghi</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">15 orders</p>
                      <p className="text-xs text-muted-foreground">1.45 BTC volume</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Market Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Maker/Taker Ratio</span>
                    <span className="font-mono">0.35</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Order Fill Rate</span>
                    <span className="font-mono">87%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Time to Fill</span>
                    <span className="font-mono">12 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Slippage (avg)</span>
                    <span className="font-mono">0.23%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Marketplace Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {aggregatedData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {aggregatedData.consolidatedMetrics.bestFloorPrice.toFixed(4)}
                        </p>
                        <p className="text-sm text-muted-foreground">Best Floor</p>
                        <p className="text-xs text-orange-500 capitalize">
                          {aggregatedData.consolidatedMetrics.bestFloorMarketplace.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {aggregatedData.consolidatedMetrics.totalVolume24h.toFixed(1)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Volume</p>
                        <p className="text-xs text-muted-foreground">24h BTC</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-500">
                          {aggregatedData.consolidatedMetrics.priceSpread.toFixed(4)}
                        </p>
                        <p className="text-sm text-muted-foreground">Price Spread</p>
                        <p className="text-xs text-muted-foreground">BTC</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Marketplace Breakdown</h4>
                      {Object.entries(aggregatedData.marketplaceData).map(([marketplace, data]) => (
                        data.available && (
                          <div key={marketplace} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <span className="text-sm capitalize">{marketplace.replace('_', ' ')}</span>
                            <div className="text-right">
                              <p className="text-sm font-mono">{data.floorPrice.toFixed(4)} BTC</p>
                              <p className="text-xs text-muted-foreground">{data.listedCount} listed</p>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading multi-marketplace data...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Trading Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded border border-green-500/30 bg-green-500/5">
                    <div>
                      <p className="font-medium text-green-500">Bullish Signal</p>
                      <p className="text-sm text-muted-foreground">Strong buyer interest detected</p>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      85% Confidence
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
                    <div>
                      <p className="font-medium text-yellow-500">Liquidity Alert</p>
                      <p className="text-sm text-muted-foreground">Low sell-side depth</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      Medium Risk
                    </Badge>
                  </div>

                  {arbitrageOpportunities && arbitrageOpportunities.length > 0 && (
                    <div className="flex items-center justify-between p-3 rounded border border-orange-500/30 bg-orange-500/5">
                      <div>
                        <p className="font-medium text-orange-500">Arbitrage Signal</p>
                        <p className="text-sm text-muted-foreground">
                          {arbitrageOpportunities[0].profitPercentage.toFixed(1)}% profit opportunity
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-500 border-orange-500">
                        {arbitrageOpportunities[0].confidence}% Confidence
                      </Badge>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Market Health Score</h4>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-orange-500 h-2 rounded-full"
                        style={{ width: `${(marketDepthData?.liquidityScore || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Market Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{marketDepthData?.liquidityScore.toFixed(0) || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Liquidity Score</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div 
                      className="bg-blue-500 h-1 rounded-full"
                      style={{ width: `${marketDepthData?.liquidityScore || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold">{marketDepthData?.depthScore.toFixed(0) || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Market Depth</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div 
                      className="bg-green-500 h-1 rounded-full"
                      style={{ width: `${marketDepthData?.depthScore || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {aggregatedData?.consolidatedMetrics.arbitrageOpportunity.exists ? 'YES' : 'NO'}
                  </p>
                  <p className="text-sm text-muted-foreground">Arbitrage Available</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div 
                      className={`h-1 rounded-full ${
                        aggregatedData?.consolidatedMetrics.arbitrageOpportunity.exists 
                          ? 'bg-orange-500' 
                          : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: aggregatedData?.consolidatedMetrics.arbitrageOpportunity.exists ? '100%' : '20%'
                      }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {loading ? '...' : Object.keys(aggregatedData?.marketplaceData || {}).filter(
                      key => (aggregatedData?.marketplaceData as any)?.[key]?.available
                    ).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Markets</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div
                      className="bg-purple-500 h-1 rounded-full"
                      style={{
                        width: `${(Object.keys(aggregatedData?.marketplaceData || {}).filter(
                          key => (aggregatedData?.marketplaceData as any)?.[key]?.available
                        ).length / 4) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}