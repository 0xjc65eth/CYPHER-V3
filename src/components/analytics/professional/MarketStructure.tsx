'use client'

import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Activity, TrendingUp, Layers } from 'lucide-react'

interface MarketStructureProps {
  timeRange: string
  isLive?: boolean
}

const MarketStructure: FC<MarketStructureProps> = ({ timeRange, isLive }) => {
  const structureMetrics = [
    { label: 'Market Depth', value: '$2.3B', icon: Layers, change: '+15.2%' },
    { label: 'Order Flow', value: '1.2K/min', icon: Activity, change: '+8.7%' },
    { label: 'Bid/Ask Spread', value: '0.012%', icon: BarChart3, change: '-2.3%' },
    { label: 'Price Impact', value: '0.08%', icon: TrendingUp, change: '-5.1%' }
  ]

  const orderBookLevels = [
    { price: '$43,250', bidSize: '12.5 BTC', askSize: '8.3 BTC', spread: '0.01%' },
    { price: '$43,200', bidSize: '18.2 BTC', askSize: '15.7 BTC', spread: '0.02%' },
    { price: '$43,150', bidSize: '25.8 BTC', askSize: '22.1 BTC', spread: '0.03%' },
    { price: '$43,100', bidSize: '31.4 BTC', askSize: '28.9 BTC', spread: '0.04%' },
    { price: '$43,050', bidSize: '45.2 BTC', askSize: '38.6 BTC', spread: '0.05%' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Market Structure Analysis</h2>
        {isLive && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {structureMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                  {metric.change}
                </span> from last {timeRange}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Book Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderBookLevels.map((level, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{level.price}</span>
                    <span className="text-muted-foreground">Spread: {level.spread}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-600">Bid</span>
                        <span>{level.bidSize}</span>
                      </div>
                      <div className="h-2 bg-green-600/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600"
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-600">Ask</span>
                        <span>{level.askSize}</span>
                      </div>
                      <div className="h-2 bg-red-600/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-600"
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Microstructure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Order Imbalance</p>
                  <p className="text-xs text-muted-foreground">Buy/Sell ratio</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">1.23</p>
                  <p className="text-xs text-green-600">Bullish</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Market Efficiency</p>
                  <p className="text-xs text-muted-foreground">Price discovery score</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">87.5%</p>
                  <p className="text-xs text-green-600">High</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Liquidity Score</p>
                  <p className="text-xs text-muted-foreground">Depth & resilience</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">92.3</p>
                  <p className="text-xs text-muted-foreground">Excellent</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Trade Velocity</p>
                  <p className="text-xs text-muted-foreground">Trades per minute</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">342</p>
                  <p className="text-xs text-green-600">+12.5%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volume Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center bg-muted/10 rounded-lg">
            <p className="text-muted-foreground">Volume profile visualization</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MarketStructure