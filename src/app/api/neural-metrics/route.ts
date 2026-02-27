import { NextResponse } from 'next/server'
import { NeuralMetric } from '@/services/trading-data-service'
import { rateLimitedFetch } from '@/lib/rateLimitedFetch'

export async function GET() {
  try {

    // Array para armazenar métricas neurais
    const metrics: NeuralMetric[] = []

    // Obter dados de preço do Bitcoin com rate limiting
    try {
      const btcData = await rateLimitedFetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_7d_change=true'
      )

      if (btcData && btcData.bitcoin) {
        const priceChange24h = btcData.bitcoin.usd_24h_change || 0
        const priceChange7d = btcData.bitcoin.usd_7d_change || 0

          // Calcular valor baseado nas mudanças de preço
          const value = 50 + (priceChange24h * 0.3) + (priceChange7d * 0.7)
          const trend = priceChange24h > 0 ? 'Up' : priceChange24h < 0 ? 'Down' : 'Neutral'

          let interpretation = ''
          if (value > 70) {
            interpretation = `Strong bullish momentum with positive price action across multiple timeframes.`
          } else if (value > 50) {
            interpretation = `Moderate bullish bias with positive long-term trend.`
          } else if (value > 40) {
            interpretation = `Neutral price action, market in consolidation phase.`
          } else if (value > 20) {
            interpretation = `Bearish short-term momentum, caution advised.`
          } else {
            interpretation = `Strong bearish trend across multiple timeframes.`
          }

        metrics.push({
          name: 'Bitcoin Price Momentum',
          value: Math.min(100, Math.max(0, value)),
          interpretation,
          trend,
          confidence: 90,
          timeframe: '1D'
        })
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price data:', error)
    }

    // Obter dados de Ordinals
    try {
      const apiKey = process.env.ORDISCAN_API_KEY
      const ordHeaders: Record<string, string> = {}
      if (apiKey) ordHeaders['X-API-KEY'] = apiKey
      const ordinalsResponse = await fetch(`https://ordiscan.com/api/v1/stats`, {
        headers: ordHeaders,
        cache: 'no-store'
      })

      if (ordinalsResponse.ok) {
        const ordinalsData = await ordinalsResponse.json()

        // Calcular valor baseado na taxa de inscrição
        const inscriptionRate = ordinalsData.inscription_rate || 0
        const normalizedRate = Math.min(100, Math.max(0, (inscriptionRate / 1000) * 100))
        const trend = normalizedRate > 50 ? 'Up' : normalizedRate < 40 ? 'Down' : 'Neutral'

        let interpretation = ''
        if (normalizedRate > 70) {
          interpretation = `Strong inscription activity and growing collector interest in Ordinals.`
        } else if (normalizedRate > 50) {
          interpretation = `Moderate inscription growth with stable collector interest.`
        } else if (normalizedRate > 40) {
          interpretation = `Neutral inscription rate, market in consolidation phase.`
        } else if (normalizedRate > 20) {
          interpretation = `Declining inscription rate, potential market saturation.`
        } else {
          interpretation = `Significant drop in inscription activity, bearish market conditions.`
        }

        metrics.push({
          name: 'Ordinals Inscription Rate',
          value: normalizedRate,
          interpretation,
          trend,
          confidence: 85,
          timeframe: '1D'
        })
      }
    } catch (error) {
      console.error('Error fetching Ordinals data:', error)
    }

    // Obter dados de Runes
    try {
      // Usar URL absoluta para evitar erros de URL inválida
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3001';

      const runesResponse = await fetch(`${baseUrl}/api/runes-stats/`)

      if (runesResponse.ok) {
        const runesData = await runesResponse.json()

        // Calcular valor baseado no volume e mudança de preço
        const volumeChange = runesData.volume_change_24h || 0
        const priceChange = runesData.price_change_24h || 0

        const value = 50 + (volumeChange * 0.4) + (priceChange * 0.6)
        const trend = value > 50 ? 'Up' : value < 40 ? 'Down' : 'Neutral'

        let interpretation = ''
        if (value > 70) {
          interpretation = `Strong Runes market activity with increasing volume and price appreciation.`
        } else if (value > 50) {
          interpretation = `Positive Runes market sentiment with moderate growth.`
        } else if (value > 40) {
          interpretation = `Neutral Runes market conditions, consolidation phase.`
        } else if (value > 20) {
          interpretation = `Weakening Runes market with declining volume and price pressure.`
        } else {
          interpretation = `Bearish Runes market conditions across volume and price metrics.`
        }

        metrics.push({
          name: 'Runes Market Momentum',
          value: Math.min(100, Math.max(0, value)),
          interpretation,
          trend,
          confidence: 82,
          timeframe: '1D'
        })
      }
    } catch (error) {
      console.error('Error fetching Runes data:', error)
    }

    // Obter dados de saúde da rede Bitcoin
    try {
      const mempoolResponse = await fetch('https://mempool.space/api/v1/fees/recommended', {
        cache: 'no-store'
      })

      const hashrateResponse = await fetch('https://mempool.space/api/v1/mining/hashrate/1m', {
        cache: 'no-store'
      })

      if (mempoolResponse.ok && hashrateResponse.ok) {
        const mempoolData = await mempoolResponse.json()
        const hashrateData = await hashrateResponse.json()

        // Calcular valor baseado na taxa de transação e hashrate
        const feeRate = mempoolData.fastestFee || 0
        const hashrate = hashrateData.currentHashrate || 0

        // Normalizar valores
        const normalizedFee = Math.min(100, Math.max(0, 100 - (feeRate / 100) * 100)) // Menor taxa = melhor saúde
        const normalizedHashrate = Math.min(100, Math.max(0, (hashrate / 300000000000000) * 100)) // Maior hashrate = melhor saúde

        const value = (normalizedFee * 0.3) + (normalizedHashrate * 0.7)
        const trend = value > 60 ? 'Up' : value < 40 ? 'Down' : 'Neutral'

        let interpretation = ''
        if (value > 70) {
          interpretation = `Excellent network health with strong hashrate and reasonable fees.`
        } else if (value > 50) {
          interpretation = `Good network conditions with balanced fee market.`
        } else if (value > 40) {
          interpretation = `Neutral network health, monitoring congestion levels.`
        } else if (value > 20) {
          interpretation = `Network congestion with elevated fees, potential delays.`
        } else {
          interpretation = `Poor network conditions with high fees and potential security concerns.`
        }

        metrics.push({
          name: 'Bitcoin Network Health',
          value: Math.min(100, Math.max(0, value)),
          interpretation,
          trend,
          confidence: 88,
          timeframe: '1D'
        })
      }
    } catch (error) {
      console.error('Error fetching network health data:', error)
    }

    // Obter dados de sentimento de mercado
    try {
      // Usar Fear & Greed Index como proxy para sentimento de mercado
      const fearGreedResponse = await fetch('https://api.alternative.me/fng/', {
        cache: 'no-store'
      })

      if (fearGreedResponse.ok) {
        const fearGreedData = await fearGreedResponse.json()

        if (fearGreedData.data && fearGreedData.data[0]) {
          const fearGreedValue = parseInt(fearGreedData.data[0].value) || 50
          const trend = fearGreedValue > 60 ? 'Up' : fearGreedValue < 40 ? 'Down' : 'Neutral'

          let interpretation = ''
          if (fearGreedValue > 75) {
            interpretation = `Extreme greed in the market, potential for correction. Investors are highly optimistic.`
          } else if (fearGreedValue > 60) {
            interpretation = `Greed dominates market sentiment with bullish bias across participants.`
          } else if (fearGreedValue > 40) {
            interpretation = `Neutral market sentiment, balanced between fear and greed.`
          } else if (fearGreedValue > 25) {
            interpretation = `Fear is prevalent in the market, investors are cautious.`
          } else {
            interpretation = `Extreme fear in the market, potential buying opportunity. Investors are highly pessimistic.`
          }

          metrics.push({
            name: 'Market Sentiment',
            value: fearGreedValue,
            interpretation,
            trend,
            confidence: 80,
            timeframe: '1D'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching market sentiment data:', error)
    }

    // Se não conseguimos obter métricas reais, usar dados de fallback
    if (metrics.length === 0) {
      metrics.push(
        {
          name: 'Bitcoin Price Momentum',
          value: 78,
          interpretation: 'Strong bullish momentum with positive price action across multiple timeframes.',
          trend: 'Up',
          confidence: 90,
          timeframe: '1D'
        },
        {
          name: 'Market Sentiment',
          value: 65,
          interpretation: 'Moderate bullish bias with positive long-term trend.',
          trend: 'Up',
          confidence: 80,
          timeframe: '1D'
        },
        {
          name: 'Volatility Forecast',
          value: 42,
          interpretation: 'Neutral price action, market in consolidation phase.',
          trend: 'Neutral',
          confidence: 75,
          timeframe: '1D'
        },
        {
          name: 'Ordinals Momentum',
          value: 82,
          interpretation: 'Strong inscription activity and growing collector interest in Ordinals.',
          trend: 'Up',
          confidence: 85,
          timeframe: '1D'
        },
        {
          name: 'Runes Momentum',
          value: 71,
          interpretation: 'Moderate growth with stable collector interest.',
          trend: 'Up',
          confidence: 82,
          timeframe: '1D'
        }
      )
    }

    return NextResponse.json({
      metrics,
      last_updated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in neural metrics API:', error)

    // Retornar dados de fallback em caso de erro
    return NextResponse.json({
      metrics: [
        {
          name: 'Bitcoin Price Momentum',
          value: 78,
          interpretation: 'Strong bullish momentum with positive price action across multiple timeframes.',
          trend: 'Up',
          confidence: 90,
          timeframe: '1D'
        },
        {
          name: 'Market Sentiment',
          value: 65,
          interpretation: 'Moderate bullish bias with positive long-term trend.',
          trend: 'Up',
          confidence: 80,
          timeframe: '1D'
        },
        {
          name: 'Volatility Forecast',
          value: 42,
          interpretation: 'Neutral price action, market in consolidation phase.',
          trend: 'Neutral',
          confidence: 75,
          timeframe: '1D'
        },
        {
          name: 'Ordinals Momentum',
          value: 82,
          interpretation: 'Strong inscription activity and growing collector interest in Ordinals.',
          trend: 'Up',
          confidence: 85,
          timeframe: '1D'
        },
        {
          name: 'Runes Momentum',
          value: 71,
          interpretation: 'Moderate growth with stable collector interest.',
          trend: 'Up',
          confidence: 82,
          timeframe: '1D'
        }
      ],
      last_updated: new Date().toISOString()
    })
  }
}
