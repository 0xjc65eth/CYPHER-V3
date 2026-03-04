# CYPHER ORDi Future V3 — EMERGENCY FIX PROMPT
## Multi-Agent Team Resolution (Claude Code Agent Teams)

**URGÊNCIA:** Lançamento em poucas horas. Todos os bugs abaixo são BLOCKERS.

---

## CONTEXTO DO PROJETO

- **Stack:** Next.js 14 + TypeScript + Tailwind CSS + ethers.js + Stripe + Supabase
- **Deploy:** Vercel (cypherordifuture.xyz)
- **Modelo:** claude-opus-4-6 | Temperature: 0.3
- **Versão:** Beta 0.014
- **Funcionalidades Core:** DApp Bitcoin com Bloomberg-style Dashboard, Arbitrage Scanner (8 exchanges), Runes Professional Terminal, Ordinals Explorer, Cypher AI (multi-agent), Hacker Yields (trading agent autônomo), Portfolio Manager, Swap multi-chain

---

## INSTRUÇÃO PARA CLAUDE CODE

Use `--agent-teams` ou spawne múltiplos subagentes em paralelo. Cada agente deve trabalhar em um bug isolado. **NÃO ALTERE** a lógica de negócio que funciona — apenas corrija os bugs identificados abaixo.

```bash
claude --dangerously-skip-permissions
```

---

## BUG 1: FEATURES YHP LIBERADAS PARA TODOS (CRÍTICO — SEGURANÇA)

### Problema
Todas as abas do Cypher Arbitrage (Cross-Exchange, Triangular, Analytics, SMC Analysis, Performance, Risk, Charts, Paper Trading, Backtest, Alerts) mostram badge "YHP" mas estão ACESSÍVEIS para qualquer usuário, mesmo sem YHP NFT e sem wallet conectada.

### Causa Raiz
O componente `PremiumContent` em `src/components/premium-content.tsx` usa `requiredFeature="arbitrage"` para proteger as abas. Porém, a lógica de verificação depende de `hasFeature()` do `PremiumContext`, que usa o `effectiveSubscriptionTier`.

O problema está em `src/contexts/PremiumContext.tsx` linha 174-177:
```typescript
const effectiveSubscriptionTier: SubscriptionTier = (() => {
  if (hasPremiumAccess(accessTier)) return 'hacker_yields'
  return subscriptionTier
})()
```

E na linha 94-110 — o localStorage restore:
```typescript
const saved = localStorage.getItem(PREMIUM_STORAGE_KEY)
if (saved) {
  const parsed = JSON.parse(saved)
  if (parsed.isPremium) {
    setIsPremiumRaw(true)  // <-- RESTAURA premium do localStorage sem re-verificar!
    setAccessTier((parsed.accessTier as AccessTier) ?? 'premium')
  }
}
```

**O localStorage persiste o status premium indefinidamente.** Se um usuário já foi premium uma vez (ou se o estado foi corrompido), ele mantém acesso eterno. Além disso, o `hasFeature` no PremiumContent (linha 30) delega para `tierHasFeature(subscriptionTier, requiredFeature)`, e como o `subscriptionTier` no contexto é o `effectiveSubscriptionTier`, se `accessTier` foi restaurado como 'premium' do localStorage, `effectiveSubscriptionTier` retorna `'hacker_yields'`, dando acesso total.

### Correção Necessária

**Arquivo:** `src/contexts/PremiumContext.tsx`

1. **Adicionar re-verificação ao restaurar do localStorage:** Ao restaurar, marcar como `isVerifying = true` e re-verificar o contrato YHP on-chain antes de conceder acesso.
2. **Adicionar TTL ao cache do localStorage:** O premium status salvo deve expirar (ex: 1 hora).
3. **Não confiar em `accessTier` do localStorage sem validação:** O `accessTier` salvo deve ser tratado como "hint" e re-verificado.

**Arquivo:** `src/components/premium-content.tsx`

4. **Garantir que quando `requiredFeature` é definido E `hasFeatureAccess` retorna `false`, o fallback é mostrado.** Atualmente na linha 69, ele checa `hasFeatureAccess === false`, mas o `hasFeature` pode retornar `true` se o `effectiveSubscriptionTier` estiver corrompido.

**Arquivo:** `src/config/vip-wallets.ts`

5. Verificar que a função `hasPremiumAccess()` só retorna `true` para tiers autenticados.

### Arquivos a Editar
- `src/contexts/PremiumContext.tsx`
- `src/components/premium-content.tsx`
- `src/hooks/useYHPVerification.ts`
- `src/config/vip-wallets.ts`

---

## BUG 2: ABA DE PRICING AUSENTE NA NAVEGAÇÃO (CRÍTICO — MONETIZAÇÃO)

### Problema
A página `/pricing` existe em `src/app/pricing/page.tsx` com 3 tiers (Explorer $29, Trader $79, Hacker Yields $149) e integração Stripe completa, mas **não aparece em nenhuma navegação visível ao usuário**.

### Causa Raiz
Os componentes de navegação principais NÃO incluem link para Pricing:
- `src/components/navbar.tsx` — **SEM link para Pricing**
- `src/components/unified-navbar.tsx` — **SEM link para Pricing**
- `src/components/header.tsx` — **SEM link para Pricing**

Apenas `src/components/navigation/MainNavigation.tsx` tem o link, mas este componente pode não estar sendo usado no layout atual.

### Correção Necessária
Adicionar item "Pricing" ou "Premium" na navbar principal (`navbar.tsx` e/ou `unified-navbar.tsx`), com ícone destacado (ex: crown/star), posicionado próximo ao botão "PREMIUM" que já existe no header.

### Arquivos a Editar
- `src/components/navbar.tsx`
- `src/components/unified-navbar.tsx`

---

## BUG 3: CYPHER AI TRAVANDO (CRÍTICO — FUNCIONALIDADE)

### Problema
O Cypher AI (chat com agentes de AI) trava e não responde quando o usuário tenta interagir.

### Causa Raiz
Em `src/components/ai/CypherAIInterface.tsx`:
- A chamada `fetch('/api/cypher-ai/chat/')` **NÃO tem timeout**. Se a API demorar ou travar, o frontend fica preso infinitamente.

Em `src/app/api/cypher-ai/chat/route.ts`:
- A chamada à API do Gemini/Grok **NÃO tem timeout**.
- `Promise.all()` para data fetchers pode travar se qualquer fetcher individual ficar pendente.
- Se a API key do Grok/Gemini estiver inválida ou expirada, a requisição nunca retorna erro.

### Correção Necessária

**Arquivo:** `src/components/ai/CypherAIInterface.tsx`
1. Adicionar `AbortController` com timeout de 30 segundos na chamada fetch.
2. Mostrar mensagem de erro amigável se timeout for atingido.
3. Adicionar estado de "loading" visual claro durante a requisição.

**Arquivo:** `src/app/api/cypher-ai/chat/route.ts`
4. Adicionar timeout de 25 segundos na chamada à API de AI (Grok/Gemini).
5. Envolver `Promise.all()` dos data fetchers com `Promise.allSettled()` para não bloquear se um falhar.
6. Retornar erro 504 se timeout for atingido.

### Arquivos a Editar
- `src/components/ai/CypherAIInterface.tsx`
- `src/app/api/cypher-ai/chat/route.ts`

---

## BUG 4: ERROS DE RUNTIME NO RUNES TERMINAL (CRÍTICO)

### Problema
Múltiplos erros de runtime na seção Runes:

1. **"Cannot read properties of undefined (reading 'map')"** — Runes Marketplace
2. **"Cannot read properties of undefined (reading 'toFixed')"** — Runes page
3. **"Loading chunk 9253 failed"** — Chunk splitting error

### Causa Raiz

**Erro 1 — .map em Marketplace:**
`src/components/runes/RunesMarketplace.tsx` — A resposta do `magicEdenRunesService.getRuneOrders()` pode retornar `undefined` em vez de um objeto com `.orders`. O código faz `(orders?.orders || []).map(...)` mas se o response inteiro for `undefined`, a chain falha.

**Erro 2 — .toFixed:**
Algum valor numérico (provavelmente preço ou volume) vem como `undefined` do API e `.toFixed()` é chamado sem null check.

**Erro 3 — Chunk loading:**
O build do Next.js pode ter chunks desatualizados no CDN/Vercel. Precisa redeploy limpo ou implementar retry logic para chunk loading failures.

### Correção Necessária

**Arquivo:** `src/components/runes/RunesMarketplace.tsx`
1. Adicionar null checks defensivos em TODAS as chamadas `.map()`:
   ```typescript
   const items = Array.isArray(orders?.orders) ? orders.orders : [];
   ```

**Arquivo:** Componentes Runes que usam `.toFixed()`:
2. Criar helper function: `safeFixed(value: any, decimals = 2) => (typeof value === 'number' && !isNaN(value)) ? value.toFixed(decimals) : '0.00'`
3. Substituir todas as chamadas `.toFixed()` diretas por `safeFixed()`.

**Arquivo:** `src/app/error.tsx` ou `next.config.js`
4. Adicionar global error boundary com retry para chunk loading failures:
   ```typescript
   // Em next.config.js ou _app.tsx
   if (typeof window !== 'undefined') {
     window.addEventListener('error', (e) => {
       if (e.message?.includes('Loading chunk')) {
         window.location.reload();
       }
     });
   }
   ```

### Arquivos a Editar
- `src/components/runes/RunesMarketplace.tsx`
- `src/components/runes/RuneDetailModal.tsx` (ou equivalente com .toFixed)
- `src/app/runes/page.tsx`
- `src/app/error.tsx`
- `next.config.js`

---

## BUG 5: CHARTS — "(intermediate value).map is not a function" (MÉDIO)

### Problema
A aba Charts do Arbitrage mostra: "Error Loading Chart Data — (intermediate value).map is not a function"

### Causa Raiz
`src/components/arbitrage/ProfessionalCharts.tsx` — A função `generateSMCZones(candles)` ou o processamento de candles da Binance API retorna dados em formato inesperado. Se a API do Binance retornar erro ou formato diferente, o `.map()` é chamado em `undefined`.

### Correção Necessária
1. Adicionar type guard: `if (!Array.isArray(candles)) return []`
2. Validar formato de cada candle antes de processar.
3. Envolver todo o rendering em try-catch com fallback UI.

### Arquivos a Editar
- `src/components/arbitrage/ProfessionalCharts.tsx`

---

## BUG 6: HACKER YIELDS — VERIFICAÇÃO DE FUNCIONALIDADE

### Status
A página `/hacker-yields` está protegida por `<PremiumContent requiredFeature="ai_trading_agent">`. Se o Bug 1 for corrigido, ela será corretamente bloqueada para não-premium. O conteúdo da página em si (agent dashboard, equity curve, etc.) parece funcional, porém depende da API `/api/agent` que pode não estar configurada em produção.

### Correção Necessária
1. Verificar se a API `/api/agent` está respondendo em produção.
2. Adicionar tratamento de erro se a API não estiver disponível (mostrar estado "Agent Not Connected" em vez de tela vazia).
3. Garantir que após fix do Bug 1, o `requiredFeature="ai_trading_agent"` bloqueie corretamente.

### Arquivos a Editar
- `src/app/hacker-yields/page.tsx`
- `src/app/api/agent/route.ts`

---

## BUG 7: DADOS VAZIOS EM MÚLTIPLAS SEÇÕES (BAIXO-MÉDIO)

### Problema
Screenshots mostram dados zerados/vazios em:
- Indices & Stocks: "No data available"
- Ordinals collection detail: Floor Price, Volume = 0.00000000 BTC
- Marketplace Activity: 0 sales
- Performance Analytics: Todos os metrics em 0.00

### Causa Raiz
APIs externas podem não estar retornando dados (rate limiting, keys inválidas, ou APIs fora do ar). Isso é parcialmente esperado para um DApp novo, mas os componentes deveriam mostrar estado de "loading" ou "unavailable" mais claro.

### Correção Necessária
1. Adicionar estados de loading/error mais descritivos nos componentes afetados.
2. Verificar se as API keys estão válidas no `.env` de produção (Grok, CoinGecko, Magic Eden, Hiro).
3. Implementar fallback data para quando APIs externas estão indisponíveis.

---

## DISTRIBUIÇÃO DE AGENTES (AGENT TEAMS)

```
AGENT 1 (Security Lead): Bug 1 — Fix acesso premium/YHP
  Arquivos: PremiumContext.tsx, premium-content.tsx, useYHPVerification.ts, vip-wallets.ts
  Prioridade: P0 (BLOCKER)

AGENT 2 (Frontend Lead): Bug 2 + Bug 5 — Fix navegação + Charts
  Arquivos: navbar.tsx, unified-navbar.tsx, ProfessionalCharts.tsx
  Prioridade: P0 (BLOCKER)

AGENT 3 (AI Lead): Bug 3 — Fix Cypher AI travando
  Arquivos: CypherAIInterface.tsx, api/cypher-ai/chat/route.ts
  Prioridade: P0 (BLOCKER)

AGENT 4 (Runes Lead): Bug 4 — Fix erros runtime Runes
  Arquivos: RunesMarketplace.tsx, runes/page.tsx, error.tsx, next.config.js
  Prioridade: P0 (BLOCKER)

AGENT 5 (QA Lead): Bug 6 + Bug 7 — Hacker Yields + dados vazios
  Arquivos: hacker-yields/page.tsx, api/agent/route.ts, componentes com dados vazios
  Prioridade: P1 (HIGH)
```

---

## VALIDAÇÃO PÓS-FIX

Após aplicar todos os fixes, executar:

```bash
# 1. Build check
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Verificar que nenhum console.error aparece nos componentes críticos
grep -rn "console.error\|console.warn" src/components/premium-content.tsx src/contexts/PremiumContext.tsx

# 4. Testar fluxo de acesso:
# - Sem wallet: todas as features YHP devem estar BLOQUEADAS
# - Com wallet sem YHP: features YHP devem estar BLOQUEADAS
# - Com wallet VIP: todas as features devem estar DESBLOQUEADAS
# - Link de Pricing deve estar visível na nav

# 5. Verificar que Cypher AI responde em < 30s

# 6. Verificar que Runes Marketplace carrega sem erros
```

---

## COMANDO PARA EXECUTAR

Cole este prompt inteiro no Claude Code com o seguinte comando:

```bash
claude --dangerously-skip-permissions "Leia o arquivo EMERGENCY-FIX-PROMPT.md na raiz do projeto e execute TODOS os fixes descritos. Use subagentes paralelos para cada grupo de bugs (5 agentes). Após cada fix, rode npm run build para validar. Priorize Bug 1 (segurança) e Bug 3 (AI travando). NÃO altere lógica de negócio que funciona. Apenas corrija os bugs identificados. Sempre adicione null checks defensivos. Teste o build após cada mudança."
```
