'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { devLogger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

interface VolumeData {
  time: string;
  volume: number;
  price: number;
  color: string;
}

export function VolumeChart() {
  devLogger.log('CHART', 'Volume Chart component rendered');

  const [data, setData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchVolumeData = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/charts/historical?symbol=BTCUSDT&interval=1h&limit=24'
      );
      if (!mountedRef.current) return;

      if (!res.ok) throw new Error(`Chart API returned ${res.status}`);

      const json = await res.json();
      if (!json.success || !json.data) {
        setLoading(false);
        return;
      }

      const volumeData: VolumeData[] = json.data.map((c: any, i: number) => {
        const prevClose = i > 0 ? json.data[i - 1].close : c.open;
        const isUp = c.close >= prevClose;
        return {
          time: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          volume: c.volume || 0,
          price: c.close || 0,
          color: isUp ? '#22c55e' : '#ef4444',
        };
      });

      setData(volumeData);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('VolumeChart fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchVolumeData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchVolumeData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.time}</p>
          <p className="text-sm">
            Volume: ${(payload[0].value / 1000000).toFixed(2)}M
          </p>
          <p className="text-sm text-muted-foreground">
            Price: ${payload[0].payload.price.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>24h Volume Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading volume data...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            <p className="text-sm">Volume data unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
