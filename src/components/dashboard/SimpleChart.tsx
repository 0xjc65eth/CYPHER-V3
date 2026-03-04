'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
}

export function SimpleChart() {
  const { rawPrice: btcData, isLoading: loading, error } = useBitcoinPrice();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch(`/api/binance/klines/?symbol=BTCUSDT&interval=${selectedTimeframe}&limit=50`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const formattedData = data.data.map((item: any[]) => ({
            time: new Date(item[0]).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            price: parseFloat(item[4]), // Close price
            volume: parseFloat(item[5])
          }));
          setChartData(formattedData);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  // Calculate price change - with safety check
  const priceChange = (chartData && chartData.length >= 2) 
    ? ((chartData[chartData.length - 1]?.price - chartData[0]?.price) / chartData[0]?.price) * 100
    : 0;

  const isPositive = priceChange >= 0;

  // Safety check - render loading if no chart data
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-orange-500" />
            <h3 className="text-xl font-semibold text-white">Bitcoin Price Chart</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-orange-500" />
          <h3 className="text-xl font-semibold text-white">Bitcoin Price Chart</h3>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {['1h', '4h', '1d'].map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Price Display */}
      {btcData && (
        <div className="flex items-center gap-4 mb-6">
          <div className="text-3xl font-bold text-white">
            ${btcData.price?.toLocaleString() || '0'}
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            isPositive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {priceChange.toFixed(2)}%
          </div>
        </div>
      )}

      {/* Simple Chart Visualization */}
      <div className="h-64 bg-gray-800/50 rounded-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span>Erro ao carregar dados do gráfico</span>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-full relative">
            {/* Simple line chart using CSS */}
            <svg className="w-full h-full">
              <defs>
                <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#f97316', stopOpacity: 0.1 }} />
                </linearGradient>
              </defs>
              
              {/* Chart Line */}
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                points={chartData.map((point, index) => {
                  const x = (index / (chartData.length - 1)) * 100;
                  const minPrice = Math.min(...chartData.map(p => p.price));
                  const maxPrice = Math.max(...chartData.map(p => p.price));
                  const y = 100 - ((point.price - minPrice) / (maxPrice - minPrice)) * 80;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
              
              {/* Fill Area */}
              <polygon
                fill="url(#priceGradient)"
                points={[
                  '0%,100%',
                  ...chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 100;
                    const minPrice = Math.min(...chartData.map(p => p.price));
                    const maxPrice = Math.max(...chartData.map(p => p.price));
                    const y = 100 - ((point.price - minPrice) / (maxPrice - minPrice)) * 80;
                    return `${x}%,${y}%`;
                  }),
                  '100%,100%'
                ].join(' ')}
              />
            </svg>
            
            {/* Time Labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 mt-2">
              <span>{chartData[0]?.time}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.time}</span>
              <span>{chartData[chartData.length - 1]?.time}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span>Carregando dados do gráfico...</span>
          </div>
        )}
      </div>

      {/* Stats */}
      {btcData && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Volume 24h</div>
            <div className="text-white font-semibold">
              ${((btcData.volume24h || 0) / 1e9).toFixed(2)}B
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Máximo 24h</div>
            <div className="text-white font-semibold">
              ${(btcData.high24h || btcData.price || 0).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Mínimo 24h</div>
            <div className="text-white font-semibold">
              ${(btcData.low24h || btcData.price || 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}