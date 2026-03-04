import { StoreApi, UseBoundStore } from 'zustand'

// Utility to create selectors for better performance
export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as S & { use: Record<string, any> }
  store.use = {}

  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }
  
  return store
}

// Performance-optimized selector creators
export const createSelectorFactory = <T>(store: UseBoundStore<StoreApi<T>>) => {
  return {
    // Shallow equality selector
    useShallow: <R>(selector: (state: T) => R) => 
      store(selector, (a, b) => Object.is(a, b)),
    
    // Deep equality selector (use sparingly)
    useDeep: <R>(selector: (state: T) => R) => 
      store(selector, (a, b) => JSON.stringify(a) === JSON.stringify(b)),
    
    // Array selector with shallow comparison
    useArray: <R>(selector: (state: T) => R[]) => 
      store(selector, (a, b) => 
        Array.isArray(a) && Array.isArray(b) && 
        a.length === b.length && 
        a.every((item, index) => Object.is(item, b[index]))
      ),
    
    // Object selector with shallow comparison
    useObject: <R extends Record<string, any>>(selector: (state: T) => R) => 
      store(selector, (a, b) => {
        if (typeof a !== 'object' || typeof b !== 'object') return Object.is(a, b)
        if (a === null || b === null) return Object.is(a, b)
        
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        
        if (keysA.length !== keysB.length) return false
        
        return keysA.every(key => Object.is(a[key], b[key]))
      }),
  }
}

// Memoized selectors for expensive computations
export const createMemoizedSelectors = <T>(store: UseBoundStore<StoreApi<T>>) => {
  const cache = new Map()
  
  return {
    // Memoized selector with custom cache key
    useMemoized: <R>(
      selector: (state: T) => R,
      keyFn: (state: T) => string,
      ttl = 5000 // 5 seconds TTL
    ) => {
      return store((state) => {
        const key = keyFn(state)
        const cached = cache.get(key)
        
        if (cached && Date.now() - cached.timestamp < ttl) {
          return cached.value
        }
        
        const value = selector(state)
        cache.set(key, { value, timestamp: Date.now() })
        
        // Clean up old cache entries
        if (cache.size > 100) {
          const oldestKey = cache.keys().next().value
          cache.delete(oldestKey)
        }
        
        return value
      })
    },
    
    // Clear memoization cache
    clearCache: () => cache.clear(),
  }
}

// Batched selectors for multiple state updates
export const createBatchedSelectors = <T>(store: UseBoundStore<StoreApi<T>>) => {
  let batchedUpdates: (() => void)[] = []
  let batchTimeout: ReturnType<typeof setTimeout> | null = null
  
  const flushBatch = () => {
    if (batchedUpdates.length > 0) {
      const updates = [...batchedUpdates]
      batchedUpdates = []
      updates.forEach(update => update())
    }
    batchTimeout = null
  }
  
  return {
    // Batch multiple state updates
    useBatched: <R>(selector: (state: T) => R) => {
      return store((state) => {
        const result = selector(state)
        
        // Batch updates to prevent excessive re-renders
        if (batchTimeout) {
          clearTimeout(batchTimeout)
        }
        
        batchTimeout = setTimeout(flushBatch, 16) // Next frame
        
        return result
      })
    },
    
    // Manually flush batched updates
    flushBatch,
  }
}

// Conditional selectors
export const createConditionalSelectors = <T>(store: UseBoundStore<StoreApi<T>>) => {
  return {
    // Only subscribe when condition is met
    useWhen: <R>(
      selector: (state: T) => R,
      condition: (state: T) => boolean
    ) => {
      return store((state) => {
        if (!condition(state)) {
          return undefined
        }
        return selector(state)
      })
    },
    
    // Subscribe with debouncing
    useDebounced: <R>(
      selector: (state: T) => R,
      delay = 300
    ) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let lastValue: R
      
      return store((state) => {
        const newValue = selector(state)
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        timeoutId = setTimeout(() => {
          lastValue = newValue
        }, delay)
        
        return lastValue ?? newValue
      })
    },
    
    // Subscribe with throttling
    useThrottled: <R>(
      selector: (state: T) => R,
      interval = 1000
    ) => {
      let lastCall = 0
      let lastValue: R
      
      return store((state) => {
        const now = Date.now()
        
        if (now - lastCall >= interval) {
          lastCall = now
          lastValue = selector(state)
        }
        
        return lastValue ?? selector(state)
      })
    },
  }
}

// Computed selectors for derived state
export const createComputedSelectors = <T>(store: UseBoundStore<StoreApi<T>>) => {
  return {
    // Create a computed selector that depends on other selectors
    useComputed: <R>(
      dependencies: ((state: T) => any)[],
      compute: (...deps: any[]) => R
    ) => {
      return store((state) => {
        const deps = dependencies.map(dep => dep(state))
        return compute(...deps)
      })
    },
    
    // Create a computed selector with caching
    useCachedComputed: <R>(
      dependencies: ((state: T) => any)[],
      compute: (...deps: any[]) => R,
      cacheKey?: string
    ) => {
      const cache = new Map()
      
      return store((state) => {
        const deps = dependencies.map(dep => dep(state))
        const key = cacheKey || JSON.stringify(deps)
        
        if (cache.has(key)) {
          return cache.get(key)
        }
        
        const result = compute(...deps)
        cache.set(key, result)
        
        return result
      })
    },
  }
}

// Export utility types
export type SelectorCreator<T> = ReturnType<typeof createSelectorFactory<T>>
export type MemoizedSelector<T> = ReturnType<typeof createMemoizedSelectors<T>>
export type BatchedSelector<T> = ReturnType<typeof createBatchedSelectors<T>>
export type ConditionalSelector<T> = ReturnType<typeof createConditionalSelectors<T>>
export type ComputedSelector<T> = ReturnType<typeof createComputedSelectors<T>>