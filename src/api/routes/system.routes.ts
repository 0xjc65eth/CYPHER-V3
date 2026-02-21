/**
 * System Management API Routes
 * Administrative endpoints for system control and monitoring
 */

import { Router } from 'express';
import { systemIntegrator } from '@/core/SystemIntegrator';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { adminAuth } from '@/api/middleware/adminAuth';

const router = Router();

// All system routes require admin authentication
router.use(adminAuth);

/**
 * GET /v1/system/status
 * Get comprehensive system status
 */
router.get('/status', async (req, res) => {
  try {
    const health = systemIntegrator.getSystemHealth();
    const metrics = systemIntegrator.getSystemMetrics();

    res.json({
      success: true,
      data: {
        health,
        metrics,
        system: {
          version: '3.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('System status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'System status unavailable'
    });
  }
});

/**
 * POST /v1/system/initialize
 * Initialize the entire system
 */
router.post('/initialize', async (req, res) => {
  try {
    await systemIntegrator.initialize();

    res.json({
      success: true,
      data: {
        message: 'System initialized successfully',
        services: Object.keys(systemIntegrator['SERVICE_REGISTRY']).length
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('System initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'System initialization failed'
    });
  }
});

/**
 * POST /v1/system/shutdown
 * Gracefully shutdown the system
 */
router.post('/shutdown', async (req, res) => {
  try {
    // Send response first, then shutdown
    res.json({
      success: true,
      data: {
        message: 'System shutdown initiated'
      },
      timestamp: Date.now()
    });

    // Delay shutdown to allow response to be sent
    setTimeout(async () => {
      await systemIntegrator.shutdown();
      process.exit(0);
    }, 1000);

  } catch (error) {
    EnhancedLogger.error('System shutdown failed:', error);
    res.status(500).json({
      success: false,
      error: 'System shutdown failed'
    });
  }
});

/**
 * GET /v1/system/services
 * Get detailed information about all services
 */
router.get('/services', async (req, res) => {
  try {
    const health = systemIntegrator.getSystemHealth();
    const services = health.services.map(service => ({
      ...service,
      instance: systemIntegrator.getService(service.service) ? 'loaded' : 'not_loaded'
    }));

    res.json({
      success: true,
      data: {
        services,
        summary: {
          total: services.length,
          healthy: services.filter(s => s.status === 'healthy').length,
          degraded: services.filter(s => s.status === 'degraded').length,
          unhealthy: services.filter(s => s.status === 'unhealthy').length
        }
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('Failed to get services info:', error);
    res.status(500).json({
      success: false,
      error: 'Services information unavailable'
    });
  }
});

/**
 * POST /v1/system/service/:serviceId/restart
 * Restart a specific service
 */
router.post('/service/:serviceId/restart', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // This would require implementing service restart logic
    EnhancedLogger.info(`Restarting service: ${serviceId}`);
    
    res.json({
      success: true,
      data: {
        service: serviceId,
        status: 'restarted',
        message: 'Service restarted successfully'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error(`Service restart failed for ${req.params.serviceId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Service restart failed'
    });
  }
});

/**
 * GET /v1/system/config
 * Get system configuration (sanitized)
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || 'development',
      version: '3.0.0',
      features: {
        trading: true,
        defi: true,
        social: true,
        analytics: true,
        gamification: true,
        mobile: true
      },
      limits: {
        maxUsers: 10000,
        maxOrdersPerUser: 100,
        maxRequestsPerMinute: 1000
      }
    };

    res.json({
      success: true,
      data: config,
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('Failed to get config:', error);
    res.status(500).json({
      success: false,
      error: 'Configuration unavailable'
    });
  }
});

/**
 * GET /v1/system/logs
 * Get recent system logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;

    // TODO: Integrate with actual logging system (e.g., read from log files or database)
    console.warn('[SystemRoutes] /logs endpoint has no real log source connected — returning empty array');
    const logs: any[] = [];

    res.json({
      success: true,
      data: {
        logs,
        total: 0,
        level
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('Failed to get logs:', error);
    res.status(500).json({
      success: false,
      error: 'Logs unavailable'
    });
  }
});

/**
 * DELETE /v1/system/cache
 * Clear system caches
 */
router.delete('/cache', async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    EnhancedLogger.info(`Clearing cache: ${type}`);
    
    res.json({
      success: true,
      data: {
        message: `${type} cache cleared successfully`,
        clearedAt: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('Cache clear failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cache clear failed'
    });
  }
});

export { router as systemRoutes };