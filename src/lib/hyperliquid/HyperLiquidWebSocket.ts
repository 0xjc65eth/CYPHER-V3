import { EnhancedLogger } from '@/lib/enhanced-logger'
import { performanceMonitor } from '@/lib/performance/PerformanceMonitor'
import { createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker'

export interface HyperLiquidMessage {
  channel: string
  data: any
  timestamp: number
}

export interface HyperLiquidSubscription {
  type: 'l2Book' | 'trades' | 'user' | 'candle' | 'orderUpdates' | 'fills' | 'allMids'
  coin?: string
  user?: string
  interval?: string
}

export interface HyperLiquidOrderBook {
  coin: string
  levels: Array<[number, string]> // [price, size]
  time: number
}

export interface HyperLiquidTrade {
  coin: string
  side: 'A' | 'B' // A = Ask (sell), B = Bid (buy)
  px: string // price
  sz: string // size
  time: number
}

export interface HyperLiquidUserUpdate {
  type: 'order' | 'fill' | 'funding' | 'liquidation'
  data: any
  timestamp: number
}

export interface HyperLiquidCandle {
  coin: string
  interval: string
  t: number // timestamp
  T: number // close timestamp
  s: string // symbol
  o: string // open
  c: string // close
  h: string // high
  l: string // low
  v: string // volume
  n: number // number of trades
}

type HyperLiquidEventHandler = (data: any) => void

export class HyperLiquidWebSocket {
  private static instance: HyperLiquidWebSocket
  private ws: WebSocket | null = null
  private subscriptions = new Set<string>()
  private eventHandlers = new Map<string, Set<HyperLiquidEventHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  private isAuthenticated = false
  private circuitBreaker = createAPICircuitBreaker('HyperLiquid-WebSocket', {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    timeout: 30000
  })

  // HyperLiquid WebSocket endpoints
  private readonly WS_URL = 'wss://api.hyperliquid.xyz/ws'
  private readonly TESTNET_WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws'

  private constructor(private useTestnet = false) {
    this.setupEventHandlers()
  }

  static getInstance(useTestnet = false): HyperLiquidWebSocket {
    if (!HyperLiquidWebSocket.instance) {
      HyperLiquidWebSocket.instance = new HyperLiquidWebSocket(useTestnet)
    }
    return HyperLiquidWebSocket.instance
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    return this.circuitBreaker.execute(async () => {
      await this.performConnect()
    })
  }

  private async performConnect(): Promise<void> {
    this.isConnecting = true
    const url = this.useTestnet ? this.TESTNET_WS_URL : this.WS_URL

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close()
          }
          reject(new Error('HyperLiquid WebSocket connection timeout'))
        }, 10000)

        this.ws.onopen = (event) => {
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          
          EnhancedLogger.info('HyperLiquid WebSocket connected', {
            component: 'HyperLiquidWebSocket',
            url,
            useTestnet: this.useTestnet
          })

          performanceMonitor.recordMetric({
            name: 'HyperLiquid WS Connection',
            value: Date.now(),
            unit: 'ms',
            category: 'network',
            tags: { status: 'connected' }
          })

          this.emit('open', event)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            EnhancedLogger.error('Failed to parse HyperLiquid message', {
              component: 'HyperLiquidWebSocket',
              error: error instanceof Error ? error.message : 'Unknown error',
              data: event.data
            })
          }
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          this.isAuthenticated = false
          this.stopHeartbeat()

          EnhancedLogger.warn('HyperLiquid WebSocket disconnected', {
            component: 'HyperLiquidWebSocket',
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })

          this.emit('close', event)

          // Auto-reconnect if not a clean close
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }

          if (!event.wasClean) {
            reject(new Error(`Connection closed: ${event.code} ${event.reason}`))
          }
        }

        this.ws.onerror = (event) => {
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          
          EnhancedLogger.error('HyperLiquid WebSocket error', {
            component: 'HyperLiquidWebSocket',
            event
          })

          this.emit('error', event)
          reject(new Error('WebSocket connection error'))
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    EnhancedLogger.info('Scheduling HyperLiquid WebSocket reconnect', {
      component: 'HyperLiquidWebSocket',
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.maxReconnectAttempts
    })

    setTimeout(() => {
      this.connect().catch(error => {
        EnhancedLogger.error('HyperLiquid WebSocket reconnect failed', {
          component: 'HyperLiquidWebSocket',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }))
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleMessage(message: any): void {
    const startTime = performance.now()

    try {
      // Handle different message types
      if (message.channel) {
        this.emit(message.channel, message.data)
      } else if (message.method === 'pong') {
        // Heartbeat response
        return
      } else if (message.channel === 'subscriptionResponse') {
        this.handleSubscriptionResponse(message)
      } else {
        // Generic message handling
        this.emit('message', message)
      }

      performanceMonitor.recordMetric({
        name: 'HyperLiquid Message Processing',
        value: performance.now() - startTime,
        unit: 'ms',
        category: 'network',
        tags: { channel: message.channel || 'unknown' }
      })

    } catch (error) {
      EnhancedLogger.error('Error handling HyperLiquid message', {
        component: 'HyperLiquidWebSocket',
        error: error instanceof Error ? error.message : 'Unknown error',
        message
      })
    }
  }

  private handleSubscriptionResponse(message: any): void {
    if (message.data?.success) {
      EnhancedLogger.info('HyperLiquid subscription successful', {
        component: 'HyperLiquidWebSocket',
        subscription: message.data.subscription
      })
    } else {
      EnhancedLogger.error('HyperLiquid subscription failed', {
        component: 'HyperLiquidWebSocket',
        error: message.data?.error,
        subscription: message.data?.subscription
      })
    }
  }

  // Subscription methods
  async subscribeToOrderBook(coin: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'l2Book',
      coin
    }

    await this.subscribe(subscription)
  }

  async subscribeToTrades(coin: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'trades',
      coin
    }

    await this.subscribe(subscription)
  }

  async subscribeToCandles(coin: string, interval: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'candle',
      coin,
      interval
    }

    await this.subscribe(subscription)
  }

  async subscribeToUser(user: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'user',
      user
    }

    await this.subscribe(subscription)
  }

  async subscribeToOrderUpdates(user: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'orderUpdates',
      user
    }

    await this.subscribe(subscription)
  }

  async subscribeToFills(user: string): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'fills',
      user
    }

    await this.subscribe(subscription)
  }

  async subscribeToAllMids(): Promise<void> {
    const subscription: HyperLiquidSubscription = {
      type: 'allMids'
    }

    await this.subscribe(subscription)
  }

  private async subscribe(subscription: HyperLiquidSubscription): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    const subscriptionKey = this.getSubscriptionKey(subscription)
    
    if (this.subscriptions.has(subscriptionKey)) {
      return // Already subscribed
    }

    const message = {
      method: 'subscribe',
      subscription
    }

    this.ws!.send(JSON.stringify(message))
    this.subscriptions.add(subscriptionKey)

    EnhancedLogger.info('HyperLiquid subscription requested', {
      component: 'HyperLiquidWebSocket',
      subscription,
      subscriptionKey
    })
  }

  async unsubscribe(subscription: HyperLiquidSubscription): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const subscriptionKey = this.getSubscriptionKey(subscription)
    
    if (!this.subscriptions.has(subscriptionKey)) {
      return // Not subscribed
    }

    const message = {
      method: 'unsubscribe',
      subscription
    }

    this.ws.send(JSON.stringify(message))
    this.subscriptions.delete(subscriptionKey)

    EnhancedLogger.info('HyperLiquid unsubscription requested', {
      component: 'HyperLiquidWebSocket',
      subscription,
      subscriptionKey
    })
  }

  private getSubscriptionKey(subscription: HyperLiquidSubscription): string {
    return `${subscription.type}:${subscription.coin || ''}:${subscription.user || ''}:${subscription.interval || ''}`
  }

  // Event handling
  private setupEventHandlers(): void {
    this.on('l2Book', (data: HyperLiquidOrderBook) => {
      this.emit('orderbook', data)
    })

    this.on('trades', (data: HyperLiquidTrade[]) => {
      this.emit('trades', data)
    })

    this.on('candle', (data: HyperLiquidCandle) => {
      this.emit('candle', data)
    })

    this.on('user', (data: HyperLiquidUserUpdate) => {
      this.emit('userUpdate', data)
    })

    this.on('orderUpdates', (data: any) => {
      this.emit('orderUpdate', data)
    })

    this.on('fills', (data: any) => {
      this.emit('fill', data)
    })
  }

  on(event: string, handler: HyperLiquidEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: string, handler: HyperLiquidEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          EnhancedLogger.error('Error in HyperLiquid event handler', {
            component: 'HyperLiquidWebSocket',
            event,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
    }
  }

  // Connection management
  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.subscriptions.clear()
    this.isAuthenticated = false

    EnhancedLogger.info('HyperLiquid WebSocket disconnected by client', {
      component: 'HyperLiquidWebSocket'
    })
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return 'CLOSED'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING'
      case WebSocket.OPEN: return 'OPEN'
      case WebSocket.CLOSING: return 'CLOSING'
      case WebSocket.CLOSED: return 'CLOSED'
      default: return 'UNKNOWN'
    }
  }

  getSubscriptions(): Set<string> {
    return new Set(this.subscriptions)
  }

  getStats() {
    return {
      connected: this.isConnected(),
      authenticated: this.isAuthenticated,
      connectionState: this.getConnectionState(),
      subscriptionCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      circuitBreakerState: this.circuitBreaker.getState(),
      activeSubscriptions: Array.from(this.subscriptions)
    }
  }
}

// Export singleton instance
export const hyperLiquidWS = HyperLiquidWebSocket.getInstance()

export default HyperLiquidWebSocket