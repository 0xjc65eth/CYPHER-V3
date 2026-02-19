/**
 * Block Explorer - Professional Component
 * Advanced Bitcoin blockchain explorer with detailed block analysis
 */

'use client'

import { useState } from 'react'
import { useMempool } from '@/hooks/ordinals/useMempool'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import {
  Blocks,
  Search,
  TrendingUp,
  Clock,
  Activity,
  Zap,
  Database,
  Hash,
  ArrowRight,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function BlockExplorer() {
  const [searchHeight, setSearchHeight] = useState('')
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())

  // ✅ FIXED: Correctly destructure React Query objects from useMempool()
  const {
    recentBlocks,        // React Query object
    mempoolStats,        // React Query object (was: mempoolInfo)
    difficultyAdjustment, // React Query object (was: difficulty)
    hashrate,            // React Query object
  } = useMempool()

  // Extract data from React Query objects
  const blocksData = Array.isArray(recentBlocks.data) ? recentBlocks.data : []
  const mempoolData = mempoolStats.data
  const difficultyData = difficultyAdjustment.data
  const hashrateData = hashrate.data as { currentHashrate?: number; currentDifficulty?: number } | undefined
  const latestBlockHeight = blocksData[0]?.height

  const isLoading = recentBlocks.isLoading || mempoolStats.isLoading

  const handleSearch = () => {
    if (searchHeight) {
      window.open(`https://mempool.space/block/${searchHeight}`, '_blank')
    }
  }

  const toggleBlockExpansion = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Blocks className="w-7 h-7 text-[#f59e0b]" />
          Block Explorer
        </h2>
        <p className="text-sm text-gray-400">
          Real-time Bitcoin blockchain analysis and block inspection
        </p>
      </div>

      {/* Search */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Enter block height or hash..."
            value={searchHeight}
            onChange={(e) => setSearchHeight(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="primary" size="md" onClick={handleSearch}>
            Search Block
          </Button>
        </div>
      </Card>

      {/* Network Overview */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="h-24 bg-[#2a2a3e] rounded animate-pulse"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                  Latest Block
                </div>
                <div className="text-2xl font-bold text-[#f59e0b]">
                  {latestBlockHeight?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Current height</div>
              </div>
              <Blocks className="w-8 h-8 text-[#f59e0b] opacity-50" />
            </div>
          </Card>

          <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                  Network Hashrate
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {hashrateData?.currentHashrate
                    ? (hashrateData.currentHashrate / 1e18).toFixed(2)
                    : '0.00'} EH/s
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {hashrateData?.currentHashrate
                    ? ((hashrateData.currentHashrate / 1e18) * 24 * 60).toFixed(0)
                    : '0'}{' '}
                  blocks/day est.
                </div>
              </div>
              <Zap className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </Card>

          <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                  Difficulty
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {hashrateData?.currentDifficulty
                    ? (hashrateData.currentDifficulty / 1e12).toFixed(2)
                    : blocksData[0]?.difficulty
                      ? (blocksData[0].difficulty / 1e12).toFixed(2)
                      : '0.00'}T
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Next adjust:{' '}
                  {difficultyData?.estimatedRetargetDate
                    ? new Date(difficultyData.estimatedRetargetDate).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </Card>

          <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                  Mempool Size
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {mempoolData?.count?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {mempoolData?.vsize
                    ? (mempoolData.vsize / 1_000_000).toFixed(2)
                    : '0.00'}{' '}
                  MB
                </div>
              </div>
              <Database className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </Card>
        </div>
      )}

      {/* Recent Blocks */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">
            Recent Blocks
          </h3>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>

        {recentBlocks.isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#0a0a0f] rounded border border-[#2a2a3e] animate-pulse" />
            ))}
          </div>
        ) : recentBlocks.isError ? (
          <div className="text-center py-8 text-red-400 text-sm">
            Failed to load blocks from mempool.space. Will retry automatically.
          </div>
        ) : blocksData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No block data available. Waiting for mempool.space API...
          </div>
        ) : (
        <div className="space-y-2">
          {blocksData.slice(0, 20).map((block) => {
            const isExpanded = expandedBlocks.has(block.id)
            const avgFeeRate = block.extras?.totalFees && block.weight
              ? ((block.extras.totalFees * 1000) / (block.weight / 4)).toFixed(2)
              : '0.00'

            return (
              <div key={block.id} className="border border-[#2a2a3e] rounded overflow-hidden">
                {/* Block Header */}
                <div
                  className="flex items-center justify-between p-4 bg-[#0a0a0f] hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                  onClick={() => toggleBlockExpansion(block.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Height</div>
                      <div className="font-bold text-white text-lg">
                        {block.height}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-600" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-3 h-3 text-gray-500" />
                        <div className="font-mono text-sm text-[#f59e0b]">
                          {block.id.slice(0, 20)}...{block.id.slice(-12)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(block.id)
                          }}
                          className="p-1 hover:bg-[#2a2a3e] rounded transition-colors"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        {block.timestamp ? new Date(block.timestamp * 1000).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Transactions</div>
                      <div className="font-semibold text-white">
                        {(block.tx_count || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400">Size</div>
                      <div className="font-semibold text-white">
                        {block.size ? (block.size / 1_000_000).toFixed(2) : '0.00'} MB
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400">Fees</div>
                      <div className="font-semibold text-green-400">
                        {block.extras?.totalFees
                          ? (block.extras.totalFees / 1e8).toFixed(4)
                          : '0.0000'}{' '}
                        BTC
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Block Details */}
                {isExpanded && (
                  <div className="p-4 bg-[#0a0a0f] border-t border-[#2a2a3e]">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Version</div>
                        <div className="font-semibold text-white">{block.version}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Weight</div>
                        <div className="font-semibold text-white">
                          {(block.weight || 0).toLocaleString()} WU
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Nonce</div>
                        <div className="font-semibold text-white font-mono text-sm">
                          {block.nonce ?? 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Difficulty</div>
                        <div className="font-semibold text-white">
                          {block.difficulty
                            ? (block.difficulty / 1e12).toFixed(2) + 'T'
                            : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Avg Fee Rate</div>
                        <div className="font-semibold text-green-400">
                          {avgFeeRate} sat/vB
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Block Reward</div>
                        <div className="font-semibold text-[#f59e0b]">
                          {block.extras?.reward
                            ? (block.extras.reward / 1e8).toFixed(2)
                            : '6.25'}{' '}
                          BTC
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Merkle Root</div>
                        <div className="font-mono text-xs text-white truncate">
                          {block.merkle_root ? `${block.merkle_root.slice(0, 16)}...` : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-400 mb-1">Actions</div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://mempool.space/block/${block.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#2a2a3e] hover:bg-[#f59e0b] rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-white" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(block.id)
                            }}
                            className="p-1.5 bg-[#2a2a3e] hover:bg-[#f59e0b] rounded transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Previous Block Link */}
                    <div className="mt-4 pt-4 border-t border-[#2a2a3e]">
                      <div className="text-xs text-gray-400 mb-1">Previous Block</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm text-gray-500">
                          {block.previousblockhash?.slice(0, 20)}...
                          {block.previousblockhash?.slice(-12)}
                        </div>
                        {block.previousblockhash && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(block.previousblockhash)
                            }}
                            className="p-1 hover:bg-[#2a2a3e] rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}
      </Card>

      {/* Mining Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            Mining Pool Distribution
          </h3>
          {blocksData.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No mining data available yet.
            </div>
          ) : (
            <div className="space-y-3">
              {blocksData.slice(0, 10).map((block) => {
                const poolName = block.extras?.pool?.name || 'Unknown'

                return (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a3e] rounded flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#f59e0b]" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{poolName}</div>
                        <div className="text-xs text-gray-400">Block {block.height?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-400">
                        {block.extras?.totalFees
                          ? (block.extras.totalFees / 1e8).toFixed(4)
                          : '0.0000'}{' '}
                        BTC
                      </div>
                      <div className="text-xs text-gray-500">Fees</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            Difficulty Adjustment
          </h3>
          {!difficultyData ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              Loading difficulty adjustment data...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Current Difficulty</div>
                  <div className="text-xl font-bold text-white">
                    {hashrateData?.currentDifficulty
                      ? (hashrateData.currentDifficulty / 1e12).toFixed(2)
                      : blocksData[0]?.difficulty
                        ? (blocksData[0].difficulty / 1e12).toFixed(2)
                        : '0.00'}T
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Progress to Next</div>
                  <div className="text-xl font-bold text-[#f59e0b]">
                    {difficultyData.progressPercent?.toFixed(1) || '0.0'}%
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-2">Adjustment Progress</div>
                <div className="w-full bg-[#2a2a3e] rounded-full h-2">
                  <div
                    className="bg-[#f59e0b] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${difficultyData.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Blocks Remaining</div>
                  <div className="text-lg font-semibold text-white">
                    {difficultyData.remainingBlocks || '0'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Estimated Date</div>
                  <div className="text-lg font-semibold text-white">
                    {difficultyData.estimatedRetargetDate
                      ? new Date(
                          difficultyData.estimatedRetargetDate
                        ).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2a2a3e]">
                <div className="text-xs text-gray-400 mb-1">Time Difference</div>
                <div className="text-lg font-semibold text-white">
                  {difficultyData.difficultyChange
                    ? `${difficultyData.difficultyChange > 0 ? '+' : ''}${difficultyData.difficultyChange.toFixed(2)}%`
                    : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
