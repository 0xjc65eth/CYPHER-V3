import { useState, useEffect, useCallback } from 'react';
import { modelPersistence } from '@/lib/ai/persistence/modelPersistence';
import { devLogger } from '@/lib/logger';
import { useWorker } from '@/lib/workers/workerService';

export interface PricePrediction {
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  direction: 'up' | 'down' | 'neutral';
  percentageChange: number;
  timestamp: string;
}

export interface SentimentData {
  overall: number;
  sources: {
    social: number;
    news: number;
    technical: number;
  };
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface AIInsights {
  pricePrediction: PricePrediction | null;
  sentiment: SentimentData | null;
  tradingSignal: {
    action: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  } | null;
  isLoading: boolean;
  lastUpdate: string | null;
}

/**
 * Hook para usar previsões de IA com Web Workers
 */
export function useAIPredictionsWithWorkers(autoRefresh: boolean = true) {
  const [insights, setInsights] = useState<AIInsights>({
    pricePrediction: null,
    sentiment: null,
    tradingSignal: null,
    isLoading: true,
    lastUpdate: null,
  });

  // Web Workers
  const priceWorker = useWorker<any>(
    'price-prediction',
    '/workers/pricePrediction.worker.js'
  );
  
  const sentimentWorker = useWorker<any>(
    'sentiment-analysis',
    '/workers/sentiment.worker.js'
  );

  // Carregar modelos e fazer previsões
  const loadPredictions = useCallback(async () => {
    try {
      setInsights(prev => ({ ...prev, isLoading: true }));
      
      // Verificar se os modelos estão treinados
      const models = await modelPersistence.listModels();
      const pricePredictorTrained = models.some(m => m.name === 'price-predictor' && m.version);
      const sentimentAnalyzerTrained = models.some(m => m.name === 'sentiment-analyzer' && m.version);
      
      if (!pricePredictorTrained && !sentimentAnalyzerTrained) {
        devLogger.log('AI_PREDICTIONS', 'Nenhum modelo treinado disponível');
        setInsights(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Fazer previsão de preço usando Worker
      let pricePrediction: PricePrediction | null = null;
      if (pricePredictorTrained && priceWorker.isReady) {
        try {
          // Carregar modelo no worker
          await priceWorker.sendTask('LOAD_MODEL', { modelName: 'price-predictor' });
          
          // Buscar dados de mercado e processar
          const marketData = await fetchMarketData();
          const processedData = await priceWorker.sendTask('PROCESS_DATA', marketData);
          
          // Fazer previsão
          const prediction = await priceWorker.sendTask('PREDICT', {
            features: processedData.features.slice(-1), // Últimas features
            scalers: processedData.scalers
          });
          
          const currentPrice = marketData.prices[marketData.prices.length - 1];
          const predictedPrice = prediction.price;
          const percentageChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
          
          pricePrediction = {
            currentPrice,
            predictedPrice,
            confidence: prediction.confidence,
            direction: percentageChange > 1 ? 'up' : percentageChange < -1 ? 'down' : 'neutral',
            percentageChange,
            timestamp: prediction.timestamp,
          };
          
        } catch (error) {
          devLogger.error(error as Error, 'Erro na previsão de preço com Worker');
        }
      }
      
      // Análise de sentimento usando Worker
      let sentiment: SentimentData | null = null;
      if (sentimentAnalyzerTrained && sentimentWorker.isReady) {
        try {
          // Buscar textos de várias fontes (simulado)
          const texts = await fetchSentimentTexts();
          
          // Analisar em batch no worker
          const analysis = await sentimentWorker.sendTask('BATCH_ANALYZE', { texts });
          
          sentiment = {
            overall: analysis.overall,
            sources: {
              social: analysis.distribution.positive / 100,
              news: analysis.overall,
              technical: 0.6, // Simulado por enquanto
            },
            trend: analysis.overall > 0.6 ? 'bullish' : analysis.overall < 0.4 ? 'bearish' : 'neutral',
          };
        } catch (error) {
          devLogger.error(error as Error, 'Erro na análise de sentimento com Worker');
        }
      }
      
      // Gerar sinal de trading baseado em previsões
      let tradingSignal = null;
      if (pricePrediction && sentiment) {
        tradingSignal = generateTradingSignal(pricePrediction, sentiment);
      }
      
      setInsights({
        pricePrediction,
        sentiment,
        tradingSignal,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
      });
      
      devLogger.log('AI_PREDICTIONS', 'Previsões atualizadas via Workers', {
        pricePrediction: pricePrediction?.percentageChange,
        sentiment: sentiment?.overall,
        signal: tradingSignal?.action,
      });
    } catch (error) {
      devLogger.error(error as Error, 'Erro ao carregar previsões de IA');
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [priceWorker, sentimentWorker]);

  // Buscar dados de mercado (simulado)
  const fetchMarketData = async () => {
    // Em produção, buscar de API real
    const dataPoints = 100;
    const prices = [];
    const volumes = [];
    const timestamps = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const time = Date.now() - (dataPoints - i) * 3600000; // 1 hora por ponto
      prices.push(50000);
      volumes.push(1000000000);
      timestamps.push(time);
    }
    
    return { prices, volumes, timestamps };
  };

  // Buscar textos para análise de sentimento (simulado)
  const fetchSentimentTexts = async () => {
    // Em produção, buscar de APIs reais (Twitter, Reddit, etc)
    return [
      "Bitcoin showing strong bullish momentum, breaking key resistance levels",
      "Institutional adoption continues to grow with major companies adding BTC",
      "Technical analysis suggests potential correction before next rally",
      "Market sentiment remains positive despite short-term volatility",
      "Long-term holders accumulating at current levels"
    ];
  };

  // Gerar sinal de trading
  const generateTradingSignal = (prediction: PricePrediction, sentiment: SentimentData): {
    action: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  } => {
    const priceSignal = prediction.percentageChange > 2 ? 1 : prediction.percentageChange < -2 ? -1 : 0;
    const sentimentSignal = sentiment.overall > 0.6 ? 1 : sentiment.overall < 0.4 ? -1 : 0;
    const combinedSignal = (priceSignal + sentimentSignal) / 2;
    
    const action: 'buy' | 'sell' | 'hold' = combinedSignal > 0.3 ? 'buy' : combinedSignal < -0.3 ? 'sell' : 'hold';
    const strength = Math.abs(combinedSignal);
    
    const reasons: string[] = [];
    if (prediction.percentageChange > 2) {
      reasons.push(`Price expected to rise ${prediction.percentageChange.toFixed(1)}%`);
    } else if (prediction.percentageChange < -2) {
      reasons.push(`Price expected to drop ${Math.abs(prediction.percentageChange).toFixed(1)}%`);
    }
    
    if (sentiment.overall > 0.6) {
      reasons.push('Strong positive market sentiment');
    } else if (sentiment.overall < 0.4) {
      reasons.push('Negative market sentiment detected');
    }
    
    if (prediction.confidence > 0.8) {
      reasons.push(`High confidence (${(prediction.confidence * 100).toFixed(0)}%)`);
    }
    
    return {
      action,
      strength,
      reason: reasons.join('. ') || 'Based on AI analysis',
    };
  };

  // Setup message handlers para progresso
  useEffect(() => {
    priceWorker.onMessage('TRAINING_PROGRESS', (data) => {
      devLogger.log('WORKER', 'Training progress:', data);
    });
    
    return () => {
      // Cleanup if needed
    };
  }, [priceWorker]);

  // Auto-refresh
  useEffect(() => {
    loadPredictions();
    
    if (autoRefresh) {
      const interval = setInterval(loadPredictions, 5 * 60 * 1000); // 5 minutos
      return () => clearInterval(interval);
    }
  }, [loadPredictions, autoRefresh]);

  return {
    ...insights,
    refresh: loadPredictions,
  };
}