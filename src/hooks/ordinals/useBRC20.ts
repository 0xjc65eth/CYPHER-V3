/**
 * useBRC20 Hook
 * Specialized hook for BRC-20 token data and operations
 * ✅ CLIENT-SAFE: Uses proxy API endpoints instead of direct external calls
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type {
  BRC20TokenListResult,
  BRC20TickerInfo,
  BRC20HolderListResult,
  BRC20HistoryResult,
} from '@/services/unisatServiceExpanded'

export function useBRC20() {
  // ──────────────────────────────────────────────────────────────────────────
  // TOKEN LIST
  // ──────────────────────────────────────────────────────────────────────────

  const tokenList = useQuery<BRC20TokenListResult>({
    queryKey: ['brc20', 'token-list'],
    queryFn: async () => {
      const response = await fetch('/api/unisat/brc20/list/')
      if (!response.ok) throw new Error('Failed to fetch BRC20 list')
      return response.json()
    },
    staleTime: 60000, // 1 minute
  })

  // ──────────────────────────────────────────────────────────────────────────
  // TOKEN DETAILS
  // ──────────────────────────────────────────────────────────────────────────

  const getTokenInfo = (ticker: string) =>
    useQuery<BRC20TickerInfo>({
      queryKey: ['brc20', 'token-info', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/info/`)
        if (!response.ok) throw new Error('Failed to fetch token info')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getTokenHolders = (ticker: string) =>
    useQuery<BRC20HolderListResult>({
      queryKey: ['brc20', 'token-holders', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/holders/`)
        if (!response.ok) throw new Error('Failed to fetch token holders')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getTokenHistory = (ticker: string) =>
    useQuery<BRC20HistoryResult>({
      queryKey: ['brc20', 'token-history', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/${ticker}/history/`)
        if (!response.ok) throw new Error('Failed to fetch token history')
        return response.json()
      },
      enabled: !!ticker,
    })

  const getTokenTxHistory = (ticker: string) =>
    useQuery({
      queryKey: ['brc20', 'token-tx-history', ticker],
      queryFn: async () => {
        const response = await fetch(`/api/brc20/activity/?ticker=${ticker}`)
        if (!response.ok) throw new Error('Failed to fetch token tx history')
        return response.json()
      },
      enabled: !!ticker,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // ADDRESS-SPECIFIC
  // ──────────────────────────────────────────────────────────────────────────

  const getAddressTokens = (address: string) =>
    useQuery({
      queryKey: ['brc20', 'address-tokens', address],
      queryFn: async () => {
        const response = await fetch(`/api/brc20/balances/${address}/`)
        if (!response.ok) throw new Error('Failed to fetch address tokens')
        return response.json()
      },
      enabled: !!address,
    })

  const getAddressTokenInfo = (address: string, ticker: string) =>
    useQuery({
      queryKey: ['brc20', 'address-token-info', address, ticker],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/brc20/address/${address}/${ticker}/`)
        if (!response.ok) throw new Error('Failed to fetch address token info')
        return response.json()
      },
      enabled: !!address && !!ticker,
    })

  const getAddressTokenHistory = (address: string, ticker: string) =>
    useQuery({
      queryKey: ['brc20', 'address-token-history', address, ticker],
      queryFn: async () => {
        const response = await fetch(`/api/brc20/activity/?address=${address}&ticker=${ticker}`)
        if (!response.ok) throw new Error('Failed to fetch address token history')
        return response.json()
      },
      enabled: !!address && !!ticker,
    })

  const getTransferableInscriptions = (address: string) =>
    useQuery({
      queryKey: ['brc20', 'transferable-inscriptions', address],
      queryFn: async () => {
        const response = await fetch(`/api/brc20/balances/${address}/?transferable=true`)
        if (!response.ok) throw new Error('Failed to fetch transferable inscriptions')
        return response.json()
      },
      enabled: !!address,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ──────────────────────────────────────────────────────────────────────────

  const topTokens = useMemo(() => {
    if (!tokenList.data?.detail) return []

    return tokenList.data.detail
      .sort((a, b) => b.holdersCount - a.holdersCount)
      .slice(0, 20)
  }, [tokenList.data])

  const recentTokens = useMemo(() => {
    if (!tokenList.data?.detail) return []

    return tokenList.data.detail
      .sort((a, b) => b.deployBlocktime - a.deployBlocktime)
      .slice(0, 20)
  }, [tokenList.data])

  const activeTokens = useMemo(() => {
    if (!tokenList.data?.detail) return []

    return tokenList.data.detail
      .filter((token) => token.completeHeight > 0)
      .sort((a, b) => b.historyCount - a.historyCount)
      .slice(0, 20)
  }, [tokenList.data])

  const stats = useMemo(() => {
    if (!tokenList.data?.detail) return null

    const total = tokenList.data.total
    const completed = tokenList.data.detail.filter(
      (t) => t.completeHeight > 0
    ).length
    const totalHolders = tokenList.data.detail.reduce(
      (sum, t) => sum + t.holdersCount,
      0
    )

    return {
      totalTokens: total,
      completedTokens: completed,
      activeTokens: total - completed,
      totalHolders,
      avgHoldersPerToken: total > 0 ? Math.round(totalHolders / total) : 0,
    }
  }, [tokenList.data])

  return {
    // Raw Data
    tokenList: tokenList.data,
    topTokens,
    recentTokens,
    activeTokens,
    stats,

    // Query Functions
    getTokenInfo,
    getTokenHolders,
    getTokenHistory,
    getTokenTxHistory,
    getAddressTokens,
    getAddressTokenInfo,
    getAddressTokenHistory,
    getTransferableInscriptions,

    // Loading States
    isLoading: tokenList.isLoading,
    isError: tokenList.isError,

    // Refetch
    refetch: tokenList.refetch,
  }
}
