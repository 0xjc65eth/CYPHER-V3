'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { ArbitrageOpportunity } from '@/hooks/useArbitrage';

interface SpreadChartProps {
  opportunities: ArbitrageOpportunity[];
}

interface SpreadDataPoint {
  timestamp: number;
  symbol: string;
  spread: number;
  type: 'ordinals' | 'runes' | 'tokens';
  buySource: string;
  sellSource: string;
  volume: number;
}

export default function SpreadChart({ opportunities }: SpreadChartProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  // Accumulate real spread snapshots over time
  const spreadHistoryRef = useRef<SpreadDataPoint[]>([]);

  // Record a new snapshot each time opportunities change
  useEffect(() => {
    if (!opportunities || opportunities.length === 0) return;
    const now = Date.now();
    const newPoints: SpreadDataPoint[] = opportunities.map(opp => ({
      timestamp: now,
      symbol: opp.symbol,
      spread: opp.spread,
      type: opp.type,
      buySource: opp.buySource,
      sellSource: opp.sellSource,
      volume: opp.volume24h || 0
    }));

    spreadHistoryRef.current = [
      ...spreadHistoryRef.current,
      ...newPoints
    ].filter(p => p.timestamp > now - 6 * 60 * 60 * 1000); // Keep last 6h
  }, [opportunities]);

  // Auto-select first 3 symbols if none selected
  useEffect(() => {
    if (selectedSymbols.length === 0 && opportunities.length > 0) {
      const uniqueSyms = Array.from(new Set(opportunities.map(o => o.symbol)));
      setSelectedSymbols(uniqueSyms.slice(0, 3));
    }
  }, [opportunities, selectedSymbols.length]);

  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(opportunities.map(opp => opp.symbol)));
  }, [opportunities]);

  // Build current spread data from real opportunities
  const currentSpreads = useMemo(() => {
    return opportunities
      .filter(opp => {
        const symbolMatch = selectedSymbols.length === 0 || selectedSymbols.includes(opp.symbol);
        const typeMatch = selectedType === 'all' || opp.type === selectedType;
        return symbolMatch && typeMatch;
      })
      .map(opp => ({
        symbol: opp.symbol,
        spread: opp.spread,
        type: opp.type,
        buySource: opp.buySource,
        sellSource: opp.sellSource,
        change: 0,
        changePercent: 0
      }));
  }, [opportunities, selectedSymbols, selectedType]);

  // Use accumulated history for chart
  const chartData = useMemo(() => {
    const history = spreadHistoryRef.current;
    const grouped: { [symbol: string]: SpreadDataPoint[] } = {};
    const filtered = history.filter(p => {
      const symbolMatch = selectedSymbols.length === 0 || selectedSymbols.includes(p.symbol);
      const typeMatch = selectedType === 'all' || p.type === selectedType;
      return symbolMatch && typeMatch;
    });

    filtered.forEach(point => {
      if (!grouped[point.symbol]) {
        grouped[point.symbol] = [];
      }
      grouped[point.symbol].push(point);
    });
    return grouped;
  }, [selectedSymbols, selectedType, opportunities]); // Re-compute when opportunities update

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const getSymbolColor = (symbol: string, index: number) => {
    const colors = [
      'text-orange-400 border-orange-400',
      'text-blue-400 border-blue-400',
      'text-green-400 border-green-400',
      'text-purple-400 border-purple-400',
      'text-cyan-400 border-cyan-400',
      'text-pink-400 border-pink-400',
      'text-yellow-400 border-yellow-400',
      'text-red-400 border-red-400',
    ];
    return colors[index % colors.length];
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simple SVG line chart
  const renderChart = () => {
    const width = 100;
    const height = 200;
    const symbols = Object.keys(chartData);

    if (symbols.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Waiting for spread data...</p>
            <p className="text-xs text-gray-500 mt-1">
              Spread history accumulates as the scanner runs. Check back shortly.
            </p>
          </div>
        </div>
      );
    }

    const allPoints = Object.values(chartData).flat();
    if (allPoints.length < 2) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Collecting spread snapshots...</p>
            <p className="text-xs text-gray-500 mt-1">
              The chart will populate as more data points are collected over time.
            </p>
          </div>
        </div>
      );
    }

    const minSpread = Math.min(...allPoints.map(p => p.spread));
    const maxSpread = Math.max(...allPoints.map(p => p.spread));
    const minTime = Math.min(...allPoints.map(p => p.timestamp));
    const maxTime = Math.max(...allPoints.map(p => p.timestamp));

    const spreadRange = maxSpread - minSpread || 1;
    const timeRange = maxTime - minTime || 1;

    return (
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y * height / 100}
              x2={width}
              y2={y * height / 100}
              stroke="rgba(75, 85, 99, 0.3)"
              strokeWidth="0.5"
            />
          ))}

          {/* Chart lines for each symbol */}
          {symbols.map((symbol, symbolIndex) => {
            const points = chartData[symbol] || [];
            if (points.length < 2) return null;

            // Sort by time
            const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);

            const pathData = sorted.map((point, index) => {
              const x = ((point.timestamp - minTime) / timeRange) * width;
              const y = height - ((point.spread - minSpread) / spreadRange) * height;
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');

            const colorClass = getSymbolColor(symbol, symbolIndex);
            const strokeColor = colorClass.includes('orange') ? '#fb923c' :
                              colorClass.includes('blue') ? '#60a5fa' :
                              colorClass.includes('green') ? '#4ade80' :
                              colorClass.includes('purple') ? '#a78bfa' :
                              colorClass.includes('cyan') ? '#22d3ee' :
                              colorClass.includes('pink') ? '#f472b6' :
                              colorClass.includes('yellow') ? '#facc15' : '#f87171';

            return (
              <g key={symbol}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2"
                  opacity="0.8"
                />
                {sorted.map((point, index) => {
                  const x = ((point.timestamp - minTime) / timeRange) * width;
                  const y = height - ((point.spread - minSpread) / spreadRange) * height;

                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill={strokeColor}
                      opacity="0.9"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-12">
          <span>{maxSpread.toFixed(1)}%</span>
          <span>{((maxSpread + minSpread) / 2).toFixed(1)}%</span>
          <span>{minSpread.toFixed(1)}%</span>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {minTime && maxTime && (
            <>
              <span>{formatTime(minTime)}</span>
              <span>{formatTime(maxTime)}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Type:</span>
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'ordinals', label: 'Ordinals' },
              { key: 'runes', label: 'Runes' },
              { key: 'tokens', label: 'Tokens' }
            ].map(type => (
              <Button
                key={type.key}
                size="sm"
                variant={selectedType === type.key ? 'default' : 'outline'}
                className={selectedType === type.key ? 'bg-purple-600' : 'border-gray-600 hover:border-purple-500'}
                onClick={() => setSelectedType(type.key)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Selection */}
      <Card className="bg-gray-800/50 border-gray-600">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm">Assets for Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueSymbols.length === 0 ? (
            <p className="text-gray-500 text-sm">No assets available. Waiting for arbitrage opportunities...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {uniqueSymbols.map((symbol, index) => {
                const isSelected = selectedSymbols.includes(symbol);
                const colorClass = getSymbolColor(symbol, index);

                return (
                  <Button
                    key={symbol}
                    size="sm"
                    variant="outline"
                    className={`${isSelected ? colorClass : 'border-gray-600 text-gray-400'} transition-colors`}
                    onClick={() => toggleSymbol(symbol)}
                  >
                    {isSelected ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {symbol}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="bg-black/50 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Spread Evolution (Real-Time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pl-12">
            {renderChart()}
          </div>
        </CardContent>
      </Card>

      {/* Current Spread Stats */}
      {currentSpreads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentSpreads.slice(0, 6).map((stat, index) => {
            const colorClass = getSymbolColor(stat.symbol, index);

            return (
              <Card key={`${stat.symbol}-${stat.buySource}`} className="bg-gray-800/50 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${
                        stat.type === 'ordinals' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                        stat.type === 'runes' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
                        'bg-blue-500/20 border-blue-500 text-blue-400'
                      } border text-xs`}>
                        {stat.type.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-white">{stat.symbol}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-white">
                      {stat.spread.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {stat.buySource} → {stat.sellSource}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
