/**
 * 🏥 HIRO API HEALTH CHECK & MONITORING
 * Comprehensive health monitoring for all API integrations
 */

import { NextResponse } from 'next/server'
import { hiroAPI } from '@/lib/hiro-api'
import { apiService } from '@/lib/api-service'

export async function GET() {
  try {
    
    const startTime = Date.now()
    
    // Test Hiro API health
    const hiroHealthPromise = hiroAPI.healthCheck()
    
    // Test unified API service health
    const apiServiceHealthPromise = apiService.healthCheck()
    
    // Test specific endpoints with timeout
    const endpointTests = Promise.allSettled([
      // Runes endpoint test
      apiService.getRunesData({ limit: 1 }).then(result => ({
        endpoint: 'runes',
        success: result.success,
        source: result.source,
        responseTime: result.responseTime,
        error: result.error
      })),
      
      // Ordinals endpoint test
      apiService.getOrdinalsData({ limit: 1 }).then(result => ({
        endpoint: 'ordinals',
        success: result.success,
        source: result.source,
        responseTime: result.responseTime,
        error: result.error
      })),
      
      // BRC-20 endpoint test
      apiService.getBRC20Tokens({ limit: 1 }).then(result => ({
        endpoint: 'brc20',
        success: result.success,
        source: result.source,
        responseTime: result.responseTime,
        error: result.error
      })),
      
      // Collections endpoint test
      apiService.getCollectionsData({ limit: 1 }).then(result => ({
        endpoint: 'collections',
        success: result.success,
        source: result.source,
        responseTime: result.responseTime,
        error: result.error
      }))
    ])
    
    // Wait for all tests to complete
    const [hiroHealth, apiServiceHealth, endpointResults] = await Promise.all([
      hiroHealthPromise,
      apiServiceHealthPromise,
      endpointTests
    ])
    
    const totalResponseTime = Date.now() - startTime
    
    // Process endpoint test results
    const endpoints = endpointResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        const endpointNames = ['runes', 'ordinals', 'brc20', 'collections']
        return {
          endpoint: endpointNames[index],
          success: false,
          source: 'error',
          responseTime: 0,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })
    
    // Calculate overall health score
    const successfulEndpoints = endpoints.filter(e => e.success).length
    const healthScore = (successfulEndpoints / endpoints.length) * 100
    
    // Determine overall status
    let overallStatus = 'healthy'
    if (healthScore < 50) {
      overallStatus = 'critical'
    } else if (healthScore < 75) {
      overallStatus = 'degraded'
    } else if (healthScore < 100) {
      overallStatus = 'partial'
    }
    
    // Get performance metrics
    const hiroMetrics = hiroAPI.getMetrics()
    const apiServiceMetrics = apiService.getPerformanceMetrics()
    const cacheStats = apiService.getCacheStatus()
    
    // Build comprehensive health report
    const healthReport = {
      status: overallStatus,
      score: Math.round(healthScore),
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      
      // Component health
      components: {
        hiroAPI: {
          status: hiroHealth.status,
          details: hiroHealth.details,
          metrics: hiroMetrics
        },
        apiService: {
          status: apiServiceHealth.healthy ? 'healthy' : 'unhealthy',
          details: apiServiceHealth.details,
          sources: apiServiceHealth.sources
        }
      },
      
      // Endpoint tests
      endpoints: endpoints.reduce((acc, endpoint) => {
        acc[endpoint.endpoint] = {
          success: endpoint.success,
          source: endpoint.source,
          responseTime: endpoint.responseTime,
          error: endpoint.error
        }
        return acc
      }, {} as Record<string, any>),
      
      // Performance metrics
      performance: {
        hiro: {
          totalRequests: hiroMetrics.totalRequests,
          successRate: hiroMetrics.successRate,
          averageResponseTime: hiroMetrics.averageResponseTime,
          cacheHitRate: hiroMetrics.cacheHitRate,
          rateLimitHits: hiroMetrics.rateLimitHits
        },
        apiService: Object.fromEntries(apiServiceMetrics)
      },
      
      // Cache information
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys.slice(0, 10), // Show first 10 keys only
        totalKeys: cacheStats.keys.length
      },
      
      // Recommendations
      recommendations: generateRecommendations(healthScore, endpoints, hiroMetrics),
      
      // System information
      system: {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    }
    
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'critical' ? 503 : 
                      overallStatus === 'degraded' ? 503 : 200
    
    return NextResponse.json(healthReport, { status: httpStatus })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'critical',
      score: 0,
      timestamp: new Date().toISOString(),
      error: error.message,
      endpoints: {},
      performance: {},
      cache: { size: 0, keys: [], totalKeys: 0 },
      recommendations: ['System appears to be down', 'Check API configurations', 'Verify network connectivity'],
      system: {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    }, { status: 503 })
  }
}

function generateRecommendations(
  healthScore: number, 
  endpoints: any[], 
  metrics: any
): string[] {
  const recommendations: string[] = []
  
  if (healthScore < 50) {
    recommendations.push('Critical: Multiple API endpoints are failing')
    recommendations.push('Check network connectivity and API keys')
    recommendations.push('Consider enabling maintenance mode')
  } else if (healthScore < 75) {
    recommendations.push('Warning: Some API endpoints are experiencing issues')
    recommendations.push('Monitor fallback data usage')
  }
  
  if (metrics.cacheHitRate < 30) {
    recommendations.push('Low cache hit rate detected - consider increasing cache TTL')
  }
  
  if (metrics.averageResponseTime > 5000) {
    recommendations.push('High response times detected - check API performance')
  }
  
  if (metrics.rateLimitHits > 10) {
    recommendations.push('Rate limiting detected - consider reducing request frequency')
  }
  
  const failedEndpoints = endpoints.filter(e => !e.success)
  if (failedEndpoints.length > 0) {
    recommendations.push(`Failed endpoints: ${failedEndpoints.map(e => e.endpoint).join(', ')}`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally')
    recommendations.push('Cache performance is optimal')
  }
  
  return recommendations
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'clear_cache':
        hiroAPI.clearCache()
        apiService.clearCache()
        return NextResponse.json({ 
          success: true, 
          message: 'All caches cleared',
          timestamp: new Date().toISOString()
        })
        
      case 'reset_metrics':
        // Note: This would require adding a reset method to the API classes
        return NextResponse.json({ 
          success: true, 
          message: 'Metrics reset functionality not implemented',
          timestamp: new Date().toISOString()
        })
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action' 
        }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}