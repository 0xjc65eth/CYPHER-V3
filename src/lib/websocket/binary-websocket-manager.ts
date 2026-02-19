import { EventEmitter } from 'events'
import WebSocket from 'ws'
import msgpack from 'msgpack-lite'
import zlib from 'zlib'

interface BinaryMessage {
  type: number // 1 byte instead of string
  symbol: number // 2 bytes for symbol ID
  price: number // 8 bytes float
  volume: number // 8 bytes float
  timestamp: bigint // 8 bytes
  side: boolean // 1 byte (true=buy, false=sell)
}

// Symbol mapping for efficient encoding
const SYMBOL_MAP = new Map([
  ['BTCUSDT', 1],
  ['ETHUSDT', 2],
  ['ORDIUSDT', 3],
  ['SATSUSDT', 4],
  ['RUNEUSDT', 5]
])

const REVERSE_SYMBOL_MAP = new Map(
  Array.from(SYMBOL_MAP.entries()).map(([k, v]) => [v, k])
)

export class BinaryWebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocket[]> = new Map()
  private messageBuffer: ArrayBuffer
  private encoder: DataView
  
  constructor() {
    super()
    this.messageBuffer = new ArrayBuffer(32) // Fixed size for performance
    this.encoder = new DataView(this.messageBuffer)
    this.initializeConnections()
  }
  
  private initializeConnections() {
    const exchanges = [
      { name: 'binance', url: 'wss://stream.binance.com:9443/ws', poolSize: 10 },
      { name: 'okx', url: 'wss://ws.okx.com:8443/ws/v5/public', poolSize: 10 },
      { name: 'bybit', url: 'wss://stream.bybit.com/v5/public/spot', poolSize: 10 }
    ]
    
    exchanges.forEach(({ name, url, poolSize }) => {
      const pool: WebSocket[] = []
      
      for (let i = 0; i < poolSize; i++) {
        const ws = new WebSocket(url, {
          perMessageDeflate: {
            zlibDeflateOptions: {
              level: zlib.Z_BEST_SPEED // Fastest compression
            }
          },
          maxPayload: 10 * 1024 * 1024
        })
        
        ws.binaryType = 'arraybuffer'
        
        ws.on('open', () => {
          this.subscribeToStreams(ws, name)
        })
        
        ws.on('message', (data: ArrayBuffer) => {
          const decoded = this.decodeBinaryMessage(data)
          this.emit('price', { exchange: name, data: decoded })
        })
        
        ws.on('error', (error) => {
          console.error(`${name} pool ${i} error:`, error)
          this.reconnect(ws, name, url, i)
        })
        
        pool.push(ws)
      }
      
      this.connections.set(name, pool)
    })
  }
  
  private encodeBinaryMessage(msg: any): ArrayBuffer {
    // Reset buffer
    this.encoder.setUint8(0, msg.type || 1) // Message type
    this.encoder.setUint16(1, SYMBOL_MAP.get(msg.symbol) || 0) // Symbol ID
    this.encoder.setFloat64(3, msg.price) // Price
    this.encoder.setFloat64(11, msg.volume) // Volume
    this.encoder.setBigUint64(19, BigInt(msg.timestamp)) // Timestamp
    this.encoder.setUint8(27, msg.side === 'buy' ? 1 : 0) // Side
    
    return this.messageBuffer
  }
  
  private decodeBinaryMessage(buffer: ArrayBuffer): any {
    const view = new DataView(buffer)
    
    try {
      // Try binary protocol first
      if (buffer.byteLength === 32) {
        return {
          type: view.getUint8(0),
          symbol: REVERSE_SYMBOL_MAP.get(view.getUint16(1)) || 'UNKNOWN',
          price: view.getFloat64(3),
          volume: view.getFloat64(11),
          timestamp: Number(view.getBigUint64(19)),
          side: view.getUint8(27) === 1 ? 'buy' : 'sell'
        }
      }
      
      // Fallback to MessagePack for complex messages
      return msgpack.decode(new Uint8Array(buffer))
    } catch (e) {
      // Final fallback to JSON
      const text = new TextDecoder().decode(buffer)
      return JSON.parse(text)
    }
  }
  
  private subscribeToStreams(ws: WebSocket, exchange: string) {
    const symbols = Array.from(SYMBOL_MAP.keys())
    
    switch (exchange) {
      case 'binance':
        ws.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: symbols.map(s => `${s.toLowerCase()}@aggTrade`),
          id: Date.now()
        }))
        break
        
      case 'okx':
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: symbols.map(s => ({ channel: 'trades', instId: s }))
        }))
        break
        
      case 'bybit':
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: symbols.map(s => `publicTrade.${s}`)
        }))
        break
    }
  }
  
  private reconnect(ws: WebSocket, exchange: string, url: string, poolIndex: number) {
    setTimeout(() => {
      const newWs = new WebSocket(url, {
        perMessageDeflate: true,
        maxPayload: 10 * 1024 * 1024
      })
      
      newWs.binaryType = 'arraybuffer'
      
      // Copy all event listeners
      newWs.on('open', () => {
        this.subscribeToStreams(newWs, exchange)
      })
      
      newWs.on('message', (data: ArrayBuffer) => {
        const decoded = this.decodeBinaryMessage(data)
        this.emit('price', { exchange, data: decoded })
      })
      
      // Update pool
      const pool = this.connections.get(exchange)
      if (pool) {
        pool[poolIndex] = newWs
      }
    }, 1000)
  }
  
  sendBinaryMessage(exchange: string, message: any) {
    const pool = this.connections.get(exchange)
    if (!pool) return
    
    // Round-robin across pool
    const ws = pool[Math.floor(Math.random() * pool.length)]
    if (ws.readyState === WebSocket.OPEN) {
      const encoded = this.encodeBinaryMessage(message)
      ws.send(encoded)
    }
  }
  
  getConnectionStats() {
    const stats: any = {}
    
    this.connections.forEach((pool, exchange) => {
      stats[exchange] = {
        total: pool.length,
        connected: pool.filter(ws => ws.readyState === WebSocket.OPEN).length,
        connecting: pool.filter(ws => ws.readyState === WebSocket.CONNECTING).length,
        closed: pool.filter(ws => ws.readyState === WebSocket.CLOSED).length
      }
    })
    
    return stats
  }
}

// Export singleton instance
export const binaryWsManager = new BinaryWebSocketManager()