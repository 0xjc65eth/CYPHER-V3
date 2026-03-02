/**
 * Rare Sats Market - Professional Component
 * Advanced marketplace for exotic and rare satoshis
 */

'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
// ✅ FIXED: Removed direct service import (caused CORS errors)
// import { magicEdenService } from '@/services/magicEdenService'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import {
  Gem,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Star,
  AlertCircle,
  Sparkles,
  DollarSign,
} from 'lucide-react'

const RARE_SAT_CATEGORIES = [
  { id: 'alpha', name: 'Alpha', color: '#f59e0b' },
  { id: 'omega', name: 'Omega', color: '#ef4444' },
  { id: 'palindrome', name: 'Palindrome', color: '#8b5cf6' },
  { id: 'nakamoto', name: 'Nakamoto', color: '#10b981' },
  { id: 'vintage', name: 'Vintage', color: '#3b82f6' },
  { id: 'block9', name: 'Block 9', color: '#ec4899' },
  { id: 'pizza', name: 'Pizza', color: '#f97316' },
  { id: 'uncommon', name: 'Uncommon', color: '#6366f1' },
  { id: 'rare', name: 'Rare', color: '#14b8a6' },
  { id: 'epic', name: 'Epic', color: '#eab308' },
  { id: 'legendary', name: 'Legendary', color: '#a855f7' },
  { id: 'mythic', name: 'Mythic', color: '#06b6d4' },
]

export default function RareSatsMarket() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'price' | 'rarity' | 'recent'>('price')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch rare sat listings via proxy endpoint
  const rareSatListings = useQuery({
    queryKey: ['rare-sats', 'listings'],
    queryFn: async () => {
      const response = await fetch('/api/rare-sats/categories/')
      if (!response.ok) throw new Error('Failed to fetch rare sat listings')
      return response.json()
    },
    staleTime: 30000,
  })

  // Fetch rare sat categories
  const rareSatCategories = useQuery({
    queryKey: ['rare-sats', 'categories'],
    queryFn: async () => {
      // This would fetch from the API - for now returning mock structure
      return RARE_SAT_CATEGORIES
    },
    staleTime: 300000,
  })

  // Fetch recent rare sat activities via proxy endpoint
  const rareSatActivities = useQuery({
    queryKey: ['rare-sats', 'activities'],
    queryFn: async () => {
      const response = await fetch('/api/ordinals/activity/?limit=50')
      if (!response.ok) throw new Error('Failed to fetch rare sat activities')
      return response.json()
    },
    staleTime: 15000,
  })

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    if (!rareSatListings.data?.inscriptions) return []

    let filtered = rareSatListings.data.inscriptions

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((listing: any) =>
        listing.meta?.attributes?.some(
          (attr: any) => attr.trait_type === 'Rarity' && attr.value.toLowerCase() === selectedCategory
        )
      )
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (listing: any) =>
          listing.id?.toLowerCase().includes(query) ||
          listing.meta?.name?.toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortBy === 'price') {
      filtered = filtered.sort((a: any, b: any) => (b.listedPrice || 0) - (a.listedPrice || 0))
    } else if (sortBy === 'recent') {
      filtered = filtered.sort((a: any, b: any) => (b.listedAt || 0) - (a.listedAt || 0))
    }

    return filtered
  }, [rareSatListings.data, selectedCategory, sortBy, searchQuery])

  // Calculate market stats
  const marketStats = useMemo(() => {
    if (!rareSatListings.data?.inscriptions) return null

    const listings = rareSatListings.data.inscriptions
    const totalListings = listings.length
    const totalVolume = listings.reduce((sum: number, l: any) => sum + (l.listedPrice || 0), 0)
    const avgPrice = totalListings > 0 ? totalVolume / totalListings : 0
    const floorPrice = Math.min(...listings.map((l: any) => l.listedPrice || Infinity))

    return {
      totalListings,
      totalVolume,
      avgPrice,
      floorPrice: floorPrice === Infinity ? 0 : floorPrice,
    }
  }, [rareSatListings.data])

  if (rareSatListings.isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_: any, i: number) => (
          <Card key={i} variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <div className="h-48 bg-[#2a2a3e] rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Gem className="w-7 h-7 text-[#f59e0b]" />
          Rare Sats Marketplace
        </h2>
        <p className="text-sm text-gray-400">
          Discover and trade the most exotic satoshis on Bitcoin
        </p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Total Listings
              </div>
              <div className="text-2xl font-bold text-[#f59e0b]">
                {marketStats?.totalListings.toLocaleString() || '0'}
              </div>
            </div>
            <Sparkles className="w-8 h-8 text-[#f59e0b] opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Floor Price
              </div>
              <div className="text-2xl font-bold text-green-400">
                {marketStats?.floorPrice ? (marketStats.floorPrice / 1e8).toFixed(4) : '0.0000'}
              </div>
              <div className="text-xs text-gray-500">BTC</div>
            </div>
            <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Avg Price
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {marketStats?.avgPrice ? (marketStats.avgPrice / 1e8).toFixed(4) : '0.0000'}
              </div>
              <div className="text-xs text-gray-500">BTC</div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Total Volume
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {marketStats?.totalVolume ? (marketStats.totalVolume / 1e8).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-gray-500">BTC</div>
            </div>
            <TrendingDown className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 pb-4 border-b border-[#2a2a3e]">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
            />
          </div>

          {/* Category Filters */}
          <div>
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Rarity Categories
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#f59e0b] text-black'
                    : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              {rareSatCategories.data?.map((category: any) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                    selectedCategory === category.id
                      ? 'text-black'
                      : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
                  }`}
                  style={{
                    backgroundColor:
                      selectedCategory === category.id ? category.color : undefined,
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Sort By:</div>
            {[
              { id: 'price', label: 'Price' },
              { id: 'rarity', label: 'Rarity' },
              { id: 'recent', label: 'Recent' },
            ].map((option: any) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  sortBy === option.id
                    ? 'bg-[#f59e0b] text-black'
                    : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredListings.map((listing: any, i: number) => {
          const rarityAttr = listing.meta?.attributes?.find(
            (attr: any) => attr.trait_type === 'Rarity'
          )
          const rarity = rarityAttr?.value || 'Unknown'
          const category = RARE_SAT_CATEGORIES.find(
            (cat) => cat.name.toLowerCase() === rarity.toLowerCase()
          )

          return (
            <Card
              key={listing.id || i}
              variant="bordered"
              padding="none"
              className="bg-[#1a1a2e] border-[#2a2a3e] hover:border-[#f59e0b] transition-all overflow-hidden cursor-pointer"
            >
              {/* Image/Content */}
              <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
                {listing.contentURI ? (
                  <img
                    src={listing.contentURI}
                    alt={listing.meta?.name || `Rare Sat #${listing.inscriptionNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Gem className="w-16 h-16 text-gray-600" />
                )}
                {category && (
                  <div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <div className="font-semibold text-white text-sm">
                    {listing.meta?.name || `Rare Sat #${listing.inscriptionNumber}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    #{listing.inscriptionNumber}
                  </div>
                </div>

                {/* Rarity Attributes */}
                {listing.meta?.attributes && listing.meta.attributes.length > 0 && (
                  <div className="space-y-1">
                    {listing.meta.attributes.slice(0, 3).map((attr: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-500">{attr.trait_type}</span>
                        <span className="text-gray-300 font-medium">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price */}
                <div className="pt-2 border-t border-[#2a2a3e]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Price</div>
                    <div>
                      <div className="font-bold text-[#f59e0b]">
                        {listing.listedPrice
                          ? (listing.listedPrice / 1e8).toFixed(4)
                          : '0.0000'}{' '}
                        BTC
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        ≈ ${((listing.listedPrice || 0) / 1e8 * 45000).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button variant="primary" size="sm" className="w-full">
                  View Details
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredListings.length === 0 && (
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-white mb-2">No Listings Found</h3>
            <p className="text-sm text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {rareSatActivities.data?.activities?.slice(0, 10).map((activity: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.kind === 'buying_broadcasted' ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {activity.kind === 'buying_broadcasted' ? 'Purchase' : 'Listing'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {activity.inscription?.inscriptionNumber
                      ? `#${activity.inscription.inscriptionNumber}`
                      : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#f59e0b]">
                  {activity.listedPrice
                    ? (activity.listedPrice / 1e8).toFixed(4)
                    : '0.0000'}{' '}
                  BTC
                </div>
                <div className="text-xs text-gray-500">
                  {activity.createdAt
                    ? new Date(activity.createdAt).toLocaleTimeString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
