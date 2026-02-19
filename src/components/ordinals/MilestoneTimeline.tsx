'use client'

/**
 * MilestoneTimeline Component - CYPHER V3
 * Display chronological timeline of collection milestones
 */

import { useState } from 'react'
import { useCollectionMilestones, MilestoneType, MilestoneSeverity } from '@/hooks/ordinals/useCollectionMilestones'
import { Trophy, TrendingDown, Zap, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface MilestoneTimelineProps {
  symbol: string
  limit?: number
}

export function MilestoneTimeline({ symbol, limit = 20 }: MilestoneTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<MilestoneType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<MilestoneSeverity | 'all'>('all')

  const { data, isLoading, error } = useCollectionMilestones(
    symbol,
    limit,
    typeFilter === 'all' ? undefined : typeFilter,
    severityFilter === 'all' ? undefined : severityFilter
  )

  if (isLoading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <div className="text-gray-400 text-sm">
          Failed to load milestones: {error.message}
        </div>
      </div>
    )
  }

  if (!data || data.milestones.length === 0) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Milestone Timeline</h3>
        <div className="text-gray-400 text-sm">
          No milestones detected yet. Milestones are created during snapshot collection.
        </div>
      </div>
    )
  }

  const getMilestoneIcon = (type: MilestoneType) => {
    switch (type) {
      case 'ATH':
        return <Trophy className="w-5 h-5" />
      case 'ATL':
        return <TrendingDown className="w-5 h-5" />
      case 'VOLUME_SPIKE':
        return <Zap className="w-5 h-5" />
      case 'HOLDER_SURGE':
        return <Users className="w-5 h-5" />
      case 'WHALE_BUY':
        return <DollarSign className="w-5 h-5" />
      case 'BREAKOUT':
        return <ArrowUpRight className="w-5 h-5" />
      case 'BREAKDOWN':
        return <ArrowDownRight className="w-5 h-5" />
      default:
        return <Zap className="w-5 h-5" />
    }
  }

  const getMilestoneColor = (type: MilestoneType) => {
    switch (type) {
      case 'ATH':
      case 'BREAKOUT':
      case 'HOLDER_SURGE':
        return 'text-green-500 bg-green-500/10 border-green-500/30'
      case 'ATL':
      case 'BREAKDOWN':
        return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'VOLUME_SPIKE':
      case 'WHALE_BUY':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30'
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getSeverityBadge = (severity: MilestoneSeverity) => {
    const colors = {
      low: 'bg-gray-700 text-gray-300',
      medium: 'bg-yellow-700 text-yellow-300',
      high: 'bg-orange-700 text-orange-300',
      critical: 'bg-red-700 text-red-300',
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors[severity]}`}>
        {severity}
      </span>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Milestone Timeline</h3>
        <div className="text-sm text-gray-500">
          {data.stats.totalMilestones} total events
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as MilestoneType | 'all')}
          className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm border border-gray-700"
        >
          <option value="all">All Types</option>
          <option value="ATH">ATH</option>
          <option value="ATL">ATL</option>
          <option value="VOLUME_SPIKE">Volume Spike</option>
          <option value="HOLDER_SURGE">Holder Surge</option>
          <option value="BREAKOUT">Breakout</option>
          <option value="BREAKDOWN">Breakdown</option>
        </select>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as MilestoneSeverity | 'all')}
          className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm border border-gray-700"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-green-500 font-bold">{data.stats.athCount}</div>
          <div className="text-gray-500">ATH</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-red-500 font-bold">{data.stats.atlCount}</div>
          <div className="text-gray-500">ATL</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-orange-500 font-bold">{data.stats.volumeSpikeCount}</div>
          <div className="text-gray-500">Vol Spikes</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-blue-500 font-bold">{data.stats.holderSurgeCount}</div>
          <div className="text-gray-500">Holder Surge</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-green-500 font-bold">{data.stats.breakoutCount}</div>
          <div className="text-gray-500">Breakouts</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-red-500 font-bold">{data.stats.breakdownCount}</div>
          <div className="text-gray-500">Breakdowns</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {data.milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className={`border rounded-lg p-4 ${getMilestoneColor(milestone.type)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getMilestoneIcon(milestone.type)}
                <div>
                  <div className="font-bold">{milestone.type.replace('_', ' ')}</div>
                  <div className="text-xs opacity-70">
                    {formatDate(milestone.timestamp)} at {formatTime(milestone.timestamp)}
                  </div>
                </div>
              </div>
              {getSeverityBadge(milestone.severity)}
            </div>

            <div className="text-sm space-y-1">
              <div>
                <span className="opacity-70">Value:</span>{' '}
                <span className="font-bold">{milestone.data.value.toFixed(6)} BTC</span>
              </div>
              {milestone.data.previousValue && (
                <div>
                  <span className="opacity-70">Previous:</span>{' '}
                  <span className="font-bold">{milestone.data.previousValue.toFixed(6)} BTC</span>
                </div>
              )}
              {milestone.data.changePercent && (
                <div>
                  <span className="opacity-70">Change:</span>{' '}
                  <span
                    className={`font-bold ${
                      milestone.data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {milestone.data.changePercent >= 0 ? '+' : ''}
                    {milestone.data.changePercent.toFixed(2)}%
                  </span>
                </div>
              )}
              {milestone.data.context && (
                <div className="text-xs opacity-70 mt-1">{milestone.data.context}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
