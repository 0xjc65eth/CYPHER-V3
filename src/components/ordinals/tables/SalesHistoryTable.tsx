'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { ShoppingBag, TrendingUp, TrendingDown, ExternalLink, User, Clock } from 'lucide-react'
import { ordinalsService } from '@/services/ordinals'
import { useQuery } from '@tanstack/react-query'

interface Sale {
  id: string
  collection: string
  item: string
  price: number
  usdValue: number
  from: string
  to: string
  timestamp: number
  marketplace: string
  txid: string
  priceChange?: number
  miniChart?: { time: number; price: number }[]
}

export function SalesHistoryTable() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  // Use real sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['ordinals-sales-history', timeRange],
    queryFn: async () => {
      const limit = timeRange === '1h' ? 10 : timeRange === '24h' ? 20 : 50
      const sales = await (ordinalsService as any).getRecentSales(limit)
      return sales.map((sale: any) => ({
        id: sale.inscription_id,
        collection: 'Unknown', // Would need collection mapping
        item: `#${sale.inscription_number}`,
        price: sale.price,
        usdValue: sale.price_usd,
        from: sale.from_address.substring(0, 8) + '...',
        to: sale.to_address.substring(0, 8) + '...',
        timestamp: sale.timestamp,
        marketplace: sale.marketplace,
        txid: sale.tx_id.substring(0, 8) + '...',
        priceChange: sale.price_change_24h ?? 0,
        miniChart: undefined // No historical price series available from API
      }))
    },
    refetchInterval: 30000,
    staleTime: 15000
  })

  // No mock fallback - empty state shown when no real data available
  const emptySales: Sale[] = []

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`
    return `${minutes}m ago`
  }

  const getMarketplaceColor = (marketplace: string) => {
    switch (marketplace) {
      case 'Gamma.io': return 'bg-purple-500/20 text-purple-500 border-purple-500/50'
      case 'Gamma': return 'bg-blue-500/20 text-blue-500 border-blue-500/50'
      case 'OKX': return 'bg-green-500/20 text-green-500 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/50'
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Sales History
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isLoading && salesData && <Badge className="bg-green-500/20 text-green-500 mr-2">Live Data</Badge>}
            <Button
              variant={timeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1h')}
            >
              1H
            </Button>
            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
            >
              24H
            </Button>
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-orange-500">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                Loading real sales data...
              </div>
            </div>
          )}
          {(salesData || emptySales).map((sale: any) => (
            <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sale.collection}</span>
                    <span className="text-orange-500">{sale.item}</span>
                    <Badge className={getMarketplaceColor(sale.marketplace)} variant="outline">
                      {sale.marketplace}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {sale.from} → {sale.to}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(sale.timestamp)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold font-mono">{sale.price} BTC</p>
                  <p className="text-sm text-muted-foreground">${sale.usdValue.toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {sale.priceChange !== undefined && (
                    <div className={`flex items-center gap-1 ${
                      sale.priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {sale.priceChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">{Math.abs(sale.priceChange)}%</span>
                    </div>
                  )}
                  
                  {sale.miniChart && (
                    <div className="w-24 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sale.miniChart}>
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke={sale.priceChange && sale.priceChange >= 0 ? '#10b981' : '#ef4444'}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: '#1a1a1a', 
                              border: '1px solid #333',
                              borderRadius: '4px',
                              padding: '4px 8px'
                            }}
                            labelStyle={{ display: 'none' }}
                            formatter={(value: any) => [`${value} BTC`, '']}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}