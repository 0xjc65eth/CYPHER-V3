/**
 * BRC20Terminal - Professional BRC-20 Trading Terminal
 * Complete BRC-20 token trading and analytics platform
 */

'use client'

import { useState } from 'react'
import { useBRC20 } from '@/hooks/ordinals/useBRC20'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import { Input } from '@/components/ui/primitives/Input'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  ArrowUpDown,
  Filter,
  ExternalLink,
} from 'lucide-react'

export default function BRC20Terminal() {
  const {
    tokenList,
    topTokens,
    recentTokens,
    activeTokens,
    stats,
    getTokenInfo,
    getTokenHolders,
    getTokenHistory,
    isLoading,
    refetch,
  } = useBRC20()

  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'holders' | 'volume' | 'recent'>('holders')
  const [filterView, setFilterView] = useState<'all' | 'completed' | 'minting'>('all')

  const tokenInfo = getTokenInfo(selectedToken || '')
  const tokenHolders = getTokenHolders(selectedToken || '')
  const tokenHistory = getTokenHistory(selectedToken || '')

  const filteredTokens = tokenList?.detail?.filter((token) => {
    // 🔧 FIX: Add safety check for undefined ticker
    const matchesSearch = token?.ticker
      ?.toLowerCase()
      ?.includes(searchQuery.toLowerCase()) ?? true

    const matchesFilter =
      filterView === 'all' ||
      (filterView === 'completed' && token.completeHeight > 0) ||
      (filterView === 'minting' && token.completeHeight === 0)

    return matchesSearch && matchesFilter
  })

  const sortedTokens = filteredTokens?.sort((a, b) => {
    switch (sortBy) {
      case 'holders':
        return b.holdersCount - a.holdersCount
      case 'volume':
        return b.historyCount - a.historyCount
      case 'recent':
        return b.deployBlocktime - a.deployBlocktime
      default:
        return 0
    }
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="h-32 bg-[#2a2a3e] rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
            BRC-20 Terminal
          </h2>
          <p className="text-sm text-gray-400">
            Professional BRC-20 token trading and analytics
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={refetch} className="gap-2">
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase">Total Tokens</div>
            <div className="text-2xl font-bold text-[#f59e0b]">
              {stats?.totalTokens.toLocaleString() || '0'}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase">Completed</div>
            <div className="text-2xl font-bold text-green-400">
              {stats?.completedTokens.toLocaleString() || '0'}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase">Minting</div>
            <div className="text-2xl font-bold text-blue-400">
              {stats?.activeTokens.toLocaleString() || '0'}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase">Total Holders</div>
            <div className="text-2xl font-bold text-white">
              {stats?.totalHolders.toLocaleString() || '0'}
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase">Avg Holders</div>
            <div className="text-2xl font-bold text-white">
              {stats?.avgHoldersPerToken.toLocaleString() || '0'}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token List */}
        <div className="lg:col-span-1">
          <Card variant="bordered" padding="none" className="bg-[#0a0a0f] border-[#2a2a3e]">
            {/* Search & Filters */}
            <div className="p-4 border-b border-[#2a2a3e] space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  fullWidth
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterView('all')}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === 'all'
                      ? 'bg-[#f59e0b] text-white'
                      : 'bg-[#1a1a2e] text-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterView('completed')}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-[#1a1a2e] text-gray-400'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterView('minting')}
                  className={`px-3 py-1 text-xs rounded ${
                    filterView === 'minting'
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#1a1a2e] text-gray-400'
                  }`}
                >
                  Minting
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-white text-xs"
              >
                <option value="holders">Most Holders</option>
                <option value="volume">Most Active</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            {/* Token List */}
            <div className="max-h-[600px] overflow-y-auto">
              {sortedTokens?.map((token) => (
                <button
                  key={token.ticker}
                  onClick={() => setSelectedToken(token.ticker)}
                  className={`w-full p-4 border-b border-[#2a2a3e] hover:bg-[#1a1a2e] transition-colors text-left ${
                    selectedToken === token.ticker ? 'bg-[#1a1a2e]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-white">{token.ticker}</div>
                      <div className="text-xs text-gray-400">
                        {token.completeHeight > 0 ? (
                          <span className="text-green-400">✓ Completed</span>
                        ) : (
                          <span className="text-blue-400">⏳ Minting</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Holders</div>
                      <div className="font-semibold text-white">
                        {(token.holdersCount ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Supply: </span>
                      <span className="text-white">{token.max}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Minted: </span>
                      <span className="text-white">{token.minted}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Token Details */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <div className="space-y-6">
              {/* Token Info Card */}
              {tokenInfo.data && (
                <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">
                        {tokenInfo.data.ticker}
                      </h3>
                      <div className="flex items-center gap-2">
                        {tokenInfo.data.completeHeight > 0 ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                            Minting
                          </span>
                        )}
                        <a
                          href={`https://unisat.io/brc20/${tokenInfo.data.ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#f59e0b]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Inscription #</div>
                      <div className="font-mono text-white">
                        #{tokenInfo.data.inscriptionNumber}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Max Supply</div>
                      <div className="text-lg font-bold text-white">{tokenInfo.data.max}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Minted</div>
                      <div className="text-lg font-bold text-green-400">
                        {tokenInfo.data.minted}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Mint Limit</div>
                      <div className="text-lg font-bold text-white">{tokenInfo.data.limit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Decimals</div>
                      <div className="text-lg font-bold text-white">{tokenInfo.data.decimal}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[#2a2a3e] grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Holders</div>
                      <div className="text-2xl font-bold text-[#f59e0b]">
                        {tokenInfo.data.holdersCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Total Transfers</div>
                      <div className="text-2xl font-bold text-white">
                        {tokenInfo.data.historyCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Top Holders */}
              {tokenHolders.data && (
                <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Holders
                  </h4>

                  <div className="space-y-2">
                    {tokenHolders.data.detail.slice(0, 10).map((holder, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold text-gray-400 w-6">
                            #{i + 1}
                          </div>
                          <div>
                            <a
                              href={`https://mempool.space/address/${holder.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-white hover:text-[#f59e0b]"
                            >
                              {holder.address.slice(0, 8)}...{holder.address.slice(-8)}
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {holder.overallBalance}
                          </div>
                          <div className="text-xs text-gray-400">
                            {holder.availableBalance} available
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recent Activity */}
              {tokenHistory.data && (
                <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </h4>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tokenHistory.data.detail.slice(0, 20).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-2 py-1 rounded text-xs ${
                              item.type === 'deploy'
                                ? 'bg-purple-500/20 text-purple-400'
                                : item.type === 'mint'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {item.type}
                          </div>
                          <div>
                            <div className="font-mono text-xs text-white">
                              {item.from.slice(0, 6)}...{item.from.slice(-4)}
                              {item.to && (
                                <>
                                  {' → '}
                                  {item.to.slice(0, 6)}...{item.to.slice(-4)}
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Block {item.blockHeight.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-[#f59e0b]">{item.amount}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.blockHeight * 600 * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="text-center py-12">
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-bold text-white mb-2">Select a Token</h3>
                <p className="text-sm text-gray-400">
                  Choose a BRC-20 token from the list to view details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
