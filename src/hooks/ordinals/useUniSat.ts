/**
 * useUniSat Hook
 * Comprehensive React hook for UniSat API integration
 * Provides access to all 61+ UniSat endpoints with React Query caching
 * ✅ CLIENT-SAFE: Uses proxy API endpoints instead of direct external calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  unisatServiceExpanded,
  type BlockchainInfo,
  type FeeRecommendation,
  type Block,
  type TransactionDetail,
  type BRC20TokenListResult,
  type BRC20TickerInfo,
  type BRC20HolderListResult,
  type CollectionStats,
  type CollectionSummary,
  type MarketListing,
  type CollectionInfo,
  type Holder,
  type PutOnParams,
  type BidParams,
  type ConfirmParams,
} from '@/services/unisatServiceExpanded'

export function useUniSat() {
  const queryClient = useQueryClient()

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCKCHAIN & BLOCKS
  // ──────────────────────────────────────────────────────────────────────────

  const blockchainInfo = useQuery<BlockchainInfo>({
    queryKey: ['unisat', 'blockchain-info'],
    queryFn: async () => {
      const response = await fetch('/api/unisat/block/latest/')
      if (!response.ok) throw new Error('Failed to fetch blockchain info')
      return response.json()
    },
    staleTime: 60000, // 1 minute
  })

  const recommendedFees = useQuery<FeeRecommendation>({
    queryKey: ['unisat', 'recommended-fees'],
    queryFn: async () => {
      // Use mempool endpoint for fees as UniSat fees endpoint may not be proxied
      const response = await fetch('/api/mempool/?endpoint=/v1/fees/recommended')
      if (!response.ok) throw new Error('Failed to fetch recommended fees')
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30s
  })

  const getBlockByHeight = (height: number) =>
    useQuery<Block>({
      queryKey: ['unisat', 'block', 'height', height],
      queryFn: async () => {
        const response = await fetch(`/api/mempool/?endpoint=/block-height/${height}`)
        if (!response.ok) throw new Error('Failed to fetch block')
        return response.json()
      },
      enabled: height > 0,
    })

  const getBlockById = (blockId: string) =>
    useQuery<Block>({
      queryKey: ['unisat', 'block', 'id', blockId],
      queryFn: async () => {
        const response = await fetch(`/api/mempool/?endpoint=/block/${blockId}`)
        if (!response.ok) throw new Error('Failed to fetch block')
        return response.json()
      },
      enabled: !!blockId,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSACTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getTransaction = (txid: string) =>
    useQuery<TransactionDetail>({
      queryKey: ['unisat', 'transaction', txid],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/tx/${txid}/`)
        if (!response.ok) throw new Error('Failed to fetch transaction')
        return response.json()
      },
      enabled: !!txid,
    })

  const getTransactionInputs = (txid: string) =>
    useQuery({
      queryKey: ['unisat', 'transaction', 'inputs', txid],
      queryFn: async () => {
        const response = await fetch(`/api/mempool/?endpoint=/tx/${txid}`)
        if (!response.ok) throw new Error('Failed to fetch transaction inputs')
        const data = await response.json()
        return data.vin || []
      },
      enabled: !!txid,
    })

  const getTransactionOutputs = (txid: string) =>
    useQuery({
      queryKey: ['unisat', 'transaction', 'outputs', txid],
      queryFn: async () => {
        const response = await fetch(`/api/mempool/?endpoint=/tx/${txid}`)
        if (!response.ok) throw new Error('Failed to fetch transaction outputs')
        const data = await response.json()
        return data.vout || []
      },
      enabled: !!txid,
    })

  const broadcastTransaction = useMutation({
    mutationFn: async (rawTx: string) => {
      const response = await fetch('/api/mempool/?endpoint=/tx', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: rawTx,
      })
      if (!response.ok) throw new Error('Failed to broadcast transaction')
      return response.text()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unisat', 'mempool'] })
    },
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ADDRESSES
  // ──────────────────────────────────────────────────────────────────────────

  const getAddressBalance = (address: string) =>
    useQuery({
      queryKey: ['unisat', 'address', 'balance', address],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/address/${address}/balance/`)
        if (!response.ok) throw new Error('Failed to fetch address balance')
        return response.json()
      },
      enabled: !!address,
      staleTime: 30000,
    })

  const getAddressUtxo = (address: string) =>
    useQuery({
      queryKey: ['unisat', 'address', 'utxo', address],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/address/${address}/utxo/`)
        if (!response.ok) throw new Error('Failed to fetch address UTXOs')
        return response.json()
      },
      enabled: !!address,
    })

  const getAddressInscriptions = (address: string) =>
    useQuery({
      queryKey: ['unisat', 'address', 'inscriptions', address],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/address/${address}/inscriptions/`)
        if (!response.ok) throw new Error('Failed to fetch address inscriptions')
        return response.json()
      },
      enabled: !!address,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // BRC-20
  // ──────────────────────────────────────────────────────────────────────────

  const brc20List = useQuery<BRC20TokenListResult>({
    queryKey: ['unisat', 'brc20', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/unisat/brc20/list/')
      if (!response.ok) throw new Error('Failed to fetch BRC20 list')
      return response.json()
    },
    staleTime: 60000,
  })

  const getBRC20Token = (ticker: string) =>
    useQuery<BRC20TickerInfo>({
      queryKey: ['unisat', 'brc20', 'token', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/info/`)
        if (!response.ok) throw new Error('Failed to fetch BRC20 token')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getBRC20Holders = (ticker: string) =>
    useQuery<BRC20HolderListResult>({
      queryKey: ['unisat', 'brc20', 'holders', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/holders/`)
        if (!response.ok) throw new Error('Failed to fetch BRC20 holders')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getBRC20History = (ticker: string) =>
    useQuery({
      queryKey: ['unisat', 'brc20', 'history', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/history/`)
        if (!response.ok) throw new Error('Failed to fetch BRC20 history')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getAddressBRC20 = (address: string) =>
    useQuery({
      queryKey: ['unisat', 'address', 'brc20', address],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/address/${address}/summary/`)
        if (!response.ok) throw new Error('Failed to fetch address BRC20')
        return response.json()
      },
      enabled: !!address,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // COLLECTIONS & MARKETPLACE
  // ──────────────────────────────────────────────────────────────────────────

  const getCollectionStats = (collectionId: string) =>
    useQuery<CollectionStats>({
      queryKey: ['unisat', 'collection', 'stats', collectionId],
      queryFn: async () => {
        // Collections endpoint may need to be created - fallback to ordinals API
        const response = await fetch(`/api/ordinals/stats/?collection=${collectionId}`)
        if (!response.ok) throw new Error('Failed to fetch collection stats')
        return response.json()
      },
      enabled: !!collectionId,
    })

  const collectionsList = useQuery<CollectionStats[]>({
    queryKey: ['unisat', 'collections', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/unisat/market/collections/')
      if (!response.ok) throw new Error('Failed to fetch collections list')
      return response.json()
    },
    staleTime: 60000,
  })

  const getCollectionSummary = (collectionId: string) =>
    useQuery<CollectionSummary>({
      queryKey: ['unisat', 'collection', 'summary', collectionId],
      queryFn: async () => {
        const response = await fetch(`/api/ordinals/stats/?collection=${collectionId}`)
        if (!response.ok) throw new Error('Failed to fetch collection summary')
        return response.json()
      },
      enabled: !!collectionId,
    })

  const getCollectionInscriptions = (collectionId: string) =>
    useQuery({
      queryKey: ['unisat', 'collection', 'inscriptions', collectionId],
      queryFn: async () => {
        const response = await fetch(`/api/ordinals/list/?collection=${collectionId}`)
        if (!response.ok) throw new Error('Failed to fetch collection inscriptions')
        return response.json()
      },
      enabled: !!collectionId,
    })

  const marketListings = useQuery<MarketListing[]>({
    queryKey: ['unisat', 'market', 'listings'],
    queryFn: async () => {
      const response = await fetch('/api/unisat/market/collections/')
      if (!response.ok) throw new Error('Failed to fetch market listings')
      return response.json()
    },
    staleTime: 30000,
  })

  const marketActions = useQuery({
    queryKey: ['unisat', 'market', 'actions'],
    queryFn: async () => {
      const response = await fetch('/api/ordinals/activity/')
      if (!response.ok) throw new Error('Failed to fetch market actions')
      return response.json()
    },
    staleTime: 30000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // COLLECTION INDEXER
  // ──────────────────────────────────────────────────────────────────────────

  const getCollectionInfo = (collectionId: string) =>
    useQuery<CollectionInfo>({
      queryKey: ['unisat', 'collection', 'info', collectionId],
      queryFn: () => unisatServiceExpanded.getCollectionInfo(collectionId),
      enabled: !!collectionId,
    })

  const getCollectionHolders = (collectionId: string) =>
    useQuery<Holder[]>({
      queryKey: ['unisat', 'collection', 'holders', collectionId],
      queryFn: () => unisatServiceExpanded.getCollectionHolders(collectionId),
      enabled: !!collectionId,
    })

  const getAddressCollections = (address: string) =>
    useQuery<CollectionInfo[]>({
      queryKey: ['unisat', 'address', 'collections', address],
      queryFn: () => unisatServiceExpanded.getAddressCollectionList(address),
      enabled: !!address,
    })

  const getAddressCollectionSummary = (address: string) =>
    useQuery({
      queryKey: ['unisat', 'address', 'collection-summary', address],
      queryFn: () => unisatServiceExpanded.getAddressCollectionSummary(address),
      enabled: !!address,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // INSCRIPTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getInscriptionInfo = (inscriptionId: string) =>
    useQuery({
      queryKey: ['unisat', 'inscription', 'info', inscriptionId],
      queryFn: () => unisatServiceExpanded.getInscriptionInfo(inscriptionId),
      enabled: !!inscriptionId,
    })

  const getInscriptionEvents = (inscriptionId: string) =>
    useQuery({
      queryKey: ['unisat', 'inscription', 'events', inscriptionId],
      queryFn: () => unisatServiceExpanded.getInscriptionEvents(inscriptionId),
      enabled: !!inscriptionId,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // MUTATIONS (Marketplace Actions)
  // ──────────────────────────────────────────────────────────────────────────

  const createListing = useMutation({
    mutationFn: (params: PutOnParams) =>
      unisatServiceExpanded.createMarketPutOn(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unisat', 'market'] })
    },
  })

  const confirmListing = useMutation({
    mutationFn: (params: ConfirmParams) =>
      unisatServiceExpanded.confirmMarketPutOn(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unisat', 'market'] })
    },
  })

  const createBid = useMutation({
    mutationFn: (params: BidParams) =>
      unisatServiceExpanded.createMarketBid(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unisat', 'market'] })
    },
  })

  const cancelListing = useMutation({
    mutationFn: (params: { orderId: string }) =>
      unisatServiceExpanded.createMarketPutOff(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unisat', 'market'] })
    },
  })

  // ──────────────────────────────────────────────────────────────────────────
  // PRICE DATA
  // ──────────────────────────────────────────────────────────────────────────

  const btcPrice = useQuery({
    queryKey: ['unisat', 'btc-price'],
    queryFn: async () => {
      const response = await fetch('/api/coingecko/?endpoint=bitcoin')
      if (!response.ok) throw new Error('Failed to fetch BTC price')
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
  })

  return {
    // Blockchain & Blocks
    blockchainInfo,
    recommendedFees,
    getBlockByHeight,
    getBlockById,

    // Transactions
    getTransaction,
    getTransactionInputs,
    getTransactionOutputs,
    broadcastTransaction,

    // Addresses
    getAddressBalance,
    getAddressUtxo,
    getAddressInscriptions,

    // BRC-20
    brc20List,
    getBRC20Token,
    getBRC20Holders,
    getBRC20History,
    getAddressBRC20,

    // Collections & Marketplace
    getCollectionStats,
    collectionsList,
    getCollectionSummary,
    getCollectionInscriptions,
    marketListings,
    marketActions,

    // Collection Indexer
    getCollectionInfo,
    getCollectionHolders,
    getAddressCollections,
    getAddressCollectionSummary,

    // Inscriptions
    getInscriptionInfo,
    getInscriptionEvents,

    // Mutations
    createListing,
    confirmListing,
    createBid,
    cancelListing,

    // Price
    btcPrice,
  }
}
