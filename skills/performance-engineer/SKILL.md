---
name: performance-engineer
description: Otimiza performance do CYPHER V3 — bundle size, lazy loading, React rendering, WebSocket, cache
version: "2.0"
tags: [performance, bundle, lazy-loading, react, websocket, cache]
---

# SKILL: Performance Engineer — CYPHER V3

## Targets de Performance
| Métrica | Target | Crítico se |
|---------|--------|-----------|
| First Load JS | < 300KB | > 500KB |
| Build time | < 60s | > 120s |
| LCP | < 2.5s | > 4s |
| CLS | < 0.1 | > 0.25 |
| API response (cached) | < 200ms | > 500ms |
| API response (fresh) | < 1s | > 3s |
| WebSocket latency | < 100ms | > 500ms |

## Análise de Bundle
```bash
# Ver tamanho atual
npm run build 2>&1 | grep "First Load JS"

# Análise detalhada
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

## Lazy Loading Obrigatório

### Bibliotecas Pesadas (NUNCA importar diretamente)
```typescript
// ❌ ERRADO — bloqueia bundle principal
import * as tf from '@tensorflow/tfjs'
import ccxt from 'ccxt'
import { Chart } from 'chart.js'

// ✅ CORRETO — lazy com dynamic import
const TensorFlow = dynamic(() => import('@tensorflow/tfjs'), { ssr: false })

// Para funções específicas:
async function runMLModel(data: number[]) {
  const tf = await import('@tensorflow/tfjs')
  // usar tf aqui
}

// Para componentes:
const TradingChart = dynamic(
  () => import('@/components/charts/TradingChart'),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-[#1a1a1a] h-64 rounded" />
  }
)

// CCXT — carregar exchange específica, não o bundle todo
async function loadExchange(exchangeId: string) {
  const ccxt = await import('ccxt')
  const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt]
  return new ExchangeClass({ enableRateLimit: true })
}
```

### Componentes Abaixo do Fold
```typescript
// Qualquer componente não visível no viewport inicial
const PortfolioAnalytics = dynamic(() => import('./PortfolioAnalytics'))
const TradingHistory = dynamic(() => import('./TradingHistory'))
const RareSatsGallery = dynamic(() => import('./RareSatsGallery'))
```

## React Performance

### Evitar Re-renders Desnecessários
```typescript
// ❌ Criar objetos inline nos props
<Component config={{ key: 'value' }} />  // novo objeto a cada render

// ✅ Memoizar
const config = useMemo(() => ({ key: 'value' }), [])
<Component config={config} />

// ✅ Callbacks
const handleClick = useCallback((id: string) => {
  // lógica
}, [/* deps */])

// ✅ Componentes pesados
const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return <ul>{items.map(/* ... */)}</ul>
})
```

### React Query Config Otimizado
```typescript
// Configuração global em providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30s antes de refetch
      gcTime: 5 * 60 * 1000,    // 5min em garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
})

// Por query — ajustar TTL ao tipo de dado
// Preços: 15s | Ordinals floor: 60s | Portfolio: 5min | Static: infinity
```

### Virtualização de Listas Longas
```typescript
// Para listas de Ordinals/Runes com 100+ items
import { useVirtualizer } from '@tanstack/react-virtual'

function OrdinalsList({ items }: { items: Ordinal[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,  // altura estimada de cada item
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(({ index, start }) => (
          <div key={index} style={{ transform: `translateY(${start}px)`, position: 'absolute' }}>
            <OrdinalCard item={items[index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## WebSocket Performance
```typescript
// Pool de mensagens — não processar cada mensagem individualmente
class WebSocketBatcher {
  private queue: PriceUpdate[] = []
  private flushInterval: NodeJS.Timeout

  constructor(private onFlush: (updates: PriceUpdate[]) => void) {
    this.flushInterval = setInterval(() => this.flush(), 100)  // batch a cada 100ms
  }

  push(update: PriceUpdate) {
    this.queue.push(update)
  }

  private flush() {
    if (this.queue.length === 0) return
    this.onFlush([...this.queue])
    this.queue = []
  }

  destroy() {
    clearInterval(this.flushInterval)
  }
}
```

## Redis Cache Strategy
```typescript
// Hierarquia de cache
const CACHE_STRATEGY = {
  // L1: React Query (in-memory, per client)
  // L2: Redis/Upstash (shared, cross-request)
  // L3: Database (Supabase)

  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as T

    const fresh = await fetcher()
    await redis.setex(key, ttl, JSON.stringify(fresh))
    return fresh
  }
}
```

## Comandos de Diagnóstico
```bash
# Bundle analyzer
ANALYZE=true npm run build

# Verificar imports pesados
npx depcheck  # dependências não usadas

# Lighthouse CI
npx lhci autorun --config=lighthouserc.js

# Memory usage durante dev
node --expose-gc -e "setInterval(() => { gc(); console.log(process.memoryUsage()) }, 5000)" &
npm run dev
```
