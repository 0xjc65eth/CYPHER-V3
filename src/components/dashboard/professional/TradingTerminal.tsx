'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardIcons } from '@/lib/icons/icon-system';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { useMarketData } from '@/hooks/dashboard/useMarketData';
import { CandlestickChart, LineChart, BarChart3 } from 'lucide-react';

export function TradingTerminal() {
  const { price, change24h, volume24h, isLoading } = useBitcoinPrice();
  const marketData = useMarketData();
  const [chartType, setChartType] = useState('candles');
  const [timeframe, setTimeframe] = useState('1h');
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Ensure price is a number, default to 0 if undefined
  const currentPrice = isMounted && typeof price === 'number' ? price : 0;

  return (
    <Card className="bg-gray-900 border-gray-800 p-4">
      <div className="flex flex-col space-y-4">
        {/* Header with price and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <h2 className="text-2xl font-bold text-white">BTC/USD</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-3xl font-mono text-white">
                  ${currentPrice.toLocaleString()}
                </span>
                <span className={`flex items-center text-sm font-medium ${isMounted && change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {isMounted && change24h >= 0 ? <DashboardIcons.priceUp.icon className="w-4 h-4 mr-1" /> : <DashboardIcons.priceDown.icon className="w-4 h-4 mr-1" />}
                  {isMounted ? Math.abs(change24h).toFixed(2) : '0.00'}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">24h High</span>
                <p className="text-white font-medium">${isMounted ? (marketData?.high24h?.toLocaleString() || '0') : '0'}</p>
              </div>
              <div>
                <span className="text-gray-400">24h Low</span>
                <p className="text-white font-medium">${isMounted ? (marketData?.low24h?.toLocaleString() || '0') : '0'}</p>
              </div>
              <div>
                <span className="text-gray-400">24h Volume</span>
                <p className="text-white font-medium">${isMounted ? (volume24h?.toLocaleString() || '0') : '0'}</p>
              </div>
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-800 rounded p-0.5">
              <Button
                size="sm"
                variant={chartType === 'candles' ? 'default' : 'ghost'}
                onClick={() => setChartType('candles')}
                className="h-7 px-2"
              >
                <CandlestickChart className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setChartType('line')}
                className="h-7 px-2"
              >
                <LineChart className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'bars' ? 'default' : 'ghost'}
                onClick={() => setChartType('bars')}
                className="h-7 px-2"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
            
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1D</option>
            </select>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="bg-gray-950 rounded h-96 flex items-center justify-center">
          <span className="text-gray-500">Chart Placeholder - {chartType} {timeframe}</span>
        </div>

        {/* Order Book and Trades */}
        <div className="grid grid-cols-2 gap-4">
          {/* Order Book */}
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Order Book</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-gray-500 pb-1 border-b border-gray-700">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Total</span>
              </div>
              {/* Sells (from real order book data) */}
              <div className="space-y-0.5">
                {(marketData.orderBook?.asks || []).slice(0, 5).reverse().map((ask, i) => (
                  <div key={`sell-${i}`} className="grid grid-cols-3 text-xs">
                    <span className="text-red-500 font-mono">{ask.price.toFixed(2)}</span>
                    <span className="text-right text-gray-400">{ask.amount.toFixed(4)}</span>
                    <span className="text-right text-gray-400">{ask.total.toFixed(2)}</span>
                  </div>
                ))}
                {(marketData.orderBook?.asks || []).length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-2">Loading asks...</div>
                )}
              </div>
              <div className="py-2 text-center">
                <span className="text-lg font-bold text-white">${currentPrice.toFixed(2)}</span>
              </div>
              {/* Buys (from real order book data) */}
              <div className="space-y-0.5">
                {(marketData.orderBook?.bids || []).slice(0, 5).map((bid, i) => (
                  <div key={`buy-${i}`} className="grid grid-cols-3 text-xs">
                    <span className="text-green-500 font-mono">{bid.price.toFixed(2)}</span>
                    <span className="text-right text-gray-400">{bid.amount.toFixed(4)}</span>
                    <span className="text-right text-gray-400">{bid.total.toFixed(2)}</span>
                  </div>
                ))}
                {(marketData.orderBook?.bids || []).length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-2">Loading bids...</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Recent Trades</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-gray-500 pb-1 border-b border-gray-700">
                <span>Time</span>
                <span className="text-right">Price</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="space-y-0.5">
                {(marketData.recentTrades || []).slice(0, 10).map((trade, i) => (
                  <div key={`trade-${i}`} className="grid grid-cols-3 text-xs">
                    <span className="text-gray-500">{isMounted ? new Date(trade.timestamp).toLocaleTimeString() : '--:--:--'}</span>
                    <span className={`text-right font-mono ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.price.toFixed(2)}
                    </span>
                    <span className="text-right text-gray-400">{trade.amount.toFixed(4)}</span>
                  </div>
                ))}
                {(marketData.recentTrades || []).length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-4">Loading trades...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}