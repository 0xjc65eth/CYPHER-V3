'use client';

import { useState, useEffect, useCallback } from 'react';
import { cypherAI, AIInsight } from '@/lib/ai';
import { useBitcoinPrice } from '@/hooks/cache';
import { devLogger } from '@/lib/logger';

/**
 * Hook para usar CYPHER AI
 */
export function useCypherAI() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { data: btcPrice } = useBitcoinPrice();

  // Inicializar AI
  useEffect(() => {
    const initAI = async () => {
      try {
        await cypherAI.initialize();
        setInitialized(true);
        devLogger.log('HOOK', 'CYPHER AI inicializado via hook');
      } catch (error) {
        devLogger.error(error as Error, 'Falha ao inicializar CYPHER AI');
      }
    };

    initAI();
  }, []);

  // Analisar mercado automaticamente quando o preço muda
  useEffect(() => {
    if (!initialized || !btcPrice) return;

    const analyze = async () => {
      setLoading(true);
      try {
        const price = (btcPrice as any).price ?? btcPrice?.prices?.USD ?? 0;
        const volume = (btcPrice as any).volume24h ?? btcPrice?.volume_24h ?? 0;
        const change = (btcPrice as any).change24h ?? btcPrice?.change_24h ?? 0;
        const marketData = {
          price,
          volume,
          change24h: change,
          // Derive approximate indicators from price change instead of random
          rsi: 50 + (change || 0) * 2, // Approximate RSI from price change
          macd: (change || 0) * 0.5, // Approximate MACD direction from change
          sentiment: 50 + (change || 0) * 3 // Approximate sentiment from change
        };

        const newInsights = await cypherAI.generateInsights({
          prices: [marketData.price],
          volumes: [marketData.volume],
          sentiment: marketData.sentiment / 100
        });
        setInsights(newInsights);
      } catch (error) {
        devLogger.error(error as Error, 'Erro ao analisar mercado');
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [initialized, btcPrice]);

  const requestAnalysis = useCallback(async (customData?: any) => {
    if (!initialized) return;

    setLoading(true);
    try {
      const data = customData || {
        price: (btcPrice as any)?.price ?? btcPrice?.prices?.USD ?? 0,
        volume: (btcPrice as any)?.volume24h ?? btcPrice?.volume_24h ?? 0,
        change24h: (btcPrice as any)?.change24h ?? btcPrice?.change_24h ?? 0
      };

      const newInsights = await cypherAI.generateInsights({
        prices: [data.price],
        volumes: [data.volume],
        sentiment: 0.5
      });
      setInsights(newInsights);
      return newInsights;
    } catch (error) {
      devLogger.error(error as Error, 'Erro na análise personalizada');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [initialized, btcPrice]);

  return {
    insights,
    loading,
    initialized,
    requestAnalysis,
  };
}
