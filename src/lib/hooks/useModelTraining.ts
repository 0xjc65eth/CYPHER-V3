import { useState, useCallback, useEffect } from 'react';
import { modelTrainer, TrainingResult } from '@/lib/ai/training/modelTrainer';
import { modelPersistence } from '@/lib/ai/persistence/modelPersistence';
import { devLogger } from '@/lib/logger';

/**
 * Hook para gerenciar treinamento de modelos de IA
 */

export interface TrainingStatus {
  isTraining: boolean;
  progress: number;
  currentModel: string | null;
  logs: string[];
}

export interface ModelInfo {
  name: string;
  currentVersion: string | null;
  lastTrained: string | null;
  metrics?: {
    accuracy: number;
    loss: number;
  };
}

export function useModelTraining() {
  const [status, setStatus] = useState<TrainingStatus>({
    isTraining: false,
    progress: 0,
    currentModel: null,
    logs: []
  });

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [trainingResults, setTrainingResults] = useState<TrainingResult[]>([]);

  // Adicionar log ao status
  const addLog = useCallback((message: string) => {
    setStatus(prev => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`]
    }));
  }, []);

  // Carregar informações dos modelos
  const loadModels = useCallback(async () => {
    try {
      const modelList = await modelPersistence.listModels();
      
      const modelInfo: ModelInfo[] = modelList.map(model => {
        return {
          name: model.name,
          currentVersion: (model as any).version || null,
          lastTrained: (model as any).timestamp || null,
          metrics: (model as any).metrics
        };
      });
      
      setModels(modelInfo);
    } catch (error) {
      devLogger.error(error as Error, 'Erro ao carregar modelos');
      addLog('Erro ao carregar informações dos modelos');
    }
  }, [addLog]);

  // Treinar modelo específico
  const trainModel = useCallback(async (modelName: string) => {
    try {
      setStatus({
        isTraining: true,
        progress: 0,
        currentModel: modelName,
        logs: []
      });
      
      addLog(`Iniciando treinamento do modelo: ${modelName}`);
      
      let result: TrainingResult;
      
      switch (modelName) {
        case 'price-predictor':
          // Simular progresso durante o treinamento
          const progressInterval = setInterval(() => {
            setStatus(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 10, 90)
            }));
          }, 2000);
          
          result = await (modelTrainer as any).trainPricePredictor();
          clearInterval(progressInterval);
          break;

        case 'sentiment-analyzer':
          result = await (modelTrainer as any).trainSentimentAnalyzer();
          break;
          
        default:
          throw new Error(`Modelo desconhecido: ${modelName}`);
      }
      
      setStatus(prev => ({ ...prev, progress: 100 }));
      addLog(`Treinamento concluído! Accuracy: ${result.accuracy.toFixed(2)}%`);
      
      // Adicionar resultado
      setTrainingResults(prev => [...prev, result]);
      
      // Recarregar informações dos modelos
      await loadModels();
      
      return result;
    } catch (error) {
      devLogger.error(error as Error, `Erro ao treinar modelo ${modelName}`);
      addLog(`Erro no treinamento: ${(error as Error).message}`);
      throw error;
    } finally {
      setStatus(prev => ({
        ...prev,
        isTraining: false,
        currentModel: null
      }));
    }
  }, [addLog, loadModels]);

  // Executar backtest
  const runBacktest = useCallback(async (modelName: string) => {
    try {
      addLog(`Iniciando backtest para ${modelName}`);
      
      const results = await (modelTrainer as any).runBacktest(modelName);
      
      addLog(`Backtest concluído:`);
      addLog(`- Accuracy: ${results.accuracy.toFixed(2)}%`);
      addLog(`- Profitability: ${results.profitability.toFixed(2)}%`);
      addLog(`- Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
      addLog(`- Max Drawdown: ${results.maxDrawdown.toFixed(2)}%`);
      
      return results;
    } catch (error) {
      devLogger.error(error as Error, `Erro no backtest de ${modelName}`);
      addLog(`Erro no backtest: ${(error as Error).message}`);
      throw error;
    }
  }, [addLog]);

  // Exportar modelo
  const exportModel = useCallback(async (modelName: string, version?: string) => {
    try {
      const jsonData = await modelPersistence.exportModel(modelName);
      if (!jsonData) throw new Error('Model not found');

      // Criar link de download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cypher-ai-${modelName}-${version || 'latest'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog(`Modelo ${modelName} exportado com sucesso`);
    } catch (error) {
      devLogger.error(error as Error, `Erro ao exportar modelo ${modelName}`);
      addLog(`Erro na exportação: ${(error as Error).message}`);
      throw error;
    }
  }, [addLog]);

  // Importar modelo
  const importModel = useCallback(async (file: File) => {
    try {
      const fileContent = await file.text();
      const version = await modelPersistence.importModel(fileContent);
      addLog(`Modelo importado com sucesso: v${version}`);
      
      // Recarregar lista de modelos
      await loadModels();
      
      return version;
    } catch (error) {
      devLogger.error(error as Error, 'Erro ao importar modelo');
      addLog(`Erro na importação: ${(error as Error).message}`);
      throw error;
    }
  }, [addLog, loadModels]);

  // Iniciar auto-treinamento
  const startAutoTraining = useCallback(async (intervalHours: number = 24) => {
    try {
      addLog(`Iniciando auto-treinamento com intervalo de ${intervalHours} horas`);
      await (modelTrainer as any).startAutoTraining(intervalHours);
      addLog('Auto-treinamento ativado com sucesso');
    } catch (error) {
      devLogger.error(error as Error, 'Erro ao iniciar auto-treinamento');
      addLog(`Erro: ${(error as Error).message}`);
      throw error;
    }
  }, [addLog]);

  // Limpar modelos antigos
  const cleanupOldModels = useCallback(async (daysToKeep: number = 30) => {
    try {
      const deletedCount = await (modelPersistence as any).cleanupOldModels(daysToKeep);
      addLog(`${deletedCount} modelos antigos removidos`);
      
      // Recarregar lista
      await loadModels();
      
      return deletedCount;
    } catch (error) {
      devLogger.error(error as Error, 'Erro ao limpar modelos');
      addLog(`Erro na limpeza: ${(error as Error).message}`);
      throw error;
    }
  }, [addLog, loadModels]);

  // Carregar modelos ao montar
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return {
    status,
    models,
    trainingResults,
    trainModel,
    runBacktest,
    exportModel,
    importModel,
    startAutoTraining,
    cleanupOldModels,
    reloadModels: loadModels
  };
}