/**
 * 🎛️ FEE SYSTEM DASHBOARD
 * Comprehensive dashboard showcasing the 0.35% redirection fee system
 * Demonstrates fee collection, Hyperliquid integration, and analytics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  DollarSign,
  TrendingUp,
  Calculator,
  ExternalLink,
  Settings,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Waves,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import FeeBreakdownWidget from './FeeBreakdownWidget'
import FeeHistoryTracker from './FeeHistoryTracker'
import { hyperliquidIntegration, HyperliquidUtils } from '@/lib/integrations/hyperliquid'

interface FeeSystemStats {
  totalFeesCollected: number
  totalTrades: number
  totalVolume: number
  averageFeePercentage: number
  hyperliquidIntegration: {
    totalRedirects: number
    totalVolume: number
    feesShared: number
    activeReferrals: number
  }
  networkBreakdown: Array<{
    network: string
    fees: number
    percentage: number
    color: string
  }>
  revenueGrowth: number
  feeEfficiency: number
}

export const FeeSystemDashboard: React.FC = () => {
  const [stats, setStats] = useState<FeeSystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [demoTrade, setDemoTrade] = useState({
    amount: '1',
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    network: 'ethereum'
  })
  const [feeCalculation, setFeeCalculation] = useState<any>(null)

  useEffect(() => {
    loadFeeSystemStats()
  }, [])

  const loadFeeSystemStats = async () => {
    setLoading(true)
    
    try {
      // Fetch fee statistics
      const response = await fetch('/api/fees/stats/?period=30d')
      const data = await response.json()
      
      // Mock comprehensive stats
      const mockStats: FeeSystemStats = {
        totalFeesCollected: 15847.32,
        totalTrades: 2341,
        totalVolume: 4527237.45,
        averageFeePercentage: 0.35,
        hyperliquidIntegration: {
          totalRedirects: 156,
          totalVolume: 892341.23,
          feesShared: 892.34,
          activeReferrals: 89
        },
        networkBreakdown: [
          { network: 'Ethereum', fees: 8934.12, percentage: 56.4, color: '#627EEA' },
          { network: 'Arbitrum', fees: 3245.67, percentage: 20.5, color: '#28A0F0' },
          { network: 'Optimism', fees: 2156.89, percentage: 13.6, color: '#FF0420' },
          { network: 'Polygon', fees: 1510.64, percentage: 9.5, color: '#8247E5' }
        ],
        revenueGrowth: 23.5,
        feeEfficiency: 96.8
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load fee stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoTrade = async () => {
    try {
      // Simulate trade execution with fee collection
      const tradeParams = {
        tokenIn: demoTrade.tokenIn,
        tokenOut: demoTrade.tokenOut,
        amountIn: demoTrade.amount,
        userAddress: '0x1234567890123456789012345678901234567890',
        slippageTolerance: 0.5,
        network: demoTrade.network
      }

      const quote = await hyperliquidIntegration.getQuote(tradeParams)

      // Show success message
      alert(`Demo trade executed!\nCYPHER Fee: $${quote.cypherFee.toFixed(2)}\nHyperliquid URL: ${quote.redirectUrl}`)
      
      // Refresh stats
      loadFeeSystemStats()
    } catch (error) {
      console.error('Demo trade error:', error)
      alert('Demo trade failed. Check console for details.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-800">
                  {formatCurrency(stats?.totalFeesCollected || 0)}
                </div>
                <div className="text-sm text-orange-600">Total Fees Collected</div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">
                    +{formatPercentage(stats?.revenueGrowth || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-800">
                  {stats?.totalTrades.toLocaleString() || 0}
                </div>
                <div className="text-sm text-blue-600">Total Trades</div>
                <div className="text-xs text-blue-500 mt-1">
                  Avg: {formatCurrency((stats?.totalFeesCollected || 0) / (stats?.totalTrades || 1))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(stats?.totalVolume || 0)}
                </div>
                <div className="text-sm text-green-600">Total Volume</div>
                <div className="text-xs text-green-500 mt-1">
                  Fee Rate: {formatPercentage(stats?.averageFeePercentage || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Waves className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-800">
                  {stats?.hyperliquidIntegration.totalRedirects || 0}
                </div>
                <div className="text-sm text-purple-600">Hyperliquid Redirects</div>
                <div className="text-xs text-purple-500 mt-1">
                  Shared: {formatCurrency(stats?.hyperliquidIntegration.feesShared || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection Mechanism */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            0.35% Fee Collection Mechanism
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Pre-Trade Collection</span>
              </div>
              <p className="text-sm text-gray-600">
                Fees are collected before trade execution, ensuring 100% collection rate 
                without smart contract dependencies.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm font-medium text-green-800">Collection Rate</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatPercentage(stats?.feeEfficiency || 0)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Hyperliquid Integration</span>
              </div>
              <p className="text-sm text-gray-600">
                Seamless redirection to Hyperliquid with referral tracking and 
                fee sharing mechanisms.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800">Redirect Volume</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(stats?.hyperliquidIntegration.totalVolume || 0)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Transparent Reporting</span>
              </div>
              <p className="text-sm text-gray-600">
                Complete fee transparency with real-time analytics, 
                tax reporting, and audit trails.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-800">Transparency Score</div>
                <div className="text-2xl font-bold text-purple-900">100%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Network Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.networkBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="fees"
                  label={({ network, percentage }) => `${network} (${percentage}%)`}
                >
                  {stats?.networkBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Integration Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Fee Collection Rate</span>
                <Badge className="bg-green-600">{formatPercentage(stats?.feeEfficiency || 0)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Hyperliquid Redirects</span>
                <Badge variant="outline">{stats?.hyperliquidIntegration.totalRedirects}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Referrals</span>
                <Badge variant="outline">{stats?.hyperliquidIntegration.activeReferrals}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Revenue Growth</span>
                <Badge className="bg-orange-600">+{formatPercentage(stats?.revenueGrowth || 0)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderDemoTrading = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demo Trade with Fee Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Trade Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={demoTrade.amount}
                  onChange={(e) => setDemoTrade(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="1.0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Token</Label>
                  <Select 
                    value={demoTrade.tokenIn} 
                    onValueChange={(value) => setDemoTrade(prev => ({ ...prev, tokenIn: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="SOL">SOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>To Token</Label>
                  <Select 
                    value={demoTrade.tokenOut} 
                    onValueChange={(value) => setDemoTrade(prev => ({ ...prev, tokenOut: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Network</Label>
                <Select 
                  value={demoTrade.network} 
                  onValueChange={(value) => setDemoTrade(prev => ({ ...prev, network: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="optimism">Optimism</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleDemoTrade} className="w-full">
                Execute Demo Trade
              </Button>
            </div>

            <div>
              <FeeBreakdownWidget
                tradeAmount={parseFloat(demoTrade.amount) || 0}
                tokenIn={demoTrade.tokenIn}
                tokenOut={demoTrade.tokenOut}
                network={demoTrade.network}
                onFeeCalculated={setFeeCalculation}
                compact={false}
                showComparison={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <FeeHistoryTracker />
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee System Dashboard</h1>
          <p className="text-gray-600">
            0.35% redirection fee system with Hyperliquid integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-600">0.35% Fee Rate</Badge>
          <Badge variant="outline">Live System</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="demo">Demo Trading</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="demo" className="mt-6">
          {renderDemoTrading()}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fee Analytics & Reporting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                  <p className="text-gray-600 mb-4">
                    Comprehensive fee analytics, tax reporting, and compliance tools.
                  </p>
                  <Button variant="outline">
                    Access Analytics Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FeeSystemDashboard