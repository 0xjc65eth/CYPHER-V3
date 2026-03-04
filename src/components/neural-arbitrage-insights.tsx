'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Metric, Flex, ProgressBar } from '@tremor/react'
import { RiBrainLine, RiLightbulbFlashLine, RiTimeLine, RiShieldCheckLine, RiExchangeLine } from 'react-icons/ri'
import { neuralLearningService } from '@/services/neural-learning-service'
import { runesArbitrageService, RuneArbitrageInsight } from '@/services/runes-arbitrage-service'

// Interface para insights de arbitragem
interface ArbitrageInsight {
  id: string;
  timestamp: string;
  modelId: string;
  confidence: number;
  type: 'arbitrage';
  prediction: {
    sourceExchange: string;
    targetExchange: string;
    asset: string;
    sourceBuyPrice: number;
    targetSellPrice: number;
    profitPercent: string;
    estimatedProfit: number;
    timeWindow: string;
  };
  explanation: string;
  relatedMetrics: string[];
  dataPoints: number;
}

export function NeuralArbitrageInsights() {
  const [insights, setInsights] = useState<ArbitrageInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Função para obter insights de arbitragem do sistema neural
  const fetchNeuralInsights = async () => {
    try {
      setIsLoading(true);

      // Obter insights de arbitragem de runas reais
      const runesInsights = runesArbitrageService.getRunesArbitrageInsights();

      // Obter insights gerais de arbitragem do serviço neural
      const neuralInsights = neuralLearningService.getRecentInsights(3, 'arbitrage');

      // Filtrar apenas insights de arbitragem
      const arbitrageInsights = neuralInsights.filter(insight => insight.type === 'arbitrage') as ArbitrageInsight[];

      // Combinar insights de runas com insights gerais
      let combinedInsights = [...runesInsights, ...arbitrageInsights] as ArbitrageInsight[];

      // Only show real insights - no simulated fallback

      // Ordenar por timestamp (mais recente primeiro)
      combinedInsights.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limitar a 5 insights
      setInsights(combinedInsights.slice(0, 5));
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar insights neurais:', err);
      setError('Erro ao buscar insights neurais.');
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  };

  // No simulated insights - this function is not used anymore
  // Real insights come from neuralLearningService.getRecentInsights()

  // Buscar dados iniciais
  useEffect(() => {
    fetchNeuralInsights();

    // Configurar atualização a cada 2 minutos
    const intervalId = setInterval(() => {
      fetchNeuralInsights();
    }, 120000);

    return () => clearInterval(intervalId);
  }, []);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mostrar estado de carregamento
  if (isLoading && insights.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Insights Neurais de Arbitragem</Title>
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
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-2xl p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mr-4 border border-purple-500/30 shadow-lg">
            <RiBrainLine className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <Title className="text-white text-2xl font-bold">Insights Neurais de Arbitragem</Title>
            <Text className="text-sm text-gray-400">
              {lastUpdated ? `Última atualização: ${lastUpdated.toLocaleTimeString()}` : 'Análise em tempo real'}
            </Text>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-ping"></div>
            <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-xs font-bold text-purple-300 border border-purple-500/30 shadow-md">
              Sistema Neural Ativo
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl shadow-md">
          <Text className="text-sm text-amber-300">
            <span className="font-bold">Nota:</span> {error}
          </Text>
        </div>
      )}

      <div className="mb-6 p-5 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl border border-purple-700/30 shadow-lg">
        <div className="flex items-start mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30 mt-1">
            <RiLightbulbFlashLine className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <Text className="text-purple-300 font-bold text-lg mb-2">Como o Sistema Neural Funciona</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              Nosso sistema neural analisa continuamente dados de múltiplas fontes para identificar oportunidades de arbitragem com alta probabilidade de sucesso:
            </Text>
            <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1 ml-2">
              <li>Análise de padrões históricos de preços entre exchanges</li>
              <li>Monitoramento de liquidez e volume de negociação</li>
              <li>Avaliação de taxas e custos de transação</li>
              <li>Previsão de janelas de oportunidade com base em dados em tempo real</li>
            </ul>
            <Text className="text-gray-300 text-sm mt-3">
              Os insights são atualizados a cada 2 minutos e classificados por confiança e potencial de lucro.
            </Text>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-5 border border-purple-700/30 transition-all duration-300 hover:shadow-lg shadow-md"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <Text className="font-bold text-white text-lg">{insight.prediction.asset}</Text>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <span>{insight.prediction.sourceExchange}</span>
                  <RiExchangeLine className="mx-1" />
                  <span>{insight.prediction.targetExchange}</span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold shadow-md">
                {insight.confidence}% Confiança
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 mb-4 shadow-inner">
              <Text className="text-white font-medium mb-2">Análise Neural</Text>
              <Text className="text-gray-300 text-sm leading-relaxed">
                {insight.explanation}
              </Text>

              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <Text className="text-gray-400 text-xs mb-1">Confiança da Previsão</Text>
                <div className="flex items-center">
                  <ProgressBar value={insight.confidence} color="purple" className="mt-1" />
                  <Text className="text-purple-300 font-bold text-xs ml-2">{insight.confidence}%</Text>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30 shadow-md">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 border border-blue-500/30">
                    <RiExchangeLine className="w-3 h-3 text-blue-400" />
                  </div>
                  <Text className="text-blue-300 font-bold text-sm">COMPRAR EM</Text>
                </div>
                <Text className="text-white font-bold text-lg mb-1">{insight.prediction.sourceExchange}</Text>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Preço estimado:</span>
                    <span className="text-white font-medium">
                      ${insight.prediction.sourceBuyPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/30 shadow-md">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2 border border-emerald-500/30">
                    <RiExchangeLine className="w-3 h-3 text-emerald-400" />
                  </div>
                  <Text className="text-emerald-300 font-bold text-sm">VENDER EM</Text>
                </div>
                <Text className="text-white font-bold text-lg mb-1">{insight.prediction.targetExchange}</Text>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Preço estimado:</span>
                    <span className="text-white font-medium">
                      ${insight.prediction.targetSellPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <Text className="text-white font-medium text-sm">Detalhes da Oportunidade</Text>
                <div className="flex items-center">
                  <RiTimeLine className="w-3 h-3 text-gray-400 mr-1" />
                  <Text className="text-xs text-gray-400">
                    {new Date(insight.timestamp).toLocaleTimeString()}
                  </Text>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Lucro potencial:</span>
                  <span className="text-emerald-400 font-bold">{insight.prediction.profitPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor estimado:</span>
                  <span className="text-emerald-400 font-bold">
                    ${insight.prediction.estimatedProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Janela de tempo:</span>
                  <span className="text-white">{insight.prediction.timeWindow}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pontos de dados:</span>
                  <span className="text-white">{insight.dataPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400 border-t border-gray-700/30 pt-3">
              <div className="flex items-center">
                <RiShieldCheckLine className="w-3 h-3 text-purple-400 mr-1" />
                <span>Análise gerada pelo modelo neural {insight.modelId} com {insight.confidence}% de confiança.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {insights.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">Nenhum insight neural de arbitragem disponível no momento</Text>
        </div>
      )}
    </Card>
  );
}
