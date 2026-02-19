/**
 * Advanced Interval Management System
 * Prevents overlapping intervals and optimizes resource usage
 */

interface IntervalTask {
  id: string;
  callback: () => Promise<void> | void;
  interval: number;
  lastRun: number;
  isRunning: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  maxExecutionTime: number;
  retryCount: number;
  maxRetries: number;
  singleton: boolean;
}

interface IntervalOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  maxExecutionTime?: number;
  maxRetries?: number;
  singleton?: boolean; // Only one instance can run
  immediate?: boolean; // Run immediately on registration
}

export class IntervalManager {
  private tasks = new Map<string, IntervalTask>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private isActive = true;
  private stats = {
    totalExecutions: 0,
    totalErrors: 0,
    averageExecutionTime: 0,
    lastCleanup: Date.now()
  };

  /**
   * Register a new interval task
   */
  register(
    id: string,
    callback: () => Promise<void> | void,
    interval: number,
    options: IntervalOptions = {}
  ): void {
    const {
      priority = 'medium',
      maxExecutionTime = 30000, // 30 seconds
      maxRetries = 3,
      singleton = false,
      immediate = false
    } = options;

    // Stop existing task if it exists
    this.unregister(id);

    const task: IntervalTask = {
      id,
      callback,
      interval,
      lastRun: 0,
      isRunning: false,
      priority,
      maxExecutionTime,
      retryCount: 0,
      maxRetries,
      singleton
    };

    this.tasks.set(id, task);

    // Start the interval
    const timer = setInterval(() => {
      this.executeTask(id);
    }, interval);

    this.timers.set(id, timer);

    // Run immediately if requested
    if (immediate) {
      this.executeTask(id);
    }

  }

  /**
   * Unregister an interval task
   */
  unregister(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }

    const task = this.tasks.get(id);
    if (task) {
      this.tasks.delete(id);
      return true;
    }

    return false;
  }

  /**
   * Execute a specific task manually
   */
  async execute(id: string): Promise<boolean> {
    return this.executeTask(id);
  }

  /**
   * Pause all intervals
   */
  pauseAll(): void {
    this.isActive = false;
  }

  /**
   * Resume all intervals
   */
  resumeAll(): void {
    this.isActive = true;
  }

  /**
   * Get list of registered tasks
   */
  getTasks(): Array<{
    id: string;
    interval: number;
    priority: string;
    isRunning: boolean;
    lastRun: number;
    retryCount: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      interval: task.interval,
      priority: task.priority,
      isRunning: task.isRunning,
      lastRun: task.lastRun,
      retryCount: task.retryCount
    }));
  }

  /**
   * Get system statistics
   */
  getStats() {
    const runningTasks = Array.from(this.tasks.values()).filter(t => t.isRunning).length;
    const totalTasks = this.tasks.size;
    
    return {
      ...this.stats,
      activeTasks: totalTasks,
      runningTasks,
      isActive: this.isActive,
      memoryUsage: process.memoryUsage?.() || null
    };
  }

  /**
   * Clean up inactive or failed tasks
   */
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes

    for (const [id, task] of this.tasks) {
      // Remove tasks that haven't run for a long time and aren't running
      if (!task.isRunning && now - task.lastRun > staleThreshold) {
        this.unregister(id);
      }

      // Reset retry count for tasks that haven't failed recently
      if (task.retryCount > 0 && now - task.lastRun > 60000) {
        task.retryCount = 0;
      }
    }

    this.stats.lastCleanup = now;
  }

  /**
   * Stop all intervals and cleanup
   */
  destroy(): void {
    for (const id of this.tasks.keys()) {
      this.unregister(id);
    }
  }

  /**
   * Private: Execute a task with error handling and timing
   */
  private async executeTask(id: string): Promise<boolean> {
    if (!this.isActive) return false;

    const task = this.tasks.get(id);
    if (!task) return false;

    // Check if task is already running and is singleton
    if (task.singleton && task.isRunning) {
      return false;
    }

    // Check if task has exceeded retry limit
    if (task.retryCount >= task.maxRetries) {
      return false;
    }

    const startTime = Date.now();
    task.isRunning = true;
    task.lastRun = startTime;

    try {
      // Set timeout for task execution
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.maxExecutionTime);
      });

      // Execute task with timeout
      await Promise.race([
        Promise.resolve(task.callback()),
        timeoutPromise
      ]);

      // Task completed successfully
      task.retryCount = 0;
      this.stats.totalExecutions++;
      
      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return true;

    } catch (error) {
      task.retryCount++;
      this.stats.totalErrors++;

      console.error(`📊 Task ${id} failed (retry ${task.retryCount}/${task.maxRetries}):`, error);

      // If max retries reached, we might want to disable the task
      if (task.retryCount >= task.maxRetries) {
        console.error(`📊 Task ${id} disabled after ${task.maxRetries} failures`);
      }

      return false;

    } finally {
      task.isRunning = false;
    }
  }

  /**
   * Private: Update average execution time
   */
  private updateAverageExecutionTime(newTime: number): void {
    const currentAvg = this.stats.averageExecutionTime;
    const executions = this.stats.totalExecutions;
    
    this.stats.averageExecutionTime = 
      (currentAvg * (executions - 1) + newTime) / executions;
  }
}

// Global interval manager instance
export const intervalManager = new IntervalManager();

// Auto-cleanup every 5 minutes
intervalManager.register(
  'system-cleanup',
  () => intervalManager.cleanup(),
  300000, // 5 minutes
  { priority: 'low', immediate: false }
);

// Optimized intervals for common use cases
export const IntervalPresets = {
  REAL_TIME: 1000,      // 1 second
  FAST: 5000,           // 5 seconds  
  NORMAL: 30000,        // 30 seconds
  SLOW: 60000,          // 1 minute
  VERY_SLOW: 300000,    // 5 minutes
} as const;

// Helper functions for common patterns
export const registerMarketDataInterval = (
  id: string,
  callback: () => Promise<void> | void,
  interval: number = IntervalPresets.NORMAL
) => {
  intervalManager.register(id, callback, interval, {
    priority: 'high',
    singleton: true,
    immediate: true
  });
};

export const registerPortfolioInterval = (
  id: string,
  callback: () => Promise<void> | void,
  interval: number = IntervalPresets.SLOW
) => {
  intervalManager.register(id, callback, interval, {
    priority: 'medium',
    singleton: true,
    immediate: false
  });
};

export const registerSystemInterval = (
  id: string,
  callback: () => Promise<void> | void,
  interval: number = IntervalPresets.VERY_SLOW
) => {
  intervalManager.register(id, callback, interval, {
    priority: 'low',
    singleton: true,
    immediate: false
  });
};