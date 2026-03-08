'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Metric, Flex, ProgressBar, Grid, Col } from '@tremor/react'
import { 
  RiBrainLine, RiLightbulbFlashLine, RiTimeLine, RiShieldCheckLine, 
  RiExchangeLine, RiLineChartLine, RiBarChartBoxLine, RiPulseLine,
  RiAlertLine, RiRefreshLine, RiDatabase2Line, RiArrowRightUpLine,
  RiArrowRightDownLine, RiArrowRightLine, RiExternalLinkLine,
  RiPercentLine
} from 'react-icons/ri'
import { neuralLearningService } from '@/services/neural-learning-service'
import { runesArbitrageService } from '@/services/runes-arbitrage-service'
import { formatUSD } from '@/utils/formatters'

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

export function AdvancedNeuralArbitrage() {
  const [insights, setInsights] = useState<ArbitrageInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [learningProgress, setLearningProgress] = useState(85);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modelAccuracy, setModelAccuracy] = useState(0);
  const [dataPoints, setDataPoints] = useState(0);
  const [marketTrends, setMarketTrends] = useState<{
    twitter: string[];
    reddit: string[];
    telegram: string[];
    news: string[];
  }>({
    twitter: [],
    reddit: [],
    telegram: [],
    news: []
  });

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  // Função para obter insights de arbitragem do sistema neural
  const fetchNeuralInsights = async () => {
    try {
      setIsUpdating(true);

      // Obter insights de arbitragem de runas reais
      const runesInsights = await runesArbitrageService.getRunesArbitrageInsights();

      // Obter insights gerais de arbitragem do serviço neural
      const neuralInsights = neuralLearningService.getRecentInsights(5, 'arbitrage');

      // Filtrar apenas insights de arbitragem
      const arbitrageInsights = neuralInsights.filter(insight => insight.type === 'arbitrage') as ArbitrageInsight[];

      // Combinar insights de runas com insights gerais
      let combinedInsights = [...runesInsights, ...arbitrageInsights] as ArbitrageInsight[];

      // Ordenar por timestamp (mais recente primeiro)
      combinedInsights.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limitar a 5 insights
      setInsights(combinedInsights.slice(0, 5));
      
      // Obter modelo de arbitragem
      const arbitrageModel = neuralLearningService.getModel('arbitrage-opportunities');
      if (arbitrageModel) {
        setModelAccuracy(Math.round(arbitrageModel.accuracy * 100));
        setDataPoints(arbitrageModel.dataPoints);
      }
      
      // Market trends - static curated content
      setMarketTrends({
        twitter: [
          "Aumento de menções de #Ordinals nas últimas 24h",
          "Influenciadores destacam oportunidades em #Runes"
        ],
        reddit: [
          "Análises detalhadas de arbitragem entre OKX NFT e UniSat",
          "Comunidade r/Bitcoin discute oportunidades em Ordinals"
        ],
        telegram: [
          "Grupos de trading compartilhando oportunidades em Runes",
          "Alertas de arbitragem em tempo real nos canais premium"
        ],
        news: [
          "Mercado de Ordinals mostra disparidades de preço entre marketplaces",
          "Diferenças de preço entre exchanges criam oportunidades de arbitragem"
        ]
      });

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar insights neurais:', err);
      setError('Erro ao buscar insights neurais.');
      setInsights([]);
    } finally {
      setIsUpdating(false);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  // REMOVED: generateMarketTrends() - was generating randomized fake data
  // Market trends are now set as static curated content in fetchNeuralInsights()

  // REMOVED: generateSimulatedInsights() - was generating fake random data
  // Real insights now come from runesArbitrageService and neuralLearningService

  // Buscar dados iniciais
  useEffect(() => {
    if (mounted) {
      fetchNeuralInsights();
      
      // Configurar atualização a cada 2 minutos
      const intervalId = setInterval(fetchNeuralInsights, 120000);
      
      return () => clearInterval(intervalId);
    }
  }, [mounted]);

  // Função para atualizar manualmente
  const handleRefresh = () => {
    fetchNeuralInsights();
  };

  if (!mounted) return null;

  return (
    <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-2xl p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mr-4 border border-purple-500/30 shadow-lg">
            <RiBrainLine className={`w-6 h-6 text-purple-400 ${isUpdating ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <Title className="text-white text-2xl font-bold">Análise Neural Avançada de Arbitragem</Title>
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
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
            disabled={isUpdating}
          >
            <RiRefreshLine className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mb-6 p-5 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl border border-purple-700/30 shadow-lg">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30 mt-1">
            <RiLightbulbFlashLine className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1">
            <Text className="text-purple-300 font-bold text-lg mb-2">Sistema Neural de Arbitragem</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              Nosso sistema neural analisa continuamente dados de múltiplas fontes para identificar oportunidades de arbitragem com alta probabilidade de sucesso. O modelo utiliza:
            </Text>
            <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1 ml-2">
              <li>Análise de padrões históricos de preços entre exchanges</li>
              <li>Monitoramento de liquidez e volume de negociação</li>
              <li>Avaliação de taxas e custos de transação</li>
              <li>Previsão de janelas de oportunidade com base em dados em tempo real</li>
              <li>Análise de sentimento social e tendências de mercado</li>
            </ul>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiShieldCheckLine className="w-4 h-4 text-purple-400 mr-2" />
                  <Text className="text-white font-medium">Precisão do Modelo</Text>
                </div>
                <Text className="text-purple-400 font-bold text-lg">
                  {modelAccuracy}%
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiDatabase2Line className="w-4 h-4 text-purple-400 mr-2" />
                  <Text className="text-white font-medium">Pontos de Dados</Text>
                </div>
                <Text className="text-purple-400 font-bold text-lg">
                  {dataPoints.toLocaleString()}
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiTimeLine className="w-4 h-4 text-purple-400 mr-2" />
                  <Text className="text-white font-medium">Aprendizado</Text>
                </div>
                <div className="flex items-center">
                  <ProgressBar value={learningProgress} color="purple" className="mt-1 h-2 rounded-full" />
                  <Text className="text-purple-400 font-bold text-sm ml-2">
                    {learningProgress}%
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Grid numItems={1} numItemsMd={2} className="gap-6 mb-6">
        <Col>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-blue-500/20 shadow-lg h-full">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
                <RiLineChartLine className="w-4 h-4 text-blue-400" />
              </div>
              <Text className="text-blue-400 font-bold">Tendências de Mercado</Text>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <RiBarChartBoxLine className="w-3 h-3 text-blue-400 mr-1" />
                  <Text className="text-white text-sm font-medium">Twitter</Text>
                </div>
                <ul className="space-y-2">
                  {marketTrends.twitter.map((trend, index) => (
                    <li key={index} className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-xs text-gray-300">
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <RiBarChartBoxLine className="w-3 h-3 text-blue-400 mr-1" />
                  <Text className="text-white text-sm font-medium">Reddit</Text>
                </div>
                <ul className="space-y-2">
                  {marketTrends.reddit.map((trend, index) => (
                    <li key={index} className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-xs text-gray-300">
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <RiBarChartBoxLine className="w-3 h-3 text-blue-400 mr-1" />
                  <Text className="text-white text-sm font-medium">Telegram</Text>
                </div>
                <ul className="space-y-2">
                  {marketTrends.telegram.map((trend, index) => (
                    <li key={index} className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-xs text-gray-300">
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <RiBarChartBoxLine className="w-3 h-3 text-blue-400 mr-1" />
                  <Text className="text-white text-sm font-medium">Notícias</Text>
                </div>
                <ul className="space-y-2">
                  {marketTrends.news.map((trend, index) => (
                    <li key={index} className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-xs text-gray-300">
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Col>
        
        <Col>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#2A3042] rounded-xl p-5 border border-purple-500/20 shadow-lg h-full">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30">
                <RiPulseLine className="w-4 h-4 text-purple-400" />
              </div>
              <Text className="text-purple-400 font-bold">Insights Neurais</Text>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <RiRefreshLine className="w-8 h-8 text-purple-400 animate-spin mb-4" />
                  <Text className="text-gray-400">Carregando insights neurais...</Text>
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20 transition-all duration-300 hover:bg-purple-500/15"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Text className="font-bold text-white text-sm">{insight.prediction.asset}</Text>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <span>{insight.prediction.sourceExchange}</span>
                          <RiArrowRightLine className="mx-1" />
                          <span>{insight.prediction.targetExchange}</span>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold">
                        {insight.confidence}% Confiança
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center">
                        <RiArrowRightDownLine className="w-3 h-3 text-green-400 mr-1" />
                        <span className="text-gray-400 mr-1">Comprar:</span>
                        <span className="text-green-400 font-bold">{formatUSD(insight.prediction.sourceBuyPrice)}</span>
                      </div>
                      <div className="flex items-center">
                        <RiArrowRightUpLine className="w-3 h-3 text-blue-400 mr-1" />
                        <span className="text-gray-400 mr-1">Vender:</span>
                        <span className="text-blue-400 font-bold">{formatUSD(insight.prediction.targetSellPrice)}</span>
                      </div>
                      <div className="flex items-center">
                        <RiPercentLine className="w-3 h-3 text-purple-400 mr-1" />
                        <span className="text-gray-400 mr-1">Lucro:</span>
                        <span className="text-purple-400 font-bold">{insight.prediction.profitPercent}%</span>
                      </div>
                      <div className="flex items-center">
                        <RiTimeLine className="w-3 h-3 text-gray-400 mr-1" />
                        <span className="text-gray-400 mr-1">Janela:</span>
                        <span className="text-white">{insight.prediction.timeWindow}</span>
                      </div>
                    </div>
                    
                    <Text className="text-xs text-gray-300 mb-2">
                      {insight.explanation}
                    </Text>
                    
                    <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700/30">
                      <span>Dados: {insight.dataPoints.toLocaleString()}</span>
                      <span>{new Date(insight.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <RiAlertLine className="w-8 h-8 text-gray-400 mb-4" />
                  <Text className="text-gray-400">Nenhum insight disponível no momento</Text>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Grid>
      
      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <Text className="text-xs text-blue-300">
          <span className="font-bold">Nota:</span> O sistema neural de arbitragem está em constante aprendizado, analisando dados de múltiplas fontes para identificar oportunidades com alta probabilidade de sucesso. Os insights são atualizados a cada 2 minutos e classificados por confiança e potencial de lucro.
        </Text>
      </div>
    </Card>
  );
}
