/**
 * useMempool Hook
 * React hook for Mempool.space API integration
 * Provides Bitcoin blockchain data, mempool stats, and fee estimates
 * ✅ CLIENT-SAFE: Uses proxy API endpoint instead of direct external calls
 */

import { useQuery } from '@tanstack/react-query'
import type {
  MempoolStats,
  RecommendedFees,
  Block,
  Transaction,
  AddressInfo,
  UTXO,
  MiningStats,
  DifficultyAdjustment,
  LightningStats,
} from '@/services/MempoolService'

// Helper function to call Mempool API proxy
async function callMempoolAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api/mempool/?endpoint=${encodeURIComponent(endpoint)}`)
  if (!response.ok) throw new Error(`Mempool API error: ${response.status}`)
  return response.json()
}

export function useMempool() {
  // ──────────────────────────────────────────────────────────────────────────
  // MEMPOOL & FEES
  // ──────────────────────────────────────────────────────────────────────────

  const mempoolStats = useQuery<MempoolStats>({
    queryKey: ['mempool', 'stats'],
    queryFn: () => callMempoolAPI<MempoolStats>('/mempool'),
    refetchInterval: 15000, // Refresh every 15s
  })

  const recommendedFees = useQuery<RecommendedFees>({
    queryKey: ['mempool', 'fees', 'recommended'],
    queryFn: () => callMempoolAPI<RecommendedFees>('/v1/fees/recommended'),
    refetchInterval: 30000, // Refresh every 30s
  })

  const feeHistogram = useQuery<number[][]>({
    queryKey: ['mempool', 'fees', 'histogram'],
    queryFn: () => callMempoolAPI<number[][]>('/mempool/fees'),
    refetchInterval: 30000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCKS
  // ──────────────────────────────────────────────────────────────────────────

  const recentBlocks = useQuery<Block[]>({
    queryKey: ['mempool', 'blocks', 'recent'],
    queryFn: () => callMempoolAPI<Block[]>('/v1/blocks'),
    refetchInterval: 60000, // Refresh every minute
  })

  const getBlock = (hashOrHeight: string | number) =>
    useQuery<Block>({
      queryKey: ['mempool', 'block', hashOrHeight],
      queryFn: () => callMempoolAPI<Block>(`/block/${hashOrHeight}`),
      enabled: !!hashOrHeight,
      staleTime: 300000, // 5 minutes for confirmed blocks
    })

  const getBlockTransactions = (hashOrHeight: string | number, startIndex = 0) =>
    useQuery<Transaction[]>({
      queryKey: ['mempool', 'block', 'transactions', hashOrHeight, startIndex],
      queryFn: () => callMempoolAPI<Transaction[]>(`/block/${hashOrHeight}/txs/${startIndex}`),
      enabled: !!hashOrHeight,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSACTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getTransaction = (txid: string) =>
    useQuery<Transaction>({
      queryKey: ['mempool', 'transaction', txid],
      queryFn: () => callMempoolAPI<Transaction>(`/tx/${txid}`),
      enabled: !!txid,
      staleTime: 300000, // 5 minutes for confirmed transactions
    })

  const getTransactionStatus = (txid: string) =>
    useQuery({
      queryKey: ['mempool', 'transaction', 'status', txid],
      queryFn: () => callMempoolAPI(`/tx/${txid}/status`),
      enabled: !!txid,
      refetchInterval: (query) => {
        // Stop refetching if transaction is confirmed
        const data = query?.state?.data as { confirmed?: boolean } | undefined
        return data?.confirmed ? false : 30000
      },
    })

  // ──────────────────────────────────────────────────────────────────────────
  // ADDRESSES
  // ──────────────────────────────────────────────────────────────────────────

  const getAddressInfo = (address: string) =>
    useQuery<AddressInfo>({
      queryKey: ['mempool', 'address', 'info', address],
      queryFn: () => callMempoolAPI<AddressInfo>(`/address/${address}`),
      enabled: !!address,
      staleTime: 60000,
    })

  const getAddressTransactions = (address: string, lastSeenTxid?: string) =>
    useQuery<Transaction[]>({
      queryKey: ['mempool', 'address', 'transactions', address, lastSeenTxid],
      queryFn: () => {
        const endpoint = lastSeenTxid
          ? `/address/${address}/txs/chain/${lastSeenTxid}`
          : `/address/${address}/txs`
        return callMempoolAPI<Transaction[]>(endpoint)
      },
      enabled: !!address,
    })

  const getAddressUtxos = (address: string) =>
    useQuery<UTXO[]>({
      queryKey: ['mempool', 'address', 'utxos', address],
      queryFn: () => callMempoolAPI<UTXO[]>(`/address/${address}/utxo`),
      enabled: !!address,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // MINING
  // ──────────────────────────────────────────────────────────────────────────

  const miningPools = useQuery<MiningStats>({
    queryKey: ['mempool', 'mining', 'pools', '1w'],
    queryFn: () => callMempoolAPI<MiningStats>('/v1/mining/pools/1w'),
    staleTime: 300000,
  })

  const getMiningPool = (slug: string) =>
    useQuery({
      queryKey: ['mempool', 'mining', 'pool', slug],
      queryFn: () => callMempoolAPI(`/v1/mining/pool/${slug}`),
      enabled: !!slug,
    })

  const difficultyAdjustment = useQuery<DifficultyAdjustment>({
    queryKey: ['mempool', 'difficulty', 'adjustment'],
    queryFn: () => callMempoolAPI<DifficultyAdjustment>('/v1/difficulty-adjustment'),
    refetchInterval: 60000,
  })

  const hashrate = useQuery<{ currentHashrate: number; currentDifficulty: number; hashrates: any[]; difficulty: any[] }>({
    queryKey: ['mempool', 'hashrate', '1w'],
    queryFn: () => callMempoolAPI('/v1/mining/hashrate/1w'),
    staleTime: 300000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // LIGHTNING NETWORK
  // ──────────────────────────────────────────────────────────────────────────

  const lightningStats = useQuery<LightningStats>({
    queryKey: ['mempool', 'lightning', 'stats'],
    queryFn: () => callMempoolAPI<LightningStats>('/v1/lightning/statistics/latest'),
    staleTime: 300000,
  })

  const lightningStatsHistory = useQuery({
    queryKey: ['mempool', 'lightning', 'history', '1m'],
    queryFn: () => callMempoolAPI('/v1/lightning/statistics/1m'),
    staleTime: 3600000, // 1 hour
  })

  // ──────────────────────────────────────────────────────────────────────────
  // PRICES
  // ──────────────────────────────────────────────────────────────────────────

  const bitcoinPrices = useQuery({
    queryKey: ['mempool', 'prices', 'current'],
    queryFn: () => callMempoolAPI('/v1/prices'),
    refetchInterval: 60000,
  })

  const historicalPrices = useQuery({
    queryKey: ['mempool', 'prices', 'historical', '1y'],
    queryFn: () => callMempoolAPI('/v1/historical-price?currency=USD&timestamp=1y'),
    staleTime: 3600000, // 1 hour
  })

  // ──────────────────────────────────────────────────────────────────────────
  // NETWORK STATS
  // ──────────────────────────────────────────────────────────────────────────

  const networkStats = useQuery({
    queryKey: ['mempool', 'network', 'stats'],
    queryFn: () => callMempoolAPI('/v1/mining/hashrate/3m'),
    refetchInterval: 60000,
  })

  const blockProductionStats = useQuery({
    queryKey: ['mempool', 'block', 'production', 'stats'],
    queryFn: () => callMempoolAPI('/v1/blocks'),
    refetchInterval: 300000, // 5 minutes
  })

  return {
    // Mempool & Fees
    mempoolStats,
    recommendedFees,
    feeHistogram,
    feeRecommendations: recommendedFees, // Alias for backward compatibility

    // Blocks
    recentBlocks,
    getBlock,
    getBlockTransactions,

    // Transactions
    getTransaction,
    getTransactionStatus,

    // Addresses
    getAddressInfo,
    getAddressTransactions,
    getAddressUtxos,

    // Mining
    miningPools,
    getMiningPool,
    difficultyAdjustment,
    hashrate,

    // Lightning
    lightningStats,
    lightningStatsHistory,

    // Prices
    bitcoinPrices,
    historicalPrices,

    // Network Stats
    networkStats,
    blockProductionStats,
  }
}
