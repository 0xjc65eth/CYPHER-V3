// Global interval manager to prevent overlapping intervals and memory leaks
class IntervalManager {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private static instance: IntervalManager | null = null;

  private constructor() {
    // Singleton - only log once
  }

  static getInstance(): IntervalManager {
    if (!IntervalManager.instance) {
      IntervalManager.instance = new IntervalManager();
    }
    return IntervalManager.instance;
  }

  register(key: string, callback: () => void, interval: number): void {
    // Clear existing interval if it exists
    this.clear(key);

    const id = setInterval(callback, interval);
    this.intervals.set(key, id);
  }

  clear(key: string): void {
    const id = this.intervals.get(key);
    if (id) {
      clearInterval(id);
      this.intervals.delete(key);
    }
  }

  clearAll(): void {
    this.intervals.forEach((id, key) => {
      clearInterval(id);
    });
    this.intervals.clear();
  }

  getActiveCount(): number {
    return this.intervals.size;
  }

  getActiveKeys(): string[] {
    return Array.from(this.intervals.keys());
  }
}

export const intervalManager = IntervalManager.getInstance();

// Cleanup on process exit to prevent memory leaks
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    intervalManager.clearAll();
  });
}

export default intervalManager;