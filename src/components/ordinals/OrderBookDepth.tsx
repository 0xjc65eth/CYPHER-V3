/**
 * OrderBookDepth Component
 * Professional order book visualization with bid/ask depth chart
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useOrderBook } from '@/hooks/ordinals/useOrderBook';
import { ExportButton } from '@/components/common/ExportButton';

interface OrderBookDepthProps {
  symbol: string;
}

export default function OrderBookDepth({ symbol }: OrderBookDepthProps) {
  const { orderBook, isLoading } = useOrderBook({ symbol });

  if (isLoading || !orderBook) {
    return (
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Order Book Depth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading order book...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine bids and asks for depth chart
  // Reverse bids so they go from left (low price) to mid
  const bidsReversed = [...orderBook.bids].reverse();

  const depthChartData = [
    ...bidsReversed.map(bid => ({
      price: bid.price,
      buyDepth: bid.cumulativeQuantity,
      sellDepth: 0,
      side: 'bid'
    })),
    ...orderBook.asks.map(ask => ({
      price: ask.price,
      buyDepth: 0,
      sellDepth: ask.cumulativeQuantity,
      side: 'ask'
    }))
  ].sort((a, b) => a.price - b.price);

  const midPrice = orderBook.midPrice;

  return (
    <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Order Book Depth</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <ExportButton
              type="custom"
              data={[...orderBook.bids, ...orderBook.asks]}
              columns={[
                { key: 'price', label: 'Price (BTC)' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'cumulativeQuantity', label: 'Cumulative Qty' },
                { key: 'side', label: 'Side' },
              ]}
              title="Order Book"
              filename={`${symbol}-orderbook`}
              size="sm"
              variant="outline"
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Buy Side: {orderBook.bids[0]?.cumulativeQuantity || 0} items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Sell Side: {orderBook.asks[orderBook.asks.length - 1]?.cumulativeQuantity || 0} items</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Order Book Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Best Bid</span>
            </div>
            <p className="text-lg font-mono text-green-500">
              {orderBook.bestBid?.toFixed(6) || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">BTC</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-muted-foreground">Spread</span>
            </div>
            <p className="text-lg font-mono text-orange-500">
              {orderBook.spreadPercentage.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {orderBook.spread.toFixed(6)} BTC
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-xs text-muted-foreground">Best Ask</span>
            </div>
            <p className="text-lg font-mono text-red-500">
              {orderBook.bestAsk?.toFixed(6) || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">BTC</p>
          </div>
        </div>

        {/* Depth Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={depthChartData}>
              <defs>
                <linearGradient id="buyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="sellGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="price"
                stroke="#666"
                tickFormatter={(value) => value.toFixed(4)}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#999' }}
                formatter={(value: number, name: string) => [
                  value,
                  name === 'buyDepth' ? 'Buy Orders' : 'Sell Orders'
                ]}
                labelFormatter={(label) => `Price: ${Number(label).toFixed(6)} BTC`}
              />
              <ReferenceLine
                x={midPrice}
                stroke="#f97316"
                strokeDasharray="3 3"
                label={{ value: 'Mid Price', fill: '#f97316', fontSize: 12 }}
              />
              <Area
                type="stepAfter"
                dataKey="buyDepth"
                stroke="#10b981"
                fill="url(#buyGradient)"
                isAnimationActive={false}
              />
              <Area
                type="stepBefore"
                dataKey="sellDepth"
                stroke="#ef4444"
                fill="url(#sellGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Liquidity Metrics */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#2a2a3e]">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Liquidity Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#2a2a3e] rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${orderBook.liquidityScore}%` }}
                />
              </div>
              <span className="text-sm font-mono">{orderBook.liquidityScore.toFixed(0)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Market Depth</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#2a2a3e] rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${orderBook.depthScore}%` }}
                />
              </div>
              <span className="text-sm font-mono">{orderBook.depthScore.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
