/**
 * 🧠 MEMORY OPTIMIZER - Performance Agent #11
 * WebSocket connection pooling, memory leak prevention, and resource cleanup
 * Implements intelligent garbage collection and memory usage monitoring
 */

import { logger } from '@/lib/logger';

interface WebSocketConnection {
  id: string;
  url: string;
  socket: WebSocket | null;
  subscribers: Set<string>;
  lastActivity: number;
  reconnectAttempts: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  webSocketConnections: number;
  eventListeners: number;
  timers: number;
  lastGarbageCollection: number;
  memoryLeaksDetected: number;
}

interface ResourceHandle {
  id: string;
  type: 'websocket' | 'interval' | 'listener' | 'observer' | 'cache';
  resource: any;
  createdAt: number;
  lastUsed: number;
  cleanup: () => void;
}

export class MemoryOptimizer {
  private static instance: MemoryOptimizer | null = null;
  private webSocketPool: Map<string, WebSocketConnection> = new Map();
  private resourceHandles: Map<string, ResourceHandle> = new Map();
  private metrics: MemoryMetrics;
  private readonly MAX_CONNECTIONS = 5;
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.metrics = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      webSocketConnections: 0,
      eventListeners: 0,
      timers: 0,
      lastGarbageCollection: 0,
      memoryLeaksDetected: 0
    };

    this.startMemoryMonitoring();
    this.startResourceCleanup();
    logger.info('MemoryOptimizer initialized');
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Get or create WebSocket connection from pool
   */
  async getWebSocketConnection(url: string, subscriberId: string): Promise<WebSocket | null> {
    const connectionId = this.getConnectionId(url);
    let connection = this.webSocketPool.get(connectionId);

    if (!connection) {
      connection = await this.createWebSocketConnection(url, connectionId) ?? undefined;
      if (!connection) return null;
    }

    connection.subscribers.add(subscriberId);
    connection.lastActivity = Date.now();

    return connection.socket;
  }

  /**
   * Remove subscriber from WebSocket connection
   */
  removeWebSocketSubscriber(url: string, subscriberId: string): void {
    const connectionId = this.getConnectionId(url);
    const connection = this.webSocketPool.get(connectionId);

    if (connection) {
      connection.subscribers.delete(subscriberId);
      
      // Close connection if no more subscribers
      if (connection.subscribers.size === 0) {
        this.closeWebSocketConnection(connectionId);
      }
    }
  }

  /**
   * Create new WebSocket connection
   */
  private async createWebSocketConnection(url: string, connectionId: string): Promise<WebSocketConnection | undefined> {
    if (this.webSocketPool.size >= this.MAX_CONNECTIONS) {
      await this.cleanupIdleConnections();
    }

    try {
      const socket = new WebSocket(url);
      const connection: WebSocketConnection = {
        id: connectionId,
        url,
        socket,
        subscribers: new Set(),
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        status: 'connecting'
      };

      // Set up event handlers
      socket.onopen = () => {
        connection.status = 'connected';
        connection.reconnectAttempts = 0;
        logger.debug(`WebSocket connected: ${url}`);
      };

      socket.onclose = () => {
        connection.status = 'disconnected';
        logger.debug(`WebSocket disconnected: ${url}`);
        
        // Attempt reconnection if there are still subscribers
        if (connection.subscribers.size > 0) {
          this.attemptReconnection(connection);
        }
      };

      socket.onerror = (error) => {
        connection.status = 'error';
        logger.error(`WebSocket error: ${url}`, error);
      };

      this.webSocketPool.set(connectionId, connection);
      this.metrics.webSocketConnections++;

      return connection;

    } catch (error) {
      logger.error(`Failed to create WebSocket connection: ${url}`, error);
      return undefined;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnection(connection: WebSocketConnection): Promise<void> {
    if (connection.reconnectAttempts >= 3) {
      logger.warn(`Max reconnection attempts reached for ${connection.url}`);
      return;
    }

    connection.reconnectAttempts++;
    const delay = Math.pow(2, connection.reconnectAttempts) * 1000; // Exponential backoff

    setTimeout(async () => {
      try {
        const newSocket = new WebSocket(connection.url);
        connection.socket = newSocket;
        connection.status = 'connecting';
        
        // Re-setup event handlers
        this.setupWebSocketHandlers(connection);
        
      } catch (error) {
        logger.error(`Reconnection failed for ${connection.url}:`, error);
      }
    }, delay);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(connection: WebSocketConnection): void {
    if (!connection.socket) return;

    connection.socket.onopen = () => {
      connection.status = 'connected';
      connection.reconnectAttempts = 0;
      logger.debug(`WebSocket reconnected: ${connection.url}`);
    };

    connection.socket.onclose = () => {
      connection.status = 'disconnected';
      if (connection.subscribers.size > 0) {
        this.attemptReconnection(connection);
      }
    };

    connection.socket.onerror = (error) => {
      connection.status = 'error';
      logger.error(`WebSocket error: ${connection.url}`, error);
    };
  }

  /**
   * Close WebSocket connection
   */
  private closeWebSocketConnection(connectionId: string): void {
    const connection = this.webSocketPool.get(connectionId);
    if (connection && connection.socket) {
      connection.socket.close();
      this.webSocketPool.delete(connectionId);
      this.metrics.webSocketConnections--;
      logger.debug(`WebSocket connection closed: ${connection.url}`);
    }
  }

  /**
   * Clean up idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToClose: string[] = [];

    for (const [id, connection] of this.webSocketPool) {
      if (now - connection.lastActivity > this.CONNECTION_TIMEOUT || connection.subscribers.size === 0) {
        connectionsToClose.push(id);
      }
    }

    connectionsToClose.forEach(id => this.closeWebSocketConnection(id));
    
    if (connectionsToClose.length > 0) {
      logger.info(`Cleaned up ${connectionsToClose.length} idle WebSocket connections`);
    }
  }

  /**
   * Get connection ID from URL
   */
  private getConnectionId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 16);
  }

  /**
   * Register resource for cleanup tracking
   */
  registerResource(
    id: string,
    type: ResourceHandle['type'],
    resource: any,
    cleanup: () => void
  ): void {
    this.resourceHandles.set(id, {
      id,
      type,
      resource,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      cleanup
    });

    // Update metrics
    switch (type) {
      case 'interval':
        this.metrics.timers++;
        break;
      case 'listener':
        this.metrics.eventListeners++;
        break;
    }
  }

  /**
   * Remove and cleanup resource
   */
  removeResource(id: string): boolean {
    const handle = this.resourceHandles.get(id);
    if (!handle) return false;

    try {
      handle.cleanup();
      this.resourceHandles.delete(id);

      // Update metrics
      switch (handle.type) {
        case 'interval':
          this.metrics.timers--;
          break;
        case 'listener':
          this.metrics.eventListeners--;
          break;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to cleanup resource ${id}:`, error);
      return false;
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.updateMemoryMetrics();
      this.checkMemoryUsage();
    }, 10000); // Every 10 seconds
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.heapUsed = memory.usedJSHeapSize;
      this.metrics.heapTotal = memory.totalJSHeapSize;
    }

    this.metrics.webSocketConnections = this.webSocketPool.size;
    this.metrics.eventListeners = Array.from(this.resourceHandles.values())
      .filter(h => h.type === 'listener').length;
    this.metrics.timers = Array.from(this.resourceHandles.values())
      .filter(h => h.type === 'interval').length;
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    if (this.metrics.heapUsed > this.MEMORY_THRESHOLD) {
      logger.warn(`High memory usage detected: ${(this.metrics.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      this.forceGarbageCollection();
      this.aggressiveCleanup();
    }
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        this.metrics.lastGarbageCollection = Date.now();
        logger.debug('Forced garbage collection');
      } catch (error) {
        logger.warn('Failed to force garbage collection:', error);
      }
    }
  }

  /**
   * Aggressive cleanup when memory is high
   */
  private aggressiveCleanup(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    let cleanedUp = 0;

    // Clean up stale resources
    for (const [id, handle] of this.resourceHandles) {
      if (now - handle.lastUsed > STALE_THRESHOLD) {
        if (this.removeResource(id)) {
          cleanedUp++;
        }
      }
    }

    // Clean up idle WebSocket connections
    this.cleanupIdleConnections();

    if (cleanedUp > 0) {
      logger.info(`Aggressive cleanup removed ${cleanedUp} stale resources`);
    }
  }

  /**
   * Start resource cleanup loop
   */
  private startResourceCleanup(): void {
    setInterval(() => {
      this.performRoutineCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Perform routine cleanup
   */
  private performRoutineCleanup(): void {
    this.cleanupIdleConnections();
    this.cleanupStaleResources();
    this.detectMemoryLeaks();
  }

  /**
   * Clean up stale resources
   */
  private cleanupStaleResources(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
    let cleanedUp = 0;

    for (const [id, handle] of this.resourceHandles) {
      if (now - handle.lastUsed > STALE_THRESHOLD) {
        if (this.removeResource(id)) {
          cleanedUp++;
        }
      }
    }

    if (cleanedUp > 0) {
      logger.debug(`Routine cleanup removed ${cleanedUp} stale resources`);
    }
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    const resourceCounts = new Map<string, number>();
    
    for (const handle of this.resourceHandles.values()) {
      const count = resourceCounts.get(handle.type) || 0;
      resourceCounts.set(handle.type, count + 1);
    }

    // Check for unusual resource counts
    for (const [type, count] of resourceCounts) {
      const threshold = type === 'listener' ? 50 : type === 'interval' ? 20 : 10;
      
      if (count > threshold) {
        logger.warn(`Potential memory leak detected: ${count} ${type} resources`);
        this.metrics.memoryLeaksDetected++;
      }
    }
  }

  /**
   * Get memory metrics
   */
  getMetrics(): MemoryMetrics & {
    resourceBreakdown: Map<string, number>;
    connectionStatus: Array<{
      url: string;
      status: string;
      subscribers: number;
      lastActivity: number;
    }>;
  } {
    const resourceBreakdown = new Map<string, number>();
    for (const handle of this.resourceHandles.values()) {
      const count = resourceBreakdown.get(handle.type) || 0;
      resourceBreakdown.set(handle.type, count + 1);
    }

    const connectionStatus = Array.from(this.webSocketPool.values()).map(conn => ({
      url: conn.url,
      status: conn.status,
      subscribers: conn.subscribers.size,
      lastActivity: conn.lastActivity
    }));

    return {
      ...this.metrics,
      resourceBreakdown,
      connectionStatus
    };
  }

  /**
   * Create memory-safe event listener
   */
  createSafeEventListener<K extends keyof WindowEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    target.addEventListener(type, listener as EventListener, options);
    
    const cleanup = () => {
      target.removeEventListener(type, listener as EventListener, options);
    };

    this.registerResource(id, 'listener', { target, type, listener }, cleanup);

    return () => this.removeResource(id);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Close all WebSocket connections
    for (const [id] of this.webSocketPool) {
      this.closeWebSocketConnection(id);
    }

    // Cleanup all resources
    for (const [id] of this.resourceHandles) {
      this.removeResource(id);
    }

    logger.info('MemoryOptimizer cleaned up');
  }
}

// Export singleton instance
export const memoryOptimizer = MemoryOptimizer.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryOptimizer.cleanup();
  });
}

export default memoryOptimizer;