// Safe WebSocket wrapper that prevents conflicts with Next.js dev overlay
export class SafeWebSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    
    // Only create WebSocket in browser environment
    if (typeof window !== 'undefined' && window.WebSocket) {
      this.connect();
    }
  }

  private connect() {
    try {
      // Use the native WebSocket constructor directly
      const WSConstructor = window.WebSocket || WebSocket;
      this.socket = new WSConstructor(this.url, this.protocols);
      
      this.socket.addEventListener('open', this.handleOpen.bind(this));
      this.socket.addEventListener('close', this.handleClose.bind(this));
      this.socket.addEventListener('error', this.handleError.bind(this));
      this.socket.addEventListener('message', this.handleMessage.bind(this));
      
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(event: Event) {
    this.emit('open', event);
  }

  private handleClose(event: CloseEvent) {
    this.emit('close', event);
    
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.emit('error', event);
  }

  private handleMessage(event: MessageEvent) {
    this.emit('message', event);
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.socket?.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }, delay);
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  addEventListener(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    } else {
      // WebSocket is not connected, cannot send data
    }
  }

  close(code?: number, reason?: string) {
    if (this.socket) {
      this.socket.close(code, reason);
      this.socket = null;
    }
  }

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  get CONNECTING() { return WebSocket.CONNECTING; }
  get OPEN() { return WebSocket.OPEN; }
  get CLOSING() { return WebSocket.CLOSING; }
  get CLOSED() { return WebSocket.CLOSED; }
}

// Create a factory function for easier use
export function createWebSocket(url: string, protocols?: string | string[]): SafeWebSocket {
  return new SafeWebSocket(url, protocols);
}