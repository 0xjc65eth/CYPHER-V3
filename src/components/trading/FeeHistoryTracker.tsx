/**
 * 📈 FEE HISTORY TRACKER
 * Tracks and displays historical fee payments and analytics
 * Shows personal fee contribution and platform metrics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'
import { 
  TrendingUp,
  DollarSign,
  Calendar,
  Award,
  Download,
  Eye,
  Filter,
  Info
} from 'lucide-react'

interface FeeHistoryData {
  id: string
  timestamp: number
  amount: string
  amountUSD: number
  token: string
  network: string
  txHash: string
  tradeVolume: number
  feePercentage: number
  status: 'pending' | 'confirmed' | 'failed'
}

interface FeeAnalytics {
  totalFeePaid: number
  totalTrades: number
  totalVolume: number
  averageFeePerTrade: number
  feeEfficiency: number
  topNetwork: string
  topToken: string
  monthlyTrend: Array<{
    month: string
    fees: number
    trades: number
    volume: number
  }>
  networkBreakdown: Array<{
    network: string
    fees: number
    percentage: number
    color: string
  }>
}

interface FeeHistoryTrackerProps {
  userAddress?: string
  timeframe?: '7d' | '30d' | '90d' | 'all'
  className?: string
}

export const FeeHistoryTracker: React.FC<FeeHistoryTrackerProps> = ({
  userAddress,
  timeframe = '30d',
  className = ''
}) => {
  const [feeHistory, setFeeHistory] = useState<FeeHistoryData[]>([])
  const [analytics, setAnalytics] = useState<FeeAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  // Mock data for demonstration
  const mockFeeHistory: FeeHistoryData[] = [
    {
      id: 'fee_1',
      timestamp: Date.now() - 86400000,
      amount: '0.1',
      amountUSD: 285,
      token: 'ETH',
      network: 'ethereum',
      txHash: '0xabc...123',
      tradeVolume: 81428.57,
      feePercentage: 0.35,
      status: 'confirmed'
    },
    {
      id: 'fee_2',
      timestamp: Date.now() - 172800000,
      amount: '0.05',
      amountUSD: 142.5,
      token: 'ETH',
      network: 'ethereum',
      txHash: '0xdef...456',
      tradeVolume: 40714.29,
      feePercentage: 0.35,
      status: 'confirmed'
    },
    {
      id: 'fee_3',
      timestamp: Date.now() - 259200000,
      amount: '50',
      amountUSD: 50,
      token: 'USDC',
      network: 'arbitrum',
      txHash: '0xghi...789',
      tradeVolume: 14285.71,
      feePercentage: 0.35,
      status: 'confirmed'
    },
    {
      id: 'fee_4',
      timestamp: Date.now() - 345600000,
      amount: '0.5',
      amountUSD: 47.5,
      token: 'SOL',
      network: 'solana',
      txHash: 'sol_abc123',
      tradeVolume: 13571.43,
      feePercentage: 0.35,
      status: 'confirmed'
    },
    {
      id: 'fee_5',
      timestamp: Date.now() - 432000000,
      amount: '100',
      amountUSD: 80,
      token: 'MATIC',
      network: 'polygon',
      txHash: '0xjkl...012',
      tradeVolume: 22857.14,
      feePercentage: 0.35,
      status: 'confirmed'
    }
  ]

  useEffect(() => {
    loadFeeHistory()
  }, [userAddress, selectedTimeframe])

  const loadFeeHistory = async () => {
    setLoading(true)
    
    try {
      // In production, this would fetch from API
      // const response = await fetch(`/api/fees/history/?address=${userAddress}&timeframe=${selectedTimeframe}`)
      
      // Mock data simulation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const filteredHistory = mockFeeHistory.filter(fee => {
        const cutoffTime = getTimeframeCutoff(selectedTimeframe)
        return fee.timestamp >= cutoffTime
      })
      
      setFeeHistory(filteredHistory)
      setAnalytics(calculateAnalytics(filteredHistory))
      
    } catch (error) {
      console.error('Failed to load fee history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeframeCutoff = (timeframe: string): number => {
    const now = Date.now()
    const cutoffs = {
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
      '90d': now - 90 * 24 * 60 * 60 * 1000,
      'all': 0
    }
    return cutoffs[timeframe as keyof typeof cutoffs] || cutoffs['30d']
  }

  const calculateAnalytics = (history: FeeHistoryData[]): FeeAnalytics => {
    const totalFeePaid = history.reduce((sum, fee) => sum + fee.amountUSD, 0)
    const totalTrades = history.length
    const totalVolume = history.reduce((sum, fee) => sum + fee.tradeVolume, 0)
    const averageFeePerTrade = totalFeePaid / Math.max(totalTrades, 1)
    const feeEfficiency = totalVolume > 0 ? (totalFeePaid / totalVolume) * 100 : 0

    // Calculate network breakdown
    const networkCounts = history.reduce((acc, fee) => {
      acc[fee.network] = (acc[fee.network] || 0) + fee.amountUSD
      return acc
    }, {} as Record<string, number>)

    const networkColors = {
      ethereum: '#627EEA',
      arbitrum: '#28A0F0',
      optimism: '#FF0420',
      polygon: '#8247E5',
      base: '#0052FF',
      solana: '#9945FF',
      bsc: '#F3BA2F',
      avalanche: '#E84142'
    }

    const networkBreakdown = Object.entries(networkCounts).map(([network, fees]) => ({
      network,
      fees,
      percentage: (fees / totalFeePaid) * 100,
      color: networkColors[network as keyof typeof networkColors] || '#6B7280'
    }))

    // Find top network and token
    const topNetwork = Object.keys(networkCounts).reduce((a, b) => 
      networkCounts[a] > networkCounts[b] ? a : b
    )

    const tokenCounts = history.reduce((acc, fee) => {
      acc[fee.token] = (acc[fee.token] || 0) + fee.amountUSD
      return acc
    }, {} as Record<string, number>)

    const topToken = Object.keys(tokenCounts).reduce((a, b) => 
      tokenCounts[a] > tokenCounts[b] ? a : b
    )

    // Generate monthly trend (simplified)
    const monthlyTrend = generateMonthlyTrend(history)

    return {
      totalFeePaid,
      totalTrades,
      totalVolume,
      averageFeePerTrade,
      feeEfficiency,
      topNetwork,
      topToken,
      monthlyTrend,
      networkBreakdown
    }
  }

  const generateMonthlyTrend = (history: FeeHistoryData[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return months.map((month, index) => ({
      month,
      fees: Math.random() * 500 + 100,
      trades: Math.floor(Math.random() * 50 + 10),
      volume: Math.random() * 50000 + 10000
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Amount (USD)', 'Token', 'Network', 'Trade Volume', 'TX Hash']
    const rows = feeHistory.map(fee => [
      formatDate(fee.timestamp),
      fee.amountUSD.toString(),
      fee.token,
      fee.network,
      fee.tradeVolume.toString(),
      fee.txHash
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `cypher-fees-${selectedTimeframe}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.totalFeePaid || 0)}
                </div>
                <div className="text-sm text-gray-500">Total Fees Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.totalTrades || 0}</div>
                <div className="text-sm text-gray-500">Total Trades</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.averageFeePerTrade || 0)}
                </div>
                <div className="text-sm text-gray-500">Avg Fee/Trade</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {analytics?.feeEfficiency?.toFixed(3) || '0.000'}%
                </div>
                <div className="text-sm text-gray-500">Fee Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fee Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'fees' ? formatCurrency(value) : value,
                  name === 'fees' ? 'Fees' : name === 'trades' ? 'Trades' : 'Volume'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="fees" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Network Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Network Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics?.networkBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="fees"
                  label={({ network, percentage }) => `${network} (${percentage.toFixed(1)}%)`}
                >
                  {analytics?.networkBreakdown.map((entry, index) => (
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
            <CardTitle>Top Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Most Used Network</span>
              <Badge variant="outline">{analytics?.topNetwork}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Most Traded Token</span>
              <Badge variant="outline">{analytics?.topToken}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Volume</span>
              <span className="font-semibold">
                {formatCurrency(analytics?.totalVolume || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Fee Rate</span>
              <Badge className="bg-orange-600">0.35%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderHistory = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fee History</span>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feeHistory.map((fee) => (
            <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium">
                    {formatCurrency(fee.amountUSD)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {fee.token} on {fee.network}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatDate(fee.timestamp)}
                </div>
                <div className="text-xs text-gray-500">
                  Volume: {formatCurrency(fee.tradeVolume)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://etherscan.io/tx/${fee.txHash}`, '_blank')}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Fee Analytics & History
          </CardTitle>
          <div className="flex gap-2">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            {renderHistory()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default FeeHistoryTracker