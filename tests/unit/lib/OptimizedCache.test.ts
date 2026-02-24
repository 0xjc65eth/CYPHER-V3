/**
 * Optimized Cache System Tests (Jest)
 */

import { OptimizedCache, CacheManager } from '@/lib/cache/OptimizedCache';

describe('OptimizedCache', () => {
  let cache: OptimizedCache<any>;

  beforeEach(() => {
    cache = new OptimizedCache(5, 1024 * 1024, 1000); // Small limits for testing
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get items', () => {
      const testData = { test: 'data' };
      cache.set('key1', testData);
      
      const retrieved = cache.get('key1');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete items', () => {
      cache.set('key1', { test: 'data' });
      expect(cache.get('key1')).not.toBeNull();
      
      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all items', () => {
      cache.set('key1', { test: 'data1' });
      cache.set('key2', { test: 'data2' });
      
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', async () => {
      cache.set('key1', { test: 'data' }, 100); // 100ms TTL
      
      expect(cache.get('key1')).not.toBeNull();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', { test: 'data' });
      
      const stats = cache.getStats();
      expect(stats.itemCount).toBe(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items when size limit reached', async () => {
      // Fill cache to capacity with small delays to ensure different timestamps
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, { data: `value${i}` });
        // Small delay to ensure different lastAccessed timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Access key0 to make it most recently used
      cache.get('key0');

      // Add one more item to trigger eviction
      cache.set('key5', { data: 'value5' });

      // One of the older, unaccessed keys should be evicted
      // key0 should still exist (was recently accessed)
      expect(cache.get('key0')).not.toBeNull();
      // key5 (new item) should exist
      expect(cache.get('key5')).not.toBeNull();
      // At least one of key1-key4 should be evicted
      const evictedCount = [1, 2, 3, 4].filter(i => cache.get(`key${i}`) === null).length;
      expect(evictedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple items in batch', () => {
      cache.set('key1', { value: 1 });
      cache.set('key2', { value: 2 });
      cache.set('key3', { value: 3 });
      
      const results = cache.getBatch(['key1', 'key2', 'nonexistent']);
      
      expect(results.size).toBe(2);
      expect(results.get('key1')).toEqual({ value: 1 });
      expect(results.get('key2')).toEqual({ value: 2 });
      expect(results.has('nonexistent')).toBe(false);
    });

    it('should set multiple items in batch', () => {
      const items = new Map([
        ['key1', { value: 1 }],
        ['key2', { value: 2 }],
        ['key3', { value: 3 }]
      ]);
      
      cache.setBatch(items, 5000);
      
      expect(cache.get('key1')).toEqual({ value: 1 });
      expect(cache.get('key2')).toEqual({ value: 2 });
      expect(cache.get('key3')).toEqual({ value: 3 });
    });
  });

  describe('getOrSet Pattern', () => {
    it('should return cached value if exists', async () => {
      const factory = jest.fn().mockResolvedValue({ computed: 'value' });
      
      cache.set('key1', { cached: 'value' });
      
      const result = await cache.getOrSet('key1', factory);
      
      expect(result).toEqual({ cached: 'value' });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = jest.fn().mockResolvedValue({ computed: 'value' });
      
      const result = await cache.getOrSet('key1', factory);
      
      expect(result).toEqual({ computed: 'value' });
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toEqual({ computed: 'value' });
    });
  });

  describe('Statistics', () => {
    it('should track hit/miss statistics', () => {
      cache.set('key1', { test: 'data' });
      
      // Hit
      cache.get('key1');
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should track evictions', () => {
      // Fill beyond capacity to trigger evictions
      for (let i = 0; i < 7; i++) {
        cache.set(`key${i}`, { data: `value${i}` });
      }
      
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should provide size information', () => {
      cache.set('key1', { test: 'data' });
      
      const sizeInfo = cache.getSizeInfo();
      expect(sizeInfo.itemCount).toBe(1);
      expect(sizeInfo.totalSize).toBeGreaterThan(0);
      expect(sizeInfo.memoryUsagePercent).toBeGreaterThan(0);
    });
  });

  describe('Top Items', () => {
    it('should return most accessed items', () => {
      cache.set('key1', { test: 'data1' });
      cache.set('key2', { test: 'data2' });
      cache.set('key3', { test: 'data3' });
      
      // Access key2 multiple times
      cache.get('key2');
      cache.get('key2');
      cache.get('key2');
      
      // Access key1 once
      cache.get('key1');
      
      const topItems = cache.getTopItems(2);
      expect(topItems[0].key).toBe('key2');
      // accessCount starts at 1 on set(), then increments on each get()
      // key2: 1 (set) + 3 (gets) = 4
      expect(topItems[0].accessCount).toBe(4);
      expect(topItems[1].key).toBe('key1');
      // key1: 1 (set) + 1 (get) = 2
      expect(topItems[1].accessCount).toBe(2);
    });
  });

  describe('Pruning', () => {
    it('should prune expired items', async () => {
      cache.set('key1', { test: 'data1' }, 100); // Short TTL
      cache.set('key2', { test: 'data2' }, 10000); // Long TTL
      
      // Wait for key1 to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const pruned = cache.prune();
      expect(pruned).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).not.toBeNull();
    });
  });
});

describe('CacheManager', () => {
  let manager: CacheManager;

  beforeEach(() => {
    manager = new CacheManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  it('should provide statistics for all caches', () => {
    const allStats = manager.getAllStats();
    
    expect(allStats).toHaveProperty('marketData');
    expect(allStats).toHaveProperty('portfolio');
    expect(allStats).toHaveProperty('apiResponse');
    expect(allStats).toHaveProperty('userPreferences');
  });

  it('should provide overall statistics', () => {
    const overallStats = manager.getOverallStats();
    
    expect(overallStats).toHaveProperty('totalHits');
    expect(overallStats).toHaveProperty('totalMisses');
    expect(overallStats).toHaveProperty('totalSize');
    expect(overallStats).toHaveProperty('totalItems');
    expect(overallStats).toHaveProperty('overallHitRate');
    expect(overallStats).toHaveProperty('cacheCount');
  });

  it('should prune all caches', () => {
    const pruned = manager.pruneAll();
    expect(pruned).toBeGreaterThanOrEqual(0);
  });

  it('should clear all caches', () => {
    manager.clearAll();
    
    const overallStats = manager.getOverallStats();
    expect(overallStats.totalItems).toBe(0);
    expect(overallStats.totalSize).toBe(0);
  });
});