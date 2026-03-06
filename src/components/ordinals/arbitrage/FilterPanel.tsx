'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/primitives/Input'
import { Label } from '@/components/ui/primitives/Label'
import { ArbitrageFilters, RiskScore, OrdinalsMarketplace } from '@/types/ordinals-arbitrage'

export interface FilterPanelProps {
  filters: ArbitrageFilters
  onChange: (filters: ArbitrageFilters) => void
  onReset?: () => void
  className?: string
}

const MARKETPLACE_OPTIONS: { value: OrdinalsMarketplace; label: string }[] = [
  { value: 'gamma', label: 'Gamma.io' },
  { value: 'unisat', label: 'UniSat' },
  { value: 'okx', label: 'OKX' },
  { value: 'gamma', label: 'Gamma' },
  { value: 'hiro', label: 'Hiro' },
]

const RISK_OPTIONS: { value: RiskScore | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  className = ''
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [collectionsInput, setCollectionsInput] = useState(filters.collections?.join(', ') || '')

  const updateFilter = <K extends keyof ArbitrageFilters>(key: K, value: ArbitrageFilters[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const toggleMarketplace = (marketplace: OrdinalsMarketplace) => {
    const current = filters.marketplaces || []
    const updated = current.includes(marketplace)
      ? current.filter((m) => m !== marketplace)
      : [...current, marketplace]
    updateFilter('marketplaces', updated.length > 0 ? updated : undefined)
  }

  const handleCollectionsChange = (value: string) => {
    setCollectionsInput(value)
    const collections = value
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
    updateFilter('collections', collections.length > 0 ? collections : undefined)
  }

  const hasActiveFilters = () => {
    return (
      filters.minProfitPercentage !== undefined ||
      filters.maxRisk !== undefined ||
      (filters.collections && filters.collections.length > 0) ||
      (filters.marketplaces && filters.marketplaces.length > 0) ||
      filters.minLiquidity !== undefined
    )
  }

  const activeFiltersCount = () => {
    let count = 0
    if (filters.minProfitPercentage !== undefined && filters.minProfitPercentage !== 5) count++
    if (filters.maxRisk !== undefined) count++
    if (filters.collections && filters.collections.length > 0) count++
    if (filters.marketplaces && filters.marketplaces.length > 0) count += filters.marketplaces.length
    if (filters.minLiquidity !== undefined && filters.minLiquidity !== 30) count++
    return count
  }

  const handleReset = () => {
    setCollectionsInput('')
    if (onReset) {
      onReset()
    }
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
          {hasActiveFilters() && (
            <button
              onClick={handleReset}
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
          {/* Min Profit % */}
          <div>
            <Label htmlFor="min-profit">Min Profit %</Label>
            <Input
              id="min-profit"
              type="number"
              placeholder="5"
              value={filters.minProfitPercentage ?? 5}
              onChange={(e) => updateFilter('minProfitPercentage', e.target.value ? parseFloat(e.target.value) : 5)}
              step="0.1"
              min="0"
              fullWidth
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 5% - Only show opportunities above this profit threshold
            </p>
          </div>

          {/* Max Risk Level */}
          <div>
            <Label htmlFor="max-risk">Max Risk Level</Label>
            <select
              id="max-risk"
              value={filters.maxRisk || 'all'}
              onChange={(e) => updateFilter('maxRisk', e.target.value === 'all' ? undefined : e.target.value as RiskScore)}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm focus:border-[#f59e0b] focus:outline-none font-mono"
            >
              {RISK_OPTIONS.map((risk) => (
                <option key={risk.value} value={risk.value}>
                  {risk.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Filter by maximum acceptable risk level
            </p>
          </div>

          {/* Collections */}
          <div>
            <Label htmlFor="collections">Collections</Label>
            <Input
              id="collections"
              type="text"
              placeholder="e.g., NodeMonkes, Bitcoin Puppets"
              value={collectionsInput}
              onChange={(e) => handleCollectionsChange(e.target.value)}
              fullWidth
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated collection names or IDs
            </p>
          </div>

          {/* Marketplaces */}
          <div>
            <Label>Marketplaces</Label>
            <div className="grid grid-cols-2 gap-2">
              {MARKETPLACE_OPTIONS.map((marketplace) => (
                <button
                  key={marketplace.value}
                  onClick={() => toggleMarketplace(marketplace.value)}
                  className={`px-3 py-2 text-xs rounded border transition-colors text-left ${
                    filters.marketplaces?.includes(marketplace.value)
                      ? 'bg-[#f59e0b] border-[#f59e0b] text-black font-semibold'
                      : 'bg-[#0a0a0f] border-[#2a2a3e] text-gray-400 hover:border-[#f59e0b]/50'
                  }`}
                >
                  {marketplace.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select marketplaces to scan for opportunities
            </p>
          </div>

          {/* Min Liquidity */}
          <div>
            <Label htmlFor="min-liquidity">
              Min Liquidity: {filters.minLiquidity ?? 30}
            </Label>
            <div className="relative">
              <input
                id="min-liquidity"
                type="range"
                min="0"
                max="100"
                value={filters.minLiquidity ?? 30}
                onChange={(e) => updateFilter('minLiquidity', parseInt(e.target.value))}
                className="w-full h-2 bg-[#0a0a0f] rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${filters.minLiquidity ?? 30}%, #0a0a0f ${filters.minLiquidity ?? 30}%, #0a0a0f 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Default: 30 - Higher values = more liquid collections
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid #000;
        }
        .slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid #000;
        }
      `}</style>
    </div>
  )
}
