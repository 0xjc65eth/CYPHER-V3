'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Activity,
  Clock,
  Globe,
  Users,
  ArrowUpRight,
  Calculator,
  Network,
  BarChart3,
  PieChart
} from 'lucide-react'
import { FEE_PERCENTAGE, WALLET_ADDRESSES, formatAddress } from '@/config/feeRecipients'

// Mock data para demonstração - em produção seria conectado a API real
const mockTransactions = [
  {
    id: '1',
    user: '0x742d35Cc6634C0532925a3b844Bc9e7595f89234',
    network: 'ethereum',
    dex: 'Uniswap',
    fromToken: 'ETH',
    toToken: 'USDC',
    amount: 5000,
    feeCollected: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    status: 'completed'
  },
  {
    id: '2',
    user: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    network: 'bitcoin',
    dex: 'RunesDex',
    fromToken: 'BTC',
    toToken: 'ORDI',
    amount: 11000,
    feeCollected: 8.8,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'completed'
  },
  {
    id: '3',
    user: '7Xhw4Z9V8Qz2X3Y5K1J7M9N6P8R4T2E1A3C5B7D9F6H8',
    network: 'solana',
    dex: 'Jupiter',
    fromToken: 'SOL',
    toToken: 'USDC',
    amount: 2000,
    feeCollected: 1.6,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'completed'
  }
]

const networkStats = {
  ethereum: { volume: 125000, fees: 100, transactions: 45 },
  bitcoin: { volume: 85000, fees: 68, transactions: 12 },
  solana: { volume: 45000, fees: 36, transactions: 28 },
  arbitrum: { volume: 32000, fees: 25.6, transactions: 35 },
  optimism: { volume: 28000, fees: 22.4, transactions: 30 },
  polygon: { volume: 15000, fees: 12, transactions: 50 },
  base: { volume: 8000, fees: 6.4, transactions: 15 },
  avalanche: { volume: 5000, fees: 4, transactions: 8 }
}

export function FeeMonitoringDashboard() {
  const [totalVolume, setTotalVolume] = useState(0)
  const [totalFees, setTotalFees] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [timeframe, setTimeframe] = useState('24h')

  useEffect(() => {
    // Calcular totais
    const volume = Object.values(networkStats).reduce((sum, stat) => sum + stat.volume, 0)
    const fees = Object.values(networkStats).reduce((sum, stat) => sum + stat.fees, 0)
    const transactions = Object.values(networkStats).reduce((sum, stat) => sum + stat.transactions, 0)
    
    setTotalVolume(volume)
    setTotalFees(fees)
    setTotalTransactions(transactions)
  }, [])

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500',
      bitcoin: 'bg-orange-500',
      solana: 'bg-purple-500',
      arbitrum: 'bg-blue-400',
      optimism: 'bg-red-500',
      polygon: 'bg-purple-600',
      base: 'bg-blue-600',
      avalanche: 'bg-red-600'
    }
    return colors[network] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'text-green-500' : 'text-yellow-500'
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Volume Total</p>
              <p className="text-2xl font-bold text-white">
                ${totalVolume.toLocaleString()}
              </p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +22.5% vs ontem
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Taxas Coletadas</p>
              <p className="text-2xl font-bold text-white">
                ${totalFees.toFixed(2)}
              </p>
              <p className="text-xs text-orange-500">
                {FEE_PERCENTAGE * 100}% de taxa
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Calculator className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Transações</p>
              <p className="text-2xl font-bold text-white">
                {totalTransactions}
              </p>
              <p className="text-xs text-gray-500">Últimas 24h</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Taxa Média</p>
              <p className="text-2xl font-bold text-white">
                ${(totalFees / totalTransactions).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Por transação</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Network Breakdown */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-500" />
          Performance por Rede
        </h3>
        <div className="space-y-3">
          {Object.entries(networkStats)
            .sort((a, b) => b[1].volume - a[1].volume)
            .map(([network, stats]) => {
              const percentage = (stats.volume / totalVolume) * 100
              return (
                <div key={network} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getNetworkColor(network)}`} />
                      <span className="text-white capitalize">{network}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                      <span>${stats.volume.toLocaleString()}</span>
                      <span className="text-green-500">${stats.fees.toFixed(2)}</span>
                      <span>{stats.transactions} tx</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getNetworkColor(network)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Transações Recentes
          </h3>
          <Badge variant="secondary" className="bg-gray-800">
            Live
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3">Usuário</th>
                <th className="pb-3">Rede</th>
                <th className="pb-3">DEX</th>
                <th className="pb-3">Swap</th>
                <th className="pb-3">Volume</th>
                <th className="pb-3">Taxa</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-800">
                  <td className="py-3 font-mono text-xs text-gray-400">
                    {formatAddress(tx.user, tx.network)}
                  </td>
                  <td className="py-3">
                    <Badge variant="outline" className={`${getNetworkColor(tx.network)} bg-opacity-20 text-white border-0`}>
                      {tx.network}
                    </Badge>
                  </td>
                  <td className="py-3 text-white">{tx.dex}</td>
                  <td className="py-3 text-gray-300">
                    {tx.fromToken} → {tx.toToken}
                  </td>
                  <td className="py-3 text-white">${tx.amount.toLocaleString()}</td>
                  <td className="py-3 text-green-500 font-medium">
                    ${tx.feeCollected.toFixed(2)}
                  </td>
                  <td className="py-3">
                    <span className={getStatusColor(tx.status)}>●</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fee Collection Addresses */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-orange-500" />
          Endereços de Coleta
        </h3>
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">Bitcoin</span>
              <Badge className="bg-orange-500 text-white">Mainnet</Badge>
            </div>
            <p className="font-mono text-xs text-white break-all">
              {WALLET_ADDRESSES.bitcoin}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">EVM (Ethereum, BSC, etc)</span>
              <Badge className="bg-blue-500 text-white">Multi-chain</Badge>
            </div>
            <p className="font-mono text-xs text-white break-all">
              {WALLET_ADDRESSES.EVM}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">Solana</span>
              <Badge className="bg-purple-500 text-white">SPL</Badge>
            </div>
            <p className="font-mono text-xs text-white break-all">
              {WALLET_ADDRESSES.solana}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}