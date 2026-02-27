/**
 * usePortfolio Hook
 * Comprehensive portfolio management for Bitcoin Ordinals
 * Aggregates data from UniSat, Magic Eden, and Mempool.space
 * Uses proxy API endpoints instead of direct external calls
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export function usePortfolio(address: string | null, ordinalsAddress?: string | null) {
  const enabled = !!address
  // Ordinals/inscriptions/BRC-20/runes live on the Taproot address (bc1p...)
  // Use ordinalsAddress for those queries, fall back to payment address
  const ordAddr = ordinalsAddress || address
  const ordEnabled = !!ordAddr

  // ──────────────────────────────────────────────────────────────────────────
  // UNISAT DATA (via proxy)
  // ──────────────────────────────────────────────────────────────────────────

  const balance = useQuery({
    queryKey: ['portfolio', 'balance', address],
    queryFn: async () => {
      const response = await fetch(`/api/unisat/address/${address}/balance/`)
      if (!response.ok) throw new Error('Failed to fetch balance')
      return response.json()
    },
    enabled,
    staleTime: 30000,
  })

  const collections = useQuery({
    queryKey: ['portfolio', 'collections', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/?address=${ordAddr}`)
      if (!response.ok) throw new Error('Failed to fetch collections')
      return response.json()
    },
    enabled: ordEnabled,
  })

  // collectionSummary merged into collections - same endpoint, same data
  const collectionSummary = collections

  const inscriptions = useQuery({
    queryKey: ['portfolio', 'inscriptions', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/unisat/address/${ordAddr}/inscriptions/`)
      if (!response.ok) throw new Error('Failed to fetch inscriptions')
      return response.json()
    },
    enabled: ordEnabled,
  })

  const brc20Summary = useQuery({
    queryKey: ['portfolio', 'brc20', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/brc20/balances/${ordAddr}/`)
      if (!response.ok) throw new Error('Failed to fetch BRC20 summary')
      return response.json()
    },
    enabled: ordEnabled,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // MAGIC EDEN DATA (via proxy)
  // ──────────────────────────────────────────────────────────────────────────

  const magicEdenTokens = useQuery({
    queryKey: ['portfolio', 'magic-eden-tokens', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/magiceden/tokens/?ownerAddress=${ordAddr}`)
      if (!response.ok) throw new Error('Failed to fetch Magic Eden tokens')
      return response.json()
    },
    enabled: ordEnabled,
  })

  const rareSats = useQuery({
    queryKey: ['portfolio', 'rare-sats', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/magiceden/raresats/wallet/${ordAddr}/`)
      if (!response.ok) throw new Error('Failed to fetch rare sats')
      return response.json()
    },
    enabled: ordEnabled,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // MEMPOOL DATA (via proxy)
  // ──────────────────────────────────────────────────────────────────────────

  const addressInfo = useQuery({
    queryKey: ['portfolio', 'mempool-info', address],
    queryFn: async () => {
      const response = await fetch(`/api/mempool/?endpoint=${encodeURIComponent(`/address/${address}`)}`)
      if (!response.ok) throw new Error('Failed to fetch address info')
      return response.json()
    },
    enabled,
  })

  const utxos = useQuery({
    queryKey: ['portfolio', 'utxos', address],
    queryFn: async () => {
      const response = await fetch(`/api/mempool/?endpoint=${encodeURIComponent(`/address/${address}/utxo`)}`)
      if (!response.ok) throw new Error('Failed to fetch UTXOs')
      return response.json()
    },
    enabled,
  })

  const transactions = useQuery({
    queryKey: ['portfolio', 'transactions', address],
    queryFn: async () => {
      const response = await fetch(`/api/mempool/?endpoint=${encodeURIComponent(`/address/${address}/txs`)}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    },
    enabled,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // HIRO INSCRIPTIONS (real data for inscriptions tab)
  // ──────────────────────────────────────────────────────────────────────────

  const hiroInscriptions = useQuery({
    queryKey: ['portfolio', 'hiro-inscriptions', ordAddr],
    queryFn: async () => {
      const response = await fetch(`/api/hiro-ordinals/?address=${ordAddr}&limit=50&order=desc`)
      if (!response.ok) throw new Error('Failed to fetch Hiro inscriptions')
      return response.json()
    },
    enabled: ordEnabled,
    staleTime: 60000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // DIRECT MEMPOOL BTC BALANCE (reliable fallback)
  // ──────────────────────────────────────────────────────────────────────────

  const mempoolBalance = useQuery({
    queryKey: ['portfolio', 'mempool-balance', address],
    queryFn: async () => {
      const response = await fetch(`/api/mempool/?endpoint=${encodeURIComponent(`/address/${address}`)}`)
      if (!response.ok) throw new Error('Failed to fetch mempool balance')
      const data = await response.json()
      const chainStats = data.chain_stats || {}
      const mempoolStatsData = data.mempool_stats || {}
      const confirmed = (chainStats.funded_txo_sum || 0) - (chainStats.spent_txo_sum || 0)
      const unconfirmed = (mempoolStatsData.funded_txo_sum || 0) - (mempoolStatsData.spent_txo_sum || 0)
      return {
        confirmed,
        unconfirmed,
        total: confirmed + unconfirmed,
        txCount: chainStats.tx_count || 0,
      }
    },
    enabled,
    staleTime: 30000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // REAL BTC PRICE (from CoinGecko via internal route)
  // ──────────────────────────────────────────────────────────────────────────

  const btcPrice = useQuery({
    queryKey: ['portfolio', 'btc-price'],
    queryFn: async () => {
      const params = new URLSearchParams({
        endpoint: '/simple/price',
        params: 'ids=bitcoin&vs_currencies=usd',
      })
      const response = await fetch(`/api/coingecko/?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch BTC price')
      const data = await response.json()
      return data?.bitcoin?.usd ?? data?.data?.bitcoin?.usd ?? 0
    },
    enabled,
    staleTime: 60000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ──────────────────────────────────────────────────────────────────────────

  const portfolioSummary = useMemo(() => {
    // Balance data from UniSat has shape: { data: { satoshi, ... } } or { btcSatoshi, ... }
    const balData = balance.data?.data || balance.data
    const brc20Data = brc20Summary.data?.tokens || brc20Summary.data?.data || brc20Summary.data

    // BTC balance: prefer UniSat, fallback to Mempool
    const uniSatSatoshi = balData?.satoshi ?? balData?.btcSatoshi ?? 0
    const mempoolSatoshi = mempoolBalance.data?.total ?? 0
    const btcSatoshi = uniSatSatoshi > 0 ? uniSatSatoshi : mempoolSatoshi
    const btcBalance = btcSatoshi / 1e8

    const inscriptionCount = hiroInscriptions.data?.total || inscriptions.data?.total || 0

    // Count unique collections from multiple sources:
    // 1. From /api/portfolio response (if it has collections/assets)
    // 2. From Hiro inscriptions grouped by collection metadata
    let collectionsCount = Array.isArray(collections.data) ? collections.data.length : (collections.data?.data?.assets?.length || collections.data?.collections?.length || 0)

    // If no collections from portfolio endpoint, derive from Hiro inscription data
    // by grouping inscriptions that belong to known collections
    if (collectionsCount === 0 && hiroInscriptions.data?.results) {
      const uniqueCollections = new Set<string>()
      for (const insc of hiroInscriptions.data.results) {
        // Hiro inscriptions may have collection info in metadata
        const collName = insc.collection_name || insc.collection?.name || insc.collection_symbol
        if (collName) {
          uniqueCollections.add(collName)
        }
      }
      collectionsCount = uniqueCollections.size
    }
    const brc20Count = Array.isArray(brc20Data) ? brc20Data.length : (brc20Data?.detail?.length || brc20Summary.data?.total || 0)

    // Calculate total portfolio value
    const collectionsList = Array.isArray(collections.data) ? collections.data : (collections.data?.data?.assets || collections.data?.collections || [])
    const collectionValue = collectionsList.reduce(
      (sum: number, col: any) => sum + (col.floorValue || col.value || 0),
      0
    )

    const totalValue = btcBalance + collectionValue
    const currentBtcPrice = btcPrice.data || 0

    return {
      btcBalance,
      btcPriceUsd: currentBtcPrice,
      inscriptionCount,
      collectionsCount,
      brc20Count,
      collectionValue,
      totalValue,
      totalValueUsd: totalValue * currentBtcPrice,
      utxoCount: balData?.utxoCount || balData?.pendingUtxoCount || utxos.data?.length || 0,
      inscriptionUtxoCount: balData?.inscriptionUtxoCount || 0,
    }
  }, [balance.data, collections.data, brc20Summary.data, inscriptions.data, hiroInscriptions.data, utxos.data, mempoolBalance.data, btcPrice.data])

  const performance = useMemo(() => {
    if (!addressInfo.data) {
      return null
    }

    const chainStats = addressInfo.data.chain_stats
    if (!chainStats) return null

    const totalReceived = (chainStats.funded_txo_sum || 0) / 1e8
    const totalSent = (chainStats.spent_txo_sum || 0) / 1e8
    const netBalance = totalReceived - totalSent
    const txCount = chainStats.tx_count || 0

    return {
      totalReceived,
      totalSent,
      netBalance,
      txCount,
      avgTxValue: txCount > 0 ? totalReceived / txCount : 0,
    }
  }, [addressInfo.data])

  const holdings = useMemo(() => {
    // Handle different response shapes from /api/portfolio
    // Shape 1: { data: { assets: [...] } } (from portfolio route)
    // Shape 2: { collections: [...] }
    // Shape 3: direct array
    const raw = collections.data
    const collectionsList =
      Array.isArray(raw) ? raw :
      (raw?.data?.assets?.filter((a: any) => a.type === 'ordinal' || a.type === 'rune') || []).length > 0
        ? raw.data.assets
        : (raw?.collections || [])
    if (!collectionsList.length) return []

    return collectionsList.map((collection: any) => ({
      id: collection.collectionId || collection.id,
      name: collection.name || 'Unknown Collection',
      symbol: collection.symbol || collection.collectionSymbol || '',
      itemCount: collection.count || collection.balance || 0,
      floorPrice: collection.floorPrice || collection.price || 0,
      totalValue: (collection.count || collection.balance || 0) * (collection.floorPrice || collection.price || 0),
    }))
  }, [collections.data])

  const brc20Holdings = useMemo(() => {
    const raw = brc20Summary.data
    // Handle different response shapes:
    // Hiro route: { tokens: [...], total: N }
    // UniSat shape: { data: { detail: [...] } }
    const detail =
      raw?.tokens ||
      raw?.data?.detail ||
      (Array.isArray(raw?.data) ? raw.data : null) ||
      (Array.isArray(raw) ? raw : [])
    if (!detail.length) return []

    return detail.map((token: any) => ({
      ticker: token.ticker,
      balance: token.overallBalance || token.balance || '0',
      availableBalance: token.availableBalance || token.available || '0',
      transferableBalance: token.transferableBalance || token.transferrable || '0',
    }))
  }, [brc20Summary.data])

  // Use Hiro inscriptions for the inscriptions tab (has content URIs)
  const inscriptionItems = useMemo(() => {
    if (hiroInscriptions.data?.results) {
      return {
        tokens: hiroInscriptions.data.results.map((insc: any) => ({
          inscriptionNumber: insc.number,
          contentURI: `https://ordinals.hiro.so/inscription/${insc.id}/content`,
          meta: { name: `Inscription #${insc.number}` },
          id: insc.id,
          contentType: insc.content_type,
        })),
        total: hiroInscriptions.data.total,
      }
    }
    return magicEdenTokens.data || { tokens: [], total: 0 }
  }, [hiroInscriptions.data, magicEdenTokens.data])

  // Show loading only when ALL critical queries are still loading (no data at all yet)
  const isLoading =
    (balance.isLoading && mempoolBalance.isLoading) &&
    hiroInscriptions.isLoading

  // Show error only when ALL data sources failed
  const isError =
    (balance.isError && mempoolBalance.isError) &&
    hiroInscriptions.isError &&
    brc20Summary.isError

  return {
    // Raw Data
    balance: balance.data,
    collections: collections.data,
    collectionSummary: collectionSummary.data,
    inscriptions: inscriptions.data,
    brc20Summary: brc20Summary.data,
    magicEdenTokens: inscriptionItems,
    rareSats: rareSats.data,
    addressInfo: addressInfo.data,
    utxos: utxos.data,
    transactions: transactions.data,

    // Computed Values
    portfolioSummary,
    performance,
    holdings,
    brc20Holdings,

    // Loading States
    isLoading,
    isError,

    // Individual Loading States
    balanceLoading: balance.isLoading,
    collectionsLoading: collections.isLoading,
    brc20Loading: brc20Summary.isLoading,

    // Refetch Functions
    refetchAll: () => {
      balance.refetch()
      mempoolBalance.refetch()
      btcPrice.refetch()
      collections.refetch()
      inscriptions.refetch()
      brc20Summary.refetch()
      magicEdenTokens.refetch()
      rareSats.refetch()
      addressInfo.refetch()
      utxos.refetch()
      transactions.refetch()
      hiroInscriptions.refetch()
    },
  }
}
