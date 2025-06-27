/**
 * CYPHER ORDI FUTURE v3.1.0 - Wallet APIs Status & Monitoring
 * API para monitorar status, cache e rate limiting das APIs de carteira
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCache, RATE_LIMITS } from '@/lib/apiCache';
import { cacheService } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

interface ApiHealthStatus {
  provider: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime?: number;
  successRate?: number;
  lastSuccess?: number;
  lastFailure?: number;
  totalRequests?: number;
  rateLimitStatus: {
    requests: number;
    remaining: number;
    resetTime: number | null;
    blocked: boolean;
  };
}

interface SystemStatus {
  overall_status: 'healthy' | 'degraded' | 'down';
  timestamp: number;
  cache: {
    redis_available: boolean;
    memory_cache_size: number;
    memory_keys_sample: string[];
  };
  apis: ApiHealthStatus[];
  rate_limits: Record<string, any>;
  system_metrics: {
    uptime: number;
    total_requests: number;
    cache_hit_rate?: number;
    avg_response_time?: number;
  };
}

/**
 * Calculate API health status based on metrics
 */
function calculateHealthStatus(stats: any): 'healthy' | 'degraded' | 'down' | 'unknown' {
  if (!stats) return 'unknown';
  
  const { totalRequests, successfulRequests, lastSuccess, lastFailure } = stats;
  
  if (totalRequests === 0) return 'unknown';
  
  const successRate = successfulRequests / totalRequests;
  const lastSuccessAge = lastSuccess ? Date.now() - lastSuccess : Infinity;
  const lastFailureAge = lastFailure ? Date.now() - lastFailure : Infinity;
  
  // If success rate is very low or no recent success
  if (successRate < 0.5 || lastSuccessAge > 10 * 60 * 1000) { // 10 minutes
    return 'down';
  }
  
  // If success rate is low or recent failures
  if (successRate < 0.8 || (lastFailureAge < 5 * 60 * 1000 && lastFailureAge < lastSuccessAge)) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Main Status API Handler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';
    const provider = searchParams.get('provider');

    devLogger.log('API', 'Fetching wallet APIs status');

    // Get cache status
    const cacheStatus = cacheService.getStatus();
    
    // Get rate limit status
    const rateLimitStatus = apiCache.getRateLimitStatus();
    
    // Get API health for all providers or specific provider
    const apiHealth = await apiCache.getApiHealth(provider as any);
    
    // Build API status array
    const apiStatuses: ApiHealthStatus[] = [];
    
    const providers = provider ? [provider] : Object.keys(RATE_LIMITS);
    
    for (const providerName of providers) {
      const endpoints = ['balance', 'transactions', 'ordinals', 'runes'];
      
      for (const endpoint of endpoints) {
        const healthKey = `${providerName}:${endpoint}`;
        const healthData = apiHealth[healthKey];
        const rateLimitData = rateLimitStatus[providerName] || {};
        
        const status: ApiHealthStatus = {
          provider: providerName,
          endpoint,
          status: calculateHealthStatus(healthData),
          responseTime: healthData?.averageResponseTime,
          successRate: healthData?.totalRequests > 0 
            ? healthData.successfulRequests / healthData.totalRequests 
            : undefined,
          lastSuccess: healthData?.lastSuccess,
          lastFailure: healthData?.lastFailure,
          totalRequests: healthData?.totalRequests,
          rateLimitStatus: {
            requests: rateLimitData.requests || 0,
            remaining: rateLimitData.remaining || RATE_LIMITS[providerName as keyof typeof RATE_LIMITS]?.maxRequests || 0,
            resetTime: rateLimitData.resetTime,
            blocked: rateLimitData.blocked || false
          }
        };
        
        apiStatuses.push(status);
      }
    }
    
    // Calculate overall system status
    const healthyApis = apiStatuses.filter(api => api.status === 'healthy').length;
    const totalApis = apiStatuses.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (healthyApis === 0) {
      overallStatus = 'down';
    } else if (healthyApis < totalApis * 0.7) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    // Calculate system metrics
    const totalRequests = apiStatuses.reduce((sum, api) => sum + (api.totalRequests || 0), 0);
    const avgResponseTime = apiStatuses
      .filter(api => api.responseTime)
      .reduce((sum, api, _, arr) => sum + (api.responseTime || 0) / arr.length, 0);
    
    const systemStatus: SystemStatus = {
      overall_status: overallStatus,
      timestamp: Date.now(),
      cache: {
        redis_available: cacheStatus.redis,
        memory_cache_size: cacheStatus.memorySize,
        memory_keys_sample: cacheStatus.memoryKeys
      },
      apis: detailed ? apiStatuses : apiStatuses.filter(api => api.status !== 'healthy'),
      rate_limits: rateLimitStatus,
      system_metrics: {
        uptime: process.uptime(),
        total_requests: totalRequests,
        avg_response_time: avgResponseTime || undefined
      }
    };

    const response = {
      success: true,
      data: systemStatus
    };

    devLogger.performance(`Wallet APIs Status`, Date.now() - startTime);
    return NextResponse.json(response);

  } catch (error) {
    devLogger.error(error as Error, 'Wallet APIs Status Error');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST handler for clearing cache or resetting rate limits
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { action, target, pattern } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action parameter is required'
      }, { status: 400 });
    }

    devLogger.log('API', `Wallet APIs maintenance action: ${action}`);

    let result: any = {};

    switch (action) {
      case 'clear_cache':
        if (pattern) {
          await apiCache.clearCache(pattern);
          result.message = `Cache cleared for pattern: ${pattern}`;
        } else if (target) {
          await cacheService.delete(target);
          result.message = `Cache cleared for key: ${target}`;
        } else {
          return NextResponse.json({
            success: false,
            error: 'Pattern or target required for clear_cache action'
          }, { status: 400 });
        }
        break;
        
      case 'warmup_cache':
        if (!target) {
          return NextResponse.json({
            success: false,
            error: 'Target address required for warmup_cache action'
          }, { status: 400 });
        }
        
        await apiCache.warmupCache(target);
        result.message = `Cache warmed up for address: ${target}`;
        break;
        
      case 'get_health':
        const provider = target;
        result.health = await apiCache.getApiHealth(provider as any);
        result.message = provider 
          ? `Health data for provider: ${provider}`
          : 'Health data for all providers';
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    const response = {
      success: true,
      data: result,
      timestamp: Date.now()
    };

    devLogger.performance(`Wallet APIs Maintenance (${action})`, Date.now() - startTime);
    return NextResponse.json(response);

  } catch (error) {
    devLogger.error(error as Error, 'Wallet APIs Maintenance Error');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}