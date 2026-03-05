// Server-side error handlers — safe for Vercel serverless
// IMPORTANT: Never call process.exit() in serverless environments.
// Vercel manages the process lifecycle; exiting kills the function mid-response.

import { intervalManager } from './api/interval-manager';
import { requestDeduplicator } from './api/request-deduplicator';

const INIT_KEY = '__server_error_handlers_initialized__';
const g = globalThis as any;

if (typeof process !== 'undefined' && !g[INIT_KEY]) {
  g[INIT_KEY] = true;
  process.setMaxListeners(20);

  let errorCount = 0;
  let lastErrorTime = 0;
  const ERROR_WINDOW = 60000;

  process.on('uncaughtException', (error: Error) => {
    errorCount++;
    lastErrorTime = Date.now();
    console.error('[CYPHER] Uncaught Exception:', error.name, error.message);
    console.error('Stack:', error.stack);

    try {
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
    } catch (e) {
      console.error('[CYPHER] Cleanup error:', e);
    }
    // Do NOT call process.exit — let the runtime handle recovery
  });

  process.on('unhandledRejection', (reason: any) => {
    errorCount++;
    lastErrorTime = Date.now();
    console.error('[CYPHER] Unhandled Rejection:', reason);

    // Ignore common transient errors
    if (reason && typeof reason === 'object') {
      const msg = reason.message || '';
      if (/rate.?limit|429|AbortError|ECONNREFUSED|fetch failed/i.test(msg)) {
        return;
      }
    }

    try {
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
    } catch (e) {
      console.error('[CYPHER] Cleanup error:', e);
    }
    // Do NOT call process.exit
  });

  const gracefulShutdown = (signal: string) => {
    console.warn(`[CYPHER] ${signal} received, cleaning up...`);
    try {
      intervalManager.clearAll();
      requestDeduplicator.clearAll();
    } catch (e) {
      console.error('[CYPHER] Cleanup error:', e);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default {};
