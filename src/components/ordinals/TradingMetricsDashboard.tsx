/**
 * TradingMetricsDashboard Component
 * Professional trading metrics including VWAP, volume analysis, and trade distribution
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Users, DollarSign, BarChart3 } from 'lucide-react';
import { useTradingMetrics } from '@/hooks/ordinals/useTradingMetrics';

interface TradingMetricsDashboardProps {
  symbol: string;
}

export default function TradingMetricsDashboard({ symbol }: TradingMetricsDashboardProps) {
  const { metrics, isLoading } = useTradingMetrics({ symbol });

  if (isLoading || !metrics) {
    return (
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Trading Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading trading metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const vwapVsFloor = metrics.floorVsVwapPercentage;
  const vwapTrend = vwapVsFloor > 0 ? 'above' : 'below';

  // Volume trend data
  const volumeData = [
    { period: '30d', volume: metrics.volume.volume30d, label: '30D' },
    { period: '7d', volume: metrics.volume.volume7d, label: '7D' },
    { period: '24h', volume: metrics.volume.volume24h, label: '24H' }
  ];

  // Trade distribution (create bins)
  const tradeSizeData = [
    { range: '< 0.5x', count: metrics.tradeSize.smallTradesCount, label: 'Small' },
    { range: '0.5x - 2x', count: metrics.trades.trades24h - metrics.tradeSize.smallTradesCount - metrics.tradeSize.largeTradesCount, label: 'Medium' },
    { range: '> 2x', count: metrics.tradeSize.largeTradesCount, label: 'Large' }
  ];

  return (
    <div className="space-y-4">
      {/* VWAP Analysis */}
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">VWAP Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">24h VWAP</p>
              <p className="text-xl font-mono text-white">{metrics.vwap24h.toFixed(6)}</p>
              <p className="text-xs text-muted-foreground">BTC</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Floor</p>
              <p className="text-xl font-mono text-white">{metrics.currentFloor.toFixed(6)}</p>
              <p className="text-xs text-muted-foreground">BTC</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Floor vs VWAP</p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-mono font-bold ${
                  vwapVsFloor > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {vwapVsFloor > 0 ? '+' : ''}{vwapVsFloor.toFixed(2)}%
                </p>
                {vwapVsFloor > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Floor {vwapTrend} VWAP
              </p>
            </div>
          </div>

          {vwapVsFloor < -5 && (
            <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/30">
              <p className="text-xs text-green-400">
                Floor price is significantly below VWAP - potential buying opportunity
              </p>
            </div>
          )}

          {vwapVsFloor > 5 && (
            <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30">
              <p className="text-xs text-red-400">
                Floor price is significantly above VWAP - may indicate overvaluation
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume & Activity Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              Volume Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="label" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value: number) => [`${value.toFixed(2)} BTC`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        index === 0 ? '#3b82f6' :
                        index === 1 ? '#6366f1' : '#8b5cf6'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Volume Trend</span>
              <div className="flex items-center gap-1">
                {metrics.volume.volumeTrend === 'increasing' ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500 font-medium">Increasing</span>
                  </>
                ) : metrics.volume.volumeTrend === 'decreasing' ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 font-medium">Decreasing</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-500 font-medium">Stable</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Trade Size Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradeSizeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" />
                  <YAxis dataKey="label" type="category" stroke="#666" width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value: number) => [`${value} trades`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]}>
                    {tradeSizeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        index === 0 ? '#ec4899' :
                        index === 1 ? '#a855f7' : '#6366f1'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Avg Trade</span>
                <p className="font-mono text-white">{metrics.tradeSize.avgTradeSize.toFixed(6)} BTC</p>
              </div>
              <div>
                <span className="text-muted-foreground">Median Trade</span>
                <p className="font-mono text-white">{metrics.tradeSize.medianTradeSize.toFixed(6)} BTC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Activity Stats */}
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Market Activity (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-muted-foreground">Total Trades</span>
              </div>
              <p className="text-2xl font-mono text-white">{metrics.trades.trades24h}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 text-green-400" />
                <span className="text-xs text-muted-foreground">Unique Buyers</span>
              </div>
              <p className="text-2xl font-mono text-white">{metrics.trades.uniqueBuyers24h}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 text-red-400" />
                <span className="text-xs text-muted-foreground">Unique Sellers</span>
              </div>
              <p className="text-2xl font-mono text-white">{metrics.trades.uniqueSellers24h}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-muted-foreground">Buyer/Seller Ratio</span>
              </div>
              <p className="text-2xl font-mono text-white">{metrics.trades.buyerSellerRatio.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.trades.buyerSellerRatio > 1 ? 'More buyers' : 'More sellers'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2a2a3e] grid grid-cols-3 gap-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Highest Sale</span>
              <span className="font-mono text-green-500">{metrics.priceMetrics.highestSale24h.toFixed(6)} BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lowest Sale</span>
              <span className="font-mono text-red-500">{metrics.priceMetrics.lowestSale24h.toFixed(6)} BTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Range</span>
              <span className="font-mono text-white">{metrics.priceMetrics.priceRange24h.toFixed(6)} BTC</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
