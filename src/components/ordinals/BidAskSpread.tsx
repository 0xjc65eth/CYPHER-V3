/**
 * BidAskSpread Component
 * Tracks bid-ask spread over time and analyzes spread tightness
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useOrderBook } from '@/hooks/ordinals/useOrderBook';

interface BidAskSpreadProps {
  symbol: string;
}

interface SpreadHistory {
  timestamp: string;
  spread: number;
  spreadPercent: number;
  midPrice: number;
}

export default function BidAskSpread({ symbol }: BidAskSpreadProps) {
  const { orderBook, isLoading } = useOrderBook({ symbol });
  const [spreadHistory, setSpreadHistory] = useState<SpreadHistory[]>([]);

  // Track spread over time (keep last 20 data points)
  useEffect(() => {
    if (orderBook) {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      setSpreadHistory(prev => {
        const newHistory = [
          ...prev,
          {
            timestamp,
            spread: orderBook.spread,
            spreadPercent: orderBook.spreadPercentage,
            midPrice: orderBook.midPrice
          }
        ].slice(-20); // Keep last 20 points

        return newHistory;
      });
    }
  }, [orderBook]);

  if (isLoading || !orderBook) {
    return (
      <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
        <CardHeader>
          <CardTitle className="text-sm">Bid-Ask Spread</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading spread data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate spread metrics
  const avgSpread = spreadHistory.length > 0
    ? spreadHistory.reduce((sum, h) => sum + h.spreadPercent, 0) / spreadHistory.length
    : 0;

  const spreadTrend = spreadHistory.length >= 2
    ? spreadHistory[spreadHistory.length - 1].spreadPercent - spreadHistory[spreadHistory.length - 2].spreadPercent
    : 0;

  const spreadVolatility = spreadHistory.length > 1
    ? Math.sqrt(
        spreadHistory.reduce((sum, h) => sum + Math.pow(h.spreadPercent - avgSpread, 2), 0) / spreadHistory.length
      )
    : 0;

  const spreadQuality = orderBook.spreadPercentage < 1 ? 'excellent' :
                       orderBook.spreadPercentage < 2 ? 'good' :
                       orderBook.spreadPercentage < 5 ? 'fair' : 'poor';

  return (
    <Card className="bg-[#0d0d1a] border-[#1a1a2e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            Bid-Ask Spread Tracker
          </CardTitle>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            spreadQuality === 'excellent' ? 'bg-green-500/20 text-green-400' :
            spreadQuality === 'good' ? 'bg-blue-500/20 text-blue-400' :
            spreadQuality === 'fair' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {spreadQuality.toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Spread Metrics */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Current Spread</p>
            <p className="text-lg font-mono text-orange-500">{orderBook.spreadPercentage.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">{orderBook.spread.toFixed(6)} BTC</p>
          </div>

          <div className="text-center p-2 rounded bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Avg Spread</p>
            <p className="text-lg font-mono text-white">{avgSpread.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Last {spreadHistory.length} pts</p>
          </div>

          <div className="text-center p-2 rounded bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Spread Trend</p>
            <div className="flex items-center justify-center gap-1">
              {spreadTrend > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-400" />
                  <p className="text-lg font-mono text-red-400">+{spreadTrend.toFixed(2)}%</p>
                </>
              ) : spreadTrend < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-green-400" />
                  <p className="text-lg font-mono text-green-400">{spreadTrend.toFixed(2)}%</p>
                </>
              ) : (
                <p className="text-lg font-mono text-gray-400">0.00%</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">vs previous</p>
          </div>

          <div className="text-center p-2 rounded bg-[#1a1a2e]">
            <p className="text-xs text-muted-foreground mb-1">Volatility</p>
            <p className="text-lg font-mono text-purple-400">{spreadVolatility.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">std deviation</p>
          </div>
        </div>

        {/* Spread History Chart */}
        {spreadHistory.length > 0 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spreadHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#666"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(spreadHistory.length / 5)}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Spread %', angle: -90, position: 'insideLeft', fill: '#999', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#999' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'spreadPercent') return [`${value.toFixed(2)}%`, 'Spread'];
                    if (name === 'midPrice') return [`${value.toFixed(6)} BTC`, 'Mid Price'];
                    return [value, name];
                  }}
                />
                <ReferenceLine
                  y={avgSpread}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  label={{ value: 'Avg', fill: '#6366f1', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="spreadPercent"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Collecting spread data...</p>
          </div>
        )}

        {/* Spread Analysis */}
        <div className="mt-4 pt-4 border-t border-[#2a2a3e] grid grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Best Bid</span>
            <span className="font-mono text-green-500">{orderBook.bestBid?.toFixed(6) || 'N/A'} BTC</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Best Ask</span>
            <span className="font-mono text-red-500">{orderBook.bestAsk?.toFixed(6) || 'N/A'} BTC</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Mid Price</span>
            <span className="font-mono text-white">{orderBook.midPrice.toFixed(6)} BTC</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Spread Quality</span>
            <span className={`font-medium capitalize ${
              spreadQuality === 'excellent' ? 'text-green-400' :
              spreadQuality === 'good' ? 'text-blue-400' :
              spreadQuality === 'fair' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {spreadQuality}
            </span>
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-3 p-2 rounded bg-[#1a1a2e] border border-[#2a2a3e]">
          <p className="text-xs text-muted-foreground">
            {spreadQuality === 'excellent' && '✓ Tight spread indicates high liquidity and active market making'}
            {spreadQuality === 'good' && '✓ Good spread indicates reasonable liquidity'}
            {spreadQuality === 'fair' && '⚠ Moderate spread - liquidity could be better'}
            {spreadQuality === 'poor' && '⚠ Wide spread indicates low liquidity or inactive market'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
