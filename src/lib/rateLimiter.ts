// Simple in-memory rate limiter for API calls
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { maxRequests: number; windowMs: number }> = new Map();

  constructor() {
    // Set CONSERVATIVE rate limits to prevent server crashes
    // These are lower than API limits to provide safety buffer
    this.limits.set('coinmarketcap', { maxRequests: 15, windowMs: 60000 }); // 15 requests per minute (conservative)
    this.limits.set('coingecko', { maxRequests: 8, windowMs: 60000 }); // 8 requests per minute (conservative)
    this.limits.set('hiro', { maxRequests: 30, windowMs: 60000 }); // 30 requests per minute (conservative)
    this.limits.set('blockchain-info', { maxRequests: 20, windowMs: 60000 }); // 20 requests per minute
    this.limits.set('lightning-api', { maxRequests: 10, windowMs: 60000 }); // 10 requests per minute
    this.limits.set('activity-feed', { maxRequests: 25, windowMs: 60000 }); // 25 requests per minute
  }

  canMakeRequest(api: string): boolean {
    const limit = this.limits.get(api);
    if (!limit) return true; // No limit configured

    const now = Date.now();
    const requests = this.requests.get(api) || [];
    
    // Clean old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < limit.windowMs);
    
    if (validRequests.length >= limit.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(api, validRequests);
    
    return true;
  }

  getRemainingRequests(api: string): number {
    const limit = this.limits.get(api);
    if (!limit) return Infinity;

    const now = Date.now();
    const requests = this.requests.get(api) || [];
    const validRequests = requests.filter(timestamp => now - timestamp < limit.windowMs);
    
    return Math.max(0, limit.maxRequests - validRequests.length);
  }

  getResetTime(api: string): number {
    const limit = this.limits.get(api);
    if (!limit) return 0;

    const requests = this.requests.get(api) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    return oldestRequest + limit.windowMs;
  }
}

export const rateLimiter = new RateLimiter();