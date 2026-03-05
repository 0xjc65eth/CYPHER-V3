// CoinMarketCap API Client
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CMC_CONFIG, buildEndpointUrl } from './config';
import { handleCMCError, retryWithBackoff } from './errors';
import { withCache } from './cache';
import { CMCResponse } from './types';

export class CMCClient {
  private client: AxiosInstance;
  private sandbox: boolean;

  constructor(options?: { sandbox?: boolean; apiKey?: string }) {
    this.sandbox = options?.sandbox || false;
    
    this.client = axios.create({
      baseURL: this.sandbox ? CMC_CONFIG.SANDBOX_URL : CMC_CONFIG.BASE_URL,
      headers: {
        ...CMC_CONFIG.HEADERS,
        'X-CMC_PRO_API_KEY': options?.apiKey || CMC_CONFIG.API_KEY,
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Log request in development
        // Request logged via interceptor
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        // Response logged via interceptor
        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Generic request method with caching and retry
  async request<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: {
      cache?: boolean;
      cacheTTL?: number;
      retry?: boolean;
      maxRetries?: number;
    }
  ): Promise<CMCResponse<T>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `/${CMC_CONFIG.VERSION}${endpoint}`,
      params,
    };

    const fetcher = async () => {
      try {
        const response = await this.client.request<CMCResponse<T>>(config);
        
        // Check API status
        if (response.data.status.error_code !== 0) {
          throw new Error(response.data.status.error_message || 'API Error');
        }

        return response.data;
      } catch (error) {
        handleCMCError(error, endpoint);
      }
    };

    // Use cache if enabled
    if (options?.cache !== false) {
      return withCache(
        endpoint,
        params,
        () => options?.retry !== false
          ? retryWithBackoff(fetcher, (options?.maxRetries ?? 3) as any)
          : fetcher(),
        options?.cacheTTL
      );
    }

    // Direct request with optional retry
    return options?.retry !== false
      ? retryWithBackoff(fetcher, (options?.maxRetries ?? 3) as any)
      : fetcher();
  }

  // Get request with automatic caching
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: {
      cache?: boolean;
      cacheTTL?: number;
      retry?: boolean;
      maxRetries?: number;
    }
  ): Promise<T> {
    const response = await this.request<T>(endpoint, params, options);
    return response.data;
  }

  // Post request (no caching)
  async post<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      const response = await this.client.post<CMCResponse<T>>(
        `/${CMC_CONFIG.VERSION}${endpoint}`,
        data,
        { params }
      );

      if (response.data.status.error_code !== 0) {
        throw new Error(response.data.status.error_message || 'API Error');
      }

      return response.data.data;
    } catch (error) {
      handleCMCError(error, endpoint);
    }
  }

  // Get credit count
  async getCreditCount(): Promise<{
    creditCount: number;
    creditLimit: number;
    creditLimitMonthly: number;
    creditLimitMonthlyReset: string;
  }> {
    try {
      const response = await this.get<any>(CMC_CONFIG.ENDPOINTS.KEY_INFO, undefined, {
        cache: false,
      });
      
      return {
        creditCount: response.usage.current_minute.credits_used,
        creditLimit: response.plan.credit_limit_daily,
        creditLimitMonthly: response.plan.credit_limit_monthly,
        creditLimitMonthlyReset: response.plan.credit_limit_monthly_reset,
      };
    } catch (error) {
      console.error('Failed to get credit count:', error);
      throw error;
    }
  }

  // Check if using sandbox
  isSandbox(): boolean {
    return this.sandbox;
  }

  // Switch between production and sandbox
  setSandbox(sandbox: boolean): void {
    this.sandbox = sandbox;
    this.client.defaults.baseURL = sandbox ? CMC_CONFIG.SANDBOX_URL : CMC_CONFIG.BASE_URL;
  }
}

// Singleton instance
let clientInstance: CMCClient | null = null;

// Get client instance
export function getCMCClient(options?: { sandbox?: boolean; apiKey?: string }): CMCClient {
  if (!clientInstance) {
    clientInstance = new CMCClient(options);
  } else if (options?.sandbox !== undefined && options.sandbox !== clientInstance.isSandbox()) {
    clientInstance.setSandbox(options.sandbox);
  }
  return clientInstance;
}

// Helper function to create a new client instance
export function createCMCClient(options?: { sandbox?: boolean; apiKey?: string }): CMCClient {
  return new CMCClient(options);
}