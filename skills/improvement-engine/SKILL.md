---
name: improvement-engine
description: Implementa melhorias de alto impacto no CYPHER V3 para tornar a plataforma profissional e de referência
version: "2.0"
tags: [improvement, professional, quality, ux, polish]
---

# SKILL: Improvement Engine — CYPHER V3

## Princípio: Uma plataforma profissional não tem "quase certo" — tem CERTO
Cada detalhe conta. Um trader que vê "NaN" numa posição de $50k vai embora e nunca mais volta.

## Melhorias por Ordem de Impacto

### 1. 🔴 Formatação Centralizada (IMPACTO: CRÍTICO)
**Problema:** Números formatados de forma inconsistente pela UI
**Fix:** Criar `src/lib/format.ts` com funções centralizadas

```typescript
// Usar SEMPRE estas funções em vez de .toFixed(), .toLocaleString(), etc.
import { formatUSD, formatBTC, formatSats, formatPct, formatCompact, safe } from '@/lib/format'

// ANTES (inconsistente)
<span>{price.toFixed(2)}</span>
<span>{(change * 100).toFixed(1)}%</span>

// DEPOIS (consistente)
<span>{formatUSD(price)}</span>
<span>{formatPct(change)}</span>
```

**Scan de ficheiros a corrigir:**
```bash
grep -rn "\.toFixed\|\.toLocaleString" src/components/ --include="*.tsx" | grep -v "format\." | head -30
```

### 2. 🔴 Fallback "—" Universal (IMPACTO: CRÍTICO)
**Problema:** undefined, null, NaN visíveis na UI
**Fix:** Usar `safe()` em TODOS os valores dinâmicos

```typescript
// ANTES
<span>{item.price}</span>          // pode mostrar "undefined"
<span>{item.change}%</span>        // pode mostrar "NaN%"

// DEPOIS
<span>{safe(item.price, '—')}</span>
<span>{formatPct(item.change)}</span>  // formatPct já retorna "—" se NaN
```

**Scan:**
```bash
grep -rn "undefined\|\.price}\|\.volume}\|\.change}" src/components/ --include="*.tsx" | \
  grep -v "typeof\|===\|!==\|format\|safe\|??" | head -20
```

### 3. 🟡 Error Boundaries em Módulos (IMPACTO: ALTO)
**Problema:** Um erro num módulo pode crashar a app inteira
**Fix:** Wrap cada módulo principal com `<ModuleErrorBoundary>`

```typescript
// Em cada página/módulo:
import { ModuleErrorBoundary } from '@/components/ui/ModuleErrorBoundary'

<ModuleErrorBoundary moduleName="Ordinals">
  <OrdinalsModule />
</ModuleErrorBoundary>
```

**Módulos que DEVEM ter error boundary:**
- Dashboard, Ordinals, Runes, BRC-20, Rare Sats
- Portfolio, Trading, AI Chat, Agent Dashboard

### 4. 🟡 Empty States com Contexto (IMPACTO: ALTO)
**Problema:** Listas/tabelas vazias sem explicação
**Fix:** Cada lista vazia mostra ícone + mensagem + ação

```typescript
// ANTES
{items.length === 0 && <div>No data</div>}

// DEPOIS
{items.length === 0 && (
  <div className="flex flex-col items-center gap-3 py-12 text-[#666]">
    <span className="text-2xl">📊</span>
    <p className="text-sm">No collections found</p>
    <button onClick={refetch} className="text-[#FF6B00] text-xs hover:underline">
      Refresh data
    </button>
  </div>
)}
```

### 5. 🟡 Loading Skeletons Bloomberg-style (IMPACTO: ALTO)
**Problema:** Spinners genéricos fazem a app parecer amadora
**Fix:** Skeleton que preserva o layout exato do conteúdo

```bash
# Encontrar spinners genéricos
grep -rn "Spinner\|spinner\|CircularProgress\|loading.*icon" src/components/ --include="*.tsx" | head -10
```

### 6. 🟢 Real-Time Price Ticker no Header (IMPACTO: MÉDIO)
**Problema:** Sem preço BTC visível em todas as páginas
**Fix:** Ticker permanente no header com BTC, ETH, SOL

```typescript
// Componente que aparece em TODAS as páginas
// Usa React Query com refetchInterval: 15000 (15s)
// Binance WebSocket como fallback para real-time
```

### 7. 🟢 Indicador de Frescura dos Dados (IMPACTO: MÉDIO)
**Problema:** Trader não sabe se o preço é de agora ou de há 10 minutos
**Fix:** Junto a cada dado: timestamp discreto

```typescript
function DataFreshness({ timestamp }: { timestamp: number }) {
  const age = Date.now() - timestamp
  const color = age < 120000 ? '#666' : age < 600000 ? '#FFB800' : '#FF0040'
  return <span style={{ color }} className="text-[10px] font-mono">{formatTimeAgo(timestamp)}</span>
}
```

### 8. 🟢 Indicador de Conexão Live (IMPACTO: MÉDIO)
**Problema:** Trader não sabe se os dados estão a atualizar
**Fix:** Ponto colorido animado no header

```typescript
function ConnectionStatus({ status }: { status: 'live' | 'reconnecting' | 'offline' }) {
  const colors = { live: '#00FF41', reconnecting: '#FFB800', offline: '#FF0040' }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'live' ? 'animate-pulse' : ''}`}
           style={{ backgroundColor: colors[status] }} />
      <span className="text-[10px] font-mono text-[#666] uppercase">{status}</span>
    </div>
  )
}
```

### 9. 🟢 Keyboard Shortcuts (IMPACTO: BAIXO-MÉDIO)
```
Escape       → Fechar modal/drawer
Ctrl+Enter   → Submeter ordem
Cmd+R        → Refresh dados
Cmd+K        → Quick search
1-9          → Navegar entre tabs
```

### 10. 🟢 Consistência de Cores do Design System
```bash
# Encontrar cores fora do design system
grep -rn "text-green\|text-red\|bg-green\|bg-red\|text-blue\|bg-blue" \
  src/components/ --include="*.tsx" | \
  grep -v "text-\[#00FF41\]\|text-\[#FF0040\]\|text-\[#FF6B00\]\|bg-\[#0a0a0a\]\|bg-\[#1a1a1a\]"
# Substituir por cores Bloomberg:
# Verde: text-[#00FF41]
# Vermelho: text-[#FF0040]
# Laranja: text-[#FF6B00]
# Background: bg-[#000000] ou bg-[#0a0a0a]
```

## Protocolo de Implementação
```
Para CADA melhoria:
1. Identificar todos os ficheiros afetados
2. Implementar a mudança
3. Verificar visualmente no browser
4. npm run type-check
5. Commit separado: feat(ui): descrição da melhoria
```

## Relatório de Melhorias
```
## Melhorias Implementadas — CYPHER V3
**Data:** [timestamp]

### Implementadas
- [melhoria]: [N ficheiros afetados] → [impacto]

### Pendentes (por prioridade)
- [melhoria]: [razão para não implementar agora]

### Score de Profissionalismo: X/100
- Formatação: X/20
- Error handling: X/20
- Visual polish: X/20
- Data freshness: X/20
- Consistência: X/20
```
