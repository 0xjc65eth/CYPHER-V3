// Base Hiro API Client with Error Handling and Rate Limiting

import axios, { AxiosInstance, AxiosError } from 'axios'
import { logger } from '@/lib/logger'
import { HiroAPIError } from './types'

// API Configuration
const HIRO_API_BASE = process.env.NEXT_PUBLIC_HIRO_API_ENDPOINT || 'https://api.hiro.so'
const HIRO_API_KEY = process.env.HIRO_API_KEY
const HIRO_API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_HIRO_API_TIMEOUT || '30000')

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Max requests per window

export class HiroAPIBase {
  protected axiosInstance: AxiosInstance
  private requestCount: number = 0
  private windowStart: number = Date.now()
  private requestQueue: Array<() => Promise<any>> = []
  private processing: boolean = false

  constructor(basePath: string = '') {
    this.axiosInstance = axios.create({
      baseURL: `${HIRO_API_BASE}${basePath}`,
      timeout: HIRO_API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(HIRO_API_KEY && { 'x-api-key': HIRO_API_KEY })
      }
    })

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`Hiro API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error(error instanceof Error ? error : new Error(String(error)), 'Hiro API Request Error')
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Hiro API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error: AxiosError) => {
        return this.handleError(error)
      }
    )
  }

  // Rate-limited request execution
  protected async request<T>(fn: () => Promise<T>): Promise<T> {
    // Check rate limit
    if (this.shouldRateLimit()) {
      return this.queueRequest(fn)
    }

    // Execute request
    try {
      this.incrementRequestCount()
      return await fn()
    } catch (error) {
      throw error
    }
  }

  // Check if rate limiting is needed
  private shouldRateLimit(): boolean {
    const now = Date.now()
    
    // Reset window if expired
    if (now - this.windowStart > RATE_LIMIT_WINDOW) {
      this.windowStart = now
      this.requestCount = 0
    }

    return this.requestCount >= RATE_LIMIT_MAX_REQUESTS
  }

  // Queue request for later execution
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      // Process queue if not already processing
      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  // Process queued requests
  private async processQueue(): Promise<void> {
    this.processing = true

    while (this.requestQueue.length > 0) {
      // Wait for rate limit window to reset if needed
      if (this.shouldRateLimit()) {
        const waitTime = RATE_LIMIT_WINDOW - (Date.now() - this.windowStart)
        await this.sleep(waitTime)
        this.windowStart = Date.now()
        this.requestCount = 0
      }

      // Process next request
      const request = this.requestQueue.shift()
      if (request) {
        this.incrementRequestCount()
        await request()
      }
    }

    this.processing = false
  }

  // Increment request count
  private incrementRequestCount(): void {
    this.requestCount++
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Error handler
  private async handleError(error: AxiosError): Promise<never> {
    const apiError: HiroAPIError = {
      error: 'API_ERROR',
      message: 'An error occurred while fetching data',
      statusCode: error.response?.status || 500,
      details: error.response?.data
    }

    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 400:
          apiError.error = 'BAD_REQUEST'
          apiError.message = 'Invalid request parameters'
          break
        case 401:
          apiError.error = 'UNAUTHORIZED'
          apiError.message = 'Invalid or missing API key'
          break
        case 403:
          apiError.error = 'FORBIDDEN'
          apiError.message = 'Access forbidden'
          break
        case 404:
          apiError.error = 'NOT_FOUND'
          apiError.message = 'Resource not found'
          break
        case 429:
          apiError.error = 'RATE_LIMITED'
          apiError.message = 'Too many requests. Please try again later'
          break
        case 500:
        case 502:
        case 503:
        case 504:
          apiError.error = 'SERVER_ERROR'
          apiError.message = 'Server error. Please try again later'
          break
      }

      // Extract error message from response if available
      if (error.response.data && typeof error.response.data === 'object') {
        const responseData = error.response.data as any
        if (responseData.error) {
          apiError.message = responseData.error
        } else if (responseData.message) {
          apiError.message = responseData.message
        }
      }
    } else if (error.request) {
      apiError.error = 'NETWORK_ERROR'
      apiError.message = 'Network error. Please check your connection'
    }

    logger.error('Hiro API Error:', apiError)
    throw apiError
  }

  // Build query string from object
  protected buildQueryString(params: Record<string, any>): string {
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)

    return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : ''
  }

  // Validate pagination params
  protected validatePagination(limit?: number, offset?: number): {
    limit: number
    offset: number
  } {
    return {
      limit: Math.min(Math.max(limit || 20, 1), 100),
      offset: Math.max(offset || 0, 0)
    }
  }

  // Retry failed requests with exponential backoff
  protected async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error: any) {
        lastError = error
        
        // Don't retry on client errors (4xx)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error
        }

        // Wait before retrying with exponential backoff
        if (i < maxRetries - 1) {
          await this.sleep(delay * Math.pow(2, i))
        }
      }
    }

    throw lastError
  }
}