'use client'

import { useState } from 'react'

export interface FilterOptions {
  priceMin?: number
  priceMax?: number
  volumeMin?: number
  volumeMax?: number
  contentTypes?: string[]
  rarities?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterPanelProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onReset?: () => void
  className?: string
}

const CONTENT_TYPES = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'image/svg+xml', label: 'SVG' },
  { value: 'text/plain', label: 'Text' },
  { value: 'text/html', label: 'HTML' },
  { value: 'application/json', label: 'JSON' },
  { value: 'video/mp4', label: 'MP4' },
]

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'mythic', label: 'Mythic' },
]

export default function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
  className = ''
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleContentType = (type: string) => {
    const current = filters.contentTypes || []
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    updateFilter('contentTypes', updated)
  }

  const toggleRarity = (rarity: string) => {
    const current = filters.rarities || []
    const updated = current.includes(rarity)
      ? current.filter((r) => r !== rarity)
      : [...current, rarity]
    updateFilter('rarities', updated)
  }

  const hasActiveFilters = () => {
    return (
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.volumeMin !== undefined ||
      filters.volumeMax !== undefined ||
      (filters.contentTypes && filters.contentTypes.length > 0) ||
      (filters.rarities && filters.rarities.length > 0)
    )
  }

  const activeFiltersCount = () => {
    let count = 0
    if (filters.priceMin !== undefined) count++
    if (filters.priceMax !== undefined) count++
    if (filters.volumeMin !== undefined) count++
    if (filters.volumeMax !== undefined) count++
    if (filters.contentTypes && filters.contentTypes.length > 0) count += filters.contentTypes.length
    if (filters.rarities && filters.rarities.length > 0) count += filters.rarities.length
    return count
  }

  return (
    <div className={`bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Filters</h3>
          {hasActiveFilters() && (
            <span className="px-2 py-0.5 bg-[#f59e0b] text-black text-xs font-bold rounded-full">
              {activeFiltersCount()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters() && onReset && (
            <button
              onClick={onReset}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Price Range */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Floor Price Range (BTC)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin || ''}
                  onChange={(e) => updateFilter('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono"
                  step="0.0001"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax || ''}
                  onChange={(e) => updateFilter('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono"
                  step="0.0001"
                />
              </div>
            </div>
          </div>

          {/* Volume Range */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Volume 7d Range (BTC)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.volumeMin || ''}
                  onChange={(e) => updateFilter('volumeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono"
                  step="0.01"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.volumeMax || ''}
                  onChange={(e) => updateFilter('volumeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm placeholder:text-gray-600 focus:border-[#f59e0b] focus:outline-none font-mono"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Content Types */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleContentType(type.value)}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    filters.contentTypes?.includes(type.value)
                      ? 'bg-[#f59e0b] border-[#f59e0b] text-black font-semibold'
                      : 'bg-[#0a0a0f] border-[#2a2a3e] text-gray-400 hover:border-[#f59e0b]/50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rarities */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Rarity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RARITIES.map((rarity) => (
                <button
                  key={rarity.value}
                  onClick={() => toggleRarity(rarity.value)}
                  className={`px-3 py-2 text-xs rounded border transition-colors ${
                    filters.rarities?.includes(rarity.value)
                      ? 'bg-[#f59e0b] border-[#f59e0b] text-black font-semibold'
                      : 'bg-[#0a0a0f] border-[#2a2a3e] text-gray-400 hover:border-[#f59e0b]/50'
                  }`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy || 'floorPrice'}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm focus:border-[#f59e0b] focus:outline-none"
              >
                <option value="floorPrice">Floor Price</option>
                <option value="volume7d">Volume 7d</option>
                <option value="volume24h">Volume 24h</option>
                <option value="supply">Supply</option>
                <option value="owners">Owners</option>
                <option value="listed">Listed</option>
              </select>
              <button
                onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white hover:border-[#f59e0b] transition-colors"
                title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    filters.sortOrder === 'asc' ? 'rotate-180' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
