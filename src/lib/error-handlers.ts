// Sistema de tratamento de erros e retry logic

import { cache } from 'react';

// Types
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

interface CachedResponse<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Safe Data Access Helper
export class SafeDataAccess {
  static getNestedValue<T>(
    obj: any,
    path: string,
    defaultValue: T
  ): T {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current?.[key] === undefined) {
          return defaultValue;
        }
        current = current[key];
      }
      
      return current as T;
    } catch (error) {
      return defaultValue;
    }
  }
  
  static getSafeArrayValue<T>(
    array: T[] | undefined | null,
    index: number,
    defaultValue: T
  ): T {
    if (!Array.isArray(array) || !array[index]) {
      return defaultValue;
    }
    return array[index];
  }
  
  static formatSafely(
    value: any,
    formatter: (val: number) => string,
    fallback: string = '0'
  ): string {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return fallback;
      return formatter(numValue);
    } catch (error) {
      return fallback;
    }
  }
}

// API Service com Retry e Cache
export class ResilientAPIService {
  private static cache = new Map<string, CachedResponse<any>>();
  private static pendingRequests = new Map<string, Promise<any>>();
  
  private static readonly config: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    timeout: 10000
  };
  
  static async fetchWithRetry<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    // Evitar requisições duplicadas
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Verificar cache
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const fetchPromise = this.performFetch<T>(url, options);
    this.pendingRequests.set(cacheKey, fetchPromise);
    
    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private static async performFetch<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.saveToCache(url, data);
        return data as T;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries - 1) {
          await this.delay(
            this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt)
          );
        }
      }
    }
    
    // Tentar cache expirado como fallback
    const staleCache = this.cache.get(url);
    if (staleCache) {
      return staleCache.data;
    }
    
    throw new Error(
      `Failed after ${this.config.maxRetries} attempts: ${lastError?.message}`
    );
  }
  
  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private static saveToCache(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Date Validator
export class DateValidator {
  static parseDate(value: any): Date | null {
    if (!value) return null;
    
    try {
      const date = new Date(value);
      
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // Verificar range válido
      const minDate = new Date('1970-01-01');
      const maxDate = new Date('2100-01-01');
      
      if (date < minDate || date > maxDate) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }
  
  static formatDateSafely(
    date: any,
    format: 'iso' | 'locale' | 'relative' = 'locale'
  ): string {
    const validDate = this.parseDate(date);
    if (!validDate) return 'Invalid Date';
    
    switch (format) {
      case 'iso':
        return validDate.toISOString();
      case 'locale':
        return validDate.toLocaleDateString('pt-BR');
      case 'relative':
        return this.getRelativeTime(validDate);
      default:
        return validDate.toString();
    }
  }
  
  private static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  }
}