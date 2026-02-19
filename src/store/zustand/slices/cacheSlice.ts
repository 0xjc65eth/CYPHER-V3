import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  stale: boolean
  hits: number
  lastAccess: number
  tags: string[]
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  stalePurges: number
  manualPurges: number
  lastPurge: number
}

export interface CacheState {
  // Cache data
  entries: Record<string, CacheEntry>
  
  // Cache configuration
  config: {
    defaultTTL: number
    maxEntries: number
    maxSize: number
    enableStats: boolean
    autoCleanup: boolean
    cleanupInterval: number
  }
  
  // Cache statistics
  stats: CacheStats
  
  // Cache tags for bulk operations
  tags: Record<string, string[]>
  
  // Background operations
  backgroundTasks: {
    cleanup: boolean
    compression: boolean
    persistence: boolean
  }
}

export interface CacheActions {
  // Basic cache operations
  setCacheData: <T>(key: string, data: T, ttl?: number, tags?: string[]) => void
  getCacheData: <T>(key: string) => T | null
  hasCacheData: (key: string) => boolean
  deleteCacheData: (key: string) => void
  
  // Bulk operations
  setCacheEntries: (entries: Record<string, { data: any; ttl?: number; tags?: string[] }>) => void
  getCacheEntries: (keys: string[]) => Record<string, any>
  deleteCacheEntries: (keys: string[]) => void
  
  // Tag-based operations
  setCacheByTag: (tag: string, entries: Record<string, { data: any; ttl?: number }>) => void
  getCacheByTag: (tag: string) => Record<string, any>
  deleteCacheByTag: (tag: string) => void
  invalidateTag: (tag: string) => void
  
  // Cache management
  clearCache: () => void
  pruneStaleEntries: () => void
  compressCache: () => void
  getStats: () => CacheStats
  resetStats: () => void
  
  // Configuration
  updateCacheConfig: (config: Partial<CacheState['config']>) => void
  
  // Background operations
  startBackgroundCleanup: () => void
  stopBackgroundCleanup: () => void
  enableCompression: () => void
  disableCompression: () => void
  
  // Cache warming
  warmCache: (entries: Record<string, { data: any; ttl?: number; tags?: string[] }>) => void
  preloadCache: (keys: string[], loader: (key: string) => Promise<any>) => Promise<void>
  
  // Cache validation
  validateCache: () => boolean
  repairCache: () => void
  
  // Export/Import
  exportCache: () => string
  importCache: (data: string) => void
}

export interface CacheSlice {
  cache: CacheState
  setCacheData: CacheActions['setCacheData']
  getCacheData: CacheActions['getCacheData']
  hasCacheData: CacheActions['hasCacheData']
  deleteCacheData: CacheActions['deleteCacheData']
  setCacheEntries: CacheActions['setCacheEntries']
  getCacheEntries: CacheActions['getCacheEntries']
  deleteCacheEntries: CacheActions['deleteCacheEntries']
  setCacheByTag: CacheActions['setCacheByTag']
  getCacheByTag: CacheActions['getCacheByTag']
  deleteCacheByTag: CacheActions['deleteCacheByTag']
  invalidateTag: CacheActions['invalidateTag']
  clearCache: CacheActions['clearCache']
  pruneStaleEntries: CacheActions['pruneStaleEntries']
  compressCache: CacheActions['compressCache']
  getStats: CacheActions['getStats']
  resetStats: CacheActions['resetStats']
  updateCacheConfig: CacheActions['updateCacheConfig']
  startBackgroundCleanup: CacheActions['startBackgroundCleanup']
  stopBackgroundCleanup: CacheActions['stopBackgroundCleanup']
  enableCompression: CacheActions['enableCompression']
  disableCompression: CacheActions['disableCompression']
  warmCache: CacheActions['warmCache']
  preloadCache: CacheActions['preloadCache']
  validateCache: CacheActions['validateCache']
  repairCache: CacheActions['repairCache']
  exportCache: CacheActions['exportCache']
  importCache: CacheActions['importCache']
}

const initialCacheState: CacheState = {
  entries: {},
  config: {
    defaultTTL: 300000, // 5 minutes
    maxEntries: 1000,
    maxSize: 50 * 1024 * 1024, // 50MB
    enableStats: true,
    autoCleanup: true,
    cleanupInterval: 60000, // 1 minute
  },
  stats: {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    stalePurges: 0,
    manualPurges: 0,
    lastPurge: 0,
  },
  tags: {},
  backgroundTasks: {
    cleanup: false,
    compression: false,
    persistence: false,
  },
}

// Utility functions
const calculateSize = (data: any): number => {
  return JSON.stringify(data).length * 2 // Rough estimate
}

const isStale = (entry: CacheEntry): boolean => {
  return Date.now() - entry.timestamp > entry.ttl
}

export const createCacheSlice: StateCreator<
  RootState,
  [],
  [],
  CacheSlice
> = (set, get) => {
  let cleanupInterval: NodeJS.Timeout | null = null
  
  const updateStats = () => {
    const { entries, config } = get().cache
    const now = Date.now()
    
    const totalEntries = Object.keys(entries).length
    const totalSize = Object.values(entries).reduce((sum, entry) => sum + calculateSize(entry.data), 0)
    const totalHits = Object.values(entries).reduce((sum, entry) => sum + entry.hits, 0)
    const totalAccess = totalHits + get().cache.stats.missRate
    
    set((state) => {
      state.cache.stats.totalEntries = totalEntries
      state.cache.stats.totalSize = totalSize
      state.cache.stats.hitRate = totalAccess > 0 ? (totalHits / totalAccess) * 100 : 0
    })
  }
  
  return {
    cache: initialCacheState,
    
    setCacheData: <T>(key: string, data: T, ttl?: number, tags: string[] = []) => {
      const { config } = get().cache
      const now = Date.now()
      
      set((state) => {
        // Check cache limits
        if (Object.keys(state.cache.entries).length >= config.maxEntries) {
          // Remove oldest entry
          const oldestKey = Object.keys(state.cache.entries)
            .sort((a, b) => state.cache.entries[a].lastAccess - state.cache.entries[b].lastAccess)[0]
          delete state.cache.entries[oldestKey]
        }
        
        // Create cache entry
        const entry: CacheEntry<T> = {
          data,
          timestamp: now,
          ttl: ttl || config.defaultTTL,
          stale: false,
          hits: 0,
          lastAccess: now,
          tags,
        }
        
        state.cache.entries[key] = entry
        
        // Update tag mappings
        tags.forEach(tag => {
          if (!state.cache.tags[tag]) {
            state.cache.tags[tag] = []
          }
          if (!state.cache.tags[tag].includes(key)) {
            state.cache.tags[tag].push(key)
          }
        })
      })
      
      updateStats()
    },
    
    getCacheData: <T>(key: string): T | null => {
      const { entries, config, stats } = get().cache
      const entry = entries[key]
      
      if (!entry) {
        if (config.enableStats) {
          set((state) => {
            state.cache.stats.missRate++
          })
        }
        return null
      }
      
      if (isStale(entry)) {
        get().deleteCacheData(key)
        if (config.enableStats) {
          set((state) => {
            state.cache.stats.missRate++
          })
        }
        return null
      }
      
      // Update access stats
      set((state) => {
        const cacheEntry = state.cache.entries[key]
        if (cacheEntry) {
          cacheEntry.hits++
          cacheEntry.lastAccess = Date.now()
        }
      })
      
      return entry.data as T
    },
    
    hasCacheData: (key: string): boolean => {
      const { entries } = get().cache
      const entry = entries[key]
      return entry ? !isStale(entry) : false
    },
    
    deleteCacheData: (key: string) => {
      set((state) => {
        const entry = state.cache.entries[key]
        if (entry) {
          // Remove from tag mappings
          entry.tags.forEach(tag => {
            if (state.cache.tags[tag]) {
              state.cache.tags[tag] = state.cache.tags[tag].filter(k => k !== key)
              if (state.cache.tags[tag].length === 0) {
                delete state.cache.tags[tag]
              }
            }
          })
          
          delete state.cache.entries[key]
          state.cache.stats.manualPurges++
        }
      })
      
      updateStats()
    },
    
    setCacheEntries: (entries: Record<string, { data: any; ttl?: number; tags?: string[] }>) => {
      Object.entries(entries).forEach(([key, { data, ttl, tags }]) => {
        get().setCacheData(key, data, ttl, tags)
      })
    },
    
    getCacheEntries: (keys: string[]): Record<string, any> => {
      const result: Record<string, any> = {}
      keys.forEach(key => {
        const data = get().getCacheData(key)
        if (data !== null) {
          result[key] = data
        }
      })
      return result
    },
    
    deleteCacheEntries: (keys: string[]) => {
      keys.forEach(key => {
        get().deleteCacheData(key)
      })
    },
    
    setCacheByTag: (tag: string, entries: Record<string, { data: any; ttl?: number }>) => {
      Object.entries(entries).forEach(([key, { data, ttl }]) => {
        get().setCacheData(key, data, ttl, [tag])
      })
    },
    
    getCacheByTag: (tag: string): Record<string, any> => {
      const { tags } = get().cache
      const keys = tags[tag] || []
      return get().getCacheEntries(keys)
    },
    
    deleteCacheByTag: (tag: string) => {
      const { tags } = get().cache
      const keys = tags[tag] || []
      get().deleteCacheEntries(keys)
    },
    
    invalidateTag: (tag: string) => {
      set((state) => {
        const keys = state.cache.tags[tag] || []
        keys.forEach(key => {
          const entry = state.cache.entries[key]
          if (entry) {
            entry.stale = true
          }
        })
      })
    },
    
    clearCache: () => {
      set((state) => {
        state.cache.entries = {}
        state.cache.tags = {}
        state.cache.stats.manualPurges++
        state.cache.stats.lastPurge = Date.now()
      })
      
      updateStats()
    },
    
    pruneStaleEntries: () => {
      set((state) => {
        const now = Date.now()
        const keysToDelete: string[] = []
        
        Object.entries(state.cache.entries).forEach(([key, entry]) => {
          if (isStale(entry) || entry.stale) {
            keysToDelete.push(key)
          }
        })
        
        keysToDelete.forEach(key => {
          const entry = state.cache.entries[key]
          if (entry) {
            // Remove from tag mappings
            entry.tags.forEach(tag => {
              if (state.cache.tags[tag]) {
                state.cache.tags[tag] = state.cache.tags[tag].filter(k => k !== key)
                if (state.cache.tags[tag].length === 0) {
                  delete state.cache.tags[tag]
                }
              }
            })
            delete state.cache.entries[key]
          }
        })
        
        state.cache.stats.stalePurges += keysToDelete.length
        state.cache.stats.lastPurge = now
      })
      
      updateStats()
    },
    
    compressCache: () => {
      // Implementation would depend on compression library
    },
    
    getStats: (): CacheStats => {
      updateStats()
      return get().cache.stats
    },
    
    resetStats: () => {
      set((state) => {
        state.cache.stats = {
          totalEntries: Object.keys(state.cache.entries).length,
          totalSize: Object.values(state.cache.entries).reduce((sum, entry) => sum + calculateSize(entry.data), 0),
          hitRate: 0,
          missRate: 0,
          stalePurges: 0,
          manualPurges: 0,
          lastPurge: Date.now(),
        }
      })
    },
    
    updateCacheConfig: (config: Partial<CacheState['config']>) => {
      set((state) => {
        state.cache.config = { ...state.cache.config, ...config }
      })
    },
    
    startBackgroundCleanup: () => {
      const { config } = get().cache
      
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
      }
      
      cleanupInterval = setInterval(() => {
        get().pruneStaleEntries()
      }, config.cleanupInterval)
      
      set((state) => {
        state.cache.backgroundTasks.cleanup = true
      })
    },
    
    stopBackgroundCleanup: () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
      }
      
      set((state) => {
        state.cache.backgroundTasks.cleanup = false
      })
    },
    
    enableCompression: () => {
      set((state) => {
        state.cache.backgroundTasks.compression = true
      })
    },
    
    disableCompression: () => {
      set((state) => {
        state.cache.backgroundTasks.compression = false
      })
    },
    
    warmCache: (entries: Record<string, { data: any; ttl?: number; tags?: string[] }>) => {
      get().setCacheEntries(entries)
    },
    
    preloadCache: async (keys: string[], loader: (key: string) => Promise<any>) => {
      const promises = keys.map(async (key) => {
        try {
          const data = await loader(key)
          get().setCacheData(key, data)
        } catch (error) {
          console.error(`Failed to preload cache for key: ${key}`, error)
        }
      })
      
      await Promise.allSettled(promises)
    },
    
    validateCache: (): boolean => {
      try {
        const { entries, tags } = get().cache
        
        // Validate entries structure
        for (const [key, entry] of Object.entries(entries)) {
          if (!entry.data || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
            return false
          }
        }
        
        // Validate tag mappings
        for (const [tag, keys] of Object.entries(tags)) {
          for (const key of keys) {
            if (!entries[key] || !entries[key].tags.includes(tag)) {
              return false
            }
          }
        }
        
        return true
      } catch (error) {
        return false
      }
    },
    
    repairCache: () => {
      set((state) => {
        // Repair tag mappings
        const newTags: Record<string, string[]> = {}
        
        Object.entries(state.cache.entries).forEach(([key, entry]) => {
          entry.tags.forEach(tag => {
            if (!newTags[tag]) {
              newTags[tag] = []
            }
            if (!newTags[tag].includes(key)) {
              newTags[tag].push(key)
            }
          })
        })
        
        state.cache.tags = newTags
      })
    },
    
    exportCache: (): string => {
      const { entries, config, stats } = get().cache
      return JSON.stringify({
        entries,
        config,
        stats,
        timestamp: Date.now(),
      })
    },
    
    importCache: (data: string) => {
      try {
        const imported = JSON.parse(data)
        
        set((state) => {
          state.cache.entries = imported.entries || {}
          state.cache.config = { ...state.cache.config, ...imported.config }
          state.cache.stats = { ...state.cache.stats, ...imported.stats }
        })
        
        // Rebuild tag mappings
        get().repairCache()
        updateStats()
      } catch (error) {
        console.error('Failed to import cache data:', error)
      }
    },
  }
}