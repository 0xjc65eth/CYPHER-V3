// Request deduplicator to prevent duplicate API calls that can overload the server
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private static instance: RequestDeduplicator | null = null;

  private constructor() {
    // Singleton - only created once
  }

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  clearAll(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = RequestDeduplicator.getInstance();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    requestDeduplicator.clearAll();
  });
}

export default requestDeduplicator;