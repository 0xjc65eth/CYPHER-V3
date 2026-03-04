// CoinMarketCap API Error Handling
import { CMC_CONFIG } from './config';

export class CMCError extends Error {
  public statusCode: number;
  public errorCode: number;
  public errorMessage: string;
  public creditCount?: number;
  public endpoint?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode: number,
    errorMessage: string,
    creditCount?: number,
    endpoint?: string
  ) {
    super(message);
    this.name = 'CMCError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.creditCount = creditCount;
    this.endpoint = endpoint;
  }
}

export class CMCRateLimitError extends CMCError {
  public retryAfter?: number;

  constructor(
    message: string,
    statusCode: number,
    errorCode: number,
    errorMessage: string,
    retryAfter?: number,
    creditCount?: number,
    endpoint?: string
  ) {
    super(message, statusCode, errorCode, errorMessage, creditCount, endpoint);
    this.name = 'CMCRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class CMCNetworkError extends Error {
  public originalError: Error;
  public endpoint?: string;

  constructor(message: string, originalError: Error, endpoint?: string) {
    super(message);
    this.name = 'CMCNetworkError';
    this.originalError = originalError;
    this.endpoint = endpoint;
  }
}

export class CMCValidationError extends Error {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'CMCValidationError';
    this.field = field;
    this.value = value;
  }
}

// Error handler function
export function handleCMCError(error: any, endpoint?: string): never {
  // Handle API response errors
  if (error.response) {
    const { status, data } = error.response;
    const errorMessage = data?.status?.error_message || (CMC_CONFIG.ERROR_CODES as Record<number, string>)[status] || 'Unknown error';
    const errorCode = data?.status?.error_code || status;
    const creditCount = data?.status?.credit_count;

    // Rate limit error
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new CMCRateLimitError(
        `Rate limit exceeded: ${errorMessage}`,
        status,
        errorCode,
        errorMessage,
        retryAfter ? parseInt(retryAfter) : undefined,
        creditCount,
        endpoint
      );
    }

    // General API error
    throw new CMCError(
      `API Error (${status}): ${errorMessage}`,
      status,
      errorCode,
      errorMessage,
      creditCount,
      endpoint
    );
  }

  // Handle network errors
  if (error.request) {
    throw new CMCNetworkError(
      'Network error: No response received from CoinMarketCap API',
      error,
      endpoint
    );
  }

  // Handle other errors
  throw new CMCNetworkError(
    `Unexpected error: ${error.message}`,
    error,
    endpoint
  );
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = CMC_CONFIG.RETRY.MAX_ATTEMPTS,
  initialDelay = CMC_CONFIG.RETRY.INITIAL_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on validation errors
      if (error instanceof CMCValidationError) {
        throw error;
      }

      // Don't retry on 4xx errors (except rate limit)
      if (error instanceof CMCError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      // Check if we should retry
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(CMC_CONFIG.RETRY.MULTIPLIER, attempt - 1),
        CMC_CONFIG.RETRY.MAX_DELAY
      );

      // If rate limited, use the retry-after header if available
      if (error instanceof CMCRateLimitError && error.retryAfter) {
        await new Promise(resolve => setTimeout(resolve, error.retryAfter! * 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

// Validate required parameters
export function validateParams(params: Record<string, any>, required: string[]): void {
  for (const field of required) {
    if (!params[field]) {
      throw new CMCValidationError(
        `Missing required parameter: ${field}`,
        field,
        params[field]
      );
    }
  }
}

// Validate parameter types
export function validateParamTypes(params: Record<string, any>, types: Record<string, string>): void {
  for (const [field, expectedType] of Object.entries(types)) {
    if (params[field] !== undefined) {
      const actualType = typeof params[field];
      if (actualType !== expectedType) {
        throw new CMCValidationError(
          `Invalid parameter type for ${field}: expected ${expectedType}, got ${actualType}`,
          field,
          params[field]
        );
      }
    }
  }
}

// Validate parameter ranges
export function validateParamRanges(params: Record<string, any>, ranges: Record<string, { min?: number; max?: number }>): void {
  for (const [field, range] of Object.entries(ranges)) {
    if (params[field] !== undefined) {
      const value = params[field];
      
      if (range.min !== undefined && value < range.min) {
        throw new CMCValidationError(
          `Parameter ${field} is below minimum value: ${value} < ${range.min}`,
          field,
          value
        );
      }
      
      if (range.max !== undefined && value > range.max) {
        throw new CMCValidationError(
          `Parameter ${field} exceeds maximum value: ${value} > ${range.max}`,
          field,
          value
        );
      }
    }
  }
}