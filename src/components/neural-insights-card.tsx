'use client'

import { DashboardCard } from '@/components/dashboard-card'
import { RiBrainLine, RiPulseLine, RiRadarLine, RiRefreshLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import { NeuralMetric } from '@/services/trading-data-service'

export function NeuralInsightsCard() {
  const [mounted, setMounted] = useState(false)
  const [neuralInsights, setNeuralInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Função para buscar dados neurais reais
  const fetchNeuralData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/neural-metrics/')

      if (response.ok) {
        const data = await response.json()

        // Transformar os dados para o formato esperado pelo componente
        const formattedInsights = data.metrics.map((metric: NeuralMetric) => {
          // Determinar a cor com base no valor e na tendência
          let color = 'blue'
          let signal = 'Neutral'

          if (metric.trend === 'Up') {
            color = 'emerald'
            signal = metric.value > 70 ? 'Strong Bullish' : 'Bullish'
          } else if (metric.trend === 'Down') {
            color = metric.value < 30 ? 'rose' : 'amber'
            signal = metric.value < 30 ? 'Bearish' : 'Cautious'
          } else {
            color = 'blue'
            signal = 'Neutral'
          }

          // Determinar o nível de confiança
          let confidence = 'Medium'
          if (metric.confidence >= 85) {
            confidence = 'High'
          } else if (metric.confidence < 70) {
            confidence = 'Low'
          }

          return {
            name: metric.name,
            value: metric.value,
            signal,
            confidence,
            color,
            interpretation: metric.interpretation
          }
        })

        setNeuralInsights(formattedInsights)
        setLastUpdated(new Date())
      } else {
        console.error('Failed to fetch neural data')
        // Usar dados de fallback em caso de erro
        setNeuralInsights(getFallbackData())
      }
    } catch (error) {
      console.error('Error fetching neural data:', error)
      // Usar dados de fallback em caso de erro
      setNeuralInsights(getFallbackData())
    } finally {
      setLoading(false)
    }
  }

  // Dados de fallback para quando a API falha
  const getFallbackData = () => {
    return [
      {
        name: 'BTC Price Trend',
        value: 78,
        signal: 'Bullish',
        confidence: 'High',
        color: 'emerald',
        interpretation: 'Strong bullish momentum with positive price action across multiple timeframes.'
      },
      {
        name: 'Market Sentiment',
        value: 65,
        signal: 'Positive',
        confidence: 'Medium',
        color: 'emerald',
        interpretation: 'Moderate bullish bias with positive long-term trend.'
      },
      {
        name: 'Volatility Forecast',
        value: 42,
        signal: 'Moderate',
        confidence: 'Medium',
        color: 'amber',
        interpretation: 'Neutral price action, market in consolidation phase.'
      },
      {
        name: 'Ordinals Momentum',
        value: 82,
        signal: 'Strong',
        confidence: 'High',
        color: 'emerald',
        interpretation: 'Strong inscription activity and growing collector interest in Ordinals.'
      },
      {
        name: 'Runes Momentum',
        value: 71,
        signal: 'Bullish',
        confidence: 'Medium',
        color: 'emerald',
        interpretation: 'Moderate growth with stable collector interest.'
      }
    ];
  }

  // Buscar dados ao montar o componente
  useEffect(() => {
    setMounted(true)
    fetchNeuralData()

    // Atualizar dados a cada 5 minutos
    const intervalId = setInterval(() => {
      fetchNeuralData()
    }, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, []);

  // Calcular o sentimento geral com base nos insights
  const overallSentiment = () => {
    if (!neuralInsights || neuralInsights.length === 0) return { text: 'Neutral', color: 'blue' }

    const averageValue = neuralInsights.reduce((sum, insight) => sum + insight.value, 0) / neuralInsights.length

    if (averageValue >= 70) return { text: 'Strong Bullish', color: 'emerald' }
    if (averageValue >= 55) return { text: 'Bullish', color: 'emerald' }
    if (averageValue >= 45) return { text: 'Neutral', color: 'blue' }
    if (averageValue >= 30) return { text: 'Cautious', color: 'amber' }
    return { text: 'Bearish', color: 'rose' }
  }

  const sentiment = overallSentiment()

  return (
    <DashboardCard title="Neural Network Insights" className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
              <RiBrainLine className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-300">AI Signal</p>
              <p className="text-xl font-bold text-white">
                <span className={`text-${sentiment.color}-400`}>{sentiment.text}</span> Bias
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNeuralData()}
              className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              disabled={loading}
            >
              <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="px-2 py-1 rounded bg-blue-500 text-xs font-bold animate-pulse text-white">Real-time Analysis</span>
          </div>
        </div>

        {loading && neuralInsights.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RiBrainLine className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              <p className="text-sm text-blue-300 mt-2">Loading neural insights...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {neuralInsights.map((insight, index) => (
              <div key={index} className="bg-blue-500/10 rounded-lg p-3 hover:bg-blue-500/15 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    {index % 2 === 0 ? (
                      <RiPulseLine className="w-4 h-4 text-blue-400 mr-2" />
                    ) : (
                      <RiRadarLine className="w-4 h-4 text-blue-400 mr-2" />
                    )}
                    <span className="text-sm font-medium text-white">{insight.name}</span>
                  </div>
                  <span className={`text-xs font-medium text-${insight.color}-400 px-1.5 py-0.5 rounded bg-${insight.color}-500/10`}>
                    {insight.signal}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                  <div
                    className={`bg-${insight.color}-500 h-2.5 rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: mounted ? `${insight.value}%` : '0%' }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-gray-400">Confidence: {insight.confidence}</span>
                  <span className="text-xs text-white font-medium">{insight.value}%</span>
                </div>
                {insight.interpretation && (
                  <p className="text-xs text-gray-300 mt-2 border-t border-blue-500/20 pt-2">
                    {insight.interpretation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-white/80 mt-2 flex justify-between items-center border-t border-blue-500/20 pt-2">
          <p>
            Neural engine detects a <span className={`font-bold text-${sentiment.color}-400`}>{sentiment.text.toLowerCase()}</span> bias
            based on on-chain and market data.
          </p>
          {lastUpdated && (
            <span className="text-gray-400">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </DashboardCard>
  )
}
