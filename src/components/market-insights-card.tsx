'use client'

import { Card, Title, Text } from '@tremor/react'
import { RiLightbulbLine, RiTimeLine, RiArrowUpSLine, RiArrowDownSLine, RiInformationLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import { useTradingData } from '@/hooks/useTradingData'
import { MarketInsight } from '@/services/trading-data-service'
import { getCryptoPrices, formatPrice } from '@/services/coinmarketcap-service'

export function MarketInsightsCard() {
  const { data, isLoading, error, lastUpdated } = useTradingData(30000) // Refresh every 30 seconds
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [btcPriceLoading, setBtcPriceLoading] = useState(true)

  // Buscar o preço atual do Bitcoin da API do CoinMarketCap
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      try {
        setBtcPriceLoading(true);

        try {
          const pricesData = await getCryptoPrices(['BTC']);
          if (pricesData['BTC'] && typeof pricesData['BTC'].price === 'number' && !isNaN(pricesData['BTC'].price)) {
            setBtcPrice(pricesData['BTC'].price);
          } else {
            // Manter o preço anterior se já tivermos um
            if (btcPrice === null) {
              // Se não temos preço anterior, usar um valor padrão
              setBtcPrice(64000); // Valor aproximado como fallback
            }
          }
        } catch (apiError) {
          console.error('Erro na API ao buscar o preço do Bitcoin:', apiError);
          // Manter o preço anterior ou usar fallback
          if (btcPrice === null) {
            setBtcPrice(64000);
          }
        }
      } catch (error) {
        console.error('Erro ao processar busca do preço do Bitcoin:', error);
      } finally {
        setBtcPriceLoading(false);
      }
    };

    fetchBitcoinPrice();

    // Atualizar o preço a cada 60 segundos
    const intervalId = setInterval(() => {
      try {
        fetchBitcoinPrice();
      } catch (error) {
        console.error('Erro na atualização periódica do preço do Bitcoin:', error);
      }
    }, 60000);

    return () => {
      try {
        clearInterval(intervalId);
      } catch (error) {
        console.error('Erro ao limpar intervalo:', error);
      }
    };
  }, [btcPrice]);

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show loading state
  if (isLoading && !data) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Market Insights</Title>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Market Insights</Title>
        <Text className="text-rose-400">Error loading market insights</Text>
      </Card>
    )
  }

  // Get market insights from data
  const marketInsights = data?.marketInsights || []

  // Filter insights based on selected filter
  const filteredInsights = filter
    ? marketInsights.filter(insight => insight.assets.includes(filter))
    : marketInsights

  // Sort by impact (High first) and then by timestamp (newest first)
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    if (a.impact === 'High' && b.impact !== 'High') return -1
    if (a.impact !== 'High' && b.impact === 'High') return 1
    if (a.impact === 'Medium' && b.impact === 'Low') return -1
    if (a.impact === 'Low' && b.impact === 'Medium') return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const currentDate = new Date()
  const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`

  return (
    <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30">
            <RiLightbulbLine className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <Title className="text-white text-xl">
              Bitcoin Ecosystem Insights
              {btcPrice && !btcPriceLoading && (
                <span className="ml-2 text-green-400 text-sm">
                  BTC: ${formatPrice(btcPrice)}
                </span>
              )}
            </Title>
            <Text className="text-xs text-gray-400">
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Real-time data'}
            </Text>
          </div>
        </div>
        <div className="flex items-center">
          <RiTimeLine className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-xs text-gray-400">{formattedDate}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter(null)}
          className={`px-2 py-1 rounded text-xs font-medium ${
            filter === null
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('BTC')}
          className={`px-2 py-1 rounded text-xs font-medium ${
            filter === 'BTC'
              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
          }`}
        >
          Bitcoin
        </button>
        <button
          onClick={() => setFilter('Ordinals')}
          className={`px-2 py-1 rounded text-xs font-medium ${
            filter === 'Ordinals'
              ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
          }`}
        >
          Ordinals
        </button>
        <button
          onClick={() => setFilter('Runes')}
          className={`px-2 py-1 rounded text-xs font-medium ${
            filter === 'Runes'
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
          }`}
        >
          Runes
        </button>
      </div>

      <div className="space-y-3">
        {sortedInsights.map((insight) => (
          <div
            key={insight.id}
            className={`bg-gradient-to-br ${
              insight.sentiment === 'Bullish' ? 'from-emerald-900/20 to-emerald-800/10 border-emerald-700/30' :
              insight.sentiment === 'Bearish' ? 'from-rose-900/20 to-rose-800/10 border-rose-700/30' :
              'from-blue-900/20 to-blue-800/10 border-blue-700/30'
            } rounded-lg p-4 border transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start">
                <div className={`mt-1 mr-2 ${
                  insight.sentiment === 'Bullish' ? 'text-emerald-400' :
                  insight.sentiment === 'Bearish' ? 'text-rose-400' :
                  'text-blue-400'
                }`}>
                  {insight.sentiment === 'Bullish' ? <RiArrowUpSLine className="w-4 h-4" /> :
                   insight.sentiment === 'Bearish' ? <RiArrowDownSLine className="w-4 h-4" /> :
                   <RiInformationLine className="w-4 h-4" />}
                </div>
                <div>
                  <Text className="font-bold text-white">{insight.title}</Text>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {insight.assets.map((asset, index) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          asset === 'BTC' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          asset === 'Ordinals' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          asset === 'Runes' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}
                      >
                        {asset}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      insight.impact === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      insight.impact === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {insight.impact} Impact
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Text className="text-sm text-gray-300 mb-2">{insight.description}</Text>

            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Source: {insight.source}</span>
              <span>{new Date(insight.timestamp).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {sortedInsights.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">No market insights available for the selected filter</Text>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <Text className="text-xs text-gray-400">
          Data sources: Ordiscan API, CoinMarketCap API
        </Text>
      </div>
    </Card>
  )
}
