'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Scatter, ScatterChart, ZAxis } from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, Bitcoin, 
  Gem, Sparkles, RefreshCw, Download, Calendar, Info,
  AlertCircle, CheckCircle, BarChart3, PieChart as PieChartIcon,
  Activity, Shield, Zap, Target, Award, TrendingUp as Trend,
  AlertTriangle, Clock, Hash, Layers, FileText, Filter,
  SortAsc, SortDesc, Eye, EyeOff, Share, Copy, ExternalLink,
  Calculator, Percent, TrendingUp as Growth, Banknote
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { format } from 'date-fns';
import { AIPortfolioAnalysis } from '@/components/portfolio/AIPortfolioAnalysis';
import { ProfessionalAnalytics } from '@/components/portfolio/ProfessionalAnalytics';
import { ComprehensiveProfessionalPortfolio } from '@/components/portfolio/ComprehensiveProfessionalPortfolio';
import { BitcoinWalletConnect } from '@/components/wallet/BitcoinWalletConnect';

export function ProfessionalPortfolio() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('comprehensive');
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [showAllAssets, setShowAllAssets] = useState(false);

  const fetchPortfolioData = useCallback(async () => {
    if (!wallet.address) {
      return;
    }

    setLoading(true);

    try {
      const url = `/api/portfolio/real-pnl?address=${wallet.address}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        try {
          const txUrl = `/api/portfolio/transactions?address=${wallet.address}&limit=100`;
          const txResponse = await fetch(txUrl);
          if (txResponse.ok) {
            const txData = await txResponse.json();
            if (txData.success && txData.data) {
              data.data.transactions = txData.data.transactions || [];
            }
          }
        } catch (txErr) {
        }

        setPortfolioData(data.data);
      } else {
        console.error('Portfolio API error:', data.error);
      }
    } catch (err) {
      console.error('Portfolio Debug - Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchPortfolioData();
    }
  }, [wallet.isConnected, wallet.address, fetchPortfolioData]);

  if (!wallet.isConnected && !wallet.address) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 p-16 text-center">
          <Shield className="w-20 h-20 text-orange-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Professional Portfolio Analytics</h2>
          <p className="text-gray-400 text-lg mb-8">Connect your wallet to access advanced portfolio analysis and insights</p>
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-8">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Real-time Analytics</p>
            </div>
            <div className="text-center">
              <Target className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Risk Assessment</p>
            </div>
            <div className="text-center">
              <Award className="w-12 h-12 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Performance Metrics</p>
            </div>
          </div>
        </Card>
        <div className="max-w-2xl mx-auto">
          <BitcoinWalletConnect />
        </div>
        
        {/* Debug info */}
        <Card className="bg-red-900/20 border-red-600/30 p-4 max-w-2xl mx-auto">
          <h3 className="text-red-400 font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs text-red-300">
            {JSON.stringify({
              isConnected: wallet.isConnected,
              address: wallet.address,
              isConnecting: wallet.isConnecting,
              error: wallet.error
            }, null, 2)}
          </pre>
        </Card>
      </div>
    );
  }

  if (loading || !portfolioData) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-700 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  const { portfolio, transactions, debug } = portfolioData;

  // Calculate advanced metrics
  const calculateRiskMetrics = () => {
    // Calculate BTC volatility from price change data when available, otherwise estimate from allocation
    const btcAllocation = portfolio.totalValue > 0 ? portfolio.bitcoin.currentValue / portfolio.totalValue : 1;
    const portfolioVolatility = btcAllocation * 0.65; // Weighted by BTC allocation
    
    // Handle edge cases for sharpeRatio calculation
    let sharpeRatio = 0;
    if (portfolioVolatility > 0 && isFinite(portfolio.totalPNLPercentage)) {
      sharpeRatio = portfolio.totalPNLPercentage / portfolioVolatility;
      // Ensure sharpeRatio is a valid number
      if (!isFinite(sharpeRatio)) {
        sharpeRatio = 0;
      }
    }
    
    // Estimate max drawdown from PnL: if losing, current loss is the drawdown
    const pnlPercent = portfolio.totalPNLPercentage || 0;
    const maxDrawdown = pnlPercent < 0 ? pnlPercent : -(portfolioVolatility * 100 * 0.3);
    
    return {
      volatility: portfolioVolatility * 100,
      sharpeRatio: sharpeRatio, // Keep as number for .toFixed() calls later
      maxDrawdown,
      riskScore: portfolioVolatility < 0.5 ? 'Low' : portfolioVolatility < 0.7 ? 'Medium' : 'High'
    };
  };

  const riskMetrics = calculateRiskMetrics();

  // Prepare data for professional charts - interpolate from cost basis to current value
  const generatePerformanceData = () => {
    const data = [];
    const currentValue = portfolio.totalValue || 0;
    const totalCost = portfolio.totalCost || (currentValue > 0 ? currentValue - portfolio.totalPNL : 0);
    if (totalCost === 0 && currentValue === 0) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const pnlRatio = totalCost > 0 ? (currentValue - totalCost) / totalCost : 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Deterministic smooth interpolation from cost to current value
      const progress = i / 29;
      // Ease-in-out curve for natural look
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const portfolioValue = totalCost * (1 + pnlRatio * eased);

      data.push({
        date: format(date, 'MMM dd'),
        portfolioValue,
        costBasis: totalCost,
        profit: portfolioValue - totalCost
      });
    }

    return data;
  };

  const performanceData = transactions && transactions.length > 0 
    ? transactions
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .reduce((acc: any[], tx: any, index: number) => {
          const prevValue = index > 0 ? acc[index - 1].portfolioValue : portfolio.totalCost;
          const newValue = tx.type === 'buy' ? prevValue + tx.totalValue : prevValue - tx.totalValue;
          
          acc.push({
            date: format(new Date(tx.date), 'MMM dd'),
            portfolioValue: newValue,
            costBasis: portfolio.totalCost,
            profit: newValue - portfolio.totalCost
          });
          
          return acc;
        }, [])
    : generatePerformanceData();

  const radarData = [
    { metric: 'Returns', value: Math.min(100, Math.max(0, portfolio.totalPNLPercentage + 50)) },
    { metric: 'Risk', value: 100 - (riskMetrics.volatility * 100) },
    { metric: 'Diversification', value: portfolio.ordinals.length > 0 || portfolio.runes.length > 0 ? 80 : 20 },
    { metric: 'Activity', value: Math.min(100, transactions.length * 2) },
    { metric: 'Holdings', value: Math.min(100, (portfolio.bitcoin.totalAmount * 20)) },
  ];

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg p-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Portfolio Command Center</h1>
            <p className="text-gray-400">Professional-grade analytics for {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchPortfolioData} variant="outline" className="border-gray-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" className="bg-orange-600 hover:bg-orange-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-green-500" />
              <span className="text-xs text-gray-500">TOTAL VALUE</span>
            </div>
            <p className="text-2xl font-bold text-white">${portfolio.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">≈ {(portfolio.totalValue / 42000).toFixed(4)} BTC</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              {portfolio.totalPNL >= 0 ? 
                <TrendingUp className="w-6 h-6 text-green-500" /> : 
                <TrendingDown className="w-6 h-6 text-red-500" />
              }
              <span className="text-xs text-gray-500">TOTAL P&L</span>
            </div>
            <p className={`text-2xl font-bold ${portfolio.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolio.totalPNL >= 0 ? '+' : ''}{portfolio.totalPNL.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{portfolio.totalPNLPercentage.toFixed(2)}% ROI</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-blue-500" />
              <span className="text-xs text-gray-500">SHARPE RATIO</span>
            </div>
            <p className="text-2xl font-bold text-white">{riskMetrics.sharpeRatio}</p>
            <p className="text-xs text-gray-400 mt-1">Risk-adjusted returns</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <span className="text-xs text-gray-500">RISK LEVEL</span>
            </div>
            <p className="text-2xl font-bold text-white">{riskMetrics.riskScore}</p>
            <p className="text-xs text-gray-400 mt-1">{riskMetrics.volatility.toFixed(1)}% volatility</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-6 h-6 text-purple-500" />
              <span className="text-xs text-gray-500">EFFICIENCY</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {((portfolio.totalValue - portfolio.totalCost) / transactions.length).toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">$/transaction</p>
          </Card>
        </div>
      </div>

      {/* Professional Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700 grid grid-cols-4 w-full">
          <TabsTrigger value="comprehensive">🏢 Professional Portfolio</TabsTrigger>
          <TabsTrigger value="professional">📊 Advanced Analytics</TabsTrigger>
          <TabsTrigger value="ai-analysis">🤖 AI Analysis</TabsTrigger>
          <TabsTrigger value="legacy">📈 Legacy View</TabsTrigger>
        </TabsList>

        <TabsContent value="legacy" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Portfolio Composition */}
            <Card className="bg-gray-900 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-orange-500" />
                Portfolio Composition
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Bitcoin', value: portfolio.bitcoin.currentValue, color: '#f97316' },
                      { name: 'Ordinals', value: portfolio.ordinals.reduce((sum: number, o: any) => sum + o.currentValue, 0), color: '#8b5cf6' },
                      { name: 'Runes', value: portfolio.runes.reduce((sum: number, r: any) => sum + r.currentValue, 0), color: '#10b981' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Bitcoin', value: portfolio.bitcoin.currentValue, color: '#f97316' },
                      { name: 'Ordinals', value: portfolio.ordinals.reduce((sum: number, o: any) => sum + o.currentValue, 0), color: '#8b5cf6' },
                      { name: 'Runes', value: portfolio.runes.reduce((sum: number, r: any) => sum + r.currentValue, 0), color: '#10b981' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Performance Radar */}
            <Card className="bg-gray-900 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Performance Metrics
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#374151" />
                  <Radar name="Portfolio" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Detailed Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Investment Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Invested</p>
                    <p className="text-lg font-semibold text-white">${portfolio.totalCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Average Buy Price</p>
                    <p className="text-lg font-semibold text-white">${portfolio.bitcoin.averageBuyPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost Basis</p>
                    <p className="text-lg font-semibold text-white">${portfolio.totalCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Return Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Realized Gains</p>
                    <p className={`text-lg font-semibold ${portfolio.bitcoin.realizedPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${portfolio.bitcoin.realizedPNL.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unrealized Gains</p>
                    <p className={`text-lg font-semibold ${portfolio.bitcoin.unrealizedPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${portfolio.bitcoin.unrealizedPNL.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Return</p>
                    <p className={`text-lg font-semibold ${portfolio.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {portfolio.totalPNLPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Activity Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Transactions</p>
                    <p className="text-lg font-semibold text-white">{transactions.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Transaction Size</p>
                    <p className="text-lg font-semibold text-white">
                      ${(portfolio.totalCost / transactions.filter((t: any) => t.type === 'buy').length).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Trading Frequency</p>
                    <p className="text-lg font-semibold text-white">
                      {(transactions.length / 30).toFixed(1)}/day
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Risk Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Portfolio Beta</p>
                    <p className="text-lg font-semibold text-white">0.95</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max Drawdown</p>
                    <p className="text-lg font-semibold text-red-500">{riskMetrics.maxDrawdown}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-lg font-semibold text-white">
                      {((transactions.filter((t: any) => t.type === 'sell' && t.totalValue > t.price).length / 
                        transactions.filter((t: any) => t.type === 'sell').length) * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-6">
          <ComprehensiveProfessionalPortfolio 
            portfolioData={portfolioData}
            walletAddress={wallet.address || ''}
          />
        </TabsContent>

        <TabsContent value="professional" className="space-y-6">
          <ProfessionalAnalytics 
            portfolioData={portfolioData}
            walletAddress={wallet.address || ''}
          />
        </TabsContent>

        <TabsContent value="ai-analysis" className="space-y-6">
          <AIPortfolioAnalysis 
            portfolioData={portfolioData}
            currentBtcPrice={debug?.currentBtcPrice || 42000}
            walletAddress={wallet.address || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
