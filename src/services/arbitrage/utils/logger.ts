// Simple logger utility for arbitrage system
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
  },
  error: (messageOrError: string | Error, ...args: any[]) => {
    const message = messageOrError instanceof Error ? messageOrError.message : messageOrError;
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  }
};