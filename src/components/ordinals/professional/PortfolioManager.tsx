/**
 * Portfolio Manager - Professional Component
 * Complete portfolio management for Bitcoin Ordinals traders and collectors
 */

'use client'

import { useState } from 'react'
import { usePortfolio } from '@/hooks/ordinals/usePortfolio'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import {
  Wallet,
  RefreshCw,
  Download,
  AlertCircle,
  Image as ImageIcon,
  Coins,
  Gem,
  Loader2,
} from 'lucide-react'

interface PortfolioManagerProps {
  address: string | null
}

export default function PortfolioManager({ address }: PortfolioManagerProps) {
  const { connect, connecting, ordinalsAddress } = useLaserEyes()
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'brc20' | 'inscriptions'>('overview')

  const {
    portfolioSummary,
    performance,
    holdings,
    brc20Holdings,
    magicEdenTokens,
    isLoading,
    isError,
    refetchAll,
  } = usePortfolio(address, ordinalsAddress)

  const [connectError, setConnectError] = useState<string | null>(null)

  const handleConnectWallet = async () => {
    setConnectError(null)
    try {
      await connect('xverse')
    } catch (err: any) {
      console.error('Wallet connection failed:', err)
      setConnectError(
        err?.message?.includes('not found')
          ? 'Xverse wallet extension not detected. Please install Xverse to continue.'
          : 'Failed to connect wallet. Please try again.'
      )
    }
  }

  if (!address) {
    return (
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Connect your Bitcoin wallet to view your Ordinals portfolio
          </p>
          {connectError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              {connectError}
            </div>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={handleConnectWallet}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-[#f59e0b]" />
          <span className="text-sm text-gray-400">Loading portfolio data for {address?.slice(0, 8)}...{address?.slice(-4)}</span>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="h-48 bg-[#2a2a3e] rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/50">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Error loading portfolio</div>
            <div className="text-sm text-gray-400">Could not fetch data for this wallet. Please try refreshing.</div>
          </div>
          <Button variant="secondary" size="md" onClick={refetchAll} className="ml-auto gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
            Portfolio Manager
          </h2>
          <p className="text-sm text-gray-400">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={refetchAll}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="primary" size="md" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Value
            </div>
            <div className="text-3xl font-bold text-[#f59e0b]">
              {portfolioSummary?.totalValue.toFixed(4) || '0.0000'} BTC
            </div>
            <div className="text-xs text-gray-500">
              {portfolioSummary?.btcPriceUsd
                ? `≈ $${portfolioSummary.totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : 'Fetching USD price...'}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              BTC Balance
            </div>
            <div className="text-3xl font-bold text-white">
              {portfolioSummary?.btcBalance.toFixed(4) || '0.0000'}
            </div>
            <div className="text-xs text-gray-500">
              {portfolioSummary?.utxoCount || 0} UTXOs
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Collections
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {portfolioSummary?.collectionsCount || 0}
            </div>
            <div className="text-xs text-gray-500">
              {portfolioSummary?.inscriptionCount || 0} inscriptions
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              BRC-20 Tokens
            </div>
            <div className="text-3xl font-bold text-green-400">
              {portfolioSummary?.brc20Count || 0}
            </div>
            <div className="text-xs text-gray-500">
              Active tokens
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Received</div>
              <div className="text-xl font-bold text-green-400">
                {performance.totalReceived.toFixed(4)} BTC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Sent</div>
              <div className="text-xl font-bold text-red-400">
                {performance.totalSent.toFixed(4)} BTC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Net Balance</div>
              <div className={`text-xl font-bold ${performance.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {performance.netBalance >= 0 ? '+' : ''}{performance.netBalance.toFixed(4)} BTC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Transactions</div>
              <div className="text-xl font-bold text-white">
                {performance.txCount.toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2a2a3e]">
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'collections', label: 'Collections', icon: ImageIcon },
          { id: 'brc20', label: 'BRC-20', icon: Coins },
          { id: 'inscriptions', label: 'Inscriptions', icon: Gem },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-[#f59e0b] border-b-2 border-[#f59e0b]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Collections */}
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <h3 className="text-lg font-bold text-white mb-4">Top Holdings</h3>
            {holdings.length > 0 ? (
              <div className="space-y-3">
                {holdings.slice(0, 5).map((holding, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                  >
                    <div>
                      <div className="font-semibold text-white">{holding.name}</div>
                      <div className="text-xs text-gray-400">{holding.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#f59e0b]">
                        {holding.floorPrice?.toFixed(4) || '0.0000'} BTC
                      </div>
                      <div className="text-xs text-gray-500">Floor</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                No collection holdings found for this wallet.
              </div>
            )}
          </Card>

          {/* BRC-20 Holdings */}
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <h3 className="text-lg font-bold text-white mb-4">BRC-20 Tokens</h3>
            {brc20Holdings.length > 0 ? (
              <div className="space-y-3">
                {brc20Holdings.slice(0, 5).map((token, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                  >
                    <div>
                      <div className="font-semibold text-white">{token.ticker}</div>
                      <div className="text-xs text-gray-400">Available</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-400">
                        {token.availableBalance}
                      </div>
                      <div className="text-xs text-gray-500">
                        {token.transferableBalance} transferable
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                No BRC-20 tokens found for this wallet.
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'collections' && (
        holdings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map((holding, i) => (
              <Card
                key={i}
                variant="bordered"
                padding="lg"
                className="bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#f59e0b] transition-colors cursor-pointer"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-white">{holding.name}</h4>
                    <p className="text-xs text-gray-400">{holding.symbol}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Floor</div>
                    <div className="font-semibold text-[#f59e0b]">
                      {holding.floorPrice?.toFixed(4) || '0.0000'} BTC
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Items</div>
                    <div className="text-sm text-white">{holding.itemCount}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <h4 className="text-white font-semibold mb-1">No Collections Found</h4>
              <p className="text-sm text-gray-400">This wallet does not hold any ordinal collections.</p>
            </div>
          </Card>
        )
      )}

      {activeTab === 'brc20' && (
        brc20Holdings.length > 0 ? (
          <Card variant="bordered" padding="none" className="bg-[#0a0a0f] border-[#2a2a3e] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1a1a2e] border-b border-[#2a2a3e]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Transferable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a3e]">
                {brc20Holdings.map((token, i) => (
                  <tr key={i} className="hover:bg-[#1a1a2e] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-white">{token.ticker}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-white">{token.balance}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-green-400">{token.availableBalance}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-blue-400">{token.transferableBalance}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="text-center py-8">
              <Coins className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <h4 className="text-white font-semibold mb-1">No BRC-20 Tokens</h4>
              <p className="text-sm text-gray-400">This wallet does not hold any BRC-20 tokens.</p>
            </div>
          </Card>
        )
      )}

      {activeTab === 'inscriptions' && (
        <div>
          {magicEdenTokens?.tokens?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {magicEdenTokens.tokens.slice(0, 20).map((token: any, i: number) => (
                <Card
                  key={i}
                  variant="bordered"
                  padding="none"
                  className="bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#f59e0b] transition-all overflow-hidden cursor-pointer"
                >
                  <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
                    {token.contentType?.startsWith('image/') && token.contentURI ? (
                      <>
                        <img
                          src={token.contentURI}
                          alt={token.meta?.name || `#${token.inscriptionNumber}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 items-center justify-center hidden">
                          <ImageIcon className="w-12 h-12 text-gray-600" />
                        </div>
                      </>
                    ) : token.contentType?.startsWith('text/') ? (
                      <div className="flex flex-col items-center gap-2">
                        <Gem className="w-10 h-10 text-[#f59e0b]/40" />
                        <span className="text-[10px] text-gray-500 font-mono">{token.contentType}</span>
                      </div>
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-600" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-white text-sm">
                      #{token.inscriptionNumber}
                    </div>
                    {token.contentType && (
                      <div className="text-xs text-gray-500">{token.contentType}</div>
                    )}
                    {token.meta?.name && (
                      <div className="text-xs text-gray-400">{token.meta.name}</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h4 className="text-white font-semibold mb-1">No Inscriptions Found</h4>
                <p className="text-sm text-gray-400">This wallet does not hold any inscriptions yet.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
