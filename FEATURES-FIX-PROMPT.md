# CYPHER V3 — FEATURES FIX PROMPT
## Pricing, Cypher AI, Hacker Yields & Arbitrage

**URGÊNCIA:** Lançamento em poucas horas. Sem Pricing funcional = zero receita.

---

## CONTEXTO DO PROJETO

- **Stack:** Next.js 14 + TypeScript + Tailwind + Stripe + Supabase + LaserEyes (Bitcoin wallets)
- **Deploy:** Vercel (cypherordifuture.xyz)
- **Modelo AI:** Gemini 2.0 Flash via REST
- **Wallets:** Unisat, Xverse, Magic Eden, Phantom, Leather, OYL (via LaserEyes)

---

## BUG 1: PRICING — IMPOSSÍVEL CONTRATAR PLANO (CRÍTICO — ZERO RECEITA)

### 3 problemas encontrados:

### Problema A: Botão "Connect Wallet" não funciona

**Arquivo:** `src/app/pricing/page.tsx` (linha 147)

O botão para usuários não-conectados dispara:
```typescript
window.dispatchEvent(new CustomEvent('openWalletConnect'))
```

Mas **NENHUM componente no app escuta esse evento**. Procurei em todos os arquivos — `addEventListener('openWalletConnect')` não existe em lugar nenhum. O botão clica e nada acontece.

**Correção:**

Opção 1 (Recomendada): No componente de navbar/header que já tem o botão de wallet, adicionar listener:
```typescript
useEffect(() => {
  const handler = () => {
    // Abrir o modal/dropdown de conexão de wallet
    setShowWalletModal(true); // ou qualquer estado que controle o modal
  };
  window.addEventListener('openWalletConnect', handler);
  return () => window.removeEventListener('openWalletConnect', handler);
}, []);
```

Opção 2: Trocar o dispatch no pricing page para usar diretamente o hook de wallet:
```typescript
// Em vez de dispatch CustomEvent, usar o hook de conexão diretamente
import { useWallet } from '@/contexts/WalletContext'; // ou equivalente
// ...
const { connect } = useWallet();
// No onClick: connect('unisat') ou abrir modal de seleção
```

**Arquivos a verificar:**
- `src/app/pricing/page.tsx` — onde o evento é disparado
- `src/components/navbar.tsx` ou `src/components/unified-navbar.tsx` — onde o botão de wallet já existe
- `src/components/wallet-connect-direct.tsx` — modal de seleção de wallet existente
- `src/contexts/WalletContext.tsx` — contexto de wallet

### Problema B: Stripe Price IDs ausentes no .env.local

As variáveis de Stripe existem no `.env` mas **NÃO existem no `.env.local`**:
```
STRIPE_SECRET_KEY          → está no .env, NÃO no .env.local
STRIPE_PRICE_EXPLORER      → está no .env, NÃO no .env.local
STRIPE_PRICE_TRADER        → está no .env, NÃO no .env.local
STRIPE_PRICE_HACKER_YIELDS → está no .env, NÃO no .env.local
STRIPE_WEBHOOK_SECRET      → está no .env, NÃO no .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → está no .env, NÃO no .env.local
```

Next.js prioriza `.env.local` sobre `.env`. Se `.env.local` existe mas não tem essas vars, elas ficam como `''` (string vazia), e `stripe-service.ts` linha 67 lança:
```typescript
if (!tierConfig.stripePriceId) {
  throw new Error(`Price ID not configured for tier: ${tier}`)
}
```

**Correção:**
Copiar TODAS as variáveis STRIPE do `.env` para o `.env.local`:
```bash
# Adicionar ao .env.local:
STRIPE_SECRET_KEY=sk_live_51S5R02FaMYusyYVb...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51S5R02FaMYusyYVb...
STRIPE_WEBHOOK_SECRET=whsec_BIJJUYtL1SvlysbQpMyTDg6eTBsNO8An
STRIPE_PRICE_EXPLORER=price_1T5LozFaMYusyYVbRFW9lFQE
STRIPE_PRICE_TRADER=price_1T5LqSFaMYusyYVbUDApUlpt
STRIPE_PRICE_HACKER_YIELDS=price_1T5LrGFaMYusyYVbgliuNmV9
```

**IMPORTANTE:** Verificar que essas mesmas variáveis estão configuradas no Vercel Dashboard → Settings → Environment Variables.

### Problema C: Erro silencioso no checkout

**Arquivo:** `src/app/pricing/page.tsx` (linha 47)

O catch do `handleSubscribe` é completamente silencioso:
```typescript
} catch {
  // Error handling silently - user can retry
}
```

Se o Stripe retornar erro (Price ID inválido, chave expirada, etc.), o usuário não vê NADA.

**Correção:**
```typescript
} catch (err) {
  console.error('Checkout error:', err);
  // Mostrar erro visual para o usuário
  setCheckoutError('Failed to start checkout. Please try again.');
} finally {
  setLoadingTier(null)
}
```

Adicionar estado `checkoutError` e renderizar mensagem de erro visível na UI.

**Arquivos a editar:**
- `src/app/pricing/page.tsx`
- `src/components/navbar.tsx` ou `src/components/unified-navbar.tsx`
- `.env.local`

---

## BUG 2: CYPHER AI — MELHORIAS DE ROBUSTEZ (MÉDIO)

### Status atual
O Cypher AI está funcional como chatbot analítico com 8 agentes especializados + dados real-time de Binance, Mempool, CryptoCompare. O timeout de 25s server + 30s client já foi adicionado no fix anterior. Usa Gemini 2.0 Flash.

### Melhorias necessárias

**Arquivo:** `src/components/ai/CypherAIInterface.tsx`

1. **Fallback `enhancedCypherAI` pode travar também** (linha 183). Se a API primária falha E o fallback também falha, o catch interno (linha 198) mostra "Connection error" genérico. Adicionar timeout no fallback também:
```typescript
const fallbackController = new AbortController();
const fallbackTimeout = setTimeout(() => fallbackController.abort(), 10000);
try {
  const response = await enhancedCypherAI.processTextInput(messageText, context);
  // ...
} finally {
  clearTimeout(fallbackTimeout);
}
```

2. **Verificar que `GEMINI_API_KEY` está no `.env.local`:**
```bash
grep GEMINI_API_KEY .env.local
```
Se não estiver, copiar do `.env`.

**Arquivo:** `src/app/api/cypher-ai/chat/route.ts`

3. O agent routing funciona com keyword matching (`routeToAgent`). Verificar que o roteamento não retorna `undefined` se nenhum keyword bater — deve sempre retornar o agent default "Alpha".

---

## BUG 3: HACKER YIELDS — PREPARAÇÃO PARA OPERAÇÕES REAIS (ALTO)

### Status atual
A UI de setup wizard (5 etapas) e o dashboard (equity curve, posições, trades) estão completos. A API `/api/agent` aceita comandos reais. Porém:

### Problemas críticos para produção

**Problema A: Credenciais perdidas no serverless**

**Arquivo:** `src/app/api/agent/route.ts` (linha 4-5)
```typescript
const secureCredentials = new Map<string, Record<string, string>>()
```

As credenciais do agent (Hyperliquid key/secret) são armazenadas em `Map()` in-memory. No Vercel serverless, cada request pode rodar em uma instância diferente. Se a instância reciclar, as credenciais somem e o agent para sem aviso.

**Correção:**
1. Armazenar credenciais criptografadas no Supabase (já existe integração) ou Redis
2. No mínimo, adicionar warning na UI: "Agent may need to be restarted if connection is lost"
3. Implementar health-check periódico que detecta perda de credenciais e notifica o usuário

**Problema B: Orchestrator pode não estar implementado**

**Verificar se existe:** `src/lib/trading/orchestrator.ts` ou similar. O `route.ts` chama `orchestrator.start()` — se este arquivo não existir ou for stub, o agent não faz nada de verdade.

```bash
find src -name "orchestrator*" -o -name "trading-engine*" -o -name "execution*" | head -10
```

**Problema C: Feature gating**

Após o fix do PremiumContext (Bug 1 do EMERGENCY-FIX), verificar que:
- A página `/hacker-yields` exige `requiredFeature="ai_trading_agent"`
- Isso mapeia para tier `hacker_yields` ($149/mo)
- Sem assinatura ativa, o setup wizard NÃO deve aparecer

**Arquivos a editar:**
- `src/app/api/agent/route.ts`
- `src/lib/trading/orchestrator.ts` (verificar existência)
- `src/app/hacker-yields/page.tsx`

---

## BUG 4: ARBITRAGE — VERIFICAÇÃO DE FUNCIONALIDADE (BAIXO)

### Status atual
O Arbitrage é um scanner de oportunidades (visualização), não executa trades. Funciona se as APIs de exchanges estiverem respondendo.

### Verificação necessária

**Arquivo:** `src/app/api/arbitrage/prices/route.ts`

1. Verificar que as APIs de exchanges (Binance, Kraken, Coinbase, etc.) estão respondendo
2. Se alguma API falhar, o componente deve mostrar "Exchange unavailable" em vez de quebrar
3. Verificar que o paper trading (simulação) funciona sem dependências externas

```bash
# Testar API localmente
curl http://localhost:3000/api/arbitrage/prices | jq '.exchanges | length'
# Esperado: >= 3 exchanges com dados
```

---

## DISTRIBUIÇÃO DE AGENTES

```
AGENT 1 (Revenue Critical): Bug 1 — Fix Pricing page completo
  Tarefas:
    1. Adicionar listener 'openWalletConnect' na navbar/header
    2. Copiar vars Stripe para .env.local
    3. Adicionar error handling visível no checkout
    4. Testar fluxo: Pricing → Connect Wallet → Subscribe → Stripe Checkout
  Arquivos: pricing/page.tsx, navbar.tsx, unified-navbar.tsx, .env.local
  Prioridade: P0 (SEM ISSO = ZERO RECEITA)

AGENT 2 (AI Reliability): Bug 2 — Hardening do Cypher AI
  Tarefas:
    1. Adicionar timeout no fallback enhancedCypherAI
    2. Verificar GEMINI_API_KEY no .env.local
    3. Garantir agent routing default
  Arquivos: CypherAIInterface.tsx, cypher-ai/chat/route.ts, .env.local
  Prioridade: P1

AGENT 3 (Trading Infrastructure): Bug 3 — Hacker Yields production readiness
  Tarefas:
    1. Verificar se orchestrator.ts existe e está funcional
    2. Adicionar persistent credential storage (Supabase/Redis)
    3. Adicionar health-check e reconnect logic
    4. Verificar feature gating após premium fix
  Arquivos: api/agent/route.ts, trading/orchestrator.ts, hacker-yields/page.tsx
  Prioridade: P1

AGENT 4 (QA): Bug 4 — Verificação de Arbitrage + Teste E2E
  Tarefas:
    1. Testar API de arbitrage prices
    2. Verificar error handling nos componentes
    3. Fazer smoke test de todas as features: Pricing, AI, Hacker Yields, Arbitrage
  Arquivos: api/arbitrage/prices/route.ts, arbitrage/page.tsx
  Prioridade: P2
```

---

## VALIDAÇÃO PÓS-FIX

```bash
# 1. Build
npm run build

# 2. Testar que Stripe vars estão acessíveis
node -e "console.log('Explorer:', process.env.STRIPE_PRICE_EXPLORER ? 'OK' : 'MISSING')"

# 3. Testar fluxo de pricing (manual):
# a) Ir em /pricing sem wallet → botão deve abrir modal de wallet
# b) Conectar wallet → botão muda para "Subscribe"
# c) Clicar Subscribe → deve redirecionar para Stripe Checkout
# d) Se erro → mensagem visível na tela

# 4. Testar Cypher AI
# a) Ir em /cypher-ai
# b) Enviar "What is Bitcoin price?" → deve responder em < 30s
# c) Enviar "analyze BTC on-chain" → deve rotear para agent Satoshi

# 5. Testar Hacker Yields
# a) Sem assinatura → deve mostrar paywall
# b) Verificar que setup wizard carrega sem erros

# 6. Testar Arbitrage
# a) Ir em /arbitrage → deve mostrar exchanges com dados
```

---

## COMANDO PARA EXECUTAR

```bash
claude --dangerously-skip-permissions "Leia o arquivo FEATURES-FIX-PROMPT.md na raiz do projeto e execute TODOS os fixes. Use subagentes paralelos (4 agentes). O Bug 1 (Pricing) é o mais crítico — sem ele não há receita. Copie as variáveis Stripe do .env para o .env.local. Adicione o listener openWalletConnect na navbar. Adicione error handling visível no checkout. Rode npm run build após cada mudança."
```
