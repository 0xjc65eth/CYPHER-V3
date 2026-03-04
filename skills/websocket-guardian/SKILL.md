---
name: websocket-guardian
description: Garante que todos os WebSockets do CYPHER V3 funcionam de forma robusta — dados live reais, reconexão automática, sem memory leaks, com indicador visual de estado
version: "4.0"
tags: [websocket, real-time, live-data, reconnection, memory-leaks]
---

# SKILL: WebSocket Guardian — CYPHER V3

## Por que é crítico
O CYPHER V3 é uma plataforma de trading em tempo real. Se os WebSockets falham:
- Preços ficam congelados → trader toma decisões com dados errados
- P&L para de atualizar → utilizador pensa que perdeu/ganhou mais do que na realidade
- Order book estático → impossível fazer trading

## Inventário de WebSockets no Projeto
```bash
# Encontrar todos os WebSockets
grep -rn "new WebSocket\|useWebSocket\|socket\.connect\|ws://" \
  src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec"
```

## Padrão Correto para Cada Tipo de WebSocket

### 1. BTC Price (Binance WebSocket)
```typescript
// src/hooks/useBTCPrice.ts

export function useBTCPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number>(0)
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting' | 'error'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const attemptRef = useRef(0)
  
  const connect = useCallback(() => {
    // Limpar conexão anterior
    if (wsRef.current) {
      wsRef.current.onclose = null // previne reconnect loop
      wsRef.current.close()
    }
    
    setStatus('connecting')
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker')
    wsRef.current = ws
    
    ws.onopen = () => {
      attemptRef.current = 0
      setStatus('live')
    }
    
    ws.onmessage = ({ data }) => {
      try {
        const ticker = JSON.parse(data)
        setPrice(parseFloat(ticker.c))        // close price = current price
        setChange24h(parseFloat(ticker.P))    // price change %
      } catch {
        // JSON inválido — ignorar
      }
    }
    
    ws.onclose = (event) => {
      if (event.wasClean) return // fechado intencionalmente
      
      const delay = Math.min(1000 * 2 ** attemptRef.current, 30000)
      attemptRef.current++
      setStatus(attemptRef.current > 5 ? 'error' : 'reconnecting')
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }
  }, [])
  
  useEffect(() => {
    connect()
    return () => {
      // CRÍTICO: cleanup completo
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
  
  return { price, change24h, status }
}
```

### 2. Ordinals Floor Price (polling inteligente)
```typescript
// Ordinals não tem WebSocket público — usar polling com React Query
// Interval: 60s (floor não muda a cada segundo)

export function useOrdinalFloor(collectionId: string) {
  return useQuery({
    queryKey: ['ordinal-floor', collectionId],
    queryFn: async () => {
      const res = await fetchWithTimeout(
        `https://api.hiro.so/ordinals/v1/collections/${collectionId}`,
        {},
        8000
      )
      const data = await res.json()
      return {
        floorPrice: data.floor_price,
        volume24h: data.volume_24h,
        listings: data.listed_count,
        updatedAt: Date.now(),
      }
    },
    staleTime: 45 * 1000,        // considerar fresh por 45s
    gcTime: 5 * 60 * 1000,       // manter em cache 5min
    refetchInterval: 60 * 1000,  // refetch a cada 60s
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })
}
```

### 3. Hyperliquid WebSocket (trading)
```typescript
// src/lib/hyperliquid/ws.ts

export class HyperliquidWS {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, Set<(data: unknown) => void>>()
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
  private reconnectAttempts = 0
  private pingInterval: NodeJS.Timeout | null = null
  
  constructor(private url = 'wss://api.hyperliquid.xyz/ws') {}
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.status = 'connecting'
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        this.status = 'connected'
        this.reconnectAttempts = 0
        this.startPing()
        resolve()
      }
      
      this.ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if (msg.channel && this.subscriptions.has(msg.channel)) {
            this.subscriptions.get(msg.channel)!.forEach(cb => cb(msg.data))
          }
        } catch { /* ignorar */ }
      }
      
      this.ws.onclose = () => {
        this.status = 'disconnected'
        this.stopPing()
        this.scheduleReconnect()
      }
      
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'))
    })
  }
  
  subscribe(channel: string, callback: (data: unknown) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
      this.send({ method: 'subscribe', subscription: { type: channel } })
    }
    this.subscriptions.get(channel)!.add(callback)
    
    // Retorna unsubscribe function
    return () => {
      this.subscriptions.get(channel)?.delete(callback)
      if (this.subscriptions.get(channel)?.size === 0) {
        this.subscriptions.delete(channel)
        this.send({ method: 'unsubscribe', subscription: { type: channel } })
      }
    }
  }
  
  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
  
  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ method: 'ping' })
    }, 30000)
  }
  
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
  
  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }
  
  disconnect() {
    this.reconnectAttempts = 999 // previne reconnect
    this.stopPing()
    this.ws?.close()
    this.ws = null
  }
}
```

## Scan e Fix de Memory Leaks
```bash
# Encontrar useEffect com WebSocket sem cleanup
grep -B2 -A20 "new WebSocket\|useWebSocket" src/ --include="*.tsx" -r | \
  grep -A20 "useEffect" | grep -c "return () =>"

# Encontrar setInterval sem cleanup
grep -B2 -A10 "setInterval" src/hooks/ --include="*.ts" -r | \
  grep -c "clearInterval\|return () =>"

# Encontrar setTimeout sem cleanup em componentes
grep -rn "setTimeout" src/components/ --include="*.tsx" | \
  grep -v "clearTimeout\|useCallback" | head -10
```

## Indicador Visual Global de Conexão
```typescript
// components/layout/ConnectionBar.tsx
// Mostrar no topo de todas as páginas

export function ConnectionBar() {
  const { status: btcStatus } = useBTCPrice()
  const { isConnected: wsConnected } = useHyperliquidWS()
  
  const allGood = btcStatus === 'live' && wsConnected
  const hasIssue = btcStatus === 'reconnecting' || !wsConnected
  
  if (allGood) return null // não mostrar quando tudo ok — menos ruído
  
  return (
    <div className={`w-full py-1 px-4 text-center text-xs font-mono ${
      hasIssue ? 'bg-[#FFB800]/10 text-[#FFB800] border-b border-[#FFB800]/20' :
      'bg-[#FF0040]/10 text-[#FF0040] border-b border-[#FF0040]/20'
    }`}>
      {btcStatus === 'reconnecting' ? '⟳ Reconnecting to live data...' :
       btcStatus === 'error' ? '✕ Live data unavailable — showing last known values' :
       !wsConnected ? '⟳ Trading connection interrupted...' : ''}
    </div>
  )
}
```
