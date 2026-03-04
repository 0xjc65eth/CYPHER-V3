import { NextRequest, NextResponse } from 'next/server';
import { intervalManager } from '@/lib/api/interval-manager';
import { requestDeduplicator } from '@/lib/api/request-deduplicator';
import { dbService } from '@/lib/database';
import { isRedisConnected } from '@/lib/cache/redis.config';
import { jobScheduler } from '@/lib/jobs';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  // Apply rate limiting (200 req/min for health checks)
  const rateLimitResponse = await rateLimit(request, 200, 60);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const memUsage = process.memoryUsage();

    // Calculate memory usage in MB
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
    const external = Math.round(memUsage.external / 1024 / 1024);
    const rss = Math.round(memUsage.rss / 1024 / 1024);

    // Get resource usage stats
    const activeIntervals = intervalManager.getActiveCount();
    const pendingRequests = requestDeduplicator.getPendingCount();
    const uptime = process.uptime();

    // Infrastructure status
    const redisConnected = isRedisConnected();
    const dbConnected = (dbService as any).isConnected;
    const jobStatus = jobScheduler.getStatus();

    // Health checks
    const isHealthy = heapUsed < 500 && activeIntervals < 20 && pendingRequests < 10;

    const health = {
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime) + 's',
      version: 'v3.0.0-beta.014',
      infrastructure: {
        database: dbConnected ? 'connected' : 'in-memory-fallback',
        redis: redisConnected ? 'connected' : 'in-memory-fallback',
        jobs: Object.keys(jobStatus).length > 0 ? 'running' : 'not-started',
        jobCount: Object.keys(jobStatus).length,
      },
      memory: {
        heapUsed: heapUsed + 'MB',
        heapTotal: heapTotal + 'MB',
        external: external + 'MB',
        rss: rss + 'MB',
        usage: Math.round((heapUsed / heapTotal) * 100) + '%'
      },
      resources: {
        activeIntervals,
        pendingRequests,
        intervalKeys: intervalManager.getActiveKeys(),
        requestKeys: requestDeduplicator.getPendingKeys()
      },
      nodeVersion: process.version,
      pid: process.pid
    };

    // Health check - warnings logged only if unhealthy

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}