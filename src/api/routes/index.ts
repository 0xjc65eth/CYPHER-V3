/**
 * API Routes Index for CYPHER ORDi Future V3
 * Central routing for all 24 microservices
 */

import { Router } from 'express';
import { systemIntegrator } from '@/core/SystemIntegrator';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Import all route modules
import { mlRoutes } from './ml.routes';
import { orderbookRoutes } from './orderbook.routes';
import { yieldRoutes } from './yield.routes';
import { bridgeRoutes } from './bridge.routes';
import { socialRoutes } from './social.routes';
import { derivativesRoutes } from './derivatives.routes';
import { stakingRoutes } from './staking.routes';
import { newsRoutes } from './news.routes';
import { protectionRoutes } from './protection.routes';
import { paymentRoutes } from './payment.routes';
import { gamificationRoutes } from './gamification.routes';
import { systemRoutes } from './system.routes';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = systemIntegrator.getSystemHealth();
    res.status(health.overall === 'healthy' ? 200 : 503).json({
      status: health.overall,
      timestamp: Date.now(),
      services: health.services,
      uptime: health.uptime,
      version: '3.0.0'
    });
  } catch (error) {
    EnhancedLogger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check unavailable'
    });
  }
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = systemIntegrator.getSystemMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    EnhancedLogger.error('Metrics collection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics unavailable'
    });
  }
});

// API v1 routes
router.use('/v1/ml', mlRoutes);
router.use('/v1/orderbook', orderbookRoutes);
router.use('/v1/yield', yieldRoutes);
router.use('/v1/bridge', bridgeRoutes);
router.use('/v1/social', socialRoutes);
router.use('/v1/derivatives', derivativesRoutes);
router.use('/v1/staking', stakingRoutes);
router.use('/v1/news', newsRoutes);
router.use('/v1/protection', protectionRoutes);
router.use('/v1/payment', paymentRoutes);
router.use('/v1/gamification', gamificationRoutes);
router.use('/v1/system', systemRoutes);

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'CYPHER ORDi Future V3 API',
    version: '3.0.0',
    description: 'Advanced cryptocurrency trading platform with 24 microservices',
    endpoints: {
      '/health': 'System health status',
      '/metrics': 'System performance metrics',
      '/v1/ml': 'Machine Learning & Predictions',
      '/v1/orderbook': 'Order Book & Trading Engine',
      '/v1/yield': 'Yield Farming & DeFi',
      '/v1/bridge': 'Cross-Chain Bridge',
      '/v1/social': 'Social Trading Platform',
      '/v1/derivatives': 'Derivatives Trading',
      '/v1/staking': 'Staking & Rewards',
      '/v1/news': 'News & Sentiment Analysis',
      '/v1/protection': 'Liquidation Protection',
      '/v1/payment': 'Payment Gateway',
      '/v1/gamification': 'Gamification & NFTs',
      '/v1/system': 'System Management'
    },
    authentication: 'Bearer JWT Token',
    rateLimit: '1000 requests per minute per user',
    websocket: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4444/ws'
  });
});

// Error handling
router.use('*', (req: any, res: any) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: '/docs'
  });
});

export { router as apiRoutes };