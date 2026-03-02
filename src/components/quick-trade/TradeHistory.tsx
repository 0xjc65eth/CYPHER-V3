'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Bitcoin
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TradeRecord {
  id: string
  timestamp: number
  tokenIn: {
    symbol: string
    address: string
    amount: string
    logoUri?: string
  }
  tokenOut: {
    symbol: string
    address: string
    amount: string
    logoUri?: string
  }
  dex: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  txHash?: string
  chainId: number
  priceImpact: number
  cypherFee: string
  totalFee: string
  executionTime?: number
  blockExplorer: string
  error?: string
}

interface TradeHistoryProps {
  isOpen: boolean
  onClose: () => void
  walletAddress?: string
  chainId?: number
}

// FALLBACK: Replace with real trade history API call
// Trade records should be fetched from the backend based on walletAddress
const INITIAL_TRADES: TradeRecord[] = []

const TradeHistory: React.FC<TradeHistoryProps> = ({
  isOpen,
  onClose,
  walletAddress,
  chainId
}) => {
  const [trades, setTrades] = useState<TradeRecord[]>(INITIAL_TRADES)
  const [filteredTrades, setFilteredTrades] = useState<TradeRecord[]>(INITIAL_TRADES)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    status: 'all',
    dex: 'all',
    timeRange: '24h',
    search: ''
  })

  // Filter trades based on current filters
  useEffect(() => {
    let filtered = [...trades]

    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(trade => trade.status === filter.status)
    }

    // DEX filter
    if (filter.dex !== 'all') {
      filtered = filtered.filter(trade => trade.dex === filter.dex)
    }

    // Time range filter
    const now = Date.now()
    const timeRanges = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      'all': Infinity
    }
    const timeLimit = timeRanges[filter.timeRange as keyof typeof timeRanges] || timeRanges['24h']
    if (timeLimit !== Infinity) {
      filtered = filtered.filter(trade => now - trade.timestamp <= timeLimit)
    }

    // Search filter
    if (filter.search) {
      const query = filter.search.toLowerCase()
      filtered = filtered.filter(trade =>
        trade.tokenIn.symbol.toLowerCase().includes(query) ||
        trade.tokenOut.symbol.toLowerCase().includes(query) ||
        trade.dex.toLowerCase().includes(query) ||
        trade.txHash?.toLowerCase().includes(query)
      )
    }

    // Chain filter
    if (chainId) {
      filtered = filtered.filter(trade => trade.chainId === chainId)
    }

    setFilteredTrades(filtered)
  }, [trades, filter, chainId])

  // Refresh trades
  const refreshTrades = async () => {
    setLoading(true)
    // In production, this would fetch from API
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  // Export trades to CSV
  const exportTrades = () => {
    const headers = [
      'Date',
      'Token In',
      'Amount In',
      'Token Out',
      'Amount Out',
      'DEX',
      'Status',
      'Price Impact',
      'Total Fee',
      'TX Hash'
    ]

    const csvData = filteredTrades.map(trade => [
      new Date(trade.timestamp).toISOString(),
      trade.tokenIn.symbol,
      trade.tokenIn.amount,
      trade.tokenOut.symbol,
      trade.tokenOut.amount,
      trade.dex,
      trade.status,
      `${trade.priceImpact.toFixed(2)}%`,
      `$${trade.totalFee}`,
      trade.txHash || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cypher-trade-history-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get status color and icon
  const getStatusDisplay = (status: TradeRecord['status']) => {
    const displays = {
      completed: {
        color: 'text-green-400 border-green-500/20 bg-green-500/10',
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Completed'
      },
      pending: {
        color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
        icon: <Clock className="w-4 h-4" />,
        text: 'Pending'
      },
      failed: {
        color: 'text-red-400 border-red-500/20 bg-red-500/10',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Failed'
      },
      cancelled: {
        color: 'text-slate-400 border-slate-500/20 bg-slate-500/10',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Cancelled'
      }
    }
    return displays[status]
  }

  // Get chain icon
  const getChainIcon = (chainId: number) => {
    const icons: Record<number, React.ReactNode> = {
      1: <Zap className="w-4 h-4 text-blue-400" />,
      42161: <Zap className="w-4 h-4 text-blue-400" />,
      101: <div className="w-4 h-4 bg-purple-500 rounded" />,
      0: <Bitcoin className="w-4 h-4 text-orange-400" />
    }
    return icons[chainId] || <Zap className="w-4 h-4" />
  }

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  // Calculate total volume and fees
  const stats = React.useMemo(() => {
    const completed = filteredTrades.filter(t => t.status === 'completed')
    const totalVolume = completed.reduce((sum, trade) => {
      const amount = parseFloat(trade.tokenOut.amount.replace(/,/g, ''))
      return sum + (trade.tokenOut.symbol.includes('USD') ? amount : amount * 2000) // Rough USD conversion
    }, 0)
    
    const totalFees = completed.reduce((sum, trade) => sum + parseFloat(trade.totalFee), 0)
    
    return {
      totalTrades: completed.length,
      totalVolume,
      totalFees,
      avgExecutionTime: completed.reduce((sum, trade) => sum + (trade.executionTime || 0), 0) / completed.length
    }
  }, [filteredTrades])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col"
      >
        <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800 flex-1">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <History className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-cyan-400">Trade History</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">
                    {filteredTrades.length} trades • {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'All wallets'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportTrades}
                  className="text-slate-400 hover:text-slate-300"
                  disabled={filteredTrades.length === 0}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshTrades}
                  className="text-slate-400 hover:text-slate-300"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-300"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{stats.totalTrades}</div>
                  <div className="text-xs text-slate-400">Total Trades</div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    ${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-400">Total Volume</div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    ${stats.totalFees.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">Total Fees</div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {stats.avgExecutionTime.toFixed(0)}s
                  </div>
                  <div className="text-xs text-slate-400">Avg Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mt-4">
              <Input
                placeholder="Search trades..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="max-w-xs bg-slate-800 border-slate-700"
              />
              
              <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.timeRange} onValueChange={(value) => setFilter(prev => ({ ...prev, timeRange: value }))}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.dex} onValueChange={(value) => setFilter(prev => ({ ...prev, dex: value }))}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All DEXs</SelectItem>
                  <SelectItem value="Uniswap V3">Uniswap V3</SelectItem>
                  <SelectItem value="Jupiter">Jupiter</SelectItem>
                  <SelectItem value="SushiSwap">SushiSwap</SelectItem>
                  <SelectItem value="LHMA Swap">LHMA Swap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <div className="overflow-y-auto max-h-[400px] space-y-3">
              <AnimatePresence>
                {filteredTrades.map((trade, index) => {
                  const statusDisplay = getStatusDisplay(trade.status)
                  
                  return (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Chain and DEX */}
                          <div className="flex items-center gap-2">
                            {getChainIcon(trade.chainId)}
                            <Badge variant="outline" className="text-xs">
                              {trade.dex}
                            </Badge>
                          </div>

                          {/* Trade Details */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <img 
                                src={trade.tokenIn.logoUri || '/icons/default-token.png'} 
                                alt={trade.tokenIn.symbol}
                                className="w-6 h-6 rounded-full"
                              />
                              <div>
                                <div className="font-medium text-slate-200">
                                  {trade.tokenIn.amount} {trade.tokenIn.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="text-slate-400">→</div>

                            <div className="flex items-center gap-2">
                              <img 
                                src={trade.tokenOut.logoUri || '/icons/default-token.png'} 
                                alt={trade.tokenOut.symbol}
                                className="w-6 h-6 rounded-full"
                              />
                              <div>
                                <div className="font-medium text-slate-200">
                                  {trade.tokenOut.amount} {trade.tokenOut.symbol}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Status */}
                          <Badge variant="outline" className={statusDisplay.color}>
                            {statusDisplay.icon}
                            <span className="ml-1">{statusDisplay.text}</span>
                          </Badge>

                          {/* Price Impact */}
                          <div className="text-right">
                            <div className={`text-sm flex items-center gap-1 ${
                              trade.priceImpact > 1 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {trade.priceImpact > 1 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <TrendingUp className="w-3 h-3" />
                              )}
                              {trade.priceImpact.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-500">impact</div>
                          </div>

                          {/* Time and Actions */}
                          <div className="text-right">
                            <div className="text-sm text-slate-300">
                              {formatTimeAgo(trade.timestamp)}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {trade.txHash && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                                  onClick={() => window.open(`${trade.blockExplorer}/tx/${trade.txHash}`, '_blank')}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          <span>Fee: ${trade.totalFee}</span>
                          <span>Cypher: {trade.cypherFee}</span>
                          {trade.executionTime && (
                            <span>Time: {trade.executionTime}s</span>
                          )}
                        </div>
                        {trade.error && (
                          <div className="flex items-center gap-1 text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{trade.error}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {filteredTrades.length === 0 && (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No trades found</p>
                  <p className="text-sm text-slate-500">
                    {filter.search || filter.status !== 'all' || filter.dex !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Your trade history will appear here'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default TradeHistory