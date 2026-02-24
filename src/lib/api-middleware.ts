import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string;
}

// Authentication configuration
export interface AuthConfig {
  required: boolean;
  apiKey?: boolean;
  jwt?: boolean;
  scope?: string[];
}

// Request validation schema
export const BaseRequestSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
});

// Middleware options
export interface MiddlewareOptions {
  rateLimit?: RateLimitConfig;
  auth?: AuthConfig;
  validation?: z.ZodSchema<any>;
  cache?: {
    ttl: number; // Time to live in seconds
    key?: string;
  };
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || realIP || cfIP || 'unknown';
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    const key = config.keyGenerator ? config.keyGenerator(request) : getClientIP(request);
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }
    
    if (now > current.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }
    
    if (current.count >= config.maxRequests) {
      return NextResponse.json(
        createErrorResponse('Rate limit exceeded', {
          retryAfter: Math.ceil((current.resetTime - now) / 1000),
          limit: config.maxRequests,
          window: config.windowMs / 1000
        }),
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - current.count).toString(),
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        }
      );
    }
    
    current.count++;
    return null; // Allow request
  };
}

/**
 * Authentication middleware
 */
export function authenticate(config: AuthConfig) {
  return (request: NextRequest): NextResponse | null => {
    if (!config.required) return null;
    
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    if (config.apiKey && !apiKey) {
      return NextResponse.json(
        createErrorResponse('API key required'),
        { status: 401 }
      );
    }
    
    if (config.jwt && !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        createErrorResponse('Authorization token required'),
        { status: 401 }
      );
    }
    
    // TODO: Implement actual JWT validation and API key verification
    
    return null; // Allow request
  };
}

/**
 * Request validation middleware
 */
export function validateRequest(schema: z.ZodSchema<any>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        return NextResponse.json(
          createErrorResponse('Validation failed', {
            errors: result.error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          }),
          { status: 400 }
        );
      }
      
      // Attach validated data to request (Note: This is conceptual as we can't modify the request object)
      return null; // Allow request
    } catch (error) {
      return NextResponse.json(
        createErrorResponse('Invalid JSON body'),
        { status: 400 }
      );
    }
  };
}

/**
 * Cache middleware
 */
const cache = new Map<string, { data: any; expires: number }>();

export function cacheResponse(config: { ttl: number; key?: string }) {
  return {
    get: (request: NextRequest): any | null => {
      const key = config.key || `${request.method}:${request.url}`;
      const cached = cache.get(key);
      
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
      
      if (cached) {
        cache.delete(key);
      }
      
      return null;
    },
    set: (request: NextRequest, data: any): void => {
      const key = config.key || `${request.method}:${request.url}`;
      cache.set(key, {
        data,
        expires: Date.now() + (config.ttl * 1000)
      });
    }
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: ApiResponse['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    meta
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    ...(details && { details })
  };
}

/**
 * API route wrapper with middleware support
 */
export function withMiddleware(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let requestId = generateRequestId();
    
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitResult = rateLimit(options.rateLimit)(request);
        if (rateLimitResult) return rateLimitResult;
      }
      
      // Apply authentication
      if (options.auth) {
        const authResult = authenticate(options.auth)(request);
        if (authResult) return authResult;
      }
      
      // Apply validation
      if (options.validation && (request.method === 'POST' || request.method === 'PUT')) {
        const validationResult = await validateRequest(options.validation)(request);
        if (validationResult) return validationResult;
      }
      
      // Check cache
      if (options.cache && request.method === 'GET') {
        const cacheUtil = cacheResponse(options.cache);
        const cached = cacheUtil.get(request);
        if (cached) {
          return NextResponse.json({
            ...cached,
            meta: {
              ...cached.meta,
              cached: true,
              responseTime: Date.now() - startTime
            }
          });
        }
      }
      
      // Execute handler
      const response = await handler(request);
      
      // Cache response if configured
      if (options.cache && request.method === 'GET' && response.ok) {
        const cacheUtil = cacheResponse(options.cache);
        const responseData = await response.clone().json();
        cacheUtil.set(request, responseData);
      }
      
      // Add timing headers
      const responseTime = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      response.headers.set('X-Request-ID', requestId);
      
      return response;
      
    } catch (error) {
      console.error('API Middleware Error:', error);
      
      return NextResponse.json(
        createErrorResponse(
          'Internal server error',
          process.env.NODE_ENV === 'development' ? {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          } : undefined
        ),
        { 
          status: 500,
          headers: {
            'X-Request-ID': requestId,
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      );
    }
  };
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

/**
 * Standard CORS preflight handler
 */
export function handleCORS(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Log API request
 */
export function logRequest(request: NextRequest, response?: NextResponse) {
  const log = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIP(request),
    status: response?.status,
    requestId: response?.headers.get('X-Request-ID')
  };
  
}