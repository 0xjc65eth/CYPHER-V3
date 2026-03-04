'use client';

// Bitcoin Price Chart - Real CoinGecko data via useBitcoinPriceHistory
import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Line, LineChart } from 'recharts';
import { BaseChart } from '../base/BaseChart';
import { Button } from '@/components/ui/button';
import { ChartTimeframe } from '../types/chartTypes';
import { useBitcoinPriceHistory } from '@/hooks/useBitcoinPriceHistory';

interface BitcoinPriceChartProps {
  showIndicators?: boolean;
  height?: number;
  className?: string;
}

// Map chart timeframe to useBitcoinPriceHistory interval
const TIMEFRAME_MAP: Record<ChartTimeframe, string> = {
  '1h': '24h',  // CoinGecko minimum is 1 day
  '4h': '24h',
  '1d': '24h',
  '1w': '7d',
  '1m': '30d',
  '1y': '365d',
  'all': '365d',
};

export function BitcoinPriceChart({
  showIndicators = true,
  height = 400,
  className
}: BitcoinPriceChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1d');

  const interval = TIMEFRAME_MAP[timeframe] || '24h';
  const { data: priceHistory, loading, error } = useBitcoinPriceHistory(interval);

  // Transform real price history into chart data
  const data = priceHistory.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    price: item.price,
  }));

  const TimeframeButtons = () => (
    <div className="flex gap-1 mb-4">
      {(['1h', '4h', '1d', '1w'] as ChartTimeframe[]).map((tf) => (
        <Button
          key={tf}
          size="sm"
          variant={timeframe === tf ? 'default' : 'outline'}
          onClick={() => setTimeframe(tf)}
        >
          {tf.toUpperCase()}
        </Button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={className}>
        <TimeframeButtons />
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-gray-400 text-sm">Loading Bitcoin price data...</span>
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className={className}>
        <TimeframeButtons />
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-gray-500 text-sm">
            {error || 'No price data available'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <TimeframeButtons />
      <BaseChart
        title="Bitcoin Price (USD)"
        height={height}
        data={data}
      >        <LineChart data={data}>
          <defs>
            <linearGradient id="colorBitcoin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="time" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
            labelStyle={{ color: '#888' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#f97316"
            fillOpacity={1}

            strokeWidth={2}
          />
        </LineChart>
      </BaseChart>
    </div>
  );
}
