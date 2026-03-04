'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useBitcoinPriceHistory } from '@/hooks/useBitcoinPriceHistory';
import { useOrdinalsVolumeChart } from '@/hooks/useOrdinalsVolumeChart';
import { useRunesTradingActivity } from '@/hooks/useRunesTradingActivity';
import { useMarketSentiment } from '@/hooks/useMarketSentiment';

export function ChartsAndAnalytics() {
  const [timeframe, setTimeframe] = useState('24h');
  const { data: btcHistory, loading: btcLoading } = useBitcoinPriceHistory(timeframe);
  const ordinalsData = useOrdinalsVolumeChart('all', '30d');
  const ordinalsVolume = ordinalsData.labels.map((label, i) => ({ date: label, volume: ordinalsData.volumes[i] || 0 }));
  const ordinalsLoading = ordinalsData.loading;
  const runesData = useRunesTradingActivity();
  const runesActivity = runesData.activity.map((a: any) => ({ timestamp: a.timestamp, trades: a.trades || 0, volume: a.volume || 0 }));
  const runesLoading = runesData.loading;
  const { data: sentiment, loading: sentimentLoading } = useMarketSentiment();

  const timeframes = [
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '1Y', value: '1y' }
  ];

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeframe === '24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timeframe === '7d') return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Price')) return `$${value.toLocaleString()}`;
    if (name.includes('Volume')) return `${value.toLocaleString()} BTC`;
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Bitcoin Price Chart */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="text-xl font-semibold text-white">Bitcoin Price Chart</h3>
            </div>
            <div className="flex gap-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeframe === tf.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            {btcLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                Loading chart data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={btcHistory}>
                  <defs>
                    <linearGradient id="colorBitcoin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7931a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f7931a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatXAxis}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Price"
                    stroke="#f7931a"
                    
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Card>

      {/* Multi-Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ordinals Volume Chart */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-white">Ordinals Volume (30D)</h3>
            </div>
            <div className="h-[300px] w-full">
              {ordinalsLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordinalsVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={(date) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `${value} BTC`}
                    />
                    <Tooltip 
                      formatter={formatTooltipValue}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Bar dataKey="volume" name="Volume" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        {/* Runes Trading Activity */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-white">Runes Trading Activity</h3>
            </div>
            <div className="h-[300px] w-full">
              {runesLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={runesActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#9CA3AF"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit' })}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      formatter={formatTooltipValue}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="trades" 
                      name="Trades" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      name="Volume (BTC)" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        {/* Market Sentiment Timeline */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-white">Market Sentiment Timeline</h3>
            </div>
            <div className="h-[250px] w-full">
              {sentimentLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading sentiment data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentiment}>
                    <defs>
                      <linearGradient id="colorBullish" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBearish" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#9CA3AF"
                      tickFormatter={(ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bullish"
                      name="Bullish"
                      stroke="#10B981"
                      
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="bearish"
                      name="Bearish"
                      stroke="#EF4444"
                      
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}