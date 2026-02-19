/**
 * Trading Desk - Professional Component
 * Advanced trading terminal for Ordinals marketplace operations
 */

'use client'

import { useState, useMemo } from 'react'
import { useMarketplace } from '@/hooks/ordinals/useMarketplace'
import { Card } from '@/components/ui/primitives/Card'
import { Button } from '@/components/ui/primitives/Button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ShoppingCart,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  LineChart,
} from 'lucide-react'

export default function TradingDesk() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'history'>('buy')
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [sortBy, setSortBy] = useState<'price' | 'recent' | 'popular'>('price')

  const {
    activeListings,
    recentSales,
    recentListings,
    stats,
    createListing,
    createBid,
    cancelListing,
    isLoading,
  } = useMarketplace()

  // Filter listings by price range
  const filteredListings = useMemo(() => {
    if (!activeListings) return []

    let filtered = [...activeListings]

    // Apply price filter
    if (priceFilter !== 'all') {
      const prices = activeListings.map((l) => l.price).sort((a, b) => a - b)
      const low = prices[Math.floor(prices.length * 0.33)]
      const high = prices[Math.floor(prices.length * 0.67)]

      if (priceFilter === 'low') {
        filtered = filtered.filter((l) => l.price < low)
      } else if (priceFilter === 'mid') {
        filtered = filtered.filter((l) => l.price >= low && l.price < high)
      } else if (priceFilter === 'high') {
        filtered = filtered.filter((l) => l.price >= high)
      }
    }

    // Apply sorting
    if (sortBy === 'price') {
      filtered.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => (b.listedAt || 0) - (a.listedAt || 0))
    }

    return filtered
  }, [activeListings, priceFilter, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
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
          <ShoppingCart className="w-7 h-7 text-[#f59e0b]" />
          Trading Desk
        </h2>
        <p className="text-sm text-gray-400">
          Professional marketplace operations and trading analytics
        </p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Active Listings
              </div>
              <div className="text-2xl font-bold text-[#f59e0b]">
                {stats?.activeListings.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats?.totalListings || '0'} total
              </div>
            </div>
            <Tag className="w-8 h-8 text-[#f59e0b] opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Floor Price
              </div>
              <div className="text-2xl font-bold text-green-400">
                {stats?.floorPrice ? (stats.floorPrice / 1e8).toFixed(4) : '0.0000'}
              </div>
              <div className="text-xs text-gray-500 mt-1">BTC</div>
            </div>
            <TrendingDown className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Total Volume
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {stats?.totalVolume ? (stats.totalVolume / 1e8).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">BTC</div>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        <Card variant="bordered" padding="md" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Avg Sale Price
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {stats?.avgSalePrice ? (stats.avgSalePrice / 1e8).toFixed(4) : '0.0000'}
              </div>
              <div className="text-xs text-gray-500 mt-1">BTC</div>
            </div>
            <LineChart className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Trading Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2a2a3e]">
        {[
          { id: 'buy', label: 'Buy Orders', icon: ShoppingCart },
          { id: 'sell', label: 'Sell Orders', icon: Tag },
          { id: 'history', label: 'Trade History', icon: Activity },
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

      {/* Filters */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Price Range:</div>
            {['all', 'low', 'mid', 'high'].map((filter) => (
              <button
                key={filter}
                onClick={() => setPriceFilter(filter as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  priceFilter === filter
                    ? 'bg-[#f59e0b] text-black'
                    : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
                }`}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Sort By:</div>
            {[
              { id: 'price', label: 'Price' },
              { id: 'recent', label: 'Recent' },
              { id: 'popular', label: 'Popular' },
            ].map((option) => (
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

      {/* Content Based on Active Tab */}
      {activeTab === 'buy' && (
        <Card variant="bordered" padding="none" className="bg-[#0a0a0f] border-[#2a2a3e] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a1a2e] border-b border-[#2a2a3e]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Price (BTC)
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Price (USD)
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Listed
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a3e]">
              {filteredListings.slice(0, 20).map((listing, i) => (
                <tr key={i} className="hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2a2a3e] rounded flex items-center justify-center">
                        <Tag className="w-5 h-5 text-[#f59e0b]" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {listing.collectionName || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {listing.inscriptionId?.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-[#f59e0b]">
                      {(listing.price / 1e8).toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-300">
                      ${((listing.price / 1e8) * 45000).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-gray-400">
                      {listing.listedAt
                        ? new Date(listing.listedAt).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement buy logic
                      }}
                    >
                      Buy Now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'sell' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Listing Form */}
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
              Create Listing
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">
                  Inscription ID
                </label>
                <input
                  type="text"
                  placeholder="Enter inscription ID..."
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white placeholder-gray-500 focus:border-[#f59e0b] outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">
                  Price (BTC)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white placeholder-gray-500 focus:border-[#f59e0b] outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider">
                  Listing Duration
                </label>
                <select className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white focus:border-[#f59e0b] outline-none">
                  <option>7 Days</option>
                  <option>14 Days</option>
                  <option>30 Days</option>
                  <option>No Expiration</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  // TODO: Implement create listing logic
                }}
              >
                Create Listing
              </Button>
            </div>
          </Card>

          {/* Recent Listings */}
          <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
              Recent Listings
            </h3>
            <div className="space-y-2">
              {recentListings?.slice(0, 10).map((listing, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded border border-[#2a2a3e]"
                >
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {listing.collectionName || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(listing.timestamp * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#f59e0b]">
                      {(listing.price / 1e8).toFixed(4)} BTC
                    </div>
                    <div className="text-xs text-gray-500">Listed</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card variant="bordered" padding="none" className="bg-[#0a0a0f] border-[#2a2a3e] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a1a2e] border-b border-[#2a2a3e]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Price (BTC)
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a3e]">
              {recentSales?.slice(0, 20).map((sale, i) => (
                <tr key={i} className="hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-400">
                      {new Date(sale.timestamp * 1000).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        sale.type === 'sale'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {sale.type === 'sale' ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Sale
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          List
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">
                      {sale.collectionName || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {sale.inscriptionId?.slice(0, 12)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-[#f59e0b]">
                      {sale.price ? (sale.price / 1e8).toFixed(4) : '0.0000'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
