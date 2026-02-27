import { io, Socket } from 'socket.io-client'
import EventEmitter from 'events'

interface PriceData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
  timestamp: number
}

interface OrderBook {
  symbol: string
  bids: Array<[number, number]> // [price, amount]
  asks: Array<[number, number]>
  timestamp: number
}

export class WebSocketManager extends EventEmitter {
  private sockets: Map<string, Socket> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map()
  private isDestroyed = false
  private abortController: AbortController | null = null
  private handleBeforeUnload: (() => void) | null = null
  private handleVisibilityChange: (() => void) | null = null
  
  constructor() {
    super()
    this.abortController = new AbortController()
    this.initializeConnections()
    this.setupCleanupHandlers()
  }
  
  private initializeConnections() {
    // Only initialize in browser environment with WebSocket support
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }
    
    if (this.isDestroyed) return;
    
    // Binance WebSocket
    this.connectExchange('binance', 'wss://stream.binance.com:9443/ws')
    
    // OKX WebSocket
    this.connectExchange('okx', 'wss://ws.okx.com:8443/ws/v5/public')
    
    // Bybit WebSocket
    this.connectExchange('bybit', 'wss://stream.bybit.com/v5/public/spot')
  }
  
  private connectExchange(exchange: string, url: string) {
    if (this.isDestroyed) return;
    
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })
    
    socket.on('connect', () => {
      if (this.isDestroyed) {
        socket.disconnect();
        return;
      }
      
      this.emit('connected', exchange)
      
      // Resubscribe to previous subscriptions
      const subs = this.subscriptions.get(exchange)
      if (subs) {
        subs.forEach(symbol => {
          if (!this.isDestroyed) {
            this.subscribeToSymbol(exchange, symbol)
          }
        })
      }
    })
    
    socket.on('disconnect', () => {
      if (!this.isDestroyed) {
        this.emit('disconnected', exchange)
      }
    })
    
    socket.on('error', (error: Error) => {
      if (!this.isDestroyed) {
        console.error(`${exchange} error:`, error)
        this.emit('error', { exchange, error })
      }
    })
    
    socket.on('message', (data: any) => {
      if (!this.isDestroyed) {
        this.handleMessage(exchange, data)
      }
    })
    
    this.sockets.set(exchange, socket)
  }
  
  private handleMessage(exchange: string, data: any) {
    switch (exchange) {
      case 'binance':
        this.handleBinanceMessage(data)
        break
      case 'okx':
        this.handleOKXMessage(data)
        break
      case 'bybit':
        this.handleBybitMessage(data)
        break
    }
  }
  
  private handleBinanceMessage(data: any) {
    if (data.e === '24hrTicker') {
      const priceData: PriceData = {
        symbol: data.s,
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        volume24h: parseFloat(data.v),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        timestamp: data.E
      }
      this.emit('price', { exchange: 'binance', data: priceData })
    } else if (data.e === 'depthUpdate') {
      const orderBook: OrderBook = {
        symbol: data.s,
        bids: data.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
        asks: data.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
        timestamp: data.E
      }
      this.emit('orderbook', { exchange: 'binance', data: orderBook })
    }
  }
  
  private handleOKXMessage(data: any) {
    if (data.arg && data.arg.channel === 'tickers') {
      const ticker = data.data[0]
      const priceData: PriceData = {
        symbol: ticker.instId,
        price: parseFloat(ticker.last),
        change24h: parseFloat(ticker.sodUtc8) ? ((parseFloat(ticker.last) - parseFloat(ticker.sodUtc8)) / parseFloat(ticker.sodUtc8)) * 100 : 0,
        volume24h: parseFloat(ticker.vol24h),
        high24h: parseFloat(ticker.high24h),
        low24h: parseFloat(ticker.low24h),
        timestamp: parseInt(ticker.ts)
      }
      this.emit('price', { exchange: 'okx', data: priceData })
    }
  }
  
  private handleBybitMessage(data: any) {
    if (data.topic && data.topic.includes('tickers')) {
      const ticker = data.data
      const priceData: PriceData = {
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.price24hPcnt) * 100,
        volume24h: parseFloat(ticker.volume24h),
        high24h: parseFloat(ticker.highPrice24h),
        low24h: parseFloat(ticker.lowPrice24h),
        timestamp: Date.now()
      }
      this.emit('price', { exchange: 'bybit', data: priceData })
    }
  }
  
  subscribeToSymbol(exchange: string, symbol: string) {
    if (this.isDestroyed) return;
    
    const socket = this.sockets.get(exchange)
    if (!socket) return
    
    // Track subscriptions
    if (!this.subscriptions.has(exchange)) {
      this.subscriptions.set(exchange, new Set())
    }
    this.subscriptions.get(exchange)!.add(symbol)
    
    // Subscribe based on exchange
    switch (exchange) {
      case 'binance':
        socket.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [
            `${symbol.toLowerCase()}@ticker`,
            `${symbol.toLowerCase()}@depth20@100ms`
          ],
          id: Date.now()
        }))
        break
        
      case 'okx':
        socket.send(JSON.stringify({
          op: 'subscribe',
          args: [{
            channel: 'tickers',
            instId: symbol
          }, {
            channel: 'books',
            instId: symbol
          }]
        }))
        break
        
      case 'bybit':
        socket.send(JSON.stringify({
          op: 'subscribe',
          args: [`tickers.${symbol}`, `orderbook.50.${symbol}`]
        }))
        break
    }
  }
  
  unsubscribeFromSymbol(exchange: string, symbol: string) {
    if (this.isDestroyed) return;
    
    const socket = this.sockets.get(exchange)
    if (!socket) return
    
    // Remove from subscriptions
    this.subscriptions.get(exchange)?.delete(symbol)
    
    // Unsubscribe based on exchange
    switch (exchange) {
      case 'binance':
        socket.send(JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [
            `${symbol.toLowerCase()}@ticker`,
            `${symbol.toLowerCase()}@depth20@100ms`
          ],
          id: Date.now()
        }))
        break
        
      case 'okx':
        socket.send(JSON.stringify({
          op: 'unsubscribe',
          args: [{
            channel: 'tickers',
            instId: symbol
          }, {
            channel: 'books',
            instId: symbol
          }]
        }))
        break
        
      case 'bybit':
        socket.send(JSON.stringify({
          op: 'unsubscribe',
          args: [`tickers.${symbol}`, `orderbook.50.${symbol}`]
        }))
        break
    }
  }
  
  disconnect() {
    this.isDestroyed = true;

    // Remove cleanup event listeners
    if (typeof window !== 'undefined') {
      if (this.handleBeforeUnload) {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        this.handleBeforeUnload = null;
      }
      if (this.handleVisibilityChange) {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.handleVisibilityChange = null;
      }
    }

    // Abortar operações pendentes
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Desconectar todos os sockets
    this.sockets.forEach((socket, exchange) => {
      try {
        if (socket.connected) {
          socket.disconnect();
        }
        socket.removeAllListeners();
      } catch (error) {
        console.error(`Error disconnecting ${exchange}:`, error);
      }
    })
    
    this.sockets.clear()
    this.subscriptions.clear()
    
    // Remover todos os listeners de eventos
    this.removeAllListeners();
  }
  
  private setupCleanupHandlers() {
    if (typeof window === 'undefined') return;

    // Cleanup quando a página é fechada
    this.handleBeforeUnload = () => {
      this.disconnect();
    };

    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Cleanup quando a página perde o foco
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.sockets.forEach(socket => {
          if (socket.connected) {
            socket.disconnect();
          }
        });
      } else if (document.visibilityState === 'visible' && !this.isDestroyed) {
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.initializeConnections();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Singleton instance com cleanup melhorado
let wsManagerInstance: WebSocketManager | null = null;

export const wsManager = (() => {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
})();

// Função para cleanup global
export function destroyWebSocketManager() {
  if (wsManagerInstance) {
    wsManagerInstance.disconnect();
    wsManagerInstance = null;
  }
}