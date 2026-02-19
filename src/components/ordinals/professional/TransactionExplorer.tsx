/**
 * Transaction Explorer - Professional Component
 * Advanced Bitcoin transaction analysis and exploration
 * Includes real-time mempool data and recent minting activity from Hiro API
 */

'use client'

import { useState, useEffect } from 'react'
import { useMempool } from '@/hooks/ordinals/useMempool'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import {
  Search,
  Activity,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap,
  ArrowRight,
  Copy,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
// Types for Hiro Inscriptions API
// ──────────────────────────────────────────────────────────────────────────

interface HiroInscription {
  id: string
  number: number
  address: string
  genesis_address: string
  genesis_block_height: number
  genesis_block_hash: string
  genesis_tx_id: string
  genesis_fee: string
  genesis_timestamp: number
  content_type: string
  content_length: number
  mime_type: string
  curse_type: string | null
  recursive: boolean
  recursion_refs: string[] | null
  tx_id: string
  location: string
  output: string
  value: string
  offset: string
  timestamp: number
}

interface HiroInscriptionsResponse {
  limit: number
  offset: number
  total: number
  results: HiroInscription[]
}

// ──────────────────────────────────────────────────────────────────────────
// Hook for recent minting activity
// ──────────────────────────────────────────────────────────────────────────

function useRecentMints() {
  return useQuery<HiroInscriptionsResponse>({
    queryKey: ['hiro', 'inscriptions', 'recent'],
    queryFn: async () => {
      // Use our proxy API route instead of calling Hiro directly from the client
      // This ensures the API key is applied server-side
      const response = await fetch(
        '/api/ordinals/inscriptions?order=desc&limit=15&order_by=genesis_block_height'
      )
      if (!response.ok) throw new Error(`Inscriptions API error: ${response.status}`)
      const json = await response.json()
      if (!json.success) throw new Error(json.error || 'API error')
      // Transform our API response format to match HiroInscriptionsResponse
      return {
        limit: json.limit || 15,
        offset: json.offset || 0,
        total: json.total || 0,
        results: Array.isArray(json.data) ? json.data.map((item: Record<string, unknown>) => ({
          ...item,
          // The API route already converts timestamps to ms; store as genesis_timestamp
          // The component handles both seconds and ms via the < 1e12 check
          genesis_timestamp: item.timestamp || item.genesis_timestamp || 0,
          mime_type: item.mime_type || item.content_type || 'unknown',
        })) : [],
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Helper: format content type for display
// ──────────────────────────────────────────────────────────────────────────

function formatContentType(mimeType: string): { label: string; color: string } {
  if (mimeType.startsWith('image/')) return { label: 'Image', color: 'text-blue-400' }
  if (mimeType.startsWith('text/')) return { label: 'Text', color: 'text-green-400' }
  if (mimeType.startsWith('application/json')) return { label: 'JSON', color: 'text-yellow-400' }
  if (mimeType.startsWith('video/')) return { label: 'Video', color: 'text-purple-400' }
  if (mimeType.startsWith('audio/')) return { label: 'Audio', color: 'text-pink-400' }
  if (mimeType.includes('html')) return { label: 'HTML', color: 'text-orange-400' }
  return { label: mimeType.split('/')[1] || 'Unknown', color: 'text-gray-400' }
}

// ──────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────

export default function TransactionExplorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'tx' | 'block' | 'address'>('tx')

  const {
    mempoolStats,
    recommendedFees,
    recentBlocks,
    hashrate,
    difficultyAdjustment,
  } = useMempool()

  // Extract .data from React Query objects
  const mempoolInfo = mempoolStats.data
  const feesData = recommendedFees.data
  const blocksData = Array.isArray(recentBlocks.data) ? recentBlocks.data : []
  const difficultyData = difficultyAdjustment.data
  const hashrateData = hashrate.data as { currentHashrate?: number; currentDifficulty?: number } | undefined

  // Recent minting activity from Hiro
  const recentMints = useRecentMints()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    // Open in mempool.space based on search type
    const baseUrl = 'https://mempool.space'
    const path =
      searchType === 'tx'
        ? `/tx/${searchQuery}`
        : searchType === 'block'
          ? `/block/${searchQuery}`
          : `/address/${searchQuery}`
    window.open(`${baseUrl}${path}`, '_blank')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          Transaction Explorer
        </h2>
        <p className="text-sm text-gray-400">
          Advanced Bitcoin blockchain analysis and transaction tracking
        </p>
      </div>

      {/* Search Bar */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter transaction ID, block hash, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex items-center gap-2">
            {(['tx', 'block', 'address'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  searchType === type
                    ? 'bg-[#f59e0b] text-black'
                    : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
          <Button variant="primary" size="md" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Mempool Size
              </div>
              <div className="text-2xl font-bold text-[#f59e0b]">
                {mempoolInfo?.vsize ? (mempoolInfo.vsize / 1_000_000).toFixed(2) : '0.00'} MB
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mempoolInfo?.count?.toLocaleString() || '0'} transactions
              </div>
            </div>
            <Activity className="w-8 h-8 text-[#f59e0b] opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Recommended Fee
              </div>
              <div className="text-2xl font-bold text-green-400">
                {feesData?.fastestFee || '0'} sat/vB
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ~{feesData?.minimumFee || '0'} sat/vB minimum
              </div>
            </div>
            <Zap className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Network Difficulty
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {hashrateData?.currentDifficulty
                  ? (hashrateData.currentDifficulty / 1e12).toFixed(2)
                  : blocksData[0]?.difficulty
                    ? (blocksData[0].difficulty / 1e12).toFixed(2)
                    : '0.00'}T
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Next:{' '}
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
                Network Hashrate
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {hashrateData?.currentHashrate
                  ? (hashrateData.currentHashrate / 1e18).toFixed(2)
                  : '0.00'} EH/s
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Difficulty:{' '}
                {hashrateData?.currentDifficulty
                  ? (hashrateData.currentDifficulty / 1e12).toFixed(2)
                  : '0.00'}T
              </div>
            </div>
            <Activity className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Recent Minting Activity */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Recent Minting Activity
            </h3>
            {recentMints.data && (
              <span className="text-xs text-gray-500 ml-2">
                {recentMints.data.total.toLocaleString()} total inscriptions
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {recentMints.isFetching && (
              <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />
            )}
            <a
              href="https://ordinals.hiro.so/inscriptions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#f59e0b] hover:underline flex items-center gap-1"
            >
              View All <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {recentMints.isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-[#0a0a0f] rounded border border-[#2a2a3e] animate-pulse"
              />
            ))}
          </div>
        ) : recentMints.isError ? (
          <div className="flex items-center gap-3 text-red-400 p-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Failed to load recent mints. Will retry automatically.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.isArray(recentMints.data?.results) && recentMints.data.results.map((inscription) => {
              const contentInfo = formatContentType(inscription.mime_type || inscription.content_type || 'unknown')
              // Handle both UNIX seconds and milliseconds
              const genesisMs = inscription.genesis_timestamp < 1e12
                ? inscription.genesis_timestamp * 1000
                : inscription.genesis_timestamp
              const timeSince = Math.floor(
                (Date.now() - genesisMs) / 1000
              )
              const timeStr =
                timeSince < 60
                  ? `${timeSince}s ago`
                  : timeSince < 3600
                    ? `${Math.floor(timeSince / 60)}m ago`
                    : timeSince < 86400
                      ? `${Math.floor(timeSince / 3600)}h ago`
                      : `${Math.floor(timeSince / 86400)}d ago`

              return (
                <div
                  key={inscription.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e] hover:border-[#f59e0b]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Content type icon */}
                    <div className="w-10 h-10 bg-[#1a1a2e] border border-[#2a2a3e] rounded flex items-center justify-center">
                      {inscription.mime_type.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Flame className="w-5 h-5 text-orange-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          #{inscription.number.toLocaleString()}
                        </span>
                        <span className={`text-xs font-semibold ${contentInfo.color}`}>
                          {contentInfo.label}
                        </span>
                        {inscription.recursive && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                            Recursive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono">
                          {inscription.genesis_tx_id.slice(0, 10)}...
                          {inscription.genesis_tx_id.slice(-6)}
                        </span>
                        <span>|</span>
                        <span>{(inscription.content_length / 1024).toFixed(1)} KB</span>
                        <span>|</span>
                        <span>Block {inscription.genesis_block_height.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{timeStr}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        Fee: {(parseInt(inscription.genesis_fee) / 1e8).toFixed(6)} BTC
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(inscription.id)}
                        className="p-1.5 hover:bg-[#2a2a3e] rounded transition-colors"
                        title="Copy inscription ID"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <a
                        href={`https://ordinals.hiro.so/inscription/${inscription.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-[#2a2a3e] rounded transition-colors"
                        title="View on Hiro Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

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
              <div
                key={i}
                className="h-16 bg-[#0a0a0f] rounded border border-[#2a2a3e] animate-pulse"
              />
            ))}
          </div>
        ) : recentBlocks.isError ? (
          <div className="flex items-center gap-3 text-red-400 p-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Failed to load blocks. Will retry automatically.</span>
          </div>
        ) : blocksData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No block data available. Waiting for mempool.space API...
          </div>
        ) : (
          <div className="space-y-2">
            {blocksData.slice(0, 10).map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded border border-[#2a2a3e] hover:border-[#f59e0b] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Height</div>
                    <div className="font-bold text-white">{block.height?.toLocaleString()}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                  <div>
                    <div className="font-mono text-sm text-[#f59e0b] mb-1">
                      {block.id?.slice(0, 16)}...{block.id?.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {block.timestamp ? new Date(block.timestamp * 1000).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {(block.tx_count || 0).toLocaleString()} txs
                  </div>
                  <div className="text-xs text-gray-500">
                    {block.size ? (block.size / 1_000_000).toFixed(2) : '0.00'} MB
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(block.id)}
                  className="p-2 hover:bg-[#2a2a3e] rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Fee Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-green-500/30">
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              Economy Fee
            </div>
            <div className="text-3xl font-bold text-green-400">
              {feesData?.economyFee || '0'}
            </div>
            <div className="text-xs text-gray-500">sat/vB</div>
            <div className="text-xs text-gray-400 mt-2">
              ~60 minutes confirmation
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#f59e0b]/30">
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              Standard Fee
            </div>
            <div className="text-3xl font-bold text-[#f59e0b]">
              {feesData?.hourFee || '0'}
            </div>
            <div className="text-xs text-gray-500">sat/vB</div>
            <div className="text-xs text-gray-400 mt-2">
              ~30 minutes confirmation
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/30">
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              Priority Fee
            </div>
            <div className="text-3xl font-bold text-red-400">
              {feesData?.fastestFee || '0'}
            </div>
            <div className="text-xs text-gray-500">sat/vB</div>
            <div className="text-xs text-gray-400 mt-2">
              Next block confirmation
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
