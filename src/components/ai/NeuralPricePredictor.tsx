'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ChartPoint {
  time: string;
  price: number;
  sma20?: number;
  sma50?: number;
}

function computeSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

export function NeuralPricePredictor() {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<{
    direction: 'bullish' | 'bearish' | 'neutral';
    currentPrice: number;
    sma20: number;
    sma50: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchKlines = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/cypher-ai/dashboard-data');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        if (cancelled || !data.klines) return;

        const klines: number[][] = data.klines;
        const closePrices = klines.map((k) => parseFloat(String(k[4])));

        const sma20 = computeSMA(closePrices, 20);
        const sma50 = computeSMA(closePrices, 50);

        // Show last 72 hours for readability
        const startIdx = Math.max(0, klines.length - 72);
        const points: ChartPoint[] = [];
        for (let i = startIdx; i < klines.length; i++) {
          const date = new Date(klines[i][0]);
          points.push({
            time: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`,
            price: closePrices[i],
            sma20: sma20[i] ?? undefined,
            sma50: sma50[i] ?? undefined,
          });
        }

        setChartData(points);

        // SMA crossover prediction
        const lastSma20 = sma20[sma20.length - 1];
        const lastSma50 = sma50[sma50.length - 1];
        const currentPrice = closePrices[closePrices.length - 1];

        let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (lastSma20 != null && lastSma50 != null) {
          if (lastSma20 > lastSma50) direction = 'bullish';
          else if (lastSma20 < lastSma50) direction = 'bearish';
        }

        setPrediction({
          direction,
          currentPrice,
          sma20: lastSma20 ?? currentPrice,
          sma50: lastSma50 ?? currentPrice,
        });

        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    fetchKlines();
    const interval = setInterval(fetchKlines, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const getTrendIcon = () => {
    if (!prediction) return null;
    if (prediction.direction === 'bullish') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (prediction.direction === 'bearish') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Activity className="w-5 h-5 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-orange-500">Price Analysis</h2>
        </div>
        <div className="text-sm text-gray-400">Loading price data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-orange-500">Price Analysis</h2>
      </div>

      {prediction && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-black/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">SMA Signal</span>
                {getTrendIcon()}
              </div>
              <div className={`text-2xl font-bold capitalize ${
                prediction.direction === 'bullish' ? 'text-green-500' :
                prediction.direction === 'bearish' ? 'text-red-500' :
                'text-yellow-500'
              }`}>
                {prediction.direction}
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Current Price</div>
              <div className="text-xl font-semibold text-white">
                ${prediction.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">SMA 20 / 50</div>
              <div className="text-sm text-green-500">
                20: ${prediction.sma20.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-orange-400">
                50: ${prediction.sma50.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#666" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #f97316' }}
                  labelStyle={{ color: '#f97316' }}
                  formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, '']}
                />
                <Line type="monotone" dataKey="price" stroke="#f97316" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="sma20" stroke="#10b981" dot={false} strokeWidth={1} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="sma50" stroke="#3b82f6" dot={false} strokeWidth={1} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-gray-500">
        * Technical Analysis (SMA crossover) - Real Binance BTCUSDT hourly data
      </div>
    </div>
  );
}
