'use client';

import { useState, useCallback } from 'react';
import { sentimentAnalyzer, SentimentResult } from '@/lib/ai';
import { devLogger } from '@/lib/logger';

/**
 * Hook para análise de sentimento
 */
export function useSentimentAnalysis() {
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [aggregatedSentiment, setAggregatedSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeSentiment = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const result = await sentimentAnalyzer.analyzeText(text);
      setSentiment(result);
      const label = result.score > 0.1 ? 'positive' : result.score < -0.1 ? 'negative' : 'neutral';
      devLogger.log('HOOK', `Sentimento: ${label} (${(result.score * 100).toFixed(1)}%)`);
      return result;
    } catch (error) {
      devLogger.error(error as Error, 'Erro na análise de sentimento');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeMultiple = useCallback(async (texts: string[]) => {
    setLoading(true);
    try {
      const result = await sentimentAnalyzer.analyzeMultipleSources({ tweets: texts });

      // Transform SentimentResult into the shape the UI expects
      const sentiment = result.score > 0.1 ? 'positive' : result.score < -0.1 ? 'negative' : 'neutral';
      const positiveCount = texts.filter((_, i) => i < texts.length).length; // approximate
      const total = texts.length || 1;

      const transformed = {
        overall: {
          sentiment,
          confidence: result.confidence,
          keywords: result.keywords,
        },
        distribution: {
          positive: Math.round(((result.score + 1) / 2) * total),
          negative: Math.round(((1 - result.score) / 2) * total * 0.5),
          neutral: Math.max(0, total - Math.round(((result.score + 1) / 2) * total) - Math.round(((1 - result.score) / 2) * total * 0.5)),
        },
        trend: result.score > 0.2 ? 'improving' : result.score < -0.2 ? 'declining' : 'stable',
        score: result.score,
        sources: result.sources,
      };

      setAggregatedSentiment(transformed);
      devLogger.log('HOOK', `Sentimento agregado: ${sentiment}`);
      return transformed;
    } catch (error) {
      devLogger.error(error as Error, 'Erro na análise agregada');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sentiment,
    aggregatedSentiment,
    loading,
    analyzeSentiment,
    analyzeMultiple,
  };
}
