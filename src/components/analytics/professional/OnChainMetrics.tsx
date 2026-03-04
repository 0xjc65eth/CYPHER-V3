'use client'

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  DollarSign,
  BarChart3,
  LineChart as LineChartIcon,
  Info,
  Wallet,
  Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Legend } from 'recharts';
import { useOnChainMetrics } from '@/hooks/analytics/useOnChainMetrics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  interpretation: 'bullish' | 'bearish' | 'neutral';
  description: string;
  confidence: number;
  historicalData: Array<{ date: string; value: number }>
  thresholds: {
    overheated: number;
    bullish: number;
    neutral: [number, number];
    bearish: number;
    oversold: number;
  };
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  interpretation,
  description,
  confidence,
  historicalData,
  thresholds,
  icon
}) => {
  const getInterpretationColor = () => {
    switch (interpretation) {
      case 'bullish': return 'text-green-500';
      case 'bearish': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getZoneColor = (value: number) => {
    if (value >= thresholds.overheated) return '#ef4444';
    if (value >= thresholds.bullish) return '#10b981';
    if (value >= thresholds.neutral[0] && value <= thresholds.neutral[1]) return '#f59e0b';
    if (value <= thresholds.oversold) return '#3b82f6';
    return '#ef4444';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">
                  {value.toFixed(2)}
                </span>
                <Badge 
                  variant={change >= 0 ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
          <Badge className={cn('capitalize', getInterpretationColor())}>
            {interpretation}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getZoneColor(value)} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getZoneColor(value)} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  hide 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                {/* Reference areas for zones */}
                <ReferenceArea 
                  y1={thresholds.overheated} 
                  y2={100} 
                  fill="#ef4444" 
                  fillOpacity={0.1} 
                />
                <ReferenceArea 
                  y1={thresholds.bullish} 
                  y2={thresholds.overheated} 
                  fill="#10b981" 
                  fillOpacity={0.1} 
                />
                <ReferenceArea 
                  y1={thresholds.neutral[0]} 
                  y2={thresholds.neutral[1]} 
                  fill="#f59e0b" 
                  fillOpacity={0.1} 
                />
                <ReferenceArea 
                  y1={0} 
                  y2={thresholds.oversold} 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getZoneColor(value)}
                  fillOpacity={1}
                  fill={`url(#gradient-${title})`}
                  strokeWidth={2}
                />
                <ReferenceLine 
                  y={value} 
                  stroke={getZoneColor(value)} 
                  strokeDasharray="3 3" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interpretation */}
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {description}
            </AlertDescription>
          </Alert>

          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence Score</span>
              <span className="font-medium">{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-2" />
          </div>

          {/* Zone Indicators */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            <div className="text-center">
              <div className="h-2 bg-blue-500 rounded mb-1" />
              <span className="text-muted-foreground">Oversold</span>
            </div>
            <div className="text-center">
              <div className="h-2 bg-red-500 rounded mb-1" />
              <span className="text-muted-foreground">Bearish</span>
            </div>
            <div className="text-center">
              <div className="h-2 bg-yellow-500 rounded mb-1" />
              <span className="text-muted-foreground">Neutral</span>
            </div>
            <div className="text-center">
              <div className="h-2 bg-green-500 rounded mb-1" />
              <span className="text-muted-foreground">Bullish</span>
            </div>
            <div className="text-center">
              <div className="h-2 bg-red-600 rounded mb-1" />
              <span className="text-muted-foreground">Overheated</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function OnChainMetrics() {
  const { metrics, loading, error } = useOnChainMetrics();

  const overallSentiment = useMemo(() => {
    if (!metrics) return 'neutral';
    
    const sentiments = [
      metrics.sopr.interpretation,
      metrics.nupl.interpretation,
      metrics.mvrv.interpretation,
      metrics.puellMultiple.interpretation
    ];
    
    const bullishCount = sentiments.filter(s => s === 'bullish').length;
    const bearishCount = sentiments.filter(s => s === 'bearish').length;
    
    if (bullishCount > bearishCount + 1) return 'bullish';
    if (bearishCount > bullishCount + 1) return 'bearish';
    return 'neutral';
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading on-chain metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load on-chain metrics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Market Sentiment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Market Sentiment</CardTitle>
            <Badge 
              variant="outline" 
              className={cn(
                'text-lg px-4 py-1',
                overallSentiment === 'bullish' && 'text-green-500 border-green-500',
                overallSentiment === 'bearish' && 'text-red-500 border-red-500',
                overallSentiment === 'neutral' && 'text-yellow-500 border-yellow-500'
              )}
            >
              {overallSentiment.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricCard
          title="SOPR (Spent Output Profit Ratio)"
          value={metrics.sopr.value}
          change={metrics.sopr.change}
          interpretation={metrics.sopr.interpretation}
          description={metrics.sopr.description}
          confidence={metrics.sopr.confidence}
          historicalData={metrics.sopr.historicalData}
          thresholds={metrics.sopr.thresholds}
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />

        <MetricCard
          title="NUPL (Net Unrealized Profit/Loss)"
          value={metrics.nupl.value}
          change={metrics.nupl.change}
          interpretation={metrics.nupl.interpretation}
          description={metrics.nupl.description}
          confidence={metrics.nupl.confidence}
          historicalData={metrics.nupl.historicalData}
          thresholds={metrics.nupl.thresholds}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />

        <MetricCard
          title="MVRV (Market Value to Realized Value)"
          value={metrics.mvrv.value}
          change={metrics.mvrv.change}
          interpretation={metrics.mvrv.interpretation}
          description={metrics.mvrv.description}
          confidence={metrics.mvrv.confidence}
          historicalData={metrics.mvrv.historicalData}
          thresholds={metrics.mvrv.thresholds}
          icon={<LineChartIcon className="h-5 w-5 text-primary" />}
        />

        <MetricCard
          title="Puell Multiple"
          value={metrics.puellMultiple.value}
          change={metrics.puellMultiple.change}
          interpretation={metrics.puellMultiple.interpretation}
          description={metrics.puellMultiple.description}
          confidence={metrics.puellMultiple.confidence}
          historicalData={metrics.puellMultiple.historicalData}
          thresholds={metrics.puellMultiple.thresholds}
          icon={<Activity className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Cycle Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Cycle Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.cycleComparison}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="days" label={{ value: 'Days from Cycle Start', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Price (Normalized)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="current" stroke="#8b5cf6" strokeWidth={3} name="Current Cycle" />
                <Line type="monotone" dataKey="2017" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="2017 Cycle" />
                <Line type="monotone" dataKey="2013" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="2013 Cycle" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock-to-Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Stock-to-Flow Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.stockToFlow}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="model" 
                    stroke="#6366f1" 
                    fill="#6366f1"
                    fillOpacity={0.3}
                    name="S2F Model"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="Actual Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model Deviation</span>
                <span className={cn(
                  "text-sm font-bold",
                  metrics.stockToFlowDeviation > 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {metrics.stockToFlowDeviation > 0 ? '+' : ''}{metrics.stockToFlowDeviation}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reserve Risk & Thermocap */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Risk Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Reserve Risk */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Reserve Risk</span>
                  <Badge className={cn(
                    metrics.reserveRisk < 0.002 && 'bg-green-500',
                    metrics.reserveRisk >= 0.002 && metrics.reserveRisk < 0.01 && 'bg-yellow-500',
                    metrics.reserveRisk >= 0.01 && 'bg-red-500'
                  )}>
                    {metrics.reserveRisk < 0.002 ? 'Low' : metrics.reserveRisk < 0.01 ? 'Medium' : 'High'}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min(metrics.reserveRisk * 10000, 100)} 
                  className="h-2"
                />
              </div>

              {/* Thermocap Ratio */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Thermocap Ratio</span>
                  <span className="text-sm font-bold">{metrics.thermocapRatio.toFixed(6)}</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
                  <div 
                    className="absolute h-4 w-1 bg-white -mt-1 rounded" 
                    style={{ left: `${Math.min(metrics.thermocapRatio * 100000, 100)}%` }}
                  />
                </div>
              </div>

              {/* Entity-Adjusted Dormancy */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Entity-Adjusted Dormancy</span>
                  <span className="text-sm font-bold">{metrics.dormancyFlow.toFixed(2)}</span>
                </div>
                <Progress 
                  value={Math.min(metrics.dormancyFlow * 20, 100)} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}