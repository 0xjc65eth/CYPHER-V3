// Performance Optimization Utilities

import { lazy, ComponentType, LazyExoticComponent } from 'react'

// Lazy Loading with Prefetch
export function lazyWithPrefetch<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> & { prefetch: () => void } {
  const LazyComponent: any = lazy(importFn)
  LazyComponent.prefetch = () => { importFn() }
  return LazyComponent
}

// Code Splitting Helpers
export const routeModules = {
  // AI Features
  cypherAI: () => import('@/app/cypher-ai/page'),
  dualMode: () => import('@/app/dual-mode/page'),
  neural: () => import('@/app/neural/page'),
  
  // Trading Features
  arbitrage: () => import('@/app/arbitrage/page'),
  market: () => import('@/app/market/page'),
  trading: () => import('@/app/trading/page'),
  
  // Bitcoin Ecosystem
  ordinals: () => import('@/app/ordinals/page'),
  runes: () => import('@/app/runes/page'),
  brc20: () => import('@/app/brc20/page'),
  rareSats: () => import('@/app/rare-sats/page'),
  
  // Analytics
  analytics: () => import('@/app/analytics/page'),
  portfolio: () => import('@/app/portfolio/page'),
  miners: () => import('@/app/miners/page'),
  
  // Social & Community
  social: () => import('@/app/social/page'),
  training: () => import('@/app/training/page'),
  
  // System
  integrations: () => import('@/app/integrations/page'),
}

// Memoization Helpers
interface MemoCache {
  [key: string]: {
    value: any
    timestamp: number
    ttl: number
  }
}

const memoCache: MemoCache = {}

export function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 60000 // Default 1 minute
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)
    const cached = memoCache[key]
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value
    }
    
    const result = fn(...args)
    memoCache[key] = {
      value: result,
      timestamp: Date.now(),
      ttl
    }
    
    return result
  }) as T
}

// Debounce with Leading Edge
export function debounceLeading<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  let leadingCall = true
  
  const debounced = (...args: Parameters<T>): ReturnType<T> | undefined => {
    if (leadingCall) {
      leadingCall = false
      return fn(...args)
    }
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      leadingCall = true
      fn(...args)
    }, delay)
    
    return undefined
  }
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    leadingCall = true
  }
  
  return debounced as T & { cancel: () => void }
}

// Throttle with Trailing Edge
export function throttleTrailing<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 100
): T {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null
  
  return ((...args: Parameters<T>): ReturnType<T> | undefined => {
    lastArgs = args
    
    if (!inThrottle) {
      inThrottle = true
      
      setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs)
        }
        inThrottle = false
      }, limit)
      
      return fn(...args)
    }
    
    return undefined
  }) as T
}

// Batch Updates
interface BatchUpdate<T> {
  id: string
  update: T
  timestamp: number
}

export class BatchProcessor<T> {
  private queue: BatchUpdate<T>[] = []
  private processing = false
  private batchSize: number
  private batchDelay: number
  private processor: (updates: T[]) => Promise<void>
  
  constructor(
    processor: (updates: T[]) => Promise<void>,
    batchSize: number = 50,
    batchDelay: number = 100
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.batchDelay = batchDelay
  }
  
  add(id: string, update: T) {
    this.queue.push({ id, update, timestamp: Date.now() })
    
    if (!this.processing) {
      this.processBatch()
    }
  }
  
  private async processBatch() {
    this.processing = true
    
    await new Promise(resolve => setTimeout(resolve, this.batchDelay))
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize)
      const updates = batch.map(item => item.update)
      
      try {
        await this.processor(updates)
      } catch (error) {
        console.error('Batch processing error:', error)
        // Re-queue failed items
        this.queue.unshift(...batch)
      }
    }
    
    this.processing = false
  }
}

// Virtual List Helper
export interface VirtualListItem {
  index: number
  start: number
  end: number
  size: number
}

export function calculateVisibleItems(
  scrollTop: number,
  containerHeight: number,
  itemCount: number,
  itemHeight: number | ((index: number) => number),
  overscan: number = 3
): VirtualListItem[] {
  const getItemHeight = typeof itemHeight === 'function' ? itemHeight : () => itemHeight
  
  const items: VirtualListItem[] = []
  let accumulatedHeight = 0
  let startIndex = -1
  let endIndex = -1
  
  for (let i = 0; i < itemCount; i++) {
    const height = getItemHeight(i)
    
    if (startIndex === -1 && accumulatedHeight + height > scrollTop) {
      startIndex = Math.max(0, i - overscan)
    }
    
    if (startIndex !== -1 && accumulatedHeight > scrollTop + containerHeight) {
      endIndex = Math.min(itemCount - 1, i + overscan)
      break
    }
    
    if (startIndex !== -1 && i >= startIndex) {
      items.push({
        index: i,
        start: accumulatedHeight,
        end: accumulatedHeight + height,
        size: height
      })
    }
    
    accumulatedHeight += height
  }
  
  if (endIndex === -1) {
    endIndex = itemCount - 1
  }
  
  return items
}

// Request Idle Callback Polyfill
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => {
        const start = Date.now()
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          } as IdleDeadline)
        }, 1)
      }

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : clearTimeout

// Performance Observer
export function observePerformance(callback: (entries: PerformanceEntry[]) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}
  }
  
  const observer = new PerformanceObserver((list) => {
    callback(list.getEntries())
  })
  
  observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] })
  
  return () => observer.disconnect()
}

// Memory Management
export function releaseMemory() {
  // Clear memoization cache
  Object.keys(memoCache).forEach(key => {
    delete memoCache[key]
  })
  
  // Force garbage collection if available
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as any).gc()
  }
}

// Intersection Observer for Lazy Loading
export function createLazyLoadObserver(
  onIntersect: (element: Element) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onIntersect(entry.target)
      }
    })
  }, {
    rootMargin: '50px',
    ...options
  })
}

// Web Worker Pool
export class WorkerPool<T = any, R = any> {
  private workers: Worker[] = []
  private queue: Array<{ data: T; resolve: (value: R) => void; reject: (error: any) => void }> = []
  private activeWorkers = 0
  
  constructor(
    private workerScript: string,
    private maxWorkers: number = navigator.hardwareConcurrency || 4
  ) {}
  
  async process(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject })
      this.processQueue()
    })
  }
  
  private processQueue() {
    if (this.queue.length === 0 || this.activeWorkers >= this.maxWorkers) {
      return
    }
    
    const { data, resolve, reject } = this.queue.shift()!
    this.activeWorkers++
    
    let worker: Worker
    
    if (this.workers.length < this.maxWorkers) {
      worker = new Worker(this.workerScript)
      this.workers.push(worker)
    } else {
      worker = this.workers[this.activeWorkers - 1]
    }
    
    const handleMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      
      this.activeWorkers--
      resolve(event.data)
      this.processQueue()
    }
    
    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      
      this.activeWorkers--
      reject(error)
      this.processQueue()
    }
    
    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(data)
  }
  
  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.queue = []
    this.activeWorkers = 0
  }
}

// Prefetch Resources
export function prefetchResources(urls: string[]) {
  if (typeof window === 'undefined') return
  
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  })
}

// Critical CSS Extraction
export function extractCriticalCSS(selector: string = 'body'): string {
  if (typeof window === 'undefined') return ''
  
  const element = document.querySelector(selector)
  if (!element) return ''
  
  const styles = window.getComputedStyle(element)
  const criticalStyles: string[] = []
  
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i]
    const value = styles.getPropertyValue(prop)
    if (value && value !== 'initial' && value !== 'inherit') {
      criticalStyles.push(`${prop}: ${value}`)
    }
  }
  
  return criticalStyles.join('; ')
}