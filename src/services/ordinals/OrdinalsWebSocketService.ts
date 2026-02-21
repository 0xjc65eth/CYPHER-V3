/**
 * Ordinals WebSocket Service - CYPHER V3
 * Real-time price and volume updates via WebSocket
 *
 * Features:
 * - Live floor price updates
 * - Real-time volume tracking
 * - Market activity notifications
 * - Collection-specific subscriptions
 * - Automatic reconnection
 */

interface WebSocketMessage {
  type: 'price_update' | 'volume_update' | 'new_sale' | 'listing_update' | 'heartbeat';
  data: any;
  timestamp: number;
}

interface Subscription {
  collectionSymbol?: string;
  eventTypes: string[];
  callback: (message: WebSocketMessage) => void;
}

export class OrdinalsWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(url?: string): void {
    // Skip WebSocket connection in production (no WS server on Vercel)
    if (!url && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return;
    }

    const wsUrl = url || 'ws://localhost:8080';
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Resubscribe to all collections
        this.subscriptions.forEach((sub, id) => {
          if (sub.collectionSymbol) {
            this.sendSubscribe(sub.collectionSymbol, sub.eventTypes);
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[OrdinalsWebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[OrdinalsWebSocket] Error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[OrdinalsWebSocket] Connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  /**
   * Subscribe to collection updates
   */
  subscribe(
    collectionSymbol: string,
    eventTypes: string[] = ['price_update', 'volume_update', 'new_sale'],
    callback: (message: WebSocketMessage) => void
  ): string {
    const subscriptionId = `${collectionSymbol}-${Date.now()}`;

    this.subscriptions.set(subscriptionId, {
      collectionSymbol,
      eventTypes,
      callback,
    });

    // Send subscribe message to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(collectionSymbol, eventTypes);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from collection updates
   */
  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub?.collectionSymbol) {
      this.sendUnsubscribe(sub.collectionSymbol);
    }
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Send subscribe message to server
   */
  private sendSubscribe(collectionSymbol: string, eventTypes: string[]): void {
    this.send({
      action: 'subscribe',
      collection: collectionSymbol,
      events: eventTypes,
    });
  }

  /**
   * Send unsubscribe message to server
   */
  private sendUnsubscribe(collectionSymbol: string): void {
    this.send({
      action: 'unsubscribe',
      collection: collectionSymbol,
    });
  }

  /**
   * Send message to server
   */
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Notify all matching subscriptions
    this.subscriptions.forEach((sub) => {
      if (sub.eventTypes.includes(message.type)) {
        try {
          sub.callback(message);
        } catch (error) {
          console.error('[OrdinalsWebSocket] Error in subscription callback:', error);
        }
      }
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ action: 'ping' });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[OrdinalsWebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);


    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const ordinalsWebSocket = new OrdinalsWebSocketService();
