// Enhanced server-side error handlers to prevent crashes
// This prevents the Next.js development server from crashing due to unhandled errors

import { intervalManager } from './api/interval-manager';
import { requestDeduplicator } from './api/request-deduplicator';

// Guard against multiple initializations (Next.js re-evaluates modules on HMR)
const INIT_KEY = '__server_error_handlers_initialized__';
const g = globalThis as any;

if (typeof process !== 'undefined' && !g[INIT_KEY]) {
  g[INIT_KEY] = true;
  // Fix memory leak warnings by increasing max listeners
  process.setMaxListeners(20);
  
  // Enhanced error tracking
  let errorCount = 0;
  let lastErrorTime = 0;
  const ERROR_THRESHOLD = 10;
  const ERROR_WINDOW = 60000; // 1 minute
  
  // Track existing listeners to prevent duplicates
  const existingListeners = new Set();

  // Handle uncaught exceptions with enhanced logging
  process.on('uncaughtException', (error: Error) => {
    errorCount++;
    lastErrorTime = Date.now();
    
    console.error('🚨 Uncaught Exception - Server will not crash:', error.name, error.message);
    console.error('Stack trace:', error.stack);
    console.error('Error count in last minute:', errorCount);
    
    // Clear resources to prevent accumulation
    try {
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    // If too many errors, force restart
    if (errorCount > ERROR_THRESHOLD) {
      console.error('💥 Too many errors detected - forcing restart');
      process.exit(1);
    }
    
    // In development, log and continue instead of crashing
    if (process.env.NODE_ENV === 'development') {
      return; // Don't exit in development
    }
    
    // In production, exit gracefully
    process.exit(1);
  });

  // Handle unhandled promise rejections with detailed analysis
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    errorCount++;
    lastErrorTime = Date.now();
    
    console.error('🚨 Unhandled Promise Rejection - Server will not crash:');
    console.error('Reason:', reason);
    console.error('Error count in last minute:', errorCount);
    
    // Analyze the error type
    let errorType = 'unknown';
    if (reason && typeof reason === 'object') {
      if (reason.message?.includes('RATE_LIMIT') || 
          reason.message?.includes('rate limit') ||
          reason.message?.includes('429')) {
        errorType = 'rate_limit';
        return; // Don't crash for rate limits
      }
      
      if (reason.message?.includes('fetch') || reason.code === 'ECONNREFUSED') {
        errorType = 'network';
        return;
      }
      
      if (reason.message?.includes('AbortError')) {
        errorType = 'abort';
        return;
      }
    }
    
    console.error('Error type:', errorType);
    
    // Clear resources to prevent memory leaks
    try {
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    // If too many errors, force restart
    if (errorCount > ERROR_THRESHOLD) {
      console.error('💥 Too many promise rejections detected - forcing restart');
      process.exit(1);
    }
    
    // In development, log and continue
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    
    // In production, exit gracefully
    process.exit(1);
  });

  // Enhanced graceful shutdown with resource cleanup
  const gracefulShutdown = (signal: string) => {
    
    try {
      // Clear all intervals and pending requests
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
      
      // Close any other resources
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    // Give time for cleanup then exit
    setTimeout(() => {
      process.exit(0);
    }, 2000); // Reduced to 2 seconds
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Reset error count periodically
  setInterval(() => {
    if (Date.now() - lastErrorTime > ERROR_WINDOW) {
      errorCount = 0;
    }
  }, ERROR_WINDOW);

}

export default {};