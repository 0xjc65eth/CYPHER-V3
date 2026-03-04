'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, ProgressBar, Badge, Button } from '@tremor/react'
import { RiTimeLine, RiLineChartLine, RiArrowUpCircleLine, RiArrowDownCircleLine, RiArrowRightCircleLine, RiRefreshLine } from 'react-icons/ri'
import { DashboardCard } from '@/components/dashboard-card'
import { useSocialData } from '@/hooks/useSocialData'
import { SocialProjection } from '@/services/social-data-service'

export function SocialProjectionsCard() {
  const { data, isLoading, error, lastUpdated, refresh, isRefreshing } = useSocialData(30000) // Refresh every 30 seconds
  const [mounted, setMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mostrar animação quando os dados estiverem sendo atualizados
  useEffect(() => {
    if (isRefreshing) {
      setIsUpdating(true)
    } else {
      // Manter a animação por um curto período após a atualização
      const timer = setTimeout(() => setIsUpdating(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [isRefreshing])

  // Função para atualizar manualmente os dados
  const handleRefresh = () => {
    setIsUpdating(true)
    refresh()
  }

  // Get projections from data
  const projections = data?.projections || []

  // Sort projections by timeframe (24h, 7d, 30d)
  const sortedProjections = [...projections].sort((a, b) => {
    const timeframeOrder = { '24h': 1, '7d': 2, '30d': 3 }
    return timeframeOrder[a.timeframe] - timeframeOrder[b.timeframe]
  })

  return (
    <DashboardCard title="Social Sentiment Projections" className="bg-gradient-to-br from-[#1A1A3A] to-[#2A2A5A] border-none shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 border border-indigo-500/30">
              <RiTimeLine className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-indigo-300">Sentiment Forecast</p>
              <p className="text-xs text-gray-400">
                {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Real-time data'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 rounded bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/30">
              Neural Forecast
            </span>
            <Button
              size="xs"
              variant="secondary"
              icon={RiRefreshLine}
              onClick={handleRefresh}
              loading={isRefreshing}
              disabled={isRefreshing}
              className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Status da API */}
        {isLoading && !data && (
          <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded p-2 text-xs mt-2">
            Carregando dados da API do Twitter...
          </div>
        )}
        {error && (
          <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded p-2 text-xs mt-2">
            Erro ao carregar dados: usando dados simulados
          </div>
        )}

        <div className="space-y-4">
          {sortedProjections.map((projection, index) => (
            <ProjectionCard key={index} projection={projection} mounted={mounted} />
          ))}

          {sortedProjections.length === 0 && (
            <div className="text-center py-6">
              <Text className="text-gray-400">No projections available at the moment</Text>
            </div>
          )}
        </div>

        <div className="mt-4 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
          <p className="text-sm text-white/90">
            <span className="font-bold text-indigo-400">Projection Analysis:</span> Our neural model predicts
            continued positive sentiment growth over the next 30 days, with potential price impact in the
            5-10% range. Key factors include increasing institutional interest, positive regulatory developments,
            and growing adoption of Ordinals and Runes.
          </p>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>Model confidence: 85%</span>
            <span>Based on 500K+ social data points</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}

function ProjectionCard({ projection, mounted }: { projection: SocialProjection, mounted: boolean }) {
  const timeframeLabel =
    projection.timeframe === '24h' ? 'Next 24 Hours' :
    projection.timeframe === '7d' ? 'Next 7 Days' :
    'Next 30 Days'

  const sentimentColor =
    projection.sentimentProjection > 60 ? 'emerald' :
    projection.sentimentProjection > 30 ? 'amber' :
    'rose'

  const PriceImpactIcon =
    projection.priceImpact > 0 ? RiArrowUpCircleLine :
    projection.priceImpact < 0 ? RiArrowDownCircleLine :
    RiArrowRightCircleLine

  const priceImpactColor =
    projection.priceImpact > 0 ? 'emerald' :
    projection.priceImpact < 0 ? 'rose' :
    'amber'

  return (
    <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <RiTimeLine className="w-4 h-4 text-indigo-400 mr-2" />
          <span className="text-sm font-medium text-white">{timeframeLabel}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/30">
          Confidence: {projection.confidence}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <div className="flex items-center mb-1">
            <RiLineChartLine className="w-4 h-4 text-indigo-400 mr-2" />
            <span className="text-xs text-gray-400">Sentiment Projection</span>
          </div>
          <ProgressBar
            value={mounted ? projection.sentimentProjection : 0}
            color={sentimentColor as any}
            className="mt-1"
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs font-medium text-${sentimentColor}-400`}>
              {projection.sentimentProjection > 60 ? 'Bullish' :
               projection.sentimentProjection > 30 ? 'Neutral' :
               'Bearish'}
            </span>
            <span className="text-xs text-white">{projection.sentimentProjection}%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-1">
            <PriceImpactIcon className={`w-4 h-4 text-${priceImpactColor}-400 mr-2`} />
            <span className="text-xs text-gray-400">Price Impact</span>
          </div>
          <div className={`flex items-center justify-center h-8 rounded bg-${priceImpactColor}-500/20 border border-${priceImpactColor}-500/30`}>
            <span className={`text-${priceImpactColor}-400 font-bold`}>
              {projection.priceImpact > 0 ? '+' : ''}{projection.priceImpact}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <span className="text-xs text-gray-400">Key Factors:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {projection.factors.map((factor, idx) => (
            <div key={idx} className="px-2 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              {factor}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
