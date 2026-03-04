'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Bitcoin, Zap, Coins, Activity } from 'lucide-react';
import { useSimpleBitcoinPrice } from '@/hooks/useSimpleBitcoinPrice';

interface MarketCard {
  title: string;
  value: string;
  change: string;
  changePercent: number;
  icon: React.ComponentType<any>;
  color: string;
  loading?: boolean;
}

export default function MarketOverviewCards() {
  const { data: bitcoinPrice, isLoading: bitcoinLoading } = useSimpleBitcoinPrice();

  // Mock data for demonstration
  const marketData: MarketCard[] = [
    {
      title: 'Bitcoin Price',
      value: bitcoinLoading ? '$--,---' : `$${bitcoinPrice?.toLocaleString() || '43,567'}`,
      change: '+$1,234',
      changePercent: 2.9,
      icon: Bitcoin,
      color: 'orange',
      loading: bitcoinLoading
    },
    {
      title: 'Ordinals Volume',
      value: '₿847.5',
      change: '+₿23.4',
      changePercent: 2.8,
      icon: Coins,
      color: 'blue'
    },
    {
      title: 'Runes Market Cap',
      value: '$2.3B',
      change: '+$45.2M',
      changePercent: 1.9,
      icon: Zap,
      color: 'purple'
    },
    {
      title: 'Network Hashrate',
      value: '520 EH/s',
      change: '+12 EH/s',
      changePercent: 2.3,
      icon: Activity,
      color: 'green'
    }
  ];

  const getColorClasses = (color: string, isPositive: boolean) => {
    const colors = {
      orange: {
        bg: 'bg-orange-500/20',
        icon: 'text-orange-400',
        change: isPositive ? 'text-green-400' : 'text-red-400'
      },
      blue: {
        bg: 'bg-blue-500/20',
        icon: 'text-blue-400',
        change: isPositive ? 'text-green-400' : 'text-red-400'
      },
      purple: {
        bg: 'bg-purple-500/20',
        icon: 'text-purple-400',
        change: isPositive ? 'text-green-400' : 'text-red-400'
      },
      green: {
        bg: 'bg-green-500/20',
        icon: 'text-green-400',
        change: isPositive ? 'text-green-400' : 'text-red-400'
      }
    };
    return colors[color as keyof typeof colors] || colors.orange;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
      {marketData.map((item, index) => {
        const isPositive = item.changePercent >= 0;
        const colorClasses = getColorClasses(item.color, isPositive);
        const Icon = item.icon;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card 
            key={index} 
            className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 cursor-pointer group"
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                </div>
                <div className={`flex items-center space-x-1 ${colorClasses.change}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {Math.abs(item.changePercent)}%
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-xs sm:text-sm text-gray-400 mb-1">{item.title}</h3>
                <div className="flex items-baseline justify-between">
                  <p className="text-xl sm:text-2xl font-bold text-white group-hover:text-orange-400 transition-colors duration-300">
                    {item.loading ? (
                      <span className="animate-pulse">••••••</span>
                    ) : (
                      item.value
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-sm ${colorClasses.change}`}>
                    {isPositive ? '+' : ''}{item.change}
                  </span>
                  <span className="text-xs text-gray-500">24h</span>
                </div>
              </div>

              {/* Mini Chart Placeholder */}
              <div className="mt-4 h-8 flex items-end space-x-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${
                      isPositive ? 'bg-green-400/30' : 'bg-red-400/30'
                    } group-hover:bg-orange-400/50 transition-colors duration-300`}
                    style={{
                      height: `${20 + ((i * 37 + 13) % 80)}%`,
                      animationDelay: `${i * 100}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}