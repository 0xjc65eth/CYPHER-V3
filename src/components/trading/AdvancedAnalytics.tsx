/**
 * 📊 ADVANCED ANALYTICS DASHBOARD - Professional Trading Analytics
 * Features: Performance Metrics, Risk Analysis, Strategy Backtesting, AI Insights
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ComposedChart } from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Shield, Brain,
  BarChart3, PieChart as PieChartIcon, Activity,
  Zap, AlertTriangle, CheckCircle, Star
} from 'lucide-react';

// Analytics Interfaces
interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

interface RiskMetrics {
  var95: number;
  cvar95: number;
  beta: number;
  alpha: number;
  correlation: number;
  tracking_error: number;
  information_ratio: number;
  treynor_ratio: number;
}

// Sample data generation
const generatePerformanceData = (days: number) => {
  const data: any[] = [];
  let value = 100000;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    const dailyReturn = Math.sin(i * 0.3) * 0.01; // Deterministic pattern
    value *= (1 + dailyReturn);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
      return: dailyReturn * 100,
      benchmark: 100000 * Math.pow(1.08, i / 365), // 8% annual benchmark
      drawdown: Math.max(0, (Math.max(...data.map(d => d.value), value) - value) / Math.max(...data.map(d => d.value), value) * 100)
    });
  }
  
  return data;
};

const performanceData = generatePerformanceData(252); // 1 year of data

/**
 * 📈 Performance Chart Component
 */
const PerformanceChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1Y');
  const [chartType, setChartType] = useState('cumulative');

  const filteredData = useMemo(() => {
    const days = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 252;
    return performanceData.slice(-days);
  }, [timeframe]);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Performance</CardTitle>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <option value="1M">1M</option>
              <option value="3M">3M</option>
              <option value="6M">6M</option>
              <option value="1Y">1Y</option>
            </Select>
            <Select value={chartType} onValueChange={setChartType}>
              <option value="cumulative">Cumulative</option>
              <option value="daily">Daily Returns</option>
              <option value="drawdown">Drawdown</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'cumulative' ? (
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.1}
                name="Portfolio Value"
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#82ca9d"
                strokeDasharray="5 5"
                name="Benchmark"
                dot={false}
              />
            </ComposedChart>
          ) : chartType === 'daily' ? (
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Daily Return']} />
              <Bar dataKey="return" fill="#8884d8" />
            </BarChart>
          ) : (
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Drawdown']} />
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.3}
                name="Drawdown"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * 📊 Risk Metrics Dashboard
 */
const RiskMetricsDashboard: React.FC = () => {
  const metrics: RiskMetrics = {
    var95: 2.1,
    cvar95: 3.2,
    beta: 1.15,
    alpha: 0.08,
    correlation: 0.75,
    tracking_error: 4.2,
    information_ratio: 0.95,
    treynor_ratio: 0.12
  };

  const riskData = [
    { name: 'Low Risk', value: 30, color: '#10b981' },
    { name: 'Medium Risk', value: 45, color: '#f59e0b' },
    { name: 'High Risk', value: 25, color: '#ef4444' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">VaR (95%)</span>
              <span className="font-mono text-sm">{metrics.var95}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CVaR (95%)</span>
              <span className="font-mono text-sm">{metrics.cvar95}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Beta</span>
              <span className="font-mono text-sm">{metrics.beta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Alpha</span>
              <span className="font-mono text-sm">{metrics.alpha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Correlation</span>
              <span className="font-mono text-sm">{metrics.correlation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tracking Error</span>
              <span className="font-mono text-sm">{metrics.tracking_error}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * 🎯 Strategy Performance Component
 */
const StrategyPerformance: React.FC = () => {
  const strategies = [
    {
      name: 'AI Momentum',
      return: 24.5,
      sharpe: 1.85,
      maxDrawdown: 8.2,
      winRate: 67,
      trades: 127,
      status: 'active'
    },
    {
      name: 'Mean Reversion',
      return: 18.3,
      sharpe: 1.42,
      maxDrawdown: 12.1,
      winRate: 58,
      trades: 89,
      status: 'active'
    },
    {
      name: 'Arbitrage Bot',
      return: 15.7,
      sharpe: 2.31,
      maxDrawdown: 3.4,
      winRate: 89,
      trades: 245,
      status: 'paused'
    },
    {
      name: 'Grid Trading',
      return: 12.9,
      sharpe: 1.12,
      maxDrawdown: 15.6,
      winRate: 72,
      trades: 156,
      status: 'active'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Strategy Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Strategy</th>
                <th className="text-right p-3">Return</th>
                <th className="text-right p-3">Sharpe</th>
                <th className="text-right p-3">Max DD</th>
                <th className="text-right p-3">Win Rate</th>
                <th className="text-right p-3">Trades</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{strategy.name}</td>
                  <td className={`p-3 text-right font-mono ${strategy.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {strategy.return > 0 ? '+' : ''}{strategy.return}%
                  </td>
                  <td className="p-3 text-right font-mono">{strategy.sharpe}</td>
                  <td className="p-3 text-right font-mono text-red-500">-{strategy.maxDrawdown}%</td>
                  <td className="p-3 text-right font-mono">{strategy.winRate}%</td>
                  <td className="p-3 text-right font-mono">{strategy.trades}</td>
                  <td className="p-3 text-center">
                    <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                      {strategy.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 🧠 AI Insights Component
 */
const AIInsights: React.FC = () => {
  const insights = [
    {
      type: 'opportunity',
      title: 'High Probability Setup Detected',
      description: 'BTC showing strong momentum with 78% confidence score. Consider increasing allocation.',
      confidence: 78,
      icon: Target,
      color: 'text-green-500'
    },
    {
      type: 'risk',
      title: 'Correlation Risk Alert',
      description: 'Portfolio correlation has increased to 0.85. Consider diversification.',
      confidence: 92,
      icon: AlertTriangle,
      color: 'text-yellow-500'
    },
    {
      type: 'optimization',
      title: 'Portfolio Rebalancing Suggested',
      description: 'AI recommends reducing ETH exposure by 15% and increasing SOL by 8%.',
      confidence: 65,
      icon: Brain,
      color: 'text-blue-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex items-start gap-3">
              <insight.icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">{insight.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * 📊 Main Advanced Analytics Component
 */
const AdvancedAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('performance');

  const performanceMetrics: PerformanceMetrics = {
    totalReturn: 23.7,
    annualizedReturn: 18.4,
    volatility: 15.2,
    sharpeRatio: 1.68,
    sortinoRatio: 2.34,
    calmarRatio: 1.42,
    maxDrawdown: 12.8,
    winRate: 64.5,
    profitFactor: 1.87,
    averageWin: 2.3,
    averageLoss: -1.2,
    largestWin: 8.7,
    largestLoss: -4.2,
    consecutiveWins: 7,
    consecutiveLosses: 3
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Return</p>
                <p className="text-xl font-bold text-green-500">+{performanceMetrics.totalReturn}%</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sharpe Ratio</p>
                <p className="text-xl font-bold">{performanceMetrics.sharpeRatio}</p>
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Max Drawdown</p>
                <p className="text-xl font-bold text-red-500">-{performanceMetrics.maxDrawdown}%</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{performanceMetrics.winRate}%</p>
              </div>
              <Target className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <PerformanceChart />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annualized Return</span>
                    <span className="font-mono text-sm">{performanceMetrics.annualizedReturn}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Volatility</span>
                    <span className="font-mono text-sm">{performanceMetrics.volatility}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sortino Ratio</span>
                    <span className="font-mono text-sm">{performanceMetrics.sortinoRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Calmar Ratio</span>
                    <span className="font-mono text-sm">{performanceMetrics.calmarRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Profit Factor</span>
                    <span className="font-mono text-sm">{performanceMetrics.profitFactor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Win</span>
                    <span className="font-mono text-sm text-green-500">+{performanceMetrics.averageWin}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Loss</span>
                    <span className="font-mono text-sm text-red-500">{performanceMetrics.averageLoss}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <RiskMetricsDashboard />
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <StrategyPerformance />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <AIInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;