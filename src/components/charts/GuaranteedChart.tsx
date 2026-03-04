'use client';

import React, { useEffect, useState } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface GuaranteedChartProps {
  symbol: string;
  interval?: string;
  height?: number;
}

// Error boundary for chart components
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode }, 
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex flex-col items-center justify-center h-96">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 mb-2">Chart rendering failed</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Retry
            </button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export const GuaranteedChart: React.FC<GuaranteedChartProps> = ({ 
  symbol, 
  interval = '1h',
  height = 400
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    currentPrice: 0,
    priceChange: 0,
    high: 0,
    low: 0,
    volume: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=50`
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          // Transform data
          const chartData = result.data.map((item: any, index: number) => ({
            name: new Date(item.time * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            price: item.close,
            high: item.high,
            low: item.low,
            volume: item.volume
          }));

          setData(chartData);

          // Calculate stats
          const prices = chartData.map((d: any) => d.price);
          const currentPrice = prices[prices.length - 1];
          const firstPrice = prices[0];
          const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;
          
          setStats({
            currentPrice,
            priceChange,
            high: Math.max(...chartData.map((d: any) => d.high)),
            low: Math.min(...chartData.map((d: any) => d.low)),
            volume: chartData.reduce((sum: number, d: any) => sum + d.volume, 0)
          });

        } else {
          throw new Error('No data received from API');
        }
      } catch (err) {
        console.error('📊 Chart error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000); // Update every 30s
    
    return () => clearInterval(intervalId);
  }, [symbol, interval]);

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-400">Loading chart data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex flex-col items-center justify-center" style={{ height }}>
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-400 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Reload Page
          </button>
        </div>
      </Card>
    );
  }

  return (
    <ChartErrorBoundary>
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {symbol.replace('USDT', '/USDT')}
            </h3>
            <p className="text-sm text-gray-400">{interval} Chart</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {formatPrice(stats.currentPrice)}
            </p>
            <p className={`text-sm flex items-center justify-end gap-1 ${
              stats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {stats.priceChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height - 150}>
            <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={formatPrice}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <Tooltip 
                formatter={(value: any) => formatPrice(value)}
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height: height - 150 }}>
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">No chart data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">24h High</p>
            <p className="font-semibold text-white">
              {formatPrice(stats.high)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">24h Low</p>
            <p className="font-semibold text-white">
              {formatPrice(stats.low)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Volume</p>
            <p className="font-semibold text-white">
              {(stats.volume / 1000).toFixed(1)}K
            </p>
          </div>
        </div>
      </div>
      </Card>
    </ChartErrorBoundary>
  );
};