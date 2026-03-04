// Arquitetura com 50 Workers Paralelos
import React from 'react';

// Types
interface WorkerTask {
  id: string;
  type: 'analysis' | 'calculation' | 'fetch' | 'render' | 'ml';
  data: any;
  priority: number;
  timeout?: number;
}

interface WorkerResult {
  taskId: string;
  result: any;
  duration: number;
  workerId: number;
}

// Worker Pool Manager
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeJobs = new Map<string, { workerId: number; startTime: number }>();
  private workerStatus: boolean[] = [];
  
  constructor(private workerCount: number = 50) {
    // Only initialize workers in browser environment
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      this.initializeWorkers();
    }
  }
  
  private initializeWorkers() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Criar worker script inline
    const workerScript = `
      self.onmessage = async function(e) {
        const { id, type, data } = e.data;
        const startTime = performance.now();
        
        try {
          let result;
          
          switch (type) {
            case 'analysis':
              result = await performAnalysis(data);
              break;
            case 'calculation':
              result = await performCalculation(data);
              break;
            case 'fetch':
              result = await performFetch(data);
              break;
            case 'render':
              result = await performRender(data);
              break;
            case 'ml':
              result = await performML(data);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({
            taskId: id,
            result,
            duration: performance.now() - startTime,
            success: true
          });
        } catch (error) {
          self.postMessage({
            taskId: id,
            error: error.message,
            duration: performance.now() - startTime,
            success: false
          });
        }
      };
      
      // Worker functions
      async function performAnalysis(data) {
        // Análise de portfolio
        const { portfolio, metrics } = data;
        const analysis = {
          totalValue: portfolio.reduce((sum, asset) => sum + asset.value, 0),
          risk: calculateRisk(portfolio),
          suggestions: generateSuggestions(portfolio)
        };
        return analysis;
      }
      
      async function performCalculation(data) {
        // Cálculos complexos
        const { values, operation } = data;
        switch (operation) {
          case 'sharpe':
            return calculateSharpeRatio(values);
          case 'volatility':
            return calculateVolatility(values);
          case 'correlation':
            return calculateCorrelation(values);
          default:
            return null;
        }
      }
      
      async function performFetch(data) {
        // Fetch de dados externos
        const response = await fetch(data.url);
        return await response.json();
      }
      
      async function performRender(data) {
        // Preparar dados para renderização
        const { chartData, type } = data;
        return processChartData(chartData, type);
      }
      
      async function performML(data) {
        // Machine Learning simples
        const { dataset, model } = data;
        return runMLModel(dataset, model);
      }
      
      // Funções auxiliares
      function calculateRisk(portfolio) {
        return 50; // Deterministic default risk score
      }
      
      function generateSuggestions(portfolio) {
        return ['Diversificar mais', 'Rebalancear mensalmente'];
      }
      
      function calculateSharpeRatio(values) {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
        return mean / std;
      }
      
      function calculateVolatility(values) {
        const returns = [];
        for (let i = 1; i < values.length; i++) {
          returns.push((values[i] - values[i-1]) / values[i-1]);
        }
        return Math.sqrt(returns.reduce((sq, r) => sq + r * r, 0) / returns.length) * Math.sqrt(252);
      }
      
      function calculateCorrelation(values) {
        return 0.75; // Simplificado
      }
      
      function processChartData(data, type) {
        return data.map(d => ({ ...d, processed: true }));
      }
      
      function runMLModel(dataset, model) {
        return { prediction: 0.5, confidence: 0.85 };
      }
    `;
    
    // Criar blob e workers
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        this.handleWorkerMessage(i, e.data);
      };
      
      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error);
        this.workerStatus[i] = false;
      };
      
      this.workers.push(worker);
      this.workerStatus[i] = true;
    }
    
  }
  
  // Distribuir tarefa
  async distribute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      // Adicionar à fila
      this.taskQueue.push(task);
      
      // Processar fila
      this.processQueue();
      
      // Timeout handler
      if (task.timeout) {
        setTimeout(() => {
          if (this.activeJobs.has(task.id)) {
            reject(new Error(`Task ${task.id} timeout`));
          }
        }, task.timeout);
      }
      
      // Resolver quando concluído
      const checkInterval = setInterval(() => {
        if (!this.activeJobs.has(task.id) && !this.taskQueue.find(t => t.id === task.id)) {
          clearInterval(checkInterval);
        }
      }, 100);
    });
  }
  
  private processQueue() {
    // Ordenar por prioridade
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    // Distribuir tarefas para workers disponíveis
    for (let i = 0; i < this.workers.length; i++) {
      if (this.workerStatus[i] && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.assignToWorker(i, task);
      }
    }
  }
  
  private assignToWorker(workerId: number, task: WorkerTask) {
    this.workerStatus[workerId] = false;
    this.activeJobs.set(task.id, {
      workerId,
      startTime: Date.now()
    });
    
    this.workers[workerId].postMessage(task);
  }
  
  private handleWorkerMessage(workerId: number, message: any) {
    const { taskId, result, error, duration } = message;
    
    // Marcar worker como disponível
    this.workerStatus[workerId] = true;
    
    // Remover dos jobs ativos
    this.activeJobs.delete(taskId);
    
    if (error) {
      console.error(`Task ${taskId} failed:`, error);
    } else {
    }
    
    // Processar próxima tarefa
    this.processQueue();
  }
  
  // Estatísticas
  getStats() {
    const activeWorkers = this.workerStatus.filter(status => !status).length;
    const queueSize = this.taskQueue.length;
    const activeJobs = this.activeJobs.size;
    
    return {
      totalWorkers: this.workerCount,
      activeWorkers,
      idleWorkers: this.workerCount - activeWorkers,
      queueSize,
      activeJobs
    };
  }
  
  // Limpar recursos
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeJobs.clear();
  }
}

// Singleton instance - only create in browser
export const workerPool = typeof window !== 'undefined' ? new WorkerPool(50) : null;

// Hook para usar o Worker Pool
export function useWorkerPool() {
  const [stats, setStats] = React.useState(workerPool?.getStats() || {
    totalWorkers: 0,
    activeWorkers: 0,
    idleWorkers: 0,
    queueSize: 0,
    activeJobs: 0
  });
  
  React.useEffect(() => {
    if (!workerPool) return;
    
    const interval = setInterval(() => {
      setStats(workerPool.getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const executeTask = React.useCallback(async (
    type: WorkerTask['type'],
    data: any,
    priority: number = 5
  ) => {
    if (!workerPool) {
      throw new Error('Worker pool not available in server environment');
    }
    
    const task: WorkerTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      type,
      data,
      priority,
      timeout: 30000
    };
    
    return workerPool.distribute(task);
  }, []);
  
  return {
    stats,
    executeTask
  };
}