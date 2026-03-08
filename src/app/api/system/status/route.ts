import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'
import { hiroAPI } from '@/lib/hiro-api'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime?: number
  lastChecked: number
  error?: string
  version?: string
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down'
  services: ServiceStatus[]
  cache: {
    size: number
    entries: number
  }
  uptime: number
  timestamp: number
}

const startTime = Date.now()

async function checkServiceHealth(
  serviceName: string, 
  healthCheck: () => Promise<any>
): Promise<ServiceStatus> {
  const startTime = Date.now()
  
  try {
    const result = await healthCheck()
    const responseTime = Date.now() - startTime
    
    return {
      name: serviceName,
      status: responseTime < 5000 ? 'healthy' : 'degraded', // 5 second threshold
      responseTime,
      lastChecked: Date.now(),
      version: result?.version || 'unknown'
    }
  } catch (error) {
    return {
      name: serviceName,
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Check all service health in parallel
    const serviceChecks = await Promise.allSettled([
      checkServiceHealth('HIRO Bitcoin API', () => hiroAPI.getNetworkInfo()),
      checkServiceHealth('HIRO Ordinals API', () => hiroAPI.getOrdinalsCollections(0, 1)),
      checkServiceHealth('HIRO Runes API', () => hiroAPI.getRunesInfo()),
      checkServiceHealth('HIRO BRC-20 API', () => 
        hiroAPI.getBRC20ForAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh') // Test address
      ),
      checkServiceHealth('HIRO Mempool API', () => hiroAPI.getMempoolStats()),
      checkServiceHealth('HIRO Fee API', () => hiroAPI.getFeeEstimates())
    ])

    // Process service check results
    const services: ServiceStatus[] = serviceChecks.map((result, index) => {
      const serviceNames = [
        'HIRO Bitcoin API',
        'HIRO Ordinals API', 
        'HIRO Runes API',
        'HIRO BRC-20 API',
        'HIRO Mempool API',
        'HIRO Fee API'
      ]

      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          name: serviceNames[index],
          status: 'down' as const,
          lastChecked: Date.now(),
          error: result.reason?.message || 'Service check failed'
        }
      }
    })

    // Calculate overall system health
    const healthyServices = services.filter(s => s.status === 'healthy').length
    const totalServices = services.length
    const healthPercentage = (healthyServices / totalServices) * 100

    let overall: 'healthy' | 'degraded' | 'down'
    if (healthPercentage >= 80) {
      overall = 'healthy'
    } else if (healthPercentage >= 50) {
      overall = 'degraded'
    } else {
      overall = 'down'
    }

    // Get cache statistics
    const cacheStats = hiroAPI.getCacheStats()

    // Calculate uptime
    const uptime = Date.now() - startTime

    const systemHealth: SystemHealth = {
      overall,
      services,
      cache: {
        size: cacheStats.total,
        entries: cacheStats.entries.length
      },
      uptime,
      timestamp: Date.now()
    }

    // Additional system metrics
    const additionalMetrics = {
      serviceStats: {
        healthy: services.filter(s => s.status === 'healthy').length,
        degraded: services.filter(s => s.status === 'degraded').length,
        down: services.filter(s => s.status === 'down').length,
        healthPercentage: Math.round(healthPercentage)
      },
      performance: {
        averageResponseTime: services
          .filter(s => s.responseTime)
          .reduce((sum, s) => sum + (s.responseTime || 0), 0) / 
          services.filter(s => s.responseTime).length || 0,
        slowestService: services
          .filter(s => s.responseTime)
          .sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0))[0]?.name || 'none',
        fastestService: services
          .filter(s => s.responseTime)
          .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0]?.name || 'none'
      },
      version: {
        api: '2.2.5.0',
        hiro: '1.0.0',
        lastUpdated: '2024-01-15T00:00:00Z'
      }
    }

    // Set appropriate HTTP status based on overall health
    const httpStatus = overall === 'healthy' ? 200 : overall === 'degraded' ? 206 : 503

    return NextResponse.json(
      {
        ...systemHealth,
        ...additionalMetrics
      },
      { status: httpStatus }
    )

  } catch (error) {
    console.error('Error checking system status:', error)
    
    return NextResponse.json(
      {
        overall: 'down',
        services: [],
        cache: { size: 0, entries: 0 },
        uptime: Date.now() - startTime,
        timestamp: Date.now(),
        error: 'Failed to check system status',
        serviceStats: {
          healthy: 0,
          degraded: 0,
          down: 6,
          healthPercentage: 0
        }
      },
      { status: 503 }
    )
  }
}

// Health check endpoint for simple monitoring
export async function HEAD(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Quick health check - just verify we can respond
    const quickCheck = await hiroAPI.getNetworkInfo()
    
    if (quickCheck && quickCheck.error) {
      return new Response(null, { status: 503 })
    }
    
    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}