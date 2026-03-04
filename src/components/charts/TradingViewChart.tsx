'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';

export const TradingViewChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [currentPrice, setCurrentPrice] = useState(67234.56);
  const [priceChange, setPriceChange] = useState(2.45);

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      const delta = Math.sin(tick * 0.3) * 40 + Math.cos(tick * 0.7) * 20;
      setCurrentPrice(prev => prev + delta);
      setPriceChange(Math.sin(tick * 0.5) * 2 + Math.cos(tick * 0.2) * 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            Bitcoin Chart
          </CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold text-white">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center text-sm text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gradient-to-t from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-orange-400 mx-auto mb-2" />
            <p className="text-gray-400">TradingView Chart</p>
            <p className="text-gray-500 text-xs">Real-time tracking</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingViewChart;
