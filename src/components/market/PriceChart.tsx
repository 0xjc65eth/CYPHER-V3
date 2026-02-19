'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { devLogger } from '@/lib/logger';

interface PriceChartProps {
  symbol?: string;
}

export function PriceChart({ symbol = 'BTC' }: PriceChartProps) {
  const [interval, setChartInterval] = useState<'1h' | '1d'>('1h');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      devLogger.log('CHART', `Loading ${symbol} price chart`);

      const binanceSymbol = `${symbol}USDT`;
      const res = await fetch(
        `/api/charts/historical?symbol=${binanceSymbol}&interval=${interval}&limit=24`
      );

      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(`Chart API returned ${res.status}`);

      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Calculate SMAs from real data
      const closes = json.data.map((c: any) => c.close);

      const calcSMA = (values: number[], period: number): number[] => {
        return values.map((_, i) => {
          if (i < period - 1) return 0;
          const slice = values.slice(i - period + 1, i + 1);
          return slice.reduce((a, b) => a + b, 0) / period;
        });
      };

      const sma20 = calcSMA(closes, Math.min(20, closes.length));
      const sma50 = calcSMA(closes, Math.min(50, closes.length));

      const chartData = json.data.map((c: any, i: number) => ({
        time: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: c.close,
        sma20: sma20[i] || undefined,
        sma50: sma50[i] || undefined,
      }));

      setData(chartData);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('PriceChart fetch error:', err);
      setData([]);
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{symbol}/USD Price</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={interval === '1h' ? 'default' : 'outline'}
              onClick={() => setChartInterval('1h')}
            >
              1H
            </Button>
            <Button
              size="sm"
              variant={interval === '1d' ? 'default' : 'outline'}
              onClick={() => setChartInterval('1d')}
            >
              1D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading price data...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-gray-400">
            <p className="text-sm">Price data unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#f97316"
                fillOpacity={1}
                strokeWidth={2}
              />
              <Line type="monotone" dataKey="sma20" stroke="#3b82f6" dot={false} />
              <Line type="monotone" dataKey="sma50" stroke="#a855f7" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
