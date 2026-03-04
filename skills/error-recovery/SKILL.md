---
name: error-recovery
description: Garante que o CYPHER V3 nunca mostra ecrã branco, nunca crasha silenciosamente, e recupera graciosamente de falhas de API, rede, wallet e WebSocket
version: "4.0"
tags: [error-handling, resilience, recovery, graceful-degradation, robustness]
---

# SKILL: Error Recovery — CYPHER V3

## Princípio
Uma plataforma de trading profissional **nunca** quebra completamente. Se a API Hiro falha, mostra o último valor conhecido. Se o WebSocket cai, reconecta. Se a wallet desconecta, avisa com elegância.

## Cenários de Falha a Testar e Corrigir

### 1. API Timeout / Rate Limit
```typescript
// PROBLEMA: fetch sem timeout → UI fica a carregar para sempre
// FIX: AbortController com timeout

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited — espera e retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        throw new RateLimitError(`Rate limited. Retry after ${retryAfter}s`, retryAfter)
      }
      throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status)
    }
    
    return response
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeoutMs}ms: ${url}`)
    }
    throw error
  }
}
```

### 2. WebSocket Reconnection
```typescript
// PROBLEMA: WebSocket cai e dados param de atualizar sem aviso
// FIX: reconnect exponencial com indicador visual

class ResilientWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  
  constructor(
    private url: string,
    private onMessage: (data: unknown) => void,
    private onStatusChange: (status: 'connected' | 'reconnecting' | 'failed') => void
  ) {
    this.connect()
  }
  
  private connect() {
    this.ws = new WebSocket(this.url)
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      this.onStatusChange('connected')
    }
    
    this.ws.onmessage = ({ data }) => {
      try {
        this.onMessage(JSON.parse(data))
      } catch {
        // JSON inválido — ignorar silenciosamente
      }
    }
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000) // max 30s
        this.onStatusChange('reconnecting')
        setTimeout(() => this.connect(), this.reconnectDelay)
      } else {
        this.onStatusChange('failed')
      }
    }
    
    this.ws.onerror = () => {
      // onerror sempre seguido de onclose — não fazer nada aqui
    }
  }
  
  disconnect() {
    this.maxReconnectAttempts = 0 // previne reconnect
    this.ws?.close()
  }
}

// Indicador visual de estado de conexão
function ConnectionStatus({ status }: { status: 'connected' | 'reconnecting' | 'failed' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <div className={`w-1.5 h-1.5 rounded-full ${
        status === 'connected' ? 'bg-[#00FF41] animate-pulse' :
        status === 'reconnecting' ? 'bg-[#FFB800] animate-bounce' :
        'bg-[#FF0040]'
      }`} />
      <span className={
        status === 'connected' ? 'text-[#00FF41]' :
        status === 'reconnecting' ? 'text-[#FFB800]' :
        'text-[#FF0040]'
      }>
        {status === 'connected' ? 'LIVE' :
         status === 'reconnecting' ? 'RECONNECTING...' :
         'OFFLINE'}
      </span>
    </div>
  )
}
```

### 3. Redis / Cache Falha
```typescript
// PROBLEMA: REDIS_URL vazio ou Redis down → app crasha
// FIX: in-memory fallback transparente

import { Redis } from '@upstash/redis'

type CacheValue = string | number | object

class SafeCache {
  private redis: Redis | null = null
  private memoryCache = new Map<string, { value: CacheValue; expires: number }>()
  private usingMemory = false
  
  constructor() {
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        })
      } catch {
        console.warn('[Cache] Redis init failed — using in-memory fallback')
        this.usingMemory = true
      }
    } else {
      this.usingMemory = true
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (this.usingMemory || !this.redis) {
      const entry = this.memoryCache.get(key)
      if (!entry || Date.now() > entry.expires) return null
      return entry.value as T
    }
    
    try {
      return await this.redis.get<T>(key)
    } catch {
      // Redis falhou → fallback in-memory
      const entry = this.memoryCache.get(key)
      if (!entry || Date.now() > entry.expires) return null
      return entry.value as T
    }
  }
  
  async set(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
    // Sempre guarda in-memory como backup
    this.memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
    
    if (!this.usingMemory && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
      } catch {
        // Redis falhou — in-memory já foi guardado
      }
    }
  }
  
  isUsingMemory(): boolean {
    return this.usingMemory
  }
}

export const cache = new SafeCache()
```

### 4. Error Boundaries por Módulo
```typescript
// PROBLEMA: um módulo com erro crasha toda a página
// FIX: error boundary isolado por módulo

'use client'
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  moduleName: string
  fallback?: ReactNode
}

interface State {
  error: Error | null
  errorInfo: string
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: '' }
  }
  
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }
  
  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log para monitoring (sem console.log em produção)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.props.moduleName}] Error:`, error, info)
    }
    this.setState({ errorInfo: info.componentStack })
  }
  
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 p-6 border border-[#FF0040]/20 rounded-lg bg-[#0a0a0a]">
          <div className="text-[#FF0040] font-mono text-xs tracking-widest uppercase">
            {this.props.moduleName} — unavailable
          </div>
          <p className="text-[#444] text-xs text-center max-w-xs">
            {this.state.error.message || 'Unexpected error'}
          </p>
          <button
            onClick={() => this.setState({ error: null, errorInfo: '' })}
            className="text-[#FF6B00] text-xs border border-[#FF6B00]/30 px-4 py-1.5 rounded hover:bg-[#FF6B00]/10 transition-colors font-mono"
          >
            retry
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}

// Uso em cada módulo principal:
// <ModuleErrorBoundary moduleName="Ordinals">
//   <OrdinalsModule />
// </ModuleErrorBoundary>
```

### 5. Wallet Disconnect Recovery
```typescript
// PROBLEMA: wallet desconecta (extensão off, timeout) → estado inconsistente
// FIX: listener de estado + limpeza automática

function useWalletRecovery() {
  const { address, disconnect, isConnected } = useLaserEyes()
  
  useEffect(() => {
    if (!isConnected) return
    
    // Monitor de estado da wallet
    const checkWallet = setInterval(async () => {
      try {
        // Tentar operação que requer wallet ativa
        const balance = await window.BitcoinProvider?.getBalance?.()
        if (balance === undefined) {
          // Wallet desconectou silenciosamente
          disconnect()
          // Toast amigável
          toast.warning('Wallet disconnected', {
            description: 'Reconnect to see your portfolio',
            action: { label: 'Reconnect', onClick: () => setShowWalletModal(true) }
          })
        }
      } catch {
        // Ignorar erros de verificação
      }
    }, 30000) // verificar a cada 30s
    
    return () => clearInterval(checkWallet)
  }, [isConnected, disconnect])
}
```

### 6. Dados Stale (muito antigos)
```typescript
// PROBLEMA: dados em cache por muito tempo parecem "congelados"
// FIX: indicador de frescura dos dados

function DataFreshnessIndicator({ updatedAt }: { updatedAt: number }) {
  const [age, setAge] = useState(0)
  
  useEffect(() => {
    const update = () => setAge(Math.floor((Date.now() - updatedAt) / 1000))
    const interval = setInterval(update, 10000)
    update()
    return () => clearInterval(interval)
  }, [updatedAt])
  
  const isStale = age > 120 // mais de 2 minutos
  const isVeryStale = age > 600 // mais de 10 minutos
  
  if (isVeryStale) return (
    <span className="text-[#FF0040] text-[10px] font-mono">
      ⚠ {Math.floor(age/60)}m ago
    </span>
  )
  
  if (isStale) return (
    <span className="text-[#FFB800] text-[10px] font-mono">
      {Math.floor(age/60)}m ago
    </span>
  )
  
  return (
    <span className="text-[#444] text-[10px] font-mono">
      {age}s ago
    </span>
  )
}
```

## Scan de Vulnerabilidades de Robustez
```bash
# 1. Fetches sem try/catch
grep -rn "await fetch(" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "try\|catch\|\.catch" | head -20

# 2. useEffect sem cleanup
grep -A5 "useEffect" src/ --include="*.tsx" -l | \
  xargs grep -L "return () =>" 2>/dev/null | head -10

# 3. JSON.parse sem try/catch
grep -rn "JSON\.parse(" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "try\|catch" | head -10

# 4. WebSocket sem onclose handler
grep -rn "new WebSocket" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "onclose\|onError" | head -10

# 5. Componentes sem error boundary
grep -rn "export default function\|export function" src/components/ --include="*.tsx" | \
  wc -l
# Comparar com número de ErrorBoundary
grep -rn "ErrorBoundary\|error-boundary" src/ --include="*.tsx" | wc -l
```
