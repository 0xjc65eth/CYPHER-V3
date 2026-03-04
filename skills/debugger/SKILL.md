---
name: debugger
description: Identifica e corrige bugs, memory leaks, hydration mismatches, e erros silenciosos no CYPHER V3
version: "2.0"
tags: [debug, bugs, errors, hydration, memory-leaks]
---

# SKILL: Debugger — CYPHER V3

## Diagnóstico Inicial Obrigatório
Antes de qualquer debug, executar sempre:
```bash
npm run type-check 2>&1 | head -50
npm run lint 2>&1 | head -50
grep -rn "console\.log\|TODO\|FIXME\|HACK\|XXX\|@ts-ignore\|@ts-nocheck\|as any" src/ --include="*.ts" --include="*.tsx"
```

## Categorias de Bugs Críticos no CYPHER V3

### 1. Hydration Mismatches (CRÍTICO)
**Sintoma:** `Error: Hydration failed because the initial UI does not match...`
**Causas comuns:**
- Preços em tempo real renderizados no servidor com valores diferentes do cliente
- `Date.now()` ou `new Date()` sem `suppressHydrationWarning`
- Condicionais baseadas em `window`, `localStorage`, ou `navigator`

**Fix padrão:**
```typescript
// ❌ ERRADO — causa hydration mismatch
function PriceDisplay({ price }: { price: number }) {
  return <span>{price.toFixed(2)}</span>
}

// ✅ CORRETO — usar useEffect para valores dinâmicos
'use client'
import { useState, useEffect } from 'react'

function PriceDisplay({ initialPrice }: { initialPrice: number }) {
  const [price, setPrice] = useState(initialPrice)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // subscrever a WebSocket/live data aqui
  }, [])

  if (!mounted) return <span className="animate-pulse bg-[#1a1a1a] w-20 h-4 inline-block rounded" />
  return <span>{price.toFixed(2)}</span>
}
```

### 2. Memory Leaks (CRÍTICO)
**Sintoma:** CPU/RAM a subir progressivamente, performance degrada com o tempo

**Causas no CYPHER V3:**
- `AgentOrchestrator` com `setInterval` sem cleanup
- WebSocket listeners acumulados
- EventListeners sem `removeEventListener`

**Fix padrão:**
```typescript
// ❌ ERRADO
useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000)
  // sem cleanup!
}, [])

// ✅ CORRETO
useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000)
  const ws = new WebSocket(WS_URL)
  ws.onmessage = handleMessage

  return () => {
    clearInterval(interval)
    ws.close()
    ws.removeEventListener('message', handleMessage)
  }
}, [])
```

### 3. Promises sem Catch (CRÍTICO)
**Scan:**
```bash
grep -rn "\.then(" src/ | grep -v "\.catch\|\.finally" | grep -v "test\|spec"
grep -rn "async.*=>" src/ | grep -v "try\|await" | head -20
```

**Fix:**
```typescript
// ❌ ERRADO
fetchData().then(setData)

// ✅ CORRETO
fetchData()
  .then(setData)
  .catch((err) => {
    console.error('[ComponentName] fetchData failed:', err)
    setError(err.message)
  })
```

### 4. Redis Connection Failures
**Sintoma:** App quebra quando `REDIS_URL` está vazio

**Verificar em `/lib/cache/redis.ts`:**
```typescript
// DEVE ter fallback in-memory
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new MemoryCache()  // implementação local
```

### 5. TypeScript `any` Silencioso
```bash
# Encontrar todos os `any` explícitos e implícitos
grep -rn ": any\|as any\|<any>" src/ --include="*.ts" --include="*.tsx"
```

### 6. Mock Data em Produção
```bash
# Scan completo de mock data
grep -rn "mockData\|MOCK_DATA\|mock_data\|isMock\|useMock\|fakePrices\|dummyData" src/
grep -rn "Math\.random()\|Math\.floor(Math\.random" src/ --include="*.ts" --include="*.tsx"
```
**Se encontrado:** SUBSTITUIR pela API real imediatamente — nunca comentar ou condicionar.

### 7. WebSocket Reconexão
**Sintoma:** Dados parados após perda de conexão

**Fix com exponential backoff:**
```typescript
class WebSocketManager {
  private reconnectDelay = 1000
  private maxDelay = 30000
  private ws: WebSocket | null = null

  connect(url: string) {
    this.ws = new WebSocket(url)
    this.ws.onclose = () => {
      setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
        this.connect(url)
      }, this.reconnectDelay)
    }
    this.ws.onopen = () => {
      this.reconnectDelay = 1000  // reset
    }
  }
}
```

## Workflow de Debug

### Passo 1: Reproduzir
```bash
npm run dev
# Abrir browser com DevTools
# Console → filtrar por Errors
# Network → filtrar por Failed
```

### Passo 2: Isolar
```bash
# Identificar ficheiro exato
npm run type-check 2>&1 | grep "error TS"
# Verificar linha específica
```

### Passo 3: Corrigir e Verificar
```bash
# Após fix
npm run type-check
npm run lint
npm run test -- --testPathPattern="[módulo afetado]"
```

## Erros Frequentes no CYPHER V3

| Erro | Causa | Fix |
|------|-------|-----|
| `Cannot read property 'price' of undefined` | API response sem validação | Adicionar optional chaining + Zod |
| `WebSocket is closed` | Sem reconnection logic | WebSocketManager com backoff |
| `Hydration failed` | Server/client state diferente | `useEffect` + mounted flag |
| `Redis connection refused` | REDIS_URL vazio | Fallback in-memory |
| `Cannot find module '@/...'` | Path alias errado | Verificar `tsconfig.json paths` |
| `ChunkLoadError` | Code splitting falhou | `next.config.js` chunk config |

## Comandos Rápidos
```bash
# Ver todos os erros de TypeScript
npx tsc --noEmit 2>&1

# Verificar bundle size
npm run build 2>&1 | grep "First Load JS"

# Memory usage em dev
node --expose-gc --max-old-space-size=4096 node_modules/.bin/next dev
```
