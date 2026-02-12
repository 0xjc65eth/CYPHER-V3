'use client'

import React, { memo, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives/Card'
import { Badge } from '@/components/ui/primitives/Badge'
import { Button } from '@/components/ui/primitives/Button'
import {
  OrdinalsArbitrageOpportunity,
  MARKETPLACE_NAMES,
  MARKETPLACE_URLS
} from '@/types/ordinals-arbitrage'
import { cn } from '@/lib/utils'

interface OpportunityCardProps {
  opportunity: OrdinalsArbitrageOpportunity
}

const OpportunityCard = memo<OpportunityCardProps>(({ opportunity }) => {
  const [expanded, setExpanded] = useState(false)

  // Calculate time since last update
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((Date.now() - opportunity.lastUpdated) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }, [opportunity.lastUpdated])

  // Risk badge variant
  const riskVariant = useMemo(() => {
    switch (opportunity.riskScore) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'danger'
      default:
        return 'default'
    }
  }, [opportunity.riskScore])

  // Liquidity indicator
  const liquidityLevel = useMemo(() => {
    if (opportunity.liquidityScore >= 70) return { level: 'High', color: 'text-green-400' }
    if (opportunity.liquidityScore >= 40) return { level: 'Med', color: 'text-yellow-400' }
    return { level: 'Low', color: 'text-red-400' }
  }, [opportunity.liquidityScore])

  // Format BTC values
  const formatBTC = (value: number) => {
    return value.toFixed(8) + ' BTC'
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%'
  }

  // Build marketplace URLs
  const buyMarketplaceUrl = useMemo(() => {
    const baseUrl = MARKETPLACE_URLS[opportunity.buyMarketplace]
    return opportunity.buyUrl || baseUrl
  }, [opportunity.buyMarketplace, opportunity.buyUrl])

  const sellMarketplaceUrl = useMemo(() => {
    const baseUrl = MARKETPLACE_URLS[opportunity.sellMarketplace]
    return opportunity.sellUrl || baseUrl
  }, [opportunity.sellMarketplace, opportunity.sellUrl])

  return (
    <Card variant="bordered" padding="md" className="hover:border-[#f59e0b]/70 transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Collection Image */}
          {opportunity.imageUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a2a3e] flex-shrink-0">
              <img
                src={opportunity.imageUrl}
                alt={opportunity.collectionName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Collection Name & Risk */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold text-white truncate">
              {opportunity.collectionName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={riskVariant} size="sm">
                {opportunity.riskScore.toUpperCase()}
              </Badge>
              <span className="text-[10px] text-gray-500">{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-gray-500 font-semibold">CONF</span>
          <div className="w-16 h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#f59e0b] transition-all duration-300"
              style={{ width: `${opportunity.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-[#f59e0b] font-bold">{opportunity.confidence}%</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price Information */}
        <div className="grid grid-cols-2 gap-3">
          {/* Buy Side */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">BUY</span>
              <a
                href={buyMarketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors"
              >
                {MARKETPLACE_NAMES[opportunity.buyMarketplace]}
              </a>
            </div>
            <div className="text-sm font-mono text-white bg-[#2a2a3e] px-2 py-1.5 rounded">
              {formatBTC(opportunity.buyPrice)}
            </div>
          </div>

          {/* Sell Side */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">SELL</span>
              <a
                href={sellMarketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors"
              >
                {MARKETPLACE_NAMES[opportunity.sellMarketplace]}
              </a>
            </div>
            <div className="text-sm font-mono text-white bg-[#2a2a3e] px-2 py-1.5 rounded">
              {formatBTC(opportunity.sellPrice)}
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#0a0a12] border border-[#f59e0b]/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-semibold">NET PROFIT</span>
            <span className={cn(
              "text-xs font-bold",
              liquidityLevel.color
            )}>
              {liquidityLevel.level} Liquidity
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-[#f59e0b]">
              {formatBTC(opportunity.netProfit)}
            </span>
            <span className="text-sm font-bold text-[#f59e0b]">
              ({formatPercentage(opportunity.netProfitPercentage)})
            </span>
          </div>
        </div>

        {/* Expandable Profit Breakdown */}
        <div className="border-t border-[#2a2a3e] pt-3">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white"
          >
            <span className="text-xs font-semibold">
              {expanded ? 'Hide' : 'Show'} Fee Breakdown
            </span>
            <svg
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                expanded && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {expanded && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Gross Profit:</span>
                <span className="font-mono text-white">{formatBTC(opportunity.grossProfit)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Buy Marketplace Fee:</span>
                <span className="font-mono text-red-400">-{formatBTC(opportunity.fees.buyMarketplaceFee)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Sell Marketplace Fee:</span>
                <span className="font-mono text-red-400">-{formatBTC(opportunity.fees.sellMarketplaceFee)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Network Fee:</span>
                <span className="font-mono text-red-400">-{formatBTC(opportunity.fees.networkFee)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform Fee (0.35%):</span>
                <span className="font-mono text-red-400">-{formatBTC(opportunity.fees.platformFee)}</span>
              </div>
              <div className="border-t border-[#2a2a3e] pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-gray-300">Total Fees:</span>
                <span className="font-mono text-red-400">-{formatBTC(opportunity.fees.totalFees)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {opportunity.warnings && opportunity.warnings.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            {opportunity.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-red-400">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

OpportunityCard.displayName = 'OpportunityCard'

export default OpportunityCard
