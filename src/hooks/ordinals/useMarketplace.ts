/**
 * useMarketplace Hook
 * Comprehensive marketplace data and trading operations
 * Integrates UniSat Marketplace and Magic Eden
 * ✅ CLIENT-SAFE: Uses proxy API endpoints instead of direct external calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type {
  MarketListing,
  MarketAction,
  PutOnParams,
  ConfirmParams,
  BidParams,
} from '@/services/unisatServiceExpanded'

export function useMarketplace() {
  const queryClient = useQueryClient()

  // ──────────────────────────────────────────────────────────────────────────
  // UNISAT MARKETPLACE
  // ──────────────────────────────────────────────────────────────────────────

  const unisatListings = useQuery<MarketListing[]>({
    queryKey: ['marketplace', 'unisat', 'listings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/unisat/market/collections/')
        if (!response.ok) return [] // Gracefully handle missing route
        const json = await response.json()
        return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []
      } catch {
        return [] // UniSat proxy route may not exist
      }
    },
    staleTime: 30000,
    retry: false, // Don't retry if route doesn't exist
  })

  const marketActions = useQuery<MarketAction[]>({
    queryKey: ['marketplace', 'unisat', 'actions'],
    queryFn: async () => {
      const response = await fetch('/api/ordinals/activity/')
      if (!response.ok) throw new Error('Failed to fetch market actions')
      const json = await response.json()
      return Array.isArray(json.data) ? json.data : []
    },
    staleTime: 30000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // MAGIC EDEN MARKETPLACE
  // ──────────────────────────────────────────────────────────────────────────

  const magicEdenActivities = useQuery({
    queryKey: ['marketplace', 'magic-eden', 'activities'],
    queryFn: async () => {
      const response = await fetch('/api/ordinals/activity/')
      if (!response.ok) throw new Error('Failed to fetch Magic Eden activities')
      const json = await response.json()
      return Array.isArray(json.data) ? json.data : []
    },
    staleTime: 30000,
  })

  const rareSatListings = useQuery({
    queryKey: ['marketplace', 'rare-sats', 'listings'],
    queryFn: async () => {
      const response = await fetch('/api/rare-sats/categories/')
      if (!response.ok) throw new Error('Failed to fetch rare sat listings')
      return response.json()
    },
    staleTime: 30000,
  })

  // ──────────────────────────────────────────────────────────────────────────
  // COLLECTION-SPECIFIC
  // ──────────────────────────────────────────────────────────────────────────

  const getCollectionListings = (collectionId: string) =>
    useQuery<MarketListing[]>({
      queryKey: ['marketplace', 'collection-listings', collectionId],
      queryFn: async () => {
        const response = await fetch(`/api/unisat/market/listings/?collectionId=${encodeURIComponent(collectionId)}&limit=100`)
        if (!response.ok) throw new Error('Failed to fetch collection listings')
        const data = await response.json()
        return data.data || data || []
      },
      enabled: !!collectionId,
    })

  const getCollectionTokens = (collectionSymbol: string) =>
    useQuery({
      queryKey: ['marketplace', 'collection-tokens', collectionSymbol],
      queryFn: async () => {
        const response = await fetch(`/api/magiceden/collections/${encodeURIComponent(collectionSymbol)}/tokens/?limit=100`)
        if (!response.ok) throw new Error('Failed to fetch collection tokens')
        const data = await response.json()
        return data.data || data || []
      },
      enabled: !!collectionSymbol,
    })

  // ──────────────────────────────────────────────────────────────────────────
  // MUTATIONS (Trading Operations)
  // ──────────────────────────────────────────────────────────────────────────

  const postMarketAction = async (action: string, params: Record<string, unknown>) => {
    const response = await fetch('/api/ordinals/trade/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    })
    if (!response.ok) throw new Error(`Market action "${action}" failed`)
    return response.json()
  }

  const createListing = useMutation({
    mutationFn: (params: PutOnParams) => postMarketAction('putOn', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const confirmListing = useMutation({
    mutationFn: (params: ConfirmParams) => postMarketAction('confirmPutOn', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const createBid = useMutation({
    mutationFn: (params: BidParams) => postMarketAction('bid', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const confirmBid = useMutation({
    mutationFn: (params: ConfirmParams) => postMarketAction('confirmBid', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const cancelListing = useMutation({
    mutationFn: (params: { orderId: string }) => postMarketAction('putOff', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const confirmCancel = useMutation({
    mutationFn: (params: ConfirmParams) => postMarketAction('confirmPutOff', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const modifyPrice = useMutation({
    mutationFn: (params: { orderId: string; newPrice: number }) => postMarketAction('modifyPrice', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  // ──────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ──────────────────────────────────────────────────────────────────────────

  const recentSales = useMemo(() => {
    const actions = Array.isArray(marketActions.data) ? marketActions.data : []
    if (!actions.length) return []

    return actions
      .filter((action) => action.type === 'sale')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
  }, [marketActions.data])

  const recentListings = useMemo(() => {
    const actions = Array.isArray(marketActions.data) ? marketActions.data : []
    if (!actions.length) return []

    return actions
      .filter((action) => action.type === 'list')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
  }, [marketActions.data])

  const activeListings = useMemo(() => {
    if (!unisatListings.data) return []

    return unisatListings.data
      .filter((listing) => listing.status === 'active')
      .sort((a, b) => a.price - b.price)
  }, [unisatListings.data])

  const stats = useMemo(() => {
    const actionsArr = Array.isArray(marketActions.data) ? marketActions.data : []
    const listingsArr = Array.isArray(unisatListings.data) ? unisatListings.data : []
    if (!actionsArr.length && !listingsArr.length) return null

    const sales = actionsArr.filter((a) => a.type === 'sale')
    const listings = actionsArr.filter((a) => a.type === 'list' || a.type === 'listing')
    const totalVolume = sales.reduce((sum, s) => sum + (s.price || 0), 0)
    const avgSalePrice = sales.length > 0 ? totalVolume / sales.length : 0

    return {
      totalListings: listingsArr.length || listings.length || actionsArr.length,
      activeListings: activeListings.length,
      totalSales: sales.length,
      totalVolume,
      avgSalePrice,
      floorPrice:
        activeListings.length > 0 ? activeListings[0].price : 0,
    }
  }, [marketActions.data, unisatListings.data, activeListings])

  return {
    // Raw Data
    unisatListings: unisatListings.data,
    marketActions: marketActions.data,
    magicEdenActivities: magicEdenActivities.data,
    rareSatListings: rareSatListings.data,

    // Computed Values
    recentSales,
    recentListings,
    activeListings,
    stats,

    // Query Functions
    getCollectionListings,
    getCollectionTokens,

    // Mutations
    createListing,
    confirmListing,
    createBid,
    confirmBid,
    cancelListing,
    confirmCancel,
    modifyPrice,

    // Loading States
    isLoading: unisatListings.isLoading || marketActions.isLoading,
    isError: unisatListings.isError || marketActions.isError,

    // Refetch
    refetchAll: () => {
      unisatListings.refetch()
      marketActions.refetch()
      magicEdenActivities.refetch()
      rareSatListings.refetch()
    },
  }
}
