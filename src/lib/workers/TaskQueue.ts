import { WorkerTask, WorkerType, WorkerResult } from './WorkerPool';

export interface QueueMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  throughput: number; // tasks per second
}

export interface TaskScheduleOptions {
  delay?: number; // milliseconds
  retries?: number;
  priority?: number;
  timeout?: number;
}

export class TaskQueue {
  private taskHistory: Array<{
    task: WorkerTask;
    result?: WorkerResult;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }> = [];

  private scheduledTasks: Array<{
    task: WorkerTask;
    options: TaskScheduleOptions;
    scheduledTime: number;
  }> = [];

  private metrics: QueueMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    throughput: 0
  };

  constructor() {
    // Start scheduled task processor
    this.startScheduledTaskProcessor();
    this.startMetricsCalculator();
  }

  /**
   * Creates a high-priority analytics task
   */
  createAnalyticsTask(data: {
    prices: number[];
    volumes?: number[];
    indicators?: string[];
  }, priority: number = 10): Omit<WorkerTask, 'id' | 'timestamp'> {
    return {
      type: 'analytics',
      data,
      priority
    };
  }

  /**
   * Creates a price processing task
   */
  createPriceTask(data: {
    ohlcv: number[][];
    timeframe?: string;
    calculations?: string[];
  }, priority: number = 8): Omit<WorkerTask, 'id' | 'timestamp'> {
    return {
      type: 'price',
      data,
      priority
    };
  }

  /**
   * Creates a risk calculation task
   */
  createRiskTask(data: {
    portfolio: any;
    prices: number[];
    position?: any;
  }, priority: number = 9): Omit<WorkerTask, 'id' | 'timestamp'> {
    return {
      type: 'risk',
      data,
      priority
    };
  }

  /**
   * Creates a machine learning prediction task
   */
  createMLTask(data: {
    features: number[];
    model?: string;
    target?: string;
  }, priority: number = 7): Omit<WorkerTask, 'id' | 'timestamp'> {
    return {
      type: 'ml',
      data,
      priority
    };
  }

  /**
   * Creates a chart rendering task
   */
  createChartTask(data: {
    chartType: string;
    datasets: any[];
    options?: any;
  }, priority: number = 5): Omit<WorkerTask, 'id' | 'timestamp'> {
    return {
      type: 'chart',
      data,
      priority
    };
  }

  /**
   * Schedules a task to run later
   */
  scheduleTask(
    task: Omit<WorkerTask, 'id' | 'timestamp'>,
    options: TaskScheduleOptions = {}
  ): string {
    const taskId = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledTime = Date.now() + (options.delay || 0);

    this.scheduledTasks.push({
      task: {
        ...task,
        id: taskId,
        timestamp: Date.now()
      },
      options,
      scheduledTime
    });

    return taskId;
  }

  /**
   * Creates a batch of related tasks
   */
  createBatch(tasks: Array<{
    type: WorkerType;
    data: any;
    priority?: number;
  }>): Array<Omit<WorkerTask, 'id' | 'timestamp'>> {
    return tasks.map(task => ({
      type: task.type,
      data: task.data,
      priority: task.priority || 5
    }));
  }

  /**
   * Creates a parallel analysis workflow
   */
  createParallelAnalysis(priceData: number[], volumeData?: number[]): Array<Omit<WorkerTask, 'id' | 'timestamp'>> {
    const tasks: Array<Omit<WorkerTask, 'id' | 'timestamp'>> = [];

    // Price analysis
    tasks.push(this.createPriceTask({
      ohlcv: priceData.map((price, i) => [i, price, price, price, price, volumeData?.[i] || 0])
    }));

    // Analytics
    tasks.push(this.createAnalyticsTask({
      prices: priceData,
      volumes: volumeData,
      indicators: ['RSI', 'MACD', 'SMA']
    }));

    // ML prediction
    tasks.push(this.createMLTask({
      features: priceData.slice(-100), // Last 100 data points
      model: 'linear',
      target: 'price'
    }));

    // Risk assessment
    if (priceData.length > 20) {
      tasks.push(this.createRiskTask({
        portfolio: { prices: priceData },
        prices: priceData,
        position: { size: 1 }
      }));
    }

    return tasks;
  }

  /**
   * Records task execution start
   */
  recordTaskStart(task: WorkerTask): void {
    this.taskHistory.push({
      task,
      startTime: Date.now(),
      status: 'running'
    });
    this.metrics.totalTasks++;
  }

  /**
   * Records task completion
   */
  recordTaskCompletion(taskId: string, result: WorkerResult): void {
    const historyEntry = this.taskHistory.find(h => h.task.id === taskId);
    if (historyEntry) {
      historyEntry.result = result;
      historyEntry.endTime = Date.now();
      historyEntry.status = result.success ? 'completed' : 'failed';

      if (result.success) {
        this.metrics.completedTasks++;
      } else {
        this.metrics.failedTasks++;
      }
    }
  }

  /**
   * Gets optimized task priorities based on system load
   */
  getOptimizedPriorities(): Record<WorkerType, number> {
    const currentLoad = this.getCurrentSystemLoad();
    
    // Adjust priorities based on system performance
    if (currentLoad > 0.8) {
      // High load - prioritize essential tasks
      return {
        risk: 10,
        price: 9,
        analytics: 8,
        ml: 6,
        chart: 4
      };
    } else if (currentLoad > 0.5) {
      // Medium load - balanced priorities
      return {
        analytics: 9,
        price: 8,
        risk: 8,
        ml: 7,
        chart: 6
      };
    } else {
      // Low load - can handle all tasks
      return {
        analytics: 8,
        price: 8,
        risk: 8,
        ml: 8,
        chart: 7
      };
    }
  }

  /**
   * Gets current metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets task history for debugging
   */
  getTaskHistory(limit: number = 100): typeof this.taskHistory {
    return this.taskHistory.slice(-limit);
  }

  /**
   * Clears completed tasks from history
   */
  clearHistory(): void {
    this.taskHistory = this.taskHistory.filter(h => h.status === 'running');
  }

  private startScheduledTaskProcessor(): void {
    setInterval(() => {
      const now = Date.now();
      const readyTasks = this.scheduledTasks.filter(st => st.scheduledTime <= now);
      
      readyTasks.forEach(scheduledTask => {
        // Remove from scheduled tasks
        const index = this.scheduledTasks.indexOf(scheduledTask);
        if (index > -1) {
          this.scheduledTasks.splice(index, 1);
        }
        
        // Emit event or add to execution queue
        this.executeScheduledTask(scheduledTask);
      });
    }, 1000); // Check every second
  }

  private startMetricsCalculator(): void {
    setInterval(() => {
      this.calculateMetrics();
    }, 5000); // Update metrics every 5 seconds
  }

  private calculateMetrics(): void {
    const completedTasks = this.taskHistory.filter(h => h.status === 'completed');
    
    if (completedTasks.length > 0) {
      const totalExecutionTime = completedTasks.reduce((sum, task) => {
        if (task.endTime && task.result) {
          return sum + task.result.executionTime;
        }
        return sum;
      }, 0);
      
      this.metrics.averageExecutionTime = totalExecutionTime / completedTasks.length;
      
      // Calculate throughput (tasks completed in last minute)
      const oneMinuteAgo = Date.now() - 60000;
      const recentCompletions = completedTasks.filter(task => 
        task.endTime && task.endTime > oneMinuteAgo
      );
      this.metrics.throughput = recentCompletions.length / 60; // per second
    }
  }

  private getCurrentSystemLoad(): number {
    // Simple load calculation based on task completion rate
    const recentTasks = this.taskHistory.filter(h => 
      h.startTime > Date.now() - 30000 // Last 30 seconds
    );
    
    const failureRate = recentTasks.length > 0 
      ? recentTasks.filter(h => h.status === 'failed').length / recentTasks.length 
      : 0;
    
    const averageTime = this.metrics.averageExecutionTime;
    
    // Load based on failure rate and execution time
    return Math.min(failureRate * 2 + (averageTime / 10000), 1);
  }

  private executeScheduledTask(scheduledTask: any): void {
    // This would integrate with the WorkerPool to execute the task
  }
}

// Singleton instance
let taskQueueInstance: TaskQueue | null = null;

export function getTaskQueue(): TaskQueue {
  if (!taskQueueInstance) {
    taskQueueInstance = new TaskQueue();
  }
  return taskQueueInstance;
}