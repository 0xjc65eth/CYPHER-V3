---
name: ux-analyst
description: Analisa UX/UI do CYPHER V3 na perspetiva de um trader profissional que usa Bloomberg Terminal diariamente
version: "2.0"
tags: [ux, ui, bloomberg, trader-experience, accessibility]
---

# SKILL: UX Analyst — CYPHER V3

## Persona Principal: O Trader Profissional
**Utilizador típico do CYPHER V3:**
- Usa Bloomberg Terminal no trabalho diariamente
- Opera múltiplos mercados em simultâneo (BTC, Ordinals, Runes, DeFi)
- Tolerância ZERO a lentidão — cada segundo conta em trading
- Prefere densidade de informação a interfaces minimalistas
- Usa maioritariamente desktop (1440px+), mas consulta mobile para alertas
- Espera: dados em tempo real, zero latência percebida, atalhos de teclado

## Checklist UX por Componente

### Performance Percebida (USER FEELS SPEED)
```bash
# Verificar skeleton loaders
grep -rn "isLoading\|isFetching" src/components/ | grep -v "skeleton\|Skeleton\|pulse\|animate"
# → Todos os estados de loading DEVEM ter skeleton, não spinners genéricos
```

**Padrão obrigatório:**
```typescript
// ❌ MAU — spinner genérico
if (isLoading) return <Spinner />

// ✅ BOM — skeleton que preserva layout
if (isLoading) return (
  <div className="space-y-2 animate-pulse">
    <div className="h-4 bg-[#1a1a1a] rounded w-3/4" />
    <div className="h-8 bg-[#1a1a1a] rounded" />
    <div className="h-4 bg-[#1a1a1a] rounded w-1/2" />
  </div>
)
```

### Timeouts e Error States
```bash
# Verificar timeouts em fetch calls
grep -rn "fetch(" src/ | grep -v "timeout\|AbortController\|signal"
```

**Regra: MÁXIMO 10 segundos de espera visível ao utilizador:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10_000)

try {
  const res = await fetch(url, { signal: controller.signal })
} catch (err) {
  if (err.name === 'AbortError') {
    // mostrar mensagem amigável: "Dados indisponíveis — tentar novamente"
  }
} finally {
  clearTimeout(timeout)
}
```

### Feedback Imediato (Optimistic Updates)
```typescript
// Para ações de trading — resposta IMEDIATA, sync em background
const mutation = useMutation({
  mutationFn: submitOrder,
  onMutate: async (newOrder) => {
    // Cancelar queries em curso
    await queryClient.cancelQueries({ queryKey: ['orders'] })
    // Snapshot anterior
    const previous = queryClient.getQueryData(['orders'])
    // Atualizar otimisticamente
    queryClient.setQueryData(['orders'], (old: Order[]) => [...old, { ...newOrder, status: 'pending' }])
    return { previous }
  },
  onError: (err, variables, context) => {
    // Reverter se falhar
    queryClient.setQueryData(['orders'], context?.previous)
    toast.error('Ordem falhou: ' + err.message)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  },
})
```

### Densidade de Informação Bloomberg
**O padrão Bloomberg usa:**
- Fontes: `font-mono` para números, `font-sans` para labels
- Números sempre alinhados à direita com espaço fixo
- P&L: verde brilhante para positivo, vermelho para negativo
- Timestamps: sempre UTC + local

```typescript
// Componente de preço Bloomberg-style
function PriceCell({ value, change }: { value: number; change: number }) {
  return (
    <div className="font-mono text-right tabular-nums">
      <span className="text-[#FFFFFF] text-sm">{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      <span className={cn(
        "text-xs ml-1",
        change >= 0 ? "text-[#00FF41]" : "text-[#FF0040]"
      )}>
        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
      </span>
    </div>
  )
}
```

### Navigation e Fluxos Críticos
**Verificar:**
- Tempo entre clique e página carregada: < 300ms (percebido)
- Breadcrumbs claros em módulos profundos (Ordinals → Collection → Item)
- Back button sempre funcional
- Estado preservado ao navegar (React Query cache)

**Atalhos de teclado (Bloomberg-style):**
```typescript
// Adicionar em componentes de trading
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal()
    if (e.key === 'Enter' && e.ctrlKey) submitOrder()
    if (e.key === 'r' && e.metaKey) refreshData()
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [])
```

### Notificações e Alertas
```typescript
// NUNCA usar alert() ou confirm() nativo
// SEMPRE usar toast system com cores Bloomberg

// Sucesso
toast.success('Ordem executada: +0.05 BTC @ $95,420', { duration: 5000 })

// Erro
toast.error('Falha na ordem: saldo insuficiente', { duration: 8000 })

// Info
toast.info('Magic Eden a deprecar — dados via OKX NFT', { duration: 10000 })
```

## Heurísticas de Avaliação UX

### 1. Visibilidade do Estado do Sistema
- [ ] Loading states em todos os async
- [ ] Preços a atualizar mostram "flash" visual
- [ ] Conexão WebSocket: indicador verde/vermelho
- [ ] Last update timestamp visível

### 2. Prevenção de Erros
- [ ] Confirmação para ordens > $1000
- [ ] Validação de endereços antes de submit
- [ ] Slippage warning em DEX trades

### 3. Eficiência para Expert Users
- [ ] Keyboard shortcuts documentados
- [ ] Dados exportáveis (CSV/PDF)
- [ ] Watchlists personalizáveis
- [ ] Layouts persistentes por utilizador

### 4. Consistência Visual
```bash
# Verificar inconsistências de cor
grep -rn "text-green\|text-red\|bg-green\|bg-red" src/components/ | grep -v "text-\[#00FF41\]\|text-\[#FF0040\]"
# → Cores de sucesso/erro DEVEM ser as do design system
```

## Relatório UX (output format)
```
## Análise UX — [módulo]
**Perspetiva:** Trader profissional, Bloomberg Terminal user

### 🔴 Bloqueia produtividade
- item: descrição | fix: solução

### 🟡 Degrada experiência
- item: descrição | fix: solução

### 🟢 Quick wins
- item: descrição | fix: solução

### 💡 Features que traders vão adorar
- sugestão baseada em padrões Bloomberg/Reuters
```
