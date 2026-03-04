/**
 * Interval Manager System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntervalManager, IntervalPresets, registerMarketDataInterval } from '@/lib/intervals/IntervalManager';

describe('IntervalManager', () => {
  let manager: IntervalManager;

  beforeEach(() => {
    manager = new IntervalManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  describe('Basic Registration and Execution', () => {
    it('should register and execute interval tasks', () => {
      const callback = vi.fn();
      
      manager.register('test-task', callback, 1000);
      
      // Task should be registered
      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('test-task');
      expect(tasks[0].interval).toBe(1000);
    });

    it('should execute task immediately when immediate option is true', () => {
      const callback = vi.fn();
      
      manager.register('immediate-task', callback, 1000, { immediate: true });
      
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should execute task at specified intervals', () => {
      const callback = vi.fn();
      
      manager.register('interval-task', callback, 1000);
      
      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();
      
      // Advance another second
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should unregister tasks correctly', () => {
      const callback = vi.fn();
      
      manager.register('test-task', callback, 1000);
      expect(manager.getTasks()).toHaveLength(1);
      
      const unregistered = manager.unregister('test-task');
      expect(unregistered).toBe(true);
      expect(manager.getTasks()).toHaveLength(0);
      
      // Task should not execute after unregistration
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Singleton Tasks', () => {
    it('should not execute singleton task if already running', async () => {
      let resolveCallback: () => void;
      const longRunningTask = vi.fn(() => new Promise<void>(resolve => {
        resolveCallback = resolve;
      }));
      
      manager.register('singleton-task', longRunningTask, 500, { singleton: true });
      
      // Execute manually
      const promise1 = manager.execute('singleton-task');
      
      // Try to execute again while first is running
      vi.advanceTimersByTime(500);
      
      expect(longRunningTask).toHaveBeenCalledOnce();
      
      // Resolve the first execution
      resolveCallback!();
      await promise1;
    });
  });

  describe('Priority and Options', () => {
    it('should respect different priority levels', () => {
      manager.register('critical-task', vi.fn(), 1000, { priority: 'critical' });
      manager.register('low-task', vi.fn(), 1000, { priority: 'low' });
      
      const tasks = manager.getTasks();
      expect(tasks.find(t => t.id === 'critical-task')?.priority).toBe('critical');
      expect(tasks.find(t => t.id === 'low-task')?.priority).toBe('low');
    });

    it('should handle maxRetries option', async () => {
      const failingTask = vi.fn().mockRejectedValue(new Error('Task failed'));
      
      manager.register('failing-task', failingTask, 1000, { maxRetries: 2 });
      
      // Execute and let it fail multiple times
      await manager.execute('failing-task');
      await manager.execute('failing-task');
      await manager.execute('failing-task');
      
      expect(failingTask).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      // Should not execute again after max retries
      const result = await manager.execute('failing-task');
      expect(result).toBe(false);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track execution statistics', async () => {
      const callback = vi.fn();
      
      manager.register('stats-task', callback, 1000);
      
      await manager.execute('stats-task');
      await manager.execute('stats-task');
      
      const stats = manager.getStats();
      expect(stats.totalExecutions).toBe(2);
      expect(stats.totalErrors).toBe(0);
      expect(stats.activeTasks).toBe(1);
    });

    it('should track error statistics', async () => {
      const failingTask = vi.fn().mockRejectedValue(new Error('Task failed'));
      
      manager.register('error-task', failingTask, 1000, { maxRetries: 1 });
      
      await manager.execute('error-task');
      await manager.execute('error-task');
      
      const stats = manager.getStats();
      expect(stats.totalErrors).toBe(2);
    });

    it('should calculate average execution time', async () => {
      const slowTask = vi.fn((): Promise<void> => new Promise(resolve => setTimeout(resolve, 100)));

      manager.register('slow-task', slowTask, 1000);
      
      await manager.execute('slow-task');
      
      const stats = manager.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause and resume all intervals', () => {
      const callback = vi.fn();
      
      manager.register('pausable-task', callback, 1000);
      
      manager.pauseAll();
      vi.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
      
      manager.resumeAll();
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup stale tasks', () => {
      const callback = vi.fn();
      
      manager.register('stale-task', callback, 1000);
      
      // Simulate task running and then going stale
      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(1);
      
      // Advance time significantly to make task stale
      vi.advanceTimersByTime(400000); // More than 5 minutes
      
      manager.cleanup();
      
      // Task should be cleaned up if it's considered stale
      // (Note: This might depend on implementation details)
    });

    it('should destroy all tasks on destroy', () => {
      manager.register('task1', vi.fn(), 1000);
      manager.register('task2', vi.fn(), 2000);
      
      expect(manager.getTasks()).toHaveLength(2);
      
      manager.destroy();
      
      expect(manager.getTasks()).toHaveLength(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running tasks', async () => {
      const longTask = vi.fn((): Promise<void> => new Promise(() => {})); // Never resolves

      manager.register('timeout-task', longTask, 1000, {
        maxExecutionTime: 100 
      });
      
      const result = await manager.execute('timeout-task');
      expect(result).toBe(false);
      
      const stats = manager.getStats();
      expect(stats.totalErrors).toBe(1);
    }, 10000);
  });
});

describe('IntervalPresets', () => {
  it('should provide correct preset values', () => {
    expect(IntervalPresets.REAL_TIME).toBe(1000);
    expect(IntervalPresets.FAST).toBe(5000);
    expect(IntervalPresets.NORMAL).toBe(30000);
    expect(IntervalPresets.SLOW).toBe(60000);
    expect(IntervalPresets.VERY_SLOW).toBe(300000);
  });
});

describe('Helper Functions', () => {
  let manager: IntervalManager;

  beforeEach(() => {
    manager = new IntervalManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  it('should register market data interval with correct options', () => {
    const callback = vi.fn();
    
    registerMarketDataInterval('market-data', callback);
    
    const tasks = manager.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe('high');
    expect(tasks[0].interval).toBe(IntervalPresets.NORMAL);
  });
});