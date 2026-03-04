'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, ComposedChart, ReferenceLine, Brush, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import RechartsChart from '@/components/charts/RechartsChart';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, CheckCircle, Info, Zap, Target, Shield, Activity, Clock,
  Brain, Cpu, Eye, Bell, Calendar, Filter, Download, Settings, RefreshCw,
  ArrowUpRight, ArrowDownRight, Percent, Calculator, Award, Hash
} from 'lucide-react';
import { format, subDays, startOfDay, addDays } from 'date-fns';
import { Portfolio, PortfolioMetrics, RiskAnalysis, AIInsight } from '@/types/portfolio';
import { AIAnalysisEngine } from '@/lib/services/AIAnalysisEngine';
import { PortfolioExporter } from '@/lib/services/PortfolioExporter';

interface ProfessionalAnalyticsProps {
  portfolio: Portfolio | null;
  walletAddress?: string;
  className?: string;
}

// Color schemes for different risk levels
const riskColors = {
  low: '#10b981',
  medium: '#f59e0b', 
  high: '#ef4444',
  very_high: '#dc2626'
};

const chartColors = {
  primary: '#f97316',
  secondary: '#8b5cf6', 
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  muted: '#6b7280'
};

export function ProfessionalAnalytics({ portfolio, walletAddress, className = '' }: ProfessionalAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  
  const aiEngine = useMemo(() => new AIAnalysisEngine(), []);
  const exporter = useMemo(() => new PortfolioExporter(), []);

  // Calculate advanced risk metrics
  const calculateRiskMetrics = useMemo(() => {
    if (!portfolio?.performanceHistory || portfolio.performanceHistory.length < 2) {
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        valueAtRisk: 0,
        beta: 0,
        calmarRatio: 0,
        treynorRatio: 0,
        informationRatio: 0
      };
    }

    const returns = portfolio.performanceHistory.map((d, i) => {
      if (i === 0) return 0;
      const prevValue = portfolio.performanceHistory[i - 1].totalValue;
      return prevValue > 0 ? (d.totalValue - prevValue) / prevValue : 0;
    });

    // Remove first zero return
    returns.shift();

    // Risk-free rate (annual)
    const riskFreeRate = 0.05;
    const periodsPerYear = 365;
    const dailyRiskFree = riskFreeRate / periodsPerYear;

    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Sharpe Ratio
    const sharpeRatio = stdDev > 0 ? ((avgReturn - dailyRiskFree) * Math.sqrt(periodsPerYear)) / (stdDev * Math.sqrt(periodsPerYear)) : 0;

    // Sortino Ratio (only downside deviation)
    const downsideReturns = returns.filter(r => r < dailyRiskFree);
    const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r - dailyRiskFree, 2), 0) / downsideReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? ((avgReturn - dailyRiskFree) * Math.sqrt(periodsPerYear)) / (downsideDeviation * Math.sqrt(periodsPerYear)) : 0;

    // Maximum Drawdown
    let peak = portfolio.performanceHistory[0].totalValue;
    let maxDrawdown = 0;
    portfolio.performanceHistory.forEach(point => {
      if (point.totalValue > peak) peak = point.totalValue;
      const drawdown = peak > 0 ? (peak - point.totalValue) / peak : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Value at Risk (95% confidence)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const valueAtRisk = Math.abs(sortedReturns[varIndex] || 0) * 100;

    // Beta (simplified - would need market returns for accurate calculation)
    const beta = stdDev > 0 ? stdDev / 0.02 : 1; // Assuming market volatility of 2%

    // Calmar Ratio
    const annualizedReturn = avgReturn * periodsPerYear;
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    // Treynor Ratio
    const treynorRatio = beta > 0 ? (annualizedReturn - riskFreeRate) / beta : 0;

    // Information Ratio (simplified)
    const trackingError = stdDev * Math.sqrt(periodsPerYear);
    const informationRatio = trackingError > 0 ? (annualizedReturn - riskFreeRate) / trackingError : 0;

    return {
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      valueAtRisk: Math.round(valueAtRisk * 100) / 100,
      beta: Math.round(beta * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      treynorRatio: Math.round(treynorRatio * 100) / 100,
      informationRatio: Math.round(informationRatio * 100) / 100
    };
  }, [portfolio]);

  // Generate AI insights
  const aiInsights = useMemo(() => {
    if (!portfolio) return [];
    return aiEngine.generateInsights(portfolio);
  }, [portfolio, aiEngine]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!portfolio) return;
    
    setLoading(true);
    try {
      if (exportFormat === 'csv') {
        await exporter.exportToCSV(portfolio);
      } else {
        await exporter.exportToPDF(portfolio);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setLoading(false);
  }, [portfolio, exportFormat, exporter]);

  if (!portfolio) {
    return (
      <Card className={`bg-gray-900 border-gray-700 p-12 text-center ${className}`}>
        <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Professional Analytics</h2>
        <p className="text-gray-400">Connect your wallet to access advanced portfolio analytics</p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Professional Portfolio Analytics
              <Badge variant="outline" className="text-orange-400 border-orange-600">
                AI-Powered
              </Badge>
            </h1>
            <p className="text-gray-400 mt-2">
              Advanced risk metrics • ML insights • Professional reporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={exportFormat} onValueChange={(v: 'csv' | 'pdf') => setExportFormat(v)}>
              <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">SHARPE</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.sharpeRatio}</p>
            <p className="text-xs text-gray-400">Risk-adjusted</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">SORTINO</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.sortinoRatio}</p>
            <p className="text-xs text-gray-400">Downside risk</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">MAX DD</span>
            </div>
            <p className="text-lg font-bold text-red-400">-{calculateRiskMetrics.maxDrawdown}%</p>
            <p className="text-xs text-gray-400">Maximum loss</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">VaR 95%</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.valueAtRisk}%</p>
            <p className="text-xs text-gray-400">Daily risk</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">BETA</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.beta}</p>
            <p className="text-xs text-gray-400">Market corr</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Award className="w-4 h-4 text-pink-500" />
              <span className="text-xs text-gray-500">CALMAR</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.calmarRatio}</p>
            <p className="text-xs text-gray-400">Return/DD</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-gray-500">TREYNOR</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.treynorRatio}</p>
            <p className="text-xs text-gray-400">Excess return</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <Brain className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-gray-500">INFO</span>
            </div>
            <p className="text-lg font-bold text-white">{calculateRiskMetrics.informationRatio}</p>
            <p className="text-xs text-gray-400">Active return</p>
          </Card>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700 grid grid-cols-4 w-full">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="analysis">🔍 Detailed Analysis</TabsTrigger>
          <TabsTrigger value="history">📈 History</TabsTrigger>
          <TabsTrigger value="projections">🔮 Projections</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <Card className="lg:col-span-2 bg-gray-900 border-gray-700 p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center justify-between">
                  <span>Portfolio Performance</span>
                  <div className="flex gap-2">
                    {['7d', '30d', '90d', '1y'].map(tf => (
                      <Button
                        key={tf}
                        variant={timeframe === tf ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeframe(tf)}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {portfolio.performanceHistory && portfolio.performanceHistory.length > 0 ? (
                  <RechartsChart
                    type="area"
                    data={portfolio.performanceHistory
                      .slice(-(timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365))
                      .map(item => ({
                        time: item.date,
                        value: item.totalValue,
                        volume: (item as any).volume || 0
                      }))
                    }
                    config={{
                      height: 300,
                      theme: 'dark',
                      showGrid: true,
                      showCrosshair: true,
                      showTooltip: true,
                      colors: ['#f97316', '#ea580c'],
                      precision: 2,
                      realtime: false
                    }}
                    className="bg-transparent border-0 p-0"
                  />
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Risk Analysis Chart */}
            <Card className="bg-gray-900 border-gray-700 p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-500" />
                  Risk Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {portfolio.riskAnalysis ? (
                  <div className="space-y-4">
                    {/* Risk visualization with professional chart */}
                    <RechartsChart
                      type="bar"
                      data={[
                        { time: 'Volatility', value: portfolio.riskAnalysis.volatilityRisk * 20 },
                        { time: 'Concentration', value: portfolio.riskAnalysis.concentrationRisk * 20 },
                        { time: 'Liquidity', value: portfolio.riskAnalysis.liquidityRisk * 20 },
                        { time: 'Correlation', value: portfolio.riskAnalysis.correlationRisk * 20 },
                        { time: 'Market', value: portfolio.riskAnalysis.marketRisk * 20 }
                      ]}
                      config={{
                        height: 200,
                        theme: 'dark',
                        showGrid: false,
                        showCrosshair: true,
                        showTooltip: true,
                        colors: ['#f59e0b', '#d97706'],
                        precision: 1,
                        realtime: false
                      }}
                      className="bg-transparent border-0 p-0"
                    />
                    
                    {/* Risk score summary */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Overall Risk Score</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            portfolio.riskAnalysis.overallRiskScore < 3 ? 'text-green-400 border-green-600' :
                            portfolio.riskAnalysis.overallRiskScore < 7 ? 'text-yellow-400 border-yellow-600' :
                            'text-red-400 border-red-600'
                          }`}
                        >
                          {portfolio.riskAnalysis.overallRiskScore}/10
                        </Badge>
                      </div>
                      <Progress 
                        value={portfolio.riskAnalysis.overallRiskScore * 10} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Risk analysis unavailable</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-gray-900 border-gray-700 p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-500" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiInsights.slice(0, 6).map((insight) => (
                  <Alert key={insight.id} className="bg-gray-800 border-gray-700">
                    <div className="flex items-start gap-3">
                      {insight.type === 'opportunity' && <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />}
                      {insight.type === 'risk' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                      {insight.type === 'trend' && <Activity className="w-5 h-5 text-blue-500 mt-0.5" />}
                      {insight.type === 'recommendation' && <Info className="w-5 h-5 text-purple-500 mt-0.5" />}
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-400">{insight.description}</p>
                        {insight.confidence && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Confidence:</span>
                            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                                style={{ width: `${insight.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{insight.confidence}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs truncated for brevity - would include similar structure */}
        <TabsContent value="analysis">
          <div className="text-center py-12">
            <p className="text-gray-400">Detailed analysis coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-12">
            <p className="text-gray-400">Historical analysis coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="projections">
          <div className="text-center py-12">
            <p className="text-gray-400">ML projections coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
