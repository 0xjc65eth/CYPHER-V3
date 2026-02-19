'use client'

import React, { useEffect, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  History,
  DollarSign,
  Bitcoin
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'send' | 'receive'
  amount: number
  price: number
  totalValue: number
  date: Date
  txHash: string
  fee?: number
}

interface PortfolioMetrics {
  totalInvested: number
  totalValue: number
  totalPnL: number
  totalPnLPercentage: number
  averageBuyPrice: number
  averageSellPrice: number
  realizedPnL: number
  unrealizedPnL: number
}

export function PortfolioAssets() {
  const { isConnected, address, balance } = useWallet()
  const { data: bitcoinPrice } = useBitcoinPrice()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalInvested: 0,
    totalValue: 0,
    totalPnL: 0,
    totalPnLPercentage: 0,
    averageBuyPrice: 0,
    averageSellPrice: 0,
    realizedPnL: 0,
    unrealizedPnL: 0
  })

  // Fetch transaction history
  useEffect(() => {
    if (isConnected && address) {
      fetchTransactionHistory()
    }
  }, [isConnected, address])

  // Calculate portfolio metrics
  useEffect(() => {
    if (transactions.length > 0 && bitcoinPrice) {
      calculateMetrics()
    }
  }, [transactions, bitcoinPrice])

  const fetchTransactionHistory = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/portfolio/transactions/?address=${address}`)
      const data = await response.json()
      
      if (data.transactions) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = () => {
    let totalBought = 0
    let totalSold = 0
    let btcBought = 0
    let btcSold = 0
    let totalBoughtValue = 0
    let totalSoldValue = 0

    transactions.forEach((tx) => {
      if (tx.type === 'buy' || tx.type === 'receive') {
        btcBought += tx.amount
        totalBoughtValue += tx.totalValue
        totalBought++
      } else if (tx.type === 'sell' || tx.type === 'send') {
        btcSold += tx.amount
        totalSoldValue += tx.totalValue
        totalSold++
      }
    })

    const currentBtcBalance = balance?.bitcoin || 0
    const currentValue = currentBtcBalance * (bitcoinPrice || 0)
    const averageBuyPrice = btcBought > 0 ? totalBoughtValue / btcBought : 0
    const averageSellPrice = btcSold > 0 ? totalSoldValue / btcSold : 0
    const realizedPnL = totalSoldValue - (averageBuyPrice * btcSold)
    const unrealizedPnL = currentValue - (averageBuyPrice * currentBtcBalance)
    const totalPnL = realizedPnL + unrealizedPnL
    const totalPnLPercentage = totalBoughtValue > 0 ? (totalPnL / totalBoughtValue) * 100 : 0

    setMetrics({
      totalInvested: totalBoughtValue,
      totalValue: currentValue,
      totalPnL,
      totalPnLPercentage,
      averageBuyPrice,
      averageSellPrice,
      realizedPnL,
      unrealizedPnL
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatBTC = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    }).format(value)
  }

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Connect your wallet to view your portfolio assets and transaction history
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bitcoin className="w-6 h-6 text-orange-500" />
          Portfolio Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bitcoin Balance */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Bitcoin Balance</p>
            <p className="text-2xl font-bold">{formatBTC(balance?.bitcoin || 0)} BTC</p>
            <p className="text-sm text-gray-500">{formatCurrency(balance?.usd || 0)}</p>
          </div>

          {/* Total P&L */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total P&L</p>
            <p className={`text-2xl font-bold flex items-center gap-1 ${
              metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.totalPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {formatCurrency(Math.abs(metrics.totalPnL))}
            </p>
            <p className={`text-sm ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnLPercentage.toFixed(2)}%
            </p>
          </div>

          {/* Average Buy Price */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Buy Price</p>
            <p className="text-2xl font-bold">{formatCurrency(metrics.averageBuyPrice)}</p>
            <p className="text-sm text-gray-500">Current: {formatCurrency(bitcoinPrice || 0)}</p>
          </div>

          {/* Average Sell Price */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Sell Price</p>
            <p className="text-2xl font-bold">
              {metrics.averageSellPrice > 0 ? formatCurrency(metrics.averageSellPrice) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {metrics.averageSellPrice > 0 && metrics.averageBuyPrice > 0 
                ? `${((metrics.averageSellPrice / metrics.averageBuyPrice - 1) * 100).toFixed(2)}% gain`
                : 'No sells yet'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* P&L Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Profit & Loss Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Realized P&L</p>
            <p className={`text-xl font-bold ${
              metrics.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.realizedPnL >= 0 ? '+' : ''}{formatCurrency(metrics.realizedPnL)}
            </p>
          </div>
          
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Unrealized P&L</p>
            <p className={`text-xl font-bold ${
              metrics.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(metrics.unrealizedPnL)}
            </p>
          </div>
          
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Invested</p>
            <p className="text-xl font-bold">{formatCurrency(metrics.totalInvested)}</p>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Transaction History
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchTransactionHistory}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="buys">Buys</TabsTrigger>
            <TabsTrigger value="sells">Sells</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} bitcoinPrice={bitcoinPrice || 0} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="buys" className="space-y-2">
            {transactions.filter(tx => tx.type === 'buy' || tx.type === 'receive').map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} bitcoinPrice={bitcoinPrice || 0} />
            ))}
          </TabsContent>
          
          <TabsContent value="sells" className="space-y-2">
            {transactions.filter(tx => tx.type === 'sell' || tx.type === 'send').map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} bitcoinPrice={bitcoinPrice || 0} />
            ))}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function TransactionRow({ transaction, bitcoinPrice }: { transaction: Transaction; bitcoinPrice: number }) {
  const isBuy = transaction.type === 'buy' || transaction.type === 'receive'
  const currentValue = transaction.amount * bitcoinPrice
  const pnl = isBuy ? currentValue - transaction.totalValue : 0
  const pnlPercentage = transaction.totalValue > 0 ? (pnl / transaction.totalValue) * 100 : 0

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${
          isBuy ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
        }`}>
          {isBuy ? (
            <ArrowDownRight className={`w-5 h-5 ${isBuy ? 'text-green-600' : 'text-red-600'}`} />
          ) : (
            <ArrowUpRight className={`w-5 h-5 ${isBuy ? 'text-green-600' : 'text-red-600'}`} />
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={isBuy ? 'default' : 'secondary'}>
              {transaction.type.toUpperCase()}
            </Badge>
            <span className="font-medium">{formatBTC(transaction.amount)} BTC</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(transaction.date)} • ${transaction.price.toLocaleString()}/BTC
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-medium">{formatCurrency(transaction.totalValue)}</p>
        {isBuy && (
          <p className={`text-sm ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(pnl))} ({pnlPercentage.toFixed(2)}%)
          </p>
        )}
      </div>
    </div>
  )
}

function formatBTC(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}