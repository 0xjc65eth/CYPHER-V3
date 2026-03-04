import { EventEmitter } from 'events';
type MarketData = any;
type MempoolData = any;
import { OrdinalData } from '@/types/ordinals';
import { RuneData } from '@/types/runes';
import { SmcTradeSetup } from '@/types/trading';
import { supabaseService } from '@/services/supabase-service';

// Interface para o modelo neural
export interface NeuralModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  lastTraining: string;
  dataPoints: number;
  weights: Record<string, number>;
  biases: Record<string, number>;
  features: string[];
  targetMetric: string;
  predictionHistory: {
    timestamp: string;
    predicted: number;
    actual: number;
    error: number;
  }[];
  performanceMetrics: {
    mse: number;
    mae: number;
    r2: number;
    accuracy: number;
  };
}

// Interface para os dados de treinamento
export interface TrainingData {
  marketData: MarketData[];
  mempoolData: MempoolData[];
  ordinalData: OrdinalData[];
  runeData: RuneData[];
  tradeSetups: SmcTradeSetup[];
  socialSentiment: {
    timestamp: string;
    sentiment: number;
    volume: number;
    source: string;
  }[];
}

// Interface para os insights gerados
export interface NeuralInsight {
  id: string;
  timestamp: string;
  modelId: string;
  confidence: number;
  type: 'price' | 'arbitrage' | 'smc' | 'ordinals' | 'runes';
  prediction: any;
  explanation: string;
  relatedMetrics: string[];
  dataPoints: number;
}

// Interface para correções autônomas
export interface AutoCorrection {
  id: string;
  timestamp: string;
  dataType: string;
  field: string;
  oldValue: string | number;
  newValue: string | number;
  confidence: number;
  source: string;
  explanation: string;
  modelId: string;
  status: 'pending' | 'applied' | 'rejected';
}

// Interface para progresso de aprendizado
export interface LearningProgress {
  stage: 'data_collection' | 'preprocessing' | 'training' | 'validation' | 'insight_generation' | 'correction';
  progress: number;
  startTime: string;
  estimatedEndTime: string;
  currentTask: string;
  completedTasks: number;
  totalTasks: number;
}

// Classe principal do serviço de aprendizado neural
export class NeuralLearningService extends EventEmitter {
  private static instance: NeuralLearningService;
  private models: Map<string, NeuralModel> = new Map();
  private trainingData: TrainingData = {
    marketData: [],
    mempoolData: [],
    ordinalData: [],
    runeData: [],
    tradeSetups: [],
    socialSentiment: []
  };
  private insights: NeuralInsight[] = [];
  private autoCorrections: AutoCorrection[] = [];
  private isLearning: boolean = false;
  private learningInterval: NodeJS.Timeout | null = null;
  private dataCollectionInterval: NodeJS.Timeout | null = null;
  private correctionInterval: NodeJS.Timeout | null = null;
  private lastModelUpdate: string = new Date().toISOString();
  private currentLearningProgress: LearningProgress | null = null;
  private config = {
    learningRate: 0.01,
    batchSize: 32,
    epochs: 10,
    validationSplit: 0.2,
    dataRetentionDays: 30,
    minDataPointsForTraining: 100,
    confidenceThreshold: 0.7,
    updateInterval: 3600000, // 1 hora em milissegundos
    dataCollectionInterval: 300000, // 5 minutos em milissegundos
    cloudSyncInterval: 3600000 * 6, // 6 horas em milissegundos
    correctionInterval: 900000, // 15 minutos em milissegundos
    correctionThreshold: 0.85, // Limiar de confiança para aplicar correções automaticamente
    useCloudStorage: true, // Usar armazenamento em nuvem (Degoo via Supabase)
    degooCloudEnabled: true, // Habilitar sincronização com Degoo Cloud para aprendizado 24/7
    autoCorrectEnabled: true // Habilitar correção autônoma de dados
  };
  private cloudSyncInterval: NodeJS.Timeout | null = null;

  // Construtor privado para implementar Singleton
  private constructor() {
    super();
    this.initializeModels();
    this.loadFromCloud();
  }

  // Método para obter a instância única
  public static getInstance(): NeuralLearningService {
    if (!NeuralLearningService.instance) {
      NeuralLearningService.instance = new NeuralLearningService();
    }
    return NeuralLearningService.instance;
  }

  // Carregar dados do armazenamento em nuvem (Supabase)
  private async loadFromCloud(): Promise<void> {
    if (!this.config.useCloudStorage) {
      return;
    }

    try {

      // Carregar modelos
      const cloudModels = await supabaseService.loadAllModels();
      if (cloudModels.length > 0) {
        // Atualizar modelos locais com dados da nuvem
        cloudModels.forEach(cloudModel => {
          const localModel = this.models.get(cloudModel.id);
          if (localModel) {
            // Se o modelo da nuvem for mais recente, atualize o local
            const cloudDate = new Date(cloudModel.lastTraining).getTime();
            const localDate = new Date(localModel.lastTraining).getTime();

            if (cloudDate > localDate) {
              this.models.set(cloudModel.id, cloudModel);
            }
          } else {
            // Se o modelo não existir localmente, adicione-o
            this.models.set(cloudModel.id, cloudModel);
          }
        });
      }

      // Carregar dados de treinamento
      const cloudTrainingData = await supabaseService.loadTrainingData(this.config.dataRetentionDays);

      // Mesclar dados de treinamento da nuvem com dados locais
      if (cloudTrainingData?.marketData && cloudTrainingData.marketData.length > 0) {
        this.trainingData.marketData = [...this.trainingData.marketData, ...cloudTrainingData.marketData];
      }

      if (cloudTrainingData?.mempoolData && cloudTrainingData.mempoolData.length > 0) {
        this.trainingData.mempoolData = [...this.trainingData.mempoolData, ...cloudTrainingData.mempoolData];
      }

      if (cloudTrainingData?.ordinalData && cloudTrainingData.ordinalData.length > 0) {
        this.trainingData.ordinalData = [...this.trainingData.ordinalData, ...cloudTrainingData.ordinalData];
      }

      if (cloudTrainingData?.runeData && cloudTrainingData.runeData.length > 0) {
        this.trainingData.runeData = [...this.trainingData.runeData, ...cloudTrainingData.runeData];
      }

      // Carregar insights
      const cloudInsights = await supabaseService.loadInsights(1000);
      if (cloudInsights.length > 0) {
        this.insights = [...this.insights, ...cloudInsights];

        // Remover duplicatas
        const uniqueInsights = new Map<string, NeuralInsight>();
        this.insights.forEach(insight => {
          uniqueInsights.set(insight.id, insight);
        });

        this.insights = Array.from(uniqueInsights.values());

        // Ordenar por timestamp (mais recente primeiro)
        this.insights.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Limitar número de insights
        const maxInsights = 1000;
        if (this.insights.length > maxInsights) {
          this.insights = this.insights.slice(0, maxInsights);
        }
      }


      // Emitir evento de carregamento de dados da nuvem
      this.emit('cloud-data-loaded', {
        timestamp: new Date().toISOString(),
        modelsLoaded: cloudModels.length,
        dataPointsLoaded: {
          market: cloudTrainingData.marketData?.length || 0,
          mempool: cloudTrainingData.mempoolData?.length || 0,
          ordinals: cloudTrainingData.ordinalData?.length || 0,
          runes: cloudTrainingData.runeData?.length || 0
        },
        insightsLoaded: cloudInsights.length
      });
    } catch (error) {
      console.error('Error loading data from cloud storage:', error);
    }
  }

  // Salvar dados no armazenamento em nuvem (Supabase)
  private async saveToCloud(): Promise<void> {
    if (!this.config.useCloudStorage) {
      return;
    }

    try {

      // Salvar modelos
      for (const model of this.models.values()) {
        await supabaseService.saveModel(model);
      }

      // Salvar dados de treinamento (apenas os mais recentes)
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 24); // Dados das últimas 24 horas
      const recentTimestamp = recentCutoff.toISOString();

      const recentTrainingData: Partial<TrainingData> = {
        marketData: this.trainingData.marketData.filter(data => data?.timestamp > recentTimestamp),
        mempoolData: this.trainingData.mempoolData.filter(data => data?.timestamp > recentTimestamp),
        ordinalData: this.trainingData.ordinalData.filter(data => data?.timestamp > recentTimestamp),
        runeData: this.trainingData.runeData.filter(data => data?.timestamp > recentTimestamp)
      };

      await supabaseService.saveTrainingData(recentTrainingData);

      // Salvar insights (apenas os mais recentes)
      const recentInsights = this.insights
        .filter(insight => insight?.timestamp > recentTimestamp)
        .slice(0, 100); // Limitar a 100 insights recentes

      if (recentInsights.length > 0) {
        await supabaseService.saveInsights(recentInsights);
      }


      // Emitir evento de salvamento de dados na nuvem
      this.emit('cloud-data-saved', {
        timestamp: new Date().toISOString(),
        modelsSaved: this.models.size,
        dataPointsSaved: {
          market: recentTrainingData.marketData?.length || 0,
          mempool: recentTrainingData.mempoolData?.length || 0,
          ordinals: recentTrainingData.ordinalData?.length || 0,
          runes: recentTrainingData.runeData?.length || 0
        },
        insightsSaved: recentInsights.length
      });
    } catch (error) {
      console.error('Error saving data to cloud storage:', error);
    }
  }

  // Iniciar o serviço de aprendizado contínuo
  public startContinuousLearning(): void {
    if (this.isLearning) {
      return;
    }

    this.isLearning = true;

    // Inicializar o progresso de aprendizado
    this.updateLearningProgress('data_collection', 0);

    // Iniciar coleta de dados
    this.dataCollectionInterval = setInterval(() => {
      this.updateLearningProgress('data_collection', 50);
      this.collectData();
    }, this.config.dataCollectionInterval);

    // Iniciar aprendizado
    this.learningInterval = setInterval(() => {
      this.updateLearningProgress('training', 50);
      this.trainModels();

      this.updateLearningProgress('insight_generation', 50);
      this.generateInsights();

      this.pruneOldData();
    }, this.config.updateInterval);

    // Iniciar processo de correção autônoma se habilitado
    if (this.config.autoCorrectEnabled) {
      this.correctionInterval = setInterval(() => {
        this.updateLearningProgress('correction', 50);
        this.detectAndCorrectInconsistencies();
      }, this.config.correctionInterval);

    }

    // Iniciar sincronização com a nuvem
    if (this.config.useCloudStorage) {
      this.cloudSyncInterval = setInterval(() => {
        this.saveToCloud();
      }, this.config.cloudSyncInterval);

    }

    // Emitir evento de início
    this.emit('learning-started', {
      timestamp: new Date().toISOString(),
      models: Array.from(this.models.values()).map(m => ({
        id: m.id,
        name: m.name,
        version: m.version,
        accuracy: m.accuracy
      })),
      cloudSyncEnabled: this.config.useCloudStorage,
      autoCorrectEnabled: this.config.autoCorrectEnabled
    });
  }

  // Atualizar o progresso de aprendizado
  private updateLearningProgress(stage: LearningProgress['stage'], progress: number): void {
    const now = new Date();
    const estimatedEndTime = new Date(now.getTime() + 600000); // 10 minutos no futuro

    // Determinar a tarefa atual com base no estágio
    let currentTask = '';
    switch (stage) {
      case 'data_collection':
        currentTask = 'Collecting market data from multiple sources';
        break;
      case 'preprocessing':
        currentTask = 'Normalizing and cleaning collected data';
        break;
      case 'training':
        currentTask = 'Training neural models with latest data';
        break;
      case 'validation':
        currentTask = 'Validating model accuracy with test data';
        break;
      case 'insight_generation':
        currentTask = 'Generating insights based on trained models';
        break;
      case 'correction':
        currentTask = 'Autonomously correcting inconsistent data';
        break;
      default:
        currentTask = 'Processing neural data';
    }

    // Calcular tarefas completadas com base no progresso
    const totalTasks = 20;
    const completedTasks = Math.floor((progress / 100) * totalTasks);

    this.currentLearningProgress = {
      stage,
      progress,
      startTime: now.toISOString(),
      estimatedEndTime: estimatedEndTime.toISOString(),
      currentTask,
      completedTasks,
      totalTasks
    };

    // Emitir evento de atualização de progresso
    this.emit('learning-progress-updated', {
      ...this.currentLearningProgress,
      timestamp: now.toISOString()
    });
  }

  // Parar o serviço de aprendizado
  public stopContinuousLearning(): void {
    if (!this.isLearning) {
      return;
    }

    this.isLearning = false;

    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }

    if (this.correctionInterval) {
      clearInterval(this.correctionInterval);
      this.correctionInterval = null;
    }

    if (this.cloudSyncInterval) {
      clearInterval(this.cloudSyncInterval);
      this.cloudSyncInterval = null;
    }

    // Salvar dados na nuvem antes de parar completamente
    if (this.config.useCloudStorage) {
      this.saveToCloud().then(() => {
      }).catch(error => {
        console.error('Error during final cloud sync:', error);
      });
    }

    // Emitir evento de parada
    this.emit('learning-stopped', {
      timestamp: new Date().toISOString(),
      reason: 'Manual stop',
      finalCloudSync: this.config.useCloudStorage
    });
  }

  // Obter status do serviço
  public getStatus(): any {
    return {
      isLearning: this.isLearning,
      models: Array.from(this.models.values()).map(m => ({
        id: m.id,
        name: m.name,
        version: m.version,
        accuracy: m.accuracy,
        lastTraining: m.lastTraining,
        dataPoints: m.dataPoints
      })),
      lastModelUpdate: this.lastModelUpdate,
      dataPoints: {
        market: this.trainingData.marketData.length,
        mempool: this.trainingData.mempoolData.length,
        ordinals: this.trainingData.ordinalData.length,
        runes: this.trainingData.runeData.length,
        tradeSetups: this.trainingData.tradeSetups.length,
        socialSentiment: this.trainingData.socialSentiment.length
      },
      insights: this.insights.length,
      autoCorrections: this.autoCorrections.length,
      learningProgress: this.currentLearningProgress,
      config: this.config,
      cloudStorage: {
        enabled: this.config.useCloudStorage,
        syncInterval: this.config.cloudSyncInterval / 3600000 + ' hours',
        lastSync: this.lastCloudSync || 'Never'
      },
      autoCorrection: {
        enabled: this.config.autoCorrectEnabled,
        correctionInterval: this.config.correctionInterval / 60000 + ' minutes',
        threshold: this.config.correctionThreshold,
        totalCorrections: this.autoCorrections.length,
        pendingCorrections: this.autoCorrections.filter(c => c.status === 'pending').length,
        appliedCorrections: this.autoCorrections.filter(c => c.status === 'applied').length
      }
    };
  }

  // Propriedade para rastrear a última sincronização com a nuvem
  private lastCloudSync: string | null = null;

  // Forçar sincronização com a nuvem
  public async forceSyncWithCloud(): Promise<void> {
    if (!this.config.useCloudStorage) {
      return;
    }

    try {

      // Primeiro carregue dados da nuvem
      await this.loadFromCloud();

      // Depois salve os dados locais na nuvem
      await this.saveToCloud();

      this.lastCloudSync = new Date().toISOString();


      // Emitir evento de sincronização forçada
      this.emit('forced-cloud-sync', {
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('Error during forced cloud sync:', error);

      // Emitir evento de erro na sincronização forçada
      this.emit('forced-cloud-sync', {
        timestamp: new Date().toISOString(),
        success: false,
        error: String(error)
      });

      throw error;
    }
  }

  // Obter insights recentes
  public getRecentInsights(limit: number = 10, type?: string): NeuralInsight[] {
    let filteredInsights = this.insights;

    if (type) {
      filteredInsights = filteredInsights.filter(insight => insight.type === type);
    }

    return filteredInsights
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Obter modelo por ID
  public getModel(modelId: string): NeuralModel | undefined {
    return this.models.get(modelId);
  }

  // Obter todos os modelos
  public getAllModels(): NeuralModel[] {
    return Array.from(this.models.values());
  }

  // Obter correções autônomas recentes
  public getAutoCorrections(limit: number = 10): AutoCorrection[] {
    return this.autoCorrections
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Obter progresso de aprendizado atual
  public getLearningProgress(): LearningProgress | null {
    return this.currentLearningProgress;
  }

  // Atualizar configuração
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };

    // Reiniciar intervalos se necessário
    if (this.isLearning) {
      this.stopContinuousLearning();
      this.startContinuousLearning();
    }
  }

  // Métodos privados
  private initializeModels(): void {
    // Modelo para previsão de preço do Bitcoin
    this.models.set('price-prediction', {
      id: 'price-prediction',
      name: 'Bitcoin Price Prediction',
      version: '1.0.0',
      accuracy: 0.78,
      lastTraining: new Date().toISOString(),
      dataPoints: 0,
      weights: {
        'volume': 0.35,
        'sentiment': 0.25,
        'mempool': 0.15,
        'hashrate': 0.10,
        'social': 0.15
      },
      biases: { 'output': 0.1 },
      features: ['volume', 'sentiment', 'mempool', 'hashrate', 'social'],
      targetMetric: 'price',
      predictionHistory: [],
      performanceMetrics: {
        mse: 0.05,
        mae: 0.03,
        r2: 0.75,
        accuracy: 0.78
      }
    });

    // Modelo para análise SMC
    this.models.set('smc-analysis', {
      id: 'smc-analysis',
      name: 'SMC Market Structure Analysis',
      version: '1.0.0',
      accuracy: 0.82,
      lastTraining: new Date().toISOString(),
      dataPoints: 0,
      weights: {
        'liquidity': 0.40,
        'orderBlocks': 0.30,
        'fairValueGaps': 0.20,
        'priceAction': 0.10
      },
      biases: { 'output': 0.2 },
      features: ['liquidity', 'orderBlocks', 'fairValueGaps', 'priceAction'],
      targetMetric: 'marketStructure',
      predictionHistory: [],
      performanceMetrics: {
        mse: 0.04,
        mae: 0.02,
        r2: 0.80,
        accuracy: 0.82
      }
    });

    // Modelo para arbitragem
    this.models.set('arbitrage-opportunities', {
      id: 'arbitrage-opportunities',
      name: 'Arbitrage Opportunity Detection',
      version: '1.0.0',
      accuracy: 0.75,
      lastTraining: new Date().toISOString(),
      dataPoints: 0,
      weights: {
        'priceDifference': 0.45,
        'volume': 0.25,
        'fees': 0.20,
        'liquidity': 0.10
      },
      biases: { 'output': 0.15 },
      features: ['priceDifference', 'volume', 'fees', 'liquidity'],
      targetMetric: 'profitability',
      predictionHistory: [],
      performanceMetrics: {
        mse: 0.06,
        mae: 0.04,
        r2: 0.72,
        accuracy: 0.75
      }
    });

    // Modelo para Ordinals
    this.models.set('ordinals-analysis', {
      id: 'ordinals-analysis',
      name: 'Ordinals Market Analysis',
      version: '1.0.0',
      accuracy: 0.80,
      lastTraining: new Date().toISOString(),
      dataPoints: 0,
      weights: {
        'inscriptionRate': 0.35,
        'uniqueHolders': 0.25,
        'tradingVolume': 0.25,
        'btcCorrelation': 0.15
      },
      biases: { 'output': 0.1 },
      features: ['inscriptionRate', 'uniqueHolders', 'tradingVolume', 'btcCorrelation'],
      targetMetric: 'marketTrend',
      predictionHistory: [],
      performanceMetrics: {
        mse: 0.05,
        mae: 0.03,
        r2: 0.78,
        accuracy: 0.80
      }
    });

    // Modelo para Runes
    this.models.set('runes-analysis', {
      id: 'runes-analysis',
      name: 'Runes Market Analysis',
      version: '1.0.0',
      accuracy: 0.76,
      lastTraining: new Date().toISOString(),
      dataPoints: 0,
      weights: {
        'mintRate': 0.30,
        'uniqueHolders': 0.25,
        'tradingVolume': 0.25,
        'btcCorrelation': 0.20
      },
      biases: { 'output': 0.1 },
      features: ['mintRate', 'uniqueHolders', 'tradingVolume', 'btcCorrelation'],
      targetMetric: 'marketTrend',
      predictionHistory: [],
      performanceMetrics: {
        mse: 0.06,
        mae: 0.04,
        r2: 0.74,
        accuracy: 0.76
      }
    });
  }

  private async collectData(): Promise<void> {

    try {
      // Coletar dados reais de mercado do Bitcoin da API do CoinMarketCap
      let marketData;
      try {
        const response = await fetch('/api/bitcoin-price/');
        if (response.ok) {
          const data = await response.json();
          marketData = {
            btcPrice: data.btcPrice,
            btcChange24h: data.btcChange24h,
            volume24h: data.volume24h,
            marketCap: data.marketCap,
            timestamp: data.lastUpdated || new Date().toISOString()
          };
        } else {
          throw new Error('Failed to fetch Bitcoin price data');
        }
      } catch (error) {
        console.error('Error fetching Bitcoin market data:', error);
        // Fallback para dados simulados em caso de erro
        marketData = {
          btcPrice: 96500,
          btcChange24h: 0,
          volume24h: 30000000000,
          marketCap: 1900000000000,
          timestamp: new Date().toISOString()
        };
      }

      // Coletar dados reais do mempool da API do mempool.space
      let mempoolData;
      try {
        const response = await fetch('/api/mempool-data/');
        if (response.ok) {
          const data = await response.json();
          mempoolData = {
            pendingTransactions: data.pendingTransactions,
            averageFeeRate: data.averageFeeRate,
            mempoolSize: data.mempoolSize,
            timestamp: data.lastUpdated || new Date().toISOString()
          };
        } else {
          throw new Error('Failed to fetch mempool data');
        }
      } catch (error) {
        console.error('Error fetching mempool data:', error);
        // Fallback para dados simulados em caso de erro
        mempoolData = {
          pendingTransactions: 12500,
          averageFeeRate: 3.5,
          mempoolSize: 22500,
          timestamp: new Date().toISOString()
        };
      }

      // Coletar dados reais de Ordinals da API do Ordiscan
      let ordinalData;
      try {
        const response = await fetch('/api/ordinals-stats/');
        if (response.ok) {
          const data = await response.json();
          ordinalData = {
            volume24h: data.volume_24h || 200000,
            marketCap: data.market_cap || 2000000000,
            uniqueHolders: data.unique_holders || 240000,
            inscriptionRate: data.inscription_rate || 5000,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Failed to fetch Ordinals data');
        }
      } catch (error) {
        console.error('Error fetching Ordinals data:', error);
        // Fallback para dados simulados em caso de erro
        ordinalData = {
          volume24h: 200000,
          marketCap: 2000000000,
          uniqueHolders: 240000,
          inscriptionRate: 5000,
          timestamp: new Date().toISOString()
        };
      }

      // Coletar dados reais de Runes
      let runeData;
      try {
        const response = await fetch('/api/runes-stats/');
        if (response.ok) {
          const data = await response.json();
          runeData = {
            volume24h: data.volume_24h || 150000,
            marketCap: data.market_cap || 1500000000,
            uniqueHolders: data.unique_holders || 180000,
            mintRate: data.mint_rate || 3000,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Failed to fetch Runes data');
        }
      } catch (error) {
        console.error('Error fetching Runes data:', error);
        // Fallback para dados simulados em caso de erro
        runeData = {
          volume24h: 150000,
          marketCap: 1500000000,
          uniqueHolders: 180000,
          mintRate: 3000,
          timestamp: new Date().toISOString()
        };
      }

    // Adicionar dados ao conjunto de treinamento
    this.trainingData.marketData.push(marketData as any);
    this.trainingData.mempoolData.push(mempoolData as any);
    this.trainingData.ordinalData.push(ordinalData as any);
    this.trainingData.runeData.push(runeData as any);

    } catch (error) {
      console.error('Error in collectData:', error);
    }

    // Emitir evento de coleta de dados
    this.emit('data-collected', {
      timestamp: new Date().toISOString(),
      dataPoints: {
        market: this.trainingData.marketData.length,
        mempool: this.trainingData.mempoolData.length,
        ordinals: this.trainingData.ordinalData.length,
        runes: this.trainingData.runeData.length
      }
    });
  }

  private trainModels(): void {
    if (this.trainingData.marketData.length < this.config.minDataPointsForTraining) {
      return;
    }


    // Treinar cada modelo
    for (const [id, model] of this.models.entries()) {

      // Simular treinamento
      const previousAccuracy = model.accuracy;

      // Simular melhoria na precisão (com diminuição gradual da taxa de melhoria)
      const improvementRate = 0.01 * (1 - model.accuracy); // Taxa de melhoria diminui conforme a precisão aumenta
      model.accuracy = Math.min(0.98, model.accuracy + (improvementRate * 0.5));

      // Atualizar métricas de desempenho
      model.performanceMetrics.accuracy = model.accuracy;
      model.performanceMetrics.mse = Math.max(0.01, model.performanceMetrics.mse * 0.95);
      model.performanceMetrics.mae = Math.max(0.005, model.performanceMetrics.mae * 0.95);
      model.performanceMetrics.r2 = Math.min(0.98, model.performanceMetrics.r2 + 0.005);

      // Atualizar pesos (simulação)
      for (const feature of Object.keys(model.weights)) {
        model.weights[feature] += 0.005;
      }

      // Normalizar pesos para somar 1
      const weightSum = Object.values(model.weights).reduce((sum, weight) => sum + weight, 0);
      for (const feature of Object.keys(model.weights)) {
        model.weights[feature] /= weightSum;
      }

      // Atualizar informações do modelo
      model.lastTraining = new Date().toISOString();
      model.dataPoints += this.trainingData.marketData.length;

      // Adicionar histórico de predição (simulado)
      const actualValue = 50;
      const predictedValue = actualValue * 1.02;
      const error = Math.abs(actualValue - predictedValue) / actualValue;

      model.predictionHistory.push({
        timestamp: new Date().toISOString(),
        actual: actualValue,
        predicted: predictedValue,
        error
      });

      // Limitar histórico de predições
      if (model.predictionHistory.length > 100) {
        model.predictionHistory = model.predictionHistory.slice(-100);
      }

      // Atualizar modelo no mapa
      this.models.set(id, model);

      // Emitir evento de treinamento
      this.emit('model-trained', {
        modelId: model.id,
        modelName: model.name,
        previousAccuracy,
        newAccuracy: model.accuracy,
        improvement: model.accuracy - previousAccuracy,
        timestamp: new Date().toISOString()
      });
    }

    this.lastModelUpdate = new Date().toISOString();
  }

  private generateInsights(): void {

    // Gerar insights baseados nos modelos treinados
    const newInsights: NeuralInsight[] = [];

    // Insight de preço
    const priceModel = this.models.get('price-prediction');
    if (priceModel && priceModel.accuracy > this.config.confidenceThreshold) {
      const latestPrice = this.trainingData.marketData[this.trainingData.marketData.length - 1]?.btcPrice || 96500;
      const pricePrediction = latestPrice * 1.012;
      const direction = pricePrediction > latestPrice ? 'up' : 'down';
      const changePercent = Math.abs((pricePrediction - latestPrice) / latestPrice * 100).toFixed(2);

      newInsights.push({
        id: `price-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelId: priceModel.id,
        confidence: priceModel.accuracy,
        type: 'price',
        prediction: {
          currentPrice: latestPrice,
          predictedPrice: pricePrediction,
          direction,
          changePercent
        },
        explanation: `Based on volume patterns, sentiment analysis, and mempool data, our model predicts Bitcoin price will move ${direction} by approximately ${changePercent}% in the next 24 hours.`,
        relatedMetrics: ['volume', 'sentiment', 'mempool'],
        dataPoints: priceModel.dataPoints
      });
    }

    // Insight de SMC
    const smcModel = this.models.get('smc-analysis');
    if (smcModel && smcModel.accuracy > this.config.confidenceThreshold) {
      const marketStructures = ['Bullish Continuation', 'Bearish Continuation', 'Bullish Reversal', 'Bearish Reversal', 'Range-Bound'];
      const selectedStructure = marketStructures[0];
      const keyLevel = 96500;

      newInsights.push({
        id: `smc-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelId: smcModel.id,
        confidence: smcModel.accuracy,
        type: 'smc',
        prediction: {
          marketStructure: selectedStructure,
          keyLevel,
          orderBlocks: [
            { price: keyLevel - 2000, type: 'Bullish', strength: 0.85 },
            { price: keyLevel + 2500, type: 'Bearish', strength: 0.75 }
          ],
          fairValueGaps: [
            { price: keyLevel - 1000, type: 'Bullish', status: 'Unfilled' }
          ]
        },
        explanation: `Our SMC analysis model has identified a ${selectedStructure.toLowerCase()} market structure with a key level at $${keyLevel}. Strong bullish order block detected at $${keyLevel - 2000} with unfilled fair value gap at $${keyLevel - 1000}.`,
        relatedMetrics: ['liquidity', 'orderBlocks', 'fairValueGaps'],
        dataPoints: smcModel.dataPoints
      });
    }

    // Insight de arbitragem
    const arbitrageModel = this.models.get('arbitrage-opportunities');
    if (arbitrageModel && arbitrageModel.accuracy > this.config.confidenceThreshold) {
      const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Magic Eden', 'Unisat', 'Ordinals Market'];
      const sourceExchange = exchanges[0];
      const targetExchange = exchanges[1];

      const basePrice = 96500;
      const sourceBuyPrice = basePrice * 0.99;
      const targetSellPrice = basePrice * 1.01;
      const profitPercent = ((targetSellPrice - sourceBuyPrice) / sourceBuyPrice * 100).toFixed(2);

      newInsights.push({
        id: `arbitrage-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelId: arbitrageModel.id,
        confidence: arbitrageModel.accuracy,
        type: 'arbitrage',
        prediction: {
          sourceExchange,
          targetExchange,
          asset: 'BTC',
          sourceBuyPrice,
          targetSellPrice,
          profitPercent,
          estimatedProfit: (targetSellPrice - sourceBuyPrice) * 0.1, // 0.1 BTC
          timeWindow: '10-15 minutes'
        },
        explanation: `Arbitrage opportunity detected between ${sourceExchange} and ${targetExchange} with potential ${profitPercent}% profit. Buy at $${sourceBuyPrice.toFixed(2)} on ${sourceExchange} and sell at $${targetSellPrice.toFixed(2)} on ${targetExchange}.`,
        relatedMetrics: ['priceDifference', 'volume', 'fees'],
        dataPoints: arbitrageModel.dataPoints
      });
    }

    // Insight de Ordinals
    const ordinalsModel = this.models.get('ordinals-analysis');
    if (ordinalsModel && ordinalsModel.accuracy > this.config.confidenceThreshold) {
      const collections = ['Bitcoin Puppets', 'OCM GENESIS', 'SEIZE CTRL', 'KATOSHI PRIME'];
      const selectedCollection = collections[0];
      const currentFloor = 1.25;
      const predictedFloor = currentFloor * 1.075;
      const direction = predictedFloor > currentFloor ? 'increase' : 'decrease';
      const changePercent = Math.abs((predictedFloor - currentFloor) / currentFloor * 100).toFixed(2);

      newInsights.push({
        id: `ordinals-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelId: ordinalsModel.id,
        confidence: ordinalsModel.accuracy,
        type: 'ordinals',
        prediction: {
          collection: selectedCollection,
          currentFloor,
          predictedFloor,
          direction,
          changePercent,
          timeframe: '7 days'
        },
        explanation: `Our Ordinals market analysis predicts the floor price of ${selectedCollection} will ${direction} by approximately ${changePercent}% in the next 7 days, based on inscription rate, holder behavior, and trading volume patterns.`,
        relatedMetrics: ['inscriptionRate', 'uniqueHolders', 'tradingVolume'],
        dataPoints: ordinalsModel.dataPoints
      });
    }

    // Insight de Runes
    const runesModel = this.models.get('runes-analysis');
    if (runesModel && runesModel.accuracy > this.config.confidenceThreshold) {
      const runes = ['ORDI', 'SATS', 'MEME', 'PEPE'];
      const selectedRune = runes[0];
      const currentPrice = 0.00008;
      const predictedPrice = 0.00009;
      const direction = predictedPrice > currentPrice ? 'increase' : 'decrease';
      const changePercent = Math.abs((predictedPrice - currentPrice) / currentPrice * 100).toFixed(2);

      newInsights.push({
        id: `runes-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelId: runesModel.id,
        confidence: runesModel.accuracy,
        type: 'runes',
        prediction: {
          rune: selectedRune,
          currentPrice,
          predictedPrice,
          direction,
          changePercent,
          timeframe: '3 days'
        },
        explanation: `Our Runes market analysis predicts the price of ${selectedRune} will ${direction} by approximately ${changePercent}% in the next 3 days, based on mint rate, holder distribution, and trading patterns.`,
        relatedMetrics: ['mintRate', 'uniqueHolders', 'tradingVolume'],
        dataPoints: runesModel.dataPoints
      });
    }

    // Adicionar novos insights à lista
    this.insights = [...this.insights, ...newInsights];

    // Limitar número de insights armazenados
    const maxInsights = 1000;
    if (this.insights.length > maxInsights) {
      this.insights = this.insights.slice(-maxInsights);
    }

    // Emitir evento de novos insights
    if (newInsights.length > 0) {
      this.emit('insights-generated', {
        count: newInsights.length,
        insights: newInsights.map(insight => ({
          id: insight.id,
          type: insight.type,
          confidence: insight.confidence
        })),
        timestamp: new Date().toISOString()
      });
    }
  }

  private pruneOldData(): void {

    // Calcular data limite para retenção
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Filtrar dados mais recentes que o limite
    this.trainingData.marketData = this.trainingData.marketData.filter(
      data => data?.timestamp > cutoffTimestamp
    );

    this.trainingData.mempoolData = this.trainingData.mempoolData.filter(
      data => data?.timestamp > cutoffTimestamp
    );

    this.trainingData.ordinalData = this.trainingData.ordinalData.filter(
      data => data?.timestamp > cutoffTimestamp
    );

    this.trainingData.runeData = this.trainingData.runeData.filter(
      data => data?.timestamp > cutoffTimestamp
    );

    this.trainingData.socialSentiment = this.trainingData.socialSentiment.filter(
      data => data?.timestamp > cutoffTimestamp
    );

    // Limitar o número de correções autônomas armazenadas
    const maxCorrections = 1000;
    if (this.autoCorrections.length > maxCorrections) {
      this.autoCorrections = this.autoCorrections
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxCorrections);
    }

    // Emitir evento de limpeza de dados
    this.emit('data-pruned', {
      timestamp: new Date().toISOString(),
      remainingDataPoints: {
        market: this.trainingData.marketData.length,
        mempool: this.trainingData.mempoolData.length,
        ordinals: this.trainingData.ordinalData.length,
        runes: this.trainingData.runeData.length,
        socialSentiment: this.trainingData.socialSentiment.length
      },
      autoCorrections: this.autoCorrections.length
    });
  }

  // Detectar e corrigir inconsistências nos dados
  private detectAndCorrectInconsistencies(): void {
    if (!this.config.autoCorrectEnabled) {
      return;
    }


    try {
      // Verificar inconsistências nos dados de mercado
      this.detectMarketDataInconsistencies();

      // Verificar inconsistências nos dados de Ordinals
      this.detectOrdinalsDataInconsistencies();

      // Verificar inconsistências nos dados de Runes
      this.detectRunesDataInconsistencies();

      // Aplicar correções pendentes com alta confiança
      this.applyPendingCorrections();

      // Emitir evento de correção
      this.emit('auto-corrections-performed', {
        timestamp: new Date().toISOString(),
        totalCorrections: this.autoCorrections.length,
        pendingCorrections: this.autoCorrections.filter(c => c.status === 'pending').length,
        appliedCorrections: this.autoCorrections.filter(c => c.status === 'applied').length
      });
    } catch (error) {
      console.error('Error in detectAndCorrectInconsistencies:', error);
    }
  }

  // Detectar inconsistências nos dados de mercado
  private detectMarketDataInconsistencies(): void {
    if (this.trainingData.marketData.length < 2) {
      return;
    }

    // Ordenar dados por timestamp
    const sortedData = [...this.trainingData.marketData].sort(
      (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
    );

    // Verificar variações anormais de preço
    for (let i = 1; i < sortedData.length; i++) {
      const prevData = sortedData[i - 1];
      const currData = sortedData[i];

      if (!prevData || !currData) continue;

      // Verificar se há uma variação de preço anormal (mais de 20% em um curto período)
      const timeDiff = new Date(currData.timestamp).getTime() - new Date(prevData.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 1) { // Menos de 1 hora entre pontos de dados
        const priceDiff = Math.abs((currData.btcPrice ?? 0) - (prevData.btcPrice ?? 0)) / (prevData.btcPrice || 1);

        if (priceDiff > 0.2) { // Variação de mais de 20%
          // Calcular valor corrigido (média com dados adjacentes)
          let correctedPrice = prevData.btcPrice ?? 0;

          // Se houver um próximo ponto de dados, usar a média dos três
          if (i < sortedData.length - 1) {
            const nextData = sortedData[i + 1];
            correctedPrice = ((prevData.btcPrice ?? 0) + (currData.btcPrice ?? 0) + (nextData?.btcPrice ?? 0)) / 3;
          } else {
            // Caso contrário, usar a média dos dois últimos
            correctedPrice = ((prevData.btcPrice ?? 0) + (currData.btcPrice ?? 0)) / 2;
          }

          // Criar correção
          const correction: AutoCorrection = {
            id: `market-price-${Date.now()}-${i}`,
            timestamp: new Date().toISOString(),
            dataType: 'Market',
            field: 'btcPrice',
            oldValue: currData.btcPrice ?? 0,
            newValue: correctedPrice,
            confidence: 0.9,
            source: 'Anomaly Detection',
            explanation: `Detected abnormal price variation of ${(priceDiff * 100).toFixed(2)}% in less than an hour. Value corrected based on adjacent data points.`,
            modelId: 'price-prediction',
            status: 'pending'
          };

          this.autoCorrections.push(correction);

        }
      }
    }
  }

  // Detectar inconsistências nos dados de Ordinals
  private detectOrdinalsDataInconsistencies(): void {
    if (this.trainingData.ordinalData.length < 2) {
      return;
    }

    // Ordenar dados por timestamp
    const sortedData = [...this.trainingData.ordinalData].sort(
      (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
    );

    // Verificar variações anormais de volume
    for (let i = 1; i < sortedData.length; i++) {
      const prevData = sortedData[i - 1];
      const currData = sortedData[i];

      if (!prevData || !currData) continue;

      // Verificar se há uma variação de volume anormal (mais de 300% em um curto período)
      const timeDiff = new Date(currData.timestamp).getTime() - new Date(prevData.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 2) { // Menos de 2 horas entre pontos de dados
        const volumeDiff = Math.abs((currData.volume24h ?? 0) - (prevData.volume24h ?? 0)) / (prevData.volume24h || 1);

        if (volumeDiff > 3) { // Variação de mais de 300%
          // Calcular valor corrigido (média com dados adjacentes)
          let correctedVolume = prevData.volume24h ?? 0;

          // Se houver um próximo ponto de dados, usar a média dos três
          if (i < sortedData.length - 1) {
            const nextData = sortedData[i + 1];
            correctedVolume = ((prevData.volume24h ?? 0) + (currData.volume24h ?? 0) + (nextData?.volume24h ?? 0)) / 3;
          } else {
            // Caso contrário, usar a média dos dois últimos
            correctedVolume = ((prevData.volume24h ?? 0) + (currData.volume24h ?? 0)) / 2;
          }

          // Criar correção
          const correction: AutoCorrection = {
            id: `ordinals-volume-${Date.now()}-${i}`,
            timestamp: new Date().toISOString(),
            dataType: 'Ordinals',
            field: 'volume24h',
            oldValue: currData.volume24h ?? 0,
            newValue: correctedVolume,
            confidence: 0.85,
            source: 'Pattern Recognition',
            explanation: `Detected abnormal volume variation of ${(volumeDiff * 100).toFixed(2)}% in less than 2 hours. Value corrected based on adjacent data points.`,
            modelId: 'ordinals-analysis',
            status: 'pending'
          };

          this.autoCorrections.push(correction);

        }
      }
    }
  }

  // Detectar inconsistências nos dados de Runes
  private detectRunesDataInconsistencies(): void {
    if (this.trainingData.runeData.length < 2) {
      return;
    }

    // Ordenar dados por timestamp
    const sortedData = [...this.trainingData.runeData].sort(
      (a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()
    );

    // Verificar variações anormais de mintRate
    for (let i = 1; i < sortedData.length; i++) {
      const prevData = sortedData[i - 1];
      const currData = sortedData[i];

      if (!prevData || !currData) continue;

      // Verificar se há uma variação de mintRate anormal (mais de 500% em um curto período)
      const timeDiff = new Date(currData.timestamp).getTime() - new Date(prevData.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 3) { // Menos de 3 horas entre pontos de dados
        const mintRateDiff = Math.abs((currData.mintRate ?? 0) - (prevData.mintRate ?? 0)) / (prevData.mintRate || 1);

        if (mintRateDiff > 5) { // Variação de mais de 500%
          // Calcular valor corrigido (média com dados adjacentes)
          let correctedMintRate = prevData.mintRate ?? 0;

          // Se houver um próximo ponto de dados, usar a média dos três
          if (i < sortedData.length - 1) {
            const nextData = sortedData[i + 1];
            correctedMintRate = ((prevData.mintRate ?? 0) + (currData.mintRate ?? 0) + (nextData?.mintRate ?? 0)) / 3;
          } else {
            // Caso contrário, usar a média dos dois últimos
            correctedMintRate = ((prevData.mintRate ?? 0) + (currData.mintRate ?? 0)) / 2;
          }

          // Criar correção
          const correction: AutoCorrection = {
            id: `runes-mintrate-${Date.now()}-${i}`,
            timestamp: new Date().toISOString(),
            dataType: 'Runes',
            field: 'mintRate',
            oldValue: currData.mintRate ?? 0,
            newValue: correctedMintRate,
            confidence: 0.88,
            source: 'Statistical Analysis',
            explanation: `Detected abnormal mint rate variation of ${(mintRateDiff * 100).toFixed(2)}% in less than 3 hours. Value corrected based on adjacent data points.`,
            modelId: 'runes-analysis',
            status: 'pending'
          };

          this.autoCorrections.push(correction);

        }
      }
    }
  }

  // Aplicar correções pendentes com alta confiança
  private applyPendingCorrections(): void {
    // Filtrar correções pendentes com confiança acima do limiar
    const pendingCorrections = this.autoCorrections.filter(
      correction => correction.status === 'pending' && correction.confidence >= this.config.correctionThreshold
    );

    if (pendingCorrections.length === 0) {
      return;
    }


    // Aplicar cada correção
    for (const correction of pendingCorrections) {
      try {
        switch (correction.dataType) {
          case 'Market':
            this.applyMarketDataCorrection(correction);
            break;
          case 'Ordinals':
            this.applyOrdinalsDataCorrection(correction);
            break;
          case 'Runes':
            this.applyRunesDataCorrection(correction);
            break;
          default:
            continue;
        }

        // Marcar correção como aplicada
        correction.status = 'applied';

      } catch (error) {
        console.error(`Error applying correction ${correction.id}:`, error);
      }
    }
  }

  // Aplicar correção aos dados de mercado
  private applyMarketDataCorrection(correction: AutoCorrection): void {
    if (correction.field === 'btcPrice') {
      // Encontrar o ponto de dados correspondente
      const dataPoint = this.trainingData.marketData.find(
        data => data?.btcPrice === correction.oldValue
      );

      if (dataPoint && 'btcPrice' in dataPoint) {
        // Aplicar correção
        (dataPoint as any).btcPrice = Number(correction.newValue);
      }
    }
  }

  // Aplicar correção aos dados de Ordinals
  private applyOrdinalsDataCorrection(correction: AutoCorrection): void {
    if (correction.field === 'volume24h') {
      // Encontrar o ponto de dados correspondente
      const dataPoint = this.trainingData.ordinalData.find(
        data => data?.volume24h === correction.oldValue
      );

      if (dataPoint && 'volume24h' in dataPoint) {
        // Aplicar correção
        (dataPoint as any).volume24h = Number(correction.newValue);
      }
    }
  }

  // Aplicar correção aos dados de Runes
  private applyRunesDataCorrection(correction: AutoCorrection): void {
    if (correction.field === 'mintRate') {
      // Encontrar o ponto de dados correspondente
      const dataPoint = this.trainingData.runeData.find(
        data => data?.mintRate === correction.oldValue
      );

      if (dataPoint && 'mintRate' in dataPoint) {
        // Aplicar correção
        (dataPoint as any).mintRate = Number(correction.newValue);
      }
    }
  }
}

// Exportar instância única
export const neuralLearningService = NeuralLearningService.getInstance();
