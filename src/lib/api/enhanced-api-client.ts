import { ApiErrorHandler, ApiRetry, apiCircuitBreaker, ApiError, ApiErrorContext, RetryConfig } from './error-handler'
import { logger } from '@/lib/enhanced-logger'

export interface ApiRequestConfig {
  timeout?: number
  retries?: Partial<RetryConfig>
  circuitBreaker?: boolean
  skipErrorHandling?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
  requestId?: string
}

class EnhancedApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private requestIdCounter = 0

  constructor(baseURL = '', defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  /**
   * Make HTTP request with enhanced error handling
   */
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId()
    const url = this.buildUrl(endpoint)
    
    const context: ApiErrorContext = {
      endpoint,
      method,
      requestId,
      userId: this.getUserId() ?? undefined,
      sessionId: this.getSessionId() ?? undefined,
      requestBody: data,
      headers: { ...this.defaultHeaders, ...config.headers }
    }

    // Log request
    logger.info('API Request', {
      requestId,
      method,
      endpoint,
      hasData: !!data
    })

    const apiCall = () => this.makeRequest<T>(method, url, data, config, context)

    try {
      let result: ApiResponse<T>

      if (config.circuitBreaker !== false) {
        // Use circuit breaker by default
        const circuitKey = `${method}:${endpoint}`
        result = await apiCircuitBreaker.execute(circuitKey, apiCall, context)
      } else if (config.retries || config.retries !== null) {
        // Use retry mechanism
        result = await ApiRetry.withRetry(apiCall, context, config.retries)
      } else {
        // Direct call without retry or circuit breaker
        result = await apiCall()
      }

      // Log successful response
      logger.info('API Response', {
        requestId,
        status: result.status,
        hasData: !!result.data
      })

      return result
    } catch (error) {
      // Handle error if not already handled
      if (!config.skipErrorHandling && !(error as ApiError).timestamp) {
        throw ApiErrorHandler.handleError(error, context, config.retries)
      }
      throw error
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    data: any,
    config: ApiRequestConfig,
    context: ApiErrorContext
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const signal = config.signal || controller.signal

    // Set timeout
    let timeoutId: NodeJS.Timeout | undefined
    if (config.timeout) {
      timeoutId = setTimeout(() => controller.abort(), config.timeout)
    }

    try {
      const requestOptions: RequestInit = {
        method,
        headers: { ...this.defaultHeaders, ...config.headers },
        signal
      }

      if (data && method !== 'GET') {
        requestOptions.body = JSON.stringify(data)
      }

      const response = await fetch(url, requestOptions)
      
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Parse response
      let responseData: T
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = (await response.text()) as any
      }

      // Check if response is ok
      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: responseData,
            headers: this.getResponseHeaders(response)
          }
        }
      }

      return {
        data: responseData,
        status: response.status,
        headers: this.getResponseHeaders(response),
        requestId: context.requestId
      }
    } catch (error) {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Handle abort
      if (signal.aborted) {
        throw {
          code: 'TIMEOUT',
          message: 'Request timeout'
        }
      }

      throw error
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config)
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, config)
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config)
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config)
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config)
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint
    }
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`
  }

  /**
   * Get user ID from storage
   */
  private getUserId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId')
    } catch {
      return null
    }
  }

  /**
   * Get session ID from storage
   */
  private getSessionId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      let sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('sessionId', sessionId)
      }
      return sessionId
    } catch {
      return null
    }
  }

  /**
   * Extract response headers
   */
  private getResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  /**
   * Get current default headers
   */
  getDefaultHeaders(): Record<string, string> {
    return { ...this.defaultHeaders }
  }

  /**
   * Create a new instance with different base URL
   */
  create(baseURL: string, headers: Record<string, string> = {}): EnhancedApiClient {
    return new EnhancedApiClient(baseURL, { ...this.defaultHeaders, ...headers })
  }
}

// Create default instance
export const apiClient = new EnhancedApiClient()

// Export class for creating custom instances
export { EnhancedApiClient }

/**
 * Hook for React components to use API client with error handling
 */
export function useApiClient() {
  const handleApiError = React.useCallback((error: ApiError) => {
    // This can be extended to show notifications, etc.
    console.error('API Error:', error)
  }, [])

  const client = React.useMemo(() => {
    // Create a wrapper that handles errors for React components
    return {
      ...apiClient,
      async request<T>(...args: Parameters<typeof apiClient.request>): Promise<ApiResponse<T>> {
        try {
          return await apiClient.request<T>(...args)
        } catch (error) {
          handleApiError(error as ApiError)
          throw error
        }
      }
    }
  }, [handleApiError])

  return client
}

// React import for the hook
let React: any
try {
  React = require('react')
} catch {
  // React not available (e.g., in Node.js)
}